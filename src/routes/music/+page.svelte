<script>
	import Panels from '../movies/MoviePanels.svelte';
	import DiscoPanel from '$lib/music_data/DiscoPanel.svelte';
	import MinimalSelect from '../movies/MinimalSelect.svelte';
	import Vinyl from './Vinyl.svelte';
	import MusicOrbit from './MusicOrbit.svelte';
	import MusicoletPanel from './MusicoletPanel.svelte';
	import MusicList from './MusicList.svelte';
	import { reveal, drawRules } from '../movies/reveal.js';
	let { data } = $props();
	let view = $state('albums');
	const items = $derived(view === 'albums' ? data.albums : data.singles);
	const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
	const totals = $derived.by(() => {
		const tracks = data.musicolet.tracks;
		return {
			plays: tracks.reduce((sum, track) => sum + track.plays, 0),
			hours: tracks.reduce((sum, track) => sum + track.plays * track.durationMs, 0) / 3600000,
			songs: tracks.length,
			albums: new Set(tracks.map(track => track.album.trim().normalize('NFKC').toLocaleLowerCase('en')).filter(Boolean)).size
		};
	});
</script>

<svelte:head>
	<title>Music — Ozprey</title>
	<meta name="description" content="A listening journal in plays and hours. Last.fm scrobbles, the vinyl collection, and the Musicolet archive." />
</svelte:head>

<main class="music-page">
	<Panels ready={true} labels={['Music', 'Vinyl & orbit', 'Musicolet', 'The list']} panelLabel="Music panels">
		<div class="movie-panel film-intro music-intro" aria-label="Music title and listening totals">
			<DiscoPanel hero />
			<footer class="summary-bar" use:drawRules>
				<dl class="summary" aria-label="Musicolet listening totals">
					<div use:reveal={{ distance: 16 }}><dt>Play count</dt><dd>{number.format(totals.plays)}</dd></div>
					<div use:reveal={{ distance: 16 }}><dt>Listening hours</dt><dd aria-label={totals.plays && !totals.hours ? 'Listening hours unavailable' : `${number.format(totals.hours)} estimated listening hours`}>{totals.plays && !totals.hours ? 'Unavailable' : `${number.format(totals.hours)}h`}</dd></div>
					<div use:reveal={{ distance: 16 }}><dt>Songs played</dt><dd>{number.format(totals.songs)}</dd></div>
					<div use:reveal={{ distance: 16 }}><dt>Albums played</dt><dd>{number.format(totals.albums)}</dd></div>
				</dl>
				<hr class="summary-rule" use:reveal={{ kind: 'line', duration: 1000 }} />
			</footer>
		</div>
		<div class="movie-panel listening-panel" aria-label="Vinyl and Last.fm orbit">
			{#if data.lastfmUnavailable}<p class="notice" role="status">Last.fm is temporarily unavailable. The Musicolet archive is still here.</p>{/if}
			<div class="listening-workspace">
				<Vinyl tracks={data.singles} />
				<section class="orbit-panel" aria-labelledby="orbit-heading">
					<div class="section-heading"><h2 id="orbit-heading">In orbit</h2><MinimalSelect label="Last.fm orbit view" bind:value={view}><option value="albums">Albums</option><option value="singles">Singles</option></MinimalSelect></div>
					<MusicOrbit {items} {view} scrobbleCount={data.summary.scrobbles} range={data.range} />
					<p class="source">Seven days of listening via <a href={data.profile.url} target="_blank" rel="noreferrer">Last.fm</a>. Orbit = latest listen · size = plays.{#if data.summary.truncated} Showing the latest 2,000 entries.{/if}</p>
				</section>
			</div>
		</div>
		<MusicoletPanel data={data.musicolet} />
		<MusicList {data} />
	</Panels>
</main>

<style>
	.music-page { width:min(1400px,calc(100% - 40px)); margin:auto; padding-bottom:60px; color:var(--fill); font-family:var(--bfont); }
	.music-intro { display:grid; grid-template-rows:minmax(0,1fr) auto; height:100svh; }
	.summary-bar { border-top:1px solid currentColor; }
	.summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin:0; text-align:center; }
	.summary div { display:flex; flex-direction:column-reverse; gap:8px; padding-block:20px 12px; }
	.summary dt { font-size:.875rem; letter-spacing:.06em; text-transform:uppercase; }
	.summary dd { margin:0; font:400 clamp(2.25rem,6vw,5.5rem)/1.05 var(--mfont); font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
	.summary-rule { width:100%; margin:12px 0 0; border:0; border-top:1px solid currentColor; transform-origin:left center; }
	@media(max-width:600px) and (orientation:portrait) {
		.summary { grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 16px; }
		.summary div { gap:4px; padding-block:10px; }
		.summary dd { font-size:clamp(2rem,9vw,3rem); }
		.summary dt { font-size:.875rem; }
	}
	.listening-panel { margin-top:64px; }
	.listening-workspace { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,3fr); gap:clamp(24px,3vw,48px); align-items:start; }
	.listening-workspace > :global(*) { min-width:0; }
	.listening-workspace :global(.vinyl-panel) { width:100%; margin-top:0; padding-top:0; border-top:0; }
	.listening-workspace :global(.vinyl-panel header) { padding-bottom:15px; border-bottom:1px solid currentColor; }
	.listening-workspace :global(.vinyl-panel header p), .listening-workspace :global(.vinyl-panel header > span) { display:none; }
	.listening-workspace :global(.vinyl-panel h2), h2 { font:400 clamp(2.5rem,4.5vw,4.4rem)/.9 var(--mfont); text-transform:uppercase; }
	.listening-workspace :global(.stage) { height:clamp(280px,30vw,460px); }
	.section-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; padding-bottom:10px; border-bottom:1px solid currentColor; }
	.notice { margin-bottom:20px; font-size:1rem; opacity:.7; }
	.source { margin-top:12px; font-size:.875rem; opacity:.65; line-height:1.5; }
	.source a { color:inherit; }
	@media(max-width:800px) and (orientation:portrait) { .listening-workspace { grid-template-columns:1fr; gap:64px; } }
	@media(orientation:landscape) {
		.music-page { width:100%; padding:0; }
		.music-intro { height:100%; }
		.summary div { padding-block:clamp(8px,1.5svh,16px) 8px; }
		.summary dd { font-size:clamp(2rem,8svh,5.5rem); }
		.listening-panel { display:flex; flex-direction:column; }
		.listening-workspace { flex:1; min-height:0; align-items:stretch; }
		.listening-workspace :global(.vinyl-panel) { display:flex; flex-direction:column; min-height:0; }
		.listening-workspace :global(.vinyl-panel h2), h2 { font-size:clamp(2rem,6svh,4.4rem); }
		.listening-workspace :global(.track-select) { flex:none; margin-top:12px; font-size:.875rem; }
		.listening-workspace :global(.stage) { flex:1; height:0; min-height:0; }
		.listening-workspace :global(.tools) { flex:none; font-size:.75rem; padding-block:8px; }
		.listening-workspace :global(.track-meta) { flex:none; padding-top:10px; font-size:1rem; }
		.orbit-panel { display:flex; flex-direction:column; min-height:0; }
		.orbit-panel :global(.orbit-controls) { flex:none; padding-block:10px; }
		.orbit-panel :global(.orbit-stage) { flex:1; min-height:0; display:flex; flex-direction:column; }
		.orbit-panel :global(.orbit-stage > svg) { flex:1; min-height:0; height:0; width:100%; }
		.orbit-panel :global(.plays-legend) { position:static; flex:none; justify-content:center; padding-top:8px; }
	}
</style>
