<script>
	import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force';
	let { directors, selected = '', onselect = () => {} } = $props();
	let nodes = $state([]);
	const shapeId = $props.id();
	// Left-facing fish silhouette, mirrored from the reference; palette stays theme-driven.
	const nodeShape = 'M 2 128 C 12 107 61 70 104 70 C 142 70 178 89 202 108 C 211 94 241 81 254 82 C 245 98 236 116 236 128 C 236 140 245 158 254 168 C 239 169 211 157 202 143 C 175 164 141 182 104 182 C 62 182 13 151 2 128 Z';
	const fishEye = 'M 49 110 A 7 7 0 1 0 35 110 A 7 7 0 1 0 49 110 Z';
	let simulation;
	let drag = null;
	let suppressClick = false;
	let svg = $state();
	$effect(() => {
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		const max = Math.max(1, ...directors.map(d => d.count));
		const min = Math.min(max, ...directors.map(d => d.count));
		// Spread the observed counts across a readable area range; ties remain equal.
		const radius = count => max === min ? 52 : Math.sqrt(46 ** 2 + (count - min) / (max - min) * (78 ** 2 - 46 ** 2));
		drag = null;
		const points = directors.map((d, i) => ({ ...d, r: radius(d.count),
			x: 300 + Math.cos(i * 2.4) * 140, y: 185 + Math.sin(i * 2.4) * 90 }));
		const publish = () => {
			for (const d of points) { d.x = Math.max(d.r + 3, Math.min(597 - d.r, d.x)); d.y = Math.max(d.r + 3, Math.min(367 - d.r, d.y)); }
			nodes = points.map(d => ({ ...d }));
		};
		simulation = forceSimulation(points).force('x', forceX(300).strength(.035)).force('y', forceY(185).strength(.055))
			.force('collision', forceCollide(d => d.r + 4).iterations(4)).on('tick', publish);
		const settle = () => { if (reduced.matches) { simulation.stop(); simulation.tick(180); publish(); } };
		publish(); settle();
		reduced.addEventListener('change', settle);
		return () => { simulation.stop(); reduced.removeEventListener('change', settle); };
	});
	function position(event) {
		const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
		return point.matrixTransform(svg.getScreenCTM().inverse());
	}
	function start(event, name) {
		if (event.button !== 0) return;
		const node = simulation.nodes().find(d => d.name === name);
		drag = { node, x: event.clientX, y: event.clientY };
		suppressClick = false;
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	function move(event) {
		if (!drag) return;
		if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5 && !suppressClick) return;
		suppressClick = true;
		const p = position(event); const d = drag.node;
		d.fx = Math.max(d.r + 3, Math.min(597 - d.r, p.x)); d.fy = Math.max(d.r + 3, Math.min(367 - d.r, p.y));
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			simulation.stop(); simulation.tick(30); nodes = simulation.nodes().map(d => ({ ...d }));
		} else simulation.alphaTarget(.15).restart();
	}
	function end() {
		if (!drag) return;
		drag.node.fx = null; drag.node.fy = null; drag = null; simulation.alphaTarget(0);
	}
</script>

{#if directors.length}
	<svg bind:this={svg} viewBox="0 0 600 370" role="group" aria-label="Top ten directors by film count. Select to filter the list, or drag the shapes.">
		<defs>
			<clipPath id={`${shapeId}-clip`} clipPathUnits="objectBoundingBox"><path d={nodeShape} transform="scale(0.00390625)" /></clipPath>
			<linearGradient id={`${shapeId}-gradient`} x1="0%" y1="0%" x2="100%" y2="15%">
				<stop offset="0%" stop-color="var(--heart)" />
				<stop offset="40%" stop-color="color-mix(in srgb, var(--heart) 48%, var(--bg))" />
				<stop offset="100%" stop-color="var(--bg)" />
			</linearGradient>
			<filter id={`${shapeId}-grain`} x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
				<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="12" result="noise" />
				<feColorMatrix in="noise" type="saturate" values="0" result="mono" />
				<feComponentTransfer in="mono" result="grain">
					<feFuncA type="linear" slope=".35" />
				</feComponentTransfer>
				<feBlend in="SourceGraphic" in2="grain" mode="soft-light" result="textured" />
				<feComposite in="textured" in2="SourceAlpha" operator="in" />
			</filter>
		</defs>
		{#each nodes as node (node.name)}
			<g class="director-node" class:active={selected === node.name} transform={`translate(${node.x - node.r} ${node.y - node.r})`}>
				<path class="node-surface" d={`${nodeShape} ${fishEye}`} fill-rule="evenodd" transform={`scale(${node.r * 2 / 256})`} fill={`url(#${shapeId}-gradient)`} filter={`url(#${shapeId}-grain)`} />

			<foreignObject width={node.r * 2} height={node.r * 2} clip-path={`url(#${shapeId}-clip)`}>
				<button style:--label-size={`${Math.max(9, Math.min(13, node.r / 5))}px`} style:--count-size={`${Math.max(14, Math.min(24, node.r / 3))}px`} class:active={selected === node.name} aria-pressed={selected === node.name} aria-label={`${node.name}: ${node.count} films`}
					onpointerdown={event => start(event, node.name)} onpointermove={move} onpointerup={end} onpointercancel={end} onlostpointercapture={end}
					onclick={event => { if (!suppressClick || event.detail === 0) onselect(node.name); suppressClick = false; }}>
					<span>{node.name}</span><strong>{node.count}</strong>
				</button>
			</foreignObject>
			</g>
		{/each}
	</svg>
{:else}<p>No director credits available for this selection.</p>{/if}

<style>
	svg { display:block; width:100%; overflow:visible; margin-top:12px; }
	button { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; width:100%; height:100%; padding:0 26% 0 12%; margin:0; border:0; border-radius:0; background:transparent; color:var(--fill); cursor:grab; touch-action:none; user-select:none; font-family:var(--bfont); text-shadow:0 1px 3px #000,0 0 5px #0008; }
	button:active { cursor:grabbing; }
	button:hover, button:focus-visible, button.active { color:var(--fill); background:transparent; }
	.node-surface { stroke:var(--fill); pointer-events:none; opacity:.8; }
	.director-node:hover .node-surface, .director-node:focus-within .node-surface, .director-node.active .node-surface { opacity:1; }
	.director-node:focus-within span, .director-node.active span { text-decoration:underline; text-underline-offset:3px; }
	button:focus-visible { outline:none; }
	span { color:inherit; font-size:var(--label-size,13px); line-height:1.1; text-align:center; overflow-wrap:anywhere; }
	strong { font-size:var(--count-size,25px); line-height:1; font-weight:400; font-variant-numeric:tabular-nums; }
	p { margin-top:24px; opacity:.7; }
</style>
