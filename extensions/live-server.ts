// LiveReportServer: Serves the graph HTML visualization on localhost with SSE-based auto-reload.
// Pattern: pi-context-map's LiveReportServer but specialized for graph-viz.

import * as http from "node:http";
import * as crypto from "node:crypto";

export class LiveReportServer {
	private server: http.Server | null = null;
	private sseClients: Set<http.ServerResponse> = new Set();
	private heartbeats: Set<NodeJS.Timeout> = new Set();
	private token: string;
	private currentHtml: string = "";
	private _port: number = 0;
	private _url: string = "";
	private boundRequestHandler: (
		req: http.IncomingMessage,
		res: http.ServerResponse,
	) => void;

	constructor() {
		this.token = crypto.randomBytes(16).toString("hex");
		this.boundRequestHandler = (req, res) => this.handleRequest(req, res);
	}

	get url(): string {
		return this._url;
	}

	get port(): number {
		return this._port;
	}

	async start(): Promise<void> {
		// Kill any pre-existing server (singleton pattern)
		if (this.server) {
			this.stop();
		}

		return new Promise((resolve, reject) => {
			this.server = http.createServer(this.boundRequestHandler);
			this.server.listen(0, "127.0.0.1", () => {
				const addr = this.server?.address();
				if (addr && typeof addr === "object") {
					this._port = addr.port;
					this._url = `http://127.0.0.1:${this._port}`;
					resolve();
				} else {
					reject(new Error("Failed to get server address"));
				}
			});
			this.server.on("error", (err) => {
				reject(err);
			});
		});
	}

	stop(): void {
		// Clear all heartbeat intervals
		for (const h of this.heartbeats) {
			clearInterval(h);
		}
		this.heartbeats.clear();

		// Close all SSE clients
		for (const client of this.sseClients) {
			try {
				client.end();
			} catch {
				/* ignore */
			}
		}
		this.sseClients.clear();

		if (this.server) {
			// Force-close all connections synchronously (prevents libuv assertion on Windows)
			if (typeof this.server.closeAllConnections === "function") {
				this.server.closeAllConnections();
			} else {
				// Fallback for older Node.js versions
				this.server.close();
			}
			this.server = null;
		}
		this._port = 0;
		this._url = "";
	}

	isRunning(): boolean {
		return this.server !== null;
	}

	updateHtml(html: string): void {
		this.currentHtml = html;
		// Notify SSE clients
		const msg = `data: {"type":"update","time":${Date.now()}}\n\n`;
		for (const client of this.sseClients) {
			try {
				client.write(msg);
			} catch {
				this.sseClients.delete(client);
			}
		}
	}

	private handleRequest(
		req: http.IncomingMessage,
		res: http.ServerResponse,
	): void {
		const url = req.url || "/";
		const parsedUrl = new URL(url, `http://${req.headers.host || "localhost"}`);

		if (parsedUrl.pathname === "/events") {
			this.handleSSE(req, res);
			return;
		}
		if (parsedUrl.pathname === "/health") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ status: "ok", port: this._port }));
			return;
		}
		// Serve the graph HTML
		this.serveHtml(res);
	}

	private handleSSE(req: http.IncomingMessage, res: http.ServerResponse): void {
		const parsedUrl = new URL(
			req.url || "/",
			`http://${req.headers.host || "localhost"}`,
		);
		const token = parsedUrl.searchParams.get("token");

		// Validate token
		if (token !== this.token) {
			res.writeHead(401, { "Content-Type": "text/plain" });
			res.end("Unauthorized: invalid token");
			return;
		}

		// Validate origin
		const origin = req.headers.origin || req.headers.referer || "";
		if (
			origin &&
			!origin.startsWith("http://127.0.0.1") &&
			!origin.startsWith("http://localhost")
		) {
			res.writeHead(403, { "Content-Type": "text/plain" });
			res.end("Forbidden: invalid origin");
			return;
		}

		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": `http://127.0.0.1:${this._port}`,
		});

		// Send initial connection event
		res.write(`data: {"type":"connected","time":${Date.now()}}\n\n`);

		this.sseClients.add(res);

		// Heartbeat to keep connection alive (every 30s)
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

		req.on("close", () => {
			clearInterval(heartbeat);
			this.heartbeats.delete(heartbeat);
			this.sseClients.delete(res);
		});
	}

	private serveHtml(res: http.ServerResponse): void {
		if (!this.currentHtml) {
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(
				"<html><body><p>No graph data yet. Generate a graph first.</p></body></html>",
			);
			return;
		}

		// Escape token for safe HTML injection
		const safeToken = this.token.replace(/"/g, '&quot;');

		// Inject token as meta tag for JS to read
		const injected = this.currentHtml.replace(
			"</head>",
			`<meta name="graph-viz-token" content="${safeToken}">\n<script>\n(function(){var t=document.querySelector('meta[name="graph-viz-token"]');if(t)window.__GRAPH_VIZ_TOKEN=t.getAttribute('content');})();\n</script>\n</head>`,
		);

		res.writeHead(200, {
			"Content-Type": "text/html",
			"Cache-Control": "no-cache",
		});
		res.end(injected);
	}
}
