<script>
	import { onMount, tick } from 'svelte';

	let { id, onchange = () => {} } = $props();
	let card;
	let movie = $state(null);
	let details = $state(null);
	let posterFailed = $state(false);
	let metadataLoading = $state(false);
	let left = $state(0);
	let top = $state(0);
	let anchor;
	let openTimer;
	let closeTimer;
	let request;
	let version = 0;
	let dismissedAnchor;
	const cache = new Map();
	const poster = $derived(details?.posterPath || movie?.posterPath);
	const runtime = $derived(details?.runtime || movie?.runtime);
	const directors = $derived(details?.directors?.length ? details.directors : movie?.directors?.length ? movie.directors : movie?.director ? [movie.director] : []);
	const year = $derived(movie?.releaseDate?.slice(0, 4));

	function position() {
		if (!card || !anchor?.isConnected) return;
		const rect = (anchor.querySelector('.title') ?? anchor).getBoundingClientRect();
		const bounds = card.getBoundingClientRect();
		const gutter = 16;
		left = Math.max(gutter, Math.min(rect.left + Math.min(rect.width / 3, 100), window.innerWidth - bounds.width - gutter));
		const below = rect.bottom + 12;
		const above = rect.top - bounds.height - 12;
		top = Math.max(gutter, Math.min(below + bounds.height <= window.innerHeight - gutter ? below : above, window.innerHeight - bounds.height - gutter));
	}

	export function hide() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		version++;
		request?.abort();
		if (card?.matches(':popover-open')) card.hidePopover();
		movie = null;
		onchange(null);
	}

	export function scheduleHide() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		dismissedAnchor = null;
		closeTimer = setTimeout(() => { if (!anchor?.matches(':focus-visible')) hide(); }, 160);
	}

	export function show(nextMovie, nextAnchor, immediate = false) {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		if (dismissedAnchor === nextAnchor) return;
		dismissedAnchor = null;
		if (movie?.id === nextMovie.id && card?.matches(':popover-open')) return;
		const open = async () => {
			request?.abort();
			const current = ++version;
			anchor = nextAnchor;
			movie = nextMovie;
			details = cache.get(movie.id) ?? null;
			posterFailed = false;
			metadataLoading = false;
			await tick();
			if (current !== version || !card || !anchor.isConnected) return;
			card.showPopover();
			position();
			onchange(movie.id);
			if (details || (movie.posterPath && movie.runtime && (movie.directors?.length || movie.director))) return;
			request = new AbortController();
			metadataLoading = true;
			try {
				const response = await fetch(`/movies/archive?id=${movie.id}`, { signal: request.signal });
				if (!response.ok) return;
				const result = await response.json();
				if (current !== version) return;
				cache.set(nextMovie.id, result);
				details = result;
				await tick();
				if (current === version) position();
			} catch { /* Keep the information already available in the list. */ }
			finally { if (current === version) metadataLoading = false; }
		};
		if (immediate) void open();
		else openTimer = setTimeout(open, 140);
	}

	function escape(event) {
		if (event.key !== 'Escape' || !movie) return;
		dismissedAnchor = anchor;
		hide();
	}

	onMount(() => {
		const onScroll = (event) => {
			if (!card?.matches(':popover-open') || (event.target instanceof Node && card.contains(event.target))) return;
			if (anchor?.matches(':focus-visible')) position();
			else hide();
		};
		window.addEventListener('scroll', onScroll, true);
		return () => {
			window.removeEventListener('scroll', onScroll, true);
			hide();
		};
	});
</script>

<svelte:window onkeydown={escape} onresize={hide} />

<div bind:this={card} {id} class="movie-hover-card" popover="manual" role="tooltip"
	style:left={`${left}px`} style:top={`${top}px`}
	onpointerenter={() => clearTimeout(closeTimer)} onpointerleave={scheduleHide}>
	{#if movie}
		<div class="poster">
			{#if poster && !posterFailed}
				<img src={`https://image.tmdb.org/t/p/w342${poster}`} alt={`Poster for ${movie.title}`} width="114" height="171" decoding="async" onerror={() => posterFailed = true} />
			{:else}
				<div class="poster-placeholder"><span aria-hidden="true">✦</span><span>{metadataLoading ? 'Loading poster…' : 'No poster'}</span></div>
			{/if}
		</div>
		<div class="info">
			<p class="eyebrow"><span aria-hidden="true">✦</span> From the collection</p>
			<h3>{movie.title}</h3>
			<p class="metadata">{[year, runtime ? `${runtime} min` : null].filter(Boolean).join(' · ')}</p>
			{#if directors.length}<p class="director"><span>Directed by</span>{directors.join(', ')}</p>{/if}
			{#if movie.genres?.length}<p class="genres">{movie.genres.slice(0, 3).join(' / ')}</p>{/if}
			<div class="card-footer">
				{#if movie.language}<span>{movie.language}</span>{/if}
				{#if movie.personalRating}<span class="rating">{movie.personalRating}/10</span>{:else if movie.favorite}<span class="rating">♥ Favourite</span>{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.movie-hover-card { position:fixed; inset:auto; margin:0; padding:12px; width:min(370px,calc(100vw - 32px)); max-height:calc(100svh - 32px); overflow:auto; border:1px solid color-mix(in srgb,var(--fill) 42%,transparent); border-top:2px solid var(--heart); border-radius:0; background:var(--bg); color:var(--fill); box-shadow:0 12px 40px #0007; font-family:var(--bfont); }
	.movie-hover-card:popover-open { display:grid; grid-template-columns:114px minmax(0,1fr); gap:16px; animation:card-in 160ms ease-out; }
	.poster { align-self:start; aspect-ratio:2/3; overflow:hidden; background:color-mix(in srgb,var(--fill) 7%,var(--bg)); }
	.poster img { display:block; width:100%; height:100%; object-fit:cover; }
	.poster-placeholder { display:flex; height:100%; flex-direction:column; justify-content:center; align-items:center; gap:12px; font-size:.65rem; opacity:.6; }
	.poster-placeholder span:first-child { color:var(--heart); font-size:2rem; }
	.info { min-width:0; display:flex; flex-direction:column; padding:2px 0; }
	p { margin:0; }
	.eyebrow { display:flex; align-items:center; gap:6px; font-size:.57rem; line-height:1.4; letter-spacing:.12em; text-transform:uppercase; opacity:.8; }
	.eyebrow span { color:var(--heart); }
	h3 { margin:10px 0 6px; font:400 clamp(1.4rem,2.5vw,1.8rem)/1.06 var(--mfont); overflow-wrap:anywhere; }
	.metadata { font-size:.72rem; opacity:.75; }
	.director { margin-top:12px; font-size:.76rem; line-height:1.35; }
	.director > span { display:block; margin-bottom:3px; font-size:.55rem; letter-spacing:.1em; text-transform:uppercase; opacity:.6; }
	.genres { margin-top:8px; font-size:.65rem; line-height:1.5; opacity:.65; }
	.card-footer { display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px; margin-top:auto; padding-top:12px; font-size:.65rem; }
	.rating { color:var(--heart); }
	@keyframes card-in { from { opacity:0; } to { opacity:1; } }
	@media(prefers-reduced-motion:reduce) { .movie-hover-card:popover-open { animation:none; } }
</style>
