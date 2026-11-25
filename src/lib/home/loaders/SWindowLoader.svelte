<script>
  import { onMount } from 'svelte';
  import frames from './sFrames.json';
  import signature from './signature.json';
  import LoaderRipples from './LoaderRipples.svelte';

  // Total time includes the opening and its mirrored closing transition.
  let { duration = 6200, motion = 'stack', oncomplete = () => {} } = $props();
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
    // Extra dash gap and cap clearance prevent endpoint dots before drawing.
    // Draw the original centerline, then hold the complete signature before closing.
    const signatureStart = letterTotal - edge;
    animations.push(signaturePath.animate([
      { strokeDashoffset: 1.03 }, { strokeDashoffset: 0 }
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
  <LoaderRipples />
  <div class="window" bind:this={aperture} aria-hidden="true">
    <div class="strip" class:stack={motion !== 'train'} bind:this={strip}>
      {#each frames as frame}
        <svg class="frame" viewBox={frame.viewBox ?? '0 0 320 320'}>
          <path d={frame.d} fill="var(--bg)" />
        </svg>
      {/each}
    </div>
  </div>
    <svg bind:this={signatureLayer} class="signature" viewBox="-15 -15 530 363" aria-hidden="true">
      <path bind:this={signaturePath} d={signature.d} pathLength="1" fill="none"
        stroke="var(--fill)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="1 2" stroke-dashoffset="1.03" />
    </svg>
  <!-- <span class="caption" aria-hidden="true">OZPREY <span>STUDIES IN MOTION</span></span> -->
</div>

<style>
  /* Full-screen aperture and overlapping letter frames. */
  .s-loader { --cell: min(86vw, clamp(190px, 28vw, 390px)); position: fixed; inset: 0; z-index: 10000; background: var(--bg); overflow: hidden; }
  /* Center the compact signature in the viewport without changing its size. */
  .signature {
    position: absolute;
    left: calc(50% - 25px);
    top: calc(50% + 40px);
    transform: translate(-50%, -50%);
    width: clamp(90px, 12vw, 120px);
    max-width: 30vw;
    max-height: 14dvh;
    height: auto;
    overflow: visible;
    pointer-events: none;
  }
  /* Each 320-unit frame includes at least 68 units of space on either side of S. */
  .window { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: var(--cell); height: var(--cell); background: var(--fill); overflow: hidden; clip-path: inset(50% 8% round 2px); }
  .strip { display: flex; width: max-content; height: 100%; margin-left: calc(50% - var(--cell) / 2); will-change: transform; }
  .frame { width: var(--cell); height: var(--cell); flex: none; }
  .strip.stack { display: grid; width: var(--cell); margin-left: 0; will-change: auto; }
  .stack .frame { grid-area: 1 / 1; opacity: 0; }
  .stack .frame:first-child { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {.strip { will-change: auto; }
   }

</style>
