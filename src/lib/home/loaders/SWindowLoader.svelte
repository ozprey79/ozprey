<script>
  import { onMount } from 'svelte';
  import frames from './sFrames.json';
  import signature from './signature.json';

  // Total time includes the opening and its mirrored closing transition.
  let { duration = 6200, motion = 'stack', oncomplete = () => {} } = $props();
  const uid = $props.id();
  let aperture;
  let strip;
  let backdrop;
  let signaturePath;
  let signatureLayer;

  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const letterTotal = reduced ? 600 : Math.max(2400, duration);
    const signatureDuration = reduced ? 180 : 1900;
    const signatureHold = reduced ? 120 : 550;
    const total = letterTotal + signatureDuration + signatureHold;
    const edge = reduced ? 180 : 950;
    const easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
    const controls = [...document.querySelectorAll('.catmenu, .swanmenu')];
    const inert = controls.map((node) => node.inert);
    controls.forEach((node) => { node.inert = true; });
    // Original, synthesized card flick: a soft paper swish and short tap.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audio;
    let played = false;
    const openingEnds = performance.now() + edge;
    function openingFeedback() {
      if (played || performance.now() > openingEnds) return;
      try {
        if (!reduced) navigator.vibrate?.(12);
        if (!AudioContext) return;
        audio ??= new AudioContext();
        if (audio.state !== 'running') {
          void audio.resume().then(() => {
            if (audio.state === 'running') openingFeedback();
          }).catch(() => {});
          return;
        }
        played = true;
        const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.12), audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 5);
        const source = audio.createBufferSource();
        source.buffer = buffer;
        const filter = audio.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 2300; filter.Q.value = 0.7;
        const gain = audio.createGain(); gain.gain.value = 0.16;
        source.connect(filter).connect(gain).connect(audio.destination);
        source.start();
      } catch { /* Audio and haptics are optional. */ }
    }
    openingFeedback();
    window.addEventListener('pointerdown', openingFeedback);
    window.addEventListener('keydown', openingFeedback);
    const animations = [];
    let complete = false;
    const finish = () => {
      if (complete) return;
      complete = true;
      oncomplete();
    };
    const closed = 'inset(50% 8% round 2px)';
    const open = 'inset(0% 0% round 2px)';
    animations.push(aperture.animate([
      { clipPath: closed, offset: 0, easing },
      { clipPath: open, offset: edge / total },
      { clipPath: open, offset: 1 - edge / total, easing },
      { clipPath: closed, offset: 1 }
    ], { duration: total, fill: 'both' }));
    if (!reduced && motion === 'train') {
      // One continuously interpolated transform; no frame swapping or layout reads.
      animations.push(strip.animate([
        { transform: 'translate3d(0,0,0)' },
        { transform: `translate3d(calc(-${frames.length - 1} * var(--cell)),0,0)` }
      ], { duration: letterTotal - edge, easing: 'cubic-bezier(0.2, 0.05, 0.2, 1)', fill: 'both' }));
    } else if (!reduced) {
      // All frames share the same position. Brief crossfades soften each change.
      const last = frames.length - 1;
      strip.querySelectorAll('.frame').forEach((frame, index) => {
        const keys = [{ opacity: index === 0 ? 1 : 0, offset: 0 }];
        if (index > 0) {
          keys.push(
            { opacity: 0, offset: (index - 0.2) / last },
            { opacity: 1, offset: index / last }
          );
        }
        if (index < last) {
          keys.push(
            { opacity: 1, offset: (index + 0.8) / last },
            { opacity: 0, offset: (index + 1) / last }
          );
        }
        keys.push({ opacity: index === last ? 1 : 0, offset: 1 });
        animations.push(frame.animate(keys, {
          delay: edge, duration: letterTotal - 2 * edge, fill: 'both'
        }));
      });
    }
    // Draw the original centerline, then hold the complete signature before closing.
    const signatureStart = letterTotal - edge;
    animations.push(signaturePath.animate([
      { strokeDashoffset: 1 }, { strokeDashoffset: 0 }
    ], {
      delay: signatureStart, duration: signatureDuration,
      easing: 'cubic-bezier(0.65, 0.02, 0.22, 1)', fill: 'both'
    }));
    animations.push(signatureLayer.animate([
      { clipPath: 'inset(0% 0%)' },
      { clipPath: 'inset(50% 0%)' }
    ], { delay: total - edge, duration: edge, easing, fill: 'both' }));
    const fade = backdrop.animate([
      { opacity: 1 }, { opacity: 0 }
    ], { delay: total - 220, duration: 220, fill: 'both' });
    animations.push(fade);
    fade.onfinish = finish;
    return () => {
      window.removeEventListener('pointerdown', openingFeedback);
      window.removeEventListener('keydown', openingFeedback);
      if (audio && audio.state !== 'closed') void audio.close().catch(() => {});
      animations.forEach((animation) => animation.cancel());
      controls.forEach((node, i) => { node.inert = inert[i]; });
    };
  });
</script>

<div class="s-loader" bind:this={backdrop} role="status" aria-label="Loading Ozprey">
  <svg class="filter-definitions" aria-hidden="true">
    <defs>
      <filter id="{uid}-inset" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feComponentTransfer in="SourceAlpha" result="inverse">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feGaussianBlur in="inverse" stdDeviation="2.8" />
        <feOffset dx="2" dy="4" />
        <feComposite in2="SourceAlpha" operator="in" result="inner" />
        <feFlood flood-color="#291521" flood-opacity="0.8" />
        <feComposite in2="inner" operator="in" result="shadow" />
        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="shadow" /></feMerge>
      </filter>
      <filter id="bristle"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="6" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.4 0 0 0 -0.5" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>
<filter id="chalk"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="4" result="d"/><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3 0 0 0 -0.9" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>
<filter id="wash"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="14" result="d"/><feGaussianBlur in="d" stdDeviation="1.5"/></filter>
    </defs>
  </svg>
  <div class="window" bind:this={aperture} aria-hidden="true">
    <div class="strip" class:stack={motion !== 'train'} bind:this={strip}>
      {#each frames as frame}
        <svg class="frame" viewBox="0 0 320 320">
          <path d={frame.d} fill="black" filter="url(#{uid}-inset)" />
        </svg>
      {/each}
    </div>
    <div class="window-edge"></div>
  </div>
    <svg bind:this={signatureLayer} class="signature" viewBox="-15 -15 530 363" aria-hidden="true">
      <defs>
        <filter id="{uid}-signature-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.065 0.3" numOctaves="3" seed="8" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.5 0.2" result="texture" />
          <feComposite in="rough" in2="texture" operator="in" />
        </filter>
      </defs>
      <path bind:this={signaturePath} d={signature.d} pathLength="1" fill="none"
        stroke="var(--heart)" stroke-width="9.5316" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="1 1" stroke-dashoffset="1" filter="url(#{uid}-signature-ink)" />
    </svg>
  <!-- <span class="caption" aria-hidden="true">OZPREY <span>STUDIES IN MOTION</span></span> -->
</div>

<style>
  /* Full-screen aperture and overlapping letter frames. */
  .s-loader { --cell: min(86vw, clamp(190px, 28vw, 390px)); position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: #181818; overflow: hidden; }
  .signature { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(96vw, calc(var(--cell) * 1.65)); height: auto; overflow: visible; pointer-events: none; }
  .filter-definitions { position: absolute; width: 0; height: 0; }
  /* Each 320-unit frame includes at least 68 units of space on either side of S. */
  .window { position: relative; width: var(--cell); height: var(--cell); background: var(--fill); overflow: hidden; clip-path: inset(50% 8% round 2px); }
  .strip { display: flex; width: max-content; height: 100%; margin-left: calc(50% - var(--cell) / 2); will-change: transform; }
  .frame { width: var(--cell); height: var(--cell); flex: none; }
  .strip.stack { display: grid; width: var(--cell); margin-left: 0; will-change: auto; }
  .stack .frame { grid-area: 1 / 1; opacity: 0; }
  .stack .frame:first-child { opacity: 1; }
  .window-edge { position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 10px 22px -15px #27121e, inset 0 -1px 0 #fbe0ef; background: linear-gradient(90deg, #36252e30, transparent 22%, transparent 78%, #36252e30); }

  @media (prefers-reduced-motion: reduce) {.strip { will-change: auto; }
   }

</style>
