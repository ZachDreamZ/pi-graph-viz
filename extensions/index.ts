// pi-graph-viz: Interactive dependency graph visualizer for Pi
// Integrates with pi-impact-analyzer for AST-based call graphs.

import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
import type { Graph, GraphNode, GraphEdge, RenderOptions } from "./types";
import { GraphGenerator } from "./generator";
import { GraphAnalyzer } from "./analyzer";

export {
	type Graph,
	type GraphNode,
	type GraphEdge,
	type RenderOptions,
	GraphGenerator,
	GraphAnalyzer,
};

/**
 * Convert pi-impact-analyzer JSON output to a Graph structure.
 */
function convertImpactToGraph(data: any): Graph {
	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const nodeSet = new Set<string>();

	// Extract nodes from symbol-based report
	if (data.symbols && Array.isArray(data.symbols)) {
		for (const sym of data.symbols) {
			const id = sym.name || sym.id;
			if (id && !nodeSet.has(id)) {
				nodeSet.add(id);
				nodes.push({
					id,
					label: sym.name || sym.id,
					type: sym.kind || "function",
					file: sym.file,
					line: sym.line,
				});
			}
		}
	}

	// Extract edges from dependencies/impact chains
	if (data.affected && Array.isArray(data.affected)) {
		for (const affected of data.affected) {
			const targetId = affected.name || affected.id || affected.symbol;
			if (targetId && !nodeSet.has(targetId)) {
				nodeSet.add(targetId);
				nodes.push({
					id: targetId,
					label: affected.name || affected.id || affected.symbol,
					type: affected.kind || "function",
					file: affected.file,
					line: affected.line,
				});
			}
		}
	}

	// Build edges from impact chains
	if (data.affected && Array.isArray(data.affected)) {
		for (const affected of data.affected) {
			const targetId = affected.name || affected.id || affected.symbol;
			if (data.symbol && targetId) {
				edges.push({
					source:
						typeof data.symbol === "string" ? data.symbol : data.symbol.name,
					target: targetId,
					type: "calls",
				});
			}
		}
	}

	// If no structured data, try flat format
	if (nodes.length === 0 && data.nodes) {
		return data as Graph;
	}

	return {
		nodes,
		edges,
		title: data.title || data.name || "Impact Analysis Graph",
	};
}

export default function piGraphViz(pi: ExtensionAPI): void {
	// Register the main tool
	pi.registerTool({
		name: "graph_viz",
		label: "Graph Viz",
		description:
			"Render a dependency or call graph as a self-contained HTML visualization. " +
			"Accepts a JSON graph with nodes and edges, optionally reads from pi-impact-analyzer output, " +
			"and produces an interactive HTML file with hierarchical layout, cycle highlighting, search, and filtering.",
		parameters: {
			type: "object",
			properties: {
				type: {
					type: "string",
					description:
						"Type of input: 'json' for direct graph data, 'impact' to read impact-analyzer output",
					enum: ["json", "impact"],
				},
				graph: {
					type: "string",
					description:
						"JSON string with {nodes: [{id, label, type?, file?, line?}], edges: [{source, target, type?}]}",
				},
				output: {
					type: "string",
					description:
						"Output path for the HTML file (defaults to ./graph-viz-report.html)",
				},
				title: {
					type: "string",
					description: "Optional title for the visualization",
				},
				direction: {
					type: "string",
					description:
						"Layout direction: 'TB' (top-bottom) or 'LR' (left-right)",
					enum: ["TB", "LR"],
				},
				highlightCycles: {
					type: "boolean",
					description: "Highlight circular dependencies in red (default: true)",
				},
			},
			required: ["type"],
		},
		async execute(
			params: any,
			_signal: AbortSignal | undefined,
			_onUpdate: ((u: any) => void) | undefined,
			ctx: any,
		) {
			try {
				let graph: Graph;
				const outputPath = params.output || "graph-viz-report.html";
				const options: RenderOptions = {};

				if (params.title) options.title = params.title;
				if (params.direction)
					options.direction = params.direction as "TB" | "LR";
				if (params.highlightCycles !== undefined)
					options.highlightCycles = params.highlightCycles;

				if (params.type === "json") {
					if (!params.graph) {
						return {
							type: "text" as const,
							content:
								"Error: 'graph' parameter is required when type is 'json'.",
							isError: true,
						};
					}
					let parsed: any;
					try {
						parsed =
							typeof params.graph === "string"
								? JSON.parse(params.graph)
								: params.graph;
					} catch {
						return {
							type: "text" as const,
							content: "Error: Invalid JSON in 'graph' parameter.",
							isError: true,
						};
					}
					if (
						!parsed.nodes ||
						!Array.isArray(parsed.nodes) ||
						!parsed.edges ||
						!Array.isArray(parsed.edges)
					) {
						return {
							type: "text" as const,
							content:
								"Error: Graph must contain 'nodes' (array) and 'edges' (array).",
							isError: true,
						};
					}
					graph = parsed as Graph;
				} else if (params.type === "impact") {
					// Try to read from pi-impact-analyzer output
					const { readFileSync, existsSync } =
						require("node:fs") as typeof import("node:fs");
					const { join } = require("node:path") as typeof import("node:path");

					const defaultPaths = [
						"impact-report.json",
						join(ctx.cwd, "impact-report.json"),
						join(ctx.cwd, ".impact", "report.json"),
					];
					let impactData: string | null = null;
					for (const p of defaultPaths) {
						if (existsSync(p)) {
							impactData = readFileSync(p, "utf-8");
							break;
						}
					}
					if (!impactData) {
						// Try to find any impact-analyzer output
						const { readdirSync } =
							require("node:fs") as typeof import("node:fs");
						try {
							const files = readdirSync(ctx.cwd);
							const impactFile = files.find(
								(f: string) => f.startsWith("impact") && f.endsWith(".json"),
							);
							if (impactFile) {
								impactData = readFileSync(join(ctx.cwd, impactFile), "utf-8");
							}
						} catch {
							/* ignore */
						}
					}
					if (!impactData) {
						return {
							type: "text" as const,
							content:
								"Error: No pi-impact-analyzer output found. Run impact_analyze first with format='json'.",
							isError: true,
						};
					}
					try {
						graph = convertImpactToGraph(JSON.parse(impactData));
					} catch (e) {
						return {
							type: "text" as const,
							content:
								"Error: Failed to parse impact-analyzer output: " +
								(e as Error).message,
							isError: true,
						};
					}
				} else {
					return {
						type: "text" as const,
						content: "Error: Invalid type. Use 'json' or 'impact'.",
						isError: true,
					};
				}

				const generator = new GraphGenerator();
				const output = generator.generateHTML(graph, options);
				const { writeFileSync, mkdirSync, existsSync } =
					require("node:fs") as typeof import("node:fs");
				const { dirname } = require("node:path") as typeof import("node:path");

				if (!existsSync(dirname(outputPath))) {
					mkdirSync(dirname(outputPath), { recursive: true });
				}
				writeFileSync(outputPath, output, "utf-8");

				const analyzer = new GraphAnalyzer();
				const analysis = analyzer.analyze(graph);

				return {
					type: "text" as const,
					content: [
						`Graph visualization saved to: ${outputPath}`,
						``,
						`Summary:`,
						`  Nodes: ${analysis.nodeCount}`,
						`  Edges: ${analysis.edgeCount}`,
						`  Max depth: ${analysis.maxDepth}`,
						`  Cycles: ${analysis.cycleCount}`,
						...analysis.cycles.map(
							(c, i) => `  Cycle ${i + 1}: ${c.join(" → ")} → ${c[0]}`,
						),
						`  Roots: ${analysis.rootNodes.length}`,
						`  Leaves: ${analysis.leafNodes.length}`,
						`  Orphans: ${analysis.orphanNodes.length}`,
						``,
						`Open ${outputPath} in your browser to view the interactive visualization.`,
					].join("\n"),
				};
			} catch (e) {
				return {
					type: "text" as const,
					content:
						"Error generating graph visualization: " + (e as Error).message,
					isError: true,
				};
			}
		},
	});

	// Register /graph-viz command for TUI access
	(pi as ExtensionAPI & { registerCommand: Function }).registerCommand?.(
		"graph-viz",
		{
			description:
				"Generate an interactive dependency graph visualization from JSON or impact-analyzer output",
			async handler(args: string, _ctx: ExtensionCommandContext) {
				const parts = args.split(" ").filter(Boolean);
				const filePath = parts[0] || "";
				if (filePath && filePath.endsWith(".json")) {
					const { readFileSync, existsSync } =
						require("node:fs") as typeof import("node:fs");
					if (existsSync(filePath)) {
						const content = readFileSync(filePath, "utf-8");
						try {
							const data = JSON.parse(content);
							const generator = new GraphGenerator();
							const graph = data.nodes
								? (data as Graph)
								: convertImpactToGraph(data);
							const html = generator.generateHTML(graph);
							const outputPath = "graph-viz-report.html";
							const { writeFileSync } =
								require("node:fs") as typeof import("node:fs");
							writeFileSync(outputPath, html, "utf-8");
							console.log("Graph visualization saved to: " + outputPath);
						} catch (e) {
							console.error("Failed to parse JSON: " + (e as Error).message);
						}
					} else {
						console.error("File not found: " + filePath);
					}
				} else {
					console.log("Usage: /graph-viz <path-to-graph.json>");
					console.log(
						"The JSON should contain: { nodes: [{id, label}], edges: [{source, target}] }",
					);
				}
			},
		},
	);
}
