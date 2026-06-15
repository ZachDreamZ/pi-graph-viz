import { GraphAnalyzer } from "../extensions/analyzer";
import type { Graph } from "../extensions/types";

describe("GraphAnalyzer", () => {
	const analyzer = new GraphAnalyzer();

	const sampleGraph: Graph = {
		nodes: [
			{ id: "a", label: "A" },
			{ id: "b", label: "B" },
			{ id: "c", label: "C" },
			{ id: "d", label: "D" },
			{ id: "e", label: "E" },
		],
		edges: [
			{ source: "a", target: "b" },
			{ source: "a", target: "c" },
			{ source: "b", target: "d" },
			{ source: "c", target: "d" },
			{ source: "d", target: "e" },
		],
	};

	test("analyze returns correct node and edge counts", () => {
		const result = analyzer.analyze(sampleGraph);
		expect(result.nodeCount).toBe(5);
		expect(result.edgeCount).toBe(5);
	});

	test("detects root nodes (no incoming edges)", () => {
		const result = analyzer.analyze(sampleGraph);
		expect(result.rootNodes).toEqual(["a"]);
	});

	test("detects leaf nodes (no outgoing edges)", () => {
		const result = analyzer.analyze(sampleGraph);
		expect(result.leafNodes).toEqual(["e"]);
	});

	test("computes max depth correctly", () => {
		const result = analyzer.analyze(sampleGraph);
		expect(result.maxDepth).toBe(3); // a->b->d->e OR a->c->d->e
	});

	test("detects no cycles in a DAG", () => {
		const result = analyzer.analyze(sampleGraph);
		expect(result.cycleCount).toBe(0);
		expect(result.cycles).toEqual([]);
	});

	test("detects cycles in a graph with cycles", () => {
		const cyclicGraph: Graph = {
			nodes: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
				{ id: "c", label: "C" },
			],
			edges: [
				{ source: "a", target: "b" },
				{ source: "b", target: "c" },
				{ source: "c", target: "a" },
			],
		};
		const result = analyzer.analyze(cyclicGraph);
		expect(result.cycleCount).toBeGreaterThanOrEqual(1);
		expect(result.cycles.length).toBeGreaterThanOrEqual(1);
	});

	test("detects orphan nodes (no edges at all)", () => {
		const orphanGraph: Graph = {
			nodes: [
				{ id: "a", label: "A" },
				{ id: "orphan", label: "Orphan" },
			],
			edges: [],
		};
		const result = analyzer.analyze(orphanGraph);
		expect(result.orphanNodes).toEqual(["a", "orphan"]);
	});

	test("handles a graph with a single node", () => {
		const singleGraph: Graph = {
			nodes: [{ id: "a", label: "A" }],
			edges: [],
		};
		const result = analyzer.analyze(singleGraph);
		expect(result.nodeCount).toBe(1);
		expect(result.edgeCount).toBe(0);
		expect(result.rootNodes).toEqual(["a"]);
		expect(result.leafNodes).toEqual(["a"]);
	});

	test("handles empty graph", () => {
		const emptyGraph: Graph = { nodes: [], edges: [] };
		const result = analyzer.analyze(emptyGraph);
		expect(result.nodeCount).toBe(0);
		expect(result.edgeCount).toBe(0);
		expect(result.maxDepth).toBe(0);
	});

	test("buildCycleMembership returns correct set", () => {
		const cycles = [["a", "b", "c"]];
		const members = analyzer.buildCycleMembership(cycles);
		expect(members.has("a")).toBe(true);
		expect(members.has("b")).toBe(true);
		expect(members.has("c")).toBe(true);
		expect(members.has("d")).toBe(false);
	});

	test("detects self-referencing cycle", () => {
		const selfGraph: Graph = {
			nodes: [{ id: "a", label: "A" }],
			edges: [{ source: "a", target: "a" }],
		};
		const result = analyzer.analyze(selfGraph);
		expect(result.cycleCount).toBe(1);
	});
});
