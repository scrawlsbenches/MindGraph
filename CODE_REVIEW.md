# MindGraph Code Review

**Date:** 2026-02-08
**Reviewed by:** Claude Code (automated review)
**Scope:** All source files in `src/js/` and `src/css/`, `build.js`, `index.html`

---

## Severity Levels

- **CRITICAL** — Bug or design flaw that will cause incorrect behavior or break the app
- **HIGH** — Significant issue affecting maintainability, scalability, or reliability
- **MEDIUM** — Code smell, weak pattern, or moderate risk
- **LOW** — Minor improvement opportunity or style concern

---

## 1. Logic Issues

### ~~1.1 Non-Deterministic Graph Layout~~ [RESOLVED]

All `Math.random()` calls replaced with a seeded PRNG (mulberry32, seed=42) exported from `config.js`. Graph topology and layout are now fully deterministic across reloads.

### 1.2 Physics Repulsion Limited to Adjacent Index Window [MEDIUM]
**File:** `src/js/core/physics.js:32`

```js
for (let j = i + 1; j < Math.min(i + 20, NUM_NODES); j++) {
```

The label-footprint repulsion only checks the next 20 nodes by array index. Since nodes are ordered by cluster (0-19 = cluster 0, 20-39 = cluster 1, etc.), this means:
- Nodes at the end of one cluster check nodes at the start of the next cluster
- Nodes in cluster 4 (indices 80-99) only check up to index 99, missing many possible overlaps
- Cross-cluster overlap detection depends entirely on array ordering, not spatial proximity

This is a performance shortcut that works "well enough" for 100 nodes but is architecturally fragile.

### 1.3 BFS Path Copies Full Path Array Per Queue Entry [MEDIUM]
**File:** `src/js/core/pathfinding.js:17-20`

```js
queue.push([...path, nb]);
```

Each BFS step creates a full copy of the path. For a graph with 100 nodes this is fine, but for larger graphs this becomes O(V * path_length) memory. A parent-pointer map would be O(V).

### 1.4 Edge Duplicate Check is O(n) Linear Scan [LOW]
**File:** `src/js/core/graph-data.js:51`

```js
if (edges.find(e => e.key === k)) return;
```

Every `addEdge` call scans the entire edges array. A `Set` of keys would make this O(1).

### ~~1.5 Hardcoded Cluster Count~~ [RESOLVED]

Cluster count is now derived from `CLUSTER_NAMES.length` (or `CLUSTER_KEYWORDS.length`) throughout: `physics.js`, `renderer.js`, `graph-data.js`, `tabs.js`. The hardcoded `20` for nodes-per-cluster in `physics.js` is now derived as `NUM_NODES / NUM_CLUSTERS`.

### 1.6 Convex Hulls Recomputed Every Frame [MEDIUM]
**File:** `src/js/ui/renderer.js:111-124`

`computeHulls()` is called inside `draw()`, which runs at 60fps. It filters all nodes, computes convex hulls, and expands them every single frame. Since node positions change gradually, hulls could be cached and recomputed every N frames or on significant movement.

---

## 2. Poor / Weak Code

### 2.1 Massive HTML String Concatenation in tabs.js [HIGH]
**File:** `src/js/analytics/tabs.js` (entire file, 433 lines)

All 8 tab builder functions construct HTML through string concatenation with inline `onclick` handlers referencing `window` globals:

```js
onclick="selectNode(nodes[${n.id}]);updateND()"
onclick="searchInput.value='${k}';searchInput.dispatchEvent(new Event('input'))"
onclick="toggleCluster(${s.ci})"
```

Issues:
1. **XSS surface** — If any node word contained `'` or `"` or `<script>`, the inline handler would break or execute arbitrary code. Currently safe only because data is hardcoded.
2. **Untestable** — Functions return HTML strings, not DOM elements. No way to unit test behavior.
3. **Fragile coupling** — Relies on `window.selectNode`, `window.nodes`, `window.searchInput` being defined. No compile-time or runtime validation.
4. **Unmaintainable** — 433 lines of template literals mixed with business logic.

### 2.2 Window Global Dispatch Pattern [HIGH]
**File:** `src/js/app.js:18-27`

```js
window.selectNode = selectNode;
window.updateND = updateND;
window.toggleCluster = toggleCluster;
window.nodes = nodes;
window.searchInput = searchInput;
```

Functions and data are put on `window` so that `onclick="..."` strings in dynamically generated HTML can call them. This:
- Defeats the purpose of ES modules
- Creates implicit global dependencies
- Makes refactoring dangerous (rename a function = broken HTML strings)
- Prevents tree-shaking
- Pollutes the global namespace

### 2.3 Cryptic Variable Names [MEDIUM]
**File:** `src/js/core/graph-data.js:23-26`

```js
_a: (ci / 5) * Math.PI * 2 + (Math.random() - 0.5) * 1.0,
_d: 0.12 + Math.random() * 0.28,
_jx: (Math.random() - 0.5) * 0.12,
_jy: (Math.random() - 0.5) * 0.12,
```

Properties `_a`, `_d`, `_jx`, `_jy` are used for initial position calculation in `physics.js:108-109` but their meaning is unclear. They represent:
- `_a` = angle (radians)
- `_d` = distance factor
- `_jx`, `_jy` = jitter

Similarly in `interaction.js:13`:
```js
let dragNode = null, isPanning = false, psx = 0, psy = 0, csx = 0, csy = 0, mdTime = 0;
```

`psx/psy` = pan start x/y, `csx/csy` = camera start x/y, `mdTime` = mousedown time. These should be named descriptively.

### 2.4 Function Name `gmw` is Opaque [LOW]
**File:** `src/js/ui/interaction.js:15`

```js
function gmw(e) {
```

This stands for "get mouse world [coordinates]" but reads as gibberish. Should be `getMouseWorldCoords` or `screenToWorld`.

### ~~2.5 Magic Numbers Throughout Physics~~ [RESOLVED]

All physics tuning constants extracted to a `PHYSICS` object in `config.js` with descriptive names and comments: `SPRING_LENGTH_SAME`, `SPRING_LENGTH_CROSS`, `SPRING_CONSTANT`, `REPULSION_MARGIN`, `REPULSION_STRENGTH`, `REPULSION_CLUSTER`, `GRAVITY_GLOBAL`, `GRAVITY_CLUSTER`, `CLUSTER_ORBIT_RADIUS`, `CLUSTER_ORBIT_SQUASH`, `GRAVITY_SUPPRESS`, `JITTER`, `DAMPING`, `BOUNDARY_PADDING`, `CENTER_X_RATIO`, `CENTER_Y_RATIO`.

### 2.6 Sentiment Analysis is Naive [LOW]
**File:** `src/js/analytics/tabs.js:56-64`

```js
function wordSentiment(word) {
  const positive = ['nice', 'bright', ...];
  const negative = ['strange', 'odd', ...];
  if (positive.includes(word)) return 1;
  if (negative.includes(word)) return -1;
  return 0;
}
```

Hardcoded word lists with linear search. Creates new arrays on every call. Classification is questionable (e.g., "mirror" and "wall" classified as negative; "surprise" classified as positive). The lists should be `Set` objects defined once at module scope.

---

## 3. Design Flaws

### 3.1 No Separation Between Data and Presentation [HIGH]

The analytics tab builders (`tabs.js`) mix:
- Data computation (degree calculation, bridge scoring, clustering coefficient)
- HTML generation (template strings with inline styles)
- Event binding (inline `onclick` handlers)

This makes it impossible to:
- Test data computations independently
- Render in a different format (e.g., export to JSON/CSV)
- Reuse computations across tabs (several tabs recompute the same metrics)

### 3.2 Module-Level Side Effects [MEDIUM]
**File:** `src/js/core/graph-data.js:12-44`, `src/js/core/graph-data.js:59-85`

Graph data is generated by IIFEs that execute on `import`. This means:
- Importing the module for testing immediately generates all graph data
- The module cannot be initialized with different data
- No way to reset the graph without reloading the page

### ~~3.3 Circular Dependency Risk~~ [RESOLVED]

Extracted `selectNode()` and `setDepth()` into new `src/js/ui/state-actions.js` module. Both `panels.js` and `interaction.js` now import from `state-actions.js` instead of each other for node selection. The circular dependency is eliminated.

### ~~3.4 Renderer Does Too Much~~ [RESOLVED]

The `draw()` function in `renderer.js` has been decomposed into focused rendering pass functions: `drawClusterHulls()`, `drawEdges()`, `drawNodes()`, `computeLabelVisibility()`, `drawLabels()`, `drawZoomBadge()`. The main `draw()` function is now a clean ~20-line orchestrator that calls each pass in order.

---

## 4. Architectural Issues

### 4.1 No Data Layer Abstraction [HIGH]

The graph data is generated at module load time and stored in module-scope arrays. There is no abstraction for:
- Loading data from an external source
- Serializing/deserializing graph state
- Undo/redo
- Multiple graph instances
- Data validation

If the project needs to load real text analytics data (its stated purpose), the entire data layer must be rewritten.

### 4.2 Single Canvas, Single Thread [MEDIUM]

All rendering happens on a single Canvas 2D context in the main thread. The physics simulation also runs in the main thread inside `requestAnimationFrame`. For larger graphs (500+ nodes), this will cause frame drops. Solutions:
- OffscreenCanvas in a Web Worker for physics
- WebGL for rendering (via a library like Pixi.js or raw WebGL)
- Separate canvas layers for static vs. dynamic content

### 4.3 No Event System [MEDIUM]

State changes propagate through direct mutation + render loop polling. There's no event/pub-sub system, which means:
- No way to react to specific state changes
- UI updates require manual calls (e.g., `updateND()`, `updateStatus()`)
- Easy to forget updating dependent UI when state changes
- No audit trail of state changes

### 4.4 Tight HTML/JS Coupling [HIGH]

The `index.html` defines specific element IDs that JavaScript modules reference directly:
- `graphCanvas`, `graphArea`, `tooltip`, `nodeDetail`, `ndDot`, `ndWord`, etc.
- `btnZoomIn`, `btnZoomOut`, `btnFit`, `btnUnpin`, `btnHulls`, `btnPathMode`, `btnMinimap`
- `panelContent`, `panelTabs`, `searchInput`, `searchClear`, `searchBox`

There is no component abstraction. Renaming or removing any HTML element silently breaks JavaScript functionality with no compile-time or runtime error handling.

---

## 5. Maintainability Issues

### 5.1 ~~Zero Test Coverage~~ [RESOLVED]

Unit tests now exist for core pure functions (35 tests across 3 test files):
- `tests/geometry.test.js` — 10 tests for `convexHull` and `expandHull`
- `tests/pathfinding.test.js` — 14 tests for `bfsPath` and `getNeighborsAtDepth`
- `tests/tabs-helpers.test.js` — 11 tests for `wordSentiment`, `computeBridgeScore`, `computeDegrees`, `computeGraphDensity`, `computeClusteringCoeff`

E2E smoke tests added (8 Playwright tests with screenshots). Remaining gaps: no integration tests, no visual regression tests.

### 5.2 ~~No Linting or Formatting~~ [RESOLVED]

ESLint (flat config + eslint-config-prettier), Prettier, and TypeScript `checkJs` are now configured. All source files pass lint and typecheck cleanly.

### 5.3 ~~Dead/Legacy File~~ [RESOLVED]

`infranodus-ui-5.html` has been deleted.

### 5.4 No Error Boundaries [MEDIUM]

There are zero `try/catch` blocks in the entire codebase. If any Canvas API call fails, any DOM element is missing, or any data is malformed, the entire app crashes silently. The render loop (`requestAnimationFrame`) would stop with no user feedback.

### 5.5 Inline Styles in Generated HTML [MEDIUM]
**File:** `src/js/analytics/tabs.js`

Tab builders use extensive inline styles:
```js
style="font-size:11px;font-weight:700;color:${CLUSTER_COLORS[cs.ci]};margin-bottom:4px"
style="display:flex;flex-wrap:wrap;gap:3px"
```

This makes styling inconsistent and impossible to override with CSS classes. Creates duplication (the same style strings appear in multiple tab builders).

---

## 6. CSS Review

### 6.1 Strengths
- Well-organized CSS custom properties in `variables.css`
- Component-based file organization (topbar, toolbar, sidebar, etc.)
- Consistent use of design tokens (`--bg-primary`, `--text-secondary`, etc.)
- Responsive-aware with `min-width` on analytics content

### 6.2 Concerns
- **No responsive breakpoints** — The layout assumes a wide desktop viewport. There are no `@media` queries for tablet or mobile.
- **Hardcoded dark theme only** — Variables define a single dark color scheme with no light theme support.
- **No CSS reset normalization** — `base.css` has minimal resets (`margin: 0`, `box-sizing`) but no comprehensive normalization.
- **z-index management** — Multiple components use arbitrary z-index values (tooltip: inferred from DOM order, chat panel: none declared). No z-index scale defined.

---

## 7. Build System Review

### 7.1 Strengths
- Simple, fast build with esbuild
- Reports bundle sizes
- Generates self-contained dist/

### 7.2 Concerns
- ~~**No source maps**~~ [RESOLVED] Source maps now generated for both JS and CSS.
- ~~**No watch mode**~~ [RESOLVED] `npm run dev` uses esbuild context watch.
- **No dev server** — Must use a separate tool (e.g., `npx serve`)
- **CommonJS build script** — `build.js` uses `require()` while source uses ES modules. Inconsistency.
- **No environment configuration** — No way to toggle debug mode, change data source, etc.
- ~~**dist/ committed to git**~~ [RESOLVED] Added to `.gitignore`, removed from tracking.

---

## 8. File-by-File Findings Summary

| File | Lines | Issues Found |
|---|---|---|
| `core/state.js` | 35 | No type documentation, no validation |
| `core/config.js` | 85 | Clean. Exports PHYSICS constants and seeded PRNG |
| `core/graph-data.js` | 90 | IIFE side effects, linear edge search |
| `core/physics.js` | 120 | Limited repulsion window; constants now in config |
| `core/camera.js` | 50 | Direct DOM access in core layer |
| `core/geometry.js` | 62 | Clean. Good algorithm implementation |
| `core/pathfinding.js` | 46 | Path copying in BFS, otherwise clean |
| `ui/renderer.js` | 314 | Decomposed into passes; hulls still recomputed per frame |
| `ui/interaction.js` | 125 | Cryptic names; no more circular dep |
| `ui/panels.js` | 150 | innerHTML usage remains |
| `ui/state-actions.js` | 35 | Clean. Extracted selectNode/setDepth |
| `ui/search.js` | 60 | Clean. Could debounce search input |
| `ui/minimap.js` | 101 | Canvas reinitialized every draw call |
| `analytics/tabs.js` | 433 | Massive HTML strings, XSS surface, mixed concerns |
| `app.js` | 97 | Window globals, otherwise clean orchestration |
| `build.js` | 51 | CJS in ESM project, no source maps |
| `index.html` | 192 | No CSP, hardcoded element IDs |

---

## 9. Positive Findings

These aspects of the codebase are done well:

1. **Zero runtime dependencies** — Impressive for the functionality delivered. Small attack surface, fast loads.
2. **Clean module boundaries** — Core/UI/Analytics separation is logical and mostly respected.
3. **Efficient Canvas rendering** — Label collision caching, alpha-based visibility, selective minimap updates.
4. **Correct algorithms** — Graham scan, BFS, Catmull-Rom splines are implemented correctly.
5. **CSS organization** — Design tokens, component files, consistent naming.
6. **Small bundle size** — 42 KB JS + 24 KB CSS is excellent for the feature set.
7. **Readable code** — Despite some cryptic names, the overall code flow is straightforward.
8. **Clean git history** — Logical progression from prototype to structured project.
