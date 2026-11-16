<script>
	import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force';
	let { directors, selected = '', onselect = () => {} } = $props();
	let nodes = $state([]);
	let simulation;
	let drag = null;
	let suppressClick = false;
	let svg = $state();
	$effect(() => {
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		const max = Math.max(1, ...directors.map(d => d.count));
		const min = Math.min(max, ...directors.map(d => d.count));
		// Spread the observed counts across a readable area range; ties remain equal.
		const radius = count => max === min ? 52 : Math.sqrt(34 ** 2 + (count - min) / (max - min) * (72 ** 2 - 34 ** 2));
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
	<svg bind:this={svg} viewBox="0 0 600 370" role="group" aria-label="Top ten directors by film count. Select to filter the list, or drag the circles.">
		{#each nodes as node (node.name)}
			<foreignObject x={node.x - node.r} y={node.y - node.r} width={node.r * 2} height={node.r * 2}>
				<button style:--label-size={`${Math.max(10, Math.min(14, node.r / 4))}px`} style:--count-size={`${Math.max(18, node.r / 2)}px`} class:active={selected === node.name} aria-pressed={selected === node.name} aria-label={`${node.name}: ${node.count} films`}
					onpointerdown={event => start(event, node.name)} onpointermove={move} onpointerup={end} onpointercancel={end} onlostpointercapture={end}
					onclick={event => { if (!suppressClick || event.detail === 0) onselect(node.name); suppressClick = false; }}>
					<span>{node.name}</span><strong>{node.count}</strong>
				</button>
			</foreignObject>
		{/each}
	</svg>
{:else}<p>No director credits available for this selection.</p>{/if}

<style>
	svg { display:block; width:100%; overflow:visible; margin-top:12px; }
	button { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; width:100%; height:100%; padding:8px; margin:0; border:1px solid currentColor; border-radius:50%; background:color-mix(in srgb,var(--heart) 7%,var(--bg)); color:var(--fill); cursor:grab; touch-action:none; user-select:none; font-family:var(--bfont); }
	button:active { cursor:grabbing; }
	button:hover, button.active { color:var(--bg); background:var(--heart); border-color:var(--heart); }
	button:focus-visible { outline:3px solid var(--heart); outline-offset:-5px; }
	span { font-size:var(--label-size,13px); line-height:1.1; text-align:center; overflow-wrap:anywhere; }
	strong { font-size:var(--count-size,25px); line-height:1; font-weight:400; font-variant-numeric:tabular-nums; }
	p { margin-top:24px; opacity:.7; }
</style>
