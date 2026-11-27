<script>
	import { authorCounts } from '$lib/books/data.js';
	let { books, author = $bindable(''), decade = $bindable(null) } = $props();
	const authors = $derived(authorCounts(books).slice(0, 8));
	const maxAuthor = $derived(Math.max(1, ...authors.map(item => item.count)));
	const decades = $derived.by(() => {
		const counts = new Map();
		for (const book of books) if (book.year) { const year = Math.floor(book.year / 10) * 10; counts.set(year, (counts.get(year) || 0) + 1); }
		return [...counts].sort((a, b) => a[0] - b[0]);
	});
	const peak = $derived(Math.max(1, ...decades.map(([, count]) => count)));
</script>

<div class="patterns">
	<section aria-labelledby="authors-heading">
		<header><h2 id="authors-heading">Familiar voices</h2><span>Books per author</span></header>
		<p class="caption">The writers I return to. Select a name to filter the index.</p>
		{#if authors.length}
			<div class="authors">
				{#each authors as item}
					<button class:active={author === item.name} aria-pressed={author === item.name} onclick={() => author = author === item.name ? '' : item.name}>
						<span class="author-label">{item.name}</span><span class="bar-track"><span class="bar" style:width={`${item.count / maxAuthor * 100}%`}></span></span><span class="count">{item.count}</span>
					</button>
				{/each}
			</div>
		{:else}<p class="caption">Authors will appear as books are added.</p>{/if}
	</section>
	<section class="eras-section" aria-labelledby="eras-heading">
		<header><h2 id="eras-heading">Through the years</h2><span>Publication decades</span></header>
		<p class="caption">When these books first appeared. Select a decade to explore.</p>
		{#if decades.length}
			<div class="eras" style:--columns={decades.length}>
				{#each decades as [year, count]}
					<button class:active={decade === year} aria-pressed={decade === year} aria-label={`${year}s: ${count} books`} onclick={() => decade = decade === year ? null : year}>
						<span class="plot"><span class="era-bar" style:height={`${count / peak * 100}%`}><span>{count}</span></span></span><span class="tick">{year}s</span>
					</button>
				{/each}
			</div>
		{:else}<p class="caption">Publication years have not been recorded yet.</p>{/if}
		<p class="caption">{books.filter(book => !book.year).length ? `${books.filter(book => !book.year).length} books without a publication year.` : 'An entire reading life, across different eras.'}</p>
	</section>
</div>

<style>
	.patterns { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(32px,5vw,80px); height:100%; min-height:0; }
	section { min-width:0; }
	header { display:flex; align-items:baseline; flex-wrap:wrap; justify-content:space-between; gap:8px; padding-bottom:16px; border-bottom:1px solid currentColor; }
	h2 { font:400 clamp(2rem,3.5vw,3.5rem)/1.05 var(--mfont); }
	header > span, .caption { font-size:.75rem; line-height:1.6; opacity:.6; }
	.caption { margin-top:12px; }
	.authors { display:grid; gap:12px; margin-top:30px; }
	button { color:inherit; background:transparent; margin:0; padding:0; border:0; border-radius:0; font:inherit; cursor:pointer; }
	.authors button { display:grid; grid-template-columns:minmax(100px,1fr) minmax(40px,1fr) 24px; align-items:center; gap:16px; min-height:36px; text-align:left; }
	.author-label { font-size:.9rem; line-height:1.35; }
	.bar-track { border-bottom:1px solid color-mix(in srgb,var(--fill) 18%,transparent); }
	.bar { display:block; height:5px; background:var(--fill); opacity:.6; }
	.count { font-size:.8rem; text-align:right; }
	.active, button:hover { color:var(--heart); }
	.active .bar, button:hover .bar, .active .era-bar, button:hover .era-bar { background:var(--heart); opacity:1; }
	.eras { display:grid; grid-template-columns:repeat(var(--columns),minmax(38px,1fr)); gap:12px; overflow-x:auto; margin-top:36px; padding-top:25px; }
	.eras button { min-width:0; }
	.plot { display:flex; justify-content:center; align-items:end; height:270px; border-bottom:1px solid color-mix(in srgb,var(--fill) 30%,transparent); }
	.era-bar { position:relative; display:block; width:18px; min-height:2px; background:var(--fill); opacity:.7; }
	.era-bar > span { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); font-size:.75rem; }
	.tick { display:block; padding:12px 0; font-size:.7rem; }
	button:focus-visible { outline:2px solid var(--heart); outline-offset:4px; }
	@media(orientation:landscape) { .eras-section { display:flex; flex-direction:column; min-height:0; } .eras { flex:1; min-height:0; } .eras button { display:flex; flex-direction:column; } .plot { flex:1; width:100%; height:auto; min-height:0; } .authors { gap:clamp(4px,1.5svh,12px); margin-top:20px; } }
	@media(orientation:portrait) and (max-width:800px) { .patterns { grid-template-columns:1fr; gap:64px; } .plot { height:220px; } }
	@media(orientation:landscape) and (max-height:600px) { h2 { font-size:1.7rem; } .authors { gap:2px; margin-top:8px; } .authors button { min-height:28px; } .author-label { font-size:.75rem; } }
</style>
