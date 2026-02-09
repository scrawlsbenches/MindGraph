/* ============================================
   MindGraph — User Interaction (mouse, keyboard)
   ============================================ */

import { state } from '../core/state.js';
import { canvas, s2w, tooltip } from '../core/camera.js';
import { nodes, NUM_NODES, neighbors } from '../core/graph-data.js';
import { bfsPath } from '../core/pathfinding.js';
import { CLUSTER_NAMES } from '../core/config.js';
import { updateND, updatePathBanner } from './panels.js';
import { selectNode, setDepth } from './state-actions.js';

let dragNode = null,
  isPanning = false,
  psx = 0,
  psy = 0,
  csx = 0,
  csy = 0,
  mdTime = 0;

function gmw(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left,
    sy = e.clientY - r.top;
  return { sx, sy, ...s2w(sx, sy) };
}

function findNode(wx, wy) {
  for (let i = NUM_NODES - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.visible) continue;
    const dx = wx - n.x,
      dy = wy - n.y,
      hr = Math.max(n.r, 6) + 3 / state.camZoom;
    if (dx * dx + dy * dy < hr * hr) return n;
  }
  return null;
}

canvas.addEventListener('mousedown', (e) => {
  mdTime = Date.now();
  const { sx, sy, x, y } = gmw(e);
  const hit = findNode(x, y);
  if (hit) {
    if (e.shiftKey || state.pathMode) {
      if (!state.pathStart) {
        state.pathStart = hit;
        state.pathResult = null;
        state.pathParticles = [];
        state.labelVisCache = null;
        updatePathBanner();
        return;
      } else if (state.pathStart.id !== hit.id) {
        state.pathResult = bfsPath(state.pathStart.id, hit.id);
        state.pathParticles = [];
        state.labelVisCache = null;
        updatePathBanner();
        state.selectedNode = null;
        state.depthMap = null;
        updateND();
        return;
      }
    }
    dragNode = hit;
    dragNode.pinned = true;
    canvas.classList.add('grabbing');
  } else {
    isPanning = true;
    psx = sx;
    psy = sy;
    csx = state.camX;
    csy = state.camY;
    canvas.classList.add('grabbing');
  }
});

canvas.addEventListener('mousemove', (e) => {
  const { sx, sy, x, y } = gmw(e);
  if (dragNode) {
    dragNode.x = x;
    dragNode.y = y;
    dragNode.vx = 0;
    dragNode.vy = 0;
    return;
  }
  if (isPanning) {
    state.camX = csx + (sx - psx);
    state.camY = csy + (sy - psy);
    return;
  }
  const hit = findNode(x, y);
  if (hit !== state.hoveredNode) {
    state.hoveredNode = hit;
    state.labelVisCache = null;
    canvas.classList.toggle('node-hover', !!hit);
  }
  if (hit) {
    const nb = neighbors(hit.id);
    const connW = [...nb]
      .map((id) => nodes[id].word)
      .slice(0, 10)
      .join(', ');
    tooltip.style.display = 'block';
    tooltip.style.left = sx + 16 + 'px';
    tooltip.style.top = sy - 12 + 'px';
    tooltip.innerHTML =
      `<div class="tt-word" style="color:${hit.color}">${hit.word}</div>` +
      `<div class="tt-cluster">${CLUSTER_NAMES[hit.cluster]} \u00B7 ${nb.size} connections</div>` +
      `<div class="tt-connections">\u2192 ${connW}${nb.size > 10 ? '\u2026' : ''}</div>`;
  } else {
    tooltip.style.display = 'none';
  }
});

canvas.addEventListener('mouseup', () => {
  if (dragNode && Date.now() - mdTime < 200) selectNode(dragNode);
  if (dragNode) state.labelVisCache = null;
  dragNode = null;
  isPanning = false;
  canvas.classList.remove('grabbing');
});

canvas.addEventListener('mouseleave', () => {
  dragNode = null;
  isPanning = false;
  state.hoveredNode = null;
  state.labelVisCache = null;
  tooltip.style.display = 'none';
  canvas.classList.remove('grabbing', 'node-hover');
});

canvas.addEventListener('dblclick', (e) => {
  const { x, y } = gmw(e);
  const hit = findNode(x, y);
  if (hit) {
    hit.pinned = false;
  } else {
    state.camX = 0;
    state.camY = 0;
    state.camZoom = 1;
    state.selectedNode = null;
    state.labelVisCache = null;
    updateND();
  }
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left,
      my = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nz = Math.max(0.15, Math.min(8, state.camZoom * f));
    state.camX = mx - (mx - state.camX) * (nz / state.camZoom);
    state.camY = my - (my - state.camY) * (nz / state.camZoom);
    state.camZoom = nz;
  },
  { passive: false },
);

// Sidebar zoom/fit/unpin buttons
document.getElementById('btnZoomIn').onclick = () => (state.camZoom = Math.min(8, state.camZoom * 1.3));
document.getElementById('btnZoomOut').onclick = () => (state.camZoom = Math.max(0.15, state.camZoom / 1.3));
document.getElementById('btnFit').onclick = () => {
  state.camX = 0;
  state.camY = 0;
  state.camZoom = 1;
};
document.getElementById('btnUnpin').onclick = () => nodes.forEach((n) => (n.pinned = false));

// Depth button click handlers
document.querySelectorAll('.nd-depth-btn').forEach((/** @type {HTMLElement} */ btn) => {
  btn.addEventListener('click', () => setDepth(+btn.dataset.depth));
});
