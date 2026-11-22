<script>
	import { onMount } from 'svelte';
	import { reveal, drawRules } from './reveal.js';
	import DirectorChart from './DirectorChart.svelte';
	import LanguageFilter from './LanguageFilter.svelte';
	import CountryMap from './CountryMap.svelte';
	import { hasCountry } from './movieCountries.js';
	import { mapScroll } from './workspaceScroll.js';
	let { movies: yearMovies } = $props();
	let period = $state('2026');
	let allMovies = $state(null);
	let loading = $state(false);
	let creditsLoading = $state(false);
	let loadedCredits = $state(0);
	let loadError = $state('');
	let creditFailures = $state(0);
	let stale = $state(false);
	let controller;
	onMount(() => () => controller?.abort());
	const movies = $derived(period === 'all' ? (allMovies ?? []) : yearMovies);
	async function changePeriod() {
		reset();
		if (period !== 'all' || allMovies !== null || loading) return;
		await loadAllTime();
	}
	async function loadAllTime() {
		controller?.abort();
		controller = new AbortController();
		const signal = controller.signal;
		loading = true; loadError = ''; loadedCredits = 0; creditFailures = 0;
		try {
			const response = await fetch('/movies/archive', { signal });
			if (!response.ok) throw new Error('The heyWatched list could not be loaded.');
			const result = await response.json();
			allMovies = result.movies; stale = result.stale; loading = false; creditsLoading = true;
			let offset = 0;
			do {
				const response = await fetch(`/movies/archive?offset=${offset}`, { signal });
				if (!response.ok) throw new Error('Some director and country details could not be loaded.');
				const batch = await response.json();
				const credits = new Map(batch.credits.filter(item => item.directors !== null).map(item => [item.id, item]));
				allMovies = allMovies.map(movie => credits.has(movie.id) ? { ...movie, directors: credits.get(movie.id).directors, productionCountries: credits.get(movie.id).productionCountries } : movie);
				loadedCredits += batch.credits.length;
				creditFailures += batch.credits.filter(item => item.directors === null).length;
				offset = batch.next;
			} while (offset !== null);
		} catch (error) { if (!signal.aborted) loadError = error.message; }
		finally { if (!signal.aborted) { loading = false; creditsLoading = false; } }
	}
	let query = $state('');
	let genre = $state('');
	let selectedLanguages = $state([]);
	let languageMode = $state('include');
	let decade = $state(null);
	let selectedYear = $state(null);
	let director = $state('');
	let country = $state('');
	let countryName = $state('');
	let showDirectorNames = $state(false);
	let limit = $state(24);
	let landscape = $state(false);
	let listRows = $state(1);
	let listColumns = $state(1);
	let listPage = $state(0);
	onMount(() => {
		const media = window.matchMedia('(orientation: landscape)');
		const update = () => { landscape = media.matches; listPage = 0; };
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	function fitList(node) {
		const observer = new ResizeObserver(() => {
			listRows = Math.max(1, Math.floor(node.clientHeight / 58));
			listColumns = node.clientWidth >= 1000 ? 2 : 1;
		});
		observer.observe(node);
		return { destroy() { observer.disconnect(); } };
	}
	const yearOf = (movie) => Number(movie.releaseDate?.slice(0, 4)) || null;
	const directorsOf = (movie) => movie.directors ?? (movie.director ? movie.director.split(', ') : []);
	const genres = $derived([...new Set(movies.flatMap(movie => movie.genres))].sort());
	const languages = $derived([...new Set(movies.map(movie => movie.language).filter(Boolean))].sort());
	const decades = $derived.by(() => {
		const counts = new Map();
		for (const movie of movies) {
			const year = yearOf(movie);
			if (year) { const bin = Math.floor(year / 10) * 10; counts.set(bin, (counts.get(bin) ?? 0) + 1); }
		}
		return [...counts].sort((a, b) => a[0] - b[0]);
	});
	const chartBins = $derived.by(() => {
		if (decade === null) return decades;
		const counts = new Map();
		for (const movie of movies) {
			const year = yearOf(movie);
			if (year >= decade && year < decade + 10) counts.set(year, (counts.get(year) ?? 0) + 1);
		}
		return Array.from({ length: 10 }, (_, index) => [decade + index, counts.get(decade + index) ?? 0]);
	});
	const peak = $derived(Math.max(1, ...chartBins.map(([, count]) => count)));
	function selectBin(year) {
		if (decade === null) { decade = year; selectedYear = null; }
		else selectedYear = selectedYear === year ? null : year;
		limit = 24;
	}
	function clearDecade() { decade = null; selectedYear = null; limit = 24; }
	function changeLanguage() { director = ''; limit = 24; }
	function matchesLanguage(movie) {
		if (!selectedLanguages.length) return true;
		const selected = selectedLanguages.includes(movie.language);
		return languageMode === 'exclude' ? !selected : selected;
	}
	const directors = $derived.by(() => {
		const counts = new Map();
		for (const movie of movies.filter(matchesLanguage)) for (const name of new Set(directorsOf(movie))) counts.set(name, (counts.get(name) ?? 0) + 1);
		return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([name, count]) => ({ name, count }));
	});
	const matchingMovies = $derived(movies.filter(movie =>
		(!query.trim() || movie.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
		(!genre || movie.genres.includes(genre)) && matchesLanguage(movie) &&
		(decade === null || (yearOf(movie) >= decade && yearOf(movie) < decade + 10)) &&
		(selectedYear === null || yearOf(movie) === selectedYear) &&
		(!director || directorsOf(movie).includes(director))
	));
	const visible = $derived(matchingMovies.filter(movie => hasCountry(movie, country)));
	const pageSize = $derived(listRows * listColumns);
	const pageCount = $derived(Math.max(1, Math.ceil(visible.length / pageSize)));
	const currentPage = $derived(Math.min(listPage, pageCount - 1));
	const displayedMovies = $derived(landscape ? visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : visible.slice(0, limit));
	$effect(() => { visible; listPage = 0; });
	const missingYears = $derived(movies.filter(movie => !yearOf(movie)).length);
	function reset() { query = ''; genre = ''; selectedLanguages = []; languageMode = 'include'; decade = null; selectedYear = null; director = ''; country = ''; countryName = ''; limit = 24; }
	function selectCountry(code, name) { country = code === country ? '' : code; countryName = country ? name : ''; limit = 24; }
</script>

<div class="movie-panel archive-panels" aria-label="Decades and directors">
	<section aria-labelledby="decades-title">
		<div use:drawRules class="heading"><h2 use:reveal id="decades-title">{decade === null ? 'Release decades' : `${decade}s by year`}</h2><label class="period">Collection <select aria-label="Collection period" bind:value={period} onchange={changePeriod}><option value="2026">Year 2026</option><option value="all">All time</option></select></label></div>
		<div class="chart-navigation">
			{#if decade !== null}<button onclick={clearDecade}>← All decades</button><span>Select a year to filter the list</span>
			{:else}<span>Select a decade to explore its years</span>{/if}
		</div>
		{#if chartBins.length}
			<div class="decades" style:--columns={chartBins.length}>
				{#each chartBins as [year, count]}
					<button class="column" class:muted={selectedYear !== null && selectedYear !== year} aria-pressed={selectedYear === year}
						aria-label={`${year}${decade === null ? 's' : ''}: ${count} films`} onclick={() => selectBin(year)}>
						<span class="plot"><span class="stem" class:empty={count === 0} style:height={`${count / peak * 100}%`}>
							{#if count > 0}
								<svg class="bar-fill" width="100%" height="100%" aria-hidden="true">
									<rect width="50%" height="100%" fill="var(--fill)" />
								</svg>
							{/if}
							<span class="count">{count}</span>
						</span></span>
						<span class="tick">{year}{decade === null ? 's' : ''}</span>
					</button>
				{/each}
			</div>
		{:else}<p class="notice">No release years recorded yet.</p>{/if}
		{#if missingYears}<p class="notice">{missingYears} films without a release year remain in the unfiltered list.</p>{/if}
	</section>
	<section aria-labelledby="directors-title">
		<div use:drawRules class="heading directors-heading"><h2 use:reveal id="directors-title">Top 10 directors</h2>
			<div class="director-controls">
				<button class="names-toggle" aria-label={showDirectorNames ? 'Hide director names' : 'Show director names'} title={showDirectorNames ? 'Hide director names' : 'Show director names'} aria-pressed={showDirectorNames} onclick={() => showDirectorNames = !showDirectorNames}>
					<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
						{#if !showDirectorNames}<path d="m3 3 18 18" />{/if}
					</svg>
				</button>
				<LanguageFilter compact {languages} bind:selected={selectedLanguages} bind:mode={languageMode} label="Director languages" onchange={changeLanguage} />
			</div>
		</div>
		{#if period === 'all' && creditsLoading}<p class="notice" role="status">Loading director credits: {loadedCredits} / {allMovies?.length ?? 0}. Counts are updating.</p>{/if}
		{#if period === 'all' && creditFailures}<p class="notice">Director counts exclude {creditFailures} films whose credits are unavailable.</p>{/if}
		<p class="chart-caption">Node size shows film count · drag to explore</p>
		<DirectorChart {directors} selected={director} showNames={showDirectorNames} onselect={(name) => { director = director === name ? '' : name; limit = 24; }} />
	</section>
</div>
<div class="movie-panel country-scroll" use:mapScroll>
	<CountryMap movies={matchingMovies} selected={country} {countryName} loading={loading || creditsLoading} onselect={selectCountry} />
</div>
<section class="movie-panel collection" aria-labelledby="index-title">
	<div use:drawRules class="heading"><h2 use:reveal id="index-title">The list</h2><p aria-live="polite">{visible.length} of {movies.length} films</p></div>
	{#if period === 'all'}
		{#if loading}<p class="notice" role="status">Loading heyWatched…</p>{/if}
		{#if stale}<p class="notice">Showing the last available heyWatched list.</p>{/if}
		{#if loadError}<p class="notice" role="status">{loadError} <button onclick={loadAllTime}>Retry</button></p>{/if}
	{/if}
	<div use:reveal class="filters">
		<input type="search" placeholder="Find a title" aria-label="Find a title" bind:value={query} oninput={() => limit = 24} />
		<select aria-label="Genre" bind:value={genre} onchange={() => limit = 24}><option value="">All genres</option>{#each genres as name}<option value={name}>{name}</option>{/each}</select>
		<LanguageFilter {languages} bind:selected={selectedLanguages} bind:mode={languageMode} label="List languages" onchange={changeLanguage} />
		{#if query || genre || selectedLanguages.length || decade !== null || director || country}<button onclick={reset}>Reset filters</button>{/if}
	</div>
	{#if decade !== null || director || country}
		<div class="active-filters">
			{#if decade !== null}<button onclick={clearDecade} aria-label={`Remove ${decade}s filter`}>{decade}s ×</button>{/if}
			{#if selectedYear !== null}<button onclick={() => { selectedYear = null; limit = 24; }} aria-label={`Remove ${selectedYear} filter`}>{selectedYear} ×</button>{/if}
			{#if director}<button onclick={() => { director = ''; limit = 24; }} aria-label={`Remove ${director} filter`}>{director} ×</button>{/if}
			{#if country}<button onclick={() => selectCountry(country, countryName)} aria-label={`Remove ${countryName} filter`}>{countryName} ×</button>{/if}
		</div>
	{/if}
	{#if visible.length}
		<ul use:drawRules use:fitList class="index" style:--list-rows={listRows} style:--list-columns={listColumns}>
			{#each displayedMovies as movie (movie.id)}
				<li><a use:drawRules href={movie.url} title={movie.title} target="_blank" rel="noreferrer"><span class="dot" aria-hidden="true">✳</span><span use:reveal={{ distance: 24, duration: 650 }} class="title">{movie.title}</span><span class="language">{movie.language}</span><span class="year">{yearOf(movie) ?? '—'}</span><span aria-hidden="true">↗</span></a></li>
			{/each}
		</ul>
		{#if landscape}
			<nav class="list-pagination" aria-label="Film list pages">
				<button disabled={currentPage === 0} onclick={() => listPage = currentPage - 1}>Previous</button>
				<span aria-live="polite">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, visible.length)} of {visible.length}</span>
				<button disabled={currentPage >= pageCount - 1} onclick={() => listPage = currentPage + 1}>Next</button>
			</nav>
		{:else if limit < visible.length}<button class="more" onclick={() => limit += 24}>Show more titles</button>{/if}
	{:else}<p class="notice">No films match these filters.</p>{/if}
</section>

<style>
	.country-scroll { display:flow-root; }
	.directors-heading { flex-wrap:nowrap; align-items:center; gap:12px; }
	.directors-heading h2 { min-width:0; font-size:clamp(1.8rem,2.8vw,3rem); }
	.director-controls { display:flex; align-items:center; gap:3px; flex:none; }
	.names-toggle { display:grid; place-items:center; width:36px; min-height:44px; padding:6px; border:0; color:var(--fill); background:transparent; cursor:pointer; opacity:.65; }
	.names-toggle:hover { opacity:1; }
	.names-toggle[aria-pressed="true"] { color:var(--heart); opacity:1; }
	.names-toggle svg { display:block; width:22px; height:22px; }
	.chart-navigation { display:flex; flex-wrap:wrap; align-items:center; gap:12px; min-height:44px; margin-top:12px; font-size:.85rem; }
	.chart-navigation button { padding:8px 0; color:var(--heart); text-decoration:underline; text-underline-offset:4px; }
	.chart-navigation span, .chart-caption { opacity:.7; font-size:.85rem; }
	.chart-caption { margin-top:16px; }
	.stem.empty { min-height:0; border:0; background:transparent; }
	.period { display:flex; align-items:center; gap:8px; font-size:.85rem; }
	.period select { min-height:44px; padding:8px; border:1px solid currentColor; }
	.archive-panels { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:clamp(24px,4vw,64px); margin-top:64px; }
	section { min-width:0; }
	.heading { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:16px; border-bottom:1px solid currentColor; }
	h2 { margin:0; font:400 clamp(2rem,3.2vw,3.4rem)/1 var(--mfont); }
	.heading p { margin:0; font-size:.85rem; opacity:.7; }
	button, input, select { margin:0; color:inherit; background:transparent; border-radius:0; font:inherit; }
	button, select { cursor:pointer; }
	button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible { outline:2px solid var(--heart); outline-offset:4px; }
	.decades { display:grid; grid-template-columns:repeat(var(--columns),minmax(42px,1fr)); overflow-x:auto; padding:24px 3px 4px; }
	.column { padding:0; border:0; }
	.column.muted { opacity:.4; }
	.column[aria-pressed="true"] { color:var(--heart); }
	.plot { display:flex; align-items:end; justify-content:center; height:270px; padding-top:28px; border-bottom:1px solid color-mix(in srgb,currentColor 30%,transparent); }
	.stem { position:relative; display:block; width:14px; min-height:3px; border:1px solid var(--fill); border-radius:8px 8px 0 0; }
	.bar-fill { display:block; border-radius:inherit; overflow:hidden; }
	.count { position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); font-size:.9rem; }
	.tick { display:block; padding-top:12px; font-size:.8rem; }
	.collection { margin-top:64px; }
	.filters { display:flex; flex-wrap:wrap; gap:10px; margin:24px 0 16px; }
	.filters > *, .more, .active-filters button { min-height:44px; padding:10px 14px; border:1px solid color-mix(in srgb,currentColor 30%,transparent); }
	.filters > input, .filters > select, .filters > button, .period select { border-radius:12px; }
	.active-filters button { border-radius:999px; }
	.filters input { flex:1 1 220px; min-width:0; }
	select { max-width:100%; }
	option { background:var(--bg); color:var(--fill); }
	.active-filters { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; color:var(--heart); }
	.index { list-style:none; padding:0; margin:0; border-top:1px solid color-mix(in srgb,currentColor 30%,transparent); }
	.index a { display:grid; grid-template-columns:auto minmax(0,1fr) auto 3.4em auto; align-items:center; gap:16px; padding:16px 4px; border-bottom:1px solid color-mix(in srgb,currentColor 25%,transparent); color:inherit; text-decoration:none; }
	.title { font-size:clamp(1rem,1.5vw,1.25rem); line-height:1.2; }
	.dot, .index a:hover .title { color:var(--heart); }
	.year { text-align:right; font-variant-numeric:tabular-nums; }
	.language { opacity:.65; font-size:.9rem; }
	.more { margin-top:24px; }
	.notice { margin:24px 0; opacity:.7; }
	@media(max-width:800px) { .archive-panels { grid-template-columns:1fr; gap:40px; } .plot { height:220px; } }
	@media(max-width:540px) { .language { display:none; } .index a { grid-template-columns:auto minmax(0,1fr) 3em auto; gap:10px; } }
	@media(orientation:landscape) {
		.archive-panels { grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); align-content:stretch; gap:clamp(24px,4vw,64px); }
		.archive-panels > section { display:flex; flex-direction:column; min-height:0; }
		.heading { flex:none; padding-bottom:10px; }
		h2, .directors-heading h2 { font-size:clamp(24px,5svh,48px); }
		.directors-heading { flex-wrap:wrap; gap:4px; }
		.chart-navigation { flex:none; margin-top:4px; }
		.chart-caption { flex:none; margin-top:8px; }
		.decades { flex:1; min-height:0; }
		.column { display:flex; flex-direction:column; min-height:0; }
		.plot { flex:1; width:100%; height:auto; min-height:0; }
		.archive-panels :global(svg[aria-label^="Top ten directors"]) { flex:1; min-height:0; height:0; width:100%; }
		.country-scroll :global(.country-section) { height:100%; margin-top:0; }
		.collection { display:flex; flex-direction:column; margin-top:0; }
		.filters { flex:none; margin:10px 0; }
		.filters :global(details) { position:relative; }
		.filters :global(.options-panel) { position:absolute; z-index:5; top:100%; right:0; width:300px; max-height:50svh; overflow-y:auto; background:var(--bg); border:1px solid currentColor; border-radius:12px; }
		.index { flex:1; min-height:0; display:grid; grid-template-columns:repeat(var(--list-columns),minmax(0,1fr)); grid-template-rows:repeat(var(--list-rows),minmax(0,1fr)); grid-auto-flow:column; column-gap:32px; }
		.index li { min-height:0; }
		.index a { height:100%; min-height:0; gap:10px; padding:8px 4px; }
		.title { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; font-size:1rem; }
		.active-filters { flex:none; margin-bottom:8px; }
		.notice { flex:none; margin:8px 0; }
		.list-pagination { display:flex; flex:none; align-items:center; justify-content:space-between; gap:12px; margin-top:8px; font-size:.85rem; }
		.list-pagination button { min-height:36px; padding:6px 12px; border:1px solid color-mix(in srgb,currentColor 30%,transparent); border-radius:8px; }
		.list-pagination button:disabled { opacity:.35; cursor:default; }
	}
</style>
