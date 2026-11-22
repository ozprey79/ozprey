<script module>
	import { geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
	import world from '$lib/data/world-countries.json';

	const width = 1000;
	const height = 520;
	const projection = geoEqualEarth().fitExtent([[16, 12], [width - 16, height - 12]], { type: 'Sphere' });
	const path = geoPath(projection);
	const outline = path({ type: 'Sphere' });
	const graticule = path(geoGraticule10());
	const regions = world.features.map(feature => ({
		...feature.properties,
		path: path(feature)
	}));
	// These film-producing territories are too small for the 1:110m boundaries.
	const smallCountries = [
		{ code: 'HK', name: 'Hong Kong', coordinates: [114.17, 22.32] },
		{ code: 'SG', name: 'Singapore', coordinates: [103.82, 1.35] },
		{ code: 'MO', name: 'Macao', coordinates: [113.54, 22.20] },
		{ code: 'MT', name: 'Malta', coordinates: [14.38, 35.94] }
	].map(country => ({ ...country, point: projection(country.coordinates) }));
</script>

<script>
	import { onMount } from 'svelte';
	import { reveal, drawRules } from './reveal.js';
	import { countryCounts } from './movieCountries.js';

	let { movies, selected = '', countryName = '', loading = false, onselect = () => {} } = $props();
	let hovered = $state(null);
	let showNotes = $state(true);
	onMount(() => {
		const media = window.matchMedia('(orientation: landscape)');
		const update = () => showNotes = !media.matches;
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	const countries = $derived(countryCounts(movies));
	const counts = $derived(new Map(countries.map(country => [country.code, country])));
	const peak = $derived(Math.max(1, ...countries.map(country => country.count)));
	const known = $derived(movies.filter(movie => movie.productionCountries?.length).length);
	const missing = $derived(movies.length - known);
	const detail = $derived(hovered ? { ...hovered, count: counts.get(hovered.code)?.count ?? 0 }
		: selected ? { code: selected, name: countryName, count: counts.get(selected)?.count ?? 0 } : null);
	const alphabetical = $derived([...countries].sort((a, b) => a.name.localeCompare(b.name)));
	const mapCodes = new Set([...regions, ...smallCountries].map(region => region.code));
	const unplotted = $derived(countries.filter(country => !mapCodes.has(country.code)).length);

	function fill(code) {
		const count = counts.get(code)?.count ?? 0;
		return count ? `color-mix(in srgb, var(--heart) ${18 + 82 * count / peak}%, var(--bg))`
			: 'color-mix(in srgb, var(--fill) 8%, var(--bg))';
	}
	function selectRegion(region) {
		if (counts.has(region.code)) onselect(region.code, counts.get(region.code).name);
	}
	function keySelect(event, region) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectRegion(region);
		}
	}
	function chooseCountry(event) {
		const code = event.currentTarget.value;
		onselect(code, counts.get(code)?.name ?? '');
	}
	const label = (region) => `${counts.get(region.code)?.name ?? region.name}: ${counts.get(region.code)?.count ?? 0} films`;
</script>

<section class="country-section" aria-labelledby="countries-title" aria-busy={loading}>
	<div use:drawRules class="heading">
		<h2 use:reveal id="countries-title">A world of films</h2>
		<p>{countries.length} {countries.length === 1 ? 'country' : 'countries'} · {known} {known === 1 ? 'film' : 'films'}</p>
	</div>
	<div class="map-intro">
		<p>Films by production country. Select a country to explore the list.</p>
		<label class="country-select">Country
			<select aria-label="Filter films by production country" value={selected} onchange={chooseCountry}>
				<option value="">All countries</option>
				{#if selected && !counts.has(selected)}<option value={selected}>{countryName} (0)</option>{/if}
				{#each alphabetical as country (country.code)}<option value={country.code}>{country.name} ({country.count})</option>{/each}
			</select>
		</label>
	</div>
	<div class="map-frame">
		<svg class="world-map" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="World map of films by production country" aria-describedby="country-map-note">
			<path class="ocean" d={outline} />
			<path class="graticule" d={graticule} />
			{#each regions as region (region.code)}
				<path class="region" class:available={counts.has(region.code)} class:selected={selected === region.code}
					class:dimmed={selected && selected !== region.code} d={region.path} fill={fill(region.code)}
					role="button" tabindex={counts.has(region.code) ? 0 : -1} aria-label={label(region)}
					aria-disabled={!counts.has(region.code)} aria-pressed={selected === region.code}
					onpointerenter={() => hovered = region} onpointerleave={() => hovered = null}
					onfocus={() => hovered = region} onblur={() => hovered = null}
					onclick={() => selectRegion(region)} onkeydown={(event) => keySelect(event, region)}>
					<title>{label(region)}</title>
				</path>
			{/each}
			{#each smallCountries.filter(region => counts.has(region.code)) as region (region.code)}
				<circle class="region marker available" class:selected={selected === region.code}
					class:dimmed={selected && selected !== region.code} cx={region.point[0]} cy={region.point[1]} r="4"
					fill={fill(region.code)} role="button" tabindex="0" aria-label={label(region)} aria-pressed={selected === region.code}
					onpointerenter={() => hovered = region} onpointerleave={() => hovered = null}
					onfocus={() => hovered = region} onblur={() => hovered = null}
					onclick={() => selectRegion(region)} onkeydown={(event) => keySelect(event, region)}>
					<title>{label(region)}</title>
				</circle>
			{/each}
		</svg>
		<div class="map-footer">
			<div class="country-detail" aria-live="polite" aria-atomic="true">
				{#if detail}<span class="country-name">{detail.name}</span><span>{detail.count} {detail.count === 1 ? 'film' : 'films'}</span>
				{:else}<span>Across borders, on screen.</span>{/if}
			</div>
			<div class="legend" aria-label={`Linear color scale: 0 to ${peak} films`}>
				<span class="zero-swatch"></span><span>0</span><span class="color-ramp"></span><span>{peak} {peak === 1 ? 'film' : 'films'}</span>
			</div>
		</div>
	</div>
	{#if countries.length}
		<div class="country-leaders" aria-label="Countries with the most films">
			<span>Most watched from</span>
			{#each countries.slice(0, 5) as country (country.code)}
				<button aria-pressed={selected === country.code} onclick={() => onselect(country.code, country.name)}>{country.name}<span>{country.count}</span></button>
			{/each}
			{#if selected}<button class="clear" onclick={() => onselect('', '')}>Clear country ×</button>{/if}
		</div>
	{:else if !loading}<p class="notice">{movies.length ? 'No production countries are available for these films.' : 'No films match the current filters.'}</p>{/if}
	<details class="map-notes" bind:open={showNotes}>
	<summary>About this map{missing ? ` · ${missing} films without country data` : ''}</summary>
	<div class="notes-content">
	<p class="map-note" id="country-map-note">Color intensity shows film count, from fewer to more. Co-productions count once in each country. Counts follow the collection and list filters.</p>
	{#if loading}<p class="notice" role="status">Loading movie details. Country counts update as they arrive.</p>
	{:else if missing}<p class="notice">{missing} {missing === 1 ? 'film has' : 'films have'} no available production-country data.</p>{/if}
	{#if unplotted}<p class="notice">{unplotted} {unplotted === 1 ? 'country is' : 'countries are'} outside this map’s resolution. Use the country selector to explore {unplotted === 1 ? 'it' : 'them'}.</p>{/if}
	<p class="source">Country data: <a href="https://developer.themoviedb.org/reference/movie-details" target="_blank" rel="noreferrer">TMDB</a> · Map: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a></p>
	</div>
	</details>
</section>

<style>
	.country-section { margin-top:64px; min-width:0; }
	.heading { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:16px; border-bottom:1px solid currentColor; }
	h2 { margin:0; font:400 clamp(2rem,3.2vw,3.4rem)/1 var(--mfont); }
	.heading p { margin:0; font-size:.85rem; opacity:.7; }
	.map-intro { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin:18px 0; font-size:.85rem; }
	.map-intro p { margin:0; opacity:.7; }
	.country-select { display:flex; align-items:center; gap:8px; }
	select, button { color:inherit; background:transparent; font:inherit; }
	select { min-height:44px; padding:8px 12px; max-width:260px; border:1px solid color-mix(in srgb,currentColor 30%,transparent); border-radius:12px; cursor:pointer; }
	option { background:var(--bg); color:var(--fill); }
	.map-frame { background:transparent; }
	.world-map { display:block; width:100%; height:auto; overflow:visible; }
	.ocean { fill:var(--bg); stroke:color-mix(in srgb,var(--fill) 18%,transparent); stroke-width:.8; }
	.graticule { fill:none; stroke:color-mix(in srgb,var(--fill) 7%,transparent); stroke-width:.6; pointer-events:none; }
	.region { stroke:var(--bg); stroke-width:.7; stroke-linejoin:round; vector-effect:non-scaling-stroke; transition:fill 200ms,opacity 200ms; }
	.region.available { cursor:pointer; }
	.region.dimmed { opacity:.38; }
	.region.available:hover, .region.selected, .region:focus-visible { opacity:1; stroke:var(--fill); stroke-width:1.5; outline:none; }
	.marker { stroke:var(--fill); stroke-width:1; }
	.map-footer { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding:12px 4px 2px; font-size:.85rem; }
	.country-detail { display:flex; align-items:baseline; flex-wrap:wrap; gap:12px; min-height:24px; }
	.country-detail > span:last-child { opacity:.7; }
	.country-name { font-size:1rem; }
	.legend { display:flex; align-items:center; gap:8px; font-variant-numeric:tabular-nums; font-size:.75rem; }
	.zero-swatch { width:12px; height:12px; background:color-mix(in srgb,var(--fill) 8%,var(--bg)); border:1px solid color-mix(in srgb,var(--fill) 25%,transparent); }
	.color-ramp { width:clamp(75px,12vw,150px); height:10px; margin-left:6px; background:linear-gradient(to right,color-mix(in srgb,var(--heart) 18%,var(--bg)),var(--heart)); }
	.country-leaders { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:18px; font-size:.8rem; }
	.country-leaders > span { margin-right:6px; opacity:.6; }
	.country-leaders button { display:flex; align-items:center; gap:12px; min-height:44px; padding:8px 14px; border:1px solid color-mix(in srgb,currentColor 25%,transparent); border-radius:999px; cursor:pointer; }
	.country-leaders button span { opacity:.65; font-variant-numeric:tabular-nums; }
	.country-leaders button:hover, .country-leaders button[aria-pressed="true"], .clear { color:var(--heart); }
	select:focus-visible, button:focus-visible, a:focus-visible { outline:2px solid var(--heart); outline-offset:4px; }
	.map-note, .notice, .source { margin:12px 0 0; font-size:.8rem; line-height:1.5; opacity:.65; }
	.source { font-size:.7rem; }
	.source a { color:inherit; text-underline-offset:3px; }
	.map-notes > summary { display:none; }
	@media(orientation:landscape) {
		.country-section { display:flex; flex-direction:column; min-height:0; }
		.heading { flex:none; padding-bottom:10px; }
		h2 { font-size:clamp(24px,5svh,48px); }
		.map-intro { flex:none; margin:8px 0; }
		.map-frame { display:flex; flex:1; min-height:0; flex-direction:column; }
		.world-map { flex:1; min-height:0; height:0; width:100%; }
		.map-footer { flex:none; padding-top:6px; }
		.country-leaders { flex:none; flex-wrap:nowrap; overflow-x:auto; margin-top:8px; }
		.country-leaders > span, .country-leaders button { flex:none; white-space:nowrap; }
		.country-leaders button { min-height:36px; padding:6px 10px; }
		.map-notes { position:relative; flex:none; margin-top:6px; font-size:.8rem; }
		.map-notes > summary { display:list-item; width:fit-content; padding:4px 0; cursor:pointer; opacity:.7; }
		.notes-content { position:absolute; z-index:5; bottom:100%; left:0; width:min(600px,100%); max-height:50svh; overflow-y:auto; padding:12px 16px; border:1px solid color-mix(in srgb,var(--fill) 30%,transparent); border-radius:12px; background:var(--bg); }
	}
	@media(max-width:540px) { .map-intro { align-items:flex-start; } .country-select { width:100%; } select { flex:1; min-width:0; max-width:none; } .map-footer { gap:8px; } .legend { margin-left:auto; } }
	@media(orientation:landscape) and (max-height:500px) {
		.country-section { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,.65fr); grid-template-rows:auto minmax(0,1fr) auto auto; gap:8px 20px; }
		.heading { grid-column:1 / -1; }
		.map-frame { grid-column:1; grid-row:2 / 4; }
		.map-intro { grid-column:2; grid-row:2; flex-direction:column; align-items:stretch; justify-content:center; margin:0; }
		.country-select select { flex:1; min-width:0; max-width:100%; }
		.country-leaders { grid-column:2; grid-row:3; margin:0; }
		.map-notes { grid-column:1 / -1; grid-row:4; margin:0; }
		.map-footer { font-size:.75rem; gap:4px; }
	}
	@media(prefers-reduced-motion:reduce) { .region { transition:none; } }
</style>
