/* ============================================
   MindGraph — Configuration & Constants
   ============================================ */

export const CLUSTER_NAMES = [
  'Time & Feelings',
  'Journey & Movement',
  'Surprise & Discovery',
  'Home & Space',
  'Festival & Social'
];

export const CLUSTER_COLORS = ['#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#a855f7'];

export const CLUSTER_KEYWORDS = [
  ['start', 'time', 'feel', 'realize', 'morning', 'gradually', 'walk', 'begin', 'moment', 'dream',
   'night', 'path', 'wonder', 'breath', 'calm', 'journey', 'rise', 'listen', 'open', 'slow'],
  ['back', 'leave', 'meet', 'arrive', 'return', 'drive', 'car', 'boat', 'end', 'turn',
   'go', 'come', 'far', 'near', 'fast', 'stop', 'wait', 'run', 'push', 'pull'],
  ['bit', 'nice', 'strange', 'surprise', 'find', 'kind', 'curious', 'odd', 'unexpected', 'discover',
   'explore', 'bright', 'sweet', 'quiet', 'soft', 'warm', 'light', 'small', 'new', 'gentle'],
  ['apartment', 'place', 'father', 'mother', 'room', 'door', 'window', 'house', 'kitchen', 'hallway',
   'floor', 'table', 'chair', 'mirror', 'wall', 'staircase', 'roof', 'bedroom', 'bathroom', 'home'],
  ['festival', 'friend', 'woman', 'crowd', 'dance', 'music', 'show', 'talk', 'event', 'art',
   'happening', 'work', 'workshop', 'studio', 'book', 'project', 'big', 'point', 'guy', 'make'],
];

export const CROSS_CLUSTER_BRIDGES = [
  [0,1,'start','arrive'], [0,1,'moment','return'], [0,1,'walk','go'], [0,1,'feel','leave'],
  [0,2,'feel','nice'], [0,2,'realize','discover'], [0,2,'wonder','curious'], [0,2,'calm','quiet'],
  [0,3,'morning','room'], [0,3,'dream','house'], [0,3,'night','bedroom'], [0,3,'path','hallway'],
  [0,4,'journey','festival'], [0,4,'feel','music'], [0,4,'walk','dance'], [0,4,'listen','show'],
  [1,2,'meet','surprise'], [1,2,'arrive','find'], [1,2,'come','discover'], [1,2,'near','warm'],
  [1,3,'back','apartment'], [1,3,'leave','door'], [1,3,'drive','house'], [1,3,'return','home'],
  [1,4,'meet','friend'], [1,4,'come','crowd'], [1,4,'go','event'], [1,4,'arrive','festival'],
  [2,3,'strange','room'], [2,3,'discover','hallway'], [2,3,'light','window'], [2,3,'quiet','house'],
  [2,4,'explore','workshop'], [2,4,'curious','art'], [2,4,'nice','show'], [2,4,'bright','festival'],
  [3,4,'house','festival'], [3,4,'place','event'], [3,4,'room','studio'], [3,4,'door','work'],
];

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const FLY_DURATION = 400;

/* === Physics Simulation Constants === */
export const PHYSICS = {
  // Center of mass offset ratios (fraction of viewport W/H)
  CENTER_X_RATIO: 0.45,
  CENTER_Y_RATIO: 0.48,

  // Spring forces
  SPRING_LENGTH_SAME: 65,      // ideal spring length for same-cluster edges
  SPRING_LENGTH_CROSS: 120,    // ideal spring length for cross-cluster edges
  SPRING_CONSTANT: 0.0003,     // spring force multiplier

  // Label-footprint repulsion
  REPULSION_MARGIN: 6,         // pixel gap threshold for repulsion
  REPULSION_STRENGTH: 0.14,    // general label repulsion strength
  REPULSION_CLUSTER: 0.10,     // same-cluster label repulsion strength

  // Gravity
  GRAVITY_GLOBAL: 0.00002,     // pull toward viewport center
  GRAVITY_CLUSTER: 0.00006,    // pull toward cluster orbit center
  CLUSTER_ORBIT_RADIUS: 0.24,  // cluster center orbit radius (fraction of min(W,H))
  CLUSTER_ORBIT_SQUASH: 0.85,  // vertical squash factor for elliptical orbits

  // Gravity suppression
  GRAVITY_SUPPRESS: 8,         // suppression factor when gravity opposes repulsion

  // Jitter & damping
  JITTER: 0.04,                // random velocity noise magnitude
  DAMPING: 0.90,               // velocity damping per frame (0=freeze, 1=no friction)

  // Boundary
  BOUNDARY_PADDING: 30,        // min distance from viewport edge
};

// Seeded PRNG (mulberry32) for deterministic layouts
const SEED = 42;
let _rngState = SEED;

export function random() {
  _rngState |= 0;
  _rngState = (_rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
