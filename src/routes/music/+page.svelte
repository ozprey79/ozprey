<script>
	import MusicOrbit from './MusicOrbit.svelte';

	let { data } = $props();

	let view = $state('albums');
	let sort = $state('latest');
	let selectedArtist = $state('All');

	const currentItems = $derived(view === 'albums' ? data.albums : data.singles);
	const visibleItems = $derived.by(() => {
		const filtered = selectedArtist === 'All'
			? [...currentItems]
			: currentItems.filter((item) => item.artist === selectedArtist);

		if (sort === 'plays') return filtered.sort((a, b) => b.plays - a.plays);
		if (sort === 'name') return filtered.sort((a, b) => a.title.localeCompare(b.title));
		return filtered.sort((a, b) => b.latestListen - a.latestListen);
	});
	const maxArtistPlays = $derived(Math.max(1, ...data.artists.map((artist) => artist.plays)));

	function selectView(nextView) {
		view = nextView;
		selectedArtist = 'All';
	}

	function formatDate(timestamp) {
		return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short'
		});
	}
</script>

<svelte:head>
	<title>Listening — Ozprey</title>
	<meta name="description" content={`A seven-day orbital study of ${data.profile.username}'s Last.fm scrobbles.`} />
</svelte:head>

<main class="music-page">
	<header class="page-header">
		<h1>Listening</h1>
		<p class="description">Seven days of Spotify listening, traced through Last.fm.</p>
	</header>

	<section class="summary" aria-label="Listening summary">
		<div><strong>{data.summary.scrobbles}</strong><span>scrobbles</span></div>
		<div><strong>{data.summary.albumCount}</strong><span>albums</span></div>
		<div><strong>{data.summary.singleCount}</strong><span>singles</span></div>
	</section>

	<section class="chart-section" aria-labelledby="orbit-heading">
		<div class="section-heading orbit-heading">
			<div>
				<h2 id="orbit-heading">{view === 'albums' ? 'Albums' : 'Singles'}</h2>
				<span>orbit = latest listen · size = plays</span>
			</div>
			<div class="view-switch" aria-label="Choose music view">
				<button class:active={view === 'albums'} onclick={() => selectView('albums')}>Albums</button>
				<button class:active={view === 'singles'} onclick={() => selectView('singles')}>Singles</button>
			</div>
		</div>
		<MusicOrbit
			items={currentItems}
			{view}
			scrobbleCount={data.summary.scrobbles}
			range={data.range}
		/>
	</section>

	<section class="chart-section" aria-labelledby="artist-title">
		<div class="section-heading"><h2 id="artist-title">Artist gravity</h2><span>click to filter</span></div>
		<div class="artist-chart">
			{#each data.artists.slice(0, 16) as artist}
				<button
					class:active={selectedArtist === artist.name}
					onclick={() => selectedArtist = selectedArtist === artist.name ? 'All' : artist.name}
				>
					<span>{artist.name}</span>
					<span class="artist-track"><span style={`width:${(artist.plays / maxArtistPlays) * 100}%`}></span></span>
					<strong>{artist.plays}</strong>
				</button>
			{/each}
		</div>
	</section>

	<section class="collection" aria-labelledby="collection-title">
		<div class="section-heading collection-heading">
			<h2 id="collection-title">{selectedArtist === 'All' ? `The ${view}` : selectedArtist}</h2>
			<label>
				Sort
				<select bind:value={sort}>
					<option value="latest">Latest</option>
					<option value="plays">Most played</option>
					<option value="name">A–Z</option>
				</select>
			</label>
		</div>

		<div class="cover-grid">
			{#each visibleItems as item (item.id)}
				<a class="release" href={item.url} target="_blank" rel="noreferrer">
					{#if item.artwork}
						<img src={item.artwork} alt={`Artwork for ${item.title}`} loading="lazy" />
					{:else}
						<div class="cover-fallback">{item.title}</div>
					{/if}
					<div class="release-meta">
						<div><h3>{item.title}</h3><p>{item.artist}</p></div>
						<span>{item.plays}× · {formatDate(item.latestListen)}</span>
					</div>
				</a>
			{/each}
		</div>

		{#if visibleItems.length === 0}
			<p class="empty-collection">No {view} by this artist appear in the current window.</p>
		{/if}

		      {#if data.summary.totalDurationSeconds}
    <p>🕐 {formatDuration(data.summary.totalDurationSeconds)} listened this week</p>
{/if}
		
	</section>

	<footer>
		Listening data supplied by <a href={data.profile.url} target="_blank" rel="noreferrer">Last.fm ↗</a>.
		{#if data.summary.truncated} This exceptionally busy week is showing the latest 2,000 entries.{/if}
	</footer>
</main>

<style>
	.music-page { width:min(1400px, calc(100% - 40px)); margin:auto; padding:clamp(40px, 1vw, 170px) 0 60px; color:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; }
	.page-header { max-width:1000px; }
	h1 { margin:.08em 0; font-family:var(--mfont); font-size:clamp(4rem, 13vw, 12rem); font-weight:400; line-height:.78; text-transform:uppercase; overflow-wrap:anywhere; }
	.description { max-width:650px; font-family:Gambarino, serif; font-size:clamp(1rem, 2vw, 1.45rem); }
	.summary { display:grid; grid-template-columns:repeat(3, 1fr); gap:1px; margin:clamp(55px, 10vw, 120px) 0; border-block:1px solid currentColor; }
	.summary div { display:flex; flex-direction:column; padding:24px 0; }
	.summary strong { font-family:var(--mfont); font-size:clamp(2.8rem, 7vw, 6rem); font-weight:400; line-height:1; }
	.summary span, .section-heading span, footer { font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; }
	.chart-section, .collection { margin-top:clamp(80px, 12vw, 150px); }
	.section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding-bottom:15px; border-bottom:1px solid currentColor; }
	.orbit-heading > div:first-child { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex:1; }
	h2 { font-family:var(--mfont); font-size:clamp(2.5rem, 6vw, 6rem); font-weight:400; line-height:.9; text-transform:uppercase; }
	.view-switch { display:flex; flex:none; gap:1px; }
	.view-switch button { min-width:90px; padding:10px 14px; color:var(--fill); background:transparent; border:1px solid var(--fill); cursor:pointer; font:inherit; font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; }
	.view-switch button.active { color:var(--bg); background:var(--fill); }
	.artist-chart { display:grid; grid-template-columns:repeat(2, 1fr); column-gap:clamp(25px, 6vw, 90px); }
	.artist-chart button { display:grid; grid-template-columns:minmax(110px, 1fr) 2fr 34px; align-items:center; gap:14px; width:100%; margin:0; padding:15px 0; color:inherit; background:transparent; border:0; border-bottom:1px solid color-mix(in srgb, currentColor 35%, transparent); cursor:pointer; text-align:left; font:inherit; font-size:.78rem; }
	.artist-chart button.active { color:var(--bg); background:var(--fill); padding-inline:10px; }
	.artist-track { height:5px; background:color-mix(in srgb, currentColor 20%, transparent); }
	.artist-track span { display:block; height:100%; background:currentColor; }
	.artist-chart strong { text-align:right; }
	.collection-heading label { display:flex; align-items:center; gap:10px; font-size:.75rem; text-transform:uppercase; }
	select { margin:0; padding:7px 28px 7px 8px; color:var(--bg); background:var(--fill); }
	.cover-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:clamp(24px, 3vw, 48px) clamp(10px, 2vw, 28px); padding-top:30px; }
	.release { color:inherit; text-decoration:none; }
	.release img, .cover-fallback { display:block; width:100%; aspect-ratio:1/1; object-fit:cover; background:color-mix(in srgb, var(--fill) 14%, transparent); transition:transform 220ms ease; }
	.release:hover img, .release:hover .cover-fallback, .release:focus img, .release:focus .cover-fallback { transform:translateY(-7px); }
	.cover-fallback { display:grid; place-items:center; padding:15px; text-align:center; }
	.release-meta { display:flex; justify-content:space-between; gap:8px; padding-top:10px; }
	.release-meta div { min-width:0; }
	.release h3 { overflow:hidden; font-size:.8rem; font-weight:400; text-overflow:ellipsis; white-space:nowrap; }
	.release p { overflow:hidden; margin-top:2px; font-size:.68rem; opacity:.7; text-overflow:ellipsis; white-space:nowrap; }
	.release-meta > span { flex:none; font-size:.64rem; opacity:.7; }
	.empty-collection { padding:30px 0; font-size:.75rem; text-transform:uppercase; }
	footer { margin-top:100px; padding-top:20px; border-top:1px solid currentColor; opacity:.65; line-height:1.7; }
	footer a { color:inherit; }
	@media (max-width:760px) {
		.orbit-heading { align-items:flex-start; flex-direction:column; }
		.orbit-heading > div:first-child { width:100%; }
		.artist-chart { grid-template-columns:1fr; }
	}
	@media (max-width:600px) {
		.summary { grid-template-columns:1fr; }
		.summary div + div { border-top:1px solid color-mix(in srgb, currentColor 35%, transparent); }
		.orbit-heading > div:first-child { align-items:flex-start; flex-direction:column; }
		.view-switch { width:100%; }
		.view-switch button { flex:1; }
		.cover-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); }
	}
	@media (prefers-reduced-motion:reduce) {
		.release img, .cover-fallback { transition:none; }
	}
</style>
