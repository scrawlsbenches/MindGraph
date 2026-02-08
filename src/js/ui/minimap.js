/* ============================================
   MindGraph — Minimap
   ============================================ */

import { state } from '../core/state.js';
import { nodes, edges } from '../core/graph-data.js';

const mmCanvas = document.getElementById('minimapCanvas');
const mmCtx = mmCanvas.getContext('2d');
export const mmDiv = document.getElementById('minimap');
const mmVP = document.getElementById('minimapViewport');

let mmTransform = null;

export function drawMinimap() {
  if (!state.showMinimap) return;
  const mw = 160, mh = 120;
  mmCanvas.width = mw * devicePixelRatio;
  mmCanvas.height = mh * devicePixelRatio;
  mmCanvas.style.width = mw + 'px';
  mmCanvas.style.height = mh + 'px';
  mmCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  mmCtx.clearRect(0, 0, mw, mh);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (!n.visible) continue;
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y);
  }
  if (minX >= maxX) return;

  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const gw = maxX - minX, gh = maxY - minY;
  const scale = Math.min(mw / gw, mh / gh);
  const ox = (mw - gw * scale) / 2, oy = (mh - gh * scale) / 2;

  mmTransform = { minX, minY, scale, ox, oy };

  // Edges
  mmCtx.globalAlpha = 0.12;
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a.visible || !b.visible) continue;
    mmCtx.beginPath();
    mmCtx.moveTo(ox + (a.x - minX) * scale, oy + (a.y - minY) * scale);
    mmCtx.lineTo(ox + (b.x - minX) * scale, oy + (b.y - minY) * scale);
    mmCtx.strokeStyle = a.color; mmCtx.lineWidth = 0.5; mmCtx.stroke();
  }

  // Nodes
  mmCtx.globalAlpha = 0.7;
  for (const n of nodes) {
    if (!n.visible) continue;
    mmCtx.beginPath();
    mmCtx.arc(ox + (n.x - minX) * scale, oy + (n.y - minY) * scale, Math.max(1, n.r * scale * 0.5), 0, Math.PI * 2);
    mmCtx.fillStyle = n.color; mmCtx.fill();
  }
  mmCtx.globalAlpha = 1;

  // Viewport rectangle
  const vx0 = -state.camX / state.camZoom, vy0 = -state.camY / state.camZoom;
  const vw = state.W / state.camZoom, vh = state.H / state.camZoom;
  const rx = ox + (vx0 - minX) * scale, ry = oy + (vy0 - minY) * scale;
  const rw = vw * scale, rh = vh * scale;
  mmVP.style.left = Math.max(0, rx) + 'px';
  mmVP.style.top = Math.max(0, ry) + 'px';
  mmVP.style.width = Math.min(rw, mw) + 'px';
  mmVP.style.height = Math.min(rh, mh) + 'px';
}

// Minimap drag to pan
function mmPanTo(e) {
  if (!mmTransform) return;
  const rect = mmDiv.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const worldX = (mx - mmTransform.ox) / mmTransform.scale + mmTransform.minX;
  const worldY = (my - mmTransform.oy) / mmTransform.scale + mmTransform.minY;
  state.camX = -worldX * state.camZoom + state.W / 2;
  state.camY = -worldY * state.camZoom + state.H / 2;
  state.labelVisCache = null;
}

let mmDragging = false;
mmDiv.addEventListener('mousedown', e => { e.stopPropagation(); mmDragging = true; mmPanTo(e); });
window.addEventListener('mousemove', e => { if (mmDragging) mmPanTo(e); });
window.addEventListener('mouseup', () => { mmDragging = false; });

// Touch support
mmDiv.addEventListener('touchstart', e => {
  e.stopPropagation(); e.preventDefault();
  mmDragging = true; mmPanTo(e.touches[0]);
}, { passive: false });
mmDiv.addEventListener('touchmove', e => {
  if (!mmDragging) return;
  e.preventDefault(); mmPanTo(e.touches[0]);
}, { passive: false });
mmDiv.addEventListener('touchend', () => { mmDragging = false; });
