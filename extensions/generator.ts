// GraphGenerator: Renders a self-contained HTML visualization.
// Clean edges (no arrowheads), layout presets with animated transitions.
// Apple-inspired design with light/dark mode — consistent with pi-context-map.
// v0.5.0 — Proper pan (drag empty space), zoom (scroll + buttons), node drag, layout presets.

import type { Graph, RenderOptions } from "./types";
import { GraphAnalyzer } from "./analyzer";

export class GraphGenerator {
	private analyzer = new GraphAnalyzer();

	public generateHTML(graph: Graph, options: RenderOptions = {}): string {
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
			direction: options.direction || "TB",
		};

		return this.buildHtml(title, analysis, graphData);
	}

	public writeToFile(
		graph: Graph,
		outputPath: string,
		options?: RenderOptions,
	): void {
		const { writeFileSync } = require("node:fs") as typeof import("node:fs");
		writeFileSync(outputPath, this.generateHTML(graph, options), "utf-8");
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
		let h = "";
		h += '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
		h += '<meta charset="UTF-8">\n';
		h +=
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
		h += "<title>" + this.esc(title) + "</title>\n";
		h += '<link rel="preconnect" href="https://fonts.googleapis.com">\n';
		h +=
			'<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&display=swap" rel="stylesheet">\n';

		// === CSS ===
		h += "<style>\n";
		// Design tokens (Light)
		h += `:root{--canvas:#fff;--canvas-alt:#f5f5f7;--surface:#fff;--surface-hover:#f0f0f2;--hairline:#e0e0e0;--hairline-soft:rgba(0,0,0,.06);--hairline-strong:#d2d2d7;--ink:#1d1d1f;--ink-secondary:#6e6e73;--ink-tertiary:#86868b;--accent:#0066cc;--danger:#ff453a;--danger-soft:rgba(255,69,58,.1);--edge-stroke:#c7c7cc;--edge-hover:#86868b;--dot-color:rgba(0,102,204,.04);--file-color:#0066cc;--func-color:#30d158;--class-color:#bf5af2;--module-color:#ff9f0a}\n`;
		// Design tokens (Dark)
		h += `[data-theme="dark"]{--canvas:#0a0a0b;--canvas-alt:#141415;--surface:#1a1a1c;--surface-hover:#2c2c2e;--hairline:#2c2c2e;--hairline-soft:rgba(255,255,255,.06);--hairline-strong:#3a3a3c;--ink:#f5f5f7;--ink-secondary:#a1a1a6;--ink-tertiary:#6e6e73;--accent:#2997ff;--danger:#ff453a;--danger-soft:rgba(255,69,58,.12);--edge-stroke:#3a3a3c;--edge-hover:#6e6e73;--dot-color:rgba(41,151,255,.03);--file-color:#2997ff;--func-color:#30d158;--class-color:#bf5af2;--module-color:#ff9f0a}\n`;
		// Reset
		h += "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n";
		h +=
			'body{background:var(--canvas);color:var(--ink);font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;letter-spacing:-.01em;-webkit-font-smoothing:antialiased;height:100vh;overflow:hidden;transition:background .3s,color .3s}\n';
		// Layout
		h += ".app{display:flex;flex-direction:column;height:100vh}\n";
		h +=
			"header{padding:12px 20px;border-bottom:1px solid var(--hairline);background:var(--surface);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;transition:background .3s}\n";
		h += ".header-left{display:flex;align-items:center;gap:14px}\n";
		h +=
			"h1{font-size:15px;font-weight:600;letter-spacing:-.3px;color:var(--ink)}\n";
		h += ".stats{display:flex;gap:6px;flex-wrap:wrap}\n";
		h +=
			".stat{display:inline-flex;align-items:center;gap:5px;background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:8px;padding:3px 10px;font-size:12px;color:var(--ink-secondary);transition:background .3s}\n";
		h += ".stat strong{color:var(--ink);font-weight:600}\n";
		h += ".stat-cycle strong{color:var(--danger)}\n";
		h +=
			"#themeToggle{background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-secondary);transition:all .15s}\n";
		h +=
			"#themeToggle:hover{background:var(--surface-hover);border-color:var(--hairline-strong);color:var(--ink)}\n";
		// Toolbar
		h +=
			".toolbar{padding:8px 20px;background:var(--surface);border-bottom:1px solid var(--hairline);display:flex;gap:10px;align-items:center;flex-shrink:0;transition:background .3s}\n";
		h += ".search-wrap{flex:1;position:relative;min-width:200px}\n";
		h +=
			".search-wrap svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--ink-tertiary);pointer-events:none}\n";
		h +=
			".search{width:100%;background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:8px;padding:7px 12px 7px 32px;color:var(--ink);font:inherit;font-size:13px;outline:none;transition:border .15s}\n";
		h += ".search:focus{border-color:var(--accent)}\n";
		h += ".search::placeholder{color:var(--ink-tertiary)}\n";
		h +=
			".filter{background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:8px;padding:7px 12px;color:var(--ink);font:inherit;font-size:13px;outline:none;cursor:pointer;transition:border .15s}\n";
		h += ".zoom-controls{display:flex;gap:4px}\n";
		h +=
			".zoom-btn{background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-secondary);font-size:14px;transition:all .15s}\n";
		h += ".zoom-btn:hover{background:var(--surface-hover);color:var(--ink)}\n";
		// Layout presets
		h +=
			".layout-presets{display:flex;gap:3px;margin-left:auto;background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:10px;padding:2px}\n";
		h +=
			".layout-btn{background:transparent;border:none;border-radius:8px;padding:5px 12px;color:var(--ink-secondary);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s}\n";
		h +=
			".layout-btn:hover{color:var(--ink);background:var(--surface-hover)}\n";
		h +=
			".layout-btn.active{color:var(--accent);background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.08)}\n";
		// Canvas — cursor indicates pan mode
		h += ".main{display:flex;flex:1;overflow:hidden}\n";
		h +=
			".canvas{flex:1;position:relative;overflow:hidden;background:var(--canvas);background-image:radial-gradient(circle,var(--dot-color) 1px,transparent 1px);background-size:24px 24px}\n";
		h += ".canvas.dragging svg{cursor:grabbing}\n";
		h += "svg.graph{display:block;width:100%;height:100%}\n";
		// Nodes
		h +=
			".node-rect{fill:var(--surface);stroke:var(--file-color);stroke-width:1.5px;rx:8;ry:8}\n";
		h += ".node-group{cursor:grab}\n";
		h += ".node-group.dragging{cursor:grabbing}\n";
		h += ".node-group:hover>.node-rect{stroke-width:2.5px}\n";
		h +=
			".node-cycle .node-rect{stroke:var(--danger);stroke-width:2.5px;fill:var(--danger-soft)}\n";
		h +=
			'.node-text{fill:var(--ink);font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:11px;font-weight:500;text-anchor:middle;dominant-baseline:middle;pointer-events:none;user-select:none}\n';
		h += ".node-type-file .node-rect{stroke:var(--file-color)}\n";
		h += ".node-type-function .node-rect{stroke:var(--func-color)}\n";
		h += ".node-type-class .node-rect{stroke:var(--class-color)}\n";
		h += ".node-type-module .node-rect{stroke:var(--module-color)}\n";
		// Edges
		h +=
			".edge-path{fill:none;stroke:var(--edge-stroke);stroke-width:1.4;stroke-linecap:round}\n";
		h += ".edge-path-cycle{stroke:var(--danger);stroke-width:2}\n";
		h +=
			".edge-path-highlight{stroke:var(--accent)!important;stroke-width:2.5}\n";
		h += ".edge-dimmed{opacity:.08}\n";
		// Side panel
		h +=
			".side-panel{width:280px;background:var(--surface);border-left:1px solid var(--hairline);padding:16px;overflow-y:auto;flex-shrink:0}\n";
		h +=
			".side-panel h3{font-size:11px;font-weight:600;color:var(--ink-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}\n";
		h +=
			".detail-card{background:var(--canvas-alt);border:1px solid var(--hairline);border-radius:10px;padding:12px;margin-bottom:10px}\n";
		h +=
			'.detail-id{font-family:"SF Mono",ui-monospace;font-size:12px;font-weight:500;color:var(--accent);word-break:break-all;margin-bottom:8px}\n';
		h +=
			".detail-row{display:flex;justify-content:space-between;font-size:12px;color:var(--ink-secondary);padding:4px 0;border-top:1px solid var(--hairline-soft)}\n";
		h += ".detail-row span:last-child{color:var(--ink);font-weight:500}\n";
		h +=
			".detail-type-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;padding:2px 8px;border-radius:6px}\n";
		h += ".cycle-list{list-style:none}\n";
		h +=
			'.cycle-item{background:var(--danger-soft);border:1px solid var(--danger);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:11px;font-family:"SF Mono",ui-monospace;word-break:break-all;color:var(--ink-secondary)}\n';
		h +=
			".minimap{position:absolute;bottom:16px;right:16px;width:160px;height:100px;background:var(--surface);border:1px solid var(--hairline);border-radius:10px;overflow:hidden;opacity:.85;box-shadow:0 2px 8px rgba(0,0,0,.06);z-index:10}\n";
		h += ".minimap svg{width:100%;height:100%}\n";
		h +=
			".empty-state{text-align:center;color:var(--ink-tertiary);font-size:13px;padding:24px 8px}\n";
		h +=
			".legend-item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-secondary);padding:3px 0}\n";
		h += ".legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}\n";
		h +=
			".legend-swatch{width:14px;height:4px;border-radius:2px;flex-shrink:0}\n";
		h += '</style>\n</head>\n<body>\n<div class="app">\n';

		// === Header ===
		h +=
			'<header>\n<div class="header-left">\n<h1>' +
			this.esc(title) +
			'</h1>\n<div class="stats">\n';
		h +=
			'<span class="stat"><strong>' +
			analysis.nodeCount +
			"</strong> nodes</span>\n";
		h +=
			'<span class="stat"><strong>' +
			analysis.edgeCount +
			"</strong> edges</span>\n";
		h +=
			'<span class="stat"><strong>' +
			analysis.maxDepth +
			"</strong> depth</span>\n";
		if (analysis.cycleCount > 0)
			h +=
				'<span class="stat stat-cycle"><strong>' +
				analysis.cycleCount +
				"</strong> cycles</span>\n";
		h +=
			'</div>\n</div>\n<div style="display:flex;align-items:center;gap:10px">\n';
		h +=
			'<span id="live-status" style="font-size:11px;color:var(--ink-tertiary)"></span>\n';
		h += '<button id="themeToggle" title="Toggle dark mode">\n';
		h +=
			'<svg id="sunIcon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\n';
		h +=
			'<svg id="moonIcon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\n';
		h += "</button>\n</div>\n</header>\n";

		// === Toolbar ===
		h += '<div class="toolbar">\n<div class="search-wrap">\n';
		h +=
			'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\n';
		h +=
			'<input type="text" class="search" id="searchInput" placeholder="Search nodes..." aria-label="Search">\n';
		h += '</div>\n<select class="filter" id="typeFilter">\n';
		h +=
			'<option value="all">All types</option>\n<option value="file">Files</option>\n';
		h +=
			'<option value="function">Functions</option>\n<option value="class">Classes</option>\n';
		h += '<option value="module">Modules</option>\n</select>\n';
		h += '<div class="zoom-controls">\n';
		h += '<button class="zoom-btn" id="zoomIn" title="Zoom in">+</button>\n';
		h +=
			'<button class="zoom-btn" id="zoomOut" title="Zoom out">&minus;</button>\n';
		h +=
			'<button class="zoom-btn" id="zoomReset" title="Reset view">\u21ba</button>\n';
		h += "</div>\n";
		h += '<div class="layout-presets">\n';
		h +=
			'<button class="layout-btn" data-layout="hierarchy">Hierarchical</button>\n';
		h += '<button class="layout-btn" data-layout="radial">Radial</button>\n';
		h += '<button class="layout-btn" data-layout="force">Force</button>\n';
		h += '<button class="layout-btn" data-layout="grid">Grid</button>\n';
		h += "</div>\n</div>\n";

		// === Main ===
		h += '<div class="main">\n<div class="canvas" id="canvas"></div>\n';
		h += '<div class="minimap" id="minimap"></div>\n';
		h += '<aside class="side-panel">\n<h3>Node Details</h3>\n';
		h +=
			'<div id="details" class="empty-state">Click a node to see details.</div>\n';
		h +=
			'<h3 style="margin-top:16px">Cycles</h3>\n<ul id="cyclesList" class="cycle-list"></ul>\n';
		h +=
			'<h3 style="margin-top:16px">Legend</h3>\n<div style="display:flex;flex-direction:column;gap:4px">\n';
		h +=
			'<div class="legend-item"><span class="legend-dot" style="background:var(--file-color)"></span><span>File</span></div>\n';
		h +=
			'<div class="legend-item"><span class="legend-dot" style="background:var(--func-color)"></span><span>Function</span></div>\n';
		h +=
			'<div class="legend-item"><span class="legend-dot" style="background:var(--class-color)"></span><span>Class</span></div>\n';
		h +=
			'<div class="legend-item"><span class="legend-dot" style="background:var(--module-color)"></span><span>Module</span></div>\n';
		h +=
			'<div class="legend-item" style="margin-top:4px"><span class="legend-swatch" style="background:var(--edge-stroke)"></span><span>Dependency</span></div>\n';
		if (analysis.cycleCount > 0)
			h +=
				'<div class="legend-item"><span class="legend-swatch" style="background:var(--danger)"></span><span>Cycle edge</span></div>\n';
		h += "</div>\n</aside>\n</div>\n</div>\n";

		// === JavaScript ===
		h += "<script>\n(function(){\n";

		// Theme
		h +=
			"var s=localStorage.getItem('context-map-theme');if(s==='dark')document.body.setAttribute('data-theme','dark');";
		h +=
			"function applyTheme(){var d=document.body.getAttribute('data-theme')==='dark';";
		h += "document.getElementById('sunIcon').style.display=d?'block':'none';";
		h += "document.getElementById('moonIcon').style.display=d?'none':'block';";
		h += "localStorage.setItem('context-map-theme',d?'dark':'light');}";
		h += "applyTheme();";
		h +=
			"document.getElementById('themeToggle').addEventListener('click',function(){";
		h += "var d=document.body.getAttribute('data-theme')==='dark';";
		h +=
			"document.body.setAttribute('data-theme',d?'light':'dark');applyTheme();});\n";

		// Data & graph structure
		h += "var DATA=" + this.serializeGraphData(graphData) + ";\n";
		h += "var nodes=DATA.nodes,edges=DATA.edges,analysis=DATA.analysis;\n";
		h +=
			"var cycleMembers=new Set(analysis.cycleMembers),nodeById={},adj={},inDeg={};\n";
		h +=
			"nodes.forEach(function(n){nodeById[n.id]=n;adj[n.id]=new Set();inDeg[n.id]=0});\n";
		h +=
			"edges.forEach(function(e){if(adj[e.source])adj[e.source].add(e.target);inDeg[e.target]=(inDeg[e.target]||0)+1});\n";
		h +=
			"var level={},roots=nodes.filter(function(n){return inDeg[n.id]===0});\n";
		h += "if(roots.length===0&&nodes.length>0)roots.push(nodes[0]);\n";
		h +=
			"var queue=[];roots.forEach(function(r){level[r.id]=0;queue.push(r.id)});\n";
		h +=
			"while(queue.length>0){var id=queue.shift(),l=level[id];(adj[id]||[]).forEach(function(n){if(level[n]===void 0){level[n]=l+1;queue.push(n)}});}\n";
		h += "nodes.forEach(function(n){if(level[n.id]===void 0)level[n.id]=0});\n";

		// Constants
		h += "var NW=160,NH=40,HG=70,VG=56,pos={};\n";

		// Seeded PRNG for deterministic force layout (mulberry32)
		("var _seed=42;function srand(s){_seed=s}");
		("function rand(){_seed|=_seed;_seed=_seed+0x6D2B79F5|0;var t=Math.imul(_seed^_seed>>>15,1|_seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}");

		// Layout functions — ALL clamp to bounds
		h +=
			"function calcBounds(){var mx=0,my=0;Object.values(pos).forEach(function(p){if(p.x>mx)mx=p.x;if(p.y>my)my=p.y});return{x:mx+NW+100,y:my+NH+120}}\n";
		h +=
			"function layoutHierarchy(){var lvls=[];nodes.forEach(function(n){var l=level[n.id]||0;while(lvls.length<=l)lvls.push([]);lvls[l].push(n)});var p={};lvls.forEach(function(lv,li){lv.forEach(function(n,ni){p[n.id]={x:li*(NW+HG)+NW/2+100,y:ni*(NH+VG)+NH/2+80}})});return p}\n";
		h +=
			"function layoutRadial(){var b=calcBounds(),cx=b.x/2,cy=b.y/2,innerR=90,outerR=Math.min(b.x,b.y)/2-80;var maxLv=Math.max.apply(null,Object.values(level));var p={};var c=roots.length>0?roots[0]:nodes[0];p[c.id]={x:cx,y:cy};var placed={};placed[c.id]=true;for(var l=1;l<=maxLv;l++){var inLv=nodes.filter(function(n){return level[n.id]===l&&!placed[n.id]});var r=innerR+(outerR-innerR)*(l/maxLv);inLv.forEach(function(n,i){var a=(2*Math.PI*i/inLv.length)-Math.PI/2;p[n.id]={x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};placed[n.id]=true})}return p}\n";
		h +=
			"function layoutForce(){_seed=42;var b=calcBounds(),p={};nodes.forEach(function(n){p[n.id]={x:b.x/2+(rand()-.5)*b.x*.6,y:b.y/2+(rand()-.5)*b.y*.6}});var repF=5000,attF=.005,damp=.9,centerF=.01;for(var it=0;it<150;it++){var fv={};nodes.forEach(function(n){fv[n.id]={x:0,y:0}});for(var i=0;i<nodes.length;i++){for(var j=i+1;j<nodes.length;j++){var a=p[nodes[i].id],bp=p[nodes[j].id];var dx=bp.x-a.x,dy=bp.y-a.y,dist=Math.sqrt(dx*dx+dy*dy)||1;var f=repF/(dist*dist),fx=dx/dist*f,fy=dy/dist*f;fv[nodes[i].id].x-=fx;fv[nodes[i].id].y-=fy;fv[nodes[j].id].x+=fx;fv[nodes[j].id].y+=fy}}edges.forEach(function(e){if(!p[e.source]||!p[e.target])return;var dx=p[e.target].x-p[e.source].x,dy=p[e.target].y-p[e.source].y,dist=Math.sqrt(dx*dx+dy*dy)||1;var f=(dist-180)*attF,fx=dx/dist*f,fy=dy/dist*f;fv[e.source].x+=fx;fv[e.source].y+=fy;fv[e.target].x-=fx;fv[e.target].y-=fy});nodes.forEach(function(n){var cx2=b.x/2-p[n.id].x,cy2=b.y/2-p[n.id].y;fv[n.id].x+=cx2*centerF;fv[n.id].y+=cy2*centerF;p[n.id].x+=fv[n.id].x;p[n.id].y+=fv[n.id].y;p[n.id].x*=damp;p[n.id].y*=damp;p[n.id].x=Math.max(NW/2+20,Math.min(b.x-NW/2-20,p[n.id].x));p[n.id].y=Math.max(NH/2+20,Math.min(b.y-NH/2-20,p[n.id].y))})}return p}\n";
		h +=
			"function layoutGrid(){var b=calcBounds(),cols=Math.ceil(Math.sqrt(nodes.length));var gx=(b.x-200)/(cols||1),gy=(b.y-120)/(Math.ceil(nodes.length/cols)||1);var p={};nodes.forEach(function(n,i){var col=i%cols,row=Math.floor(i/cols);p[n.id]={x:100+col*gx+gx/2,y:60+row*gy+gy/2}});return p}\n";

		// Initial layout
		h += "pos=layoutHierarchy();\n";
		h += "var vb={x:0,y:0,w:0,h:0};\n";
		h +=
			"function recalcVB(){var b=calcBounds();vb.w=b.x;vb.h=b.y;vb.x=0;vb.y=0;if(svg)syncView()}\n";
		h += "recalcVB();\n";

		// SVG
		h +=
			"var ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');\n";
		h += "svg.setAttribute('class','graph');\n";
		h += "svg.setAttribute('viewBox',vb.x+' '+vb.y+' '+vb.w+' '+vb.h);\n";
		h += "svg.style.width='100%';svg.style.height='100%';\n";

		// No arrow markers
		h +=
			"var defs=document.createElementNS(ns,'defs');svg.appendChild(defs);\n";

		// ViewBox sync
		h +=
			"function syncView(){svg.setAttribute('viewBox',vb.x+' '+vb.y+' '+vb.w+' '+vb.h);scheduleMinimap()}\n";

		// Rectangle-line intersection
		h +=
			"function rectHit(cx,cy,tx,ty){var dx=tx-cx,dy=ty-cy,hw=NW/2,hh=NH/2;if(dx===0&&dy===0)return{x:cx+hw,y:cy};var ix=dx!==0?Math.abs(hw/dx):1e9,iy=dy!==0?Math.abs(hh/dy):1e9;var t=Math.min(ix,iy);if(!isFinite(t)||t<=0)return{x:cx,y:cy};return{x:cx+dx*t,y:cy+dy*t}}\n";

		// Edge path
		h +=
			"function edgePath(s,t){var dx=t.x-s.x,dy=t.y-s.y,len=Math.sqrt(dx*dx+dy*dy)||1;var ux=dx/len,uy=dy/len,nx=-uy,ny=ux;var curve=Math.min(len*.15,40);var a=rectHit(s.x,s.y,t.x,t.y),b2=rectHit(t.x,t.y,s.x,s.y);var cx=(a.x+b2.x)/2+nx*curve,cy=(a.y+b2.y)/2+ny*curve;return 'M'+a.x+' '+a.y+' Q '+cx+' '+cy+' '+b2.x+' '+b2.y}\n";

		// Draw edges
		h += "var eg=document.createElementNS(ns,'g'),edgeEls=[];\n";
		h +=
			"edges.forEach(function(e,idx){var s=pos[e.source],t=pos[e.target];if(!s||!t)return;\n";
		h +=
			"var path=document.createElementNS(ns,'path');path.setAttribute('d',edgePath(s,t));\n";
		h +=
			"var isCycle=cycleMembers.has(e.source)&&cycleMembers.has(e.target);\n";
		h +=
			"path.setAttribute('class',isCycle?'edge-path edge-path-cycle':'edge-path');\n";
		h +=
			"path.setAttribute('data-source',e.source);path.setAttribute('data-target',e.target);path.setAttribute('data-idx',idx);\n";
		h += "edgeEls.push(path);eg.appendChild(path);});\n";
		h += "svg.appendChild(eg);\n";

		// Draw nodes
		h += "var ng=document.createElementNS(ns,'g'),nodeGroups={};\n";
		h +=
			"var typeColors={file:'#0066cc',function:'#30d158',class:'#bf5af2',module:'#ff9f0a'};\n";
		h += "nodes.forEach(function(n){var p=pos[n.id];if(!p)return;\n";
		h += "var g=document.createElementNS(ns,'g'),ntype=n.type||'file';\n";
		h +=
			"g.setAttribute('class','node-group node-type-'+ntype);g.setAttribute('data-id',n.id);g.setAttribute('data-label',n.label);g.setAttribute('data-type',ntype);\n";
		h +=
			"g.setAttribute('transform','translate('+(p.x-NW/2)+','+(p.y-NH/2)+')');\n";
		h +=
			"var r=document.createElementNS(ns,'rect');r.setAttribute('width',NW);r.setAttribute('height',NH);\n";
		h +=
			"r.setAttribute('class',cycleMembers.has(n.id)?'node-rect node-cycle':'node-rect');g.appendChild(r);\n";
		h +=
			"var bd=document.createElementNS(ns,'circle');bd.setAttribute('cx',12);bd.setAttribute('cy',NH/2);bd.setAttribute('r',3.5);\n";
		h +=
			"bd.setAttribute('fill',typeColors[ntype]||typeColors.file);g.appendChild(bd);\n";
		h +=
			"var t=document.createElementNS(ns,'text');t.setAttribute('x',NW/2+6);t.setAttribute('y',NH/2);t.setAttribute('class','node-text');\n";
		h +=
			"t.textContent=n.label.length>18?n.label.substring(0,16)+'...':n.label;g.appendChild(t);\n";
		h +=
			"g.addEventListener('mousedown',(function(id){return function(ev){startDrag(ev,id)}})(n.id));\n";
		h +=
			"g.addEventListener('click',(function(id){return function(){if(!wasDragged)showDetails(id)}})(n.id));\n";
		h +=
			"g.addEventListener('mouseenter',(function(id){return function(){highlightEdges(id,true)}})(n.id));\n";
		h +=
			"g.addEventListener('mouseleave',(function(id){return function(){highlightEdges(id,false)}})(n.id));\n";
		h += "ng.appendChild(g);nodeGroups[n.id]=g;});\n";
		h +=
			"svg.appendChild(ng);document.getElementById('canvas').appendChild(svg);\n";

		// Edge highlight
		h +=
			"function highlightEdges(id,on){edgeEls.forEach(function(el){if(el.getAttribute('data-source')===id||el.getAttribute('data-target')===id)el.classList.toggle('edge-path-highlight',on)})}\n";

		// === Pan (drag empty space) + Node drag ===
		h +=
			"var isPanning=false,panStartX=0,panStartY=0,vbStartX=0,vbStartY=0,panScaleX=1,panScaleY=1;\n";
		h +=
			"var dragNode=null,dragStartX=0,dragStartY=0,nodeStartX=0,nodeStartY=0,wasDragged=false;\n";

		h +=
			"function svgXY(cx,cy){var ctm=svg.getScreenCTM();if(!ctm)return{x:cx,y:cy};var pt=svg.createSVGPoint();pt.x=cx;pt.y=cy;return pt.matrixTransform(ctm.inverse())}\n";

		// Node drag
		h +=
			"function startDrag(ev,id){ev.preventDefault();ev.stopPropagation();wasDragged=false;\n";
		h +=
			"var pt=svgXY(ev.clientX,ev.clientY);dragNode=id;dragStartX=pt.x;dragStartY=pt.y;\n";
		h +=
			"var tr=nodeGroups[id].getAttribute('transform');var m=tr.match(/translate\\(([\\d.]+),\\s*([\\d.]+)\\)/);\n";
		h +=
			"nodeStartX=m?parseFloat(m[1]):0;nodeStartY=m?parseFloat(m[2]):0;nodeGroups[id].classList.add('dragging')}\n";

		h +=
			"function onDrag(ev){if(dragNode){ev.preventDefault();ev.stopPropagation();\n";
		h +=
			"var pt=svgXY(ev.clientX,ev.clientY);var dx=pt.x-dragStartX,dy=pt.y-dragStartY;\n";
		h += "if(Math.abs(dx)>2||Math.abs(dy)>2)wasDragged=true;\n";
		h += "var nx=nodeStartX+dx,ny=nodeStartY+dy;\n";
		h +=
			"nodeGroups[dragNode].setAttribute('transform','translate('+nx+','+ny+')');\n";
		h += "pos[dragNode]={x:nx+NW/2,y:ny+NH/2};updateEdges();return}\n";

		// Pan — use screen-space delta (avoids CTM feedback loop that causes shaking)
		h += "if(isPanning){\n";
		h +=
			"var dx=(ev.clientX-panStartX)*panScaleX,dy=(ev.clientY-panStartY)*panScaleY;\n";
		h += "vb.x=vbStartX-dx;vb.y=vbStartY-dy;\n";
		h += "syncView()}}\n";

		h +=
			"function endDrag(){if(dragNode&&nodeGroups[dragNode])nodeGroups[dragNode].classList.remove('dragging');dragNode=null;isPanning=false}\n";

		// Start pan on SVG mousedown (only on empty space — not on a node)
		h += "svg.addEventListener('mousedown',function(ev){\n";
		h +=
			"if(ev.target===svg||ev.target===defs||ev.target.tagName==='path'||ev.target.tagName==='circle'){isPanning=true;\n";
		h +=
			"panStartX=ev.clientX;panStartY=ev.clientY;vbStartX=vb.x;vbStartY=vb.y;\n";
		h +=
			"var r=svg.getBoundingClientRect();panScaleX=vb.w/r.width;panScaleY=vb.h/r.height;\n";
		h +=
			"document.getElementById('canvas').classList.add('dragging');ev.preventDefault()}});\n";
		h += "svg.addEventListener('mousemove',onDrag);\n";
		h +=
			"svg.addEventListener('mouseup',function(){endDrag();document.getElementById('canvas').classList.remove('dragging')});\n";
		h +=
			"svg.addEventListener('mouseleave',function(){endDrag();document.getElementById('canvas').classList.remove('dragging')});\n";

		// Zoom — wheel
		h +=
			"document.getElementById('canvas').addEventListener('wheel',function(ev){ev.preventDefault();\n";
		h += "var pt=svgXY(ev.clientX,ev.clientY);\n";
		h += "var factor=ev.deltaY<0?1.12:1/1.12;\n";
		h += "var nw=Math.max(200,Math.min(vb.w*factor,5000));\n";
		h += "var nh=Math.max(100,Math.min(vb.h*factor,3000));\n";
		h += "vb.x=pt.x-(pt.x-vb.x)*(nw/vb.w);\n";
		h += "vb.y=pt.y-(pt.y-vb.y)*(nh/vb.h);\n";
		h += "vb.w=nw;vb.h=nh;\n";
		h += "syncView()},{passive:false});\n";

		// Zoom buttons
		h +=
			"document.getElementById('zoomIn').addEventListener('click',function(){\n";
		h +=
			"var cx=vb.x+vb.w/2,cy=vb.y+vb.h/2;vb.w*=.8;vb.h*=.8;vb.x=cx-vb.w/2;vb.y=cy-vb.h/2;syncView()});\n";
		h +=
			"document.getElementById('zoomOut').addEventListener('click',function(){\n";
		h +=
			"var cx=vb.x+vb.w/2,cy=vb.y+vb.h/2;vb.w*=1.25;vb.h*=1.25;vb.x=cx-vb.w/2;vb.y=cy-vb.h/2;syncView()});\n";
		h +=
			"document.getElementById('zoomReset').addEventListener('click',function(){recalcVB()});\n";

		// Minimap
		h += "var minimapDirty=false;\n";
		h +=
			"function scheduleMinimap(){if(!minimapDirty){minimapDirty=true;requestAnimationFrame(function(){minimapDirty=false;renderMinimap()})}}\n";
		h +=
			"function renderMinimap(){var mm=document.getElementById('minimap');\n";
		h += "var b=calcBounds();\n";
		h +=
			"var parts=['<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 '+b.x+' '+b.y+'\">'];\n";
		h +=
			"parts.push('<rect width=\"'+b.x+'\" height=\"'+b.y+'\" fill=\"var(--canvas-alt)\"/>');\n";
		h +=
			'edgeEls.forEach(function(el){parts.push(\'<path d="\'+el.getAttribute(\'d\')+\'" fill="none" stroke="var(--edge-stroke)" stroke-width="3" opacity="0.4"/>\')});\n';
		h += "nodes.forEach(function(n){var p2=pos[n.id];if(!p2)return;\n";
		h +=
			"parts.push('<circle cx=\"'+p2.x+'\" cy=\"'+p2.y+'\" r=\"'+(NW/3)+'\" fill=\"'+(typeColors[n.type||'file']||typeColors.file)+'\" opacity=\"0.8\"/>')});\n";
		h +=
			'parts.push(\'<rect x="\'+vb.x+\'" y="\'+vb.y+\'" width="\'+vb.w+\'" height="\'+vb.h+\'" fill="none" stroke="var(--accent)" stroke-width="2" rx="4" opacity="0.5"/>\');\n';
		h += "parts.push('</svg>');mm.innerHTML=parts.join('')}\n";
		h += "renderMinimap();\n";

		// Layout switch with animation
		h +=
			"var layouts={hierarchy:layoutHierarchy,radial:layoutRadial,force:layoutForce,grid:layoutGrid};\n";
		h += "var currentLayout='hierarchy',tweenRaf=null;\n";
		h +=
			"function tweenLayout(target,dur){var start={};Object.keys(pos).forEach(function(k){start[k]={x:pos[k].x,y:pos[k].y}});var t0=performance.now();\n";
		h +=
			"function step(now){var p=Math.min((now-t0)/dur,1);var e=p<.5?2*p*p:(1-Math.pow(-2*p+2,2)/2);\n";
		h += "Object.keys(target).forEach(function(k){if(!pos[k])return;\n";
		h +=
			"pos[k]={x:start[k].x+(target[k].x-start[k].x)*e,y:start[k].y+(target[k].y-start[k].y)*e};\n";
		h +=
			"nodeGroups[k].setAttribute('transform','translate('+(pos[k].x-NW/2)+','+(pos[k].y-NH/2)+')')});\n";
		h +=
			"updateEdges();recalcVB();if(p<1)tweenRaf=requestAnimationFrame(step)}\n";
		h +=
			"if(tweenRaf)cancelAnimationFrame(tweenRaf);tweenRaf=requestAnimationFrame(step)}\n";
		h +=
			"function switchLayout(name){if(!layouts[name]||name===currentLayout)return;currentLayout=name;\n";
		h +=
			"document.querySelectorAll('.layout-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-layout')===name)});\n";
		h += "tweenLayout(layouts[name](),350)}\n";

		// Update edges
		h += "function updateEdges(){edgeEls.forEach(function(path){\n";
		h +=
			"var s=pos[path.getAttribute('data-source')],t=pos[path.getAttribute('data-target')];\n";
		h +=
			"if(!s||!t)return;path.setAttribute('d',edgePath(s,t))});scheduleMinimap()}\n";

		// Node details
		h += "function showDetails(id){var n=nodeById[id];if(!n)return;\n";
		h +=
			"var incoming=edges.filter(function(e){return e.target===id}).length;\n";
		h +=
			"var outgoing=edges.filter(function(e){return e.source===id}).length;\n";
		h += "var ntype=n.type||'file',bc=typeColors[ntype]||typeColors.file;\n";
		h +=
			"var card='<div class=\"detail-card\"><div class=\"detail-id\">'+n.id+'</div>';\n";
		h +=
			"card+='<div class=\"detail-type-badge\" style=\"background:'+bc+'22;color:'+bc+';border:1px solid '+bc+'44\">'+ntype+'</div>';\n";
		h +=
			"if(n.file)card+='<div class=\"detail-row\"><span>File</span><span style=\"font-family:monospace;font-size:11px\">'+n.file+'</span></div>';\n";
		h +=
			"if(n.line)card+='<div class=\"detail-row\"><span>Line</span><span>'+n.line+'</span></div>';\n";
		h +=
			"card+='<div class=\"detail-row\"><span>Incoming</span><span>'+incoming+'</span></div>';\n";
		h +=
			"card+='<div class=\"detail-row\"><span>Outgoing</span><span>'+outgoing+'</span></div></div>';\n";
		h += "document.getElementById('details').innerHTML=card}\n";

		// Cycles
		h += "var cl=document.getElementById('cyclesList');\n";
		h +=
			"if(analysis.cycles.length===0)cl.innerHTML='<li class=\"empty-state\">No cycles detected.</li>';\n";
		h +=
			"else cl.innerHTML=analysis.cycles.map(function(c){return '<li class=\"cycle-item\">'+c.join(' \\u2192 ')+' \\u2192 '+c[0]+'</li>'}).join('');\n";

		// Search (debounced)
		h += "var searchTimer=null;\n";
		h +=
			"document.getElementById('searchInput').addEventListener('input',function(){var q=this.value.toLowerCase();clearTimeout(searchTimer);\n";
		h += "searchTimer=setTimeout(function(){\n";
		h +=
			"document.querySelectorAll('.node-group').forEach(function(g){var i=g.getAttribute('data-id').toLowerCase(),l=g.getAttribute('data-label').toLowerCase();g.style.opacity=(!q||i.indexOf(q)!==-1||l.indexOf(q)!==-1)?'1':'0.1'})\n";
		h +=
			"edgeEls.forEach(function(el){var s=el.getAttribute('data-source').toLowerCase(),t=el.getAttribute('data-target').toLowerCase();el.style.opacity=(!q||s.indexOf(q)!==-1||t.indexOf(q)!==-1)?'1':'0.05'})\n";
		h += "},100)})\n";

		// Filter (type dropdown)
		h +=
			"document.getElementById('typeFilter').addEventListener('change',function(){var t=this.value;\n";
		h +=
			"document.querySelectorAll('.node-group').forEach(function(g){g.style.opacity=(t==='all'||g.getAttribute('data-type')===t)?'1':'0.1')});\n";
		h +=
			"edgeEls.forEach(function(el){var src=el.getAttribute('data-source'),tgt=el.getAttribute('data-target');\n";
		h += "var srcNode=nodeById[src],tgtNode=nodeById[tgt];\n";
		h +=
			"var show=t==='all'||(srcNode&&srcNode.type===t)||(tgtNode&&tgtNode.type===t);el.style.opacity=show?'1':'0.05'})})\n";

		// Layout buttons
		h +=
			"document.querySelectorAll('.layout-btn').forEach(function(btn){btn.addEventListener('click',function(){switchLayout(this.getAttribute('data-layout'))})});\n";
		h +=
			"document.querySelector('.layout-btn[data-layout=hierarchy]').classList.add('active');\n";

		// SSE
		h += "var mt=document.querySelector('meta[name=graph-viz-token]');\n";
		h += "var tk=mt?mt.getAttribute('content'):'';\n";
		h += "if(tk){var es=new EventSource('/events?token='+tk);\n";
		h +=
			"es.onmessage=function(e){try{var d=JSON.parse(e.data);if(d.type==='update')location.reload()}catch(ex){}};\n";
		h +=
			"es.onopen=function(){var el=document.getElementById('live-status');if(el){el.textContent='Live';el.style.color='var(--accent)'}};\n";
		h +=
			"es.onerror=function(){var el=document.getElementById('live-status');if(el){el.textContent='Offline';el.style.color='var(--ink-tertiary)'}}}\n";

		h += "})();\n</script>\n</body>\n</html>";
		return h;
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
