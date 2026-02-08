/* ============================================
   MindGraph — Graph Renderer
   ============================================ */

import { state } from '../core/state.js';
import { CLUSTER_COLORS, FONT } from '../core/config.js';
import { nodes, edges, neighbors } from '../core/graph-data.js';
import { ctx } from '../core/camera.js';
import { convexHull, expandHull, drawSmoothHull } from '../core/geometry.js';
import { getNeighborsAtDepth } from '../core/pathfinding.js';

// Cluster hull cache (module-local)
let clusterHulls = [];

export function updateDepthMap() {
  state.depthMap = state.selectedNode ? getNeighborsAtDepth(state.selectedNode.id, state.selectionDepth) : null;
}

export function isHL(n) {
  if (!n.visible) return false;
  if (state.searchQuery && !n.matchesSearch) return false;
  if (state.pathResult) return state.pathResult.includes(n.id);
  if (state.selectedNode && state.depthMap) return state.depthMap.has(n.id);
  if (state.hoveredNode) return n.id === state.hoveredNode.id || neighbors(state.hoveredNode.id).has(n.id);
  return true;
}

function _nodeDepthLevel(n) {
  if (!state.depthMap) return 0;
  return state.depthMap.get(n.id) ?? -1;
}

export function isEdgeHL(e) {
  const a = nodes[e.a], b = nodes[e.b];
  if (!a.visible || !b.visible) return false;
  if (state.searchQuery && !a.matchesSearch && !b.matchesSearch) return false;
  if (state.pathResult) {
    for (let i = 0; i < state.pathResult.length - 1; i++) {
      if ((e.a === state.pathResult[i] && e.b === state.pathResult[i + 1]) ||
          (e.b === state.pathResult[i] && e.a === state.pathResult[i + 1])) return true;
    }
    return false;
  }
  if (state.selectedNode && state.depthMap) return state.depthMap.has(e.a) && state.depthMap.has(e.b);
  if (state.hoveredNode) return e.a === state.hoveredNode.id || e.b === state.hoveredNode.id;
  return true;
}

function computeHulls() {
  clusterHulls = [];
  for (let ci = 0; ci < 5; ci++) {
    const clusterNodes = nodes.filter(n => n.cluster === ci && n.visible);
    const pts = clusterNodes.map(n => ({ x: n.x, y: n.y }));
    if (pts.length < 3) { clusterHulls.push(null); continue; }
    const hull = expandHull(convexHull(pts), 35);
    const avgAlpha = clusterNodes.reduce((s, n) => s + n.alpha, 0) / clusterNodes.length;
    clusterHulls.push({ hull, color: CLUSTER_COLORS[ci], alpha: avgAlpha });
  }
}

// Path particles
function updatePathParticles() {
  if (!state.pathResult || state.pathResult.length < 2) { state.pathParticles = []; return; }
  if (Math.random() < 0.15) {
    state.pathParticles.push({ t: 0, speed: 0.003 + Math.random() * 0.004 });
  }
  state.pathParticles.forEach(p => p.t += p.speed);
  state.pathParticles = state.pathParticles.filter(p => p.t <= 1);
}

function drawPathParticles() {
  if (!state.pathResult || state.pathResult.length < 2) return;
  const pts = state.pathResult.map(id => nodes[id]);
  const segs = [];
  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segs.push({ x0: pts[i - 1].x, y0: pts[i - 1].y, x1: pts[i].x, y1: pts[i].y, len });
    totalLen += len;
  }
  for (const p of state.pathParticles) {
    let d = p.t * totalLen;
    for (const s of segs) {
      if (d <= s.len) {
        const frac = d / s.len;
        const px = s.x0 + (s.x1 - s.x0) * frac;
        const py = s.y0 + (s.y1 - s.y0) * frac;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 5 / state.camZoom);
        g.addColorStop(0, 'rgba(6,182,212,0.9)');
        g.addColorStop(1, 'rgba(6,182,212,0)');
        ctx.beginPath(); ctx.arc(px, py, 5 / state.camZoom, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        break;
      }
      d -= s.len;
    }
  }
}

export function draw() {
  ctx.clearRect(0, 0, state.W, state.H);
  ctx.save();
  ctx.translate(state.camX, state.camY);
  ctx.scale(state.camZoom, state.camZoom);

  const hasFocus = state.selectedNode || state.hoveredNode || state.pathResult;
  const hasSearch = state.searchQuery.length > 0;

  // Cluster hulls
  if (state.showHulls && !state.pathResult) {
    computeHulls();
    for (const ch of clusterHulls) {
      if (!ch || ch.hull.length < 3) continue;
      drawSmoothHull(ctx, ch.hull, 0.35);
      ctx.globalAlpha = ch.alpha;
      ctx.fillStyle = ch.color + '0a';
      ctx.strokeStyle = ch.color + '20';
      ctx.lineWidth = 1.5 / state.camZoom;
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Edges
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a.visible || !b.visible) continue;
    const edgeAlpha = Math.min(a.alpha, b.alpha);
    const hl = isEdgeHL(e);
    const bridge = a.cluster !== b.cluster;
    const isPathEdge = state.pathResult && hl;
    ctx.beginPath();
    if (bridge && !isPathEdge) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx - dy * 0.1, my + dx * 0.1, b.x, b.y);
    } else {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    if (isPathEdge) {
      ctx.globalAlpha = 0.9 * edgeAlpha;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = (3 + e.weight * 2) / state.camZoom;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8 / state.camZoom;
    } else {
      ctx.globalAlpha = (hl ? (hasFocus ? (bridge ? 0.5 : 0.7) : (bridge ? 0.12 : 0.22)) : 0.025) * edgeAlpha;
      ctx.strokeStyle = hl && hasFocus ? (bridge ? '#5a6a82' : a.color) : a.color;
      if (state.selectedNode && state.depthMap && hl) {
        const da = state.depthMap.get(e.a) ?? 99, db = state.depthMap.get(e.b) ?? 99;
        const maxD = Math.max(da, db);
        ctx.globalAlpha = (maxD <= 1 ? 0.7 : maxD <= 2 ? 0.35 : 0.15) * edgeAlpha;
      }
      ctx.lineWidth = (hl && hasFocus ? (1.2 + e.weight * 1.8) : (0.3 + e.weight * 0.5)) / state.camZoom;
      ctx.shadowBlur = 0;
    }
    if (bridge && hl && hasFocus && !isPathEdge) {
      ctx.setLineDash([4 / state.camZoom, 3 / state.camZoom]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // Path particles
  updatePathParticles();
  drawPathParticles();

  // Nodes
  for (const n of nodes) {
    if (!n.visible) continue;
    const hl = isHL(n);
    const isPathNode = state.pathResult && state.pathResult.includes(n.id);
    let alpha;
    if (isPathNode) {
      alpha = 1;
    } else if (state.selectedNode && state.depthMap && state.depthMap.has(n.id)) {
      const dl = state.depthMap.get(n.id);
      alpha = dl === 0 ? 1 : dl === 1 ? 0.85 : dl === 2 ? 0.5 : 0.3;
    } else {
      alpha = hl ? 1 : (hasFocus || hasSearch ? 0.06 : 0.65);
    }
    alpha *= n.alpha;
    const drawR = n.r * (0.4 + 0.6 * n.alpha);

    // Glow
    if ((n.r > 6 || isPathNode) && hl && n.alpha > 0.5) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, drawR * (isPathNode ? 4 : 3));
      g.addColorStop(0, (isPathNode ? '#06b6d4' : n.color) + '50');
      g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(n.x, n.y, drawR * (isPathNode ? 4 : 3), 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }

    ctx.beginPath(); ctx.arc(n.x, n.y, drawR, 0, Math.PI * 2);
    ctx.fillStyle = isPathNode ? '#06b6d4' : n.color;
    ctx.globalAlpha = alpha; ctx.fill();

    // Selection/path ring
    if (isPathNode) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 / state.camZoom; ctx.globalAlpha = 0.9 * n.alpha; ctx.stroke();
    } else if (n === state.selectedNode) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 / state.camZoom; ctx.globalAlpha = 0.9 * n.alpha; ctx.stroke();
    } else if (n.pinned && hl) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2 / state.camZoom; ctx.globalAlpha = 0.35 * n.alpha; ctx.stroke();
    }
    if (state.selectedNode && state.depthMap && state.depthMap.has(n.id) && state.depthMap.get(n.id) >= 2) {
      ctx.strokeStyle = n.color; ctx.lineWidth = 1 / state.camZoom; ctx.globalAlpha = 0.25 * n.alpha;
      ctx.setLineDash([2 / state.camZoom, 2 / state.camZoom]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  // Label collision pass
  if (!state.labelVisCache) {
    const candidates = [];
    for (const n of nodes) {
      if (!n.visible || n.alpha < 0.5) continue;
      const hl = isHL(n);
      const isPathNode = state.pathResult && state.pathResult.includes(n.id);
      const showLabel = (hl && (n.r > 4 || hasFocus || isPathNode)) || (!hasFocus && !hasSearch && n.r > 5);
      if (!showLabel) continue;

      let priority = 5;
      if (n === state.selectedNode) priority = 100;
      else if (isPathNode) priority = 90;
      else if (n === state.hoveredNode) priority = 80;
      else if (state.selectedNode && state.depthMap && state.depthMap.get(n.id) === 0) priority = 70;
      else if (n.r >= 8 && hl) priority = 60;
      else if (state.selectedNode && state.depthMap && state.depthMap.get(n.id) === 1) priority = 50;
      else if (hl) priority = 30;

      const fs = Math.max(isPathNode ? 11 : 9, n.r * 1.2);
      const textW = n.word.length * fs * 0.55;
      const lx = n.x + n.r + 4;
      const baseY = n.y + fs * 0.35;
      const ly = baseY - fs;

      candidates.push({ id: n.id, fs, lx, ly, baseY, w: textW, h: fs, priority });
    }

    candidates.sort((a, b) => b.priority - a.priority);

    const placed = [];
    const visible = new Set();
    const MARGIN = 3;

    for (const lbl of candidates) {
      const testW = lbl.w * 0.8;
      const testOff = (lbl.w - testW) / 2;
      let overlaps = false;
      for (const p of placed) {
        if (lbl.lx + testOff < p.x + p.w + MARGIN && lbl.lx + testOff + testW + MARGIN > p.x &&
            lbl.ly < p.y + p.h + MARGIN && lbl.ly + lbl.h + MARGIN > p.y) {
          overlaps = true;
          break;
        }
      }
      if (overlaps && lbl.priority < 70) continue;
      placed.push({ x: lbl.lx, y: lbl.ly, w: lbl.w, h: lbl.h });
      visible.add(lbl.id);
    }
    state.labelVisCache = visible;
  }

  // Draw labels
  for (const n of nodes) {
    if (!n.visible || !state.labelVisCache.has(n.id)) continue;
    const hl = isHL(n);
    const isPathNode = state.pathResult && state.pathResult.includes(n.id);
    const showLabel = (hl && (n.r > 4 || hasFocus || isPathNode)) || (!hasFocus && !hasSearch && n.r > 5);
    if (!showLabel) continue;

    const fs = Math.max(isPathNode ? 11 : 9, n.r * 1.2);
    ctx.font = `600 ${fs}px ${FONT}`;
    ctx.fillStyle = '#e8ecf4';
    ctx.globalAlpha = (hl ? 0.95 : 0.35) * n.alpha;
    ctx.fillText(n.word, n.x + n.r + 4, n.y + fs * 0.35);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Zoom badge
  if (Math.abs(state.camZoom - 1) > 0.01) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(12, state.H - 42, 70, 24, 4); ctx.fill();
    ctx.font = '11px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center'; ctx.fillText(Math.round(state.camZoom * 100) + '%', 47, state.H - 26);
    ctx.textAlign = 'start';
  }
}
