// pi-graph-viz: Interactive dependency graph visualizer for Pi
// Integrates with pi-impact-analyzer for AST-based call graphs.

import type { ExtensionAPI, ExtensionCommandContext } from "pi-coding-agent";
import type { Graph, RenderOptions } from "./types";
import { GraphGenerator } from "./generator";
import { GraphAnalyzer } from "./analyzer";
import { LiveReportServer } from "./live-server";

export { type Graph, GraphGenerator, GraphAnalyzer, LiveReportServer };

/**
 * Convert pi-impact-analyzer JSON output to a Graph structure.
 */
function convertImpactToGraph(data: any): Graph {
	const nodes: {
		id: string;
		label: string;
		type?: string;
		file?: string;
		line?: number;
	}[] = [];
	const edges: { source: string; target: string; type?: string }[] = [];
	const nodeSet = new Set<string>();

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

	const targetNames = new Set<string>();
	if (data.affected && Array.isArray(data.affected)) {
		for (const affected of data.affected) {
			const targetId = affected.name || affected.id || affected.symbol;
			if (targetId && !nodeSet.has(targetId)) {
				nodeSet.add(targetId);
				targetNames.add(targetId);
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

	if (data.affected && Array.isArray(data.affected)) {
		for (const affected of data.affected) {
			const targetId = affected.name || affected.id || affected.symbol;
			if (targetId) {
				const sourceId =
					typeof data.symbol === "string"
						? data.symbol
						: data.symbol?.name || "";
				if (sourceId && targetId) {
					edges.push({ source: sourceId, target: targetId, type: "calls" });
				}
			}
		}
	}

	if (nodes.length === 0 && data.nodes) {
		return data as Graph;
	}

	return {
		nodes: nodes as Graph["nodes"],
		edges: edges as Graph["edges"],
		title: data.title || data.name || "Impact Analysis Graph",
	};
}

export default function piGraphViz(pi: ExtensionAPI): void {
	let server: LiveReportServer | null = null;
	let lastGraph: Graph | null = null;
	let lastOptions: RenderOptions = {};

	// Helper: generate HTML and optionally update the live server
	function generateAndServe(graph: Graph, options: RenderOptions = {}): string {
		lastGraph = graph;
		lastOptions = options;
		const generator = new GraphGenerator();
		const html = generator.generateHTML(graph, options);
		if (server && server.isRunning()) {
			server.updateHtml(html);
		}
		return html;
	}

	function writeOutput(html: string, outputPath: string): string {
		const { writeFileSync, mkdirSync, existsSync } =
			require("node:fs") as typeof import("node:fs");
		const { dirname } = require("node:path") as typeof import("node:path");
		const dir = dirname(outputPath);
		if (dir && !existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(outputPath, html, "utf-8");
		return outputPath;
	}

	pi.registerTool({
		name: "graph_viz",
		label: "Graph Viz",
		description:
			"Render a dependency or call graph as self-contained HTML visualization. " +
			"Accepts JSON graph data or reads from pi-impact-analyzer output. " +
			"Supports cycle highlighting, search, filtering, and live server mode.",
		parameters: {
			type: "object",
			properties: {
				type: {
					type: "string",
					description:
						"Input type: 'json' for direct data, 'impact' for impact-analyzer output",
					enum: ["json", "impact"],
				},
				graph: {
					type: "string",
					description:
						"JSON string: {nodes: [{id,label,type?,file?,line?}], edges: [{source,target,type?}]}",
				},
				output: {
					type: "string",
					description:
						"Output path for the HTML file (default: graph-viz-report.html)",
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
				serve: {
					type: "boolean",
					description:
						"Start a localhost server for live viewing (default: false)",
				},
				port: {
					type: "number",
					description: "Port for the live server (default: auto)",
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

				// Parse input
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
					const { readFileSync, existsSync, readdirSync } =
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
						try {
							const files = readdirSync(ctx.cwd);
							const impactFile = files.find(
								(f: string) => f.startsWith("impact") && f.endsWith(".json"),
							);
							if (impactFile)
								impactData = readFileSync(join(ctx.cwd, impactFile), "utf-8");
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

				const html = generateAndServe(graph, options);
				const savedPath = writeOutput(html, outputPath);

				const analyzer = new GraphAnalyzer();
				const analysis = analyzer.analyze(graph);

				// Handle serve mode
				let serverInfo = "";
				if (params.serve) {
					if (!server || !server.isRunning()) {
						server = new LiveReportServer();
						await server.start();
						server.updateHtml(html);
					} else {
						server.updateHtml(html);
					}
					serverInfo = `\n  Live server: ${server.url}\n  Open in browser: ${server.url}`;
				}

				return {
					type: "text" as const,
					content: [
						`Graph saved to: ${savedPath}`,
						serverInfo,
						"",
						"Summary:",
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
						"",
						"Commands:",
						"  /graph-viz stop    Stop the live server",
					]
						.filter(Boolean)
						.join("\n"),
				};
			} catch (e) {
				return {
					type: "text" as const,
					content: "Error generating graph: " + (e as Error).message,
					isError: true,
				};
			}
		},
	});

	// Register commands
	(pi as ExtensionAPI & { registerCommand: Function }).registerCommand?.(
		"graph-viz",
		{
			description:
				"Generate interactive dependency graph from JSON file, serve on localhost, or stop the server",
			async handler(args: string, _ctx: ExtensionCommandContext) {
				const parts = args.trim().split(/\s+/).filter(Boolean);
				const cmd = parts[0]?.toLowerCase();

				if (cmd === "serve") {
					const filePath = parts[1] || "";
					if (filePath && filePath.endsWith(".json")) {
						const { readFileSync, existsSync } =
							require("node:fs") as typeof import("node:fs");
						if (existsSync(filePath)) {
							try {
								const data = JSON.parse(readFileSync(filePath, "utf-8"));
								const graph = data.nodes
									? (data as Graph)
									: convertImpactToGraph(data);
								const html = generateAndServe(graph);
								if (!server || !server.isRunning()) {
									server = new LiveReportServer();
									await server.start();
									server.updateHtml(html);
								}
								console.log(`Graph served at: ${server.url}`);
								console.log("Open the URL in your browser.");
								console.log("Use /graph-viz stop to stop the server.");
							} catch (e) {
								console.error("Failed to parse JSON: " + (e as Error).message);
							}
						} else {
							console.error("File not found: " + filePath);
						}
					} else if (filePath) {
						console.error("File must be a .json file.");
					} else {
						// Serve last generated graph
						if (lastGraph) {
							const html = generateAndServe(lastGraph, lastOptions);
							if (!server || !server.isRunning()) {
								server = new LiveReportServer();
								await server.start();
								server.updateHtml(html);
							}
							console.log(`Graph served at: ${server.url}`);
						} else {
							console.error(
								"No graph generated yet. Run graph_viz tool first or provide a JSON file path.",
							);
						}
					}
				} else if (cmd === "stop") {
					if (server && server.isRunning()) {
						server.stop();
						server = null;
						console.log("Graph-viz server stopped.");
					} else {
						console.log("No server running.");
					}
				} else if (parts[0]) {
					// Plain file path - just generate and save
					const { readFileSync, existsSync } =
						require("node:fs") as typeof import("node:fs");
					if (existsSync(args)) {
						try {
							const data = JSON.parse(readFileSync(args, "utf-8"));
							const graph = data.nodes
								? (data as Graph)
								: convertImpactToGraph(data);
							const html = generateAndServe(graph);
							const outputPath = "graph-viz-report.html";
							const { writeFileSync } =
								require("node:fs") as typeof import("node:fs");
							writeFileSync(outputPath, html, "utf-8");
							console.log("Graph visualization saved to: " + outputPath);
						} catch (e) {
							console.error("Failed to parse JSON: " + (e as Error).message);
						}
					} else {
						console.error("File not found: " + args);
					}
				} else {
					console.log("Usage:");
					console.log(
						"  /graph-viz <path-to-graph.json>     Generate HTML from JSON",
					);
					console.log(
						"  /graph-viz serve [path.json]       Start live server (optionally from file)",
					);
					console.log(
						"  /graph-viz stop                    Stop the live server",
					);
					console.log("");
					console.log(
						"The JSON should contain: { nodes: [{id, label}], edges: [{source, target}] }",
					);
				}
			},
		},
	);
}
