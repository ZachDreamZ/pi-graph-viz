# pi-graph-viz

Interactive dependency graph visualizer for the Pi coding agent.

## Problem

Developers navigating large codebases often struggle to understand dependency relationships between files, functions, and modules. While `pi-impact-analyzer` provides a text-based impact analysis (lists affected symbols), raw text is insufficient for quickly grasping:

- The overall architecture and layering of a project.
- Circular dependencies that may cause subtle bugs or merge conflicts.
- The "blast radius" of changes in a visual, intuitive way.

## Solution

`pi-graph-viz` renders any dependency or call graph as a self-contained, interactive HTML visualization with:

- **Hierarchical layout**: Nodes are arranged top-down (or left-right) by dependency depth, making architecture natural to read.
- **Cycle highlighting**: Circular dependencies are marked in red with a dedicated cycle panel.
- **Search and filter**: Find nodes by name or type.
- **Node details panel**: Click any node to see its type, file, line, in-degree, and out-degree.
- **Zero external dependencies**: The HTML is fully self-contained with inline CSS and SVG. No CDN or network access required.
- **Nexus integration**: Reads `pi-impact-analyzer` JSON output directly.

## Architecture

### Components

1. **GraphAnalyzer** (`extensions/analyzer.ts`)
   - Tarjan-inspired DFS cycle detection.
   - Root/leaf/orphan node identification.
   - Depth computation (BFS from roots).
   - Cycle membership set builder.

2. **GraphGenerator** (`extensions/generator.ts`)
   - Accepts a `Graph` object and `RenderOptions`.
   - Renders a complete, self-contained HTML page with:
     - Dark-theme CSS (Linear-inspired design tokens).
     - SVG-based hierarchical layout (BFS level assignment).
     - Interactive JS for search, filter, cycle highlighting, and detail panel.
   - Writes to file via `writeToFile()`.

3. **Main Extension** (`extensions/index.ts`)
   - Registers the `graph_viz` tool (for LLM/agent use).
   - Registers the `/graph-viz` command (for TUI use).
   - Handles `type: "json"` (direct graph data) and `type: "impact"` (pi-impact-analyzer output).
   - Converts impact-analyzer output to a Graph structure.

### Data Flow

```
User Input (JSON or impact data)
       |
       v
  index.ts (parse/convert)
       |
       v
  GraphAnalyzer (analyze)
       |
       v
  GraphGenerator (generate HTML)
       |
       v
  Self-contained HTML file
```

### Graph Data Format

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

## Usage

### Via Tool (LLM/agent)

```
graph_viz type=json graph='{"nodes":[{"id":"a","label":"A"}],"edges":[]}'
graph_viz type=impact output=./report.html
```

### Via Command (TUI)

```
/graph-viz path/to/graph.json
```

## Integration with Nexus

`pi-graph-viz` naturally complements:

- **pi-impact-analyzer**: Renders its output as an interactive graph.
- **pi-smart-reader**: Quick file-level dependency visualization.
- **pi-audit-master**: Visualize audit results as a dependency graph.
