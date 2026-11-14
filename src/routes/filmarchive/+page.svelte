<script>
	import { onMount } from 'svelte';

	let { data } = $props();
	let refreshed = $state(null);
	const collection = $derived(refreshed ?? data);
	let refreshing = $state(false);

	onMount(() => {
		if (!data.stale) return;
		const controller = new AbortController();
		refreshing = true;
		fetch('/filmarchive/data', { signal: controller.signal })
			.then((response) => response.ok ? response.json() : null)
			.then((result) => { if (result && !result.stale) refreshed = result; })
			.catch(() => {})
			.finally(() => { refreshing = false; });
		return () => controller.abort();
	});
	let query = $state('');
	let type = $state('all');
	let decade = $state(null);
	let genre = $state('');
	let language = $state('');
	let limit = $state(24);

	const number = new Intl.NumberFormat('en-IN');
	const languages = new Intl.DisplayNames(['en'], { type: 'language' });
	const label = (code) => code ? languages.of(code) || code : '';
	const genreNames = $derived([...new Set(collection.archive.items.flatMap((item) => item.genres))].sort());
	const filtered = $derived(collection.archive.items.filter((item) =>
		(type === 'all' || item.type === type) &&
		(!genre || item.genres.includes(genre)) &&
		(!language || item.language === language) &&
		(!query.trim() || item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
	));
	const dated = $derived(filtered.filter((item) => item.year));
	const decades = $derived.by(() => {
		const groups = new Map();
		for (const item of dated) {
			const year = Math.floor(item.year / 10) * 10;
			const counts = groups.get(year) ?? { year, movie: 0, tv: 0 };
			counts[item.type]++;
			groups.set(year, counts);
		}
		return [...groups.values()].sort((a, b) => a.year - b.year);
	});
	const maxCount = $derived(Math.max(1, ...decades.map((d) => d.movie + d.tv)));
	const visible = $derived(filtered.filter((item) =>
		decade === null || (item.year >= decade && item.year < decade + 10)
	));
	const movieCount = $derived(visible.filter((item) => item.type === 'movie').length);
	const tvCount = $derived(visible.length - movieCount);
	const years = $derived(visible.filter((item) => item.year).map((item) => item.year));
	const languageCounts = $derived.by(() => {
		const counts = new Map();
		for (const item of collection.archive.items) {
			if (item.language) counts.set(item.language, (counts.get(item.language) ?? 0) + 1);
		}
		return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
	});

	function selectDecade(year) {
		decade = decade === year ? null : year;
		limit = 24;
	}

	function reset() {
		query = '';
		type = 'all';
		genre = '';
		language = '';
		decade = null;
		limit = 24;
	}
</script>

<svelte:head>
	<title>Film Archive — Ozprey</title>
	<meta name="description" content="Explore heyWatched through a film and television archive by release decade." />
</svelte:head>

{#snippet dot(kind)}
	<svg class="dot" viewBox="0 0 16 16" aria-hidden="true">
		<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
		{#if kind === 'movie'}<path d="M8 2a6 6 0 0 0 0 12Z" fill="currentColor" />{/if}
	</svg>
{/snippet}

<main>
	<header>
		<a class="back" href="/movies">← Films</a>
		<h1>Film <em>Archive</em></h1>
		<a class="source" href={data.source}>heyWatched <span aria-hidden="true">↗</span></a>
	</header>

	{#if collection.archive}
		{#if collection.stale && !refreshing}<p class="notice">Showing the last available copy of the list.</p>{/if}
		<dl class="totals" aria-live="polite">
			<div><dt>{@render dot('movie')} Films</dt><dd>{number.format(movieCount)}</dd></div>
			<div><dt>{@render dot('tv')} Series</dt><dd>{number.format(tvCount)}</dd></div>
			<div><dt>Release years</dt><dd>{years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—'}</dd></div>
		</dl>

		<section aria-labelledby="decades-title">
			<div class="heading">
				<h2 id="decades-title">Release decades</h2>
				<p>Select a decade to filter the index.</p>
			</div>
			{#if decades.length}
				<div class="chart" style:--columns={decades.length}>
					{#each decades as bin (bin.year)}
						<button class="column" class:muted={decade !== null && decade !== bin.year}
							aria-pressed={decade === bin.year}
							aria-label={`${bin.year}s, ${bin.movie} films and ${bin.tv} series`}
							onclick={() => selectDecade(bin.year)}>
							<span class="plot">
								<span class="stem" style:--height={`${(bin.movie + bin.tv) / maxCount * 100}%`}>
									{#if bin.movie}<span class="solid" style:flex-grow={bin.movie}></span>{/if}
									{#if bin.tv}<span class="outline" style:flex-grow={bin.tv}></span>{/if}
									<span class="value">{bin.movie + bin.tv}</span>
								</span>
							</span>
							<span class="tick">{bin.year}s</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="notice">No dated releases match these filters.</p>
			{/if}
			{#if filtered.length > dated.length}
				<p class="notice">{number.format(filtered.length - dated.length)} without a release year appear in the index.</p>
			{/if}
		</section>

		{#if languageCounts.length}
			<section aria-labelledby="languages-title">
				<div class="heading"><h2 id="languages-title">Original languages</h2><p>Six most common in the archive</p></div>
				<div class="languages">
					{#each languageCounts as [code, count] (code)}
						<button aria-pressed={language === code} onclick={() => {
							language = language === code ? '' : code;
							limit = 24;
						}}>
							<span>{label(code)}</span>
							<span class="language-track"><span style:--weight={`${count / languageCounts[0][1] * 100}%`}></span></span>
							<span>{number.format(count)}</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<section aria-labelledby="index-title">
			<div class="heading">
				<h2 id="index-title">{decade === null ? 'Title index' : `${decade}s index`}</h2>
				<p aria-live="polite">{number.format(visible.length)} {visible.length === 1 ? 'title' : 'titles'}</p>
			</div>
			<div class="filters">
				<input type="search" placeholder="Find a title" aria-label="Find a title" bind:value={query} oninput={() => limit = 24} />
				<select aria-label="Format" bind:value={type} onchange={() => limit = 24}>
					<option value="all">All formats</option><option value="movie">Films</option><option value="tv">Series</option>
				</select>
				<select aria-label="Genre" bind:value={genre} onchange={() => limit = 24}>
					<option value="">All genres</option>
					{#each genreNames as name}<option value={name}>{name}</option>{/each}
				</select>
				{#if query || type !== 'all' || genre || language || decade !== null}
					<button onclick={reset}>Reset</button>
				{/if}
			</div>
			{#if visible.length}
				<ul class="index">
					{#each visible.slice(0, limit) as item (item.key)}
						<li><a href={`https://www.themoviedb.org/${item.key}`}>
							{@render dot(item.type)}
							<span class="title">{item.title}</span>
							<span class="language">{label(item.language)}</span>
							<span class="year">{item.year ?? '—'}</span>
							<span aria-hidden="true">↗</span>
						</a></li>
					{/each}
				</ul>
				{#if limit < visible.length}
					<button class="more" onclick={() => limit += 24}>Show more titles</button>
				{/if}
			{:else}
				<p class="notice">No titles match these filters.</p>
			{/if}
		</section>
		<footer>Data from <a href={data.source}>The Movie Database</a></footer>
	{:else}
		<p class="notice">The archive is temporarily unavailable. You can still <a href={data.source}>view heyWatched on TMDB</a>.</p>
	{/if}
</main>

<style>
	main { width: min(100%, 76rem); margin-inline: auto; padding: clamp(5rem, 12vw, 9rem) clamp(1.25rem, 5vw, 4rem) 4rem; }
	header { position: relative; padding-bottom: clamp(1.5rem, 5vw, 3.5rem); }
	a { color: inherit; text-underline-offset: .22em; }
	.back, .source, .heading p, .notice, footer { font-size: clamp(.95rem, 2vw, 1.15rem); }
	.source { position: absolute; right: 0; bottom: 1rem; }
	h1, h2 { font-weight: 400; }
	h1 { margin-top: .1em; font-size: clamp(3.5rem, 13vw, 10rem); line-height: .92; letter-spacing: -.035em; }
	h1 em { font-style: italic; color: var(--heart); }
	h2 { font-size: clamp(2rem, 4vw, 3.6rem); line-height: 1; }
	.totals { display: grid; grid-template-columns: repeat(3, 1fr); border-block: 1px solid var(--rule); }
	main { --rule: color-mix(in srgb, var(--fill) 30%, transparent); }
	.totals > div { display: grid; gap: .25rem; padding: .75rem clamp(.4rem, 2vw, 1rem); }
	.totals > div + div { border-left: 1px solid var(--rule); }
	dt { display: flex; align-items: center; gap: .35rem; font-size: clamp(.9rem, 2vw, 1.25rem); }
	dd { font-size: clamp(1.55rem, 5vw, 4rem); font-variant-numeric: tabular-nums; line-height: 1; }
	.dot { width: .85rem; height: .85rem; flex: none; color: var(--heart); }
	section { margin-top: clamp(2rem, 6vw, 5rem); }
	.heading { display: flex; align-items: end; flex-wrap: wrap; justify-content: space-between; gap: .5rem 1rem; margin-bottom: 1rem; }
	.chart { display: grid; grid-template-columns: repeat(var(--columns), minmax(2.3rem, 1fr)); overflow-x: auto; padding: .4rem 2px .25rem; }
	button, select, input { margin: 0; border-radius: 0; color: inherit; background: transparent; }
	button, select { cursor: pointer; }
	button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible { outline: 1px solid var(--heart); outline-offset: 2px; }
	.column { padding: 0; min-width: 0; transition: opacity .18s ease; }
	.column.muted { opacity: .47; }
	.column:hover, .column:focus-visible { opacity: 1; }
	.column[aria-pressed="true"] .tick { color: var(--heart); }
	.plot { position: relative; display: flex; justify-content: center; align-items: end; height: clamp(8rem, 22vw, 14rem); border-bottom: 1px solid var(--rule); padding-top: 1.3rem; }
	.stem { position: relative; display: flex; flex-direction: column-reverse; width: clamp(.45rem, 1.4vw, 1rem); height: var(--height); min-height: 3px; color: var(--heart); }
	.solid { background: linear-gradient(90deg, currentColor 50%, transparent 50%); }
	.outline, .solid { border: 1px solid currentColor; flex-basis: 0; }
	.value { position: absolute; left: 50%; bottom: calc(100% + .18rem); transform: translateX(-50%); font-size: .84rem; }
	.tick { display: block; padding-block: .4rem; font-size: .85rem; }
	.notice { margin-block: .75rem; }
	.languages { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 25rem), 1fr)); gap: .25rem 2rem; }
	.languages button { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr) 2.5rem; align-items: center; gap: .65rem; min-height: 44px; padding: .35rem .15rem; text-align: left; border-bottom: 1px solid var(--rule); }
	.languages button span:last-child { text-align: right; }
	.languages button[aria-pressed="true"] { color: var(--heart); }
	.language-track { height: 1px; background: var(--rule); }
	.language-track > span { position: relative; display: block; width: var(--weight); height: 1px; background: var(--heart); }
	.language-track > span::after { content: ''; position: absolute; top: 50%; right: 0; width: .4rem; height: .4rem; transform: translateY(-50%); border-radius: 50%; border: 1px solid var(--heart); background: var(--bg); }
	.filters { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
	.filters > *, .more { min-height: 44px; border: 1px solid var(--rule); padding: .45rem .75rem; font-size: 1.1rem; }
	.filters input { flex: 1 1 12rem; min-width: 0; }
	select { color-scheme: dark; }
	.index { list-style: none; border-top: 1px solid var(--rule); }
	.index a { display: grid; grid-template-columns: auto minmax(0, 1fr) auto 3.4em auto; gap: clamp(.35rem, 1.5vw, 1rem); align-items: center; min-height: 46px; padding: .5rem .2rem; border-bottom: 1px solid var(--rule); text-decoration: none; }
	.index a:hover .title { color: var(--heart); }
	.title { font-size: clamp(1.15rem, 2.4vw, 1.65rem); line-height: 1.1; }
	.year { text-align: right; font-variant-numeric: tabular-nums; }
	.more { margin-top: 1rem; }
	footer { margin-top: 3rem; }
	@media (max-width: 34rem) { .index a { grid-template-columns: auto minmax(0, 1fr) 2.6em auto; } .language { display: none; } }
	@media (prefers-reduced-motion: reduce) { .column { transition: none; } }
</style>
