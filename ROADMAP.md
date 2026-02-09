# MindGraph Recommendations & Roadmap

**Date:** 2026-02-08
**Author:** Claude Code (automated review)

---

## Executive Summary

MindGraph is a well-structured 3,180-line vanilla JavaScript graph visualization tool with zero runtime dependencies and a 66 KB production bundle. It has solid algorithmic foundations and clean module boundaries. However, it lacks every engineering quality tool (tests, linting, CI, types) and has critical gaps that prevent it from becoming a production-ready or maintainable project.

This document provides prioritized recommendations and a phased roadmap.

---

## Key Decisions

### Should We Port to TypeScript?

**Recommendation: Yes, incrementally.**

**Why:**
1. The `state.js` object is imported and mutated by every module with zero type safety. A single typo (`state.selectednode` instead of `state.selectedNode`) silently creates a new property and causes a bug.
2. Node and edge objects have 15+ properties each with implicit contracts. TypeScript interfaces would catch misuse at compile time.
3. The `tabs.js` functions reference `window` globals via inline HTML strings -- TypeScript won't catch those, but it will catch every other call site.
4. The codebase is small (1,747 lines JS). Full migration is a single focused effort.

**How:**
1. Add `tsconfig.json` with `allowJs: true`, `checkJs: true`, `strict: true`
2. Start with `core/` files -- define `Node`, `Edge`, `State` interfaces
3. Rename `.js` to `.ts` file by file, starting with `state.ts`, `config.ts`, `graph-data.ts`
4. esbuild handles TypeScript natively -- no build changes needed
5. Move UI files last (they have the most DOM interaction)

**Cost:** ~2-4 focused sessions. No architectural changes needed.

### Should We Use Playwright?

**Recommendation: Yes, but not first.**

**Why Playwright specifically:**
1. MindGraph renders to Canvas 2D. Traditional DOM testing (Cypress, Testing Library) cannot inspect canvas content.
2. Playwright supports screenshot comparison, which can verify visual rendering.
3. Playwright can simulate mouse events on canvas coordinates for interaction testing.
4. Playwright's `page.evaluate()` can inspect `window.nodes`, `window.selectNode`, etc. directly.

**But first:**
1. Add **Vitest** for unit tests of pure functions (`convexHull`, `bfsPath`, `getNeighborsAtDepth`, `wordSentiment`, `computeBridgeScore`, `computeClusteringCoeff`). These are the highest-value, lowest-effort tests.
2. Add **Playwright** for E2E smoke tests: page loads, graph renders, click selects node, search filters, path finding works.

**Recommended test stack:**
```
vitest          → Unit tests (pure functions, state transitions)
playwright      → E2E tests (visual regression, interaction flows)
@vitest/coverage-v8 → Coverage reporting
```

---

## Prioritized Recommendations

### Phase 0: Foundation (Immediate)

These are hygiene items that should be done before any feature work.

| # | Item | Effort | Impact |
|---|---|---|---|
| 0.1 | ~~Add `.editorconfig` and Prettier~~ | ~~30 min~~ | ~~Done~~ |
| 0.2 | ~~Add ESLint with recommended config~~ | ~~30 min~~ | ~~Done~~ |
| 0.3 | ~~Add `tsconfig.json` with `checkJs`~~ | ~~30 min~~ | ~~Done~~ |
| 0.4 | ~~Remove `infranodus-ui-5.html`~~ | ~~5 min~~ | ~~Done~~ |
| 0.5 | ~~Add `dist/` to `.gitignore`~~ | ~~5 min~~ | ~~Done~~ |
| 0.6 | ~~Add LICENSE file (ISC)~~ | ~~5 min~~ | ~~Done~~ |
| 0.7 | ~~Add source maps to build~~ | ~~10 min~~ | ~~Done~~ |
| 0.8 | ~~Add watch mode to build~~ | ~~10 min~~ | ~~Done~~ |

### Phase 1: Quality Gates

| # | Item | Effort | Impact |
|---|---|---|---|
| 1.1 | ~~Add Vitest + unit tests for `core/geometry.js`~~ | ~~1 session~~ | ~~Done — 10 tests~~ |
| 1.2 | ~~Add unit tests for `core/pathfinding.js`~~ | ~~1 session~~ | ~~Done — 14 tests~~ |
| 1.3 | ~~Add unit tests for `analytics/tabs.js` helpers~~ | ~~1 session~~ | ~~Done — 11 tests~~ |
| 1.4 | ~~Add GitHub Actions CI pipeline~~ | ~~Skipped~~ | ~~Single developer, not needed~~ |
| 1.5 | ~~Add Husky pre-commit hooks~~ | ~~Skipped~~ | ~~Single developer, not needed~~ |
| 1.6 | ~~Add Playwright smoke test~~ | ~~1 session~~ | ~~Done — 8 tests with screenshots~~ |

### Phase 2: TypeScript Migration

| # | Item | Effort | Impact |
|---|---|---|---|
| 2.1 | Define core interfaces (`Node`, `Edge`, `State`) | 1 session | Type foundation |
| 2.2 | Migrate `core/` to TypeScript | 1 session | Type-safe data layer |
| 2.3 | Migrate `ui/` to TypeScript | 1-2 sessions | Type-safe rendering/interaction |
| 2.4 | Migrate `analytics/` to TypeScript | 1 session | Type-safe tab builders |
| 2.5 | Enable `strict` mode | 30 min | Maximum type safety |

### Phase 3: Architecture Improvements

| # | Item | Effort | Impact |
|---|---|---|---|
| 3.1 | Replace `window` globals with event delegation | 1 session | Remove global namespace pollution |
| 3.2 | Extract data computation from `tabs.js` HTML | 2 sessions | Testable analytics, reusable metrics |
| 3.3 | ~~Add seeded PRNG for deterministic layouts~~ | ~~Done~~ | ~~Reproducible graphs (mulberry32, seed=42)~~ |
| 3.4 | ~~Extract physics constants to config~~ | ~~Done~~ | ~~16 named constants in PHYSICS object in config.js~~ |
| 3.5 | ~~Decompose `renderer.js draw()` into passes~~ | ~~Done~~ | ~~6 focused rendering pass functions~~ |
| 3.6 | ~~Break circular dependency (interaction ↔ panels)~~ | ~~Done~~ | ~~Extracted state-actions.js~~ |
| 3.7 | Add simple event emitter for state changes | 1 session | Reactive UI updates |

### Phase 4: Feature Development

| # | Item | Effort | Impact |
|---|---|---|---|
| 4.1 | Data import (JSON, CSV, text) | 2-3 sessions | Real data instead of hardcoded |
| 4.2 | Data export (graph as JSON, PNG, SVG) | 1-2 sessions | User value |
| 4.3 | Persistence (localStorage or IndexedDB) | 1 session | Graphs survive reload |
| 4.4 | AI chat integration (real LLM API) | 2-3 sessions | Currently UI-only mockup |
| 4.5 | Responsive layout / mobile support | 2 sessions | Broader audience |
| 4.6 | Light theme / theme switching | 1 session | Accessibility |
| 4.7 | Keyboard navigation & accessibility | 1-2 sessions | a11y compliance |
| 4.8 | Web Worker for physics | 1-2 sessions | Performance for large graphs |

### Phase 5: Scale & Polish

| # | Item | Effort | Impact |
|---|---|---|---|
| 5.1 | WebGL rendering option | 3-4 sessions | Support 1000+ nodes |
| 5.2 | Clustering algorithm (real, not config-based) | 2-3 sessions | Dynamic cluster discovery |
| 5.3 | NLP-based sentiment analysis | 1-2 sessions | Replace hardcoded word lists |
| 5.4 | Plugin/extension system | 3+ sessions | Community contributions |
| 5.5 | Performance profiling & optimization | 1-2 sessions | Benchmarked improvements |

---

## Workflow Recommendations

### Development Workflow

```
1. Branch from main (feature/fix branch)
2. Code changes with TypeScript type checking
3. Run: npm run lint (ESLint + Prettier)
4. Run: npm run test (Vitest unit tests)
5. Run: npm run build (esbuild bundle)
6. Run: npm run test:e2e (Playwright, if UI changed)
7. Commit (Husky runs lint-staged pre-commit)
8. PR → CI runs all checks → merge
```

### Suggested package.json Scripts

```json
{
  "scripts": {
    "dev": "node build.js --watch",
    "build": "node build.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "check": "npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

### CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --reporter=verbose
      - run: npm run build
```

---

## Architecture Vision

### Current State
```
[Hardcoded Config] → [IIFE Graph Gen] → [Mutable State] → [Canvas Render Loop]
                                              ↑
                                    [Direct DOM Events]
```

### Target State
```
[Data Source (JSON/API/file)] → [Graph Model (typed, immutable)]
                                        ↓
                              [State Store (typed, observable)]
                                   ↓           ↓
                        [Canvas Renderer]  [DOM Panels]
                                   ↑           ↑
                        [Event System (typed events)]
                                   ↑
                        [User Input Handler]
```

Key differences:
1. **Data is loaded, not generated** — Supports real use cases
2. **State is observable** — UI reacts to changes instead of polling
3. **Types everywhere** — Compile-time safety
4. **Events decouple modules** — No circular dependencies
5. **Renderer is passive** — Only draws what state says, no side effects

---

## Immediate Next Steps

If starting today, do these in order:

1. **Delete `infranodus-ui-5.html`** — Clean slate
2. **Add `dist/` to `.gitignore`** — Stop tracking build artifacts
3. **Add ESLint + Prettier** — Automate style
4. **Add `tsconfig.json` with `checkJs`** — Free type checking on existing JS
5. **Add Vitest + first test** — Test `convexHull()` to establish the pattern
6. **Add seeded PRNG** — Make layouts reproducible
7. **Define TypeScript interfaces** — `Node`, `Edge`, `State` types
8. **Migrate `core/state.ts`** — First real TypeScript file

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TypeScript migration breaks build | Low | High | esbuild handles TS natively; migrate one file at a time |
| Adding tests slows development | Medium | Low | Tests prevent regressions that slow development more |
| Refactoring renderer breaks visuals | Medium | High | Add Playwright visual regression tests before refactoring |
| Scaling to 500+ nodes drops FPS | High | Medium | Web Worker for physics, or WebGL rendering |
| AI chat integration requires backend | High | Medium | Will need API proxy or serverless function |
| Circular dependency causes runtime bug | Low | High | Break interaction↔panels cycle in Phase 3 |

---

## Conclusion

MindGraph has a solid foundation: clean architecture, zero dependencies, correct algorithms, and a small footprint. The primary risks are all quality-related (no tests, no types, no linting) rather than structural. The recommended path is:

1. **Add quality gates** (lint, type check, test) — Phase 0-1
2. **Migrate to TypeScript** — Phase 2
3. **Fix architectural issues** — Phase 3
4. **Build features on the solid foundation** — Phase 4-5

The project is well-positioned for incremental improvement without requiring a rewrite.
