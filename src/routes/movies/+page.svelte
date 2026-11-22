<script>
	import { onMount, tick } from 'svelte';
	import { reveal, drawRules } from './reveal.js';
	import OrbitChart from './OrbitChart.svelte';
	import { abacusEntrance } from './abacusEntrance.js';
	import { workspaceScroll } from './workspaceScroll.js';
	import MovieArchive from './MovieArchive.svelte';
	import JewelCase from './JewelCase.svelte';
	import FilmTitle from './FilmTitle.svelte';
	import MoviePanels from './MoviePanels.svelte';

	let { data } = $props();
	let titleComplete = $state(false);
	function revealSummary(node, ready) {
		let animations = [];
		function update(complete) {
			if (!complete || animations.length) return;
			animations = [...Array.from(node.children, child => reveal(child, { distance: 16 })), drawRules(node)];
		}
		update(ready);
		return { update, destroy() { animations.forEach(animation => animation.destroy?.()); } };
	}

	let selectedMovieId = $state(null);
	const latestMovie = $derived(data.movies.reduce((latest, movie) =>
		movie.watchedDate && (!latest?.watchedDate || movie.watchedDate >= latest.watchedDate)
			? movie : latest, null) ?? data.movies.at(-1) ?? null);
	const selectedMovie = $derived(data.movies.find(movie => movie.id === selectedMovieId) ?? latestMovie);
	let selectedPanel = $state();
	async function selectMovie(movie) {
		selectedMovieId = movie.id;
		await tick();
		if (window.matchMedia('(orientation: landscape), (min-width: 1100px)').matches) return;
		selectedPanel?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
	}

	const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
	let summaryPeriod = $state('2026');
	let allTimeTotals = $state(null);
	let totalsLoading = $state(false);
	let totalsError = $state('');
	let totalsProcessed = $state(0);
	let totalsController;
	onMount(() => () => totalsController?.abort());
	const totals = $derived(summaryPeriod === 'all' ? allTimeTotals : data.watchTotals);
	const hoursLoading = $derived(summaryPeriod === 'all' && totalsLoading);
	async function loadTotals() {
		if (summaryPeriod !== 'all' || totalsLoading || (allTimeTotals && !totalsError)) return;
		totalsController = new AbortController();
		const signal = totalsController.signal;
		totalsLoading = true;
		totalsError = '';
		totalsProcessed = 0;
		try {
			const read = async (path) => {
				const response = await fetch(path, { signal });
				if (!response.ok) throw new Error('Could not load all-time totals.');
				return response.json();
			};
			allTimeTotals = { ...await read('/movies/totals'), minutes: 0, missing: 0 };
			let offset = 0;
			do {
				const batch = await read(`/movies/totals?offset=${offset}`);
				allTimeTotals = { ...allTimeTotals, minutes: allTimeTotals.minutes + batch.minutes, missing: allTimeTotals.missing + batch.missing };
				totalsProcessed += batch.processed;
				offset = batch.next;
			} while (offset !== null);
		} catch (error) {
			if (!signal.aborted) totalsError = error.message;
		} finally {
			if (!signal.aborted) totalsLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Films</title>
	<meta name="description" content="A film journal in watched films and hours." />
</svelte:head>

<main class="movies-page">
	<MoviePanels ready={titleComplete}>
	<div class="movie-panel film-intro" aria-label="Film title and watching totals">
	<FilmTitle oncomplete={() => titleComplete = true} />
	<dl use:revealSummary={titleComplete} class="summary" class:pending={!titleComplete} aria-hidden={!titleComplete} aria-label={`Watching totals: ${summaryPeriod === 'all' ? 'all time' : '2026'}`} aria-live="polite" aria-busy={hoursLoading}>
		<div><dt>Movies + series watched</dt><dd>{totals ? number.format(totals.movies + totals.series) : '—'}</dd>
			{#if totals}<span class="summary-breakdown">{number.format(totals.movies)} movies · {number.format(totals.series)} series</span>{/if}
		</div>
		<div><dt>Total watch hours</dt><dd>{hoursLoading ? 'Calculating…' : !totals || (summaryPeriod === 'all' && totalsError) || (totals.movies + totals.series > 0 && totals.missing === totals.movies + totals.series) ? 'Unavailable' : `${number.format(totals.minutes / 60)}h`}</dd></div>
	</dl>
	</div>
	{#if titleComplete}
	<div class="movie-panel workspace-panel" aria-label="Disc and abacus">
	{#if hoursLoading}
		<p class="summary-note" role="status">Loading watch time{allTimeTotals ? `: ${number.format(totalsProcessed)} of ${number.format(allTimeTotals.total)} titles` : '…'}</p>
	{:else if summaryPeriod === 'all' && totalsError}
		<p class="summary-note" role="status">{totalsError} <button class="totals-retry" onclick={loadTotals}>Retry</button></p>
	{:else if totals?.missing}
		<p class="summary-note">Watch time excludes {number.format(totals.missing)} {totals.missing === 1 ? 'title' : 'titles'} with no recorded runtime.</p>
	{/if}
	{#if totals?.series}<p class="summary-note">Series hours are estimated using all aired episodes, assuming each series was watched in full.</p>{/if}
	{#if summaryPeriod === 'all' && allTimeTotals?.stale}<p class="summary-note">Showing the last available watched archive.</p>{/if}

	<div use:workspaceScroll class="film-workspace">
	<div id="selected-film" bind:this={selectedPanel} style="scroll-margin-top:90px">
		{#if selectedMovie}
			<JewelCase movie={selectedMovie} />
		{:else}
			<p style="margin-top:24px;opacity:.65">Select a bead to see its movie on disc.</p>
		{/if}
	</div>

	<section use:abacusEntrance class="chart-section abacus-panel" aria-labelledby="orbit-heading">
		<div use:drawRules class="section-heading">
			<h2 use:reveal id="orbit-heading">Films</h2>
			<label class="summary-period">Period <select aria-label="Watching totals period" bind:value={summaryPeriod} onchange={loadTotals}><option value="2026">2026</option><option value="all">All time</option></select></label>
		</div>
		<OrbitChart movies={data.movies} {selectedMovie} onselect={selectMovie} />
	</section>

	</div>
	</div>
	<MovieArchive movies={data.movies} />
	{/if}
	</MoviePanels>
</main>

<style>
/* *{border: 1px solid red;} */
 .film-workspace { margin-top:46px; padding-bottom:24px; }
 @media(min-width:1100px) {
  .film-workspace { display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:clamp(24px,3vw,48px);align-items:start; }
  .film-workspace > * { min-width:0; }
  .film-workspace .abacus-panel { margin-top:0; }
  .film-workspace :global(.disc-panel) { width:100%;margin:0; }
  .film-workspace :global(.stage) { height:clamp(300px,29vw,420px); }
  .film-workspace :global(.disc-panel h2), .abacus-panel h2 { font-size:clamp(42px,4.5vw,70px);margin-top:0; }
 }

	/* Page layout and responsive presentation. */

	.movies-page { width:min(1400px, calc(100% - 40px)); margin:auto; padding:0 0 60px; color:var(--fill); font-family:var(--bfont); }
	.film-intro { display:grid; grid-template-rows:minmax(0, 1fr) auto; height:100svh; }

	.summary { text-align:center; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; margin:0; border-block:1px solid currentColor; }
	.summary.pending { visibility:hidden; }
	.summary div { padding-block:20px; }
	.summary dt { font-size:.86rem; letter-spacing:.09em; text-transform:uppercase; }
	.summary dd { margin:0; font-family:var(--mfont); font-size:clamp(2.25rem, 6vw, 5.5rem); font-weight:400; line-height:1.05; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
	.summary-note { margin-top:12px; font-size:.85rem; opacity:.7; text-align:center; }
	.summary-breakdown { display:block; margin-top:8px; font-size:.85rem; opacity:.7; }
	.summary-period { display:flex; align-items:center; flex-shrink:0; gap:8px; margin:0; font-size:.8rem; }
	.summary-period select { min-height:36px; padding:5px 28px 5px 10px; border:0px solid color-mix(in srgb,currentColor 30%,transparent); border-radius:8px; background:transparent; color:inherit; font:inherit; cursor:pointer; }
	.summary-period option { background:var(--bg); color:var(--fill); }
	.summary-period select:focus-visible, .totals-retry:focus-visible { outline:0px solid var(--heart); outline-offset:4px; }
	.totals-retry { border:0; background:transparent; color:inherit; font:inherit; text-decoration:underline; cursor:pointer; }
	.chart-section { margin-top:clamp(80px, 12vw, 150px); }
	.section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding-bottom:15px; border-bottom:1px solid currentColor; }

	h2 { text-align: center;font-family:var(--mfont); font-size:clamp(2.5rem, 6vw, 6rem); font-weight:400; line-height:.9; text-transform:uppercase; }

	@media (max-width:700px) { .summary { grid-template-columns:1fr; } }
	@media (orientation:landscape) {
		.movies-page { width:100%; padding:0; }
		.film-intro { height:100%; }
		.workspace-panel { display:flex; flex-direction:column; }
		.film-workspace { flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,2fr) minmax(0,3fr); gap:clamp(20px,3vw,48px); align-items:stretch; margin-top:0; padding-bottom:0; }
		.film-workspace > * { min-width:0; min-height:0; }
		.film-workspace .abacus-panel { display:flex; flex-direction:column; margin-top:0; }
		.film-workspace :global(.disc-panel) { display:grid; grid-template-rows:auto minmax(0,1fr) auto; width:100%; height:100%; min-height:0; margin:0; }
		.film-workspace :global(.disc-panel header) { padding-bottom:10px; }
		.film-workspace :global(.movie-details) { display:none; }
		.film-workspace :global(.disc-panel footer) { padding-top:10px; }
		.film-workspace :global(.disc-panel footer > span) { font-size:clamp(24px,4.5svh,44px); overflow-wrap:anywhere; }
		.film-workspace :global(.stage) { height:100%; min-height:0; margin:0; width:100%; }
		.abacus-panel .section-heading { flex:none; padding-bottom:10px; }
		.abacus-panel :global(.abacus-controls) { flex:none; padding-block:8px; }
		.abacus-panel :global(.abacus-stage) { flex:1; min-height:0; display:flex; flex-direction:column; width:100%; }
		.abacus-panel :global(.abacus-stage > svg) { flex:1; min-height:0; height:0; width:100%; }
		.abacus-panel :global(.runtime-legend) { flex:none; margin-top:8px; }
		.film-workspace :global(.disc-panel h2), .abacus-panel h2 { font-size:clamp(32px,6svh,70px); margin-top:0; }
		.summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
		.summary div { padding-block:clamp(10px,2svh,20px); }
		.summary dd { font-size:clamp(2.25rem,10svh,5.5rem); }
		.summary-note { margin:0 0 12px; }
	}
</style>
