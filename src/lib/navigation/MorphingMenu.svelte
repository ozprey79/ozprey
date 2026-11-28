<script>
  import { onMount, tick } from 'svelte';
  import { page } from '$app/state';

  let { open = false } = $props();
  let datavizOpen = $state(false);
  let datavizButton;
  let collections;
  let menu;
  let labelWidths = $state({});

  const primaryLinks = [
    { label: 'Home', href: '/' },
    { label: 'Blogs', href: '/blog' }
  ];
  const collectionLinks = [
    { label: 'Films', href: '/movies' },
    { label: 'Books', href: '/books' },
    { label: 'Music', href: '/music' }
  ];
  const isCollection = $derived(collectionLinks.some((link) => page.url.pathname === link.href));
  const isHome = $derived(page.url.pathname === '/');

  // Measure the text itself so bar widths stay correct when fonts or sizes change.
  onMount(() => {
    const labels = [...menu.querySelectorAll('.bar-label')];
    const measureLabels = () => {
      for (const label of labels) labelWidths[label.textContent] = label.getBoundingClientRect().width;
    };
    measureLabels();
    const observer = new ResizeObserver(measureLabels);
    labels.forEach((label) => observer.observe(label));
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!open) datavizOpen = false;
  });

  async function toggleDataviz(event) {
    datavizOpen = !datavizOpen;
    if (datavizOpen && event.detail === 0) {
      await tick();
      collections?.querySelector('a')?.focus({ preventScroll: true });
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && datavizOpen) {
      event.preventDefault();
      event.stopPropagation();
      datavizOpen = false;
      datavizButton?.focus({ preventScroll: true });
    }
  }
</script>

<div
  class="bar-menu"
  class:open
  class:home={isHome}
  class:dataviz-open={datavizOpen}
  bind:this={menu}
  role="group"
  aria-label="Pages"
  style:--dataviz-word-width={`${labelWidths.Dataviz ?? 0}px`}
  style:--collections-word-width={`${collectionLinks.reduce((sum, link) => sum + (labelWidths[link.label] ?? 0), 0)}px`}
>
  {#each primaryLinks as link, index (link.href)}
    <div class="bar-slot">
      <a
        class="bar-control primary-link"
        class:expanded={open && !datavizOpen}
        href={link.href}
        aria-label={link.label}
        title={link.label}
        aria-current={(link.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith('/blog')) ? 'page' : undefined}
        onkeydown={handleKeydown}
        style:--order={index}
        style:--word-width={`${labelWidths[link.label] ?? 0}px`}
      >
        <span class="bar-surface"><span class="bar-label">{link.label}</span></span>
      </a>
    </div>
  {/each}

  <div class="bar-slot">
    <!-- This same surface grows from the Dataviz square into the whole branch. -->
    <div class="dataviz-branch" style:--order={2}>
      <span class="branch-surface" aria-hidden="true"></span>
      <button
        class="bar-control dataviz"
        class:current={isCollection}
        bind:this={datavizButton}
        type="button"
        aria-label={datavizOpen ? 'Back to main navigation' : 'Dataviz'}
        title={datavizOpen ? 'Back to main navigation' : 'Dataviz'}
        aria-expanded={datavizOpen}
        aria-controls="dataviz-collections"
        onclick={toggleDataviz}
        onkeydown={handleKeydown}
      >
        <span class="bar-label dataviz-label">Dataviz</span>
        <span class="back-mark" aria-hidden="true"></span>
      </button>
      <div
        id="dataviz-collections"
        class="collections"
        bind:this={collections}
        role="group"
        aria-label="Dataviz collections"
        inert={!open || !datavizOpen}
      >
        {#each collectionLinks as link, index (link.href)}
          <a
            class="bar-control collection"
            href={link.href}
            aria-label={link.label}
            aria-current={page.url.pathname === link.href ? 'page' : undefined}
            onkeydown={handleKeydown}
            style:--order={index}
            style:--word-width={`${labelWidths[link.label] ?? 0}px`}
          >
            <span class="bar-label">{link.label}</span>
          </a>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .bar-menu {
    --bar-fill: var(--fill);
    --bar-stroke: transparent;
    --bar-ink: var(--bg);
    --square: clamp(18px, 2.5vmin, 28px);
    --bar-height: clamp(32px, 4.2vmin, 44px);
    --back-width: 44px;
    --branch-gap: clamp(6px, 1.2vw, 16px);
    --label-padding: clamp(12px, 1.4vw, 20px);
    --menu-gap: clamp(12px, 8vw, 130px);
    --dot-pause: 320ms;
    --morph-time: 500ms;
    --morph-ease: cubic-bezier(.35, 0.3, .35, 1);
    position: absolute;
    left: max(6.3vw, env(safe-area-inset-left));
    right: max(6.3vw, env(safe-area-inset-right));
    bottom: max(20px, 3vh, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: minmax(0, calc((100% - var(--menu-gap) * 2) / 3))
      minmax(0, calc((100% - var(--menu-gap) * 2) / 3)) minmax(0, 1fr);
    gap: var(--menu-gap);
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition: grid-template-columns var(--morph-time) var(--morph-ease),
      gap var(--morph-time) var(--morph-ease), opacity 180ms ease var(--morph-time),
      visibility 0s calc(var(--morph-time) + 180ms);
  }

  .bar-menu.home {
    --bar-fill: transparent;
    --bar-stroke: var(--fill);
    --bar-ink: var(--fill);
  }

  .bar-menu.open { opacity: 1; visibility: visible; transition-delay: 0s; }
  .bar-menu.dataviz-open {
    --menu-gap: clamp(8px, 2vw, 24px);
    grid-template-columns: minmax(0, 44px) minmax(0, 44px) minmax(0, 1fr);
  }

  /* All shapes share a fixed left edge within their slot. */
  .bar-slot { display: grid; justify-items: start; min-width: 0; }
  .bar-control {
    position: relative;
    display: grid;
    align-items: center;
    min-width: 0;
    min-height: 48px;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--bar-ink);
    font: 400 clamp(1rem, 1.8vw, 1.5rem) / 1.2 var(--font-melodrama);
    text-decoration: none;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }

  .primary-link { width: 44px; max-width: 100%; transition: width var(--morph-time) var(--morph-ease); }
  .primary-link.expanded { width: min(100%, calc(var(--word-width) + var(--label-padding) * 2)); }
  .bar-surface,
  .branch-surface {
    width: var(--square);
    height: var(--square);
    background: var(--fill);
    box-shadow: inset 0 0 0 1px transparent;
    color: inherit;
    transition: width var(--morph-time) var(--morph-ease),
      height var(--morph-time) var(--morph-ease), background-color 200ms ease,
      box-shadow 200ms ease, color 200ms ease;
  }

  .bar-surface {
    display: grid;
    place-items: center;
    justify-self: start;
    overflow: hidden;
  }
  .expanded .bar-surface {
    width: 100%;
    height: var(--bar-height);
    background: var(--bar-fill);
    box-shadow: inset 0 0 0 1px var(--bar-stroke);
  }

  /* Hold the solid square through the pause, then change its paint as it grows. */
  @keyframes square-to-bar {
    from { background-color: var(--fill); box-shadow: inset 0 0 0 1px transparent; }
    to { background-color: var(--bar-fill); box-shadow: inset 0 0 0 1px var(--bar-stroke); }
  }

  .bar-label {
    position: relative;
    z-index: 1;
    width: max-content;
    justify-self: center;
    color: inherit;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 240ms ease;
  }
  .expanded .bar-label { opacity: 1; }
  .open .primary-link.expanded { transition-delay: calc(var(--dot-pause) + var(--order) * 65ms); }
  .open .primary-link.expanded .bar-surface {
    animation: square-to-bar var(--morph-time) var(--morph-ease)
      calc(var(--dot-pause) + var(--order) * 65ms) backwards;
    transition-delay: calc(var(--dot-pause) + var(--order) * 65ms),
      calc(var(--dot-pause) + var(--order) * 65ms), 0s, 0s, 0s;
  }
  .open .primary-link.expanded .bar-label { transition-delay: calc(var(--dot-pause) + 600ms + var(--order) * 65ms); }

  .dataviz-branch {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 100%) minmax(0, 0fr);
    align-items: center;
    width: 44px;
    max-width: 100%;
    min-width: 0;
    color: var(--bar-ink);
    transition: width var(--morph-time) var(--morph-ease),
      grid-template-columns var(--morph-time) var(--morph-ease);
  }
  .branch-surface {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .open .dataviz-branch { width: min(100%, calc(var(--dataviz-word-width) + var(--label-padding) * 2)); }
  .open .branch-surface {
    width: 100%;
    height: var(--bar-height);
    background: var(--bar-fill);
    box-shadow: inset 0 0 0 1px var(--bar-stroke);
    animation: square-to-bar var(--morph-time) var(--morph-ease)
      calc(var(--dot-pause) + 130ms) backwards;
  }
  .open:not(.dataviz-open) .dataviz-branch { transition-delay: calc(var(--dot-pause) + 130ms), 0s; }
  .open:not(.dataviz-open) .branch-surface {
    transition-delay: calc(var(--dot-pause) + 130ms), calc(var(--dot-pause) + 130ms), 0s, 0s, 0s;
  }

  .dataviz { width: 100%; justify-items: center; overflow: hidden; }
  .open:not(.dataviz-open) .dataviz-label { opacity: 1; transition-delay: calc(var(--dot-pause) + 730ms); }
  .dataviz-open .dataviz-branch {
    width: min(100%, calc(var(--back-width) + var(--collections-word-width) + var(--label-padding) * 6 + var(--branch-gap) * 3));
    grid-template-columns: minmax(0, var(--back-width)) minmax(0, 1fr);
  }
  .back-mark {
    position: absolute;
    width: 10px;
    height: 10px;
    border: 1px solid currentColor;
    color: inherit;
    opacity: 0;
    z-index: 1;
    transition: opacity 240ms ease;
  }
  .dataviz-open .back-mark { opacity: 1; transition-delay: 600ms; }

  .collections {
    display: flex;
    min-width: 0;
    overflow: hidden;
    visibility: hidden;
    transition: visibility 0s var(--morph-time);
  }
  .dataviz-open .collections { visibility: visible; transition-delay: 0s; }
  .collection {
    flex: 0 0 calc(var(--word-width) + var(--label-padding) * 2 + var(--branch-gap));
    justify-items: center;
    padding-left: var(--branch-gap);
    overflow: hidden;
  }
  /* Gaps cut through the original surface as its child labels are revealed. */
  .collection::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: var(--bar-height);
    background: var(--bg);
    transition: width var(--morph-time) var(--morph-ease);
  }
  .dataviz-open .collection::before { width: var(--branch-gap); }
  .dataviz-open .collection .bar-label { opacity: 1; transition-delay: calc(600ms + var(--order) * 65ms); }
  .collections[inert] .bar-control { pointer-events: none; }
  .bar-menu:not(.open) .bar-control { pointer-events: none; }

  /* Squares stay solid; home-page bars invert on hover. */
  .home .primary-link.expanded:is(:hover, :focus-visible) .bar-surface {
    background: var(--fill);
    color: var(--bg);
    box-shadow: inset 0 0 0 1px var(--fill);
  }
  .dataviz,
  .collection { transition: color 200ms ease; }
  .dataviz::after,
  .collection::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: var(--bar-height);
    background: transparent;
    box-shadow: inset 0 0 0 1px transparent;
    pointer-events: none;
    transition: background-color 200ms ease, box-shadow 200ms ease;
  }
  .collection::after { left: var(--branch-gap); }
  .dataviz-open .dataviz::after,
  .collection::after { box-shadow: inset 0 0 0 1px var(--bar-stroke); }
  .home .dataviz[aria-expanded='false']:is(:hover, :focus-visible),
  .home .collection:is(:hover, :focus-visible) { color: var(--bg); }
  .home .dataviz[aria-expanded='false']:is(:hover, :focus-visible)::after,
  .home .collection:is(:hover, :focus-visible)::after {
    background: var(--fill);
    box-shadow: inset 0 0 0 1px var(--fill);
  }
  .bar-control:focus-visible { outline: 1px solid var(--fill); outline-offset: 3px; }
  .bar-control[aria-current='page'] .bar-label,
  .dataviz.current .dataviz-label { text-decoration: underline; text-underline-offset: .2em; }

  @media (orientation: portrait) {
    .bar-menu { --bar-height: 36px; }
    .bar-control { font-size: 1rem; }
  }
  @media (max-width: 600px) {
    .bar-menu { --back-width: 28px; --branch-gap: 4px; --label-padding: 6px; }
  }
  @media (max-width: 380px) {
    .bar-control { font-size: .875rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar-menu,
    .primary-link,
    .bar-surface,
    .branch-surface,
    .bar-label,
    .dataviz-branch,
    .back-mark,
    .collections,
    .dataviz,
    .collection,
    .dataviz::after,
    .collection::before,
    .collection::after { transition: none !important; animation: none !important; }
  }
</style>
