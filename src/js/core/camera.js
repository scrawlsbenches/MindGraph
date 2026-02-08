/* ============================================
   MindGraph — Camera & Canvas Setup
   ============================================ */

import { FLY_DURATION } from './config.js';
import { state } from './state.js';

export const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('graphCanvas'));
export const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
export const graphArea = /** @type {HTMLDivElement} */ (document.getElementById('graphArea'));
export const tooltip = /** @type {HTMLDivElement} */ (document.getElementById('tooltip'));

// Fly-to animation state (module-local)
let flyTarget = null;
let flyStartCam = null;
let flyStartTime = 0;

export function resize() {
  state.W = graphArea.clientWidth || 800;
  state.H = graphArea.clientHeight || 600;
  canvas.width = state.W * devicePixelRatio;
  canvas.height = state.H * devicePixelRatio;
  canvas.style.width = state.W + 'px';
  canvas.style.height = state.H + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

export function s2w(sx, sy) {
  return { x: (sx - state.camX) / state.camZoom, y: (sy - state.camY) / state.camZoom };
}

export function flyToNode(n) {
  flyStartCam = { x: state.camX, y: state.camY, z: state.camZoom };
  const targetZoom = Math.max(state.camZoom, 1.5);
  const targetX = state.W / 2 - n.x * targetZoom;
  const targetY = state.H / 2 - n.y * targetZoom;
  flyTarget = { x: targetX, y: targetY, z: targetZoom };
  flyStartTime = performance.now();
}

export function updateFlyTo() {
  if (!flyTarget) return;
  const t = Math.min(1, (performance.now() - flyStartTime) / FLY_DURATION);
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  state.camX = flyStartCam.x + (flyTarget.x - flyStartCam.x) * ease;
  state.camY = flyStartCam.y + (flyTarget.y - flyStartCam.y) * ease;
  state.camZoom = flyStartCam.z + (flyTarget.z - flyStartCam.z) * ease;
  if (t >= 1) flyTarget = null;
}
