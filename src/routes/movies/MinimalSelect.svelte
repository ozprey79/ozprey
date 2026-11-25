<script>
	let { value = $bindable(''), label, onchange = () => {}, children, maxWidth = '100%' } = $props();
</script>

<span class="minimal-select" style:--select-max-width={maxWidth}>
	<span class="marker" aria-hidden="true">▸</span>
	<select aria-label={label} bind:value {onchange}>{@render children()}</select>
</span>

<style>
	.minimal-select { position:relative; display:inline-flex; align-items:center; min-width:0; max-width:var(--select-max-width); vertical-align:middle; }
	.marker { position:absolute; left:4px; color:inherit; pointer-events:none; font-size:.9em; line-height:1; }
	select { appearance:none; min-width:0; max-width:100%; min-height:44px; margin:0; padding:10px 4px 10px 20px; border:0; border-radius:0; background:transparent; box-shadow:none; color:inherit; font:inherit; cursor:pointer; }
	select:focus-visible { outline:2px solid var(--heart); outline-offset:2px; }
	select :global(option) { background:var(--bg); color:var(--fill); }
	.minimal-select:has(select:open) .marker { transform:rotate(90deg); }
	@media(forced-colors:active) { select { appearance:auto; padding-left:4px; } .marker { display:none; } }
</style>
