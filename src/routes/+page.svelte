<script>
  import OriginalHome from '$lib/components/OriginalHome.svelte';
  import Zoopraxiscope from '$lib/components/zoopraxiscope/Zoopraxiscope.svelte';
  let entered = $state(false);
  let variant = $state('traces');
</script>

<svelte:head>
  <title>Ozprey — A study in motion</title>
  <meta name="description" content="A letter wall drawn in light, with sparkling noise gradients and ghost outlines that follow your movement." />
</svelte:head>


<div class="wallpaper-page">
  <!-- {#if entered} -->
    <OriginalHome {variant} />
  <!-- {:else}
    <Zoopraxiscope oncomplete={() => { entered = true; }} />
  {/if} -->
</div>


<style>
  .wallpaper-page { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none; }
  .wall-controls { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 15; display: flex; align-items: center; gap: 10px; font: 12px var(--mfont); letter-spacing: .08em; }
  .wall-controls button { color: var(--fill); background: transparent; cursor: pointer; padding: 5px 0; margin: 0; opacity: .45; }
  .wall-controls .chosen { opacity: 1; }
  .wall-controls span { opacity: .25; }
  .wall-controls button:focus-visible { outline: 1px solid var(--fill); outline-offset: 4px; }
  .replay { position: fixed; bottom: 20px; left: calc(50% + 94px); z-index: 15; width: 24px; height: 24px; padding: 4px; cursor: pointer; opacity: .5; }
  .replay svg { width: 100%; height: 100%; stroke: var(--fill); stroke-width: 1; }
  .replay:hover, .replay:focus-visible { opacity: 1; }
  .replay:focus-visible { outline: 1px solid var(--fill); outline-offset: 4px; }
</style>
