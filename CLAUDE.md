# CLAUDE.md — MindGraph Project Guide

This file is the authoritative reference for any AI or developer working on MindGraph.
It contains workflow procedures, architecture knowledge, and coding conventions.

For known issues see `CODE_REVIEW.md`. For the development roadmap see `ROADMAP.md`.
For repository metrics and tech stack see `ASSESSMENT.md`.

---

## Session Start Checklist

Run `npm run preflight` at the beginning of every session, before doing any work. The script runs these steps automatically:

1. Install dependencies (skipped if `node_modules` is current)
2. Fetch remote branches
3. Check for uncommitted changes
4. Check for orphan branch work (branches with unmerged commits)
5. Run the full check (`npm run check` — lint + typecheck + test + build)
6. Find the next incomplete roadmap item

If the check fails, assess whether the failure is related to the current branch or pre-existing. Report the failure to the user and ask how they want to proceed — do not silently attempt large fixes.

Present a summary to the user: uncommitted work (if any), branches with unmerged work (if any), check pass/fail, and the next roadmap item. Ask what they want to work on.

---

## Branch Management

- **Never delete branches.** They serve as commit history reference.
- **One branch per task.** Don't reuse old branches for new work.

---

## Documentation Rules

Each document has a single responsibility. Information lives in one place only.

| Document | Owns | Does NOT contain |
|---|---|---|
| `CLAUDE.md` | Workflow SOPs, architecture, coding conventions, file reference | Issue tracking, roadmap status, metrics |
| `CODE_REVIEW.md` | Known issues with severity ratings | Architecture docs, conventions |
| `ROADMAP.md` | Phased plan, priorities, completion status | Issue details, coding rules |
| `ASSESSMENT.md` | Repository metrics, tech stack, dependency list, performance/security notes | Plans, conventions |
| `README.md` | User-facing docs: features, setup, usage | Internal dev procedures |

**When making changes:**
- If you fix an issue from `CODE_REVIEW.md`, mark it `[RESOLVED]` there. Do not maintain a shadow copy here.
- If you complete a roadmap item, mark it done in `ROADMAP.md`. Do not maintain a shadow copy here.
- If you add/remove files or dependencies, update the structure tree in this file and the dependency list in `ASSESSMENT.md`.
- If you change architecture, state shape, or conventions, update this file.
- **Documentation updates go in the same commit as the code change.** Not a follow-up.

---

## Project Identity

MindGraph is a client-side network text analytics visualization tool. It renders an interactive force-directed graph on Canvas 2D with cluster analysis, path finding, sentiment analysis, and 8 analytics dashboard tabs. Zero runtime dependencies. 66 KB production bundle.

**Repository:** scrawlsbenches/MindGraph
**License:** ISC (see LICENSE file)
**Node requirement:** >= 18

---

## Quick Reference

```bash
npm run preflight    # Session start checklist (install, fetch, status, check, roadmap)
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
npm run test:e2e     # Playwright E2E smoke tests (8 tests, captures screenshots)
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
├── CLAUDE.md                       # THIS FILE — workflow SOPs, architecture, conventions
├── ASSESSMENT.md                   # Repository metrics, tech stack, performance/security notes
├── CODE_REVIEW.md                  # Known issues with severity ratings
├── ROADMAP.md                      # Phased plan & architecture vision
├── README.md                       # User-facing project documentation
├── LICENSE                         # ISC license
├── index.html                      # Application shell (192 lines, element IDs used by JS)
├── build.js                        # esbuild config (CJS, bundles src/ → dist/)
├── package.json                    # Dev deps: esbuild, eslint, prettier, typescript, vitest, playwright
├── vitest.config.js                # Vitest config (excludes e2e tests)
├── playwright.config.js            # Playwright E2E config (chromium, webServer)
├── eslint.config.js                # ESLint flat config (recommended + prettier)
├── .prettierrc                     # Prettier config (single quotes, 2-space, semi)
├── .editorconfig                   # Editor settings (indent, EOL, charset)
├── tsconfig.json                   # TypeScript checkJs config (no emit)
├── scripts/
│   └── preflight.js                # Session start checklist (npm run preflight)
├── tests/                          # All tests
│   ├── geometry.test.js            # convexHull, expandHull (10 tests)
│   ├── pathfinding.test.js         # bfsPath, getNeighborsAtDepth (14 tests)
│   ├── tabs-helpers.test.js        # wordSentiment, bridgeScore, degrees, density, clustering (11 tests)
│   ├── serve.js                    # Static file server for E2E tests
│   └── e2e/                        # Playwright E2E smoke tests
│       ├── smoke.spec.mjs          # 8 smoke tests with screenshots
│       └── screenshots/            # Captured screenshots (checked in, merge=ours)
├── dist/                           # Build output (.gitignored)
│   ├── index.html
│   ├── mindgraph.min.js            # + source map
│   └── mindgraph.min.css           # + source map
└── src/
    ├── js/                         # 1,747 lines across 14 files
    │   ├── app.js                  # Entry point, render loop, window globals (97 lines)
    │   ├── core/                   # Data layer & algorithms (~600 lines)
    │   │   ├── state.js            # Single mutable state object (~35 lines)
    │   │   ├── config.js           # Constants, PHYSICS params, seeded PRNG (~85 lines)
    │   │   ├── graph-data.js       # Node/edge generation via IIFEs (~90 lines)
    │   │   ├── physics.js          # Force-directed simulation (~120 lines)
    │   │   ├── camera.js           # Canvas context, transforms, fly-to (~50 lines)
    │   │   ├── geometry.js         # Graham scan convex hull, Catmull-Rom spline (~62 lines)
    │   │   └── pathfinding.js      # BFS shortest path, N-depth neighbors (~46 lines)
    │   ├── ui/                     # DOM/Canvas interaction (~690 lines)
    │   │   ├── renderer.js         # Rendering passes: hulls, edges, nodes, labels, badge (~314 lines)
    │   │   ├── interaction.js      # Mouse/keyboard events (~125 lines)
    │   │   ├── state-actions.js    # Node selection & depth actions (~35 lines)
    │   │   ├── panels.js           # Right panel, node detail popover, path banner (~150 lines)
    │   │   ├── minimap.js          # Minimap canvas rendering + drag (~101 lines)
    │   │   └── search.js           # Search input, cluster filter pills (~60 lines)
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

### State Actions Module

`state-actions.js` contains `selectNode()` and `setDepth()` — the core state mutation functions for node selection. Both `interaction.js` and `panels.js` import from `state-actions.js`, avoiding any circular dependency.

---

## Testing

### Unit Tests (Vitest) — 35 tests

| Test File | Functions Tested | Tests |
|---|---|---|
| `tests/geometry.test.js` | `convexHull`, `expandHull` | 10 |
| `tests/pathfinding.test.js` | `bfsPath`, `getNeighborsAtDepth` | 14 |
| `tests/tabs-helpers.test.js` | `wordSentiment`, `computeBridgeScore`, `computeDegrees`, `computeGraphDensity`, `computeClusteringCoeff` | 11 |

**Mock strategy:** Modules with side effects (`graph-data.js`) are mocked via `vi.mock()`. Use `vi.hoisted()` for shared mock state (pathfinding tests) or getter-based mocks (tabs-helpers tests) to work around `vi.mock` hoisting.

### E2E Tests (Playwright) — 8 smoke tests

| Test | What It Verifies | Screenshot |
|---|---|---|
| Page loads without errors | No JS crashes, canvas renders | `01-page-load.png` |
| Canvas exists and has dimensions | Canvas visible, width/height > 100 | — |
| 100 nodes in memory | `window.nodes.length === 100` | — |
| Click canvas selects node | AI chat closed, canvas clickable | `02-canvas-click.png` |
| Programmatic node selection | `selectNode(nodes[0])` opens detail panel | `03-node-detail.png` |
| Search filters nodes | Status bar shows `Search: "dream"` | `04-search-filter.png` |
| Analytics tabs render | All 8 tabs produce content | `05-analytics-tabs.png` |
| Path mode toggles | Button active/inactive state toggles | — |

**Screenshots** saved to `tests/e2e/screenshots/` and checked into git. Layout is deterministic (seeded PRNG) so screenshots are reproducible. `.gitattributes` marks these files as `merge=ours binary`, so merge conflicts auto-resolve by keeping the current branch's version.

**Server:** `tests/serve.js` — minimal Node.js static server, started automatically by Playwright's `webServer` config.

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

**Read the file first.** Understand existing code before changing it.

**Principles:**
- **Respect the layer model.** `core/` must not access DOM (except `camera.js`). `ui/` must not compute analytics data. `analytics/` must not mutate state.
- **Don't add `window` globals.** Use event delegation (attach listener to parent, check `e.target`), not inline `onclick`.
- **Don't hardcode cluster count.** Derive from `CLUSTER_NAMES.length` or `CLUSTER_KEYWORDS.length`.
- **Keep bundle small.** Zero runtime dependencies is a feature. Don't add libraries without discussion.
- **Node selection logic belongs in `state-actions.js`.** Not in `interaction.js` or `panels.js` — avoids circular dependencies.

**Required side effects — if you change X, also do Y:**

| If you change... | Then also... |
|---|---|
| Node visibility, selection, search, or positions | Set `state.labelVisCache = null` |
| `state.selectedNode` | Call `updateND()` |
| Node visibility or search state | Call `updateStatus()` |
| Physics tuning values | Add named constants in `config.js`, not magic numbers in `physics.js` |

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
config.js ↔ graph-data.js ↔ physics.js    (cluster structure, node shape, PHYSICS constants)
state-actions.js ↔ panels.js ↔ renderer.js (selection, depth, UI updates)
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
