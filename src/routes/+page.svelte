<script>
  import { getContext } from 'svelte';
  import Home from '$lib/home/Home.svelte';
  import Zoopraxiscope from '$lib/home/loaders/Zoopraxiscope.svelte';
  import SWindowLoader from '$lib/home/loaders/SWindowLoader.svelte';
  // Keep the original loader available: change to 'zoopraxiscope' to replay it.
  const loader = 's-window';
  // 'morph': SVG shapes transform. 'stack': crossfade in place. 'train': slide horizontally.
  const sFrameMotion = 'morph';
  const entrance = getContext('apex-entrance');
  let entered = $state(entrance.entered);
  function completeApex() {
    entrance.entered = true;
    entered = true;
  }
  const variant = 'traces';
</script>

<svelte:head>
  <title>Ozprey — A study in motion</title>
  <meta name="description" content="A letter wall drawn in light, with sparkling noise gradients and ghost outlines that follow your movement." />
</svelte:head>

<!-- Replace the selected intro with the home scene when it completes. -->
<div class="wallpaper-page">
  {#if entered}
    <Home {variant} />
  {:else if loader === 'zoopraxiscope'}
    <Zoopraxiscope oncomplete={completeApex} />
  {:else}
    <SWindowLoader motion={sFrameMotion} duration={6200} oncomplete={completeApex} />
  {/if}
</div>

<style>
  .wallpaper-page { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none; }
</style>
