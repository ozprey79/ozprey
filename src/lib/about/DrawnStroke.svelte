<script>
  import artwork from '$lib/about/assets/strokes.json';

  let { active = false } = $props();
  const id = $props.id();
  // The source is an Inkscape Spiro + Pattern Along Path brush. Animate a
  // broad nib along its curve, masking the original filled outline so all of
  // its brush texture survives. The unmodified source SVG is kept with it.
  const spine = 'M 396,-40 C 424,-20 448,10 455,37 C 463,68 450,96 427,108 C 401,124 374,113 364,94 C 351,71 365,46 383,30 C 405,12 437,-3 461,-2 C 480,-3 490,5 502,13 C 515,23 529,20 532,12 C 538,-1 519,-3 505,-1 C 490,0 481,-7 482,-20';
</script>

<svg class:active viewBox={artwork.viewBox} role="img" aria-labelledby={`${id}-title`}>
  <title id={`${id}-title`}>A hand-drawn calligraphic brush stroke</title>
  <defs>
    <mask id={`${id}-ink`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="210" height="185" style="mask-type: luminance">
      <g transform={artwork.layerTransform}>
        <g transform={artwork.pathTransform}>
          <path class="nib" d={spine} pathLength="1" fill="none" stroke="white" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      </g>
      <rect class="finish" x="-10" y="-10" width="210" height="185" fill="white" />
    </mask>
  </defs>
  <g mask={`url(#${id}-ink)`}>
    <g transform={artwork.layerTransform}>
      <path d={artwork.outline} transform={artwork.pathTransform} fill="currentColor" />
    </g>
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; overflow: visible; opacity: 0; }
  svg.active { opacity: 1; }
  .nib { stroke-dasharray: 1 2; stroke-dashoffset: 1; }
  .finish { opacity: 0; }
  .active .nib { animation: ink 2600ms cubic-bezier(.35, 0, .25, 1) both; }
  /* Expose any tiny bristle ends beyond the nib only after the pen arrives. */
  .active .finish { animation: finish 180ms 2500ms linear both; }
  @keyframes ink { to { stroke-dashoffset: 0; } }
  @keyframes finish { to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    svg { opacity: 1; }
    .nib { stroke-dashoffset: 0; animation: none !important; }
    .finish { opacity: 1; animation: none !important; }
  }
  @media (scripting: none) {
    svg { opacity: 1; }
    .nib { stroke-dashoffset: 0; }
    .finish { opacity: 1; }
  }
</style>
