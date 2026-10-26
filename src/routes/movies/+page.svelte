<script>
	import OrbitChart from './OrbitChart.svelte';

	let { data } = $props();

	let sort = $state('list');
	let selectedGenre = $state('All');

	const genres = $derived.by(() => {
		const counts = new Map();
		for (const movie of data.movies) {
			for (const genre of movie.genres) {
				counts.set(genre, (counts.get(genre) ?? 0) + 1);
			}
		}
		return [...counts].sort((a, b) => b[1] - a[1]);
	});

	const maxGenre = $derived(Math.max(1, ...genres.map(([, count]) => count)));
	const ratedMovies = $derived(data.movies.filter((movie) => movie.personalRating !== null));
	const averagePersonalRating = $derived(
		ratedMovies.length
			? ratedMovies.reduce((sum, movie) => sum + movie.personalRating, 0) / ratedMovies.length
			: null
	);

	const visibleMovies = $derived.by(() => {
		const filtered = selectedGenre === 'All'
			? [...data.movies]
			: data.movies.filter((movie) => movie.genres.includes(selectedGenre));

		if (sort === 'my-rating') {
			return filtered.sort((a, b) => (b.personalRating ?? -1) - (a.personalRating ?? -1));
		}
		if (sort === 'year') return filtered.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
		return filtered;
	});
</script>

<svelte:head>
	<title>{data.list.name} — Ozprey</title>
	<meta name="description" content={`A visual reading of ${data.list.name} on TMDB.`} />
</svelte:head>

<main class="movies-page">
	<header>
		<!-- <a class="back" href="/">← Home</a>
		<p class="eyebrow">TMDB LIST / VISUAL STUDY</p> -->
		<h1>{data.list.name}</h1>
		{#if data.list.description}<p class="description">{data.list.description}</p>{/if}
	</header>

	<section class="summary" aria-label="List summary">
		<div><strong>{data.list.itemCount}</strong><span>movies</span></div>
		<!-- <div><strong>{averagePersonalRating?.toFixed(1) ?? '—'}</strong><span>my average rating</span></div> -->
		<!-- <div><strong>{genres.length}</strong><span>genres</span></div> -->
	</section>

	<section class="chart-section" aria-labelledby="orbit-heading">
		<div class="section-heading"><h2 id="orbit-heading">Films</h2><span>orbit = month · size = runtime</span></div>
		<OrbitChart movies={data.movies} />
	</section>

	<section class="chart-section" aria-labelledby="genre-title">
		<div class="section-heading"><h2 id="genre-title">Genre gravity</h2><span>click to filter</span></div>
		<div class="genre-chart">
			{#each genres as [genre, count]}
				<button class:active={selectedGenre === genre} onclick={() => selectedGenre = selectedGenre === genre ? 'All' : genre}>
					<span>{genre}</span>
					<span class="genre-track"><span style={`width:${(count / maxGenre) * 100}%`}></span></span>
					<strong>{count}</strong>
				</button>
			{/each}
		</div>
	</section>

	<section class="collection" aria-labelledby="collection-title">
		<div class="section-heading collection-heading">
			<h2 id="collection-title">{selectedGenre === 'All' ? 'The collection' : selectedGenre}</h2>
			<label>Sort <select bind:value={sort}><option value="list">List order</option><option value="my-rating">My rating</option><option value="year">Newest</option></select></label>
		</div>

		<div class="poster-grid">
			{#each visibleMovies as movie}
				<a class="movie" href={movie.url} target="_blank" rel="noreferrer">
					{#if movie.posterPath}
						<img src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={`Poster for ${movie.title}`} loading="lazy" />
					{:else}
						<div class="poster-fallback">{movie.title}</div>
					{/if}
					<div class="movie-meta">
						<h3>{movie.title}</h3>
						<span>{movie.releaseDate.slice(0, 4) || '—'}{movie.personalRating !== null ? ` · ★ ${movie.personalRating}` : ''}</span>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- <footer>Data supplied by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</footer> -->
</main>

<style>

	.movies-page { width:min(1400px, calc(100% - 40px)); margin:auto; padding:clamp(40px, 1vw, 170px) 0 60px; color:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; }
	header { max-width:1000px; }

	.movies-page { width:min(1400px, calc(100% - 40px)); margin:auto; padding:clamp(12vmin, 1vw, 170px) 0px 60px; color:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; }
	header { max-width:1000px; text-align: center;}

	.back, .eyebrow, .section-heading span, footer { font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; }
	.back { color:inherit; text-decoration:none; }
	.eyebrow { margin-top:clamp(40px, 8vw, 90px); opacity:.65; }
	h1 { margin:.08em 0; font-family:var(--mfont); font-size:clamp(4rem, 13vw, 12rem); font-weight:400; line-height:.78; text-transform:uppercase; overflow-wrap:anywhere; }
	.description { max-width:650px; font-family:Gambarino, serif; font-size:clamp(1rem, 2vw, 1.45rem); }

	.summary { display:grid; grid-template-columns:repeat(3, 1fr); gap:1px; margin:clamp(55px, 10vw, 120px) 0; border-block:1px solid currentColor; }

	.summary {text-align: center; display:grid; grid-template-columns:repeat(3, 1fr); gap:1px; margin:clamp(55px, 10vw, 120px) 0; border-block:1px solid currentColor; }

	.summary div { display:flex; flex-direction:column; padding:24px 0; }
	.summary strong { font-family:var(--mfont); font-size:clamp(2.8rem, 7vw, 6rem); font-weight:400; line-height:1; }
	.summary span { font-size:.75rem; text-transform:uppercase; }
	.chart-section, .collection { margin-top:clamp(80px, 12vw, 150px); }
	.section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding-bottom:15px; border-bottom:1px solid currentColor; }

	h2 { font-family:var(--mfont); font-size:clamp(2.5rem, 6vw, 6rem); font-weight:400; line-height:.9; text-transform:uppercase; }

	h2 { text-align: center;font-family:var(--mfont); font-size:clamp(2.5rem, 6vw, 6rem); font-weight:400; line-height:.9; text-transform:uppercase; }

	.genre-chart { display:grid; grid-template-columns:repeat(2, 1fr); column-gap:clamp(25px, 6vw, 90px); }
	.genre-chart button { display:grid; grid-template-columns:minmax(90px, 1fr) 2fr 30px; align-items:center; gap:14px; width:100%; margin:0; padding:15px 0; color:inherit; background:transparent; border-bottom:1px solid color-mix(in srgb, currentColor 35%, transparent); cursor:pointer; text-align:left; }
	.genre-chart button.active { color:var(--bg); background:var(--fill); padding-inline:10px; }
	.genre-track { height:5px; background:color-mix(in srgb, currentColor 20%, transparent); }
	.genre-track span { display:block; height:100%; background:currentColor; }
	.genre-chart strong { text-align:right; }
	.collection-heading label { display:flex; align-items:center; gap:10px; font-size:.75rem; text-transform:uppercase; }
	select { margin:0; padding:7px 28px 7px 8px; color:var(--bg); background:var(--fill); }
	.poster-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:clamp(20px, 3vw, 45px) clamp(10px, 2vw, 28px); padding-top:30px; }
	.movie { color:inherit; text-decoration:none; }
	.movie img, .poster-fallback { width:100%; aspect-ratio:2/3; display:block; object-fit:cover; background:color-mix(in srgb, var(--fill) 14%, transparent); transition:transform 220ms ease; }
	.movie:hover img, .movie:hover .poster-fallback { transform:translateY(-7px); }
	.poster-fallback { display:grid; place-items:center; padding:15px; text-align:center; }
	.movie-meta { display:flex; justify-content:space-between; gap:8px; padding-top:10px; }
	.movie h3 { font-size:.8rem; font-weight:400; }
	.movie-meta span { flex:none; font-size:.68rem; opacity:.7; }
	footer { margin-top:100px; padding-top:20px; border-top:1px solid currentColor; opacity:.65; line-height:1.6; }
	@media (max-width:700px) { .summary { grid-template-columns:1fr; } .summary div + div { border-top:1px solid color-mix(in srgb, currentColor 35%, transparent); } .genre-chart { grid-template-columns:1fr; } .poster-grid { grid-template-columns:repeat(2, 1fr); } }
	@media (prefers-reduced-motion:reduce) { .movie img, .poster-fallback { transition:none; } }
</style>
