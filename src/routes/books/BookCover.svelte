<script>
	let { book } = $props();
	let failed = $state(null);
</script>

<div class="book-cover">
	{#if book.cover && failed !== book.cover}
		<img src={book.cover} alt={`Cover of ${book.title}`} loading="lazy" decoding="async" onerror={() => failed = book.cover} />
	{:else}
		<div class="fallback"><span aria-hidden="true">✦</span><span>{book.title}</span><small>{book.authors.join(', ')}</small></div>
	{/if}
</div>

<style>
	.book-cover { aspect-ratio:2/3; width:100%; overflow:hidden; background:color-mix(in srgb,var(--fill) 8%,var(--bg)); }
	img { display:block; width:100%; height:100%; object-fit:contain; }
	.fallback { display:flex; flex-direction:column; justify-content:center; align-items:center; gap:16px; height:100%; padding:16px; border:1px solid color-mix(in srgb,var(--fill) 30%,transparent); text-align:center; }
	.fallback > span:first-child { color:var(--heart); }
	.fallback > span:nth-child(2) { font:400 clamp(1rem,2vw,1.6rem)/1.25 var(--mfont); overflow-wrap:anywhere; }
	small { font-size:.7rem; opacity:.6; }
</style>
