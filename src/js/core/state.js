/* ============================================
   MindGraph — Shared Mutable State
   ============================================
   All cross-module mutable state lives here as
   a single flat object. Modules import `state`
   and read/write properties directly.
   ============================================ */

/** @type {import('../../types/graph').AppState} */
export const state = {
  // Camera & viewport
  camX: 0,
  camY: 0,
  camZoom: 1,
  W: 0,
  H: 0,

  // Selection
  selectedNode: null,
  hoveredNode: null,
  activeCluster: -1,
  searchQuery: '',
  depthMap: null,
  labelVisCache: null,
  selectionDepth: 1,

  // Feature toggles
  showHulls: true,
  showMinimap: true,

  // Path finder
  pathMode: false,
  pathStart: null,
  pathResult: null,
  pathParticles: [],
};
