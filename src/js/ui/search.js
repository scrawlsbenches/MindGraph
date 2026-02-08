/* ============================================
   MindGraph — Search & Cluster Filtering
   ============================================ */

import { state } from '../core/state.js';
import { nodes } from '../core/graph-data.js';
import { CLUSTER_NAMES, CLUSTER_KEYWORDS } from '../core/config.js';
import { updateStatus } from './panels.js';

export const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('searchInput'));
const searchClear = /** @type {HTMLButtonElement} */ (document.getElementById('searchClear'));
const searchBox = /** @type {HTMLDivElement} */ (document.getElementById('searchBox'));

searchInput.oninput = () => {
  state.searchQuery = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('visible', state.searchQuery.length > 0);
  searchBox.classList.toggle('active', state.searchQuery.length > 0);
  nodes.forEach(n => n.matchesSearch = state.searchQuery ? n.word.includes(state.searchQuery) : true);
  state.labelVisCache = null;
  updateStatus();
};

searchClear.onclick = () => {
  searchInput.value = '';
  state.searchQuery = '';
  searchClear.classList.remove('visible');
  searchBox.classList.remove('active');
  nodes.forEach(n => n.matchesSearch = true);
  state.labelVisCache = null;
  updateStatus();
};

// Cluster filter pills
const filterPills = document.getElementById('filterPills');
CLUSTER_NAMES.forEach((name, ci) => {
  const b = document.createElement('button');
  b.className = 'filter-pill';
  b.dataset.cluster = String(ci);
  b.textContent = CLUSTER_KEYWORDS[ci][0];
  b.onclick = () => toggleCluster(ci);
  filterPills.appendChild(b);
});

export function toggleCluster(ci) {
  state.activeCluster = state.activeCluster === ci ? -1 : ci;
  filterPills.querySelectorAll('.filter-pill').forEach((/** @type {HTMLElement} */ p) =>
    p.classList.toggle('dimmed', state.activeCluster !== -1 && +p.dataset.cluster !== state.activeCluster)
  );
  nodes.forEach(n => {
    n.targetAlpha = (state.activeCluster === -1 || n.cluster === state.activeCluster) ? 1 : 0;
  });
  const h = nodes.filter(n => n.targetAlpha === 0).length;
  document.getElementById('hiddenLabel').textContent = h > 0 ? h + ' hidden' : '';
  document.querySelectorAll('.topic-card').forEach((/** @type {HTMLElement} */ tc) =>
    tc.classList.toggle('active', state.activeCluster === +tc.dataset.cluster)
  );
  state.labelVisCache = null;
  updateStatus();
}
