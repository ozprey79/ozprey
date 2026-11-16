<script>
	let { languages, selected = $bindable([]), mode = $bindable('include'), label = 'Languages', onchange = () => {} } = $props();
	let search = $state('');
	const options = $derived(languages.filter(name => name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
	function toggle(name) {
		selected = selected.includes(name) ? selected.filter(value => value !== name) : [...selected, name];
		onchange();
	}
	function clear() { selected = []; mode = 'include'; search = ''; onchange(); }
</script>

<div class="language-filter">
	<details>
		<summary aria-label={`${label}: ${selected.length ? `${mode === 'exclude' ? 'except' : 'include'} ${selected.join(', ')}` : 'all languages'}`}>
			{selected.length ? `${mode === 'exclude' ? 'Except' : 'Include'} ${selected.length} ${selected.length === 1 ? 'language' : 'languages'}` : 'All languages'}
		</summary>
		<div class="options-panel">
			<label class="mode">Match
				<select aria-label={`${label} matching mode`} bind:value={mode} onchange={onchange}>
					<option value="include">Include any selected (OR)</option>
					<option value="exclude">Except selected (NOT)</option>
				</select>
			</label>
			<p>{mode === 'exclude' ? 'Show films in every language except those checked below.' : 'Show films in any of the languages checked below.'} Nothing selected means all languages.</p>
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
	{#if selected.length}
		<div class="chips" aria-label={`${label} active filters`}>
			{#each selected as name}<button onclick={() => toggle(name)} aria-label={`Remove ${name} language filter`}>{mode === 'exclude' ? 'Except ' : ''}{name} <span aria-hidden="true">×</span></button>{/each}
		</div>
	{/if}
</div>

<style>
	.language-filter { min-width:0; font-size:.85rem; }
	details { border:1px solid color-mix(in srgb,var(--fill) 30%,transparent); }
	summary { cursor:pointer; padding:12px 14px; min-height:44px; }
	.options-panel { padding:14px; border-top:1px solid color-mix(in srgb,var(--fill) 25%,transparent); }
	.mode { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
	input, select, button { font:inherit; color:inherit; margin:0; }
	input[type="search"], select { background:transparent; border:1px solid color-mix(in srgb,var(--fill) 30%,transparent); padding:10px; min-height:44px; max-width:100%; }
	input[type="search"] { width:100%; margin:12px 0; }
	option { background:var(--bg); color:var(--fill); }
	p { font-size:.8rem; opacity:.7; line-height:1.4; margin:10px 0 0; }
	fieldset { max-height:220px; overflow-y:auto; padding:0; margin:0; border:0; }
	legend { font-size:.75rem; opacity:.7; margin-bottom:4px; }
	.option { display:flex; gap:10px; align-items:center; min-height:44px; cursor:pointer; }
	input[type="checkbox"] { width:17px; height:17px; accent-color:var(--heart); flex:none; }
	button { background:transparent; cursor:pointer; }
	.clear { padding:10px 0; color:var(--heart); text-decoration:underline; }
	.chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
	.chips button { padding:6px 9px; min-height:36px; border:1px solid color-mix(in srgb,var(--heart) 50%,transparent); color:var(--heart); border-radius:0; }
	:where(summary, input, select, button):focus-visible { outline:2px solid var(--heart); outline-offset:3px; }
</style>
