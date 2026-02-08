# MindGraph

Network text analytics visualization tool. Explore ideas as an interactive force-directed graph with cluster analysis, path finding, sentiment analysis, and AI-powered insights.

## Features

- **Force-directed graph** — Canvas 2D rendering with physics simulation, zoom, pan, and fly-to animations
- **Cluster analysis** — automatic topic clustering with convex hull overlays and color coding
- **Path finder** — BFS-based shortest path between any two nodes with animated particles
- **Node explorer** — click any node to see same-cluster connections, cross-cluster bridges, and depth traversal
- **Minimap** — draggable viewport overview for large graphs
- **8 analytics tabs** — AI Insights, Main Ideas, Content Gaps, Relations, Sentiment, Stats, Trends, Structure
- **AI chat panel** — floating conversational interface for graph summarization
- **Search & filter** — real-time node search with cluster filter pills

## Project Structure

```
MindGraph/
├── index.html                  # Application shell
├── build.js                    # esbuild bundler configuration
├── package.json
├── dist/
│   ├── mindgraph.min.js        # Bundled & minified JS (41 KB)
│   └── mindgraph.min.css       # Bundled & minified CSS (24 KB)
└── src/
    ├── css/
    │   ├── bundle.css           # CSS entry point (imports all below)
    │   ├── variables.css        # Design tokens & custom properties
    │   ├── base.css             # Reset, layout, scrollbars
    │   ├── topbar.css           # Top navigation bar
    │   ├── toolbar.css          # Action toolbar & filter pills
    │   ├── sidebar.css          # Left icon sidebar
    │   ├── graph.css            # Canvas, tooltips, minimap, controls
    │   ├── panels.css           # Right analytics panel
    │   ├── chat.css             # AI chat floating panel
    │   └── analytics.css        # Analytics tab content styles
    └── js/
        ├── app.js               # Entry point, render loop, window globals
        ├── core/
        │   ├── state.js         # Centralized mutable state store
        │   ├── config.js        # Constants, cluster definitions, colors
        │   ├── graph-data.js    # Node/edge generation, adjacency list
        │   ├── physics.js       # Force simulation (repulsion, springs, damping)
        │   ├── camera.js        # Canvas context, coordinate transforms, fly-to
        │   ├── geometry.js      # Convex hull computation & smooth drawing
        │   └── pathfinding.js   # BFS shortest path, neighbor depth traversal
        ├── ui/
        │   ├── renderer.js      # Main draw loop (nodes, edges, hulls, labels)
        │   ├── minimap.js       # Minimap rendering & drag interaction
        │   ├── interaction.js   # Mouse/keyboard event handling, node selection
        │   ├── panels.js        # Analytics panel content & node detail popover
        │   └── search.js        # Search input handling & cluster toggling
        └── analytics/
            └── tabs.js          # All 8 analytics tab builders
```

## Getting Started

```bash
# Install dependencies
npm install

# Build minified bundles
npm run build

# Open in browser
open index.html
```

## Development

Source files live in `src/`. All JavaScript uses ES modules with `src/js/app.js` as the entry point. Shared mutable state is centralized in `src/js/core/state.js`.

To rebuild after changes:

```bash
npm run build
```

For development without minification, swap `index.html` to load source files directly:

```html
<!-- Development -->
<link rel="stylesheet" href="src/css/bundle.css">
<script type="module" src="src/js/app.js"></script>

<!-- Production (default) -->
<link rel="stylesheet" href="dist/mindgraph.min.css">
<script src="dist/mindgraph.min.js"></script>
```

## Tech Stack

- Vanilla JavaScript (ES modules)
- Canvas 2D API
- CSS custom properties for theming
- esbuild for bundling & minification
