<script>
  import { onMount, untrack } from 'svelte';
  import { brushParameters, normalizeBrush, paintSvgBrush } from '$lib/brush/svgBrush.js';

  const sample = 'M 30,164 C 87,78 152,48 177,88 C 195,116 166,174 129,164 C 89,154 120,93 186,85 C 244,77 236,145 283,139 C 315,135 343,94 387,97 C 413,98 438,112 450,82';
  const storageKey = 'ozprey.svg-brush-presets.v1';

  let brush = $state(normalizeBrush());
  let pathData = $state(sample);
  let draft = $state(sample);
  let viewBox = $state('0 0 480 230');
  let guide = $state();
  let ink = $state();
  let progress = $state(1);
  let pathError = $state('');
  let presetName = $state('');
  let selectedPreset = $state('');
  let presets = $state([]);
  let message = $state('');
  let painted;
  let frame = 0;

  onMount(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      if (Array.isArray(stored)) presets = stored.map(readPreset);
    } catch {
      message = 'Saved presets could not be read.';
    }
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!guide || !ink) return;
    guide.setAttribute('d', pathData);
    try {
      const settings = normalizeBrush(brush);
      painted = paintSvgBrush(guide, ink, settings);
      painted.setProgress(untrack(() => progress));
      const box = guide.getBBox();
      // Keep the framing fixed as the width slider changes.
      const pad = 64;
      viewBox = [box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2].join(' ');
      pathError = '';
    } catch (error) {
      painted = undefined;
      ink.replaceChildren();
      pathError = error.message;
    }
  });

  $effect(() => {
    const value = progress;
    painted?.setProgress(value);
  });

  function replay() {
    cancelAnimationFrame(frame);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress = progress === 1 ? 0 : 1;
      return;
    }
    const start = performance.now();
    progress = 0;
    function tick(now) {
      progress = Math.min(1, (now - start) / 2200);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  function readPreset(value) {
    if (value?.version !== 1 || typeof value.name !== 'string' || !value.name.trim() ||
        !value.brush || typeof value.brush !== 'object' || Array.isArray(value.brush)) {
      throw new Error('Choose a version 1 SVG brush preset JSON file.');
    }
    return { version: 1, name: value.name.trim().slice(0, 64), brush: normalizeBrush(value.brush) };
  }

  function currentPreset() {
    return { version: 1, name: presetName.trim() || 'My brush', brush: normalizeBrush(brush) };
  }

  function loadPreset(preset) {
    presetName = preset.name;
    brush = normalizeBrush(preset.brush);
    message = `Loaded “${preset.name}”.`;
  }

  function savePreset(event) {
    event.preventDefault();
    const preset = currentPreset();
    const next = [...presets.filter((item) => item.name !== preset.name), preset];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      presets = next;
      selectedPreset = preset.name;
      presetName = preset.name;
      message = `Saved “${preset.name}” in this browser.`;
    } catch {
      message = 'Browser storage is unavailable. Export the preset to keep a copy.';
    }
  }

  function exportPreset() {
    const preset = currentPreset();
    const file = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = (preset.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'brush') + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importPreset(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    try {
      if (file.size > 65536) throw new Error('The preset file is too large.');
      const preset = readPreset(JSON.parse(await file.text()));
      selectedPreset = '';
      loadPreset(preset);
    } catch (error) {
      message = error instanceof SyntaxError ? 'The preset file is not valid JSON.' : error.message;
    }
  }
</script>

<svelte:head><title>SVG Brush Lab — Ozprey</title></svelte:head>

<main>
  <h1>SVG Brush Lab</h1>
  <div class="workspace">
    <section class="drawing" aria-label="Brush preview">
      <svg viewBox={viewBox} role="img" aria-label="Brush preset applied to the current SVG path">
        <path bind:this={guide} visibility="hidden" fill="none" />
        <g bind:this={ink}></g>
      </svg>
      <div class="row">
        <button type="button" onclick={replay} disabled={!!pathError}>Replay</button>
        <label class="scrub">Draw progress
          <input type="range" min="0" max="1" step="0.005" bind:value={progress}
            onpointerdown={() => cancelAnimationFrame(frame)}
            onkeydown={() => cancelAnimationFrame(frame)} />
        </label>
      </div>
      <form onsubmit={(event) => { event.preventDefault(); pathData = draft.trim(); }}>
        <label for="guide-path">SVG path data</label>
        <textarea id="guide-path" rows="3" bind:value={draft} maxlength="24000" spellcheck="false"></textarea>
        <button type="submit">Apply path</button>
        {#if pathError}<p role="alert">{pathError}</p>{/if}
      </form>
    </section>

    <section class="settings" aria-labelledby="brush-settings">
      <h2 id="brush-settings">Brush settings</h2>
      {#each brushParameters as { key, label, min, max, step } (key)}
        <label class="setting">
          <span>{label} <output>{brush[key]}</output></span>
          <input type="range" {min} {max} {step} bind:value={brush[key]} />
        </label>
      {/each}
      <label class="color">Ink color <input type="color" bind:value={brush.color} /></label>
    </section>
  </div>

  <section class="presets" aria-labelledby="brush-presets">
    <h2 id="brush-presets">Presets</h2>
    <form class="row" onsubmit={savePreset}>
      <label>Preset name <input type="text" bind:value={presetName} maxlength="64" /></label>
      <button type="submit">Save preset</button>
    </form>
    <div class="row">
      <label>Saved presets
        <select bind:value={selectedPreset}>
          <option value="">Select a preset</option>
          {#each presets as preset (preset.name)}
            <option value={preset.name}>{preset.name}</option>
          {/each}
        </select>
      </label>
      <button type="button" disabled={!selectedPreset} onclick={() => {
        const preset = presets.find((item) => item.name === selectedPreset);
        if (preset) loadPreset(preset);
      }}>Load preset</button>
    </div>
    <div class="row transfer">
      <button type="button" onclick={exportPreset}>Export JSON</button>
      <label>Import JSON <input type="file" accept=".json,application/json" onchange={importPreset} /></label>
    </div>
    <p role="status">{message}</p>
  </section>
</main>

<style>
  main { max-width: 1140px; margin: auto; padding: 90px clamp(16px, 5vw, 56px) 64px; font: 400 15px/1.4 system-ui, sans-serif; }
  h1, h2 { font-family: var(--mfont), serif; font-weight: 400; }
  h1 { font-size: clamp(42px, 8vw, 88px); line-height: 1; margin-bottom: 30px; }
  h2 { font-size: 27px; margin-bottom: 12px; }
  .workspace { display: grid; grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr); gap: 24px; }
  .drawing, .settings, .presets { background: #242120; border: 1px solid #65534a; padding: 16px; min-width: 0; }
  .presets { margin-top: 24px; }
  svg { display: block; width: 100%; height: clamp(210px, 38vw, 350px); background: #181615; margin-bottom: 14px; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin-bottom: 10px; }
  .row label { min-width: 0; }
  .row .scrub { flex: 1 1 150px; }
  label:not(.color) { display: block; }
  .setting span { display: flex; justify-content: space-between; }
  output { font-variant-numeric: tabular-nums; }
  input, select, textarea, button { margin: 0; min-height: 36px; }
  input[type='range'], input[type='text'], input[type='file'], select, textarea { display: block; max-width: 100%; }
  input[type='range'], textarea { width: 100%; }
  input[type='range'] { accent-color: #f1bda5; }
  input[type='color'] { padding: 2px; width: 42px; }
  textarea { resize: vertical; margin: 6px 0 10px; font-family: monospace; }
  input:not([type='range']), select, textarea { color: var(--fill); background: #181615; border: 1px solid #65534a; }
  button { padding: 6px 12px; color: #241812; background: #f1bda5; cursor: pointer; }
  button:disabled { opacity: .55; cursor: default; }
  :is(button, input, select, textarea):focus-visible { outline: 2px solid #f1bda5; outline-offset: 3px; }
  .color { display: flex; align-items: center; justify-content: space-between; }
  [role='alert'], [role='status'] { margin-top: 8px; }
  @media (max-width: 680px) { .workspace { grid-template-columns: 1fr; } }
</style>
