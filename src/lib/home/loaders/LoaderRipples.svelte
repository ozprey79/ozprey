<script>
  import { onMount } from 'svelte';
  let canvas;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, points = [], raf;
    const start = performance.now();
    let color;

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = getComputedStyle(canvas).getPropertyValue('--fill').trim() || '#eee';
      const gap = width < 600 ? 30 : 42;
      points = [];
      for (let y = -gap; y <= height + gap; y += gap) {
        for (let x = -gap; x <= width + gap; x += gap) {
          const dx = x - width / 2, dy = y - height / 2;
          points.push([dx, dy, Math.hypot(dx, dy)]);
        }
      }
      draw(performance.now());
    }

    function draw(now) {
      const t = reduced.matches ? 0 : (now - start) / 1000;
      const scale = Math.max(width, height) / 2 || 1;
      const rmax = Math.hypot(width, height) / 2 / scale || 1;
      const strength = reduced.matches ? 0.001 : 0.001 + (1 - Math.exp(-t * 1.4)) * (1.1 + 0.55 * Math.sin(t * 1.3));
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.24;
      for (const [dx, dy, distance] of points) {
        const r = distance / scale;
        const warped = rmax * Math.atan(strength * r) / Math.atan(strength * rmax) * scale;
        const wave = reduced.matches ? 0 : Math.sin(distance / 75 - t * 3.4) * 15 * (1 - Math.exp(-t * 2)) * Math.exp(-distance / (scale * 1.3));
        const factor = distance > 0 ? (warped + wave) / distance : 1;
        ctx.fillRect(width / 2 + dx * factor - 1, height / 2 + dy * factor - 1, 2, 2);
      }
    }

    function tick(now) {
      draw(now);
      if (!reduced.matches) raf = requestAnimationFrame(tick);
    }
    function motionChanged() {
      cancelAnimationFrame(raf);
      tick(performance.now());
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    tick(start);
    reduced.addEventListener('change', motionChanged);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      reduced.removeEventListener('change', motionChanged);
    };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
</style>
