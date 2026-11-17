<script>
	import { tick } from 'svelte';
	import { reveal, drawRules } from './reveal.js';
	import OrbitChart from './OrbitChart.svelte';
	import MovieArchive from './MovieArchive.svelte';
	import JewelCase from './JewelCase.svelte';
	import FilmTitle from './FilmTitle.svelte';

	let { data } = $props();
	let titleComplete = $state(false);

	let selectedMovieId = $state(null);
	const latestMovie = $derived(data.movies.reduce((latest, movie) =>
		movie.watchedDate && (!latest?.watchedDate || movie.watchedDate >= latest.watchedDate)
			? movie : latest, null) ?? data.movies.at(-1) ?? null);
	const selectedMovie = $derived(data.movies.find(movie => movie.id === selectedMovieId) ?? latestMovie);
	let selectedPanel = $state();
	async function selectMovie(movie) {
		selectedMovieId = movie.id;
		await tick();
		if (window.matchMedia('(min-width: 1100px)').matches) return;
		selectedPanel?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
	}

	const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
	const totalWatchHours = $derived(data.movies.reduce((sum, movie) => sum + (movie.runtime || 0), 0) / 60);
	const missingRuntimes = $derived(data.movies.filter((movie) => !movie.runtime).length);
</script>

<svelte:head>
	<title>Films</title>
	<meta name="description" content="A film journal in watched films and hours." />
</svelte:head>

<main class="movies-page">
	<FilmTitle oncomplete={() => titleComplete = true} />
	{#if titleComplete}
	<dl use:drawRules class="summary" aria-label="Watching totals">
		<div use:reveal><dt>Films watched</dt><dd>{number.format(data.movies.length)}</dd></div>
		<div use:reveal><dt>Total watch hours</dt><dd>{data.movies.length && missingRuntimes === data.movies.length ? 'Unavailable' : `${number.format(totalWatchHours)}h`}</dd></div>
	</dl>
	{#if missingRuntimes}
		<p class="summary-note">Watch time excludes {number.format(missingRuntimes)} {missingRuntimes === 1 ? 'film' : 'films'} with no recorded runtime.</p>
	{/if}

	<div class="film-workspace">
	<div id="selected-film" bind:this={selectedPanel} style="scroll-margin-top:90px">
		{#if selectedMovie}
			<JewelCase movie={selectedMovie} />
		{:else}
			<p style="margin-top:24px;opacity:.65">Select a bead to see its movie on disc.</p>
		{/if}
	</div>

	<section class="chart-section abacus-panel" aria-labelledby="orbit-heading">
		<div use:drawRules class="section-heading"><h2 use:reveal id="orbit-heading">Films</h2></div>
		<OrbitChart movies={data.movies} {selectedMovie} onselect={selectMovie} />
	</section>

	</div>
	<MovieArchive movies={data.movies} />
	{/if}
</main>

<style>
 .film-workspace { margin-top:46px; }
 @media(min-width:1100px) {
  .film-workspace { display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:clamp(24px,3vw,48px);align-items:start; }
  .film-workspace > * { min-width:0; }
  .film-workspace .abacus-panel { margin-top:0; }
  .film-workspace :global(.disc-panel) { width:100%;margin:0; }
  .film-workspace :global(.stage) { height:clamp(300px,29vw,420px); }
  .film-workspace :global(.disc-panel h2), .abacus-panel h2 { font-size:clamp(42px,4.5vw,70px);margin-top:0; }
 }

	/* Page layout and responsive presentation. */

	.movies-page { width:min(1400px, calc(100% - 40px)); margin:auto; padding:clamp(12vmin, 1vw, 170px) 0px 60px; color:var(--fill); font-family:var(--bfont); margin-top: 50px;}

	.summary { text-align:center; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; margin:0; border-block:1px solid currentColor; }
	.summary div { padding-block:20px; }
	.summary dt { font-size:.86rem; letter-spacing:.09em; text-transform:uppercase; }
	.summary dd { margin:0; font-family:var(--mfont); font-size:clamp(2.25rem, 6vw, 5.5rem); font-weight:400; line-height:1.05; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
	.summary-note { margin-top:12px; font-size:.85rem; opacity:.7; text-align:center; }
	.chart-section { margin-top:clamp(80px, 12vw, 150px); }
	.section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding-bottom:15px; border-bottom:1px solid currentColor; }

	h2 { text-align: center;font-family:var(--mfont); font-size:clamp(2.5rem, 6vw, 6rem); font-weight:400; line-height:.9; text-transform:uppercase; }

	@media (max-width:700px) { .summary { grid-template-columns:1fr; } }
</style>
