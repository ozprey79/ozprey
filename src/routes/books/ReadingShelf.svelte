<script>
	import BookCover from './BookCover.svelte';
	import { statusNames } from '$lib/books/data.js';
	let { books, selected, onselect } = $props();
	const longest = $derived(Math.max(1, ...books.map(book => book.pages || 0)));
	const ordered = $derived([...books].sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.title.localeCompare(b.title)));
	const date = value => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
</script>

<div class="reading-workspace">
	<article class="selected-book" aria-live="polite" aria-label="Selected book">
		{#if selected}
			<div class="cover-wrap"><BookCover book={selected} /></div>
			<div class="book-info">
				<p class="eyebrow">{statusNames[selected.status] ?? 'On the shelf'}{selected.rating ? ` · ${selected.rating}/5` : ''}</p>
				<h3>{selected.title}</h3>
				<p class="byline">{selected.authors.join(' / ') || 'Author not recorded'}</p>
				<p class="details">{[selected.year, selected.pages ? `${selected.pages} pages` : 'Page count unavailable'].filter(Boolean).join(' · ')}</p>
				{#if selected.description}<p class="description">{selected.description}</p>{/if}
				{#if selected.finishedDate}<p class="details">Finished {date(selected.finishedDate)}</p>{/if}
				<a href={selected.url} target="_blank" rel="noreferrer">Open on Hardcover <span aria-hidden="true">↗</span></a>
			</div>
		{:else}<p class="empty">No books match this collection yet.</p>{/if}
	</article>
	<section class="shelf-section" aria-labelledby="shelf-heading">
		<div class="shelf-heading"><h2 id="shelf-heading">On the shelf</h2><span>{books.length} books</span></div>
		<p class="caption">Spine height = pages · ordered by publication year</p>
		<div class="shelf-scroll" role="region" aria-label="Book spines, scroll to explore">
			<div class="shelf-books">
				{#each ordered as book, index (book.id)}
					<button class="spine" class:unknown={!book.pages} aria-pressed={selected?.id === book.id}
						aria-label={`${book.title}, ${book.pages ? `${book.pages} pages` : 'page count unknown'}. Select book.`}
						style:--height={`${book.pages ? 32 + 68 * Math.sqrt(book.pages / longest) : 26}%`}
						style:--tone={0.3 + (index % 5) * 0.1} onclick={() => onselect(book.id)}>
						<span class="spine-mark" aria-hidden="true">✦</span><span class="spine-title">{book.title}</span>
					</button>
				{/each}
			</div>
		</div>
		<div class="shelf-foot"><span>Older editions</span><span aria-hidden="true">⟶</span><span>Newer editions</span></div>
		<p class="caption">Select a spine to open its cover and details.{#if books.some(book => !book.pages)} Dashed spines have no recorded page count.{/if}</p>
	</section>
</div>

<style>
	.reading-workspace { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.2fr); gap:clamp(32px,5vw,80px); align-items:center; min-height:0; height:100%; }
	.selected-book { display:grid; grid-template-columns:minmax(110px,.75fr) minmax(0,1fr); align-items:center; gap:24px; min-width:0; }
	.cover-wrap { width:100%; max-width:220px; justify-self:center; }
	.book-info { min-width:0; }
	.eyebrow { font-size:.7rem; letter-spacing:.09em; text-transform:uppercase; color:var(--heart); }
	h3 { margin:14px 0; font:400 clamp(1.4rem,2.2vw,2.4rem)/1.17 var(--mfont); overflow-wrap:anywhere; }
	.byline { font-size:.9rem; line-height:1.5; }
	.details { margin-top:12px; font-size:.75rem; line-height:1.5; opacity:.65; }
	.description { display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; margin-top:16px; font-size:.85rem; line-height:1.6; opacity:.7; }
	a { display:inline-block; margin-top:22px; color:var(--heart); font-size:.75rem; text-underline-offset:5px; }
	a span { margin-left:8px; }
	.shelf-section { min-width:0; }
	.shelf-heading { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding-bottom:14px; border-bottom:1px solid currentColor; }
	h2 { font:400 clamp(2rem,4vw,3.6rem)/1 var(--mfont); }
	.shelf-heading > span, .caption, .shelf-foot { font-size:.75rem; line-height:1.6; }
	.caption { opacity:.6; margin-top:12px; }
	.shelf-scroll { overflow-x:auto; padding-top:28px; padding-bottom:4px; }
	.shelf-books { display:flex; align-items:end; gap:5px; min-width:100%; width:max-content; height:clamp(200px,35svh,360px); padding-inline:2px; border-bottom:2px solid currentColor; }
	.spine { position:relative; display:flex; align-items:center; flex-direction:column; gap:12px; width:28px; flex:none; height:var(--height); min-height:60px; margin:0; padding:12px 4px; border:1px solid color-mix(in srgb,var(--fill) 45%,transparent); border-radius:1px 1px 0 0; background:color-mix(in srgb,var(--fill) calc(var(--tone) * 24%),var(--bg)); color:var(--fill); cursor:pointer; transition:transform 220ms ease,border-color 220ms ease; }
	.spine:hover, .spine[aria-pressed="true"] { transform:translateY(-12px); border-color:var(--heart); color:var(--heart); }
	.spine.unknown { border-style:dashed; }
	.spine-mark { flex:none; font-size:.65rem; }
	.spine-title { writing-mode:vertical-rl; transform:rotate(180deg); overflow:hidden; white-space:nowrap; font-size:.68rem; line-height:1.3; }
	.shelf-foot { display:flex; justify-content:space-between; gap:8px; padding-top:12px; opacity:.5; }
	a:focus-visible, button:focus-visible, .shelf-scroll:focus-visible { outline:2px solid var(--heart); outline-offset:4px; }
	@media(max-width:850px) and (orientation:portrait) { .reading-workspace { grid-template-columns:1fr; gap:48px; } .selected-book { grid-template-columns:minmax(110px,.6fr) minmax(0,1fr); } }
	@media(orientation:landscape) and (max-height:600px) {
		.reading-workspace { align-items:stretch; }
		.selected-book { grid-template-columns:minmax(90px,.6fr) minmax(0,1fr); gap:16px; height:100%; min-height:0; }
		.book-info { max-height:100%; overflow-y:auto; padding-right:4px; }
		h3 { font-size:1.2rem; margin:8px 0; }
		.description { -webkit-line-clamp:2; margin-top:8px; font-size:.75rem; }
		.cover-wrap { width:min(100%,28svh); }
		.shelf-section { display:flex; flex-direction:column; min-height:0; }
		.shelf-heading { padding-bottom:8px; }
		.shelf-heading h2 { font-size:1.6rem; }
		.shelf-scroll { flex:1; min-height:0; display:flex; flex-direction:column; padding-top:18px; }
		.shelf-books { flex:1; height:auto; min-height:60px; }
		.caption { margin-top:6px; font-size:.65rem; line-height:1.4; }
		.shelf-section > .caption:last-child { display:none; }
		.shelf-foot { padding-top:6px; font-size:.65rem; }
		a { margin-top:12px; }
	}
	@media(prefers-reduced-motion:reduce) { .spine { transition:none; } }
</style>
