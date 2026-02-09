/**
 * MindGraph — Core Type Definitions
 *
 * These interfaces define the shape of graph data objects.
 * Used by checkJs via JSDoc @type annotations.
 */

export interface GraphNode {
  id: number;
  word: string;
  cluster: number;
  color: string;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  _a: number;
  _d: number;
  _jx: number;
  _jy: number;
  pinned: boolean;
  matchesSearch: boolean;
  visible: boolean;
  alpha: number;
  targetAlpha: number;
  labelW: number;
  labelH: number;
  fpRight: number;
  fpLeft: number;
  fpY: number;
}

export interface GraphEdge {
  a: number;
  b: number;
  weight: number;
  key: string;
}

export interface AppState {
  camX: number;
  camY: number;
  camZoom: number;
  W: number;
  H: number;
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  activeCluster: number;
  searchQuery: string;
  depthMap: Map<number, number> | null;
  labelVisCache: Set<number> | null;
  selectionDepth: number;
  showHulls: boolean;
  showMinimap: boolean;
  pathMode: boolean;
  pathStart: GraphNode | null;
  pathResult: number[] | null;
  pathParticles: Array<{ t: number; speed: number }>;
}
