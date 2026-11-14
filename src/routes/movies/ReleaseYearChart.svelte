<script>
	let { movies } = $props();
	let activeYear = $state(null);
	const distribution = $derived.by(() => {
		const counts = new Map();
		for (const movie of movies) {
			const year = Number(movie.releaseDate?.match(/^(\d{4})-/)?.[1]);
			if (Number.isInteger(year) && year > 0) counts.set(year, (counts.get(year) ?? 0) + 1);
		}
		const years = [...counts.keys()];
		if (!years.length) return [];
		const first = Math.min(...years);
		return Array.from({ length: Math.max(...years) - first + 1 }, (_, index) => {
			const year = first + index;
			return { year, count: counts.get(year) ?? 0 };
		});
	});
	const peak = $derived(Math.max(1, ...distribution.map((row) => row.count)));
	const selected = $derived(distribution.find((row) => row.year === activeYear));
	const missing = $derived(movies.length - distribution.reduce((sum, row) => sum + row.count, 0));
</script>

{#if distribution.length}
	<div class="chart-readout" aria-live="polite">
		{#if selected}
			<span class="year">{selected.year}</span>
			<span>{selected.count} {selected.count === 1 ? 'film' : 'films'}</span>
		{:else}
			<span>Each bar is a release year</span><span>Peak: {peak} {peak === 1 ? 'film' : 'films'}</span>
		{/if}
	</div>
	<div class="chart-scroll" role="region" aria-label="Films by release year">
		<div class="chart" style={`--years:${distribution.length}`}>
			<div class="bars">
				{#each distribution as row (row.year)}
					<button
						class:active={activeYear === row.year}
						style={`--height:${100 * row.count / peak}%`}
						aria-label={`${row.year}: ${row.count} ${row.count === 1 ? 'film' : 'films'}`}
						onpointerenter={() => activeYear = row.year}
						onfocus={() => activeYear = row.year}
						onclick={() => activeYear = row.year}
					><span class="bar"></span></button>
				{/each}
			</div>
			<div class="axis" aria-hidden="true">
				<span>{distribution[0].year}</span>
				{#if distribution.length > 1}<span>{distribution[distribution.length - 1].year}</span>{/if}
			</div>
		</div>
	</div>
	{#if missing}<p class="note">{missing} {missing === 1 ? 'film has' : 'films have'} no recorded release year.</p>{/if}
{:else}
	<p class="note">No release years recorded yet.</p>
{/if}

<style>
	.chart-readout { display:flex; align-items:baseline; justify-content:space-between; gap:16px; min-height:52px; padding-top:20px; font-size:1rem; }
	.year { font-variant-numeric:tabular-nums; }
	.chart-scroll { overflow-x:auto; padding:8px 3px; }
	.chart { min-width:calc(var(--years) * 10px); }
	.bars { display:grid; grid-template-columns:repeat(var(--years), minmax(0, 1fr)); height:clamp(180px, 24vw, 300px); gap:3px; border-bottom:1px solid color-mix(in srgb, var(--fill) 35%, transparent); }
	button { display:flex; align-items:flex-end; width:100%; height:100%; min-width:0; margin:0; padding:0; border:0; border-radius:0; background:transparent; color:var(--fill); cursor:pointer; }
	.bar { display:block; width:100%; height:var(--height); min-height:1px; background:currentColor; opacity:.65; border-radius:2px 2px 0 0; transition:opacity 180ms ease; }
	button:hover .bar, button.active .bar, button:focus-visible .bar { opacity:1; }
	button:focus-visible { outline:1px solid var(--fill); outline-offset:2px; }
	.axis { display:flex; justify-content:space-between; padding-top:12px; font-family:var(--mfont), serif; font-size:clamp(1.4rem, 3vw, 2rem); font-variant-numeric:tabular-nums; }
	.note { margin-top:20px; font-size:1rem; opacity:.7; }
	@media (prefers-reduced-motion:reduce) { .bar { transition:none; } }
</style>
