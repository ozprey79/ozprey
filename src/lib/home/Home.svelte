<script>
  import { onMount } from "svelte";
  import WallAlternate from '$lib/home/wall/WallAlternate.svelte';
  import { WALL_SVG } from '$lib/home/wall/wallSvg.js';
  import { WALLP_SVG } from '$lib/home/wall/wallpSvg.js';

  let { variant = 'traces' } = $props();
  let portrait = $state(false);

  let CurrentWall = $state(null);

  // Follow orientation changes and ignore imports that finish after unmounting.
  onMount(() => {
    const media = window.matchMedia("(orientation: portrait)");
    let disposed = false;

    async function loadWall() {
      portrait = media.matches;
      const module = media.matches
        ? await import("$lib/home/wall/WallPortrait3D.svelte")
        : await import("$lib/home/wall/Wall3D.svelte");

      if (disposed) return;

      CurrentWall = module.default;
    }

    loadWall();

    media.addEventListener("change", loadWall);

    return () => {
      disposed = true;
      media.removeEventListener("change", loadWall);
    };
  });
</script>

<!-- Frame the responsive letter wall with the film and music links. -->
<div class="grid">
  <div class="cells">

    <div class="topicons" id="titl"></div>

    <div class="topicons"></div>
  </div>

  <div class="cells">
    <div class="midpanel">
      {#if variant === 'traces'}
        {#key portrait}
          <WallAlternate svg={portrait ? WALLP_SVG : WALL_SVG} radius={portrait ? '10% 10%' : '0'} />
        {/key}
      {:else if CurrentWall}
        <CurrentWall />
      {/if}
    </div>
  </div>

  <div class="cells">
    <div class="bottomicons">
      <p>Designer</p>
      <a href="/movies"><p class="wt">FILMS</p></a>

      <p>Touch</p>
      <p>Dark clouds</p>
      <p>Desert</p>
    </div>

    <button class="seven">
      <p id="qt"></p>
    </button>

    <div class="bottomicons">
      <p class="wt">Designer</p>
      <a href="/music"><p class="wt">MUSIC</p></a>
      <p>Calligrapher</p>
      <p>Archivist</p>
      <p>Nobody</p>
    </div>
  </div>
</div>

<style>
  /* Keep the central wall flexible between the header and animated footer. */
  .grid {
    height: 100%;
    width: 100%;
    overflow: hidden;

    display: grid;
    grid: clamp(57px, 15vmin, 100px) minmax(0, 1fr) 12vmin / minmax(0, 1fr);
  }
  .grid > * {
    min-width: 0;
    min-height: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;

    overflow: hidden;
  }
  .cells > *,
  .bottomicons p,
  .bottomicons a,
  .cells:nth-child(2) {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .cells:nth-child(3) {
    margin: 0 5vmin;
  }

  .topicons:nth-child(1) {
    display: block;
    position: absolute;
    aspect-ratio: 1/1;
    left: clamp(10px, 5vmin, 15px);
    top: clamp(10px, 5vmin, 15px);
    width: clamp(50px, 10vmin, 120px);
  }

  #titl {
    font-family: "Instrument Serif";
    font-size: 2em;
  }

  .midpanel {
    width: 80%;
    height: 100%;

    overflow: hidden;
  }
  .bottomicons p,
  .bottomicons a {
    height: 10vmin;
    width: 20vmin;
    color: var(--fill);
  }

  p {
    height: 100%;
    font-family: var(--mfont);
  }
  .seven {
    font-family: "Instrument Serif";
    border-style: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }
  .seven:active {
    scale: 1.5;
    -webkit-text-stroke: 0.3px var(--fill);
    -webkit-text-fill-color: rgba(255, 255, 255, 0);
  }
  .bottomicons {
    display: block;
  }

  .bottomicons p {
    height: 12vmin;
    transform: translateY(12vmin);

    animation: sini 7s cubic-bezier(0.455, 0.03, 0.515, 0.955) 4s 2;
    animation-delay: 9s;
  }

  /* Cycle the footer labels vertically through the clipped bottom row. */
  @keyframes sini {
    0% {
      transform: translateY(24vmin);
      color: var(--fill);
      opacity: 1;
    }
    25% {
      transform: translateY(-12vmin);
      color: var(--fill);
      opacity: 1;
    }
    50% {
      transform: translateY(-24vmin);
      color: var(--fill);
      opacity: 1;
    }
    75% {
      transform: translateY(12vmin);
      color: var(--fill);
      opacity: 1;
    }
    100% {
      transform: translateY(0vmin);
      color: var(--fill);
      opacity: 1;
    }
    12%,
    37%,
    62%,
    87% {
      color: var(--filler);
      opacity: 0.5;
    }
  }

  @media (orientation: landscape) {
    .bottomicons > p,
    .bottomicons > a,
    .seven {
      font-size: 1.2em;
    }
    .seven:hover {
      scale: 1.5;
      -webkit-text-stroke: 0.3px var(--fill);
      -webkit-text-fill-color: rgba(255, 255, 255, 0);
    }
  }
  @media (orientation: portrait) {
    .grid {
      grid: clamp(57px, 18vmin, 100px) minmax(0, 1fr) 12vmin / minmax(0, 1fr);
    }
    .midpanel {
      width: 80%;
      height: 100%;
      align-items: center;
      flex-flow: column;
    }
    .bottomicons > p,
    .seven {
      font-size: 0.9em;
    }
    .seven:active {
      scale: 1.5;
      -webkit-text-stroke: 0.3px var(--fill);
      -webkit-text-fill-color: rgba(255, 255, 255, 0);
    }
  }
</style>
