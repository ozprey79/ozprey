<script>
	let { movies } = $props();

	const monthNames = [
		'August', 'September', 'October', 'November', 'December', 'January',
		'February', 'March', 'April', 'May', 'June', 'July'
	];
	const now = new Date();
	const currentPeriod = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

	function dateParts(value) {
		const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
	}

	function periodFor(value) {
		const parts = dateParts(value);
		if (!parts) return null;
		return parts.month >= 8 ? parts.year : parts.year - 1;
	}

	function monthIndex(value, period) {
		const parts = dateParts(value);
		if (!parts) return -1;
		if (parts.year === period && parts.month >= 8) return parts.month - 8;
		if (parts.year === period + 1 && parts.month <= 7) return parts.month + 4;
		return -1;
	}

	function nodeRadius(runtime) {
		const minutes = Math.min(240, Math.max(60, runtime || 105));
		return 6 + Math.sqrt((minutes - 60) / 180) * 9;
	}

	function formatDate(value) {
		const parts = dateParts(value);
		if (!parts) return 'Date not recorded';
		return `${String(parts.day).padStart(2, '0')} ${monthNames[(parts.month + 4) % 12]} ${parts.year}`;
	}

	const periods = $derived.by(() => {
		const found = new Set(movies.map((movie) => periodFor(movie.watchedDate)).filter(Number.isInteger));
		found.add(currentPeriod);
		return [...found].sort((a, b) => a - b);
	});

	let selectedPeriod = $state(currentPeriod);
	let hoveredMovie = $state(null);

	const periodLabel = $derived(`${selectedPeriod}–${String(selectedPeriod + 1).slice(-2)}`);
	const monthRings = $derived(
		monthNames.map((name, index) => ({
			name,
			index,
			year: index < 5 ? selectedPeriod : selectedPeriod + 1,
			radius: 58 + index * 24
		}))
	);
	const plottedMovies = $derived.by(() => {
		const grouped = Array.from({ length: 12 }, () => []);
		for (const movie of movies) {
			const ring = monthIndex(movie.watchedDate, selectedPeriod);
			if (ring >= 0) grouped[ring].push(movie);
		}

		return grouped.flatMap((group, ring) =>
			group.map((movie, index) => {
				const duration = 70 + ring * 5 + (index % 5) * 7;
				const phase = group.length ? index / group.length : 0;
				return {
					movie,
					ring,
					orbitRadius: monthRings[ring].radius,
					nodeRadius: nodeRadius(movie.runtime),
					duration,
					delay: -(duration * phase)
				};
			})
		);
	});
	const undatedMovies = $derived(movies.filter((movie) => !movie.watchedDate));
	const totalMinutes = $derived(plottedMovies.reduce((sum, item) => sum + item.movie.runtime, 0));

	function showCard(movie) {
		hoveredMovie = movie;
	}

	function hideCard(movie) {
		if (hoveredMovie?.id === movie.id) hoveredMovie = null;
	}
</script>

<div class="orbit-controls">
	<p><strong>{plottedMovies.length}</strong> watched · <strong>{Math.round(totalMinutes / 60)}</strong> hours</p>
	{#if periods.length > 1}
		<label>
			Viewing year
			<select bind:value={selectedPeriod}>
				{#each periods as period}<option value={period}>{period}–{String(period + 1).slice(-2)}</option>{/each}
			</select>
		</label>
	{/if}
</div>

<div class="orbit-stage">
	<svg viewBox="0 0 800 800" role="img" aria-labelledby="orbit-title orbit-description">
		<title id="orbit-title">Movies watched from August {selectedPeriod} to July {selectedPeriod + 1}</title>
		<desc id="orbit-description">Each ring represents a month. Larger planets represent longer films. Select a planet to read its details.</desc>

		{#each [...monthRings].reverse() as ring}
			<circle class="orbit-ring" cx="400" cy="400" r={ring.radius} />
			<text class="month-label" x="408" y={404 - ring.radius}>{ring.name.slice(0, 3).toUpperCase()} {String(ring.year).slice(-2)}</text>
		{/each}

		<circle class="sun" cx="400" cy="400" r="31" />
		<text class="sun-label" x="400" y="397">WATCHED</text>
		<text class="sun-period" x="400" y="411">{periodLabel}</text>

		{#each plottedMovies as item (item.movie.id)}
			<g
				class="orbit-motion"
				style={`--orbit-duration:${item.duration}s;--orbit-delay:${item.delay}s`}
			>
				<a
					class="planet-link"
					href={item.movie.url}
					aria-label={`${item.movie.title}, ${item.movie.runtime || 'unknown'} minutes, watched ${formatDate(item.movie.watchedDate)}`}
					onmouseenter={() => showCard(item.movie)}
					onmouseleave={() => hideCard(item.movie)}
					onfocus={() => showCard(item.movie)}
					onblur={() => hideCard(item.movie)}
				>
					<circle class="planet-hit" cx={400 + item.orbitRadius} cy="400" r="22" />
					<circle
						class:selected={hoveredMovie?.id === item.movie.id}
						class="planet-node"
						cx={400 + item.orbitRadius}
						cy="400"
						r={item.nodeRadius}
					/>
				</a>
			</g>
		{/each}
	</svg>

	{#if hoveredMovie}
		<article class="movie-card" aria-live="polite">
			<div class="card-foil" aria-hidden="true"></div>
			<header class="card-header">
				<p>{formatDate(hoveredMovie.watchedDate)}</p>
				{#if hoveredMovie.personalRating !== null}
					<span><strong>{hoveredMovie.personalRating}</strong>/10 ★</span>
				{/if}
			</header>

			<h3>{hoveredMovie.title}</h3>

			<div class="card-art">
				{#if hoveredMovie.posterPath}
					<img src={`https://image.tmdb.org/t/p/w342${hoveredMovie.posterPath}`} alt={`Poster for ${hoveredMovie.title}`} />
				{:else}
					<div class="card-art-fallback">No poster</div>
				{/if}
			</div>

			<p class="card-spec">
				<span>{hoveredMovie.releaseDate.slice(0, 4) || 'Year unknown'}</span>
				<span>{hoveredMovie.language || 'Language unknown'}</span>
				<span>{hoveredMovie.runtime ? `${hoveredMovie.runtime} min` : 'Runtime unknown'}</span>
			</p>

			<div class="card-info">
				<strong>Type</strong>
				<p>{hoveredMovie.genres.join(' · ') || 'Genre unavailable'}</p>
			</div>

			<p class="card-link">Select planet to view on TMDB ↗</p>
			<p class="card-number">TMDB #{hoveredMovie.id}</p>
		</article>
	{/if}

	<div class="runtime-legend" aria-label="Planet size represents runtime">
		<span>Runtime</span>
		{#each [75, 120, 180] as runtime}
			<span class="runtime-key"><i style={`width:${nodeRadius(runtime) * 2}px;height:${nodeRadius(runtime) * 2}px`}></i>{runtime} min</span>
		{/each}
	</div>
</div>

{#if plottedMovies.length === 0}
	<p class="empty-state">No dated movies fall inside {periodLabel}. Add <code>watched: YYYY-MM-DD</code> to each TMDB list-item comment.</p>
{/if}

{#if undatedMovies.length}
	<p class="undated">{undatedMovies.length} {undatedMovies.length === 1 ? 'movie has' : 'movies have'} no readable watched date.</p>
{/if}

<style>
	.orbit-controls { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:15px 0; font-size:.75rem; text-transform:uppercase; }
	.orbit-controls p { letter-spacing:.08em; }
	.orbit-controls label { display:flex; align-items:center; gap:10px; }
	.orbit-controls select { margin:0; padding:6px 25px 6px 7px; color:var(--bg); background:var(--fill); }
	.orbit-stage { position:relative; width:min(100%, 900px); margin:auto; }
	svg { display:block; width:100%; height:auto; overflow:visible; }
	.orbit-ring { fill:none; stroke:color-mix(in srgb, var(--fill) 28%, transparent); stroke-width:1; vector-effect:non-scaling-stroke; }
	.month-label { fill:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; font-size:9px; letter-spacing:.08em; opacity:.72; }
	.sun { fill:var(--fill); }
	.sun-label, .sun-period { fill:var(--bg); font-family:'PlusJakartaSans-SemiBold', sans-serif; text-anchor:middle; }
	.sun-label { font-size:8px; letter-spacing:.12em; }
	.sun-period { font-size:7px; }
	.orbit-motion { transform-box:view-box; transform-origin:center; animation:orbit var(--orbit-duration) linear var(--orbit-delay) infinite; }
	.planet-link { cursor:pointer; }
	.planet-hit { fill:transparent; }
	.planet-node { fill:var(--fill); stroke:var(--bg); stroke-width:1.5; vector-effect:non-scaling-stroke; transition:stroke-width 150ms ease, filter 150ms ease; }
	.planet-node.selected, .planet-link:hover .planet-node, .planet-link:focus .planet-node { stroke-width:4; filter:drop-shadow(0 0 7px var(--fill)); }
	.movie-card { position:absolute; z-index:5; left:clamp(8px, 3vw, 32px); top:50%; width:min(280px, 36%); min-width:230px; aspect-ratio:5/7; padding:14px; overflow:hidden; pointer-events:none; color:var(--bg); background:linear-gradient(145deg, color-mix(in srgb, var(--fill) 94%, white), color-mix(in srgb, var(--fill) 72%, #f3bd36)); border:7px solid color-mix(in srgb, var(--fill) 55%, #d6a52a); border-radius:16px; box-shadow:0 16px 35px rgba(0,0,0,.42), inset 0 0 0 2px color-mix(in srgb, var(--bg) 35%, transparent); transform:translateY(-50%) rotate(-1.25deg); }
	.card-foil { position:absolute; inset:0; pointer-events:none; opacity:.16; background:linear-gradient(115deg, transparent 16%, white 33%, transparent 48%, white 64%, transparent 81%); transform:translateX(-45%); animation:foil 3.6s ease-in-out infinite alternate; }
	.card-header { position:relative; display:flex; justify-content:space-between; align-items:center; gap:8px; }
	.card-header p, .card-header span, .card-spec, .card-info, .card-link, .card-number { font-family:'PlusJakartaSans-SemiBold', sans-serif; }
	.card-header p { font-size:.61rem; letter-spacing:.08em; text-transform:uppercase; }
	.card-header span { font-size:.66rem; white-space:nowrap; }
	.movie-card h3 { position:relative; margin:5px 0 7px; min-height:1.9em; font-family:var(--mfont); font-size:clamp(1.45rem, 2.4vw, 2.15rem); font-weight:400; line-height:.85; text-transform:uppercase; }
	.card-art { position:relative; aspect-ratio:1.43/1; overflow:hidden; border:4px ridge color-mix(in srgb, var(--bg) 45%, #d2a732); background:color-mix(in srgb, var(--bg) 82%, transparent); box-shadow:inset 0 0 18px rgba(0,0,0,.35); }
	.card-art img, .card-art-fallback { width:100%; height:100%; object-fit:cover; object-position:center 25%; }
	.card-art-fallback { display:grid; place-items:center; color:var(--fill); }
	.card-spec { position:relative; display:flex; justify-content:center; flex-wrap:wrap; gap:4px 10px; margin:6px 0; padding:3px 4px; font-size:.55rem; text-transform:uppercase; border-block:1px solid color-mix(in srgb, var(--bg) 35%, transparent); }
	.card-info { position:relative; min-height:45px; display:grid; grid-template-columns:42px 1fr; gap:6px; align-items:start; padding:5px 0; font-size:.62rem; }
	.card-info strong { text-transform:uppercase; }
	.card-info p { line-height:1.3; }
	.card-link { position:relative; color:inherit; font-size:.62rem; text-transform:uppercase; }
	.card-number { position:absolute; right:12px; bottom:7px; font-size:.48rem; opacity:.62; }
	.runtime-legend { position:absolute; right:0; bottom:3%; display:flex; align-items:center; gap:12px; font-size:.66rem; text-transform:uppercase; }
	.runtime-key { display:flex; align-items:center; gap:5px; }
	.runtime-key i { display:block; flex:none; border-radius:50%; background:var(--fill); }
	.empty-state, .undated { font-size:.72rem; }
	.empty-state { padding:18px 0; border-block:1px solid color-mix(in srgb, var(--fill) 45%, transparent); }
	.undated { margin-top:12px; opacity:.65; text-transform:uppercase; }
	@keyframes orbit { to { transform:rotate(360deg); } }
	@keyframes foil { to { transform:translateX(45%); } }
	@media (max-width:650px) {
		.orbit-controls { align-items:flex-start; flex-direction:column; }
		.runtime-legend { position:static; justify-content:center; flex-wrap:wrap; margin-top:8px; }
		.month-label { font-size:11px; }
		.movie-card { position:absolute; left:50%; top:50%; width:min(245px, 76%); min-width:0; transform:translate(-50%, -50%); }
	}
	@media (prefers-reduced-motion:reduce) {
		.orbit-motion { animation-play-state:paused; }
		.planet-node { transition:none; }
		.card-foil { animation:none; }
	}
</style>
