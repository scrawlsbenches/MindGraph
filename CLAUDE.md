# CLAUDE.md — MindGraph Project Guide

This file is the authoritative reference for any AI or developer working on MindGraph.
It encodes project knowledge, architecture, known issues, conventions, and maintenance rules.

---

## Project Identity

MindGraph is a client-side network text analytics visualization tool. It renders an interactive force-directed graph on Canvas 2D with cluster analysis, path finding, sentiment analysis, and 8 analytics dashboard tabs. Zero runtime dependencies. 66 KB production bundle.

**Repository:** scrawlsbenches/MindGraph
**License:** ISC (see LICENSE file)
**Node requirement:** >= 18

---

## Quick Reference

```bash
npm install          # Install dev dependencies
npm run build        # Bundle src/ → dist/ (JS 42KB + CSS 24KB + HTML 8KB)
npm run dev          # Watch mode (rebuilds on change, no minification)
npm run lint         # ESLint (flat config, eslint-config-prettier)
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier (write)
npm run format:check # Prettier (check only)
npm run typecheck    # TypeScript checkJs (no emit)
npm run check        # lint + typecheck + test + build (full CI check)
npm run test         # Vitest unit tests (35 tests)
npm run test:watch   # Vitest watch mode
npm run test:coverage # Vitest with coverage
open index.html      # Run locally (loads dist/ bundles)
```

For development without rebuilding, edit `index.html` to load source directly:
```html
<link rel="stylesheet" href="src/css/bundle.css">
<script type="module" src="src/js/app.js"></script>
```

---

## Repository Structure

```
MindGraph/
├── CLAUDE.md                       # THIS FILE — project guide for AI/dev
├── ASSESSMENT.md                   # Repository assessment report
├── CODE_REVIEW.md                  # Detailed code review with severity ratings
├── ROADMAP.md                      # Phased recommendations & architecture vision
├── README.md                       # User-facing project documentation
├── LICENSE                         # ISC license
├── index.html                      # Application shell (192 lines, element IDs used by JS)
├── build.js                        # esbuild config (CJS, bundles src/ → dist/)
├── package.json                    # Dev deps: esbuild, eslint, prettier, typescript, vitest
├── eslint.config.js                # ESLint flat config (recommended + prettier)
├── .prettierrc                     # Prettier config (single quotes, 2-space, semi)
├── .editorconfig                   # Editor settings (indent, EOL, charset)
├── tsconfig.json                   # TypeScript checkJs config (no emit)
├── tests/                          # Unit tests (Vitest, 35 tests)
│   ├── geometry.test.js            # convexHull, expandHull (10 tests)
│   ├── pathfinding.test.js         # bfsPath, getNeighborsAtDepth (14 tests)
│   └── tabs-helpers.test.js        # wordSentiment, bridgeScore, degrees, density, clustering (11 tests)
├── dist/                           # Build output (.gitignored)
│   ├── index.html
│   ├── mindgraph.min.js            # + source map
│   └── mindgraph.min.css           # + source map
└── src/
    ├── js/                         # 1,747 lines across 14 files
    │   ├── app.js                  # Entry point, render loop, window globals (97 lines)
    │   ├── core/                   # Data layer & algorithms (559 lines)
    │   │   ├── state.js            # Single mutable state object (35 lines)
    │   │   ├── config.js           # Constants: cluster names/colors/keywords (43 lines)
    │   │   ├── graph-data.js       # Node/edge generation via IIFEs (90 lines)
    │   │   ├── physics.js          # Force-directed simulation (113 lines)
    │   │   ├── camera.js           # Canvas context, transforms, fly-to (50 lines)
    │   │   ├── geometry.js         # Graham scan convex hull, Catmull-Rom spline (62 lines)
    │   │   └── pathfinding.js      # BFS shortest path, N-depth neighbors (46 lines)
    │   ├── ui/                     # DOM/Canvas interaction (652 lines)
    │   │   ├── renderer.js         # Main draw() loop — nodes, edges, hulls, labels (297 lines)
    │   │   ├── interaction.js      # Mouse/keyboard events, node selection (154 lines)
    │   │   ├── panels.js           # Right panel, node detail popover, path banner (148 lines)
    │   │   ├── minimap.js          # Minimap canvas rendering + drag (101 lines)
    │   │   └── search.js           # Search input, cluster filter pills (60 lines)
    │   └── analytics/
    │       └── tabs.js             # 8 tab builder functions (433 lines)
    ├── types/                      # TypeScript declarations
    │   ├── global.d.ts             # Window augmentation for inline onclick globals
    │   └── graph.d.ts              # GraphNode, GraphEdge, AppState interfaces
    └── css/                        # 1,433 lines across 10 files
        ├── bundle.css              # CSS entry point (@import all below)
        ├── variables.css           # Design tokens (--bg-primary, --text-secondary, etc.)
        ├── base.css                # Reset, layout, scrollbars
        ├── topbar.css              # Top navigation bar
        ├── toolbar.css             # Action toolbar & filter pills
        ├── sidebar.css             # Left icon sidebar
        ├── graph.css               # Canvas, tooltips, minimap, controls
        ├── panels.css              # Right analytics panel
        ├── chat.css                # AI chat floating panel
        └── analytics.css           # Analytics tab content styles
```

---

## Architecture

### Layer Model

```
core/    → Pure data, algorithms, state. No DOM except camera.js (holds canvas ref).
ui/      → All DOM interaction, Canvas rendering, user input handling.
analytics/ → HTML-generating functions for analytics tab content.
app.js   → Orchestrator: init, window globals, render loop.
```

### Data Flow

```
config.js (constants) → graph-data.js (generates nodes[], edges[], adj Map)
                                ↓
                      physics.js simulate() — mutates node.x/y/vx/vy each frame
                                ↓
                      renderer.js draw() — reads state + nodes, paints Canvas
                                ↓
                      camera.js — provides ctx, transforms (s2w, flyToNode)
                                ↑
                      interaction.js — mouse events → mutates state.js
                                ↑
                      panels.js — reads state, updates DOM panels
```

### State Management

All mutable state lives in `src/js/core/state.js` as a single flat object:

```
state.camX, state.camY, state.camZoom     — camera position
state.W, state.H                          — viewport dimensions
state.selectedNode, state.hoveredNode     — selection
state.activeCluster                       — cluster filter (-1 = all)
state.searchQuery                         — search text
state.depthMap, state.labelVisCache       — computed caches
state.selectionDepth                      — neighborhood depth (1-3)
state.showHulls, state.showMinimap        — feature toggles
state.pathMode, state.pathStart, state.pathResult, state.pathParticles — pathfinding
```

Every module imports `state` and mutates it directly. Changes propagate through the render loop (`requestAnimationFrame` re-reads state every frame). There are no observers, events, or immutability guards.

### Graph Data Model

100 nodes across 5 clusters (20 nodes each), generated at module load time from `CLUSTER_KEYWORDS`.

**Node shape** (all properties on each node object):
```
id, word, cluster, color, r (radius),
x, y, vx, vy (position + velocity),
_a (initial angle), _d (distance factor), _jx/_jy (jitter),
pinned, matchesSearch, visible, alpha, targetAlpha,
labelW, labelH, fpRight, fpLeft, fpY (label footprint)
```

**Edge shape:** `{ a, b, weight, key }`
**Adjacency:** `adj: Map<nodeId, Set<nodeId>>`

### Window Globals (app.js:18-27)

These are exposed on `window` for inline `onclick` handlers in HTML strings:
```
window.selectNode, window.updateND, window.toggleCluster,
window.nodes, window.searchInput, window.activeCluster (getter/setter)
```

### Circular Dependency

`interaction.js` ↔ `panels.js` — both import from each other. Currently safe because ES module bindings resolve lazily (only used inside function bodies, not at module init). Do not add top-level usage of the other module's exports.

---

## Known Issues & Technical Debt

Severity: CRITICAL > HIGH > MEDIUM > LOW. Full details in `CODE_REVIEW.md`.

### ~~CRITICAL~~ [RESOLVED]
- ~~**Zero test coverage**~~ — 35 unit tests now cover geometry, pathfinding, and analytics helpers. Remaining: integration, visual regression, E2E.

### HIGH
- **HTML string concatenation with inline onclick** — `tabs.js` (433 lines) builds all analytics HTML via string concat with `window` global calls. XSS surface if data becomes dynamic.
- **Window global dispatch** — Functions/data on `window` for onclick strings. Defeats ES modules.
- **No data/presentation separation** — `tabs.js` mixes computation, HTML generation, and event binding.
- **Renderer god function** — `draw()` in `renderer.js` is 186 lines handling hulls, edges, particles, nodes, labels, and zoom badge.
- **No data layer abstraction** — Graph is hardcoded, no import/export/persistence.
- **Tight HTML/JS coupling** — JS references 20+ element IDs from `index.html` with no validation.

### MEDIUM
- **Non-deterministic layout** — `Math.random()` without seed makes layouts unreproducible.
- **Hardcoded cluster count (5)** — Appears in 8+ locations across physics, renderer, tabs, graph-data.
- **Convex hulls recomputed every frame** — `computeHulls()` called at 60fps inside `draw()`.
- **Physics magic numbers** — 12+ tuning constants undocumented in `physics.js`.
- **Circular dependency** — `interaction.js` ↔ `panels.js`.
- **Module-level side effects** — `graph-data.js` generates data via IIFEs on import.
- **No error boundaries** — Zero try/catch in entire codebase.
- **No event system** — State changes propagate by manual function calls.
- **Cryptic variable names** — `_a`, `_d`, `_jx`, `_jy`, `psx`, `csy`, `gmw()`.

### LOW
- ~~**Dead file** — `infranodus-ui-5.html`~~ [RESOLVED] Deleted.
- ~~**dist/ committed to git**~~ [RESOLVED] Added to `.gitignore`, removed from tracking.
- **Edge dedup is O(n)** — `edges.find()` linear scan; should use a Set.
- **BFS copies full path per queue entry** — O(V * path_length) memory.
- **Naive sentiment** — Hardcoded word lists with linear search, recreated per call.
- ~~**Missing LICENSE file**~~ [RESOLVED] ISC LICENSE file created.

---

## Conventions & Rules

### Code Style

Enforced by ESLint (flat config + eslint-config-prettier) and Prettier. Run `npm run lint` and `npm run format:check`.

- **ES modules** — All source files use `import`/`export`. The build script (`build.js`) uses CJS `require()`.
- **Semicolons** — Always (Prettier enforced).
- **Quotes** — Single quotes (Prettier enforced).
- **Indentation** — 2 spaces (Prettier enforced).
- **Print width** — 120 characters.
- **Naming** — camelCase for functions/variables. UPPER_SNAKE for constants in `config.js`. Underscore prefix (`_a`, `_d`) for internal/transient node properties.
- **Comments** — Module-level block headers (`/* === ... === */`). JSDoc `@type` casts for DOM elements. No inline comments explaining logic.
- **Type checking** — `tsc --noEmit` with `checkJs`. Use `/** @type {Type} */` casts for DOM element narrowing. Type interfaces in `src/types/`.

### When Modifying Code

1. **Read the file first.** Understand the existing code before changing it.
2. **Respect the layer model.** `core/` should not access DOM (except `camera.js`). `ui/` should not compute analytics data. `analytics/` should not mutate state.
3. **Don't add to `window` globals.** If you need event handlers in dynamic HTML, use event delegation (attach listener to parent, check `e.target`), not inline `onclick`.
4. **Don't hardcode the number 5.** Derive cluster count from `CLUSTER_NAMES.length` or `CLUSTER_KEYWORDS.length`.
5. **Invalidate `state.labelVisCache`** whenever you change node visibility, selection, search, or positions. Set it to `null` to force recomputation.
6. **Call `updateND()` after changing `state.selectedNode`.** Call `updateStatus()` after changing node visibility or search state.
7. **Don't break the circular dep.** Don't use exports from `panels.js` at the top level of `interaction.js` or vice versa. Only reference them inside function bodies.
8. **Keep bundle small.** Zero runtime dependencies is a feature. Don't add libraries unless absolutely necessary and discussed first.
9. **When adding physics constants**, put them in `config.js` with descriptive names, not as magic numbers in `physics.js`.

### When Modifying Documentation

These documents exist and must be kept in sync:

| Document | Purpose | Update When |
|---|---|---|
| `CLAUDE.md` | AI/dev project guide (this file) | Any structural change, new convention, or resolved issue |
| `ASSESSMENT.md` | Repository structure, tech stack, metrics | Dependency changes, file additions/removals, metric changes |
| `CODE_REVIEW.md` | Known issues with severity ratings | Issues resolved (mark as fixed), new issues found |
| `ROADMAP.md` | Phased plan, architecture vision | Phase items completed, priorities change, new phases added |
| `README.md` | User-facing docs | Features added, setup steps change, structure changes |

**Rules for doc updates:**
- When you fix a known issue from `CODE_REVIEW.md`, add a `[RESOLVED]` prefix to that section.
- When you complete a roadmap item, mark it with a checkmark or strikethrough in `ROADMAP.md`.
- When you add a new file or directory, update the structure trees in `CLAUDE.md` and `ASSESSMENT.md`.
- When you add a new npm script, update the "Quick Reference" section in this file.
- When you change the state object shape, update the "State Management" section in this file.
- When you add or resolve a known issue, update the "Known Issues" section in this file.
- Keep line counts approximate — don't update them for every small edit, but refresh them during major reviews.

---

## Critical File Reference

### Files You Must Understand Before Changing Anything

| File | Why It Matters |
|---|---|
| `src/js/core/state.js` | Every module reads/writes this. Changing property names breaks everything. |
| `src/js/app.js` | Defines `window` globals, render loop, initialization order. |
| `src/js/core/config.js` | Cluster definitions. Adding/removing clusters requires changes in 8+ files. |
| `index.html` | Element IDs are referenced by name in JS. Renaming/removing breaks silently. |

### Files Safe to Modify in Isolation

| File | What's Safe |
|---|---|
| `src/js/core/geometry.js` | Pure functions, no side effects, no state dependency. |
| `src/js/core/pathfinding.js` | Pure functions (only reads `adj` and `nodes[].visible`). |
| `src/css/variables.css` | Design tokens. Changes cascade through all CSS. |
| `src/css/analytics.css` | Only affects analytics tab styling. |

### Files That Are Tightly Coupled (Change Together)

```
config.js ↔ graph-data.js ↔ physics.js    (cluster structure, node shape)
interaction.js ↔ panels.js                 (circular dependency)
tabs.js ↔ app.js                           (window globals for onclick)
renderer.js ↔ state.js                     (reads every state property)
index.html ↔ every ui/ file                (element IDs)
```

---

## HTML Element ID Map

These IDs in `index.html` are referenced directly by JavaScript. Do not rename or remove without updating all JS references.

```
graphCanvas     → camera.js (canvas ref, ctx)
graphArea       → camera.js (resize), app.js (chat drag bounds)
tooltip         → interaction.js (show/hide/position)
nodeDetail      → panels.js (show/hide node detail)
ndDot           → panels.js (node color dot)
ndWord          → panels.js (node word text)
ndClose         → panels.js (close button handler)
ndMeta          → panels.js (node metadata)
ndConnections   → panels.js (same-cluster connections)
ndBridges       → panels.js (cross-cluster bridges)
pathBanner      → panels.js (path finder banner)
pathNodes       → panels.js (path node chips)
pathClose       → panels.js (close path)
searchInput     → search.js (input handler), app.js (window global)
searchClear     → search.js (clear button)
searchBox       → search.js (active state toggle)
filterPills     → search.js (cluster filter buttons)
hiddenLabel     → search.js (hidden node count)
panelContent    → panels.js (tab content container), app.js (initial tab)
panelClose      → panels.js (close panel)
panelToggle     → panels.js (reopen panel)
rightPanel      → panels.js (collapse/expand)
graphLegend     → app.js (legend HTML)
graphHint       → index.html only (static text)
graphControls   → index.html only (container)
btnHulls        → panels.js (toggle hulls)
btnPathMode     → panels.js (toggle path mode)
btnMinimap      → panels.js (toggle minimap)
btnZoomIn       → interaction.js (zoom handler)
btnZoomOut      → interaction.js (zoom handler)
btnFit          → interaction.js (fit view handler)
btnUnpin        → interaction.js (unpin all handler)
minimap         → minimap.js (container, drag events)
minimapCanvas   → minimap.js (canvas ref)
minimapViewport → minimap.js (viewport rect)
modeToggle      → app.js (toggle class)
aiChat          → app.js (chat drag), panels.js (close)
aiChatClose     → panels.js (close handler)
statusText      → panels.js (status bar text)
docTitle        → index.html only (static)
```

---

## Roadmap Summary

Full details in `ROADMAP.md`. Current phase: **Phase 1 (Quality Gates)**.

| Phase | Focus | Status |
|---|---|---|
| 0 | ESLint, Prettier, tsconfig checkJs, remove dead files, .gitignore dist/ | **Done** |
| 1 | Vitest unit tests, GitHub Actions CI, Playwright smoke test | **In progress** (unit tests done, CI + Playwright remaining) |
| 2 | TypeScript migration (core/ first, then ui/, then analytics/) | Not started |
| 3 | Architecture fixes (events, extract data from tabs, seeded PRNG, decompose renderer) | Not started |
| 4 | Features (data import/export, persistence, real AI chat, responsive, a11y) | Not started |
| 5 | Scale (WebGL, real clustering algorithm, NLP sentiment, plugins) | Not started |

### Immediate Next Actions (in order)

1. ~~Delete `infranodus-ui-5.html`~~ Done.
2. ~~Add `dist/` to `.gitignore`~~ Done.
3. ~~Add ESLint + Prettier~~ Done.
4. ~~Add `tsconfig.json` with `allowJs` + `checkJs`~~ Done.
5. ~~Add Vitest + unit tests (geometry, pathfinding, analytics helpers)~~ Done.
6. Add GitHub Actions CI pipeline
7. Add seeded PRNG to `graph-data.js`
7. Define TypeScript interfaces for Node, Edge, State
8. Migrate `core/state.ts` as first TypeScript file

---

## Testing

### Unit Tests (Vitest) — 35 tests passing

| Test File | Functions Tested | Tests |
|---|---|---|
| `tests/geometry.test.js` | `convexHull`, `expandHull` | 10 |
| `tests/pathfinding.test.js` | `bfsPath`, `getNeighborsAtDepth` | 14 |
| `tests/tabs-helpers.test.js` | `wordSentiment`, `computeBridgeScore`, `computeDegrees`, `computeGraphDensity`, `computeClusteringCoeff` | 11 |

**Mock strategy:** Modules with side effects (`graph-data.js`) are mocked via `vi.mock()`. Use `vi.hoisted()` for shared mock state (pathfinding tests) or getter-based mocks (tabs-helpers tests) to work around `vi.mock` hoisting.

### E2E Tests (Playwright)

| Test | What It Verifies |
|---|---|
| Page loads without errors | No JS crashes, canvas renders |
| Graph visible on canvas | Screenshot comparison |
| Click node → detail panel opens | Selection flow works |
| Search filters nodes | Nodes dim/hide correctly |
| Path finder works | Two-node selection, path renders |
| Analytics tabs load | Tab switching, content renders |

---

## Performance Notes

- Physics simulation is O(n * 40) per frame (20-node repulsion window + 20-node same-cluster pass). Fine for 100 nodes, degrades at 500+.
- Convex hulls recomputed every frame when `state.showHulls` is true. Cache opportunity.
- Label collision uses `labelVisCache` (Set of visible node IDs). Invalidated by setting `state.labelVisCache = null`.
- Minimap renders every 3rd frame (`frameCount % 3 === 0`).
- Edge dedup in `addEdge` is O(edges) linear scan. Only matters at init, not at runtime.
- Canvas clears and redraws everything every frame. No dirty rectangle optimization.

---

## Security Notes

- `innerHTML` is used in `tabs.js` and `panels.js` with string concatenation. Currently safe because all data is hardcoded in `config.js`. **If dynamic data is ever loaded, all innerHTML usage must be replaced with DOM APIs or sanitized.**
- Inline `onclick` handlers in HTML strings reference `window` globals. These would be XSS vectors with untrusted data.
- No Content Security Policy (CSP) in `index.html`.
- No input sanitization anywhere.
- Eight devDependencies (esbuild, eslint, prettier, typescript, vitest, etc.) — all well-maintained, none shipped to users.
