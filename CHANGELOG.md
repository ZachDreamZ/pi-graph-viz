# Changelog

## [0.3.0] - 2026-06-16
### Bug Fixes & Reliability
- Fixed libuv assertion crash on Windows: `stop()` now calls `closeAllConnections()` before `close()`.
- Added singleton server pattern: starting a new server kills any existing one first.
- Added process cleanup handlers (`session_shutdown`, `SIGINT`, `SIGTERM`) to prevent orphaned servers.
- Removed redundant file reads in `/graph-viz` command handler.

## [0.2.0] - 2026-06-15
### Live Server & Design Enhancement
- LiveReportServer: serve graph on localhost with SSE-based auto-reload.
- `/graph-viz serve [path.json]` — start live server from command line.
- `/graph-viz stop` — stop the live server.
- `graph_viz` tool now supports `serve: true` parameter for instant localhost viewing.
- SSE auto-refresh: browser auto-reloads when graph is regenerated.
- Live status indicator in header showing "Live" (green) / "Offline" (red).
- Token-based authentication for SSE endpoint.
- Origin validation for SSE connections.
- Enhanced header stats visual design with Linear design tokens.

## [0.1.0] - 2026-06-15
### Initial Release
- GraphAnalyzer with cycle detection, depth computation, root/leaf/orphan identification.
- GraphGenerator producing self-contained HTML with SVG hierarchical layout.
- Interactive features: search, type filter, cycle highlighting, detail panel.
- Linear-inspired dark theme with design tokens.
- `graph_viz` tool for LLM/agent use.
- `/graph-viz` command for TUI use.
- Integration with `pi-impact-analyzer` (type: "impact").
- Full test suite: 11 analyzer tests.
