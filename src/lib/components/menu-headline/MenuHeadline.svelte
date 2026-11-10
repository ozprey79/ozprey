<script>
  import { onMount } from 'svelte';
  import { createInstrumentAtlas } from './createInstrumentAtlas.js';
  import { createFont, buildHeadline, revealAt } from './layoutHeadline.js';
  import { headlineVertex, headlineFragment } from './headlineShaders.js';

  let { onclose } = $props();
  const items = [
    { label: 'Home', href: '/' },
    { label: 'About me', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Movies', href: '/movies' },
    { label: 'Close' }
  ];
  let host;
  let ready = $state(false);
  let failed = $state(false);
  let hitboxes = $state([]);
  let hovered = -1, focused = -1;
  let wake = () => {};
  function interaction(index, source, active) {
    if (source === 'pointer') hovered = active ? index : -1;
    else focused = active ? index : -1;
    wake();
  }

  onMount(() => {
    let disposed = false;
    let renderer, atlas, material, quad, geometry, observer;
    let raf = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let motionChange = () => {};
    function release() {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      reduced.removeEventListener('change', motionChange);
      geometry?.dispose(); quad?.dispose(); material?.dispose(); atlas?.dispose();
      renderer?.dispose(); renderer?.domElement.remove();
    }

    async function init() {
      try {
        const THREE = await import('three');
        if (disposed) return;
        const generated = await createInstrumentAtlas(items.map(item => item.label));
        if (disposed) return;
        const font = createFont(generated.json);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.prepend(renderer.domElement);
        atlas = new THREE.CanvasTexture(generated.canvas);
        atlas.flipY = false;
        atlas.colorSpace = THREE.NoColorSpace;
        atlas.minFilter = atlas.magFilter = THREE.LinearFilter;
        atlas.generateMipmaps = false;
        atlas.needsUpdate = true;

        const ink = new THREE.Color(getComputedStyle(host).color);
        // CSS RGB values are already in display space, as in the reference shader.
        ink.convertLinearToSRGB();
        const edges = Array.from({ length: 8 }, () => new THREE.Vector2(-1e5, 1e5));
        const hoverSpacing = new Float32Array(64);
        material = new THREE.ShaderMaterial({
          vertexShader: headlineVertex, fragmentShader: headlineFragment,
          transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
          uniforms: {
            tAtlas: { value: atlas }, uPxRange: { value: font.atlas.distanceRange },
            uAtlasSize: { value: new THREE.Vector2(font.atlas.width, font.atlas.height) },
            uInk: { value: new THREE.Vector3(ink.r, ink.g, ink.b) },
            uTime: { value: 0 }, uFontPx: { value: 100 }, uTravel: { value: 0 },
            uDur: { value: 1.6 }, uSpread: { value: 0.35 }, uSpreadDur: { value: 1.8 },
            uTrailLag: { value: 0.028 }, uTrailCount: { value: 8 },
            uTrailAlpha: { value: 0.22 }, uTrailFalloff: { value: 1.1 },
            uTrailGate: { value: 14 }, uReveal: { value: edges }, uHover: { value: hoverSpacing }
          }
        });
        quad = new THREE.BufferGeometry();
        quad.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 1,0,0, 1,1,0, 0,1,0], 3));
        quad.setIndex([0,1,2, 0,2,3]);
        const mesh = new THREE.Mesh(quad, material);
        mesh.frustumCulled = false;
        const scene = new THREE.Scene(); scene.add(mesh);
        const camera = new THREE.OrthographicCamera(0,1,0,1,-1,1);
        let headline, width, total;
        const start = performance.now();
        let lastFrame = start;
        function render(now) {
          const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
          lastFrame = now;
          let moving = false;
          for (let line = 0; line < items.length; line++) {
            const target = !reduced.matches && (line === hovered || line === focused) ? 1 : 0;
            // Ghost samples follow the main spacing with progressively more lag.
            for (let ghost = 0; ghost < 8; ghost++) {
              const offset = line * 8 + ghost;
              const goal = ghost === 0 ? target : hoverSpacing[offset - 1];
              const rate = ghost === 0 ? 11 : 30;
              hoverSpacing[offset] = reduced.matches ? 0 : hoverSpacing[offset] + (goal - hoverSpacing[offset]) * (1 - Math.exp(-dt * rate));
              if (Math.abs(hoverSpacing[offset] - target) > 0.0001) moving = true;
              else hoverSpacing[offset] = target;
            }
          }
          const time = reduced.matches ? total : Math.min(total, Math.max(0, (now - start) / 1000));
          material.uniforms.uTime.value = time;
          const reveal = revealAt(headline.lineInfo, width, time);
          edges.forEach((edge, i) => edge.set(reveal[i * 2], reveal[i * 2 + 1]));
          renderer.render(scene, camera);
          return time < total || moving;
        }
        function frame(now) {
          raf = 0;
          if (!disposed && render(now)) raf = requestAnimationFrame(frame);
        }
        wake = () => {
          if (!disposed && !raf) { lastFrame = performance.now(); raf = requestAnimationFrame(frame); }
        };
        function layout() {
          width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          camera.right = width; camera.bottom = height; camera.updateProjectionMatrix();
          headline = buildHeadline(font, items.map(item => item.label), {
            W: width, H: height, fit: 0.72, leading: 1.45, maxFontPx: 108,
            dirs: [1,-1], trails: 8, lineStagger: 0.16, charStagger: 0.045
          });
          const next = new THREE.InstancedBufferGeometry();
          next.setIndex(quad.index);
          next.setAttribute('position', quad.getAttribute('position'));
          for (const [name, data] of [['aRect',headline.rect], ['aUv',headline.uv], ['aHome',headline.home], ['aAnim',headline.anim]]) {
            next.setAttribute(name, new THREE.InstancedBufferAttribute(data, 4));
          }
          next.instanceCount = headline.count;
          geometry?.dispose(); geometry = next; mesh.geometry = next;
          material.uniforms.uFontPx.value = headline.fontPx;
          material.uniforms.uTravel.value = width * 0.9;
          total = headline.lastDelay + 1.8 + 8 * 0.028;
          hitboxes = headline.lineInfo.map((line, index) => {
            const padding = (items[index].label.length - 1) * headline.fontPx * 0.06 + 16;
            return {
              left: Math.max(0, line.x0 - padding), top: line.baseline - (font.capEm + 0.12) * headline.fontPx,
              width: Math.min(width, line.x1 - line.x0 + padding * 2), height: Math.max(32, headline.fontPx * 1.12)
            };
          });
          render(performance.now());
        }
        layout();
        ready = true;
        observer = new ResizeObserver(layout); observer.observe(host);
        motionChange = () => { cancelAnimationFrame(raf); frame(performance.now()); };
        reduced.addEventListener('change', motionChange);
        frame(performance.now());
      } catch (error) {
        release();
        if (!disposed) { ready = false; failed = true; console.warn('Menu headline uses HTML fallback:', error); }
      }
    }
    init();
    return () => { disposed = true; wake = () => {}; release(); };
  });
</script>

<div class="headline" class:ready class:failed bind:this={host} inert={!ready && !failed}>
  <div class="links">
    {#each items as item, index}
      {@const box = hitboxes[index]}
      {@const bounds = ready && box ? `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px` : undefined}
      {#if item.href}
        <a href={item.href} onclick={onclose} style={bounds} onpointerenter={(event) => { if (event.pointerType !== 'touch') interaction(index, 'pointer', true); }} onpointerleave={() => interaction(index, 'pointer', false)} onfocus={() => interaction(index, 'focus', true)} onblur={() => interaction(index, 'focus', false)}><span>{item.label}</span></a>
      {:else}
        <button type="button" onclick={onclose} style={bounds} onpointerenter={(event) => { if (event.pointerType !== 'touch') interaction(index, 'pointer', true); }} onpointerleave={() => interaction(index, 'pointer', false)} onfocus={() => interaction(index, 'focus', true)} onblur={() => interaction(index, 'focus', false)}><span>{item.label}</span></button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .headline { position: absolute; inset: max(90px, 12dvh) 6vw 7dvh; overflow: hidden; color: var(--bg); }
  .headline :global(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .links { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; }
  a, button { display: flex; align-items: center; justify-content: center; color: inherit; background: transparent; border: 0; margin: 0; padding: 0; font: italic 400 clamp(24px, 5vmin, 64px)/1.4 'Instrument Serif', serif; text-decoration: none; cursor: pointer; }
  .ready a, .ready button { position: absolute; min-height: 24px; }
  .headline:not(.failed) span { opacity: 0; }
  .failed span { transition: letter-spacing 300ms ease; }
  .failed a:is(:hover, :focus-visible) span, .failed button:is(:hover, :focus-visible) span { letter-spacing: .12em; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--bg); outline-offset: 6px; }
  @media (max-height: 420px) { .headline { inset: 60px 6vw 4dvh; } }
  @media (prefers-reduced-motion: reduce) { .failed span { transition: none; } }
</style>
