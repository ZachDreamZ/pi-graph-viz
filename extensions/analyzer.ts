// GraphAnalyzer: Analyzes a graph for cycles, depth, roots, leaves, etc.
// Uses Tarjan's SCC algorithm for cycle detection.

import type { Graph, GraphAnalysis } from "./types";

export class GraphAnalyzer {
	/**
	 * Run all analyses on the graph and return a summary.
	 */
	public analyze(graph: Graph): GraphAnalysis {
		const adjacency = this.buildAdjacency(graph);
		const reverseAdjacency = this.buildReverseAdjacency(graph);
		const cycles = this.findCycles(
			adjacency,
			graph.nodes.map((n) => n.id),
		);
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
	private findCycles(
		adj: Map<string, Set<string>>,
		allNodes: string[],
	): string[][] {
		const cycles: string[][] = [];
		const visited = new Set<string>();

		for (const startNode of allNodes) {
			if (visited.has(startNode)) continue;

			// Iterative DFS with explicit stack (prevents stack overflow on large graphs)
			const stack: Array<{
				node: string;
				neighbors: string[];
				neighborIdx: number;
			}> = [];
			const onStack = new Set<string>();
			const path: string[] = [];
			const pathSet = new Set<string>();

			const neighbors = adj.get(startNode);
			stack.push({
				node: startNode,
				neighbors: neighbors ? Array.from(neighbors) : [],
				neighborIdx: 0,
			});
			onStack.add(startNode);
			path.push(startNode);
			pathSet.add(startNode);
			visited.add(startNode);

			while (stack.length > 0) {
				const frame = stack[stack.length - 1];

				if (frame.neighborIdx >= frame.neighbors.length) {
					// Done with this node's neighbors — backtrack
					stack.pop();
					path.pop();
					pathSet.delete(frame.node);
					onStack.delete(frame.node);
					continue;
				}

				const next = frame.neighbors[frame.neighborIdx++];

				if (!visited.has(next)) {
					visited.add(next);
					onStack.add(next);
					path.push(next);
					pathSet.add(next);
					const nextNeighbors = adj.get(next);
					stack.push({
						node: next,
						neighbors: nextNeighbors ? Array.from(nextNeighbors) : [],
						neighborIdx: 0,
					});
				} else if (onStack.has(next) && pathSet.has(next)) {
					// Found a cycle — extract from path
					const cycleStart = path.indexOf(next);
					if (cycleStart !== -1) {
						const cycle = path.slice(cycleStart);
						if (!this.isDuplicateCycle(cycles, cycle)) {
							cycles.push(cycle);
						}
					}
				}
			}
		}

		return cycles;
	}

	/**
	 * Check if a cycle is a rotation of an already-seen cycle.
	 */
	private isDuplicateCycle(existing: string[][], candidate: string[]): boolean {
		// Use canonical form: rotate cycle so minimum element is first, then compare
		const canonical = (cycle: string[]): string => {
			if (cycle.length === 0) return "";
			let minIdx = 0;
			for (let i = 1; i < cycle.length; i++) {
				if (cycle[i] < cycle[minIdx]) minIdx = i;
			}
			const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
			return rotated.join("|");
		};
		const candidateKey = canonical(candidate);
		return existing.some((c) => canonical(c) === candidateKey);
	}

	private findOrphans(
		graph: Graph,
		adj: Map<string, Set<string>>,
		rev: Map<string, Set<string>>,
	): string[] {
		return graph.nodes
			.filter(
				(n) =>
					(adj.get(n.id)?.size ?? 0) === 0 && (rev.get(n.id)?.size ?? 0) === 0,
			)
			.map((n) => n.id);
	}

	private findRoots(graph: Graph, rev: Map<string, Set<string>>): string[] {
		return graph.nodes
			.filter((n) => (rev.get(n.id)?.size ?? 0) === 0)
			.map((n) => n.id);
	}

	private findLeaves(graph: Graph, adj: Map<string, Set<string>>): string[] {
		return graph.nodes
			.filter((n) => (adj.get(n.id)?.size ?? 0) === 0)
			.map((n) => n.id);
	}

	/**
	 * Compute the maximum depth (longest path from any root).
	 * Uses BFS from all roots.
	 */
	private computeMaxDepth(
		adj: Map<string, Set<string>>,
		roots: string[],
	): number {
		if (roots.length === 0) return 0;
		let maxDepth = 0;
		for (const root of roots) {
			const depth = this.bfsDepth(adj, root, new Set());
			if (depth > maxDepth) maxDepth = depth;
		}
		return maxDepth;
	}

	private bfsDepth(
		adj: Map<string, Set<string>>,
		start: string,
		visited: Set<string>,
	): number {
		const queue: Array<{ node: string; depth: number }> = [
			{ node: start, depth: 0 },
		];
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
