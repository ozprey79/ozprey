<script>
	let { items, view, scrobbleCount, range } = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;

	let hoveredItem = $state(null);

	const rings = $derived(
		Array.from({ length: range.days }, (_, index) => {
			const date = new Date(range.from + index * DAY_MS);
			return {
				index,
				radius: 70 + index * 42,
				label: date.toLocaleDateString('en-GB', {
					weekday: 'short',
					day: '2-digit',
					timeZone: 'UTC'
				}).toUpperCase()
			};
		})
	);

	const plottedItems = $derived.by(() => {
		const grouped = Array.from({ length: range.days }, () => []);
		for (const item of items) {
			const ring = Math.floor((item.latestListen * 1000 - range.from) / DAY_MS);
			if (ring >= 0 && ring < range.days) grouped[ring].push(item);
		}

		return grouped.flatMap((group, ring) =>
			group.map((item, index) => {
				const duration = 55 + ring * 6 + (index % 7) * 5;
				return {
					item,
					orbitRadius: rings[ring].radius,
					nodeRadius: nodeRadius(item.plays),
					duration,
					delay: group.length ? -(duration * index / group.length) : 0
				};
			})
		);
	});

	function nodeRadius(plays) {
		return 6 + Math.min(16, Math.sqrt(Math.max(0, plays - 1)) * 4);
	}

	function formatListen(timestamp) {
		if (!timestamp) return 'Listen time unavailable';
		return new Date(timestamp * 1000).toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function showCard(item) {
		hoveredItem = item;
	}

	function hideCard(item) {
		if (hoveredItem?.id === item.id) hoveredItem = null;
	}
</script>

<div class="orbit-controls">
	<p><strong>{items.length}</strong> {view === 'albums' ? 'albums' : 'tracks'} · <strong>{scrobbleCount}</strong> scrobbles</p>
	<p>Latest {range.days} days</p>
</div>

<div class="orbit-stage">
	<svg viewBox="0 0 800 800" role="img" aria-labelledby="music-orbit-title music-orbit-description">
	    <defs>
	    <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stop-color="rgb(255, 192, 236)" />
            <stop offset="40%" stop-color="rgb(255, 192, 236)" />
            <stop offset="100%" stop-color="black" />
          </linearGradient>

		  <filter id="noise">
            <feTurbulence
               type="fractalNoise"
               baseFrequency="19.5"
               numOctaves="10"
               result="turbulence"
            />
            <feComposite operator="in" in="turbulence" in2="SourceAlpha" result="composite"/>
            <feColorMatrix in="composite" type="luminanceToAlpha" />
            <feBlend in="SourceGraphic" in2="composite" mode="color-burn" />
         </filter>
	
	</defs>
		<title id="music-orbit-title">Recent {view === 'albums' ? 'albums' : 'individual tracks'} in orbit</title>
		<desc id="music-orbit-description">Each ring represents a listening day. Larger planets were played more often. Focus or hover on a planet to read its collectible card.</desc>

		{#each [...rings].reverse() as ring}
			<circle class="orbit-ring" cx="400" cy="400" r={ring.radius} />
			<text class="day-label" x="408" y={404 - ring.radius}>{ring.label}</text>
		{/each}

		<circle class="sun" cx="400" cy="400" r="34" />
		<text class="sun-label" x="400" y="397">SCROBBLED</text>
		<text class="sun-period" x="400" y="412">7 DAYS</text>

		{#each plottedItems as plotted (plotted.item.id)}
			<g
				class="orbit-motion"
				style={`--orbit-duration:${plotted.duration}s;--orbit-delay:${plotted.delay}s`}
				filter="url('#noise')"
			>
				<a
					class="planet-link"
					href={plotted.item.url}
					target="_blank"
					rel="noreferrer"
					aria-label={`${plotted.item.title} by ${plotted.item.artist}, ${plotted.item.plays} ${plotted.item.plays === 1 ? 'play' : 'plays'}`}
					onmouseenter={() => showCard(plotted.item)}
					onmouseleave={() => hideCard(plotted.item)}
					onfocus={() => showCard(plotted.item)}
					onblur={() => hideCard(plotted.item)}
				>
					<circle class="planet-hit" cx={400 + plotted.orbitRadius} cy="400" r="25" />
					<circle
						class="planet-node"
						class:selected={hoveredItem?.id === plotted.item.id}
						class:now-playing={plotted.item.nowPlaying}
						cx={400 + plotted.orbitRadius}
						cy="400"
						r={plotted.nodeRadius}
					/>
				</a>
			</g>
		{/each}
	</svg>

	{#if hoveredItem}
		<article class="music-card" aria-live="polite">
			<div class="card-foil" aria-hidden="true"></div>
			<header class="card-header">
				<p>{hoveredItem.nowPlaying ? 'Now playing' : formatListen(hoveredItem.latestListen)}</p>
				<span><strong>{hoveredItem.plays}</strong> {hoveredItem.plays === 1 ? 'play' : 'plays'}</span>
			</header>

			<h3>{hoveredItem.title}</h3>
			<p class="card-artist">{hoveredItem.artist}</p>

			<div class="card-art">
				{#if hoveredItem.artwork}
					<img src={hoveredItem.artwork} alt={`Artwork for ${hoveredItem.title}`} />
				{:else}
					<div class="card-art-fallback">Artwork unavailable</div>
				{/if}
			</div>

			<p class="card-spec">
				<span>{hoveredItem.kind}</span>
				{#if hoveredItem.kind === 'album'}
					<span>{hoveredItem.uniqueTracks} {hoveredItem.uniqueTracks === 1 ? 'track' : 'tracks'} heard</span>
				{:else if hoveredItem.album}
					<span>{hoveredItem.album}</span>
				{/if}
			</p>

			<div class="card-info">
				<strong>Artist</strong>
				<p>{hoveredItem.artist}</p>
			</div>

			<p class="card-link">Select planet to view on Last.fm ↗
				
			</p>
			<p class="card-number">LFM / {hoveredItem.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}</p>
		</article>
	{/if}

	<div class="plays-legend" aria-label="Planet size represents plays">
		<span>Plays</span>
		{#each [1, 5, 15] as plays}
			<span class="plays-key"><i style={`width:${nodeRadius(plays) * 2}px;height:${nodeRadius(plays) * 2}px`}></i>{plays}</span>
		{/each}
	</div>
</div>

{#if plottedItems.length === 0}
	<p class="empty-state">No {view === 'albums' ? 'album' : 'track'} scrobbles were found in this seven-day window.</p>
{/if}

<style>
	.orbit-controls { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:15px 0; font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; }
	.orbit-stage { position:relative; width:min(100%, 900px); margin:auto; }
	svg { display:block; width:100%; height:auto; overflow:visible; }
	.orbit-ring { fill:none; stroke:color-mix(in srgb, var(--fill) 28%, transparent); stroke-width:1; vector-effect:non-scaling-stroke; }
	.day-label { fill:var(--fill); font-family:'PlusJakartaSans-SemiBold', sans-serif; font-size:9px; letter-spacing:.08em; opacity:.72; }
	.sun { fill:var(--fill); }
	.sun-label, .sun-period { fill:var(--bg); font-family:'PlusJakartaSans-SemiBold', sans-serif; text-anchor:middle; }
	.sun-label { font-size:7px; letter-spacing:.1em; }
	.sun-period { font-size:7px; }
	.orbit-motion { transform-box:view-box; transform-origin:center; animation:orbit var(--orbit-duration) linear var(--orbit-delay) infinite; }
	.planet-link { cursor:pointer; }
	.planet-hit { fill:transparent; }
	.planet-node { fill:var(--fill); stroke:var(--bg); stroke-width:1.5; vector-effect:non-scaling-stroke; transition:stroke-width 150ms ease, filter 150ms ease; }
	.planet-node.selected, .planet-link:hover .planet-node, .planet-link:focus .planet-node { stroke-width:4; filter:drop-shadow(0 0 7px var(--fill)); }
	.planet-node.now-playing { animation:pulse 1.7s ease-in-out infinite alternate; }
	.music-card { position:absolute; z-index:5; left:clamp(8px, 3vw, 32px); top:50%; width:min(280px, 36%); min-width:230px; aspect-ratio:5/7; padding:14px; overflow:hidden; pointer-events:none; color:var(--bg); background:linear-gradient(145deg, color-mix(in srgb, var(--fill) 94%, white), color-mix(in srgb, var(--fill) 72%, #f3bd36)); border:7px solid color-mix(in srgb, var(--fill) 55%, #d6a52a); border-radius:16px; box-shadow:0 16px 35px rgba(0,0,0,.42), inset 0 0 0 2px color-mix(in srgb, var(--bg) 35%, transparent); transform:translateY(-50%) rotate(-1.25deg); }
	.card-foil { position:absolute; inset:0; pointer-events:none; opacity:.16; background:linear-gradient(115deg, transparent 16%, white 33%, transparent 48%, white 64%, transparent 81%); transform:translateX(-45%); animation:foil 3.6s ease-in-out infinite alternate; }
	.card-header { position:relative; display:flex; justify-content:space-between; align-items:center; gap:8px; }
	.card-header p, .card-header span, .card-artist, .card-spec, .card-info, .card-link, .card-number { font-family:'PlusJakartaSans-SemiBold', sans-serif; }
	.card-header p { font-size:.57rem; letter-spacing:.06em; text-transform:uppercase; }
	.card-header span { font-size:.63rem; white-space:nowrap; }
	.music-card h3 { position:relative; margin:5px 0 1px; font-family:var(--mfont); font-size:clamp(1.35rem, 2.2vw, 2rem); font-weight:400; line-height:.85; text-transform:uppercase; }
	.card-artist { position:relative; min-height:1.7em; margin:2px 0 7px; font-size:.58rem; letter-spacing:.08em; text-transform:uppercase; }
	.card-art { position:relative; aspect-ratio:1/1; overflow:hidden; border:4px ridge color-mix(in srgb, var(--bg) 45%, #d2a732); background:color-mix(in srgb, var(--bg) 82%, transparent); box-shadow:inset 0 0 18px rgba(0,0,0,.35); }
	.card-art img, .card-art-fallback { width:100%; height:100%; object-fit:cover; }
	.card-art-fallback { display:grid; place-items:center; padding:12px; color:var(--fill); font-size:.65rem; text-align:center; text-transform:uppercase; }
	.card-spec { position:relative; display:flex; justify-content:center; flex-wrap:wrap; gap:4px 10px; margin:6px 0; padding:3px 4px; font-size:.52rem; text-transform:uppercase; border-block:1px solid color-mix(in srgb, var(--bg) 35%, transparent); }
	.card-info { position:relative; min-height:36px; display:grid; grid-template-columns:42px 1fr; gap:6px; align-items:start; padding:3px 0; font-size:.58rem; }
	.card-info strong { text-transform:uppercase; }
	.card-info p { line-height:1.3; }
	.card-link { position:relative; color:inherit; font-size:.57rem; text-transform:uppercase; }
	.card-number { position:absolute; right:12px; bottom:7px; font-size:.45rem; opacity:.62; }
	.plays-legend { position:absolute; right:0; bottom:3%; display:flex; align-items:center; gap:12px; font-size:.66rem; text-transform:uppercase; }
	.plays-key { display:flex; align-items:center; gap:5px; }
	.plays-key i { display:block; flex:none; border-radius:50%; background:var(--fill); }
	.empty-state { padding:18px 0; font-size:.72rem; border-block:1px solid color-mix(in srgb, var(--fill) 45%, transparent); }
	@keyframes orbit { to { transform:rotate(360deg); } }
	@keyframes foil { to { transform:translateX(45%); } }
	@keyframes pulse { to { filter:drop-shadow(0 0 12px var(--fill)); stroke-width:5; } }
	@media (max-width:650px) {
		.orbit-controls { align-items:flex-start; flex-direction:column; }
		.plays-legend { position:static; justify-content:center; flex-wrap:wrap; margin-top:8px; }
		.day-label { font-size:11px; }
		.music-card { position:absolute; left:50%; top:50%; width:min(245px, 76%); min-width:0; transform:translate(-50%, -50%); }
	}
	@media (prefers-reduced-motion:reduce) {
		.orbit-motion, .planet-node.now-playing { animation-play-state:paused; }
		.planet-node { transition:none; }
		.card-foil { animation:none; }
	}
</style>
