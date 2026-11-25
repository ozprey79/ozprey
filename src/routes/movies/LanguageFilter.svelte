<script>
	import MinimalSelect from './MinimalSelect.svelte';
	let { languages, selected = $bindable([]), mode = $bindable('include'), label = 'Languages', compact = false, onchange = () => {} } = $props();
	let search = $state('');
	let expanded = $state(false);
	let host = $state();
	const options = $derived(languages.filter(name => name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
	function toggle(name) {
		selected = selected.includes(name) ? selected.filter(value => value !== name) : [...selected, name];
		onchange();
	}
	function clear() { selected = []; mode = 'include'; search = ''; onchange(); }
</script>

<svelte:window onclick={event => { if (host && !host.contains(event.target)) expanded = false; }} onkeydown={event => { if (event.key === 'Escape' && expanded) { expanded = false; host?.querySelector('summary')?.focus(); } }} />

<div class="language-filter" class:compact bind:this={host}>
	{#if compact}
		<button class="except-toggle" class:active={mode === 'exclude'} aria-pressed={mode === 'exclude'} aria-label="Except selected languages" title={mode === 'exclude' ? 'Except mode on — click to include' : 'Exclude selected languages'} onclick={() => { mode = mode === 'exclude' ? 'include' : 'exclude'; onchange(); }}>~</button>
	{/if}
	<details bind:open={expanded}>
		<summary aria-label={`${label}: ${selected.length ? `${mode === 'exclude' ? 'except' : 'include'} ${selected.join(', ')}` : 'all languages'}`}>
			{compact ? (selected.length === 1 ? selected[0] : selected.length ? `${selected.length} languages` : 'Languages') : selected.length ? `${mode === 'exclude' ? 'Except' : 'Include'} ${selected.length} ${selected.length === 1 ? 'language' : 'languages'}` : 'All languages'}
		</summary>
		<div class="options-panel">
			{#if !compact}<label class="mode">Match
				<MinimalSelect label={`${label} matching mode`} bind:value={mode} onchange={onchange}>
					<option value="include">Include any selected (OR)</option>
					<option value="exclude">Except selected (NOT)</option>
				</MinimalSelect>
			</label>
			<p>{mode === 'exclude' ? 'Show films in every language except those checked below.' : 'Show films in any of the languages checked below.'} Nothing selected means all languages.</p>{/if}
			<input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder="Find a language" bind:value={search} />
			<fieldset>
				<legend>{label}</legend>
				{#each options as name}
					<label class="option"><input type="checkbox" checked={selected.includes(name)} onchange={() => toggle(name)} /><span>{name}</span></label>
				{:else}<p>No languages match your search.</p>{/each}
			</fieldset>
			{#if selected.length}<button class="clear" onclick={clear}>Clear languages</button>{/if}
		</div>
	</details>
	{#if selected.length && !compact}
		<div class="chips" aria-label={`${label} active filters`}>
			{#each selected as name}<button onclick={() => toggle(name)} aria-label={`Remove ${name} language filter`}>{mode === 'exclude' ? 'Except ' : ''}{name} <span aria-hidden="true">×</span></button>{/each}
		</div>
	{/if}
</div>

<style>
	.compact { display:flex; align-items:center; flex:none; gap:3px; }
	.compact summary { padding:12px 4px; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.compact .options-panel { position:absolute; z-index:10; right:0; top:100%; width:min(280px,calc(100vw - 40px)); box-shadow:0 8px 24px #0002; }
	.except-toggle { width:36px; min-height:44px; padding:0; border:0; border-bottom:2px solid transparent; font-size:1.6rem; line-height:1; opacity:.5; }
	.except-toggle:hover { opacity:1; }
	.except-toggle.active { color:var(--heart); border-bottom-color:var(--heart); opacity:1; }
	.compact input[type="search"] { margin-top:0; }

	.language-filter { min-width:0; font-size:.85rem; }
	details { position:relative; border:0; border-radius:0; }
	summary { cursor:pointer; padding:12px 4px; min-height:44px; }
	.options-panel { padding:14px; background:var(--bg); border:1px solid color-mix(in srgb,var(--fill) 25%,transparent); border-radius:12px; }
	.mode { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
	input, button { font:inherit; color:inherit; margin:0; }
	input[type="search"] { background:transparent; border:1px solid color-mix(in srgb,var(--fill) 30%,transparent); padding:10px; min-height:44px; max-width:100%; border-radius:10px; }
	input[type="search"] { width:100%; margin:12px 0; }
	p { font-size:.8rem; opacity:.7; line-height:1.4; margin:10px 0 0; }
	fieldset { max-height:220px; overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable; padding:0 6px 0 0; margin:0; border:0; }
	legend { font-size:.75rem; opacity:.7; margin-bottom:4px; }
	.option { display:flex; gap:10px; align-items:center; min-height:44px; cursor:pointer; }
	input[type="checkbox"] { appearance:none; display:grid; place-content:center; width:15px; height:15px; padding:0; margin:0; border:1px solid color-mix(in srgb,var(--fill) 45%,transparent); border-radius:2px; background:transparent; flex:none; cursor:pointer; }
	input[type="checkbox"]::before { content:''; width:7px; height:4px; border-left:1.5px solid var(--bg); border-bottom:1.5px solid var(--bg); transform:translateY(-1px) rotate(-45deg); visibility:hidden; }
	input[type="checkbox"]:checked { background:var(--heart); border-color:var(--heart); }
	input[type="checkbox"]:checked::before { visibility:visible; }
	.option:hover input { border-color:var(--heart); }
	.option:hover span, .option:has(input:checked) span { color:var(--heart); }
	button { background:transparent; cursor:pointer; }
	.clear { display:block; width:100%; min-height:44px; margin-top:10px; padding:12px 0 2px; border-top:1px solid color-mix(in srgb,var(--fill) 18%,transparent); border-radius:0; color:var(--fill); text-align:left; font-size:.75rem; letter-spacing:.04em; text-decoration:none; }
	.clear:hover { color:var(--heart); }
	.chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
	.chips button { padding:6px 9px; min-height:36px; border:1px solid color-mix(in srgb,var(--heart) 50%,transparent); color:var(--heart); border-radius:999px; }
	summary:focus-visible, input:focus-visible, button:focus-visible { outline:2px solid var(--heart); outline-offset:3px; }
	@media (forced-colors:active) { input[type="checkbox"] { appearance:auto; } input[type="checkbox"]::before { display:none; } }
</style>
