<script>
	let { movies, selectedMovie = null, onselect = () => {} } = $props();

	// ── Calendar & layout constants (SVG user units) ──────────────────────────
	const DEFAULT_YEAR = 2026;
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	// Wide screens: 12 vertical rods, day runs top → bottom.
	// Phones: the same abacus turned on its side, 12 horizontal rods, day runs left → right.
	const WIDE = { w: 1000, h: 700, vertical: true, crossStart: 70, crossEnd: 930, alongStart: 48, alongEnd: 652, cap: 9 };
	// Half the mobile row pitch, retaining the original bead sizes and end padding.
	const NARROW = { w: 400, h: 416, vertical: false, crossStart: 36, crossEnd: 380, alongStart: 22, alongEnd: 378, cap: 7 };
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

	function onBeadClick(event, movie) {
		event.preventDefault();
		onselect(movie);
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
					href="#selected-film"
					aria-controls="selected-film"
					aria-current={selectedMovie?.id === item.movie.id ? 'true' : undefined}
					aria-label={`${item.movie.title}, ${item.movie.runtime || 'unknown'} minutes, watched ${formatDate(item.movie.watchedDate)}${item.fav ? ', favourite' : ''}`}
					onclick={(event) => onBeadClick(event, item.movie)}
				>
					<title>{item.movie.title}</title>
					<circle class="bead-hit" cx={item.x} cy={item.y} r={narrow ? Math.max(item.r + 4, 14) : Math.max(item.r + 5, 18)} />
					{#if !item.fav}
					<circle
						class:selected={selectedMovie?.id === item.movie.id}
						class="bead"
						style={`--tone:${item.tone}`}
						cx={item.x}
						cy={item.y}
						r={item.r}
					/>
					{/if}
					{#if item.fav}
						<path
						    class:selected={selectedMovie?.id === item.movie.id}
							class="beadheart"
							d={HEART_PATH}
							transform={`translate(${item.x} ${item.y}) scale(${item.r * 0.095}) translate(-12 -12.2)`}
							
						/>
					{/if}
				</a>
			</g>
		{/each}
	</svg>


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
	/* Page layout and responsive presentation. */
	.abacus-controls { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:15px 0; font-size:.75rem; text-transform:uppercase; }
	.abacus-controls p { letter-spacing:.08em; }
	.abacus-controls label { display:flex; align-items:center; gap:10px; }
	.abacus-controls select { margin:0; padding:6px 25px 6px 7px; color:var(--bg); background:var(--fill); border-radius: 1rem; }
	.abacus-stage {  position:relative; width:min(100%, 960px); margin:auto; }
	svg { display:block; width:100%; height:auto; overflow:visible; }

	/* rods: thin dashed stroke, small bar at each end */
	.rod { stroke:color-mix(in srgb, var(--fill) 55%, transparent); stroke-width:1.5; stroke-dasharray:2 6; vector-effect:non-scaling-stroke; }
	.rod-cap { stroke:color-mix(in srgb, var(--fill) 55%, transparent); stroke-width:2; vector-effect:non-scaling-stroke; }

	/* beads: flat circles, no outline; brightness follows your rating */
	.bead-motion { visibility:hidden; }
	/* Layout changes rewrite each bead's style; keep completed entrances visible. */
	:global([data-entrance-ready]) .bead-motion { visibility:visible; }
	.bead-link { cursor:pointer; }
	.bead-link:focus { outline:none; }
	.bead-hit { fill:transparent; pointer-events:all; }
	.bead { fill:var(--fill); opacity:var(--tone, 1); transition:filter 150ms ease, opacity 150ms ease; }
	.bead.selected, .bead-link:hover .bead, .bead-link:focus .bead { opacity:1; filter:drop-shadow(0 0 8px var(--fill)); }
	.beadheart { fill:red; pointer-events:none; }
	.beadheart.selected, .bead-link:hover .beadheart, .bead-link:focus-visible .beadheart { opacity:1; filter:drop-shadow(0 0 8px var(--fill)); }
     
	.runtime-legend { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:8px 12px; margin-top:12px; font-size:.66rem; text-transform:uppercase; }
	.runtime-key { display:flex; align-items:center; gap:5px; }
	.runtime-key i { display:block; flex:none; border-radius:50%; background:var(--fill); }
	.fav-key { display:grid !important; place-items:center; width:16px; height:16px; }
	.fav-key svg { width:10px; height:10px; fill:var(--heart); }

	.empty-state, .undated { font-size:.72rem; }
	.empty-state { padding:18px 0; }
	.undated { margin-top:12px; opacity:.65; text-transform:uppercase; }


	@media (max-width:650px) {
		.abacus-controls { align-items:flex-start; flex-direction:column; font-size:.7rem; }
		.abacus-controls select { font-size:inherit; }
		.runtime-legend { justify-content:center; font-size:.62rem; }
		.empty-state, .undated { font-size:.68rem; }
	}
	@media (prefers-reduced-motion:reduce) {
		.bead-motion { visibility:visible; }
		.bead { transition:none; }
	}
</style>
