<script>
  import { onMount } from 'svelte';
  import { onNavigate } from '$app/navigation';

  let overlay;
  let curtain;
  let waveField;
  let sweep = () => {};

  // onNavigate excludes initial loads and full-document/external navigation.
  onNavigate((navigation) => {
    if (!navigation.from || navigation.from.url.pathname === navigation.to.url.pathname) return;
    return sweep(navigation);
  });

  onMount(() => {
    const paths = [...overlay.querySelectorAll('.wave-stroke')];
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const portraitPhone = matchMedia('(max-width: 767px) and (orientation: portrait)');
    let frame = 0;
    let finish;
    let generation = 0;
    let disposed = false;

    const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const clamp = (t) => Math.max(0, Math.min(1, t));
    const gradient = (n) => {
      const hash = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return (hash - Math.floor(hash)) * 2 - 1;
    };
    // Continuous gradient noise modulates the sine instead of jittering each frame.
    function noise(x) {
      const cell = Math.floor(x), t = x - cell;
      const a = gradient(cell) * t, b = gradient(cell + 1) * (t - 1);
      return a + (b - a) * smooth(t);
    }

    function draw(progress, revealing, time) {
      const viewportWidth = innerWidth, viewportHeight = innerHeight;
      const vertical = portraitPhone.matches;
      // Rotate the entire field, including its cover, so both drawing and
      // erasing travel from the bottom edge to the top on portrait phones.
      const width = vertical ? viewportHeight : viewportWidth;
      const height = vertical ? viewportWidth : viewportHeight;
      waveField.setAttribute('transform', vertical
        ? `matrix(0 -1 1 0 0 ${viewportHeight})`
        : 'matrix(1 0 0 1 0 0)');
      const amplitude = Math.min(height * 0.045, 32);
      const verticalInset = amplitude + 12;
      overlay.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);
      // A flowing dark front blends into the site's background. Strokes have
      // their own tips below, rather than sharing a rectangular clipping edge.
      const front = [];
      for (let step = 0; step <= 80; step++) {
        const v = step / 80;
        const drift = Math.sin(v * 7 + time * 0.8) * 0.65
          + noise(v * 5 - time * 0.35) * 0.7;
        const x = width * (-0.2 + 1.4 * smooth(progress)
          + drift * 0.17 * Math.sin(Math.PI * progress));
        front.push(`${x.toFixed(2)},${(v * height).toFixed(2)}`);
      }
      const side = revealing ? width * 1.3 : -width * 0.3;
      curtain.setAttribute('d', `M${side},0 L${front.join(' L')} L${side},${height} Z`);

      paths.forEach((path, row) => {
        const v = row / (paths.length - 1);
        const baseline = verticalInset + v * (height - verticalInset * 2);
        // Uneven, correlated timing makes little groups of filaments reach
        // forward and recede together, with no single straight leading edge.
        const delay = 0.12 + Math.sin(v * 9 + (revealing ? 1.4 : 0)) * 0.065
          + noise(row * 0.47) * 0.09;
        const travel = smooth(clamp(progress * 1.25 - delay));
        const start = revealing ? travel : 0;
        const end = revealing ? 1 : travel;
        path.style.opacity = end - start < 0.001 ? '0' : '0.8';
        const points = [];
        const samples = Math.max(1, Math.ceil(width * (end - start) / 7));
        for (let step = 0; step <= samples; step++) {
          const u = start + (end - start) * step / samples;
          const x = u * width;
          // Neighboring rows share a field, keeping the contours parallel.
          // Slow phase drift plus a small oscillation keeps them vibrating
          // throughout both halves, without restarting at the page change.
          const phase = u * Math.PI * 8 + v * 3.2 + time * 0.85;
          const wave = Math.sin(phase) * 0.52
            + Math.sin(u * Math.PI * 13 - v * 4.5 - time * 0.65) * 0.23
            + noise(u * 8 + v * 2 + time * 0.28) * 0.9
            + Math.sin(time * 5.2 + u * 9 + v * 3) * 0.09;
          points.push(`${x.toFixed(2)},${(baseline + wave * amplitude).toFixed(2)}`);
        }
        path.setAttribute('d', `M${points.join(' L')}`);
      });
    }

    function stop() {
      cancelAnimationFrame(frame);
      finish?.();
      finish = undefined;
    }

    function animate(revealing, duration) {
      return new Promise((resolve) => {
        const start = performance.now();
        finish = resolve;
        function render(now) {
          const progress = clamp((now - start) / duration);
          draw(progress, revealing, now / 1000);
          if (progress < 1 && !motion.matches && !document.hidden) {
            frame = requestAnimationFrame(render);
          } else {
            draw(1, revealing, now / 1000);
            finish = undefined;
            resolve();
          }
        }
        frame = requestAnimationFrame(render);
      });
    }

    function reset() {
      overlay.style.visibility = 'hidden';
      overlay.style.pointerEvents = 'none';
    }

    sweep = async (navigation) => {
      const current = ++generation;
      stop();
      if (motion.matches || document.hidden) { reset(); return; }
      draw(0, false, performance.now() / 1000);
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';
      // Cover the outgoing DOM before allowing SvelteKit to commit the new page.
      await animate(false, 850);
      if (disposed || current !== generation) return;
      navigation.complete.catch(() => { if (current === generation) { stop(); reset(); } });
      return () => {
        if (disposed || current !== generation) return;
        void animate(true, 850).then(() => {
          if (current === generation) reset();
        });
      };
    };

    return () => { disposed = true; generation++; stop(); reset(); };
  });
</script>

<svg bind:this={overlay} class="page-sweep" aria-hidden="true" focusable="false" preserveAspectRatio="none">
  <g bind:this={waveField}>
    <path bind:this={curtain} fill="var(--bg, #181818)" />
    <g fill="none" stroke="var(--fill, #ffede7)" stroke-width="0.65" stroke-linecap="round" stroke-linejoin="round">
      {#each Array(52) as _, row (row)}
        <path class="wave-stroke" />
      {/each}
    </g>
  </g>
</svg>

<style>
  .page-sweep {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    visibility: hidden;
    pointer-events: none;
    overflow: hidden;
  }
</style>
