// Graph data types for pi-graph-viz

export interface GraphNode {
	id: string;
	label: string;
	// Optional metadata
	file?: string;
	line?: number;
	type?: "file" | "function" | "class" | "module";
	group?: string;
}

export interface GraphEdge {
	source: string;
	target: string;
	// Optional: relationship type
	type?: "imports" | "calls" | "extends" | "uses";
	weight?: number;
}

export interface Graph {
	nodes: GraphNode[];
	edges: GraphEdge[];
	// Optional title
	title?: string;
	// Optional metadata for the page
	metadata?: Record<string, string | number>;
}

export interface RenderOptions {
	// Layout direction: "TB" (top-bottom) or "LR" (left-right)
	direction?: "TB" | "LR";
	// Highlight cycles in red
	highlightCycles?: boolean;
	// Title for the visualization
	title?: string;
}

export interface GraphAnalysis {
	nodeCount: number;
	edgeCount: number;
	cycleCount: number;
	cycles: string[][]; // Each cycle is a list of node IDs
	orphanNodes: string[]; // Nodes with no edges
	maxDepth: number;
	rootNodes: string[]; // Nodes with no incoming edges
	leafNodes: string[]; // Nodes with no outgoing edges
}
