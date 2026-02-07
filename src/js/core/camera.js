/* ============================================
   MindGraph — Camera & Canvas Setup
   ============================================ */

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const graphArea = document.getElementById('graphArea');
const tooltip = document.getElementById('tooltip');

let W, H;
let camX = 0, camY = 0, camZoom = 1;

// Fly-to animation state
let flyTarget = null;
let flyStartCam = null;
let flyStartTime = 0;

function resize() {
  W = graphArea.clientWidth || 800;
  H = graphArea.clientHeight || 600;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function s2w(sx, sy) {
  return { x: (sx - camX) / camZoom, y: (sy - camY) / camZoom };
}

function flyToNode(n) {
  flyStartCam = { x: camX, y: camY, z: camZoom };
  const targetZoom = Math.max(camZoom, 1.5);
  const targetX = W / 2 - n.x * targetZoom;
  const targetY = H / 2 - n.y * targetZoom;
  flyTarget = { x: targetX, y: targetY, z: targetZoom };
  flyStartTime = performance.now();
}

function updateFlyTo() {
  if (!flyTarget) return;
  const t = Math.min(1, (performance.now() - flyStartTime) / FLY_DURATION);
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  camX = flyStartCam.x + (flyTarget.x - flyStartCam.x) * ease;
  camY = flyStartCam.y + (flyTarget.y - flyStartCam.y) * ease;
  camZoom = flyStartCam.z + (flyTarget.z - flyStartCam.z) * ease;
  if (t >= 1) flyTarget = null;
}
