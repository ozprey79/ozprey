<script>
  import { onMount } from 'svelte';
  import { blogInk } from './assets/blogInk.js';
  import { filmsInk } from './assets/filmsInk.js';

  let { open = false } = $props();
  let nav;
  let timeline = $state.raw(null);
  let reduced = $state(false);
  let fallback = $state(false);

  const links = [
    {
      label: 'About', href: '/about', viewBox: '135 72 427 291', weight: 5.5,
      strokes: [
        'M259 348 C261 312 264 246 271 219 C275 204 281 205 286 222 C291 243 298 285 307 306',
        'M315 277 C307 268 328 250 342 255 C357 260 340 286 332 279 C324 273 326 234 326 190 C326 164 334 149 345 153 C361 157 363 185 349 200 C340 211 330 218 319 225',
        'M369 246 C360 242 354 254 357 258 C362 264 373 256 368 247 M375 243 C385 257 389 226 398 230 C409 242 412 219 416 196 L419 183',
        'M411 120 C407 142 412 176 424 199 C433 218 450 223 460 208 C466 201 466 191 461 188 M404 183 C416 179 429 173 441 167',
        'M151 346 C218 284 302 228 370 179 M374 194 C381 202 403 169 434 148 C468 124 514 105 545 86'
      ]
    },
    { label: 'Films', href: '/movies', ...filmsInk },
    { label: 'Blog', href: '/blog', ...blogInk }
  ];

  onMount(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { reduced = motion.matches; };
    updateMotion();
    motion.addEventListener('change', updateMotion);

    let disposed = false;
    let context;

    async function prepareInk() {
      try {
        const [{ gsap }, { DrawSVGPlugin }] = await Promise.all([
          import('gsap'),
          import('gsap/DrawSVGPlugin')
        ]);
        if (disposed) return;
        gsap.registerPlugin(DrawSVGPlugin);

        context = gsap.context(() => {
          gsap.set(nav.querySelectorAll('path'), { drawSVG: '0%' });
          const ink = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

          for (const [index, svg] of Array.from(nav.querySelectorAll('svg')).entries()) {
            const backing = svg.querySelector('.backing').children;
            const foreground = Array.from(svg.querySelector('.foreground').children);
            const lengths = foreground.map((path) => path.getTotalLength());
            const total = lengths.reduce((sum, length) => sum + length, 0);
            const writingTime = index === 0 ? 0.85 : 0.64;
            let start = index * 0.18;

            for (const [stroke, path] of foreground.entries()) {
              const duration = writingTime * lengths[stroke] / total;
              ink.to([backing[stroke], path], { drawSVG: '100%', duration }, start);
              start += duration;
            }
          }

          timeline = ink;
        }, nav);
      } catch (error) {
        context?.revert();
        fallback = true;
        console.warn('Handwriting animation could not load', error);
      }
    }

    prepareInk();

    return () => {
      disposed = true;
      motion.removeEventListener('change', updateMotion);
      context?.revert();
    };
  });

  $effect(() => {
    if (!timeline) return;
    if (reduced) {
      timeline.pause().progress(open ? 1 : 0);
    } else if (open) {
      timeline.timeScale(1).play();
    } else {
      timeline.timeScale(1.5).reverse();
    }
  });
</script>

{#snippet inkPaths(strokes)}
  {#each strokes as stroke}
    {#if typeof stroke === 'string'}
      <path d={stroke} />
    {:else}
      <path d={stroke.d} transform={stroke.transform} style:--weight={stroke.weight && stroke.weight + 'px'} />
    {/if}
  {/each}
{/snippet}

<nav
  id="portfolio-menu"
  bind:this={nav}
  class="handwritten-menu"
  class:showInk={Boolean(timeline) || (fallback && open)}
  aria-label="Main navigation"
  inert={!open}
>
  {#each links as link (link.href)}
    <a class={link.label.toLowerCase()} href={link.href} aria-label={link.label}>
      <svg viewBox={link.viewBox} aria-hidden="true" style:--weight={link.weight + 'px'}>
        <g class="backing">
          {@render inkPaths(link.strokes)}
        </g>
        <g class="foreground">
          {@render inkPaths(link.strokes)}
        </g>
      </svg>
    </a>
  {/each}
</nav>

<style>
  .handwritten-menu {
    position: fixed;
    inset: 0;
    z-index: 10;
    overflow: hidden;
    pointer-events: none;
  }

  a {
    position: absolute;
    display: grid;
    place-items: center;
    left: var(--x);
    top: var(--y);
    width: clamp(84px, 16vmin, 164px);
    min-height: 44px;
    transform: translate(-50%, -50%);
    pointer-events: auto;
  }

  .handwritten-menu[inert] a {
    pointer-events: none;
  }

  a:focus-visible {
    outline: 1px solid var(--fill);
    outline-offset: 4px;
    border-radius: 4px;
  }

  svg {
    display: block;
    width: 100%;
    overflow: visible;
    visibility: hidden;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .showInk svg { visibility: visible; }
  .backing { stroke: var(--bg); }
  .backing path { stroke-width: calc(var(--weight) * 2.8); }
  .foreground { stroke: var(--heart); }
  .foreground path { stroke-width: var(--weight); }

  .about { --x: 47%; --y: 56%; width: clamp(124px, 24vmin, 232px); }
  .films { --x: 24%; --y: 69%; }
  .blog { --x: 72%; --y: 34%; }

  @media (orientation: portrait) {
    .about { --x: 50%; --y: 49%; width: clamp(136px, 44vw, 232px); }
    .films { --x: 26%; --y: 66%; }
    .blog { --x: 71%; --y: 33%; }
    a { width: clamp(84px, 27vw, 148px); }
  }
</style>
