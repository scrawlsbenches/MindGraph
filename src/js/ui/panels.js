/* ============================================
   MindGraph — Panel Management (right panel, node detail, path)
   ============================================ */

import { state } from '../core/state.js';
import { nodes, edges, neighbors } from '../core/graph-data.js';
import { CLUSTER_NAMES } from '../core/config.js';
import { buildTab0, buildTab1, buildTab2, buildTab3, buildTab4, buildTab5, buildTab6, buildTab7 } from '../analytics/tabs.js';
import { selectNode } from './interaction.js';
import { mmDiv } from './minimap.js';

const nodeDetail = document.getElementById('nodeDetail');
export const panelContent = document.getElementById('panelContent');

// Close node detail
document.getElementById('ndClose').onclick = () => {
  state.selectedNode = null; state.depthMap = null; state.labelVisCache = null;
  updateND();
};

// Update node detail popover
export function updateND() {
  if (!state.selectedNode) { nodeDetail.classList.remove('visible'); updateStatus(); return; }
  const n = state.selectedNode;
  nodeDetail.classList.add('visible');
  document.getElementById('ndDot').style.background = n.color;
  const w = document.getElementById('ndWord');
  w.textContent = n.word; w.style.color = n.color;

  const directNb = neighbors(n.id);
  const same = [...directNb].filter(id => nodes[id].cluster === n.cluster);
  const diff = [...directNb].filter(id => nodes[id].cluster !== n.cluster);
  const totalVisible = state.depthMap ? state.depthMap.size - 1 : directNb.size;

  document.getElementById('ndMeta').innerHTML =
    `<b>Cluster:</b> ${CLUSTER_NAMES[n.cluster]}<br>` +
    `<b>Direct:</b> ${directNb.size} connections \u00B7 ${diff.length} bridges` +
    (state.selectionDepth > 1 ? `<br><b>Depth ${state.selectionDepth}:</b> ${totalVisible} nodes visible` : '');

  document.querySelectorAll('.nd-depth-btn').forEach((/** @type {HTMLElement} */ b) =>
    b.classList.toggle('active', +b.dataset.depth === state.selectionDepth)
  );

  document.getElementById('ndConnections').innerHTML = same.map(id => {
    const m = nodes[id];
    return `<span class="nd-chip" data-nid="${id}"><span class="cd" style="background:${m.color}"></span>${m.word}</span>`;
  }).join('');

  document.getElementById('ndBridges').innerHTML = diff.length
    ? diff.map(id => {
        const m = nodes[id];
        return `<span class="nd-chip" data-nid="${id}"><span class="cd" style="background:${m.color}"></span>${m.word} <span style="opacity:0.5;font-size:9px">(${CLUSTER_NAMES[m.cluster].split(' ')[0]})</span></span>`;
      }).join('')
    : '<span style="font-size:11px;color:var(--text-muted)">No cross-cluster bridges</span>';

  nodeDetail.querySelectorAll('.nd-chip').forEach((/** @type {HTMLElement} */ c) => {
    c.onclick = () => { const t = nodes[+c.dataset.nid]; if (t) selectNode(t); };
  });
  updateStatus();
}

// Path banner
export function updatePathBanner() {
  const banner = document.getElementById('pathBanner');
  const pathNodes = document.getElementById('pathNodes');
  if (!state.pathStart && !state.pathResult) {
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');
  if (state.pathResult) {
    pathNodes.innerHTML = state.pathResult.map((id, i) => {
      const n = nodes[id];
      return (i > 0 ? '<span class="path-arrow">\u2192</span>' : '') +
        `<span class="path-node" style="background:${n.color}30;color:${n.color}" onclick="selectNode(nodes[${id}]);updateND()">${n.word}</span>`;
    }).join('');
  } else if (state.pathStart) {
    pathNodes.innerHTML = `<span class="path-node" style="background:${state.pathStart.color}30;color:${state.pathStart.color}">${state.pathStart.word}</span>` +
      '<span class="path-arrow">\u2192</span><span style="color:var(--text-muted);font-size:11px">click target node</span>';
  }
}

document.getElementById('pathClose').onclick = () => {
  state.pathStart = null; state.pathResult = null; state.pathParticles = [];
  state.labelVisCache = null;
  updatePathBanner();
};

// Graph control buttons
const btnHulls = /** @type {HTMLButtonElement} */ (document.getElementById('btnHulls'));
btnHulls.onclick = function() {
  state.showHulls = !state.showHulls;
  this.classList.toggle('active', state.showHulls);
};

const btnPathMode = /** @type {HTMLButtonElement} */ (document.getElementById('btnPathMode'));
btnPathMode.onclick = function() {
  state.pathMode = !state.pathMode;
  this.classList.toggle('active', state.pathMode);
  if (!state.pathMode) {
    state.pathStart = null; state.pathResult = null; state.pathParticles = [];
    state.labelVisCache = null;
    updatePathBanner();
  }
};

const btnMinimap = /** @type {HTMLButtonElement} */ (document.getElementById('btnMinimap'));
btnMinimap.onclick = function() {
  state.showMinimap = !state.showMinimap;
  this.classList.toggle('active', state.showMinimap);
  mmDiv.classList.toggle('hidden', !state.showMinimap);
};

// Right panel close/toggle
document.getElementById('panelClose').onclick = () => {
  document.getElementById('rightPanel').classList.add('collapsed');
  document.getElementById('panelToggle').classList.add('visible');
};

document.getElementById('panelToggle').onclick = () => {
  document.getElementById('rightPanel').classList.remove('collapsed');
  document.getElementById('panelToggle').classList.remove('visible');
};

// AI chat close
document.getElementById('aiChatClose').onclick = () => {
  document.getElementById('aiChat').style.display = 'none';
};

// Tab switching
let _currentTab = 0;
const tabBuilders = [buildTab0, buildTab1, buildTab2, buildTab3, buildTab4, buildTab5, buildTab6, buildTab7];

document.querySelectorAll('.panel-tab').forEach((/** @type {HTMLElement} */ tab) => {
  tab.addEventListener('click', function() {
    const idx = +/** @type {HTMLElement} */ (this).dataset.tab;
    _currentTab = idx;
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    panelContent.innerHTML = tabBuilders[idx]();
  });
});

// Status bar
export function updateStatus() {
  const vis = nodes.filter(n => n.visible).length;
  const sel = state.selectedNode ? ` \u00B7 Selected: ${state.selectedNode.word}` : '';
  const srch = state.searchQuery ? ` \u00B7 Search: "${state.searchQuery}"` : '';
  document.getElementById('statusText').textContent = `${vis} nodes \u00B7 ${edges.length} edges${sel}${srch}`;
}
