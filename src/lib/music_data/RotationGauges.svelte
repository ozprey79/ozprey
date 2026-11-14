<script>
	let { rankings, metric, format, totalTime, formatDuration, plays, formatCount } = $props();
	let active = $state(null);
	const tooltipId = $props.id();
	let tooltipName = $state(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
	const tooltip = $derived(segments.find((segment) => segment.name === tooltipName));
	function showTooltip(event, segment) {
		const box = event.currentTarget.getBoundingClientRect();
		tooltipX = 'clientX' in event && event.clientX ? event.clientX : box.left + box.width / 2;
		tooltipY = 'clientY' in event && event.clientY ? event.clientY : box.bottom;
		active = tooltipName = segment.name;
	}
	function hideTooltip() { active = tooltipName = null; }
	function placeTooltip(element, position) {
		function update({ x, y }) {
			const { width, height } = element.getBoundingClientRect();
			element.style.left = `${Math.max(12, Math.min(x + 16, window.innerWidth - width - 12))}px`;
			element.style.top = `${Math.max(12, y + height + 28 > window.innerHeight ? y - height - 16 : y + 16)}px`;
		}
		update(position);
		return { update };
	}
	let visible = $state(false);
	let displayedTime = $state(null);
	const total = $derived(rankings.reduce((sum, [, value]) => sum + value, 0));
	let inViewport = $state(false);
	let paused = $state(false);
	const segments = $derived(rankings.map(([name, value], index) => {
		const angle = (-90 + index * 360 / rankings.length) * Math.PI / 180;
		return { name, value, index,
			x: 280 + 218 * Math.cos(angle), y: 280 + 218 * Math.sin(angle),
			radius: 12 + 22 * Math.sqrt(value / (rankings[0]?.[1] || 1)),
			color: index === 0 ? 'var(--heart)' : index === 9 ? 'var(--fill)' : `color-mix(in srgb, var(--heart) ${100 * (1 - index / 9)}%, var(--fill))`
		};
	}));
	function reveal(element) {
		const observer = new IntersectionObserver((entries) => {
			inViewport = entries.some((entry) => entry.isIntersecting);
			if (inViewport) visible = true;
		}, { rootMargin: '0px 0px -24px 0px' });
		observer.observe(element);
		return { destroy: () => observer.disconnect() };
	}
	$effect(() => {
		if (!visible) return;
		const target = totalTime;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (motion.matches) { displayedTime = target; return; }
		let frame;
		const start = performance.now();
		const animate = (now) => {
			const progress = Math.min(1, (now - start) / 1100);
			const eased = progress * progress * (3 - 2 * progress);
			displayedTime = target * eased;
			if (progress < 1) frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frame);
	});
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') hideTooltip(); }} onscroll={hideTooltip} onresize={hideTooltip} />

{#if tooltip}
	<div class="chart-tooltip" id={tooltipId} role="tooltip" use:placeTooltip={{ x: tooltipX, y: tooltipY }}>
		<p class="tooltip-rank">On repeat / {String(tooltip.index + 1).padStart(2, '0')}</p>
		<p class="tooltip-name">{tooltip.name}</p>
		<div class="tooltip-data"><strong>{format(tooltip.value)}</strong><span>{metric === 'plays' ? 'plays' : 'listening time'}</span></div>
		<p class="tooltip-share">{(tooltip.value / total * 100).toFixed(1)}% of the top ten</p>
	</div>
{/if}

<figure class:visible use:reveal aria-label="Top ten listening breakdown">
	<div class="dial">
		<svg viewBox="0 0 560 560" role="group" aria-label={`Top ${rankings.length} by ${metric === 'plays' ? 'plays' : 'estimated listening time'}. Ten orbiting balls represent the rankings. Larger totals have larger balls; color blends from cyan at rank one to cream at rank ten.`}>
			<circle class="guide" cx="280" cy="280" r="218" />
			<g class="orbit" class:running={inViewport && !paused && active === null}>
			{#each segments as segment (segment.name)}
				<circle cx={segment.x} cy={segment.y} r={segment.radius} class="ball" role="button" tabindex="0"
					aria-label={`${segment.name}: ${format(segment.value)}`} aria-describedby={tooltipName === segment.name ? tooltipId : undefined}
					onpointerenter={(event) => showTooltip(event, segment)} onpointerleave={hideTooltip}
					onfocus={(event) => showTooltip(event, segment)} onblur={hideTooltip}
					onclick={(event) => showTooltip(event, segment)}
					onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showTooltip(event, segment); } }}
					class:highlight={active === segment.name}
					class:muted={active !== null && active !== segment.name}
					style:--ball-color={segment.color}>
				</circle>
			{/each}
			</g>
		</svg>
		<div class="center" aria-label={`${formatCount(plays)} plays. Total estimated listening time: ${formatDuration(totalTime)}`}>
			<p class="eyebrow">{formatCount(plays)} plays</p>
			<p class="duration" aria-hidden="true">{formatDuration(displayedTime ?? totalTime)}</p>
			<p class="sub">Total estimated listening</p>
		</div>
		<button class="orbit-toggle" type="button" aria-pressed={paused} onclick={() => paused = !paused}>{paused ? 'Resume orbit' : 'Pause orbit'}</button>
	</div>
	<figcaption>
		<p class="legend-heading">On repeat <span>Top {rankings.length}</span></p>
		<ol>
			{#each segments as segment (segment.name)}
				<li>
					<button type="button" onpointerenter={(event) => showTooltip(event, segment)} onpointerleave={hideTooltip}
						onfocus={(event) => showTooltip(event, segment)} onblur={hideTooltip}
						onclick={(event) => showTooltip(event, segment)} aria-describedby={tooltipName === segment.name ? tooltipId : undefined}
						class:selected={active === segment.name} aria-label={`${segment.index + 1}. ${segment.name}: ${format(segment.value)}`}>
						<span class="rank" style:color={segment.color}>{String(segment.index + 1).padStart(2, '0')}</span>
						<span class="name">{segment.name}</span><span class="value">{format(segment.value)}</span>
					</button>
				</li>
			{:else}<li class="empty">No results for this measure.</li>{/each}
		</ol>
		<p class="explanation">One ball per entry; larger totals have larger balls. Rank 1 starts in cyan and blends toward cream at rank 10.</p>
	</figcaption>
</figure>

<style>
	.chart-tooltip { position: fixed; z-index: 100; width: min(300px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow: auto; padding: 20px 22px; background: var(--bg); color: var(--fill); border: 1px solid color-mix(in srgb, var(--fill) 28%, transparent); border-top: 2px solid var(--heart); box-shadow: 0 12px 32px #0005; pointer-events: none; animation: tooltip-in 180ms cubic-bezier(.65, 0, .35, 1); }
	.tooltip-rank { color: var(--heart); font-size: .65rem; letter-spacing: .14em; text-transform: uppercase; }
	.tooltip-name { font-family: var(--mfont), serif; font-size: 1.9rem; line-height: 1.1; overflow-wrap: anywhere; margin: 10px 0 18px; }
	.tooltip-data { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; border-top: 1px solid color-mix(in srgb, var(--fill) 18%, transparent); padding-top: 10px; }
	.tooltip-data strong { font-size: 1.15rem; font-weight: 400; font-variant-numeric: tabular-nums; }
	.tooltip-data span, .tooltip-share { font-size: .75rem; opacity: .6; }
	.tooltip-share { margin-top: 6px; }
	.ball { cursor: pointer; }
	.ball:focus-visible { outline: none; stroke: var(--heart); filter: drop-shadow(0 0 3px var(--heart)); }
	@keyframes tooltip-in { from { opacity: 0; } to { opacity: 1; } }
	@media (prefers-reduced-motion: reduce) { .chart-tooltip { animation: none; } }

	figure { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: clamp(24px, 5vw, 70px); align-items: center; margin: 24px 0; }
	.dial { position: relative; min-width: 0; }
	svg { display: block; width: 100%; overflow: visible; }
	.guide { fill: none; stroke: color-mix(in srgb, var(--fill) 16%, transparent); stroke-width: 1; }
	.orbit { transform-origin: 280px 280px; animation: revolve 48s linear infinite; animation-play-state: paused; }
	.orbit.running { animation-play-state: running; }
	svg:hover .orbit, svg:focus-within .orbit { animation-play-state: paused; }
	.ball { fill: var(--ball-color); stroke: var(--bg); stroke-width: 2; transition: opacity 240ms ease, r 600ms cubic-bezier(.65, 0, .35, 1), fill 400ms ease; }
	.ball.highlight { stroke: var(--fill); stroke-width: 3; }
	.ball.muted { opacity: .35; }
	.orbit-toggle { display: block; width: auto; margin: 0 auto; padding: 8px 12px; border: 1px solid color-mix(in srgb, var(--fill) 25%, transparent); font-size: .65rem; text-transform: uppercase; letter-spacing: .12em; }
	.center { position: absolute; inset: 26% 18%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; pointer-events: none; }
	.eyebrow, .sub, .legend-heading, .rank { font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; }
	.eyebrow { color: var(--heart); }
	.duration { font-family: var(--mfont), serif; font-size: clamp(2rem, 4.4vw, 4.4rem); font-weight: 400; line-height: 1.1; margin: 14px 0; font-variant-numeric: tabular-nums; }
	.sub { opacity: .6; font-size: .65rem; }
	.legend-heading { display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid currentColor; }
	.legend-heading span { opacity: .5; }
	ol { list-style: none; }
	button { display: grid; grid-template-columns: 2ch minmax(0, 1fr) auto; gap: 14px; width: 100%; text-align: left; align-items: baseline; padding: 12px 0; border-bottom: 1px solid color-mix(in srgb, var(--fill) 16%, transparent); cursor: pointer; }
	.rank { opacity: 1; font-variant-numeric: tabular-nums; }
	.name { overflow-wrap: anywhere; font-size: 1rem; }
	.value { font-size: .9rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
	button.selected .name { color: var(--heart); }
	button:focus-visible { outline: 1px solid var(--heart); outline-offset: 4px; }
	.explanation { margin-top: 16px; opacity: .6; font-size: .85rem; line-height: 1.5; }
	.empty { padding: 20px 0; }
	@keyframes revolve { to { transform: rotate(360deg); } }
	@media (max-width: 760px) { figure { grid-template-columns: 1fr; gap: 8px; } .dial { width: min(100%, 520px); margin: auto; } .duration { font-size: clamp(2rem, 8vw, 4.4rem); } }
	@media (prefers-reduced-motion: reduce) { .orbit { animation: none; } .ball { transition: none; } .orbit-toggle { display: none; } }
</style>
