# MindGraph Code Review

**Date:** 2026-02-09
**Reviewed by:** Claude Code (automated deep review)
**Scope:** All source files in `src/js/`, `src/css/`, `src/types/`, `tests/`, `build.js`, `index.html`
**Pipeline status:** All checks pass (format, lint, typecheck, 35 unit tests, build)
**Bundle:** 42.3 KB JS + 23.8 KB CSS (66.1 KB total, zero runtime deps)

---

## Severity Levels

- **CRITICAL** — Bug or design flaw that will cause incorrect behavior or break the app
- **HIGH** — Significant issue affecting maintainability, scalability, or reliability
- **MEDIUM** — Code smell, weak pattern, or moderate risk
- **LOW** — Minor improvement opportunity or style concern
- **INFO** — Observation, not necessarily actionable

---

## 1. Security Concerns

### 1.1 innerHTML With Interpolated Data [HIGH]
**Files:** `src/js/ui/panels.js:51-74`, `src/js/ui/interaction.js:106-109`, `src/js/analytics/tabs.js` (throughout)

All dynamic HTML is constructed via string concatenation and inserted with `innerHTML`. Node words, cluster names, and computed values are interpolated directly into HTML strings and inline `onclick` handlers:

```js
// panels.js:63
`<span class="nd-chip" data-nid="${id}"><span class="cd" style="background:${m.color}"></span>${m.word}</span>`

// interaction.js:107
`<div class="tt-word" style="color:${hit.color}">${hit.word}</div>`

// tabs.js:147 — inline event handler with interpolated value
onclick="searchInput.value='${k}';searchInput.dispatchEvent(new Event('input'))"
```

Currently safe only because all data is hardcoded in `config.js`. If the app ever loads external data (its stated purpose as "Network Text Analytics"), any node word containing `'`, `"`, `<`, or `>` would break markup or enable XSS. This is the single most important thing to fix before accepting user-supplied data.

### 1.2 Window Global Pollution for onclick Dispatch [HIGH]
**File:** `src/js/app.js:19-30`

```js
window.selectNode = selectNode;
window.updateND = updateND;
window.toggleCluster = toggleCluster;
window.nodes = nodes;
window.searchInput = searchInput;
```

Functions and the full nodes array are exposed on `window` so inline `onclick="..."` strings can call them. This:
- Exposes internal application state to the browser console and any injected scripts
- Defeats ES module encapsulation
- Makes `window.nodes` a mutable reference to the live data array
- The `activeCluster` property uses `Object.defineProperty` with a getter/setter, which is a reasonable pattern but unusual compared to the direct assignment of the others

### 1.3 No Content Security Policy [LOW]
**File:** `index.html`

No `<meta http-equiv="Content-Security-Policy">` header. Inline event handlers (`onclick="..."`) in dynamically generated HTML would require `unsafe-inline` in any CSP, further limiting the security posture.

---

## 2. Correctness Issues

### 2.1 Physics Repulsion Has a Biased Index Window [MEDIUM]
**File:** `src/js/core/physics.js:48`

```js
for (let j = i + 1; j < Math.min(i + 20, NUM_NODES); j++) {
```

Label-footprint repulsion only considers the next 20 nodes by array index. Since nodes are ordered sequentially by cluster (0-19 = cluster 0, 20-39 = cluster 1, etc.):
- Nodes near the end of one cluster check nodes at the start of the *next* cluster
- Node 95 only checks nodes 96-99 (4 nodes instead of 20)
- Spatial proximity is not considered — distant nodes that happen to be adjacent in the array are checked while close nodes with distant indices are not

The separate same-cluster pass (`physics.js:72-95`) partially compensates for this, but cross-cluster label overlap detection remains index-dependent rather than position-dependent.

### 2.2 PRNG Determinism Breaks at Runtime [MEDIUM]
**File:** `src/js/core/config.js:207-217`

The seeded PRNG (`random()`) guarantees deterministic initial layout, but it continues to be called at runtime for:
- Physics jitter: `physics.js:122-123` — called every frame for every visible node
- Path particle spawning: `renderer.js:84` — called every frame when a path is active
- Path particle speed: `renderer.js:85` — each new particle gets a random speed

Since the render loop runs at variable frame rates (60fps on fast machines, lower on slow ones), the PRNG state diverges based on system performance. After N frames, the same graph will have different node positions on different machines. This may be intentional (physics should settle regardless) but undermines the determinism the seed was meant to provide.

### 2.3 `toggleCluster(-1)` Reset Has Redundant Assignment [LOW]
**File:** `src/js/analytics/tabs.js:140`

```js
onclick="activeCluster=-1;toggleCluster(-1)"
```

The `activeCluster=-1` sets `state.activeCluster = -1` via the window property. Then `toggleCluster(-1)` evaluates `state.activeCluster === -1 ? -1 : -1`, which is always `-1`. The first assignment is redundant.

### 2.4 Clustering Coefficient Uses Sampling Without Disclosure [LOW]
**File:** `src/js/analytics/tabs.js:47`

```js
const sample = nodes.filter((_, i) => i % 3 === 0);
```

The clustering coefficient is computed on only every 3rd node (by array index). This is presented as the graph's clustering coefficient without noting it's an approximation. For 100 nodes, this samples ~34 nodes. The sampling also has a cluster bias since nodes are grouped by cluster in index order (always samples indices 0, 3, 6... from each cluster, missing indices 1, 2, 4, 5...).

---

## 3. Performance Issues

### 3.1 Convex Hulls Recomputed Every Frame [MEDIUM]
**File:** `src/js/ui/renderer.js:62-75`

`computeHulls()` is called inside `drawClusterHulls()`, which is called every frame from `draw()`. Each invocation:
1. Filters all 100 nodes by cluster (5 array filters)
2. Maps to point objects (5 map operations)
3. Runs Graham scan convex hull (5 sorts + scans)
4. Expands hulls with padding (5 map operations)
5. Computes average alpha per cluster (5 reduce operations)

Since node positions change gradually (physics simulation applies small velocity increments), caching hulls and recomputing every 5-10 frames would be indistinguishable visually but save significant work.

### 3.2 Minimap Canvas Resized Every Draw Call [MEDIUM]
**File:** `src/js/ui/minimap.js:19-23`

```js
mmCanvas.width = mw * devicePixelRatio;
mmCanvas.height = mh * devicePixelRatio;
```

Setting canvas `width` or `height` clears the canvas buffer and resets all context state. The minimap dimensions are constant (160x120), so this reallocation happens unnecessarily every 3rd frame (`app.js:102`). The dimensions should be set once during initialization.

### 3.3 Edge Duplicate Detection is O(E) per Insertion [LOW]
**File:** `src/js/core/graph-data.js:67`

```js
if (edges.find((e) => e.key === k)) return;
```

Every `addEdge()` call linearly scans the edge array. With ~200 edges, each insertion is O(200). A `Set<string>` of keys would make deduplication O(1). This runs only at init time so runtime impact is negligible, but it's a code quality concern.

### 3.4 `isEdgeHL` Path Check is O(path_length) per Edge [LOW]
**File:** `src/js/ui/renderer.js:48-56`

When a path is active, `isEdgeHL()` iterates through the path result for every edge. With ~200 edges and a path of length P, this is O(200 * P) per frame. A `Set` of path edge keys would make this O(1) per edge.

### 3.5 Sentiment Word Lists Recreated Per Call [LOW]
**File:** `src/js/analytics/tabs.js:68-116`

`wordSentiment()` creates two new arrays (`positive` and `negative`) on every invocation, then uses `Array.includes()` for lookup. These should be `Set` objects defined at module scope for O(1) lookup and zero allocation per call.

---

## 4. Architecture & Design

### 4.1 No Data Layer Abstraction [HIGH]

The graph is generated at module load time by IIFEs in `graph-data.js:15-55` and `graph-data.js:75-99`. The module exports raw arrays (`nodes`, `edges`) and a `Map` (`adj`) that are mutated directly by consumers. There is no:
- Factory function to create graphs with different data
- Serialization/deserialization
- Immutable data access pattern
- Ability to reset or reload data
- Validation of node/edge integrity

The app's stated purpose is "Network Text Analytics Visualization," but the data pipeline cannot accept external data without rewriting the entire data layer.

### 4.2 HTML String Templates With Inline Handlers [HIGH]
**File:** `src/js/analytics/tabs.js` (all 549 lines)

All 8 analytics tab builders construct HTML via string concatenation with inline styles and `onclick` handlers. This is the largest file in the project (39.9% of the JS bundle) and mixes three concerns:
1. **Data computation** — degree calculation, bridge scoring, matrix computation, clustering coefficient
2. **HTML generation** — template strings with inline styles
3. **Event binding** — `onclick="selectNode(nodes[${n.id}]);updateND()"` referencing window globals

The data computation functions (`computeDegrees`, `computeGraphDensity`, `computeClusteringCoeff`, etc.) are well-tested and correctly extracted as exports, which is good. But the tab builder functions (`buildTab0` through `buildTab7`) are untestable for their HTML output.

### 4.3 Mutable Shared State Object [MEDIUM]
**File:** `src/js/core/state.js`

A single mutable object is shared across all modules. Any module can read or write any property at any time. This works for a small app but:
- No change notifications — UI updates require manual calls (`updateND()`, `updateStatus()`, `state.labelVisCache = null`)
- The `labelVisCache = null` invalidation is scattered across 9 locations in 5 different files — easy to miss one
- No validation on writes (e.g., nothing prevents `camZoom = -1` or `selectionDepth = 100`)

### 4.4 Module-Level Side Effects [MEDIUM]
**Files:** `src/js/core/graph-data.js`, `src/js/ui/interaction.js`, `src/js/ui/search.js`, `src/js/ui/panels.js`

Several modules execute side effects on import:
- `graph-data.js` — Generates all nodes and edges via IIFEs
- `interaction.js` — Registers event listeners on canvas and window
- `search.js` — Creates filter pill buttons, registers input handlers
- `panels.js` — Registers click handlers on panel elements

This makes testing difficult (must mock the DOM for any import) and prevents lazy initialization or conditional loading.

### 4.5 Camera Module Lives in Core But Touches DOM [LOW]
**File:** `src/js/core/camera.js:8-11`

```js
export const canvas = document.getElementById('graphCanvas');
export const ctx = canvas.getContext('2d');
export const graphArea = document.getElementById('graphArea');
export const tooltip = document.getElementById('tooltip');
```

The `core/` directory implies pure logic modules, but `camera.js` directly accesses the DOM. This is a layer violation — the canvas element and DOM references should live in the `ui/` layer.

---

## 5. Code Quality

### 5.1 Cryptic Variable Names [MEDIUM]
**File:** `src/js/ui/interaction.js:13-19`

```js
let dragNode = null, isPanning = false, psx = 0, psy = 0, csx = 0, csy = 0, mdTime = 0;
```

- `psx/psy` = pan start x/y
- `csx/csy` = camera start x/y
- `mdTime` = mousedown time

**File:** `src/js/ui/interaction.js:21`

```js
function gmw(e) {
```

`gmw` = "get mouse world [coordinates]". Should be `getMouseWorldCoords` or similar.

**File:** `src/js/core/graph-data.js:29-32`

Node properties `_a`, `_d`, `_jx`, `_jy` represent angle, distance, jitter-x, and jitter-y. The underscore prefix convention suggests "private" but these are read by `physics.js:139-140`. The type definition in `graph.d.ts:19-22` lists them without documentation.

### 5.2 Inline Styles in Generated HTML [MEDIUM]
**File:** `src/js/analytics/tabs.js` (throughout)

Tab builders use extensive inline styles instead of CSS classes:
```js
style="font-size:11px;font-weight:700;color:${CLUSTER_COLORS[cs.ci]};margin-bottom:4px"
style="display:flex;flex-wrap:wrap;gap:3px"
style="font-size:10px;color:var(--text-muted)"
```

Many of these are repeated across multiple tab builders. Using CSS classes would reduce bundle size, improve consistency, and enable theme overrides.

### 5.3 No Error Handling in Render Loop [MEDIUM]
**File:** `src/js/app.js:85-105`

The main `loop()` function has no error handling. If any rendering function throws (e.g., canvas context error, missing DOM element), `requestAnimationFrame` stops silently. The user sees a frozen canvas with no feedback. A `try/catch` around the loop body with a fallback error display would improve resilience.

### 5.4 No Keyboard Accessibility [MEDIUM]
**File:** `index.html`, `src/js/ui/interaction.js`

The canvas-based graph has no keyboard support:
- No `tabindex` on interactive elements
- No keyboard-based node selection or navigation
- No ARIA labels on the canvas
- No focus management for the node detail popover
- Screen readers cannot access graph content

### 5.5 Tab Builder Naming Convention [LOW]
**File:** `src/js/analytics/tabs.js`

Functions are named `buildTab0` through `buildTab7`, but the tabs they build are:
- `buildTab0` = "AI Insights" (tab 1 in UI)
- `buildTab1` = "Main Ideas" (tab 2)
- `buildTab2` = "Content Gaps" (tab 3)
- etc.

The 0-indexed function names don't match the 1-indexed UI labels. Names like `buildInsightsTab`, `buildMainIdeasTab`, etc. would be self-documenting.

### 5.6 BFS Copies Full Path Per Queue Entry [LOW]
**File:** `src/js/core/pathfinding.js:25`

```js
queue.push([...path, nb]);
```

Each BFS step spreads the current path into a new array. For 100 nodes this is fine (max path ~10 hops), but a parent-pointer map would be O(V) memory vs O(V * avg_path_length).

---

## 6. Test Coverage Assessment

### 6.1 What's Tested (35 unit tests)

| File | Tests | Coverage |
|------|-------|----------|
| `geometry.test.js` | 10 | `convexHull` (6 cases), `expandHull` (3 cases + edge case) |
| `pathfinding.test.js` | 14 | `bfsPath` (8 cases), `getNeighborsAtDepth` (6 cases) |
| `tabs-helpers.test.js` | 11 | `wordSentiment` (3), `computeBridgeScore` (3), `computeDegrees` (1), `computeGraphDensity` (1), `computeClusteringCoeff` (3) |

Tests are well-written with proper mocking of `graph-data.js` to avoid IIFE side effects. Edge cases (invisible nodes, isolated nodes, collinear points, duplicates) are covered.

### 6.2 What's Not Tested

- **Rendering** — No tests for `renderer.js`, `minimap.js`, or any canvas output
- **Interaction** — No tests for mouse/keyboard event handling
- **State management** — No tests for `selectNode`, `setDepth`, `toggleCluster`
- **Panel HTML** — Tab builder HTML output is untested
- **Search** — No unit tests for search filtering logic
- **Physics** — No tests for `simulate()` or `positionNodes()`
- **Camera** — No tests for `s2w()`, `flyToNode()`, `updateFlyTo()`

### 6.3 E2E Tests (8 Playwright smoke tests)

The E2E tests cover basic functionality (page load, canvas dimensions, node count, selection, search, cluster filtering, analytics tabs) with screenshot capture. These provide good regression protection for critical paths.

---

## 7. CSS Review

### 7.1 Strengths
- Well-organized CSS custom properties in `variables.css` with a clear design token system
- Component-based file organization: 10 files for distinct UI areas
- Consistent use of tokens (`--bg-primary`, `--text-secondary`, `--border-color`, etc.)
- Good use of `@import` for bundling through `bundle.css`

### 7.2 Concerns
- **No responsive breakpoints** — Layout assumes wide desktop viewport. No `@media` queries. The right analytics panel would overlap on screens < 1200px.
- **Dark theme only** — No `prefers-color-scheme` media query or theme switching mechanism
- **No CSS reset** — `base.css` has minimal resets but no comprehensive normalization
- **No z-index scale** — Components use z-index implicitly through DOM order. The tooltip, minimap, node detail, and AI chat panel could overlap unpredictably.

---

## 8. Build & Tooling Review

### 8.1 Strengths
- esbuild provides fast builds with source maps and metafile analysis
- Comprehensive `npm run check` pipeline: format → lint → typecheck → test → build
- TypeScript `checkJs` mode catches type errors in JS files via JSDoc annotations
- Clean Vitest + Playwright dual testing setup

### 8.2 Concerns
- **CJS build script** — `build.js` uses `require()` while all source uses ES modules. Minor inconsistency.
- **No dev server with HMR** — `npm run dev` watches and rebuilds but requires a separate static file server
- **No environment configuration** — No way to toggle debug mode, enable verbose logging, or change data source
- **`package.json` main field** — Points to `index.js` which doesn't exist. Should be removed or point to the entry point.

---

## 9. File-by-File Summary

| File | Lines | Key Observations |
|------|-------|-----------------|
| `core/state.js` | 36 | Clean. Single source of truth. No validation on writes. |
| `core/config.js` | 217 | Clean. Well-organized constants, seeded PRNG. PRNG not resettable. |
| `core/graph-data.js` | 107 | IIFE side effects on import. O(n) edge dedup. |
| `core/physics.js` | 144 | Biased repulsion window. Constants properly extracted. |
| `core/camera.js` | 55 | DOM access in core layer. Otherwise clean camera math. |
| `core/geometry.js` | 60 | Clean. Correct Graham scan and Catmull-Rom implementation. |
| `core/pathfinding.js` | 55 | Clean. BFS path copying is minor inefficiency. |
| `ui/renderer.js` | 364 | Well-decomposed 6-pass pipeline. Hulls recomputed per frame. |
| `ui/interaction.js` | 177 | Cryptic names. Good event handling otherwise. |
| `ui/state-actions.js` | 38 | Clean. Focused responsibility. |
| `ui/panels.js` | 183 | innerHTML throughout. Good panel management structure. |
| `ui/minimap.js` | 140 | Canvas resized every draw. Good touch support. |
| `ui/search.js` | 63 | Clean. Missing debounce on input. |
| `analytics/tabs.js` | 548 | Largest file. Mixed concerns. Data functions well-extracted and tested. |
| `app.js` | 109 | Window globals. Clean render loop orchestration. |
| `types/graph.d.ts` | 60 | Complete type coverage for data structures. |
| `types/global.d.ts` | 21 | Properly augments Window interface. |
| `build.js` | 77 | CJS. Clean esbuild config with watch mode. |
| `index.html` | 191 | Well-structured markup. No CSP. Hardcoded element IDs. |

---

## 10. Positive Findings

1. **Zero runtime dependencies** — 66 KB total bundle for a full graph visualization tool with physics, analytics, and canvas rendering. Exceptional.
2. **Clean module separation** — Core (data, physics, geometry, pathfinding) / UI (renderer, interaction, panels, minimap, search) / Analytics (tabs) is a logical and mostly respected boundary.
3. **Correct algorithm implementations** — Graham scan convex hull, BFS shortest path, N-depth neighborhood traversal, Catmull-Rom splines, and force-directed physics are all implemented correctly.
4. **Well-structured testing** — Unit tests properly mock module dependencies using `vi.hoisted()` to avoid IIFE side effects. Test cases cover edge conditions (invisible nodes, isolated nodes, collinear points).
5. **Solid CI pipeline** — `npm run check` runs format verification, linting, type checking, all tests, and build in sequence. Any failure stops the pipeline.
6. **TypeScript integration** — `checkJs` mode with JSDoc `@type` annotations provides type safety without a compilation step. Type definitions in `graph.d.ts` are comprehensive.
7. **Canvas rendering efficiency** — Label visibility caching, alpha-based node visibility, selective minimap updates (every 3rd frame), and the LRU-style label placement algorithm are thoughtful optimizations.
8. **Physics simulation** — The force model (springs + label repulsion + cluster gravity with suppression + jitter + damping) produces visually appealing layouts. The gravity suppression mechanism (projecting gravity onto the repulsion vector and subtracting when they oppose) is a clever technique.
9. **Deterministic initial layout** — Seeded PRNG ensures the graph looks identical on first load across browsers and machines.
10. **Small, readable codebase** — ~2,000 lines of JS across 15 well-scoped modules. Each file has a clear header comment and responsibility.

---

## 11. Priority Recommendations

If this project were to accept external/user-supplied data, the following should be addressed in order:

1. **Sanitize all HTML output** — Replace innerHTML with textContent or a sanitization layer. Escape all interpolated values in HTML strings. This is prerequisite for any external data.
2. **Remove window globals** — Use event delegation or `data-*` attributes with a single delegated click handler instead of inline `onclick` strings.
3. **Extract data computations from tab builders** — The analytics computation functions are already well-separated as exports. The remaining work is to separate HTML generation from data logic in the 8 `buildTab*` functions.
4. **Add error boundary to render loop** — Wrap the `loop()` body in try/catch to prevent silent freezes.
5. **Cache convex hulls** — Recompute every N frames instead of every frame.
6. **Set minimap canvas dimensions once** — Move the `width`/`height` assignment to initialization.

For the current state of the project (hardcoded demo data, single-page visualization), the codebase is well-organized and functional. The issues above become important if the project evolves toward its stated purpose of analyzing real text data.
