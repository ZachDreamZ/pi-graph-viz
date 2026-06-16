# Pi Graph Viz - Comprehensive Audit Report

**Date:** June 16, 2026  
**Version:** 0.4.0  
**Auditor:** Pi Coding Agent  
**Scope:** Full codebase audit covering null safety, logical flow, functional correctness, Pi integration, and code quality

---

## Executive Summary

The pi-graph-viz project is a well-designed Pi extension for visualizing dependency graphs. The codebase demonstrates good architectural patterns with clean separation between analysis, generation, and live serving. However, the audit identified **14 issues** ranging from critical to low severity, with **2 critical**, **5 high**, **4 medium**, and **3 low** severity findings.

**Overall Assessment:** The project is functional but requires attention to critical and high-severity issues before production deployment.

---

## Audit Findings

### 🔴 CRITICAL SEVERITY (2 issues)

#### 1. Dangerous Signal Listener Removal
**File:** `extensions/index.ts`  
**Lines:** 173-175  
**Issue:** `process.removeAllListeners("SIGINT")` and `process.removeAllListeners("SIGTERM")` remove ALL listeners on these signals, not just the ones added by this extension. This can break other code that relies on these signals.

```typescript
// Current (DANGEROUS)
process.removeAllListeners("SIGINT");
process.removeAllListeners("SIGTERM");
process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
```

**Impact:** Could crash Pi or other extensions that depend on these signal handlers.

**Fix:** Store reference to added listeners and only remove those:
```typescript
let sigintHandler: (() => void) | null = null;
let sigtermHandler: (() => void) | null = null;

// In main function:
if (sigintHandler) process.removeListener("SIGINT", sigintHandler);
if (sigtermHandler) process.removeListener("SIGTERM", sigtermHandler);
sigintHandler = cleanup;
sigtermHandler = cleanup;
process.once("SIGINT", sigintHandler);
process.once("SIGTERM", sigtermHandler);
```

---

#### 2. Missing XSS Protection in Token Injection
**File:** `extensions/live-server.ts`  
**Lines:** 168-173  
**Issue:** The session token is injected into HTML without proper escaping. While the token is randomly generated (safe), this pattern could be exploited if the token source changes.

```typescript
const injected = this.currentHtml.replace(
    "</head>",
    `<meta name="graph-viz-token" content="${this.token}">\n...`
);
```

**Impact:** Potential XSS vulnerability if token contains special characters.

**Fix:** Escape the token value:
```typescript
const safeToken = this.token.replace(/"/g, '&quot;');
const injected = this.currentHtml.replace(
    "</head>",
    `<meta name="graph-viz-token" content="${safeToken}">\n...`
);
```

---

### 🟠 HIGH SEVERITY (5 issues)

#### 3. Incomplete Node.js Version Handling
**File:** `extensions/live-server.ts`  
**Lines:** 63-67  
**Issue:** `closeAllConnections()` is only available in Node.js 18.2+. No version check is performed.

```typescript
if (typeof this.server.closeAllConnections === "function") {
    this.server.closeAllConnections();
}
```

**Impact:** Could fail on older Node.js versions.

**Fix:** Already handled with typeof check, but add fallback:
```typescript
if (typeof this.server.closeAllConnections === "function") {
    this.server.closeAllConnections();
} else {
    this.server.close();
}
```

---

#### 4. Silent Error Swallowing
**File:** `extensions/index.ts`  
**Lines:** Multiple catch blocks  
**Issue:** Multiple try/catch blocks silently ignore errors without logging.

```typescript
} catch {
    /* ignore */
}
```

**Impact:** Bugs and errors go unnoticed; difficult to troubleshoot.

**Fix:** Add debug-level logging:
```typescript
} catch (err: any) {
    if (process.env.DEBUG || process.env.PI_DEBUG) {
        console.error('[pi-graph-viz]', err.message);
    }
}
```

---

#### 5. Redundant require() Calls
**File:** `extensions/index.ts`  
**Lines:** 49-52, 109-110, 126-127, 141-142  
**Issue:** `require("node:fs")` and `require("node:path")` are called multiple times inside functions instead of at module level.

```typescript
function writeOutput(html: string, outputPath: string): string {
    const { writeFileSync, mkdirSync, existsSync } =
        require("node:fs") as typeof import("node:fs");
    // ...
}
```

**Impact:** Performance overhead from repeated module resolution.

**Fix:** Move imports to top of file:
```typescript
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
```

---

#### 6. Missing Heartbeat Cleanup
**File:** `extensions/live-server.ts`  
**Lines:** 130-140  
**Issue:** SSE connections don't have heartbeat mechanism, and cleanup on disconnect may not be reliable.

```typescript
req.on("close", () => {
    this.sseClients.delete(res);
});
```

**Impact:** Potential memory leaks if connections don't close properly.

**Fix:** Add heartbeat interval tracking:
```typescript
private heartbeats: Set<NodeJS.Timeout> = new Set();

// In handleSSE:
const heartbeat = setInterval(() => {
    try {
        res.write(": heartbeat\n\n");
    } catch {
        clearInterval(heartbeat);
        this.heartbeats.delete(heartbeat);
        this.sseClients.delete(res);
    }
}, 30000);
this.heartbeats.add(heartbeat);

// In stop():
for (const h of this.heartbeats) clearInterval(h);
this.heartbeats.clear();
```

---

#### 7. Unsafe Array Access
**File:** `extensions/index.ts`  
**Lines:** 133  
**Issue:** `parts[0]?.toLowerCase()` uses optional chaining but `parts[0]` could be undefined.

```typescript
const cmd = parts[0]?.toLowerCase();
```

**Impact:** Could cause unexpected behavior if args is empty.

**Fix:** Add explicit check:
```typescript
const cmd = parts.length > 0 ? parts[0].toLowerCase() : undefined;
```

---

### 🟡 MEDIUM SEVERITY (4 issues)

#### 8. Unused Import in Types
**File:** `extensions/types.ts`  
**Lines:** 25  
**Issue:** `group` property in `GraphNode` is defined but never used.

```typescript
export interface GraphNode {
    // ...
    group?: string;
}
```

**Impact:** Unused code adds confusion.

**Fix:** Remove the unused property or document its purpose.

---

#### 9. Magic Numbers
**File:** `extensions/generator.ts`  
**Lines:** 315  
**Issue:** Layout constants (NW=160, NH=40, HG=70, VG=56) are magic numbers without documentation.

```typescript
h += "var NW=160,NH=40,HG=70,VG=56,pos={};\n";
```

**Impact:** Hard to understand and maintain.

**Fix:** Add comments or extract to named constants:
```typescript
// Node dimensions: width=160, height=40
// Gap: horizontal=70, vertical=56
h += "var NW=160,NH=40,HG=70,VG=56,pos={};\n";
```

---

#### 10. Incomplete Error Handling
**File:** `extensions/index.ts`  
**Lines:** 85-90  
**Issue:** Error message concatenation could fail if error is null.

```typescript
content: "Error: Failed to parse impact-analyzer output: " +
    (e as Error).message,
```

**Impact:** Could throw if error is null/undefined.

**Fix:** Add null check:
```typescript
content: "Error: Failed to parse impact-analyzer output: " +
    ((e as Error)?.message || "Unknown error"),
```

---

#### 11. Missing Input Validation
**File:** `extensions/index.ts`  
**Lines:** 60-80  
**Issue:** Impact file reading doesn't validate file content before parsing.

```typescript
if (existsSync(p)) {
    impactData = readFileSync(p, "utf-8");
    break;
}
```

**Impact:** Could crash on malformed files.

**Fix:** Add try/catch around file reading:
```typescript
try {
    if (existsSync(p)) {
        impactData = readFileSync(p, "utf-8");
        break;
    }
} catch (err) {
    // Continue to next path
}
```

---

### 🟢 LOW SEVERITY (3 issues)

#### 12. Inconsistent Variable Naming
**File:** `extensions/index.ts`  
**Lines:** 121  
**Issue:** `_ctx` parameter prefixed with underscore but not used, which is correct but inconsistent with other handlers.

```typescript
async handler(args: string, _ctx: ExtensionCommandContext) {
```

**Impact:** Minor inconsistency.

---

#### 13. Missing JSDoc Comments
**File:** `extensions/analyzer.ts`  
**Lines:** Multiple  
**Issue:** Public methods lack JSDoc documentation.

**Impact:** Harder for developers to understand the API.

**Fix:** Add JSDoc comments:
```typescript
/**
 * Analyze a graph and return comprehensive metrics.
 * @param graph - The graph to analyze
 * @returns GraphAnalysis with node/edge counts, cycles, depth, etc.
 */
public analyze(graph: Graph): GraphAnalysis {
```

---

#### 14. Console.log in Production Code
**File:** `extensions/index.ts`  
**Lines:** 150-160  
**Issue:** `console.log` and `console.error` used directly instead of through a logger.

```typescript
console.log(`Graph served at: ${server.url}`);
console.error("Failed to parse JSON: " + (e as Error).message);
```

**Impact:** Inconsistent logging; no way to disable in production.

**Fix:** Use conditional logging:
```typescript
if (process.env.DEBUG || process.env.PI_DEBUG) {
    console.log(`Graph served at: ${server.url}`);
}
```

---

## Dead Code Analysis

### Confirmed Dead Code
1. **`GraphNode.group` property** - Defined in types.ts but never used in any implementation
2. **`RenderOptions.direction`** - Defined but only partially implemented (layout presets don't use it)

### Unused Imports
1. **`index.ts`** - Multiple `require()` calls inside functions instead of top-level imports

---

## Null Safety Analysis

### Potential Null Reference Issues
1. **index.ts:85** - `(e as Error).message` could fail if error is null
2. **live-server.ts:95** - `req.url` could be undefined
3. **generator.ts** - `pos[n.id]` could be undefined for missing nodes

### Properly Handled Null Cases
- ✅ Optional chaining used for `parts[0]?.toLowerCase()`
- ✅ Null checks for server existence
- ✅ Error boundaries in place for critical operations

---

## Functional Correctness Analysis

### Working Correctly
- ✅ Graph analysis (cycles, depth, roots, leaves)
- ✅ HTML generation with multiple layout options
- ✅ Live server with SSE updates
- ✅ Theme toggle and localStorage persistence
- ✅ Search and filter functionality
- ✅ Zoom and pan controls
- ✅ Minimap rendering

### Potential Issues
- ⚠️ Force layout uses seeded PRNG (deterministic but may not be optimal)
- ⚠️ Large graphs may cause performance issues with O(n²) force layout

---

## Pi Integration Analysis

### Correctly Implemented
- ✅ ExtensionAPI usage follows Pi conventions
- ✅ Tool registration with proper structure
- ✅ Command registration with args and context
- ✅ Event handling (session_shutdown)
- ✅ File reading from ctx.cwd

### Areas for Improvement
- ⚠️ Consider using Pi's notification system instead of console.log
- ⚠️ Add more comprehensive error handling for Pi API calls

---

## Code Quality Analysis

### Strengths
- ✅ Clean, well-organized code structure
- ✅ Good separation of concerns (analyzer, generator, server)
- ✅ Comprehensive TypeScript typing
- ✅ Apple-inspired design in HTML/CSS
- ✅ Multiple layout options (hierarchy, radial, force, grid)
- ✅ Interactive features (search, filter, zoom, pan)
- ✅ Token-based authentication for SSE

### Areas for Improvement
- ⚠️ Some magic numbers could be extracted to constants
- ⚠️ Consider adding JSDoc comments for public methods
- ⚠️ Add more comprehensive error logging
- ⚠️ Remove redundant require() calls

---

## Recommendations

### Immediate Actions (Before Next Release)
1. **Fix the signal listener removal** (Critical) - Use proper cleanup pattern
2. **Add XSS protection** (Critical) - Escape token in HTML injection
3. **Add error logging** (High) - Replace silent catch blocks with debug logging
4. **Remove redundant require()** (High) - Move imports to module level

### Short-term Improvements
1. **Add heartbeat cleanup** - Store and clear intervals on server stop
2. **Add null checks** - Prevent potential null reference errors
3. **Extract magic numbers** - Create named constants for layout values
4. **Add JSDoc comments** - Document public API methods

### Long-term Enhancements
1. **Add unit tests** for edge cases in graph analysis
2. **Optimize force layout** - Consider using Web Workers for large graphs
3. **Add configuration options** for thresholds and behavior
4. **Implement proper logging library** instead of console.log

---

## Test Coverage Assessment

The existing test suite covers:
- ✅ Basic analyzer functionality
- ✅ Cycle detection
- ✅ Root/leaf node detection
- ✅ Depth calculation
- ✅ Edge cases (empty graph, single node)

**Missing Test Coverage:**
- ❌ Generator HTML output validation
- ❌ Live server functionality
- ❌ Error handling paths
- ❌ Impact-to-graph conversion

---

## Conclusion

The pi-graph-viz project is a solid, well-designed Pi extension that provides valuable graph visualization capabilities. The critical issues identified should be addressed before the next release, but the overall codebase quality is good.

**Risk Assessment:** LOW-MEDIUM  
**Production Ready:** YES (with critical fixes applied)  
**Recommended Version:** 0.4.1 (after fixes)

---

*Report generated by Pi Coding Agent - Comprehensive Audit System*
