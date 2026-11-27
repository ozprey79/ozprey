<script>
  import { onMount, tick } from 'svelte';
  import aboutSvg from '$lib/assets/source-art/menu/about.svg?raw';
  import filmsSvg from '$lib/assets/source-art/menu/ldataviz.svg?raw';
  import blogSvg from '$lib/assets/source-art/menu/log1.svg?raw';
  import { readMenuSvg } from './readMenuSvg.js';

  let { open = false } = $props();
  let nav;
  let timeline = $state.raw(null);
  let reduced = $state(false);
  let fallback = $state(false);

  let links = $state([]);
  const artwork = [
    { label: 'About', href: '/about', source: aboutSvg },
    { label: 'Films', href: '/movies', source: filmsSvg },
    { label: 'Blog', href: '/blog', source: blogSvg }
  ];

  onMount(() => {
    links = artwork.map(({ source, ...link }) => ({ ...link, ...readMenuSvg(source) }));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { reduced = motion.matches; };
    updateMotion();
    motion.addEventListener('change', updateMotion);

    let disposed = false;
    let context;

    async function prepareInk() {
      try {
        await tick();
        if (disposed) return;
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
              const duration = writingTime * lengths[stroke] / (total || 1);
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
  <div class="collection-links" role="group" aria-label="Collections">
    <a href="/movies">Films</a><span aria-hidden="true">/</span><a href="/music">Music</a><span aria-hidden="true">/</span><a href="/books">Books</a>
  </div>
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

  .collection-links { position:absolute; left:50%; bottom:max(24px,env(safe-area-inset-bottom)); transform:translateX(-50%); display:flex; align-items:center; gap:16px; font-size:.8rem; color:var(--fill); }
  .collection-links a { position:static; transform:none; width:auto; min-height:44px; display:flex; color:inherit; text-decoration:none; }
  .collection-links a:hover { color:var(--heart); }
  .collection-links > span { opacity:.35; }
  .handwritten-menu[inert] .collection-links { visibility:hidden; }

  @media (orientation: portrait) {
    .about { --x: 50%; --y: 49%; width: clamp(136px, 44vw, 232px); }
    .films { --x: 26%; --y: 66%; }
    .blog { --x: 71%; --y: 33%; }
    a { width: clamp(84px, 27vw, 148px); }
  }
</style>
