/* ============================================
   MindGraph — Pathfinding & Neighborhood
   ============================================ */

import { adj, nodes } from './graph-data.js';

/**
 * BFS shortest path between two nodes.
 * @param {number} startId
 * @param {number} endId
 * @returns {number[] | null}
 */
export function bfsPath(startId, endId) {
  if (startId === endId) return [startId];
  const visited = new Set([startId]);
  const queue = [[startId]];
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    for (const nb of adj.get(last) || []) {
      if (!nodes[nb].visible) continue;
      if (nb === endId) return [...path, nb];
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push([...path, nb]);
      }
    }
  }
  return null;
}

/**
 * N-depth neighborhood from a node.
 * @param {number} nodeId
 * @param {number} depth
 * @returns {Map<number, number>}
 */
export function getNeighborsAtDepth(nodeId, depth) {
  const result = new Map();
  result.set(nodeId, 0);
  let frontier = new Set([nodeId]);
  for (let d = 1; d <= depth; d++) {
    const next = new Set();
    for (const id of frontier) {
      for (const nb of adj.get(id) || []) {
        if (!result.has(nb) && nodes[nb].visible) {
          result.set(nb, d);
          next.add(nb);
        }
      }
    }
    frontier = next;
  }
  return result;
}
