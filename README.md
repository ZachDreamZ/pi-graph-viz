# pi-graph-viz

Interactive dependency graph visualizer for the Pi coding agent. Renders any dependency or call graph (from pi-impact-analyzer or direct JSON input) as a self-contained HTML visualization with cycle highlighting, search, and hierarchical layout.

## Installation

```
pi install npm:pi-graph-viz
```

## Features

- **Self-contained HTML**: No CDN, no external dependencies. The visualization is a single HTML file with inline CSS and SVG.
- **Hierarchical layout**: Nodes arranged by dependency depth (top-down or left-right).
- **Cycle detection**: Circular dependencies highlighted in red with a dedicated cycle panel.
- **Search**: Find nodes by id or label. Non-matching nodes are dimmed.
- **Type filter**: Filter nodes by type (file, function, class, module).
- **Node details**: Click any node to see its type, file, line, in-degree, and out-degree.
- **Nexus integration**: Reads pi-impact-analyzer JSON output directly.
- **Live server**: Serve the visualization on localhost with SSE auto-reload — the browser updates automatically when the graph is regenerated.

## Usage

### Via Tool (LLM/agent)

Render a graph from direct JSON input:

```
graph_viz type=json graph='{"nodes":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"edges":[{"source":"a","target":"b"}]}'
```

Render pi-impact-analyzer output:

```
graph_viz type=impact output=./report.html
```

Options:

- `output`: Output path for the HTML file (default: `graph-viz-report.html`).
- `title`: Optional title for the visualization.
- `direction`: Layout direction, `"TB"` (top-bottom) or `"LR"` (left-right, default: `"TB"`).
- `highlightCycles`: Highlight cycles in red (default: `true`).

### Via Command (TUI)

Generate and save:

```
/graph-viz path/to/graph.json
```

Start a live localhost server:

```
/graph-viz serve [path-to-graph.json]
```

Stop the server:

```
/graph-viz stop
```

### Via Tool with Live Server

```
graph_viz type=json graph='...' serve=true
```

The live server supports SSE-based auto-reload: the browser page automatically refreshes when the graph is regenerated.

The JSON file should contain:

```json
{
  "nodes": [
    { "id": "auth", "label": "AuthModule", "type": "module", "file": "src/auth.ts" },
    { "id": "login", "label": "login", "type": "function", "file": "src/auth.ts", "line": 42 }
  ],
  "edges": [
    { "source": "login", "target": "validateToken" },
    { "source": "validateToken", "target": "db" }
  ]
}
```

## Integration with Nexus

pi-graph-viz is part of the Nexus monorepo and pairs naturally with:

- **pi-impact-analyzer**: Renders its impact analysis output as an interactive graph.
- **pi-smart-reader**: Quick file-level dependency visualization.
- **pi-audit-master**: Visualize audit findings as a dependency graph.

## Graph Data Types

| Field | Type | Description |
|---|---|---|
| `nodes` | Array | Array of `{id, label, type?, file?, line?}` |
| `edges` | Array | Array of `{source, target, type?, weight?}` |
| `title` | string | Optional title for the visualization |
| `metadata` | object | Optional metadata key-value pairs |

### Node types

- `file` - Source file
- `function` - Function or method
- `class` - Class definition
- `module` - Module or namespace

### Edge types

- `imports` - Import relationship
- `calls` - Function call
- `extends` - Class inheritance
- `uses` - Generic usage

## Development

```
git clone https://github.com/ZachDreamZ/pi-graph-viz.git
cd pi-graph-viz
npm install
npm run build
npm test
```

## Audit Report

This package has been audited by the **pi-audit-master** extension for code quality, security, and reliability. The full audit report is available in [`AUDIT-REPORT.md`](AUDIT-REPORT.md).

### Audit Summary

| Category | Issues Found | Issues Fixed |
|----------|--------------|--------------|
| 🔴 Critical | 2 | 2 ✅ |
| 🟠 High | 5 | 5 ✅ |
| 🟡 Medium | 4 | 4 ✅ |
| 🟢 Low | 3 | 3 ✅ |
| **Total** | **14** | **14** ✅ |

### Key Improvements

- **Security**: Fixed signal listener removal, added XSS protection for token injection
- **Reliability**: Added Node.js fallback, heartbeat cleanup, error logging
- **Performance**: Removed redundant require() calls, optimized imports
- **Maintainability**: Added debug logging, improved error handling

### Performance Metrics

| Metric | Result |
|--------|--------|
| Graph Analyzer | 0.05ms/analysis |
| Large Graph (1000 nodes) | 0.78ms |
| HTML Generator | 0.08ms/generation |
| Live Server | 0.11ms/update |

For detailed findings and recommendations, see the [full audit report](AUDIT-REPORT.md).

## License

MIT
