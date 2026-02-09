/* ============================================
   MindGraph — Application Entry Point
   ============================================ */

import { state } from './core/state.js';
import { CLUSTER_NAMES, CLUSTER_COLORS } from './core/config.js';
import { nodes } from './core/graph-data.js';
import { simulate, positionNodes } from './core/physics.js';
import { resize, graphArea, updateFlyTo } from './core/camera.js';
import { draw } from './ui/renderer.js';
import { drawMinimap } from './ui/minimap.js';
import { selectNode } from './ui/state-actions.js';
import './ui/interaction.js'; // Side-effect: registers canvas event listeners
import { toggleCluster, searchInput } from './ui/search.js';
import { updateND, updateStatus, panelContent } from './ui/panels.js';
import { buildTab0 } from './analytics/tabs.js';

// For inline onclick handlers in dynamically generated HTML
window.selectNode = selectNode;
window.updateND = updateND;
window.toggleCluster = toggleCluster;
window.nodes = nodes;
window.searchInput = searchInput;
// activeCluster is on state object, so make a getter
Object.defineProperty(window, 'activeCluster', {
  get: () => state.activeCluster,
  set: (v) => {
    state.activeCluster = v;
  },
});

// Initialize canvas & layout
resize();
window.addEventListener('resize', () => {
  resize();
  positionNodes();
});
requestAnimationFrame(() => {
  resize();
  positionNodes();
});

// Build legend
document.getElementById('graphLegend').innerHTML =
  CLUSTER_NAMES.map(
    (n, i) =>
      `<div class="legend-row"><div class="legend-dot" style="background:${CLUSTER_COLORS[i]}"></div>${n}</div>`,
  ).join('') +
  `<div class="legend-row" style="margin-top:4px;border-top:1px solid var(--border-color);padding-top:4px;">` +
  `<div class="legend-dot" style="background:transparent;border:1.5px dashed var(--text-muted)"></div>Cross-cluster bridge</div>`;

// Initialize first tab
panelContent.innerHTML = buildTab0();

// Mode toggle
const modeToggle = /** @type {HTMLElement} */ (document.getElementById('modeToggle'));
modeToggle.onclick = function () {
  this.classList.toggle('off');
};

// AI chat drag
const aiChat = /** @type {HTMLElement} */ (document.getElementById('aiChat'));
let chatDragging = false,
  chatDX,
  chatDY;
/** @type {HTMLElement} */ (aiChat.querySelector('.ai-chat-header')).onmousedown = (e) => {
  if (/** @type {HTMLElement} */ (e.target).tagName === 'BUTTON') return;
  chatDragging = true;
  const r = aiChat.getBoundingClientRect();
  chatDX = e.clientX - r.left;
  chatDY = e.clientY - r.top;
  aiChat.style.transition = 'none';
};
window.addEventListener('mousemove', (e) => {
  if (!chatDragging) return;
  const pr = graphArea.getBoundingClientRect();
  aiChat.style.transform = 'none';
  aiChat.style.left = e.clientX - pr.left - chatDX + 'px';
  aiChat.style.top = e.clientY - pr.top - chatDY + 'px';
});
window.addEventListener('mouseup', () => (chatDragging = false));

// Main render loop
let frameCount = 0;
function loop() {
  updateFlyTo();

  // Animate node alpha toward target
  let anyTransitioning = false;
  for (const n of nodes) {
    if (Math.abs(n.alpha - n.targetAlpha) > 0.005) {
      n.alpha += (n.targetAlpha - n.alpha) * 0.12;
      anyTransitioning = true;
      if (Math.abs(n.alpha - n.targetAlpha) < 0.01) n.alpha = n.targetAlpha;
    }
    n.visible = n.alpha > 0.02;
  }
  if (anyTransitioning) state.labelVisCache = null;

  simulate();
  draw();
  if (state.showMinimap && frameCount % 3 === 0) drawMinimap();
  frameCount++;
  requestAnimationFrame(loop);
}

// Start
updateStatus();
loop();
