<script>
	import Panels from '../movies/MoviePanels.svelte';
	import MinimalSelect from '../movies/MinimalSelect.svelte';
	import { reveal, drawRules } from '../movies/reveal.js';
	import { readingStats, statusNames } from '$lib/books/data.js';
	import ReadingShelf from './ReadingShelf.svelte';
	import BookPatterns from './BookPatterns.svelte';
	import BookCover from './BookCover.svelte';

	let { data } = $props();
	let status = $state('3');
	let author = $state('');
	let decade = $state(null);
	let genre = $state('');
	let query = $state('');
	let sort = $state('title');
	let selectedId = $state(null);
	const number = new Intl.NumberFormat('en-IN');
	const stats = $derived(readingStats(data.books));
	const scope = $derived(data.books.filter(book => !status || book.status === Number(status)));
	const genres = $derived([...new Set(scope.flatMap(book => book.genres))].sort());
	const matching = $derived(scope.filter(book =>
		(!author || book.authors.includes(author)) &&
		(decade === null || (book.year >= decade && book.year < decade + 10)) &&
		(!genre || book.genres.includes(genre)) &&
		(!query.trim() || `${book.title} ${book.authors.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
	));
	const indexed = $derived([...matching].sort((a, b) => {
		if (sort === 'pages') return (b.pages ?? -1) - (a.pages ?? -1) || a.title.localeCompare(b.title);
		if (sort === 'year') return (b.year ?? -1) - (a.year ?? -1) || a.title.localeCompare(b.title);
		if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title);
		return a.title.localeCompare(b.title);
	}));
	const selected = $derived(matching.find(book => book.id === selectedId) ?? matching.find(book => book.status === 2) ?? matching[0] ?? null);
	function reset() { author = ''; decade = null; genre = ''; query = ''; }
	function changeStatus() { reset(); selectedId = null; }
</script>

<svelte:head>
	<title>Books — Ozprey</title>
	<meta name="description" content="A reading life in books, pages, and familiar voices. Ozprey's reading collection, from Hardcover." />
</svelte:head>

{#snippet collectionSelect()}
	<label class="collection-select">Collection <MinimalSelect label="Reading collection" bind:value={status} onchange={changeStatus}>
		<option value="">All books</option>
		{#each Object.entries(statusNames) as [value, name]}<option {value}>{name}</option>{/each}
	</MinimalSelect></label>
{/snippet}

{#snippet activeFilters()}
	{#if author || decade !== null || genre || query}
		<div class="active-filters">
			{#if author}<button onclick={() => author = ''} aria-label={`Remove ${author} filter`}>{author} ×</button>{/if}
			{#if decade !== null}<button onclick={() => decade = null} aria-label={`Remove ${decade}s filter`}>{decade}s ×</button>{/if}
			{#if genre}<button onclick={() => genre = ''} aria-label={`Remove ${genre} filter`}>{genre} ×</button>{/if}
			<button onclick={reset}>Clear filters</button>
		</div>
	{/if}
{/snippet}

<main class="books-page">
	<Panels ready={true} labels={['Books', 'The shelf', 'Authors & eras', 'The index']} panelLabel="Book panels">
		<section class="movie-panel film-intro books-intro" aria-labelledby="books-title">
			<div class="title-composition">
				<p use:reveal class="eyebrow">A personal library / <a href={data.profile.url} target="_blank" rel="noreferrer">@{data.profile.username} ↗</a></p>
				<h1 id="books-title" use:reveal={{ distance: 32, duration: 1100 }}>Books</h1>
				<div class="title-caption" use:reveal={{ distance: 18 }}>
					<span>A reading life,<br />in pages.</span>
					<svg class="book-mark" viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M60 54C42 42 23 40 4 44V8c21-4 39 0 56 12 17-12 35-16 56-12v36c-19-4-38-2-56 10ZM60 20v34M12 3C32 0 48 5 60 14 72 5 88 0 108 3" /></svg>
					<span class="chapter-note">Stories kept.<br />Worlds revisited.</span>
				</div>
			</div>
			<footer class="summary-bar" use:drawRules>
				<dl class="summary" aria-label="All-time completed reading totals">
					<div use:reveal><dt>Books read</dt><dd>{number.format(stats.read)}</dd></div>
					<div use:reveal><dt>Pages in read books</dt><dd>{number.format(stats.pages)}</dd></div>
					<div use:reveal><dt>Authors read</dt><dd>{number.format(stats.authors)}</dd></div>
					<div use:reveal><dt>Currently reading</dt><dd>{number.format(stats.reading)}</dd></div>
				</dl>
				<p class="source">Via <a href={data.profile.url} target="_blank" rel="noreferrer">Hardcover ↗</a>{#if stats.missingPages} · {stats.missingPages} read books have no page count{/if}{#if data.stale} · Last saved collection{/if}</p>
			</footer>
		</section>

		<section class="movie-panel shelf-panel" aria-label="Interactive reading shelf">
			<div class="panel-toolbar"><span class="eyebrow">01 / A shelf of stories</span>{@render collectionSelect()}</div>
			{@render activeFilters()}
			{#if data.unavailable}<p class="notice" role="status">The reading collection is temporarily unavailable. <a href={data.profile.url}>Visit my Hardcover library ↗</a></p>{/if}
			<div class="shelf-content"><ReadingShelf books={matching} {selected} onselect={(id) => selectedId = id} /></div>
		</section>

		<section class="movie-panel patterns-panel" aria-label="Reading patterns by author and publication decade">
			<div class="panel-toolbar"><span class="eyebrow">02 / Patterns in the pages</span>{@render collectionSelect()}</div>
			{@render activeFilters()}
			<div class="patterns-content"><BookPatterns books={scope} bind:author bind:decade /></div>
		</section>

		<section class="movie-panel index-panel" aria-labelledby="index-title">
			<div class="heading" use:drawRules><h2 id="index-title" use:reveal>The index</h2><span aria-live="polite">{matching.length} of {scope.length} books</span></div>
			<div class="filters">
				<input type="search" bind:value={query} placeholder="Find a book or author" aria-label="Find a book or author" />
				{@render collectionSelect()}
				<MinimalSelect label="Book genre" bind:value={genre}><option value="">All genres</option>{#each genres as name}<option value={name}>{name}</option>{/each}</MinimalSelect>
				<MinimalSelect label="Sort books" bind:value={sort}><option value="title">Title A–Z</option><option value="year">Newest published</option><option value="pages">Most pages</option><option value="rating">Highest rated</option></MinimalSelect>
			</div>
			{@render activeFilters()}
			<div class="list-scroll" role="region" aria-label="Book index">
				{#if indexed.length}
					<ul class="book-index">
						{#each indexed as book (book.id)}
							<li><a href={book.url} target="_blank" rel="noreferrer">
								<span class="index-cover"><BookCover {book} /></span>
								<span class="index-title">{book.title}<small>{book.authors.join(' / ') || 'Author not recorded'}</small></span>
								<span class="index-status">{statusNames[book.status] ?? 'On the shelf'}</span>
								<span class="index-year">{book.year ?? '—'}</span><span class="index-pages">{book.pages ? `${number.format(book.pages)} pp` : '—'}</span><span class="index-arrow" aria-hidden="true">↗</span>
							</a></li>
						{/each}
					</ul>
				{:else}<p class="empty">{data.unavailable ? 'The library will return when Hardcover is available.' : 'No books in this selection.'}{#if author || decade !== null || genre || query} <button onclick={reset}>Clear filters</button>{/if}</p>{/if}
			</div>
			<footer class="index-footer"><a href={data.profile.url} target="_blank" rel="noreferrer">The complete collection on Hardcover ↗</a><nav aria-label="Other collections"><a href="/movies">Films</a><a href="/music">Music</a></nav></footer>
		</section>
	</Panels>
</main>

<style>
	.books-page { width:min(1400px,calc(100% - 40px)); margin:auto; padding-bottom:60px; color:var(--fill); font-family:var(--bfont); }
	a { color:inherit; text-underline-offset:4px; }
	.books-intro { display:grid; grid-template-rows:minmax(0,1fr) auto; height:100svh; }
	.title-composition { display:flex; flex-direction:column; justify-content:center; width:min(100%,950px); margin:auto; padding-top:60px; }
	.eyebrow { font-size:.7rem; letter-spacing:.1em; line-height:1.6; text-transform:uppercase; }
	.eyebrow a { text-decoration:none; }
	h1 { margin:0; font:400 clamp(100px,23vw,330px)/.95 var(--mfont); letter-spacing:-.045em; }
	.title-caption { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-top:24px; font-size:.9rem; line-height:1.5; }
	.book-mark { width:clamp(72px,9vw,120px); height:auto; color:var(--heart); }
	.chapter-note { text-align:right; opacity:.65; }
	.summary-bar { padding-top:16px; border-top:1px solid currentColor; }
	.summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; text-align:center; }
	.summary > div { display:flex; flex-direction:column-reverse; gap:6px; }
	.summary dd { font:400 clamp(2.2rem,6vw,5.5rem)/1 var(--mfont); font-variant-numeric:tabular-nums; }
	.summary dt { font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; }
	.source { margin:16px 0 8px; text-align:center; font-size:.7rem; opacity:.6; line-height:1.5; }
	.shelf-panel, .patterns-panel, .index-panel { margin-top:72px; }
	.panel-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:28px; }
	.collection-select { display:flex; align-items:center; gap:8px; font-size:.75rem; }
	.active-filters { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; font-size:.75rem; color:var(--heart); }
	button, input { font:inherit; color:inherit; background:transparent; margin:0; border-radius:0; }
	button { cursor:pointer; }
	.active-filters button { padding:6px 10px; min-height:32px; border:1px solid color-mix(in srgb,var(--heart) 40%,transparent); border-radius:999px; }
	.heading { display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding-bottom:16px; border-bottom:1px solid currentColor; }
	h2 { font:400 clamp(2.4rem,4vw,4rem)/1 var(--mfont); }
	.heading > span { font-size:.8rem; opacity:.6; }
	.filters { display:flex; flex-wrap:wrap; align-items:center; gap:8px 20px; margin:16px 0; font-size:.8rem; }
	.filters input { flex:1 1 180px; min-width:0; min-height:44px; padding:10px 12px; border:1px solid color-mix(in srgb,var(--fill) 30%,transparent); border-radius:12px; }
	.book-index { list-style:none; margin:0; padding:0; border-top:1px solid color-mix(in srgb,var(--fill) 20%,transparent); }
	.book-index a { display:grid; grid-template-columns:36px minmax(0,1fr) 100px 4ch 7ch 20px; align-items:center; gap:20px; min-height:84px; padding:12px 4px; text-decoration:none; border-bottom:1px solid color-mix(in srgb,var(--fill) 20%,transparent); }
	.index-cover { width:32px; }
	.index-title { font-size:1rem; line-height:1.4; }
	.index-title small { display:block; margin-top:4px; font-size:.75rem; opacity:.6; }
	.index-status, .index-year, .index-pages { font-size:.75rem; opacity:.65; }
	.index-year, .index-pages { text-align:right; font-variant-numeric:tabular-nums; }
	.index-arrow, .book-index a:hover .index-title { color:var(--heart); }
	.index-footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-top:16px; font-size:.7rem; opacity:.6; }
	.index-footer nav { display:flex; gap:20px; }
	.empty, .notice { padding-block:24px; font-size:.9rem; line-height:1.6; opacity:.7; }
	.empty button { text-decoration:underline; }
	button:focus-visible, input:focus-visible, a:focus-visible, .list-scroll:focus-visible { outline:2px solid var(--heart); outline-offset:4px; }
	@media(orientation:landscape) {
		.books-page { width:100%; padding:0; }
		.books-intro { height:100%; }
		.title-composition { padding:clamp(45px,8svh,80px) 20px 20px; }
		h1 { font-size:min(26vw,43svh,330px); }
		.title-caption { margin-top:16px; }
		.summary dd { font-size:clamp(2rem,8svh,5rem); }
		.shelf-panel, .patterns-panel, .index-panel { display:flex; flex-direction:column; }
		.panel-toolbar { flex:none; margin-bottom:16px; }
		.shelf-content, .patterns-content { flex:1; min-height:0; }
		.heading, .filters, .active-filters, .index-footer { flex:none; }
		.list-scroll { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; padding-right:8px; }
	}
	@media(max-width:600px) and (orientation:portrait) {
		.summary { grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
		.summary dd { font-size:2.8rem; }
		.title-composition { padding-top:40px; }
		.title-caption { gap:16px; font-size:.75rem; }
		.panel-toolbar { align-items:flex-start; flex-wrap:wrap; gap:4px; }
		.book-index a { grid-template-columns:32px minmax(0,1fr) 4ch 16px; gap:12px; }
		.index-status, .index-pages { display:none; }
		.index-title { font-size:.9rem; }
		.index-title small { font-size:.7rem; }
	}
	@media(orientation:landscape) and (max-height:500px) {
		.title-composition { padding-top:30px; }
		h1 { font-size:36svh; }
		.title-caption { margin-top:6px; font-size:.7rem; }
		.book-mark { width:60px; }
		.summary-bar { padding-top:8px; }
		.summary dd { font-size:7svh; }
		.source { margin-top:8px; }
		.summary dt { font-size:.6rem; }
	}
</style>
