# MindGraph Repository Assessment

**Date:** 2026-02-08
**Assessed by:** Claude Code (automated review)
**Repository:** scrawlsbenches/MindGraph
**Version:** 1.0.0

---

## 1. Project Overview

MindGraph is a client-side network text analytics visualization tool. It renders an interactive force-directed graph with cluster analysis, path finding, sentiment analysis, and analytics dashboards. The entire application runs in the browser with zero backend dependencies.

**Core purpose:** Visualize relationships between concepts as a graph, grouped into topic clusters, with analytics for understanding network structure.

---

## 2. Repository Structure

```
MindGraph/                          (727 KB total)
├── index.html                      # Application shell (192 lines)
├── build.js                        # esbuild configuration (51 lines)
├── package.json                    # NPM config (1 dev dependency)
├── package-lock.json               # Lockfile
├── README.md                       # Project documentation (99 lines)
├── .gitignore                      # Ignore rules
├── tests/                          # Unit tests (Vitest)
│   ├── geometry.test.js            # convexHull, expandHull (10 tests)
│   ├── pathfinding.test.js         # bfsPath, getNeighborsAtDepth (14 tests)
│   └── tabs-helpers.test.js        # wordSentiment, bridgeScore, degrees, density, clustering (11 tests)
├── dist/                           # Production build output
│   ├── index.html                  # Self-contained (8 KB)
│   ├── mindgraph.min.js            # Bundled JS (42 KB)
│   └── mindgraph.min.css           # Bundled CSS (24 KB)
└── src/                            # Source code (3,180 lines)
    ├── js/                         # JavaScript ES modules (1,747 lines)
    │   ├── app.js                  # Entry point, render loop (97 lines)
    │   ├── core/                   # Data & algorithms (559 lines)
    │   │   ├── state.js            # Centralized mutable state (35 lines)
    │   │   ├── config.js           # Constants & cluster definitions (43 lines)
    │   │   ├── graph-data.js       # Node/edge generation (90 lines)
    │   │   ├── physics.js          # Force-directed simulation (113 lines)
    │   │   ├── camera.js           # Canvas transforms & fly-to (50 lines)
    │   │   ├── geometry.js         # Convex hull & splines (62 lines)
    │   │   └── pathfinding.js      # BFS shortest path (46 lines)
    │   ├── ui/                     # Rendering & interaction (652 lines)
    │   │   ├── renderer.js         # Canvas draw loop (297 lines)
    │   │   ├── interaction.js      # Mouse/keyboard events (154 lines)
    │   │   ├── panels.js           # Analytics panel & node details (148 lines)
    │   │   ├── minimap.js          # Minimap rendering (101 lines)
    │   │   └── search.js           # Search & cluster filter (60 lines)
    │   └── analytics/              # Analytics tab builders (433 lines)
    │       └── tabs.js             # All 8 tab generators
    └── css/                        # Stylesheets (1,433 lines)
        ├── bundle.css              # CSS entry point
        ├── variables.css           # Design tokens
        ├── base.css                # Reset & layout
        ├── topbar.css              # Navigation bar
        ├── toolbar.css             # Action toolbar
        ├── sidebar.css             # Left icon sidebar
        ├── graph.css               # Canvas & overlays
        ├── panels.css              # Right panel
        ├── chat.css                # AI chat panel
        └── analytics.css           # Analytics tab styles
```

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | JavaScript ES Modules | Vanilla, TypeScript `checkJs` enabled |
| Rendering | Canvas 2D API | Custom physics engine |
| Styling | CSS3 + Custom Properties | No preprocessor |
| Build | esbuild 0.27.3 | IIFE bundle + minification + source maps |
| Package Manager | npm | Node >= 18 required |
| Frameworks | None | Zero runtime dependencies |
| Testing | Vitest 4.0 + @vitest/coverage-v8 | 35 unit tests across 3 files |
| Linting | ESLint 10 + Prettier 3 | Flat config, eslint-config-prettier |
| CI/CD | None | No GitHub Actions or pipelines |
| Type Checking | TypeScript 5.9 (checkJs) | `tsc --noEmit`, type declarations in `src/types/` |

---

## 4. Architecture Analysis

### 4.1 Module Organization

The project follows a **feature-based layered architecture**:

- **Core layer** (`src/js/core/`): Pure data structures, algorithms, and state. No DOM access except `camera.js`.
- **UI layer** (`src/js/ui/`): All DOM interaction, Canvas rendering, and user input.
- **Analytics layer** (`src/js/analytics/`): HTML-generating functions for analytics tab content.
- **Entry point** (`src/js/app.js`): Orchestrates initialization and the main render loop.

### 4.2 Data Flow

```
[config.js] → [graph-data.js] → nodes[], edges[], adj Map
                                        ↓
                              [physics.js] simulate()
                                        ↓
                              [renderer.js] draw()
                                        ↓
                              Canvas 2D ← [camera.js] transforms
                                        ↑
                              [interaction.js] events → [state.js] mutations
```

### 4.3 State Management

All mutable state lives in a single exported object (`state.js`). Every module imports it and mutates properties directly. There are no getters, setters, observers, or immutability guarantees. State changes propagate through the render loop -- `requestAnimationFrame` re-reads state every frame.

### 4.4 Data Generation

Graph data is **hardcoded and deterministic** (modulo `Math.random()` calls at module load time). There is:
- No data import/export
- No persistence (graph resets on reload)
- No external data source
- No user-generated content
- 100 nodes across 5 clusters, generated from `CLUSTER_KEYWORDS`

---

## 5. Dependency Analysis

### Runtime Dependencies: **Zero**

The application has no runtime dependencies. All functionality is implemented from scratch:
- Physics engine (custom force-directed)
- Graph algorithms (BFS, convex hull, Graham scan)
- Rendering (Canvas 2D API)
- UI interactions (vanilla DOM events)

### Dev Dependencies: **Eight**

| Package | Version | Purpose |
|---|---|---|
| esbuild | ^0.27.3 | Bundle & minify JS/CSS |
| eslint | ^10.0.0 | Linting |
| @eslint/js | ^10.0.1 | ESLint recommended rules |
| eslint-config-prettier | ^10.1.8 | Disable ESLint rules that conflict with Prettier |
| prettier | ^3.8.1 | Code formatting |
| typescript | ^5.9.3 | Type checking (checkJs, no emit) |
| vitest | ^4.0.18 | Unit test framework |
| @vitest/coverage-v8 | ^4.0.18 | Test coverage reporting |

### Missing Dependencies (recommended)

| Category | Suggested |
|---|---|
| Test framework | vitest |
| E2E testing | playwright |
| Pre-commit hooks | husky + lint-staged |

---

## 6. Build System

The build is minimal and functional:
1. `npm run build` executes `build.js`
2. esbuild bundles `src/js/app.js` → `dist/mindgraph.min.js` (IIFE, minified)
3. esbuild bundles `src/css/bundle.css` → `dist/mindgraph.min.css` (minified)
4. `dist/index.html` is generated with corrected asset paths
5. Reports bundle sizes and module breakdown

**Output sizes:** JS ~42 KB, CSS ~24 KB, HTML ~8 KB

**Missing:** Dev server, hot reload, watch mode, source maps, environment variables.

---

## 7. Documentation Assessment

| Document | Status | Quality |
|---|---|---|
| README.md | Present | Good -- covers features, structure, getting started |
| CONTRIBUTING.md | Missing | -- |
| CHANGELOG.md | Missing | -- |
| LICENSE file | Missing | ISC declared in package.json but no LICENSE file |
| Architecture docs | Missing | -- |
| API docs | Missing | -- |
| Inline comments | Minimal | Module headers only, no JSDoc |

---

## 8. Git History

The repository has 9 commits showing a clear evolution:
1. Initial monolithic HTML commit (`infranodus-ui-5.html`)
2. Reorganization into modular project structure
3. Bug fix for script load order
4. ES module conversion
5. esbuild bundling added
6. README added
7. Self-contained dist/index.html
8. Merge PR for file visibility

The commit history is clean and logical, showing a deliberate refactoring from prototype to structured project.

---

## 9. Security Assessment

| Area | Status | Risk |
|---|---|---|
| XSS via innerHTML | **Present** | Medium -- `tabs.js` and `panels.js` insert user-facing content via `innerHTML` with string concatenation. Currently safe because data is hardcoded, but any dynamic data source would be vulnerable. |
| Dependency vulnerabilities | **Low** | Only one dev dependency (esbuild), not shipped to users |
| HTTPS/CSP | **N/A** | Static file, no server |
| Input validation | **Missing** | No sanitization anywhere |
| Content Security Policy | **Missing** | `index.html` has no CSP headers/meta |

---

## 10. Performance Profile

**Strengths:**
- Zero-dependency 42 KB bundle loads fast
- Label collision detection uses spatial caching (`labelVisCache`)
- Minimap renders every 3rd frame
- Alpha transitions use frame-rate-independent lerping

**Concerns:**
- Physics `simulate()` runs O(n) per node but has a nested O(20) same-cluster loop and O(20) nearby-node loop per node -- effectively O(n * 40) per frame. Fine for 100 nodes, will degrade at 500+.
- Edge duplicate checking in `addEdge` uses `edges.find()` (linear scan) -- O(e) per edge addition.
- `renderer.js` computes convex hulls every frame when hulls are shown.
- No Web Workers for physics computation.
- Canvas clears and redraws everything every frame (no dirty rectangles).

---

## 11. Key Metrics Summary

| Metric | Value |
|---|---|
| Total source lines | ~3,200 |
| JavaScript lines | ~1,750 |
| CSS lines | 1,433 |
| Source files | 26 (14 JS + 10 CSS + 2 .d.ts) |
| Runtime dependencies | 0 |
| Dev dependencies | 8 |
| Test coverage | Unit tests: 35 passing (geometry, pathfinding, analytics helpers) |
| Linting rules | ESLint recommended + Prettier |
| Type checking | TypeScript checkJs (0 errors) |
| CI/CD pipelines | None |
| Open issues | 0 |
| Contributors | 1 |
