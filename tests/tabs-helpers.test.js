import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock graph-data to avoid IIFE side effects
const mockNodes = [];
const mockAdj = new Map();
const mockEdges = [];
let mockNumNodes = 0;

vi.mock('../src/js/core/graph-data.js', () => ({
  get nodes() { return mockNodes; },
  get adj() { return mockAdj; },
  get edges() { return mockEdges; },
  get NUM_NODES() { return mockNumNodes; },
}));

// Config is pure constants, safe to mock with minimal set
vi.mock('../src/js/core/config.js', () => ({
  CLUSTER_NAMES: ['A', 'B'],
  CLUSTER_KEYWORDS: [['a1', 'a2'], ['b1', 'b2']],
  CLUSTER_COLORS: ['#ff0000', '#00ff00'],
}));

import {
  wordSentiment,
  computeBridgeScore,
  computeDegrees,
  computeGraphDensity,
  computeClusteringCoeff,
} from '../src/js/analytics/tabs.js';

/**
 * Build a small graph for analytics tests:
 *   Cluster 0: nodes 0, 1 (connected)
 *   Cluster 1: nodes 2, 3 (connected)
 *   Bridge: 1 -- 2
 */
function setupGraph() {
  mockNodes.length = 0;
  mockAdj.clear();
  mockEdges.length = 0;

  mockNodes.push(
    { id: 0, cluster: 0, visible: true },
    { id: 1, cluster: 0, visible: true },
    { id: 2, cluster: 1, visible: true },
    { id: 3, cluster: 1, visible: true },
  );
  mockNumNodes = 4;

  function addEdge(a, b, w) {
    mockEdges.push({ a, b, weight: w, key: `${Math.min(a, b)}-${Math.max(a, b)}` });
    if (!mockAdj.has(a)) mockAdj.set(a, new Set());
    if (!mockAdj.has(b)) mockAdj.set(b, new Set());
    mockAdj.get(a).add(b);
    mockAdj.get(b).add(a);
  }

  addEdge(0, 1, 0.8); // intra-cluster 0
  addEdge(2, 3, 0.8); // intra-cluster 1
  addEdge(1, 2, 0.5); // bridge
}

describe('wordSentiment', () => {
  it('returns 1 for positive words', () => {
    expect(wordSentiment('nice')).toBe(1);
    expect(wordSentiment('bright')).toBe(1);
    expect(wordSentiment('calm')).toBe(1);
    expect(wordSentiment('dream')).toBe(1);
    expect(wordSentiment('festival')).toBe(1);
  });

  it('returns -1 for negative words', () => {
    expect(wordSentiment('strange')).toBe(-1);
    expect(wordSentiment('odd')).toBe(-1);
    expect(wordSentiment('push')).toBe(-1);
    expect(wordSentiment('wall')).toBe(-1);
    expect(wordSentiment('leave')).toBe(-1);
  });

  it('returns 0 for neutral/unknown words', () => {
    expect(wordSentiment('start')).toBe(0);
    expect(wordSentiment('time')).toBe(0);
    expect(wordSentiment('apartment')).toBe(0);
    expect(wordSentiment('xyzzy')).toBe(0);
  });
});

describe('computeBridgeScore', () => {
  beforeEach(setupGraph);

  it('returns 0 for node with only same-cluster connections', () => {
    // Node 0 connects only to node 1 (same cluster)
    expect(computeBridgeScore(mockNodes[0])).toBe(0);
  });

  it('returns count of cross-cluster connections', () => {
    // Node 1 connects to 0 (same cluster) and 2 (different cluster)
    expect(computeBridgeScore(mockNodes[1])).toBe(1);
  });

  it('returns 0 for isolated node', () => {
    mockNodes.push({ id: 4, cluster: 0, visible: true });
    mockNumNodes = 5;
    expect(computeBridgeScore(mockNodes[4])).toBe(0);
  });
});

describe('computeDegrees', () => {
  beforeEach(setupGraph);

  it('returns correct degree for each node', () => {
    const degs = computeDegrees();
    expect(degs).toHaveLength(4);
    expect(degs[0].deg).toBe(1); // node 0: connects to 1
    expect(degs[1].deg).toBe(2); // node 1: connects to 0, 2
    expect(degs[2].deg).toBe(2); // node 2: connects to 1, 3
    expect(degs[3].deg).toBe(1); // node 3: connects to 2
  });
});

describe('computeGraphDensity', () => {
  beforeEach(setupGraph);

  it('returns correct density', () => {
    // 4 nodes, 3 edges. Max edges = 4*3/2 = 6. Density = 3/6 = 0.5
    const density = computeGraphDensity();
    expect(density).toBeCloseTo(0.5);
  });
});

describe('computeClusteringCoeff', () => {
  beforeEach(setupGraph);

  it('returns a number between 0 and 1', () => {
    const cc = computeClusteringCoeff();
    expect(cc).toBeGreaterThanOrEqual(0);
    expect(cc).toBeLessThanOrEqual(1);
  });

  it('returns 0 for a graph with no triangles', () => {
    // Our test graph has no triangles (it's a path: 0-1-2-3)
    const cc = computeClusteringCoeff();
    expect(cc).toBe(0);
  });

  it('returns 1 for a fully connected triangle', () => {
    // Reset to triangle
    mockNodes.length = 0;
    mockAdj.clear();
    mockEdges.length = 0;
    mockNodes.push(
      { id: 0, cluster: 0, visible: true },
      { id: 1, cluster: 0, visible: true },
      { id: 2, cluster: 0, visible: true },
    );
    mockNumNodes = 3;

    function addEdge(a, b) {
      mockEdges.push({ a, b, weight: 1, key: `${a}-${b}` });
      if (!mockAdj.has(a)) mockAdj.set(a, new Set());
      if (!mockAdj.has(b)) mockAdj.set(b, new Set());
      mockAdj.get(a).add(b);
      mockAdj.get(b).add(a);
    }
    addEdge(0, 1);
    addEdge(1, 2);
    addEdge(0, 2);

    const cc = computeClusteringCoeff();
    expect(cc).toBeCloseTo(1);
  });
});
