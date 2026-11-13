<script>
	import { onMount, tick } from 'svelte';
	import RotationGauges from '$lib/music_data/RotationGauges.svelte';
	let viewTransition;
	let pageElement;

	function scrollCount(element, options) {
		let current = options;
		let disposed = false;
		let media;
		let gsap;
		function setup() {
			media?.revert();
			element.textContent = current.format(current.value);
			if (!gsap || disposed) return;
			media = gsap.matchMedia();
			media.add('(prefers-reduced-motion: no-preference)', () => {
				const { value, format } = current;
				const counter = { val: 0 };
				const render = () => { element.textContent = format(counter.val); };
				render();
				gsap.to(counter, {
					val: value,
					ease: 'none',
					scrollTrigger: {
						trigger: element.closest('.summary'),
						start: 'clamp(top bottom)',
						end: 'clamp(top 25%)',
						scrub: true,
						invalidateOnRefresh: true
					},
					onUpdate: render
				});
				return () => { element.textContent = format(value); };
			});
		}
		void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
			.then(([core, plugin]) => {
				if (disposed) return;
				gsap = core.gsap;
				gsap.registerPlugin(plugin.ScrollTrigger);
				setup();
			}).catch(() => { if (!disposed) element.textContent = current.format(current.value); });
		return {
			update(options) { current = options; setup(); },
			destroy() { disposed = true; media?.revert(); }
		};
	}
	onMount(() => {
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (motion.matches) return;
		const targets = [...pageElement.querySelectorAll(
			'header > *, .summary > div, .section-heading, .chart > li, .note'
		)];
		const pending = new Set();
		let frame;
		let stopped = false;
		let initial = true;
		const reveal = () => {
			frame = undefined;
			const batch = targets.filter((element) => pending.has(element));
			pending.clear();
			batch.forEach((element, index) => {
				element.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 70}ms`);
				element.classList.remove('reveal-pending');
				element.classList.add('reveal-visible');
				if (pageElement.classList.contains('entering') && element.matches('header > *, .summary > div')) {
					element.classList.add('reveal-initial');
				}
			});
		};
		const observer = new IntersectionObserver((entries) => {
			if (stopped) return;
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				pending.add(entry.target);
				observer.unobserve(entry.target);
			}
			if (!pending.size || frame !== undefined) return;
			// The first visible group uses View Transitions; scroll reveals animate
			// the live elements so document snapshots don't freeze scrolling or D3.
			if (initial && document.startViewTransition) {
				initial = false;
				pageElement.classList.add('entering');
				viewTransition = document.startViewTransition(reveal);
				const cleanup = () => pageElement?.classList.remove('entering');
				void viewTransition.finished.then(cleanup, cleanup);
			} else {
				initial = false;
				frame = requestAnimationFrame(reveal);
			}
		}, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
		targets.forEach((element) => {
			element.classList.add('reveal-pending');
			observer.observe(element);
		});
		const stop = () => {
			stopped = true;
			observer.disconnect();
			cancelAnimationFrame(frame);
			viewTransition?.skipTransition();
			targets.forEach((element) => element.classList.remove('reveal-pending', 'reveal-visible', 'reveal-initial'));
		};
		motion.addEventListener('change', stop);
		return () => { stop(); motion.removeEventListener('change', stop); };
	});
	function changePeriod(value) {
		const update = async () => { period = value; await tick(); };
		viewTransition?.skipTransition();
		if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			void update();
			return;
		}
		viewTransition = document.startViewTransition(update);
	}
	let { data } = $props();
	let group = $state('composer');
	let metric = $state('plays');
	let period = $state('week');

	const groups = { composer: 'Composers', artist: 'Artists', album: 'Albums', track: 'Tracks' };
	const periods = { week: 'Weeks', month: 'Months', year: 'Years' };
	const number = new Intl.NumberFormat('en-IN');
	const count = (value) => number.format(value);
	const trackTime = (track) => track.plays * track.durationMs;
	const plays = $derived(data.tracks.reduce((sum, track) => sum + track.plays, 0));
	const totalTime = $derived(data.tracks.reduce((sum, track) => sum + trackTime(track), 0));
	const missingPlays = $derived(data.tracks.reduce(
		(sum, track) => sum + (track.durationMs ? 0 : track.plays), 0
	));

	const minutes = (ms) => `${ms > 0 && ms < 30000 ? '<1' : count(Math.round(ms / 60000))} min`;

	function duration(ms) {
		const minutes = Math.round(ms / 60000);
		if (ms > 0 && !minutes) return '<1m';
		const hours = Math.floor(minutes / 60);
		return hours ? `${count(hours)}h ${minutes % 60}m` : `${minutes}m`;
	}

	const rankings = $derived.by(() => {
		const totals = new Map();
		for (const track of data.tracks) {
			const name = group === 'track'
				? [track.title, track.artist].filter(Boolean).join(' · ')
				: track[group] || `Unknown ${group}`;
			const value = metric === 'plays' ? track.plays : trackTime(track);
			totals.set(name, (totals.get(name) ?? 0) + value);
		}
		return [...totals].filter(([, value]) => value > 0)
			.sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))
			.slice(0, 10);
	});

	const history = $derived(data.periods[period].slice(-12));
	const peak = $derived(Math.max(1, ...history.map((row) => row.plays)));
</script>

<svelte:head>
	<title>Muzik — Ozprey</title>
	<meta name="description" content="A listening journal drawn from my Musicolet library." />
</svelte:head>

<main bind:this={pageElement}>
	<header>
		<p class="caption">Musicolet archive</p>
		<h1>Muzik</h1>
		<p class="intro">A listening journal in plays and hours.</p>
	</header>

	<dl class="summary" aria-label="Listening totals">
		<div><dt>Counted plays</dt><dd aria-label={count(plays)}><span aria-hidden="true" use:scrollCount={{ value: plays, format: (value) => count(Math.round(value)) }}>{count(plays)}</span></dd></div>
		<div><dt>Estimated listening time</dt><dd aria-label={plays && !totalTime ? 'Unavailable' : minutes(totalTime)}>
			{#if plays && !totalTime}Unavailable{:else}<span aria-hidden="true" use:scrollCount={{ value: totalTime, format: minutes }}>{minutes(totalTime)}</span>{/if}
		</dd></div>
		<div><dt>Tracks played</dt><dd>{count(data.tracks.length)} <small>/ {count(data.librarySize)}</small></dd></div>
	</dl>

	<section aria-labelledby="rotation">
		<div class="section-heading">
			<h2 id="rotation">On rotation</h2>
			<div class="controls">
				<label>Group <select bind:value={group}>
					{#each Object.entries(groups) as [value, name]}<option {value}>{name}</option>{/each}
				</select></label>
				<label>Rank by <select bind:value={metric}>
					<option value="plays">Plays</option><option value="time">Estimated time</option>
				</select></label>
			</div>
		</div>
		<RotationGauges {rankings} {metric} {totalTime} {plays} formatCount={count} formatDuration={duration} format={metric === 'plays' ? count : duration} />
		<p class="note">
			Estimated time uses full track length × counted plays.
			{#if missingPlays}{count(missingPlays)} plays have no recorded track length.{/if}
		</p>
	</section>

	<section aria-labelledby="history">
		<div class="section-heading">
			<h2 id="history">Listening history</h2>
			<div class="controls"><label>Period <select value={period} onchange={(event) => changePeriod(event.currentTarget.value)}>
				{#each Object.entries(periods) as [value, name]}<option {value}>{name}</option>{/each}
			</select></label></div>
		</div>
		<ul class="chart history-chart" aria-live="polite">
			{#each history as row}
				<li>
					<span class="name">{row.year}{row.bucket ? ` · ${period} ${row.bucket}` : ''}</span>
					<span class="rail" aria-hidden="true"><span style:width={`${100 * row.plays / peak}%`}></span></span>
					<span class="value">{count(row.plays)}</span>
				</li>
			{:else}
				<li class="empty">No {period} snapshots in this export.</li>
			{/each}
		</ul>
		{#if history.length}
			<p class="note">Counted plays from {history.length} saved {period} {history.length === 1 ? 'snapshot' : 'snapshots'}.</p>
		{/if}
	</section>
</main>

<style>
	@keyframes -global-muzik-rise {
		from { opacity: 0; transform: translateY(40px); }
		to { opacity: 1; transform: translateY(0); }
	}
	main :global(.reveal-pending) { opacity: 0; }
	main :global(.reveal-visible) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) var(--reveal-delay, 0ms) both;
	}
	.history-chart { view-transition-name: muzik-history; }
	:global(::view-transition-old(muzik-history)),
	:global(::view-transition-new(muzik-history)) {
		animation-duration: 320ms;
		animation-timing-function: cubic-bezier(.65, 0, .35, 1);
	}
	:global(html::view-transition-old(root)),
	:global(html::view-transition-new(root)) { animation: none; }
	:global(html::view-transition-group(root)) { z-index: -1; }
	main:global(.entering) .history-chart { view-transition-name: none; }
	main :global(.reveal-initial) { animation: none; }

	main:global(.entering) header > .caption:global(.reveal-visible) { view-transition-name: muzik-enter-caption; }
	:global(::view-transition-old(muzik-enter-caption)) { display: none; }
	:global(::view-transition-new(muzik-enter-caption)) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) 0ms both;
	}

	main:global(.entering) h1:global(.reveal-visible) { view-transition-name: muzik-enter-title; }
	:global(::view-transition-old(muzik-enter-title)) { display: none; }
	:global(::view-transition-new(muzik-enter-title)) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) 70ms both;
	}

	main:global(.entering) .intro:global(.reveal-visible) { view-transition-name: muzik-enter-intro; }
	:global(::view-transition-old(muzik-enter-intro)) { display: none; }
	:global(::view-transition-new(muzik-enter-intro)) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) 140ms both;
	}

	main:global(.entering) .summary > div:nth-child(1):global(.reveal-visible) { view-transition-name: muzik-enter-plays; }
	:global(::view-transition-old(muzik-enter-plays)) { display: none; }
	:global(::view-transition-new(muzik-enter-plays)) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) 210ms both;
	}

	main:global(.entering) .summary > div:nth-child(2):global(.reveal-visible) { view-transition-name: muzik-enter-time; }
	:global(::view-transition-old(muzik-enter-time)) { display: none; }
	:global(::view-transition-new(muzik-enter-time)) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) 280ms both;
	}

	main:global(.entering) .summary > div:nth-child(3):global(.reveal-visible) { view-transition-name: muzik-enter-tracks; }
	:global(::view-transition-old(muzik-enter-tracks)) { display: none; }
	:global(::view-transition-new(muzik-enter-tracks)) {
		animation: muzik-rise 760ms cubic-bezier(.65, 0, .35, 1) 350ms both;
	}

	@media (prefers-reduced-motion: reduce) {
		main :global(.reveal-pending) { opacity: 1; }
		main :global(.reveal-visible) { animation: none; }
		:global(::view-transition-new(*)), :global(::view-transition-old(*)) { animation: none !important; }
	}
	main { width: min(1240px, calc(100% - 40px)); margin: auto; padding: clamp(84px, 12vw, 150px) 0 96px; }
	h1, h2, dd { font-family: var(--mfont), serif; font-weight: 400; }
	h1 { font-size: clamp(5rem, 16vw, 13rem); text-transform: uppercase; line-height: .83; margin-block: .12em .16em; }
	.intro { font-size: clamp(1.25rem, 2.5vw, 1.9rem); font-style: italic; }
	.caption, dt, label { font-size: .86rem; letter-spacing: .09em; text-transform: uppercase; }
	.summary { position: relative; display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 16px; margin-block: clamp(48px, 8vw, 100px); }
	.summary::before, .summary::after {
		content: ''; position: absolute; left: 0; right: 0; height: 1px;
		background: currentColor; transform-origin: left;
		animation: summary-line 1000ms cubic-bezier(.65, 0, .35, 1) both;
	}
	.summary::before { top: 0; }
	.summary::after { bottom: 0; animation-delay: 140ms; }
	@keyframes summary-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
	@media (prefers-reduced-motion: reduce) {
		.summary::before, .summary::after { animation: none; }
	}
	.summary div { padding-block: 20px; }
	dd { font-size: clamp(2.25rem, 6vw, 5.5rem); line-height: 1.05; font-variant-numeric: tabular-nums; }
	dd small { font-size: .48em; }
	section + section { margin-top: clamp(50px, 10vw, 120px); }
	.section-heading { display: flex; justify-content: space-between; align-items: end; flex-wrap: wrap; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid currentColor; }
	h2 { font-size: clamp(2.6rem, 6vw, 6rem); line-height: .9; }
	.controls { display: flex; flex-wrap: wrap; gap: 12px; }
	label { display: flex; align-items: center; gap: 8px; }
	select { background: var(--fill); color: var(--bg); margin: 0; padding: 5px 9px; font-size: 1rem; }
	select:focus-visible { outline: 2px solid var(--heart); outline-offset: 3px; }
	.chart { list-style: none; }
	.chart li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(32px, 1.5fr) minmax(2ch, auto); align-items: center; gap: clamp(10px, 2vw, 24px); padding-block: 13px; border-bottom: 1px solid color-mix(in srgb, currentColor 28%, transparent); font-size: clamp(1rem, 2vw, 1.3rem); }
	.chart .empty { display: block; }
	.name { overflow-wrap: anywhere; }
	.rail { background: color-mix(in srgb, currentColor 15%, transparent); height: 5px; }
	.rail span { display: block; height: 100%; background: currentColor; }
	.chart li:first-child .rail span { background: var(--heart); }
	.value { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
	.note { margin-top: 13px; font-size: 1rem; opacity: .82; }
	@media (max-width: 510px) {
		.summary { grid-template-columns: 1fr 1fr; }
		.summary div:nth-child(2) { grid-row: 2; grid-column: 1 / -1; padding-top: 0; }
		.chart li { grid-template-columns: minmax(0, 1.35fr) minmax(24px, .8fr) minmax(2ch, auto); }
	}
</style>
