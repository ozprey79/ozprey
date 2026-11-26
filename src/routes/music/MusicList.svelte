<script>
	import { onMount } from 'svelte';
	import MinimalSelect from '../movies/MinimalSelect.svelte';
	let { data } = $props();
	let source = $state('');
	let view = $state('singles');
	let query = $state('');
	let artist = $state('');
	let sort = $state('plays');
	let limit = $state(24);
	let page = $state(0);
	let rows = $state(1);
	let columns = $state(1);
	let landscape = $state(false);
	const selectedSource = $derived(source || (data.lastfmUnavailable ? 'musicolet' : 'lastfm'));
	const items = $derived(selectedSource === 'musicolet' ? data.musicolet.tracks : view === 'albums' ? data.albums : data.singles);
	const artists = $derived([...new Set(items.map(item => item.artist).filter(Boolean))].sort());
	const visible = $derived.by(() => {
		const search = query.trim().toLocaleLowerCase();
		return items.filter(item => (!artist || item.artist === artist) && (!search || `${item.title} ${item.artist} ${item.album}`.toLocaleLowerCase().includes(search)))
			.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'latest' ? b.latestListen - a.latestListen : b.plays - a.plays || a.title.localeCompare(b.title));
	});
	const pageSize = $derived(rows * columns);
	const pageCount = $derived(Math.max(1, Math.ceil(visible.length / pageSize)));
	const currentPage = $derived(Math.min(page, pageCount - 1));
	const displayed = $derived(landscape ? visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : visible.slice(0, limit));
	$effect(() => { visible; page = 0; limit = 24; });
	onMount(() => {
		const media = window.matchMedia('(orientation: landscape)');
		const update = () => { landscape = media.matches; page = 0; };
		update(); media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	function fitList(node) {
		const observer = new ResizeObserver(() => {
			rows = Math.max(1, Math.floor(node.clientHeight / 64));
			columns = node.clientWidth >= 1000 ? 2 : 1;
		});
		observer.observe(node);
		return { destroy() { observer.disconnect(); } };
	}
	function changeSource(event) { source = event.currentTarget.value; artist = ''; sort = 'plays'; }
	function changeView() { artist = ''; }
	function reset() { query = ''; artist = ''; sort = 'plays'; }
	const number = new Intl.NumberFormat('en-IN');
	function date(timestamp) {
		return timestamp ? new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '';
	}
</script>

<section class="movie-panel collection" aria-labelledby="list-heading">
	<header class="heading"><h2 id="list-heading">The list</h2><p aria-live="polite">{number.format(visible.length)} {selectedSource === 'lastfm' && view === 'albums' ? 'albums' : 'tracks'} · {selectedSource === 'lastfm' ? 'Last.fm / 7 days' : 'Musicolet archive'}</p></header>
	<div class="filters">
		<input type="search" aria-label="Search music" placeholder="Search tracks, artists, albums…" bind:value={query} />
		<MinimalSelect label="Music list source" value={selectedSource} onchange={changeSource}><option value="lastfm">Last.fm</option><option value="musicolet">Musicolet</option></MinimalSelect>
		{#if selectedSource === 'lastfm'}<MinimalSelect label="Music list view" bind:value={view} onchange={changeView}><option value="singles">Singles</option><option value="albums">Albums</option></MinimalSelect>{/if}
		<MinimalSelect label="Filter music by artist" bind:value={artist} maxWidth="240px"><option value="">All artists</option>{#each artists as name}<option value={name}>{name}</option>{/each}</MinimalSelect>
		<MinimalSelect label="Sort music" bind:value={sort}><option value="plays">Most played</option>{#if selectedSource === 'lastfm'}<option value="latest">Latest</option>{/if}<option value="name">A–Z</option></MinimalSelect>
		{#if query || artist}<button class="reset" onclick={reset}>Reset</button>{/if}
	</div>
	{#if selectedSource === 'lastfm' && data.lastfmUnavailable}<p class="notice" role="status">Last.fm is temporarily unavailable. Choose Musicolet to browse the offline library.</p>{/if}
	<ol class="index" use:fitList style:--list-rows={rows} style:--list-columns={columns}>
		{#each displayed as item, index}
			<li>
				{#snippet details()}
					<span class="rank">{String((landscape ? currentPage * pageSize : 0) + index + 1).padStart(2, '0')}</span>
					<span class="release"><span class="title">{item.title}</span><span class="artist">{item.artist || 'Unknown artist'}{item.album && item.album !== item.title ? ` · ${item.album}` : ''}</span></span>
					{#if selectedSource === 'lastfm'}<span class="date">{date(item.latestListen)}</span>{/if}
					<span class="plays">{number.format(item.plays)}<span> {item.plays === 1 ? 'play' : 'plays'}</span></span>
				{/snippet}
				{#if item.url}<a class="release-row" href={item.url} target="_blank" rel="noreferrer">{@render details()}</a>{:else}<div class="release-row offline">{@render details()}</div>{/if}
			</li>
		{:else}<li class="empty">No music matches this selection.</li>{/each}
	</ol>
	{#if landscape}
		<div class="pagination"><button disabled={currentPage === 0} onclick={() => page = currentPage - 1}>Previous</button><span aria-live="polite">{currentPage + 1} / {pageCount}</span><button disabled={currentPage >= pageCount - 1} onclick={() => page = currentPage + 1}>Next</button></div>
	{:else if visible.length > limit}<button class="more" onclick={() => limit += 24}>Show more</button>{/if}
</section>

<style>
	.collection { margin-top:80px; }
	.heading { display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:12px; padding-bottom:16px; border-bottom:1px solid currentColor; }
	h2 { font:400 clamp(2.5rem,6vw,6rem)/.9 var(--mfont); text-transform:uppercase; }
	.heading p { font-size:.9rem; opacity:.65; }
	.filters { display:flex; flex-wrap:wrap; align-items:center; gap:10px 20px; margin:24px 0 16px; font-size:.9rem; }
	.filters input { flex:1 1 220px; min-width:0; min-height:44px; padding:10px 14px; border:1px solid color-mix(in srgb,currentColor 30%,transparent); border-radius:12px; }
	button, input { margin:0; background:transparent; color:inherit; font:inherit; }
	button { cursor:pointer; }
	button:focus-visible, input:focus-visible, a:focus-visible { outline:2px solid var(--heart); outline-offset:3px; }
	.index { list-style:none; padding:0; margin:0; border-top:1px solid color-mix(in srgb,currentColor 30%,transparent); }
	.release-row { display:grid; grid-template-columns:3ch minmax(0,1fr) auto 6em; align-items:center; gap:16px; padding:12px 4px; border-bottom:1px solid color-mix(in srgb,currentColor 25%,transparent); color:inherit; text-decoration:none; }
	.release-row.offline { grid-template-columns:3ch minmax(0,1fr) 6em; }
	.release { display:flex; flex-direction:column; min-width:0; gap:3px; }
	.title { font-size:1rem; line-height:1.2; }
	.artist { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.875rem; opacity:.6; }
	.rank { color:var(--heart); font-size:.875rem; font-variant-numeric:tabular-nums; }
	.date { font-size:.875rem; opacity:.65; }
	.plays { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
	.plays > span { margin-left:.25em; font-size:.875rem; opacity:.65; }
	a:hover .title { color:var(--heart); }
	.empty, .notice { padding:20px 0; opacity:.7; font-size:1rem; }
	.more, .reset, .pagination button { min-height:40px; padding:8px 14px; border:1px solid color-mix(in srgb,currentColor 30%,transparent); border-radius:8px; }
	.more { margin-top:24px; }
	.pagination { display:flex; flex:none; align-items:center; justify-content:space-between; gap:12px; margin-top:12px; font-size:.9rem; }
	.pagination button:disabled { opacity:.35; cursor:default; }
	@media(max-width:540px) { .date { display:none; } .release-row, .release-row.offline { grid-template-columns:2.5ch minmax(0,1fr) auto; gap:10px; } .filters { gap:4px 12px; } }
	@media(orientation:landscape) {
		.collection { display:flex; flex-direction:column; }
		h2 { font-size:clamp(2rem,6svh,4.4rem); }
		.heading { flex:none; padding-bottom:10px; }
		.filters { flex:none; margin:10px 0; }
		.index { flex:1; min-height:0; display:grid; grid-template-columns:repeat(var(--list-columns),minmax(0,1fr)); grid-template-rows:repeat(var(--list-rows),minmax(0,1fr)); grid-auto-flow:column; column-gap:32px; }
		.index li { min-height:0; }
		.release-row { height:100%; min-height:0; padding:6px 4px; }
		.title { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
	}
</style>
