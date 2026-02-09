/* ============================================
   MindGraph — State Actions (node selection, depth)
   ============================================ */

import { state } from '../core/state.js';
import { flyToNode } from '../core/camera.js';
import { updateDepthMap } from './renderer.js';
import { updateND, updatePathBanner } from './panels.js';

/** @param {import('../../types/graph').GraphNode} n */
export function selectNode(n) {
  if (state.selectedNode === n) {
    state.selectedNode = null;
    state.depthMap = null;
  } else {
    state.selectedNode = n;
    state.pathResult = null;
    state.pathStart = null;
    state.pathParticles = [];
    updatePathBanner();
    state.selectionDepth = 1;
    updateDepthMap();
    flyToNode(n);
  }
  state.labelVisCache = null;
  updateND();
}

/** @param {number} d */
export function setDepth(d) {
  state.selectionDepth = d;
  updateDepthMap();
  state.labelVisCache = null;
  document
    .querySelectorAll('.nd-depth-btn')
    .forEach((/** @type {HTMLElement} */ b) => b.classList.toggle('active', +b.dataset.depth === d));
  updateND();
}
