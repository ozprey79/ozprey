<script>
	let { movies } = $props();

	// ── Calendar & layout constants (SVG user units) ──────────────────────────
	const DEFAULT_YEAR = 2027;
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	// Wide screens: 12 vertical rods, day runs top → bottom.
	// Phones: the same abacus turned on its side, 12 horizontal rods, day runs left → right.
	const WIDE = { w: 1000, h: 700, vertical: true, crossStart: 70, crossEnd: 930, alongStart: 48, alongEnd: 652, cap: 9 };
	const NARROW = { w: 400, h: 760, vertical: false, crossStart: 36, crossEnd: 724, alongStart: 22, alongEnd: 378, cap: 7 };
	const NARROW_BELOW = 600; // px width of the chart container
	const BEAD_GAP = 2;

	// Favourite hearts: coffee brown, Material heart drawn on a 24-unit grid
	const HEART_PATH =
		'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

	// ── Data helpers ──────────────────────────────────────────────────────────
	// Returns null for anything that isn't a real calendar date (e.g. 2027-02-31),
	// so bad data counts as "undated" instead of misplacing a bead.
	function dateParts(value) {
		const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) return null;
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		if (month < 1 || month > 12) return null;
		if (day < 1 || day > new Date(year, month, 0).getDate()) return null;
		return { year, month, day };
	}

	function yearFor(value) {
		return dateParts(value)?.year ?? null;
	}

	function monthIndex(value, year) {
		const parts = dateParts(value);
		return parts && parts.year === year ? parts.month - 1 : -1;
	}

	function formatDate(value) {
		const parts = dateParts(value);
		if (!parts) return 'Date not recorded';
		return `${String(parts.day).padStart(2, '0')} ${monthNames[parts.month - 1]} ${parts.year}`;
	}

	// Bead radius encodes runtime (60–240 min → 6–15 units)
	function nodeRadius(runtime) {
		const minutes = Math.min(240, Math.max(60, runtime || 105));
		// return 6 + Math.sqrt((minutes - 60) / 180) * 7;
		return 6 + Math.sqrt((100 - 60) / 180) * 5;
	}

	// Favourite flag: set `favorite: true` on each movie in your loader
	// (`favourite` and `isFavorite` are also accepted).
	function isFavorite(movie) {
		return Boolean(movie.favorite ?? movie.favourite ?? movie.isFavorite);
	}

	// Rating → bead opacity. Unrated films sit in the middle; favourites never go too faint
	// so the heart stays readable.
	function toneFor(movie) {
		const rating = movie.personalRating;
		let tone = typeof rating === 'number' ? 0.35 + 0.65 * Math.min(10, Math.max(0, rating)) / 10 : 0.7;
		if (isFavorite(movie)) tone = Math.max(tone, 0.85);
		return tone;
	}

	// ── State ─────────────────────────────────────────────────────────────────
	let stageWidth = $state(0);
	let selectedYear = $state(DEFAULT_YEAR);
	let hoveredMovie = $state(null);
	let touchMode = false; // true after the last pointer was a finger or pen

	const narrow = $derived(stageWidth > 0 && stageWidth < NARROW_BELOW);
	const layout = $derived(narrow ? NARROW : WIDE);

	const years = $derived.by(() => {
		const found = new Set(movies.map((movie) => yearFor(movie.watchedDate)).filter(Number.isInteger));
		found.add(DEFAULT_YEAR);
		return [...found].sort((a, b) => a - b);
	});

	const crossPos = (index) => layout.crossStart + (index * (layout.crossEnd - layout.crossStart)) / 11;

	const rods = $derived(
		Array.from({ length: 12 }, (_, index) => {
			const c = crossPos(index);
			const { alongStart: a0, alongEnd: a1, cap, vertical } = layout;
			return vertical
				? { line: [c, a0, c, a1], caps: [[c - cap, a0, c + cap, a0], [c - cap, a1, c + cap, a1]] }
				: { line: [a0, c, a1, c], caps: [[a0, c - cap, a0, c + cap], [a1, c - cap, a1, c + cap]] };
		})
	);

	// Each bead sits at its watched day along its month's rod (1st at the start, last day at the end).
	// If two films are close enough to overlap, the later bead slides along the rod until it clears,
	// the way a bead would on a real abacus. Beads never leave their rod.
	const beads = $derived.by(() => {
		const L = layout;
		const minT = L.alongStart + 20;
		const maxT = L.alongEnd - 20;
		const edge = L.alongEnd - 12; // beads never touch the end bar
		const out = [];

		for (let row = 0; row < 12; row++) {
			const daysInMonth = new Date(selectedYear, row + 1, 0).getDate();
			const c = crossPos(row);
			const items = movies
				.filter((movie) => monthIndex(movie.watchedDate, selectedYear) === row)
				.sort(
					(a, b) =>
						a.watchedDate.localeCompare(b.watchedDate) ||
						(a.title || '').localeCompare(b.title || '')
				)
				.map((movie) => {
					const { day } = dateParts(movie.watchedDate);
					return {
						movie,
						r: nodeRadius(movie.runtime),
						t: minT + ((day - 1) / (daysInMonth - 1)) * (maxT - minT)
					};
				});

			// push later beads along the rod to clear overlaps
			for (let i = 1; i < items.length; i++) {
				items[i].t = Math.max(items[i].t, items[i - 1].t + items[i - 1].r + items[i].r + BEAD_GAP);
			}
			// pull back if the pile ran past the end of the rod
			for (let i = items.length - 1; i >= 0; i--) {
				const limit =
					i === items.length - 1
						? edge - items[i].r
						: items[i + 1].t - items[i + 1].r - items[i].r - BEAD_GAP;
				items[i].t = Math.min(items[i].t, limit);
			}

			items.forEach((item, index) => {
				const slide = L.alongStart - item.t;
				out.push({
					movie: item.movie,
					r: item.r,
					x: L.vertical ? c : item.t,
					y: L.vertical ? item.t : c,
					fx: L.vertical ? 0 : slide,
					fy: L.vertical ? slide : 0,
					tone: toneFor(item.movie),
					fav: isFavorite(item.movie),
					delay: row * 45 + index * 40
				});
			});
		}
		return out;
	});

	const undatedMovies = $derived(movies.filter((movie) => !dateParts(movie.watchedDate)));
	const totalMinutes = $derived(beads.reduce((sum, item) => sum + (item.movie.runtime || 0), 0));

	// Card opens on the side away from the hovered bead so it never covers it
	const cardSide = $derived(
		hoveredMovie && monthIndex(hoveredMovie.watchedDate, selectedYear) >= 6 ? 'left' : 'right'
	);

	// ── Interaction ───────────────────────────────────────────────────────────
	function showCard(movie) {
		hoveredMovie = movie;
	}

	function hideCard(movie) {
		if (hoveredMovie?.id === movie.id) hoveredMovie = null;
	}

	// Touch: first tap shows the card, second tap on the same bead opens TMDB.
	// Tapping anywhere else closes the card.
	function onPointerDown(event) {
		touchMode = event.pointerType !== 'mouse';
		if (touchMode && !(event.target instanceof Element && event.target.closest('.bead-link'))) {
			hoveredMovie = null;
		}
	}

	function onBeadClick(event, movie) {
		if (touchMode && hoveredMovie?.id !== movie.id) {
			event.preventDefault();
			showCard(movie);
		}
	}
</script>

<svelte:window onpointerdown={onPointerDown} onkeydown={() => (touchMode = false)} />

<div class="abacus-controls">
	<p><strong>{beads.length}</strong> watched · <strong>{Math.round(totalMinutes / 60)}</strong> hours</p>
	{#if years.length > 1}
		<label>
			Viewing year
			<select bind:value={selectedYear}>
				{#each years as year}<option value={year}>{year}</option>{/each}
			</select>
		</label>
	{/if}
</div>

<div class="abacus-stage" bind:clientWidth={stageWidth}>
	<svg viewBox="0 0 {layout.w} {layout.h}" role="img" aria-labelledby="abacus-title abacus-description">
		<title id="abacus-title">Movies watched in {selectedYear}</title>
		<desc id="abacus-description">Twelve rods, one per month, January first. Each bead is a film, placed along its rod by the day of the month it was watched. Larger beads are longer films, and fainter beads are rated lower. A heart marks a favourite. Select a bead to read its details.</desc>

		<g aria-hidden="true">
			{#each rods as rod}
				<line class="rod" x1={rod.line[0]} y1={rod.line[1]} x2={rod.line[2]} y2={rod.line[3]} />
				{#each rod.caps as cap}
					<line class="rod-cap" x1={cap[0]} y1={cap[1]} x2={cap[2]} y2={cap[3]} />
				{/each}
			{/each}
		</g>

		{#each beads as item (item.movie.id)}
			<g
				class="bead-motion"
				style={`--fx:${item.fx}px;--fy:${item.fy}px;--delay:${item.delay}ms`}
			>
				<a
					class="bead-link"
					href={item.movie.url}
					aria-label={`${item.movie.title}, ${item.movie.runtime || 'unknown'} minutes, watched ${formatDate(item.movie.watchedDate)}${item.fav ? ', favourite' : ''}`}
					onclick={(event) => onBeadClick(event, item.movie)}
					onmouseenter={() => !touchMode && showCard(item.movie)}
					onmouseleave={() => !touchMode && hideCard(item.movie)}
					onfocus={() => !touchMode && showCard(item.movie)}
					onblur={() => !touchMode && hideCard(item.movie)}
				>
					{#if !item.fav}
					<circle class="bead-hit" cx={item.x} cy={item.y} r={narrow ? Math.max(item.r + 4, 14) : Math.max(item.r + 5, 18)} />
					<circle
						class:selected={hoveredMovie?.id === item.movie.id}
						class="bead"
						style={`--tone:${item.tone}`}
						cx={item.x}
						cy={item.y}
						r={item.r}
					/>
					{/if}
					{#if item.fav}
						<path
						    class:selected={hoveredMovie?.id === item.movie.id}
							class="beadheart"
							d={HEART_PATH}
							transform={`translate(${item.x} ${item.y}) scale(${item.r * 0.095}) translate(-12 -12.2)`}
							
						/>
					{/if}
				</a>
			</g>
		{/each}
	</svg>

	{#if hoveredMovie}
		<article class="movie-card {cardSide}" aria-live="polite">
			<div class="card-foil" aria-hidden="true"></div>
			<header class="card-header">
				<p>{formatDate(hoveredMovie.watchedDate)}</p>
				<span class="card-badges">
					{#if isFavorite(hoveredMovie)}
						<svg class="card-heart" viewBox="0 0 24 24" aria-label="Favourite" role="img"><path d={HEART_PATH} /></svg>
					{/if}
					{#if hoveredMovie.personalRating !== null && hoveredMovie.personalRating !== undefined}
						<span><strong>{hoveredMovie.personalRating}</strong>/10 ★</span>
					{/if}
				</span>
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
				<span>{hoveredMovie.releaseDate?.slice(0, 4) || 'Year unknown'}</span>
				<span>{hoveredMovie.language || 'Language unknown'}</span>
				<span>{hoveredMovie.runtime ? `${hoveredMovie.runtime} min` : 'Runtime unknown'}</span>
			</p>

			<div class="card-info">
				<strong>Type</strong>
				<p>{hoveredMovie.genres?.join(' · ') || 'Genre unavailable'}</p>
			</div>

			<p class="card-link">{touchMode ? 'Tap again to view on TMDB ↗' : 'Select bead to view on TMDB ↗'}</p>
			<p class="card-number">TMDB #{hoveredMovie.id}</p>
		</article>
	{/if}

	<div class="runtime-legend" aria-label="Legend: bead size is runtime, bead brightness is your rating">
		<!-- <span>Runtime</span>
		{#each [75, 120, 180] as runtime}
			<span class="runtime-key"><i style={`width:${nodeRadius(runtime) * 2}px;height:${nodeRadius(runtime) * 2}px`}></i>{runtime} min</span>
		{/each} -->
		<span>Rating</span>
		<span class="runtime-key">
			<i class="tone" style="width:14px;height:14px;opacity:.4"></i>
			<i class="tone" style="width:14px;height:14px;opacity:.7"></i>
			<i class="tone" style="width:14px;height:14px"></i>
			low → high
		</span>
		<span class="runtime-key">
			<i class="fav-key"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={HEART_PATH} /></svg></i>
			Favourite
		</span>
	</div>
</div>

{#if beads.length === 0}
	<p class="empty-state">No dated movies fall inside {selectedYear}. Add <code>watched: YYYY-MM-DD</code> to each TMDB list-item comment.</p>
{/if}

{#if undatedMovies.length}
	<p class="undated">{undatedMovies.length} {undatedMovies.length === 1 ? 'movie has' : 'movies have'} no readable watched date.</p>
{/if}

<style>
	.abacus-controls { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:15px 0; font-size:.75rem; text-transform:uppercase; }
	.abacus-controls p { letter-spacing:.08em; }
	.abacus-controls label { display:flex; align-items:center; gap:10px; }
	.abacus-controls select { margin:0; padding:6px 25px 6px 7px; color:var(--bg); background:var(--fill); }
	.abacus-stage { --heart:#80ff00; position:relative; width:min(100%, 960px); margin:auto; }
	svg { display:block; width:100%; height:auto; overflow:visible; }

	/* rods: thin dashed stroke, small bar at each end */
	.rod { stroke:color-mix(in srgb, var(--fill) 55%, transparent); stroke-width:1.5; stroke-dasharray:2 6; vector-effect:non-scaling-stroke; }
	.rod-cap { stroke:color-mix(in srgb, var(--fill) 55%, transparent); stroke-width:2; vector-effect:non-scaling-stroke; }

	/* beads: flat circles, no outline; brightness follows your rating */
	.bead-motion { animation:slide-in 760ms cubic-bezier(.2,.8,.2,1) var(--delay) backwards; }
	.bead-link { cursor:pointer; }
	.bead-link:focus { outline:none; }
	.bead-hit { fill:transparent; }
	.bead { fill:var(--fill); opacity:var(--tone, 1); transition:filter 150ms ease, opacity 150ms ease; }
	.bead.selected, .bead-link:hover .bead, .bead-link:focus .bead { opacity:1; filter:drop-shadow(0 0 8px var(--fill)); }
	.beadheart { fill:var(--heart); pointer-events:none; }
	.beadheart.selected, .beadheart-link:hover .beadheart, .beadheart-link:focus .bead { opacity:1; filter:drop-shadow(0 0 8px var(--fill)); }
     
	/* hover card sits on the side opposite the hovered bead */
	.movie-card { position:absolute; z-index:5; top:50%; width:min(280px, 34%); min-width:230px; aspect-ratio:5/7; padding:14px; overflow:hidden; pointer-events:none; color:var(--bg); background:linear-gradient(145deg, color-mix(in srgb, var(--fill) 94%, white), color-mix(in srgb, var(--fill) 72%, #f3bd36)); border:7px solid color-mix(in srgb, var(--fill) 55%, #d6a52a); border-radius:16px; box-shadow:0 16px 35px rgba(0,0,0,.42), inset 0 0 0 2px color-mix(in srgb, var(--bg) 35%, transparent); }
	.movie-card.right { right:clamp(8px, 3vw, 32px); transform:translateY(-50%) rotate(1.25deg); }
	.movie-card.left { left:clamp(8px, 3vw, 32px); transform:translateY(-50%) rotate(-1.25deg); }
	.card-foil { position:absolute; inset:0; pointer-events:none; opacity:.16; background:linear-gradient(115deg, transparent 16%, white 33%, transparent 48%, white 64%, transparent 81%); transform:translateX(-45%); animation:foil 3.6s ease-in-out infinite alternate; }
	.card-header { position:relative; display:flex; justify-content:space-between; align-items:center; gap:8px; }
	.card-header p, .card-header span, .card-spec, .card-info, .card-link, .card-number { font-family:'PlusJakartaSans-SemiBold', sans-serif; }
	.card-header p { font-size:.61rem; letter-spacing:.08em; text-transform:uppercase; }
	.card-header span { font-size:.66rem; white-space:nowrap; }
	.card-badges { display:inline-flex; align-items:center; gap:7px; }
	.card-heart { width:15px; height:15px; fill:var(--heart); }
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

	.runtime-legend { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:8px 12px; margin-top:12px; font-size:.66rem; text-transform:uppercase; }
	.runtime-key { display:flex; align-items:center; gap:5px; }
	.runtime-key i { display:block; flex:none; border-radius:50%; background:var(--fill); }
	.fav-key { display:grid !important; place-items:center; width:16px; height:16px; }
	.fav-key svg { width:10px; height:10px; fill:var(--heart); }

	.empty-state, .undated { font-size:.72rem; }
	.empty-state { padding:18px 0; }
	.undated { margin-top:12px; opacity:.65; text-transform:uppercase; }

	@keyframes slide-in { from { transform:translate(var(--fx), var(--fy)); } to { transform:translate(0, 0); } }
	@keyframes foil { to { transform:translateX(45%); } }

	@media (max-width:650px) {
		.abacus-controls { align-items:flex-start; flex-direction:column; }
		.runtime-legend { justify-content:center; }
		.movie-card, .movie-card.left, .movie-card.right { left:50%; right:auto; width:min(245px, 76%); min-width:0; transform:translate(-50%, -50%); }
	}
	@media (prefers-reduced-motion:reduce) {
		.bead-motion { animation:none; }
		.bead { transition:none; }
		.card-foil { animation:none; }
	}
</style>