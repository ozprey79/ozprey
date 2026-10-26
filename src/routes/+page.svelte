<script>
  import { onMount } from "svelte";
  import { swan, colors } from "$lib/svgpaths";

  let CurrentWall = $state(null);

  onMount(() => {
    const media = window.matchMedia("(orientation: portrait)");
    let disposed = false;

    async function loadWall() {
      const module = media.matches
        ? await import("$lib/wall/WallPortrait3D.svelte")
        : await import("$lib/wall/Wall3D.svelte");

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



<!-- <svelte:window bind:innerWidth bind:innerHeight /> -->
<!-- <div class="loaderbg" bind:this={el}>
  <Loader />
</div> -->
<!-- <div class="shaderbg">
  <Shader />
</div> -->
<div class="grid">
  <div class="cells">
    <!-- <button
      class="topicons"
      id="swn"
      onclick={() => {
        hiop();
      }}
      aria-label="color menu"
    >
      <img class="tytl" src="swan.svg" alt="person" />
      <svg class="tytl" viewBox="0 0 33 33">
        <g transform="translate(3 3)" filter="url(#goohjhey)">
          <path id="swaan" d={swan} />
        </g>
      </svg>
    </button> -->

    <div class="topicons" id="titl"></div>

    <div class="topicons"></div>
  </div>

  <div class="cells">
    <div class="midpanel">
      {#if CurrentWall}
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
  .grid {
    height: 100dvh;
    /* background-color: aqua; */
    /* width: 100%; */
    display: grid;
    grid: clamp(57px, 15vmin, 100px) auto 12vmin/ 1fr;
    /* background-color: yellowgreen; */
  }
  .grid > * {
    display: flex;
    justify-content: space-between;
    align-items: center;

    overflow: hidden;
    border: 0px solid red;
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
  /* .cells:nth-child(1){background-color: rgb(37, 52, 52);} */
  .topicons:nth-child(1) {
    display: block;
    position: absolute;
    aspect-ratio: 1/1;
    left: clamp(10px, 5vmin, 15px);
    top: clamp(10px, 5vmin, 15px);
    width: clamp(50px, 10vmin, 120px);
    border: 0px solid rgb(123, 255, 0);
  }
  #swn {
    background-color: transparent;
    border-style: none;
    outline: none;
    scale: 0;
    animation: slidein;
    animation-delay: 2s;
    animation-iteration-count: 1;
    animation-duration: 0.6s;
    animation-fill-mode: forwards;
  }

  @keyframes slidein {
    from {
      /* translate: 150vw 0; */
      scale: 0%;
    }

    to {
      /* translate: 0 0; */
      scale: 100%;
    }
  }
  #swn:active {
    transform: scale(1.1);
  }
  #swn:hover {
    outline-color: blue;
    outline: none;
  }
  #swn:focus {
    outline-color: rgb(206, 206, 206);
    outline: none;
  }
  #titl {
    font-family: "Baskerville Light-Italic";
    font-size: 2em;
  }
  #swaan {
    fill: var(--fill);
  }
  #swaan:hover {
    fill: var(--fill);
    /* filter: invert(50%); */
    /* fill: rgb(25, 0, 255); */
    /* filter: hue-rotate(90deg) ; */
    stroke: var(--fill);
    stroke-width: 0;
    filter: invert(50%);
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
    /* background-color: moccasin; */
  }

  p {
    height: 100%;
    font-family: var(--mfont);

    /* background-color: maroon; */
  }
  .seven {
    font-family: "Tanker-Regular";
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
    /* background-color: aqua; */
  }
  /* .loaderbg{display: none;}111 */
  /* ANIMATION */
  .bottomicons p {
    height: 12vmin;
    transform: translateY(12vmin);
    /* border: 1px solid red; */
    animation: sini 7s cubic-bezier(0.455, 0.03, 0.515, 0.955) 4s 2;
    animation-delay: 9s;
    /* background-color: purple; */
  }
  .loaderbg {
    position: absolute;
    /* opacity: 10; */
    width: 100%;
    height: 100%;
    z-index: 10;
    /* mix-blend-mode: darken; */
  }
  /* COLORS */

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
  @keyframes dash {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes dashy {
    0% {
      stroke-dashoffset: 130;
      fill: transparent;
      stroke: var(--fill);
    }
    5% {
      stroke-dashoffset: 130;
      fill: transparent;
      stroke: var(--fill);
    }

    90% {
      fill: transparent;
      stroke: var(--fill);
    }
    95% {
      stroke-dashoffset: 0;
      fill: var(--fill);
      stroke-width: 0.5;
      stroke: var(--fill);
    }
    100% {
      stroke-dashoffset: 0;
      fill: var(--fill);
      stroke-width: 0;
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
      grid: clamp(57px, 18vmin, 100px) auto 12vmin/ 1fr;
    }
    .midpanel {
      /* background-color: red; */
      width: 80%;
      height: 100%;
      align-items: center;
      flex-flow: column;
      /* border-radius: 50%; */
      /* height: 70vmin; */
      /* border: 1px solid red; */
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
