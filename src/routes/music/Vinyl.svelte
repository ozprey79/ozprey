<script>
 import { onMount } from 'svelte';
 let { tracks = [] } = $props();
 let selectedId = $state('');
 let track = $derived(tracks.find(t => t.id === selectedId) ?? tracks[0]);
 let host = $state();
 let controller = $state(null);
 let failed = $state(false);
 let spinning = $state(false);
 $effect(() => { controller?.setTrack(track); });
 onMount(() => {
  if (!host) return;
  let disposed = false;
  import('./vinylScene.js').then(async ({ createVinylScene }) => {
   if (disposed) return;
   const next = await createVinylScene(host, value => spinning = value);
   if (disposed) next.dispose(); else controller = next;
  }).catch(error => { console.error('Vinyl preview unavailable', error); if (!disposed) failed = true; });
  return () => { disposed = true; controller?.dispose(); };
 });
</script>

<section class="vinyl-panel" aria-labelledby="vinyl-heading">
 <header><div><p>FROM THE LISTENING COLLECTION</p><h2 id="vinyl-heading">On record.</h2></div><span>SIDE A / 33⅓ RPM</span></header>
 {#if tracks.length}
  <label class="track-select">Track
   <select value={track?.id} onchange={event => selectedId = event.currentTarget.value}>
    {#each tracks as item (item.id)}<option value={item.id}>{item.title} — {item.artist}</option>{/each}
   </select>
  </label>
  <div class="stage" data-model-stage bind:this={host} aria-label={`Vinyl record and sleeve for ${track.title} by ${track.artist}`} role="img">
   {#if failed}<p class="status">The 3D record couldn’t load. {track.title} — {track.artist}</p>
   {:else if !controller}<p class="status">Loading record…</p>{/if}
  </div>
  <div class="tools"><span>Drag to turn</span><div>
   <button disabled={!controller} onclick={() => controller?.rotate(-1)} aria-label="Rotate record left">Turn left</button>
   <button disabled={!controller} onclick={() => controller?.rotate(1)} aria-label="Rotate record right">Turn right</button>
   <button class="spin" disabled={!controller} aria-pressed={spinning} onclick={() => controller?.spin(!spinning)}>{spinning ? 'Stop spinning' : 'Spin record'}</button>
   <button disabled={!controller} onclick={() => controller?.reset()}>Reset view</button>
  </div></div>
  <p class="track-meta"><strong>{track.title}</strong> <span>{track.artist} · {track.plays} {track.plays === 1 ? 'play' : 'plays'}</span></p>
 {:else}<p>No tracks in this listening window yet.</p>{/if}
</section>

<style>
 .vinyl-panel { margin-top:64px; border-top:1px solid currentColor; padding-top:22px; }
 header { display:flex; justify-content:space-between; align-items:end; gap:20px; }
 header p, header > span, .tools, .track-select { font-size:.68rem; letter-spacing:.09em; text-transform:uppercase; }
 header p { margin:0 0 12px; }
 h2 { font-family:var(--mfont); font-size:clamp(3rem,7vw,6rem); font-weight:400; line-height:.9; margin:0; }
 .track-select { display:flex; align-items:center; gap:16px; margin-top:25px; }
 select { max-width:620px; width:100%; min-width:0; padding:10px; color:var(--fill); background:var(--bg); border:1px solid currentColor; font:inherit; }
 .stage { position:relative; width:100%; height:clamp(270px,49vw,600px); cursor:grab; }
 .stage:active { cursor:grabbing; }
 .status { position:absolute; inset:0; display:grid; place-content:center; text-align:center; padding:20px; }
 .tools { display:flex; justify-content:space-between; align-items:center; gap:14px; border-block:1px solid color-mix(in srgb,currentColor 25%,transparent); padding:12px 0; }
 .tools div { display:flex; flex-wrap:wrap; gap:8px; }
 button { color:inherit; background:transparent; border:1px solid currentColor; padding:8px 12px; font:inherit; cursor:pointer; }
 button:focus-visible, select:focus-visible { outline:2px solid currentColor; outline-offset:4px; }
 button:disabled { opacity:.4; cursor:default; }
 button[aria-pressed="true"] { color:var(--heart); }
 .track-meta { display:flex; flex-wrap:wrap; gap:8px 20px; font-size:.85rem; }
 .track-meta span { opacity:.65; }
 @media(max-width:500px) { header > span { display:none; } .tools { align-items:start; flex-direction:column; } }
 @media(prefers-reduced-motion:reduce) { .spin { display:none; } }
</style>
