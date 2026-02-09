/* ============================================
   MindGraph — Force-Directed Physics Simulation
   ============================================ */

import { state } from './state.js';
import { random, PHYSICS, CLUSTER_NAMES } from './config.js';
import { nodes, edges, NUM_NODES } from './graph-data.js';

const NUM_CLUSTERS = CLUSTER_NAMES.length;
const NODES_PER_CLUSTER = NUM_NODES / NUM_CLUSTERS;

export function simulate() {
  if (state.W < 10 || state.H < 10) return;
  const cx = state.W * PHYSICS.CENTER_X_RATIO;
  const cy = state.H * PHYSICS.CENTER_Y_RATIO;
  const sp = Math.min(state.W, state.H);

  // Spring forces from edges
  for (const e of edges) {
    const a = nodes[e.a],
      b = nodes[e.b];
    if (!a.visible || !b.visible) continue;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
    const ideal = a.cluster === b.cluster ? PHYSICS.SPRING_LENGTH_SAME : PHYSICS.SPRING_LENGTH_CROSS;
    const f = (dist - ideal) * PHYSICS.SPRING_CONSTANT * e.weight;
    const fx = (dx / dist) * f,
      fy = (dy / dist) * f;
    if (!a.pinned) {
      a.vx += fx;
      a.vy += fy;
    }
    if (!b.pinned) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  for (let i = 0; i < NUM_NODES; i++) {
    const n = nodes[i];
    if (n.pinned || !n.visible) continue;

    // Label-footprint repulsion
    let repX = 0,
      repY = 0;

    for (let j = i + 1; j < Math.min(i + 20, NUM_NODES); j++) {
      const m = nodes[j];
      if (!m.visible) continue;
      const gapX = n.x < m.x ? m.x - m.fpLeft - (n.x + n.fpRight) : n.x - n.fpLeft - (m.x + m.fpRight);
      const gapY = Math.abs(n.y - m.y) - n.fpY - m.fpY;
      if (gapX < PHYSICS.REPULSION_MARGIN && gapY < PHYSICS.REPULSION_MARGIN) {
        const dx = n.x - m.x,
          dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const overlapX = PHYSICS.REPULSION_MARGIN - gapX,
          overlapY = PHYSICS.REPULSION_MARGIN - gapY;
        const strength = (PHYSICS.REPULSION_STRENGTH * Math.min(overlapX, 60) * Math.min(overlapY, 30)) / (dist + 20);
        const fx = (dx / dist) * strength,
          fy = (dy / dist) * strength;
        repX += fx;
        repY += fy;
        if (!m.pinned) {
          m.vx -= fx;
          m.vy -= fy;
        }
      }
    }

    // Same-cluster pass
    const cBase = n.cluster * NODES_PER_CLUSTER;
    for (let j = cBase; j < cBase + NODES_PER_CLUSTER; j++) {
      if (j === i) continue;
      const m = nodes[j];
      if (!m.visible) continue;
      const gapX = n.x < m.x ? m.x - m.fpLeft - (n.x + n.fpRight) : n.x - n.fpLeft - (m.x + m.fpRight);
      const gapY = Math.abs(n.y - m.y) - n.fpY - m.fpY;
      if (gapX < PHYSICS.REPULSION_MARGIN && gapY < PHYSICS.REPULSION_MARGIN) {
        const dx = n.x - m.x,
          dy = n.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const overlapX = PHYSICS.REPULSION_MARGIN - gapX,
          overlapY = PHYSICS.REPULSION_MARGIN - gapY;
        const strength = (PHYSICS.REPULSION_CLUSTER * Math.min(overlapX, 60) * Math.min(overlapY, 30)) / (dist + 20);
        const fx = (dx / dist) * strength,
          fy = (dy / dist) * strength;
        repX += fx;
        repY += fy;
        if (!m.pinned) {
          m.vx -= fx;
          m.vy -= fy;
        }
      }
    }

    // Apply repulsion
    n.vx += repX;
    n.vy += repY;

    // Gravity (gentle, suppressed where opposing repulsion)
    let gx = (cx - n.x) * PHYSICS.GRAVITY_GLOBAL;
    let gy = (cy - n.y) * PHYSICS.GRAVITY_GLOBAL;
    const ca = (n.cluster / NUM_CLUSTERS) * Math.PI * 2;
    const cr = sp * PHYSICS.CLUSTER_ORBIT_RADIUS;
    gx += (cx + Math.cos(ca) * cr - n.x) * PHYSICS.GRAVITY_CLUSTER;
    gy += (cy + Math.sin(ca) * cr * PHYSICS.CLUSTER_ORBIT_SQUASH - n.y) * PHYSICS.GRAVITY_CLUSTER;

    const repMag = Math.sqrt(repX * repX + repY * repY);
    if (repMag > 0.001) {
      const dot = gx * repX + gy * repY;
      if (dot < 0) {
        const suppress = Math.min(1, repMag * PHYSICS.GRAVITY_SUPPRESS);
        const projScale = (dot / (repMag * repMag)) * suppress;
        gx -= repX * projScale;
        gy -= repY * projScale;
      }
    }

    n.vx += gx;
    n.vy += gy;
    n.vx += (random() - 0.5) * PHYSICS.JITTER;
    n.vy += (random() - 0.5) * PHYSICS.JITTER;
    n.vx *= PHYSICS.DAMPING;
    n.vy *= PHYSICS.DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(PHYSICS.BOUNDARY_PADDING, Math.min(state.W - PHYSICS.BOUNDARY_PADDING, n.x));
    n.y = Math.max(PHYSICS.BOUNDARY_PADDING, Math.min(state.H - PHYSICS.BOUNDARY_PADDING, n.y));
  }
}

export function positionNodes() {
  const cx = state.W * PHYSICS.CENTER_X_RATIO;
  const cy = state.H * PHYSICS.CENTER_Y_RATIO;
  const sp = Math.min(state.W, state.H);
  for (const n of nodes) {
    if (n.pinned) continue;
    n.x = cx + Math.cos(n._a) * n._d * sp + n._jx * sp;
    n.y = cy + Math.sin(n._a) * n._d * sp + n._jy * sp;
    n.vx = 0;
    n.vy = 0;
  }
}
