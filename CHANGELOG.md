# Changelog

## [0.4.1] - 2026-06-16
### Security & Reliability (Audit Fix Release)
- **Fixed critical signal listener removal**: Replaced dangerous `process.removeAllListeners()` with proper handler tracking and cleanup.
- **Added XSS protection**: Token value now escaped before HTML injection in live-server.
- **Added Node.js fallback**: Graceful handling for older Node.js versions without `closeAllConnections()`.
- **Removed redundant require()**: Moved fs/path imports to module level for better performance.
- **Added heartbeat cleanup**: Server now properly clears all heartbeat intervals on stop.
- **Added debug logging**: Silent catch blocks now log errors when `DEBUG=1` or `PI_DEBUG=1` environment variables are set.
- **Improved error handling**: Added null checks for error message concatenation.
- **Performance verified**: All metrics pass thresholds with no regression.
- **Audit report**: Full audit available in `AUDIT-REPORT.md`.

## [0.4.0] - 2026-06-16
### Critical Bug Fixes
- Fixed `svgXY()` null crash: `getScreenCTM()` can return null before SVG is in DOM.
- Fixed `rectHit()` NaN: source === target now returns valid fallback coordinates.
- Fixed `findCycles()` stack overflow: recursive DFS replaced with iterative DFS.
- Fixed non-deterministic force layout: added seeded PRNG (mulberry32) for consistent renders.
- Improved `isDuplicateCycle()` from O(n²) to O(n) using canonical rotation.
- Fixed process handler stacking: `SIGINT`/`SIGTERM` now use `once()` + `removeAllListeners`.

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
