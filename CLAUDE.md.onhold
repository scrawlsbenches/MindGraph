# CLAUDE.md — MindGraph

For known issues see `CODE_REVIEW.md`. For the roadmap see `ROADMAP.md`.
For metrics and tech stack see `ASSESSMENT.md`.

---

## Session Start

Run `npm run preflight` before doing any other work — no branch checks, no git commands, no file reads first. It installs deps, fetches branches, checks for uncommitted/orphan work, runs the full check (`npm run check`), and finds the next roadmap item.

If the check fails, assess whether the failure is pre-existing or related to the current branch. Report the failure and ask how to proceed — do not silently attempt large fixes.

Present a summary: uncommitted work, branches with unmerged work, check pass/fail, next roadmap item. Ask what to work on.

---

## Commands

```bash
npm run preflight    # Session start (install, fetch, status, check, roadmap)
npm run check        # format:check + lint + typecheck + test + build
npm run build        # Bundle src/ → dist/
npm run dev          # Watch mode (no minification)
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier write
npm run test         # Vitest (35 unit tests)
npm run test:e2e     # Playwright (8 smoke tests, captures screenshots)
```

---

## Project Identity

MindGraph: client-side network text analytics visualization. Interactive force-directed graph on Canvas 2D with cluster analysis, path finding, sentiment analysis, and 8 analytics tabs. Zero runtime dependencies. Node >= 18.

---

## Documentation Rules

Each document has a single responsibility. Information lives in one place only.

| Document | Owns | Does NOT contain |
|---|---|---|
| `CLAUDE.md` | Workflow SOPs, architecture rules, coding conventions | Issue tracking, roadmap status, metrics |
| `CODE_REVIEW.md` | Known issues with severity ratings | Architecture, conventions |
| `ROADMAP.md` | Phased plan, priorities, completion status | Issue details, coding rules |
| `ASSESSMENT.md` | Repo metrics, tech stack, dependencies, perf/security notes | Plans, conventions |
| `README.md` | User-facing docs: features, setup, usage | Internal dev procedures |

**When making changes:**
- Fix an issue from `CODE_REVIEW.md` → mark it `[RESOLVED]` there.
- Complete a roadmap item → mark it done in `ROADMAP.md`.
- Add/remove files or deps → update `ASSESSMENT.md`.
- Change architecture or conventions → update this file.
- **Documentation updates go in the same commit as the code change.**

---

## Architecture Rules

### Layer Model

```
core/      → Pure data, algorithms, state. No DOM access except camera.js.
ui/        → All DOM interaction, Canvas rendering, user input.
analytics/ → HTML-generating functions for tab content. Must not mutate state.
app.js     → Orchestrator: init, window globals, render loop.
```

**Enforce these boundaries.** Do not import DOM APIs in `core/` (except `camera.js`). Do not compute analytics in `ui/`. Do not mutate `state` in `analytics/`.

### State Management

All mutable state lives in `src/js/core/state.js` as a single flat object. Every module imports and mutates it directly. There are no observers — changes propagate via the render loop (`requestAnimationFrame` re-reads state every frame).

### Required Side Effects

| If you change... | Then also... |
|---|---|
| Node visibility, selection, search, or positions | Set `state.labelVisCache = null` |
| `state.selectedNode` | Call `updateND()` |
| Node visibility or search state | Call `updateStatus()` |
| Physics tuning values | Add named constants in `config.js`, not magic numbers |

### Rules

- **Node selection logic belongs in `state-actions.js`** — not `interaction.js` or `panels.js`. Avoids circular deps.
- **Don't add `window` globals.** Use event delegation, not inline `onclick`.
- **Don't hardcode cluster count.** Derive from `CLUSTER_NAMES.length` or `CLUSTER_KEYWORDS.length`.
- **Zero runtime deps is a feature.** Don't add libraries without discussion.

### Tightly Coupled Files

```
config.js ↔ graph-data.js ↔ physics.js     (cluster structure, node shape, PHYSICS constants)
state-actions.js ↔ panels.js ↔ renderer.js  (selection, depth, UI updates)
tabs.js ↔ app.js                            (window globals for onclick)
renderer.js ↔ state.js                      (reads every state property)
index.html ↔ every ui/ file                 (element IDs)
index.html ↔ tabs.js                        (tab buttons ↔ builder functions)
state.js ↔ src/types/graph.d.ts             (AppState interface must match)
```

### Critical Files

| File | Impact |
|---|---|
| `src/js/core/state.js` | Every module reads/writes this. Changing property names breaks everything. |
| `src/js/app.js` | Window globals, render loop, init order. |
| `src/js/core/config.js` | Cluster definitions. Adding/removing clusters affects 8+ files. |
| `index.html` | Element IDs referenced by JS — see below. |

**Files safe to modify in isolation:** `geometry.js`, `pathfinding.js` (pure functions), `variables.css`, `analytics.css`.

### HTML Element IDs

Element IDs in `index.html` are referenced via `getElementById` across all `ui/` files, `camera.js`, and `app.js` (~40 cross-references in 6 JS files). **Always grep before renaming or removing any ID.**

---

## Coding Conventions

Style is enforced by Prettier (`.prettierrc`) and ESLint (`eslint.config.mjs`). Only non-obvious conventions listed here:

- **Naming:** camelCase for functions/variables. UPPER_SNAKE for constants in `config.js`. Underscore prefix (`_a`, `_d`) for internal/transient node properties.
- **Comments:** Module-level block headers (`/* === ... === */`). JSDoc `@type` casts for DOM narrowing. No inline comments explaining logic.
- **Modules:** ES modules for all source. `build.js` is CJS (separate ESLint override).
- **Types:** `tsc --noEmit` with `checkJs`. Interfaces live in `src/types/`. Use `/** @type {Type} */` for DOM element narrowing.

---

## Testing

Run `npm run test` (unit) and `npm run test:e2e` (E2E) before committing.

**E2E screenshots** are deterministic (seeded PRNG). Commit updated screenshots alongside code changes — never in a separate commit.

**Mock strategy for new tests:** Modules with side effects (`graph-data.js`) must be mocked via `vi.mock()`. Use `vi.hoisted()` for shared mock state or getter-based mocks to work around hoisting. See existing test files for the pattern.

**When constructing `GraphNode` objects** (e.g. in tests), include ALL properties from `src/types/graph.d.ts`. Label footprint props (`labelW`, `labelH`, `fpRight`, `fpLeft`, `fpY`) must be initialized to 0.

---

## Known Pitfalls

- **`execSync` with `stdio: 'inherit'` returns `null`.** Use `stdio: 'pipe'` if you need the output string.
- **`ASSESSMENT.md` goes stale first.** Metrics drift with every change. Verify when it matters.
- **`eslint-config-prettier` does NOT enforce Prettier.** Only `npm run format:check` does. That's why it's the first step in `npm run check`.
- **Always run E2E tests before committing.** Even non-visual changes can regenerate screenshots.
- **Do not rely on auto-memory files.** They are ephemeral. All operational knowledge belongs in this file.
- **Never create memory files outside this project folder.** All session notes and memory files must live in the repository.
