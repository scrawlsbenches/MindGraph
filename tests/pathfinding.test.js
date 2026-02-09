import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so shared mock state is available inside the hoisted vi.mock factory
const { mockAdj, mockNodes } = vi.hoisted(() => ({
  mockAdj: new Map(),
  mockNodes: [],
}));

vi.mock('../src/js/core/graph-data.js', () => ({
  adj: mockAdj,
  nodes: mockNodes,
}));

import { bfsPath, getNeighborsAtDepth } from '../src/js/core/pathfinding.js';

/**
 * Build a simple test graph:
 *   0 -- 1 -- 2 -- 3
 *        |         |
 *        4         5  (isolated: 6)
 */
function setupGraph() {
  mockAdj.clear();
  mockNodes.length = 0;

  for (let i = 0; i < 7; i++) {
    mockNodes.push({ id: i, visible: true });
  }

  function addEdge(a, b) {
    if (!mockAdj.has(a)) mockAdj.set(a, new Set());
    if (!mockAdj.has(b)) mockAdj.set(b, new Set());
    mockAdj.get(a).add(b);
    mockAdj.get(b).add(a);
  }

  addEdge(0, 1);
  addEdge(1, 2);
  addEdge(2, 3);
  addEdge(1, 4);
  addEdge(3, 5);
  // 6 is isolated (no edges)
}

describe('bfsPath', () => {
  beforeEach(setupGraph);

  it('returns single-element path for same start and end', () => {
    expect(bfsPath(0, 0)).toEqual([0]);
  });

  it('finds direct neighbor path', () => {
    expect(bfsPath(0, 1)).toEqual([0, 1]);
  });

  it('finds shortest path across multiple hops', () => {
    const path = bfsPath(0, 3);
    expect(path).toEqual([0, 1, 2, 3]);
  });

  it('finds path through branch', () => {
    const path = bfsPath(4, 5);
    // 4 → 1 → 2 → 3 → 5
    expect(path).toEqual([4, 1, 2, 3, 5]);
  });

  it('returns null for disconnected nodes', () => {
    expect(bfsPath(0, 6)).toBeNull();
  });

  it('returns null when node has no adjacency entry', () => {
    expect(bfsPath(6, 0)).toBeNull();
  });

  it('skips invisible nodes', () => {
    // Hide node 2, so path 0→3 must not go through 2
    mockNodes[2].visible = false;
    expect(bfsPath(0, 3)).toBeNull();
  });

  it('finds alternate path when one route is blocked', () => {
    // Add shortcut 0→3 and hide node 2
    if (!mockAdj.has(0)) mockAdj.set(0, new Set());
    mockAdj.get(0).add(3);
    if (!mockAdj.has(3)) mockAdj.set(3, new Set());
    mockAdj.get(3).add(0);

    mockNodes[2].visible = false;
    const path = bfsPath(0, 3);
    expect(path).toEqual([0, 3]);
  });
});

describe('getNeighborsAtDepth', () => {
  beforeEach(setupGraph);

  it('returns only the node itself at depth 0', () => {
    const result = getNeighborsAtDepth(0, 0);
    expect(result.size).toBe(1);
    expect(result.get(0)).toBe(0);
  });

  it('returns direct neighbors at depth 1', () => {
    const result = getNeighborsAtDepth(1, 1);
    expect(result.get(1)).toBe(0); // node 1 itself at depth 0
    expect(result.get(0)).toBe(1); // neighbor at depth 1
    expect(result.get(2)).toBe(1);
    expect(result.get(4)).toBe(1);
    expect(result.has(3)).toBe(false); // too far
  });

  it('returns 2-hop neighborhood at depth 2', () => {
    const result = getNeighborsAtDepth(0, 2);
    expect(result.get(0)).toBe(0);
    expect(result.get(1)).toBe(1);
    expect(result.get(2)).toBe(2);
    expect(result.get(4)).toBe(2);
    expect(result.has(3)).toBe(false); // depth 3
  });

  it('returns full reachable graph at depth 3', () => {
    const result = getNeighborsAtDepth(0, 3);
    expect(result.get(0)).toBe(0);
    expect(result.get(1)).toBe(1);
    expect(result.get(2)).toBe(2);
    expect(result.get(3)).toBe(3);
    expect(result.get(4)).toBe(2);
    expect(result.has(6)).toBe(false); // isolated
  });

  it('returns only self for isolated node', () => {
    const result = getNeighborsAtDepth(6, 3);
    expect(result.size).toBe(1);
    expect(result.get(6)).toBe(0);
  });

  it('skips invisible neighbors', () => {
    mockNodes[1].visible = false;
    const result = getNeighborsAtDepth(0, 3);
    // Node 1 is invisible, so 0 can't reach anything
    expect(result.size).toBe(1);
    expect(result.get(0)).toBe(0);
  });
});
