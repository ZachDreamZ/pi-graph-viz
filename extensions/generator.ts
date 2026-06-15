// GraphGenerator: Renders a self-contained HTML visualization.
// Uses an SVG-based hierarchical layout with cycle highlighting.

import type { Graph, RenderOptions } from "./types";
import { GraphAnalyzer } from "./analyzer";

export class GraphGenerator {
	private analyzer = new GraphAnalyzer();

	public generateHTML(graph: Graph, options: RenderOptions = {}): string {
		const direction = options.direction || "TB";
		const title = options.title || graph.title || "Dependency Graph";
		const analysis = this.analyzer.analyze(graph);
		const cycleMembers = this.analyzer.buildCycleMembership(analysis.cycles);

		const graphData = {
			nodes: graph.nodes,
			edges: graph.edges,
			analysis: {
				...analysis,
				cycleMembers: Array.from(cycleMembers),
			},
			direction,
		};

		return this.buildHtml(title, analysis, graphData);
	}

	public writeToFile(
		graph: Graph,
		outputPath: string,
		options?: RenderOptions,
	): void {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { writeFileSync } = require("node:fs") as typeof import("node:fs");
		const html = this.generateHTML(graph, options);
		writeFileSync(outputPath, html, "utf-8");
	}

	private buildHtml(
		title: string,
		analysis: {
			nodeCount: number;
			edgeCount: number;
			maxDepth: number;
			cycleCount: number;
			cycles: string[][];
		},
		graphData: any,
	): string {
		// Build the HTML as a string using concatenation to avoid template literal escaping issues
		let html = "<!DOCTYPE html>\n";
		html += '<html lang="en">\n<head>\n';
		html += '<meta charset="UTF-8">\n';
		html +=
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
		html += "<title>" + this.esc(title) + "</title>\n";
		html += "<style>\n";
		html +=
			":root{--bg:#0f1011;--surface-1:#141516;--surface-2:#18191a;--hairline:#23252a;--ink:#f7f8f8;--ink-muted:#d0d6e0;--ink-subtle:#8a8f98;--ink-tertiary:#62666d;--accent:#5e6ad2;--accent-hover:#828fff;--danger:#ef4444;--danger-soft:rgba(239,68,68,0.2);--node-fill:#1e2030;--node-stroke:#5e6ad2;--edge-stroke:#34343a;--cycle-stroke:#ef4444}\n";
		html += "*{box-sizing:border-box;margin:0;padding:0}\n";
		html +=
			'body{background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;height:100vh;overflow:hidden}\n';
		html += ".app{display:flex;flex-direction:column;height:100vh}\n";
		html +=
			"header{padding:16px 24px;border-bottom:1px solid var(--hairline);background:var(--surface-1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}\n";
		html += "h1{font-size:18px;font-weight:600}\n";
		html +=
			".stats{display:flex;gap:16px;font-size:12px;color:var(--ink-subtle)}\n";
		html += ".stat{display:flex;align-items:center;gap:4px}\n";
		html += ".stat strong{color:var(--ink);font-weight:600}\n";
		html += ".stat-cycle strong{color:var(--danger)}\n";
		html +=
			".toolbar{padding:8px 24px;background:var(--surface-2);border-bottom:1px solid var(--hairline);display:flex;gap:12px;align-items:center;flex-shrink:0}\n";
		html +=
			".search,.filter{background:var(--surface-1);border:1px solid var(--hairline);border-radius:6px;padding:6px 12px;color:var(--ink);font:inherit;font-size:13px;outline:none}\n";
		html += ".search:focus,.filter:focus{border-color:var(--accent)}\n";
		html += ".search{flex:1;min-width:200px}\n";
		html += ".search::placeholder{color:var(--ink-tertiary)}\n";
		html += ".main{display:flex;flex:1;overflow:hidden}\n";
		html +=
			".canvas{flex:1;position:relative;overflow:auto;background:var(--bg);background-image:radial-gradient(circle,rgba(94,106,210,.04)1px,transparent 1px);background-size:24px 24px}\n";
		html += "svg.graph{display:block;min-width:100%;min-height:100%}\n";
		html +=
			".node-rect{fill:var(--node-fill);stroke:var(--node-stroke);stroke-width:1.5px;rx:4;transition:fill .15s,stroke .15s,opacity .15s}\n";
		html +=
			".node-cycle{stroke:var(--danger);stroke-width:2.5px;fill:var(--danger-soft)}\n";
		html +=
			'.node-text{fill:var(--ink);font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace;font-size:12px;text-anchor:middle;dominant-baseline:middle;pointer-events:none}\n';
		html +=
			".edge-line{stroke:var(--edge-stroke);stroke-width:1.5;fill:none;transition:stroke .15s,opacity .15s}\n";
		html += ".edge-line-cycle{stroke:var(--cycle-stroke);stroke-width:2.5}\n";
		html +=
			".side-panel{width:320px;background:var(--surface-1);border-left:1px solid var(--hairline);padding:20px;overflow-y:auto;flex-shrink:0}\n";
		html +=
			".side-panel h3{font-size:11px;font-weight:500;color:var(--ink-subtle);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px}\n";
		html +=
			".detail-card{background:var(--surface-2);border:1px solid var(--hairline);border-radius:6px;padding:12px;margin-bottom:12px}\n";
		html +=
			".detail-id{font-family:ui-monospace;font-size:12px;color:var(--accent-hover);word-break:break-all;margin-bottom:8px}\n";
		html +=
			".detail-row{display:flex;justify-content:space-between;font-size:12px;color:var(--ink-muted);padding:4px 0;border-top:1px solid var(--hairline)}\n";
		html += ".detail-row span:last-child{color:var(--ink)}\n";
		html += ".cycle-list{list-style:none}\n";
		html +=
			".cycle-item{background:var(--danger-soft);border:1px solid var(--danger);border-radius:4px;padding:8px 10px;margin-bottom:6px;font-size:12px;font-family:ui-monospace;word-break:break-all;color:var(--ink-muted)}\n";
		html +=
			".empty-state{text-align:center;color:var(--ink-subtle);font-size:13px;padding:32px 8px}\n";
		html += "</style>\n</head>\n<body>\n";
		html += '<div class="app">\n<header>\n';
		html += "<h1>" + this.esc(title) + "</h1>\n";
		html += '<div class="stats">\n';
		html +=
			'<div class="stat"><strong>' +
			analysis.nodeCount +
			"</strong> nodes</div>\n";
		html +=
			'<div class="stat"><strong>' +
			analysis.edgeCount +
			"</strong> edges</div>\n";
		html +=
			'<div class="stat"><strong>' +
			analysis.maxDepth +
			"</strong> max depth</div>\n";
		html +=
			'<div class="stat stat-cycle"><strong>' +
			analysis.cycleCount +
			"</strong> cycles</div>\n";
		html += "</div>\n</header>\n";
		html += '<div class="toolbar">\n';
		html +=
			'<input type="text" class="search" id="searchInput" placeholder="Search nodes..." aria-label="Search">\n';
		html += '<select class="filter" id="typeFilter">\n';
		html += '<option value="all">All types</option>\n';
		html += '<option value="file">Files</option>\n';
		html += '<option value="function">Functions</option>\n';
		html += '<option value="class">Classes</option>\n';
		html += '<option value="module">Modules</option>\n';
		html += "</select>\n</div>\n";
		html += '<div class="main">\n';
		html += '<div class="canvas" id="canvas"></div>\n';
		html += '<aside class="side-panel">\n';
		html += "<h3>Node Details</h3>\n";
		html +=
			'<div id="details" class="empty-state">Click a node to see details.</div>\n';
		html += '<h3 style="margin-top:24px">Cycles</h3>\n';
		html += '<ul id="cyclesList" class="cycle-list"></ul>\n';
		html += '<h3 style="margin-top:24px">Legend</h3>\n';
		html +=
			'<div style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--ink-muted)">\n';
		html +=
			'<div style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:4px;background:var(--edge-stroke);border-radius:2px"></span><span>Dependency edge</span></div>\n';
		html +=
			'<div style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:4px;background:var(--cycle-stroke);border-radius:2px"></span><span>Cycle edge</span></div>\n';
		html +=
			'<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><span style="width:12px;height:12px;border:1.5px solid var(--node-stroke);border-radius:2px;background:var(--node-fill)"></span><span>Normal node</span></div>\n';
		html +=
			'<div style="display:flex;align-items:center;gap:8px"><span style="width:12px;height:12px;border:1.5px solid var(--danger);border-radius:2px;background:var(--danger-soft)"></span><span>Cycle node</span></div>\n';
		html += "</div>\n</aside>\n</div>\n</div>\n";
		html += "<script>\n";
		html += "(function(){\n";
		html += "var DATA = " + this.serializeGraphData(graphData) + ";\n";
		html += "var nodes=DATA.nodes, edges=DATA.edges, analysis=DATA.analysis;\n";
		html +=
			"var cycleMembers=new Set(analysis.cycleMembers), nodeById={}, adj={};\n";
		html +=
			"nodes.forEach(function(n){nodeById[n.id]=n;adj[n.id]=new Set()});\n";
		html +=
			"edges.forEach(function(e){if(adj[e.source])adj[e.source].add(e.target)});\n";
		html +=
			"var level={},roots=nodes.filter(function(n){return!edges.some(function(e){return e.target===n.id})});\n";
		html += "if(roots.length===0&&nodes.length>0)roots.push(nodes[0]);\n";
		html += "var queue=[];\n";
		html += "roots.forEach(function(r){level[r.id]=0;queue.push(r.id)});\n";
		html += "while(queue.length>0){\n";
		html += "var id=queue.shift(),l=level[id];\n";
		html +=
			"(adj[id]||[]).forEach(function(n){if(level[n]===void 0){level[n]=l+1;queue.push(n)}});\n";
		html += "}\n";
		html +=
			"nodes.forEach(function(n){if(level[n.id]===void 0)level[n.id]=0});\n";
		html += "var levels=[];\n";
		html +=
			"nodes.forEach(function(n){var l=level[n.id];while(levels.length<=l)levels.push([]);levels[l].push(n)});\n";
		html += 'var NW=160,NH=40,HG=60,VG=40,LR=DATA.direction==="LR",pos={};\n';
		html += "levels.forEach(function(lv,li){lv.forEach(function(n,ni){\n";
		html +=
			"pos[n.id]={x:LR?li*(NW+HG)+NW/2+100:ni*(NW+HG)+NW/2+200,y:LR?ni*(NH+VG)+NH/2+100:li*(NH+VG)+NH/2+60};\n";
		html += "})});\n";
		html +=
			"var mx=0,my=0;Object.values(pos).forEach(function(p){if(p.x>mx)mx=p.x;if(p.y>my)my=p.y});\n";
		html += "mx+=NW+200;my+=NH+100;\n";
		html +=
			'var ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");\n';
		html +=
			'svg.setAttribute("class","graph");svg.setAttribute("width",mx);svg.setAttribute("height",my);\n';
		html += 'svg.setAttribute("viewBox","0 0 "+mx+" "+my);\n';
		html += 'var defs=document.createElementNS(ns,"defs");\n';
		html += 'var m=document.createElementNS(ns,"marker");\n';
		html +=
			'm.setAttribute("id","arrow");m.setAttribute("viewBox","0 0 10 10");m.setAttribute("refX","9");m.setAttribute("refY","5");\n';
		html +=
			'm.setAttribute("markerWidth","6");m.setAttribute("markerHeight","6");m.setAttribute("orient","auto-start-reverse");\n';
		html +=
			'var ap=document.createElementNS(ns,"path");ap.setAttribute("d","M0 0 L10 5 L0 10 z");ap.setAttribute("fill","var(--edge-stroke)");\n';
		html += "m.appendChild(ap);defs.appendChild(m);svg.appendChild(defs);\n";
		html += 'var eg=document.createElementNS(ns,"g");\n';
		html += "edges.forEach(function(e){\n";
		html += "var s=pos[e.source],t=pos[e.target];if(!s||!t)return;\n";
		html +=
			"var dx=t.x-s.x,dy=t.y-s.y,len=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/len,uy=dy/len;\n";
		html += 'var line=document.createElementNS(ns,"line");\n';
		html +=
			'line.setAttribute("x1",s.x+ux*NW/2);line.setAttribute("y1",s.y+uy*NH/2);\n';
		html +=
			'line.setAttribute("x2",t.x-ux*NW/2);line.setAttribute("y2",t.y-uy*NH/2);\n';
		html +=
			'line.setAttribute("class",cycleMembers.has(e.source)&&cycleMembers.has(e.target)?"edge-line edge-line-cycle":"edge-line");\n';
		html +=
			'line.setAttribute("marker-end","url(#arrow)");line.setAttribute("data-source",e.source);line.setAttribute("data-target",e.target);\n';
		html += "eg.appendChild(line);\n";
		html += "});\n";
		html += "svg.appendChild(eg);\n";
		html += 'var ng=document.createElementNS(ns,"g");\n';
		html += "nodes.forEach(function(n){\n";
		html += "var p=pos[n.id];if(!p)return;\n";
		html += 'var g=document.createElementNS(ns,"g");\n';
		html +=
			'g.setAttribute("class","node-group");g.setAttribute("data-id",n.id);g.setAttribute("data-label",n.label);g.setAttribute("data-type",n.type||"file");\n';
		html +=
			'g.setAttribute("transform","translate("+(p.x-NW/2)+","+(p.y-NH/2)+")");\n';
		html +=
			'var r=document.createElementNS(ns,"rect");r.setAttribute("width",NW);r.setAttribute("height",NH);\n';
		html +=
			'r.setAttribute("class",cycleMembers.has(n.id)?"node-rect node-cycle":"node-rect");\n';
		html += "g.appendChild(r);\n";
		html +=
			'var t=document.createElementNS(ns,"text");t.setAttribute("x",NW/2);t.setAttribute("y",NH/2);t.setAttribute("class","node-text");\n';
		html +=
			't.textContent=n.label.length>22?n.label.substring(0,20)+"...":n.label;\n';
		html += "g.appendChild(t);\n";
		html +=
			'g.addEventListener("click",(function(id){return function(){showDetails(id)}})(n.id));\n';
		html += "ng.appendChild(g);\n";
		html += "});\n";
		html +=
			'svg.appendChild(ng);document.getElementById("canvas").appendChild(svg);\n';
		html += "function showDetails(id){\n";
		html += "var n=nodeById[id];if(!n)return;\n";
		html += "var i=edges.filter(function(e){return e.target===id}).length;\n";
		html += "var o=edges.filter(function(e){return e.source===id}).length;\n";
		html +=
			'document.getElementById("details").innerHTML=\'<div class="detail-card"><div class="detail-id">\'+n.id+\'</div><div class="detail-row"><span>Type</span><span>\'+(n.type||"file")+\'</span></div>\'+(n.file?\'<div class="detail-row"><span>File</span><span style="font-family:monospace;font-size:11px">\'+n.file+\'</span></div>\':"")+(n.line?\'<div class="detail-row"><span>Line</span><span>\'+n.line+\'</span></div>\':"")+\'<div class="detail-row"><span>In-degree</span><span>\'+i+\'</span></div><div class="detail-row"><span>Out-degree</span><span>\'+o+\'</span></div></div>\';\n';
		html += "}\n";
		html += 'var cl=document.getElementById("cyclesList");\n';
		html +=
			"if(analysis.cycles.length===0)cl.innerHTML='<li class=\"empty-state\">No cycles.</li>';\n";
		html +=
			'else cl.innerHTML=analysis.cycles.map(function(c){return\'<li class="cycle-item">\'+c.join(" \\u2192 ")+" \\u2192 "+c[0]+\'</li>\'}).join("");\n';
		html +=
			'document.getElementById("searchInput").addEventListener("input",function(){\n';
		html += "var q=this.value.toLowerCase();\n";
		html +=
			'document.querySelectorAll(".node-group").forEach(function(g){var i=g.getAttribute("data-id").toLowerCase(),l=g.getAttribute("data-label").toLowerCase();g.style.opacity=(!q||i.indexOf(q)!==-1||l.indexOf(q)!==-1)?"1":"0.2"});\n';
		html +=
			'document.querySelectorAll(".edge-line").forEach(function(el){var s=el.getAttribute("data-source").toLowerCase(),t=el.getAttribute("data-target").toLowerCase();el.style.opacity=(!q||s.indexOf(q)!==-1||t.indexOf(q)!==-1)?"1":"0.15"});\n';
		html += "});\n";
		html +=
			'document.getElementById("typeFilter").addEventListener("change",function(){\n';
		html += "var t=this.value;\n";
		html +=
			'document.querySelectorAll(".node-group").forEach(function(g){g.style.opacity=(t==="all"||g.getAttribute("data-type")===t)?"1":"0.2"});\n';
		html += "});\n";
		html += "})();\n";
		html += "</script>\n</body>\n</html>";

		return html;
	}

	private esc(s: string): string {
		const map: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#039;",
		};
		return s.replace(/[&<>"']/g, (m) => map[m]);
	}

	private serializeGraphData(data: any): string {
		return JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
	}
}
