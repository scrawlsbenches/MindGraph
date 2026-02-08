/* ============================================
   MindGraph — Graph Data (Nodes & Edges)
   ============================================ */

import { CLUSTER_KEYWORDS, CLUSTER_COLORS, CROSS_CLUSTER_BRIDGES } from './config.js';

export const nodes = [];
export const edges = [];
export const adj = new Map();

// Build nodes from cluster keywords
(function buildNodes() {
  let nid = 0;
  CLUSTER_KEYWORDS.forEach((words, ci) => {
    words.forEach((word, wi) => {
      nodes.push({
        id: nid++,
        word,
        cluster: ci,
        color: CLUSTER_COLORS[ci],
        r: wi < 4 ? 8 + Math.random() * 5 : 2.5 + Math.random() * 5,
        x: 0, y: 0, vx: 0, vy: 0,
        _a: (ci / 5) * Math.PI * 2 + (Math.random() - 0.5) * 1.0,
        _d: 0.12 + Math.random() * 0.28,
        _jx: (Math.random() - 0.5) * 0.12,
        _jy: (Math.random() - 0.5) * 0.12,
        pinned: false,
        matchesSearch: true,
        visible: true,
        alpha: 1,
        targetAlpha: 1,
      });
    });
  });

  for (const n of nodes) {
    const fs = Math.max(9, n.r * 1.2);
    n.labelW = n.word.length * fs * 0.55;
    n.labelH = fs;
    n.fpRight = n.r + 4 + n.labelW;
    n.fpLeft = n.r;
    n.fpY = Math.max(n.r, fs * 0.6);
  }
})();

export const NUM_NODES = nodes.length;

function addEdge(a, b, w) {
  if (a === b) return;
  const k = Math.min(a, b) + '-' + Math.max(a, b);
  if (edges.find(e => e.key === k)) return;
  edges.push({ a, b, weight: w, key: k });
  if (!adj.has(a)) adj.set(a, new Set());
  if (!adj.has(b)) adj.set(b, new Set());
  adj.get(a).add(b);
  adj.get(b).add(a);
}

(function buildIntraClusterEdges() {
  CLUSTER_KEYWORDS.forEach((words, ci) => {
    const base = ci * 20;
    for (let i = 0; i < words.length; i++) {
      const nc = 2 + Math.floor(Math.random() * 3);
      for (let c = 0; c < nc; c++) {
        const j = Math.random() < 0.4
          ? Math.floor(Math.random() * 4)
          : Math.floor(Math.random() * words.length);
        if (j !== i) addEdge(base + i, base + j, 0.5 + Math.random() * 0.5);
      }
    }
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        addEdge(base + i, base + j, 0.8 + Math.random() * 0.2);
      }
    }
  });
})();

(function buildCrossClusterEdges() {
  CROSS_CLUSTER_BRIDGES.forEach(([c1, c2, w1, w2]) => {
    const n1 = nodes.find(n => n.cluster === c1 && n.word === w1);
    const n2 = nodes.find(n => n.cluster === c2 && n.word === w2);
    if (n1 && n2) addEdge(n1.id, n2.id, 0.3 + Math.random() * 0.3);
  });
})();

export function neighbors(id) {
  return adj.get(id) || new Set();
}
