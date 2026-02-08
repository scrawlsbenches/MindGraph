/* ============================================
   MindGraph — Force-Directed Physics Simulation
   ============================================ */

import { state } from './state.js';
import { random } from './config.js';
import { nodes, edges, NUM_NODES } from './graph-data.js';

export function simulate() {
  if (state.W < 10 || state.H < 10) return;
  const cx = state.W * 0.45, cy = state.H * 0.48, sp = Math.min(state.W, state.H);

  // Spring forces from edges
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a.visible || !b.visible) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
    const ideal = a.cluster === b.cluster ? 65 : 120;
    const f = (dist - ideal) * 0.0003 * e.weight;
    const fx = dx / dist * f, fy = dy / dist * f;
    if (!a.pinned) { a.vx += fx; a.vy += fy; }
    if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
  }

  for (let i = 0; i < NUM_NODES; i++) {
    const n = nodes[i];
    if (n.pinned || !n.visible) continue;

    // Label-footprint repulsion
    let repX = 0, repY = 0;

    for (let j = i + 1; j < Math.min(i + 20, NUM_NODES); j++) {
      const m = nodes[j];
      if (!m.visible) continue;
      const gapX = (n.x < m.x)
        ? (m.x - m.fpLeft) - (n.x + n.fpRight)
        : (n.x - n.fpLeft) - (m.x + m.fpRight);
      const gapY = Math.abs(n.y - m.y) - n.fpY - m.fpY;
      const margin = 6;
      if (gapX < margin && gapY < margin) {
        const dx = n.x - m.x, dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const overlapX = margin - gapX, overlapY = margin - gapY;
        const strength = 0.14 * Math.min(overlapX, 60) * Math.min(overlapY, 30) / (dist + 20);
        const fx = (dx / dist) * strength, fy = (dy / dist) * strength;
        repX += fx; repY += fy;
        if (!m.pinned) { m.vx -= fx; m.vy -= fy; }
      }
    }

    // Same-cluster pass
    const cBase = n.cluster * 20;
    for (let j = cBase; j < cBase + 20; j++) {
      if (j === i) continue;
      const m = nodes[j];
      if (!m.visible) continue;
      const gapX = (n.x < m.x)
        ? (m.x - m.fpLeft) - (n.x + n.fpRight)
        : (n.x - n.fpLeft) - (m.x + m.fpRight);
      const gapY = Math.abs(n.y - m.y) - n.fpY - m.fpY;
      const margin = 6;
      if (gapX < margin && gapY < margin) {
        const dx = n.x - m.x, dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const overlapX = margin - gapX, overlapY = margin - gapY;
        const strength = 0.10 * Math.min(overlapX, 60) * Math.min(overlapY, 30) / (dist + 20);
        const fx = (dx / dist) * strength, fy = (dy / dist) * strength;
        repX += fx; repY += fy;
        if (!m.pinned) { m.vx -= fx; m.vy -= fy; }
      }
    }

    // Apply repulsion
    n.vx += repX; n.vy += repY;

    // Gravity (gentle, suppressed where opposing repulsion)
    let gx = (cx - n.x) * 0.00002;
    let gy = (cy - n.y) * 0.00002;
    const ca = (n.cluster / 5) * Math.PI * 2, cr = sp * 0.24;
    gx += (cx + Math.cos(ca) * cr - n.x) * 0.00006;
    gy += (cy + Math.sin(ca) * cr * 0.85 - n.y) * 0.00006;

    const repMag = Math.sqrt(repX * repX + repY * repY);
    if (repMag > 0.001) {
      const dot = gx * repX + gy * repY;
      if (dot < 0) {
        const suppress = Math.min(1, repMag * 8);
        const projScale = (dot / (repMag * repMag)) * suppress;
        gx -= repX * projScale;
        gy -= repY * projScale;
      }
    }

    n.vx += gx; n.vy += gy;
    n.vx += (random() - 0.5) * 0.04;
    n.vy += (random() - 0.5) * 0.04;
    n.vx *= 0.90; n.vy *= 0.90;
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(30, Math.min(state.W - 30, n.x));
    n.y = Math.max(30, Math.min(state.H - 30, n.y));
  }
}

export function positionNodes() {
  const cx = state.W * 0.45, cy = state.H * 0.48, sp = Math.min(state.W, state.H);
  for (const n of nodes) {
    if (n.pinned) continue;
    n.x = cx + Math.cos(n._a) * n._d * sp + n._jx * sp;
    n.y = cy + Math.sin(n._a) * n._d * sp + n._jy * sp;
    n.vx = 0; n.vy = 0;
  }
}
