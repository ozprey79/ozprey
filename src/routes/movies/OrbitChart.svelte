<script>
	let { movies } = $props();

	// ── Calendar & layout constants (SVG user units) ──────────────────────────
	const DEFAULT_YEAR = 2027;
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const VIEW_W = 1000;
	const TOP = 62; // y of the first rod
	const ROW_GAP = 58; // distance between rods
	const BEAM_X = 118; // reckoning beam: beads rest against it
	const ROD_END = 968;
	const BEAD_START = BEAM_X + 8;
	const BEAD_H = 34; // bead height
	const BEAD_GAP = 2;
	const RAIL = ROD_END - 8 - BEAD_START; // usable bead length per rod
	const VIEW_H = TOP + ROW_GAP * 11 + 52;

	// ── Date helpers ──────────────────────────────────────────────────────────
	function dateParts(value) {
		const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
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

	// Bead length encodes runtime (60–240 min → 20–46 units)
	function beadWidth(runtime) {
		const minutes = Math.min(240, Math.max(60, runtime || 105));
		return 20 + ((minutes - 60) / 180) * 26;
	}

	// ── State ─────────────────────────────────────────────────────────────────
	const years = $derived.by(() => {
		const found = new Set(movies.map((movie) => yearFor(movie.watchedDate)).filter(Number.isInteger));
		found.add(DEFAULT_YEAR);
		return [...found].sort((a, b) => a - b);
	});

	let selectedYear = $state(DEFAULT_YEAR);
	let hoveredMovie = $state(null);

	const rods = $derived(
		monthNames.map((name, index) => ({ name, index, y: TOP + index * ROW_GAP }))
	);

	const grouped = $derived.by(() => {
		const groups = Array.from({ length: 12 }, () => []);
		for (const movie of movies) {
			const ring = monthIndex(movie.watchedDate, selectedYear);
			if (ring >= 0) groups[ring].push(movie);
		}
		for (const group of groups) {
			group.sort((a, b) => a.watchedDate.localeCompare(b.watchedDate) || a.title.localeCompare(b.title));
		}
		return groups;
	});

	// One shared scale keeps bead lengths comparable across every rod.
	// It only shrinks when the busiest month would overflow its rod.
	const beadScale = $derived.by(() => {
		let scale = 1;
		for (const group of grouped) {
			if (!group.length) continue;
			const sum = group.reduce((total, movie) => total + beadWidth(movie.runtime), 0);
			scale = Math.min(scale, (RAIL - BEAD_GAP * group.length) / sum);
		}
		return Math.max(scale, 0.3);
	});

	const beads = $derived.by(() =>
		grouped.flatMap((group, row) => {
			let cursor = BEAD_START;
			return group.map((movie, index) => {
				const width = beadWidth(movie.runtime) * beadScale;
				const cx = cursor + width / 2;
				cursor += width + BEAD_GAP;
				return {
					movie,
					row,
					cx,
					cy: rods[row].y,
					width,
					from: ROD_END - cx,
					delay: row * 45 + index * 40
				};
			});
		})
	);

	const undatedMovies = $derived(movies.filter((movie) => !movie.watchedDate));
	const totalMinutes = $derived(beads.reduce((sum, item) => sum + (item.movie.runtime || 0), 0));

	function showCard(movie) {
		hoveredMovie = movie;
	}

	function hideCard(movie) {
		if (hoveredMovie?.id === movie.id) hoveredMovie = null;
	}
</script>

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

<div class="abacus-stage">
	<svg viewBox="0 0 {VIEW_W} {VIEW_H}" role="img" aria-labelledby="abacus-title abacus-description">
		<title id="abacus-title">Movies watched in {selectedYear}</title>
		<desc id="abacus-description">Each rod is a month, January at the top. Each bead is a film, ordered by watched date. Longer beads are longer films. Select a bead to read its details.</desc>

		<!-- frame -->
		<rect class="frame" x="6" y="6" width={VIEW_W - 12} height={VIEW_H - 12} rx="16" />
		<line class="beam" x1={BEAM_X} y1="14" x2={BEAM_X} y2={VIEW_H - 14} />

		<!-- rods -->
		{#each rods as rod}
			<line class="rod" x1={BEAM_X} y1={rod.y} x2={ROD_END} y2={rod.y} />
			<circle class="rod-cap" cx={ROD_END} cy={rod.y} r="4" />
			<text class="month-label" x="26" y={rod.y + 4}>{rod.name.slice(0, 3)}</text>
			<text class="month-count" x={BEAM_X - 12} y={rod.y + 4}>{grouped[rod.index].length || ''}</text>
		{/each}

		<!-- beads -->
		{#each beads as item (item.movie.id)}
			<g
				class="bead-motion"
				style={`--from:${item.from}px;--delay:${item.delay}ms`}
			>
				<a
					class="bead-link"
					href={item.movie.url}
					aria-label={`${item.movie.title}, ${item.movie.runtime || 'unknown'} minutes, watched ${formatDate(item.movie.watchedDate)}`}
					onmouseenter={() => showCard(item.movie)}
					onmouseleave={() => hideCard(item.movie)}
					onfocus={() => showCard(item.movie)}
					onblur={() => hideCard(item.movie)}
				>
					<rect
						class="bead-hit"
						x={item.cx - item.width / 2 - 1}
						y={item.cy - 24}
						width={item.width + 2}
						height="48"
					/>
					<ellipse
						class:selected={hoveredMovie?.id === item.movie.id}
						class="bead"
						cx={item.cx}
						cy={item.cy}
						rx={item.width / 2}
						ry={BEAD_H / 2}
					/>
					<ellipse
						class="bead-shine"
						cx={item.cx - item.width * 0.12}
						cy={item.cy - 6}
						rx={Math.max(item.width * 0.26, 2)}
						ry="3.5"
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
				<span>{hoveredMovie.releaseDate?.slice(0, 4) || 'Year unknown'}</span>
				<span>{hoveredMovie.language || 'Language unknown'}</span>
				<span>{hoveredMovie.runtime ? `${hoveredMovie.runtime} min` : 'Runtime unknown'}</span>
			</p>

			<div class="card-info">
				<strong>Type</strong>
				<p>{hoveredMovie.genres?.join(' · ') || 'Genre unavailable'}</p>
			</div>

			<p class="card-link">Select bead to view on TMDB ↗</p>
			<p class="card-number">TMDB #{hoveredMovie.id}</p>
		</article>
	{/if}

	<div class="runtime-legend" aria-label="Bead length represents runtime">
		<span>Runtime</span>
		{#each [75, 120, 180] as runtime}
			<span class="runtime-key"><i style={`width:${beadWidth(runtime)}px;height:${BEAD_H / 2}px`}></i>{runtime} min</span>
		{/each}
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
	.abacus-stage { position:relative; width:min(100%, 960px); margin:auto; }
	svg { display:block; width:100%; height:auto; overflow:visible; }

	/* frame, beam, rods */
	.frame { fill:none; stroke:var(--fill); stroke-width:3; vector-effect:non-scaling-stroke; }
	.beam { stroke:var(--fill); stroke-width:4; vector-effect:non-scaling-stroke; }
	.rod { stroke:color-mix(in srgb, var(--fill) 45%, transparent); stroke-width:2; vector-effect:non-scaling-stroke; }
	.rod-cap { fill:color-mix(in srgb, var(--fill) 45%, transparent); }
	.month-label { fill:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; font-size:13px; letter-spacing:.06em; }
	.month-count { fill:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; font-size:12px; text-anchor:end; opacity:.6; }

	/* beads */
	.bead-motion { animation:slide-in 720ms cubic-bezier(.2,.8,.2,1) var(--delay) backwards; }
	.bead-link { cursor:pointer; }
	.bead-hit { fill:transparent; }
	.bead { fill:var(--fill); stroke:var(--bg); stroke-width:1.5; vector-effect:non-scaling-stroke; transition:stroke-width 150ms ease, filter 150ms ease; }
	.bead-shine { fill:var(--bg); opacity:.28; pointer-events:none; }
	.bead.selected, .bead-link:hover .bead, .bead-link:focus .bead { stroke-width:4; filter:drop-shadow(0 0 7px var(--fill)); }
	.bead-link:focus-visible { outline:none; }

	/* hover card (unchanged in spirit; parked on the empty right side of the rods) */
	.movie-card { position:absolute; z-index:5; right:clamp(8px, 3vw, 32px); top:50%; width:min(280px, 34%); min-width:230px; aspect-ratio:5/7; padding:14px; overflow:hidden; pointer-events:none; color:var(--bg); background:linear-gradient(145deg, color-mix(in srgb, var(--fill) 94%, white), color-mix(in srgb, var(--fill) 72%, #f3bd36)); border:7px solid color-mix(in srgb, var(--fill) 55%, #d6a52a); border-radius:16px; box-shadow:0 16px 35px rgba(0,0,0,.42), inset 0 0 0 2px color-mix(in srgb, var(--bg) 35%, transparent); transform:translateY(-50%) rotate(1.25deg); }
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

	/* legend sits below the frame so it never covers a rod */
	.runtime-legend { display:flex; align-items:center; justify-content:flex-end; gap:12px; margin-top:12px; font-size:.66rem; text-transform:uppercase; }
	.runtime-key { display:flex; align-items:center; gap:5px; }
	.runtime-key i { display:block; flex:none; border-radius:50%; background:var(--fill); }

	.empty-state, .undated { font-size:.72rem; }
	.empty-state { padding:18px 0; border-block:1px solid color-mix(in srgb, var(--fill) 45%, transparent); }
	.undated { margin-top:12px; opacity:.65; text-transform:uppercase; }

	@keyframes slide-in { from { transform:translateX(var(--from)); } to { transform:translateX(0); } }
	@keyframes foil { to { transform:translateX(45%); } }

	@media (max-width:650px) {
		.abacus-controls { align-items:flex-start; flex-direction:column; }
		.runtime-legend { justify-content:center; flex-wrap:wrap; }
		.month-label { font-size:17px; }
		.month-count { font-size:15px; }
		.movie-card { position:absolute; right:auto; left:50%; top:50%; width:min(245px, 76%); min-width:0; transform:translate(-50%, -50%); }
	}
	@media (prefers-reduced-motion:reduce) {
		.bead-motion { animation:none; }
		.bead { transition:none; }
		.card-foil { animation:none; }
	}
</style>