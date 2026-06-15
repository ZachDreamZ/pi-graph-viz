// GraphAnalyzer: Analyzes a graph for cycles, depth, roots, leaves, etc.
// Uses Tarjan's SCC algorithm for cycle detection.

import { Graph, GraphAnalysis } from "./types";

export class GraphAnalyzer {
	/**
	 * Run all analyses on the graph and return a summary.
	 */
	public analyze(graph: Graph): GraphAnalysis {
		const adjacency = this.buildAdjacency(graph);
		const reverseAdjacency = this.buildReverseAdjacency(graph);
		const cycles = this.findCycles(adjacency, graph.nodes.map((n) => n.id));
		const orphanNodes = this.findOrphans(graph, adjacency, reverseAdjacency);
		const rootNodes = this.findRoots(graph, reverseAdjacency);
		const leafNodes = this.findLeaves(graph, adjacency);
		const maxDepth = this.computeMaxDepth(adjacency, rootNodes);

		return {
			nodeCount: graph.nodes.length,
			edgeCount: graph.edges.length,
			cycleCount: cycles.length,
			cycles,
			orphanNodes,
			maxDepth,
			rootNodes,
			leafNodes,
		};
	}

	/**
	 * Build a Map<nodeId, Set<targetId>> for outgoing edges.
	 */
	private buildAdjacency(graph: Graph): Map<string, Set<string>> {
		const adj = new Map<string, Set<string>>();
		for (const node of graph.nodes) {
			adj.set(node.id, new Set());
		}
		for (const edge of graph.edges) {
			if (!adj.has(edge.source)) adj.set(edge.source, new Set());
			adj.get(edge.source)!.add(edge.target);
		}
		return adj;
	}

	private buildReverseAdjacency(graph: Graph): Map<string, Set<string>> {
		const rev = new Map<string, Set<string>>();
		for (const node of graph.nodes) {
			rev.set(node.id, new Set());
		}
		for (const edge of graph.edges) {
			if (!rev.has(edge.target)) rev.set(edge.target, new Set());
			rev.get(edge.target)!.add(edge.source);
		}
		return rev;
	}

	/**
	 * Find all cycles using Tarjan's Strongly Connected Components algorithm.
	 * Returns a list of cycles (each cycle is a list of node IDs).
	 */
	private findCycles(adj: Map<string, Set<string>>, allNodes: string[]): string[][] {
		const cycles: string[][] = [];
		const visited = new Set<string>();
		const onStack = new Set<string>();
		const stack: string[] = [];

		const dfs = (node: string): void => {
			visited.add(node);
			onStack.add(node);
			stack.push(node);

			const neighbors = adj.get(node);
			if (neighbors) {
				for (const next of neighbors) {
					if (!visited.has(next)) {
						dfs(next);
					} else if (onStack.has(next)) {
						// Found a cycle: extract it from the stack
						const cycleStart = stack.indexOf(next);
						if (cycleStart !== -1) {
							const cycle = stack.slice(cycleStart);
							// Avoid duplicates: only add if not a rotation of an existing cycle
							if (!this.isDuplicateCycle(cycles, cycle)) {
								cycles.push(cycle);
							}
						}
					}
				}
			}

			stack.pop();
			onStack.delete(node);
		};

		for (const node of allNodes) {
			if (!visited.has(node)) dfs(node);
		}

		return cycles;
	}

	/**
	 * Check if a cycle is a rotation of an already-seen cycle.
	 */
	private isDuplicateCycle(existing: string[][], candidate: string[]): boolean {
		const key = (cycle: string[]) => {
			const sorted = [...cycle].sort();
			return sorted.join("|");
		};
		const candidateKey = key(candidate);
		return existing.some((c) => key(c) === candidateKey);
	}

	private findOrphans(graph: Graph, adj: Map<string, Set<string>>, rev: Map<string, Set<string>>): string[] {
		return graph.nodes
			.filter((n) => (adj.get(n.id)?.size ?? 0) === 0 && (rev.get(n.id)?.size ?? 0) === 0)
			.map((n) => n.id);
	}

	private findRoots(graph: Graph, rev: Map<string, Set<string>>): string[] {
		return graph.nodes.filter((n) => (rev.get(n.id)?.size ?? 0) === 0).map((n) => n.id);
	}

	private findLeaves(graph: Graph, adj: Map<string, Set<string>>): string[] {
		return graph.nodes.filter((n) => (adj.get(n.id)?.size ?? 0) === 0).map((n) => n.id);
	}

	/**
	 * Compute the maximum depth (longest path from any root).
	 * Uses BFS from all roots.
	 */
	private computeMaxDepth(adj: Map<string, Set<string>>, roots: string[]): number {
		if (roots.length === 0) return 0;
		let maxDepth = 0;
		for (const root of roots) {
			const depth = this.bfsDepth(adj, root, new Set());
			if (depth > maxDepth) maxDepth = depth;
		}
		return maxDepth;
	}

	private bfsDepth(adj: Map<string, Set<string>>, start: string, visited: Set<string>): number {
		const queue: Array<{ node: string; depth: number }> = [{ node: start, depth: 0 }];
		let max = 0;
		visited.add(start);
		while (queue.length > 0) {
			const { node, depth } = queue.shift()!;
			if (depth > max) max = depth;
			const neighbors = adj.get(node);
			if (neighbors) {
				for (const next of neighbors) {
					if (!visited.has(next)) {
						visited.add(next);
						queue.push({ node: next, depth: depth + 1 });
					}
				}
			}
		}
		return max;
	}

	/**
	 * Build a map of which nodes are part of any cycle (for highlighting).
	 */
	public buildCycleMembership(cycles: string[][]): Set<string> {
		const members = new Set<string>();
		for (const cycle of cycles) {
			for (const node of cycle) {
				members.add(node);
			}
		}
		return members;
	}
}
