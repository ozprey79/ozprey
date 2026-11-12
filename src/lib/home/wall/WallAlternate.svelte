<script>
  import { onMount } from 'svelte';
  import { WALL_SVG } from './wallSvg.js';
  import { vertexShader, fragmentShader } from './alternateShaders.js';

  let { svg = WALL_SVG, radius = '0' } = $props();
  let host;
  let ready = $state(false);
  let drawn = $state(false);
  let prepared = $state(false);
  let failed = $state(false);
  // Trusted, bundled artwork. Remove duplicate IDs and the portrait's external SVG filter.
  const clean = (markup) => markup.replace(/\s(?:id|filter)="[^"]*"/g, '');
  const drawing = $derived(clean(svg));
  const wallId = $props.id();

  onMount(() => {
    let disposed = false, renderer, material, geometry, resize, intersection;
    let textures = [], generation = 0, inView = true, invalidated = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = [];
    const root = host.querySelector('.drawing svg');
    const ns = 'http://www.w3.org/2000/svg';
    const element = (name, attributes = {}) => {
      const node = document.createElementNS(ns, name);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      return node;
    };
    const defs = element('defs');
    root.prepend(defs);
    const gradientId = `${wallId}-gradient`;
    const gradient = element('linearGradient', { id: gradientId });
    gradient.append(element('stop', { 'stop-color': 'var(--fill, #ffc0ec)' }),
      element('stop', { offset: '1', 'stop-color': '#090709' }));
    defs.append(gradient);
    const paths = [...root.querySelectorAll('path')];
    paths.forEach((path, index) => {
      const box = path.getBBox();
      const clipId = `${wallId}-window-${index}`;
      const clip = element('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
      // Fixed windows include the full stroke; only the contents move.
      clip.append(element('rect', { x: box.x - 0.3, y: box.y - 0.3,
        width: box.width + 0.6, height: box.height + 0.6 }));
      defs.append(clip);
      const window = element('g', { 'clip-path': `url(#${clipId})` });
      const contents = element('g');
      path.replaceWith(window);
      window.append(contents);
      contents.append(path);
      const delay = index / Math.max(1, paths.length - 1) * 550;
      if (path.classList.contains('filledLetters')) {
        const fill = path.cloneNode(true);
        fill.style.fill = `url(#${gradientId})`;
        fill.style.stroke = 'none';
        contents.prepend(fill);
        if (!reduced.matches) animations.push(fill.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 850, delay: delay + 750 + Math.random() * 900, easing: 'ease-out', fill: 'both' }
        ));
      }
      if (!reduced.matches) animations.push(contents.animate(
        [{ transform: `translateY(${box.height + 0.8}px)` }, { transform: 'translateY(0)' }],
        { duration: 1400, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
      ));
    });
    prepared = true;
    Promise.all(animations.map((animation) => animation.finished)).then(() => {
      if (!disposed) drawn = true;
    }).catch(() => {});
    const ghosts = [];
    const flow = { x: 0.5, y: 0.5, hover: false, seen: false, scroll: 0 };
    let lastX = null, lastY = null, touchY = null, lastEmit = 0, lastScroll = window.scrollY;
    const bounds = () => host.getBoundingClientRect();
    function emit(dx, dy, x = 0.5, y = 0.5, local = true) {
      if (reduced.matches || !inView || Math.hypot(dx, dy) < 0.0005) return;
      const now = performance.now();
      if (now - lastEmit < 38) return;
      lastEmit = now;
      // Separate outline impressions expand along the gesture, then fade out.
      ghosts.unshift({ dx, dy, x, y, local, born: now });
      ghosts.length = Math.min(12, ghosts.length);
      invalidated = true;
    }
    function pointer(event) {
      const r = bounds();
      const x = (event.clientX - r.left) / r.width, y = 1 - (event.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { lastX = lastY = null; flow.hover = false; return; }
      flow.x = x; flow.y = y; flow.hover = true;
      if (lastX !== null) emit(x - lastX, y - lastY, x, y);
      lastX = x; lastY = y;
    }
    function wheel(event) {
      if (event.ctrlKey) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      if (inView && !reduced.matches) flow.scroll = Math.max(-1.5, Math.min(1.5, flow.scroll + event.deltaY * unit / 400));
      emit(0, Math.max(-0.045, Math.min(0.045, event.deltaY * unit / 4000)), 0.5, 0.5, false);
    }
    function scroll() {
      const y = window.scrollY;
      if (inView && !reduced.matches) flow.scroll = Math.max(-1.5, Math.min(1.5, flow.scroll + (y - lastScroll) / 250));
      emit(0, Math.max(-0.045, Math.min(0.045, (y - lastScroll) / 2000)), 0.5, 0.5, false);
      lastScroll = y;
    }
    function start(event) {
      touchY = event.touches[0]?.clientY ?? null;
      if (event.touches[0]) pointer(event.touches[0]);
    }
    function touch(event) {
      const point = event.touches[0];
      if (point) pointer(point);
      if (point && touchY !== null && !reduced.matches) flow.scroll = Math.max(-1.5, Math.min(1.5, flow.scroll + (touchY - point.clientY) / 150));
      if (point && touchY !== null) emit(0, (touchY - point.clientY) / 1000, 0.5, 0.5, false);
      touchY = point?.clientY ?? null;
    }
    function reset() { lastX = lastY = touchY = null; flow.hover = false; }
    function leave(event) { if (!event.relatedTarget) reset(); }
    function motionChange() { if (reduced.matches) animations.forEach((animation) => animation.finish()); ghosts.length = 0; flow.scroll = 0; flow.seen = false; invalidated = true; drawn = true; }
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('blur', reset);
    window.addEventListener('pointerout', leave);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    host.addEventListener('touchstart', start, { passive: true });
    host.addEventListener('touchmove', touch, { passive: true });
    host.addEventListener('touchend', reset, { passive: true });
    host.addEventListener('touchcancel', reset, { passive: true });
    reduced.addEventListener('change', motionChange);

    async function init() {
      try {
        const THREE = await import('three');
        if (disposed) return;
        renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: true, antialias: false });
        renderer.setClearColor(0, 0);
        renderer.debug.onShaderError = () => { failed = true; ready = false; renderer.setAnimationLoop(null); };
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.prepend(renderer.domElement);
        renderer.domElement.addEventListener('webglcontextlost', () => { failed = true; ready = false; });
        const color = new THREE.Color(getComputedStyle(host).getPropertyValue('--fill').trim() || '#ffc0ec').convertLinearToSRGB();
        const ghostUniforms = Array.from({ length: 12 }, () => new THREE.Vector4());
        const centerUniforms = Array.from({ length: 12 }, () => new THREE.Vector2());
        const smoothPointer = new THREE.Vector2(0.5, 0.5);
        const previousPointer = smoothPointer.clone();
        const targetPointer = smoothPointer.clone();
        const rawVelocity = new THREE.Vector2();
        const velocity = new THREE.Vector2();
        material = new THREE.ShaderMaterial({
          vertexShader, fragmentShader, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
          uniforms: {
            uFill: { value: null }, uOutline: { value: null }, uTime: { value: 0 }, uColor: { value: color },
            uResolution: { value: new THREE.Vector2(1, 1) }, uGhosts: { value: ghostUniforms }, uCenters: { value: centerUniforms },
            uPointer: { value: smoothPointer }, uVelocity: { value: velocity },
            uInfluence: { value: 0 }, uEnergy: { value: 0 }, uScroll: { value: 0 }
          }
        });
        geometry = new THREE.PlaneGeometry(2, 2);
        const scene = new THREE.Scene();
        const quad = new THREE.Mesh(geometry, material);
        quad.frustumCulled = false;
        scene.add(quad);
        const camera = new THREE.Camera();

        async function maskTexture(kind, width, height) {
          const doc = new DOMParser().parseFromString(clean(svg), 'image/svg+xml');
          const root = doc.documentElement;
          root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          root.setAttribute('width', width); root.setAttribute('height', height);
          // White alpha masks, with a horizontal objectBoundingBox gradient for each filled path.
          root.insertAdjacentHTML('afterbegin', '<defs><linearGradient id="mask-ramp"><stop stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient></defs>');
          root.querySelectorAll('path').forEach((path) => {
            const filled = path.getAttribute('class')?.includes('filledLetters');
            path.setAttribute('fill', kind === 'fill' && filled ? 'url(#mask-ramp)' : 'none');
            path.setAttribute('stroke', kind === 'outline' ? 'white' : 'none');
            path.setAttribute('stroke-width', '0.3');
          });
          const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }));
          try {
            const image = new Image(); image.src = url; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(image, 0, 0, width, height);
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            return texture;
          } finally { URL.revokeObjectURL(url); }
        }
        async function layout() {
          const current = ++generation;
          const { width, height } = bounds();
          if (width < 1 || height < 1) return;
          const dpr = Math.min(devicePixelRatio || 1, 2, 2400 / Math.max(width, height));
          renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
          material.uniforms.uResolution.value.set(width, height);
          const next = await Promise.all([
            maskTexture('fill', Math.ceil(width * dpr), Math.ceil(height * dpr)),
            maskTexture('outline', Math.ceil(width * dpr), Math.ceil(height * dpr))
          ]);
          if (disposed || current !== generation) { next.forEach((texture) => texture.dispose()); return; }
          const old = textures; textures = next;
          material.uniforms.uFill.value = next[0]; material.uniforms.uOutline.value = next[1];
          renderer.render(scene, camera);
          old.forEach((texture) => texture.dispose());
          if (!failed) ready = true;
          invalidated = true;
        }
        const safeLayout = () => layout().catch((error) => { failed = true; ready = false; console.error('Letter wall fallback:', error); });
        await layout();
        if (disposed) return;
        resize = new ResizeObserver(safeLayout); resize.observe(host);
        intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }); intersection.observe(host);
        let last = performance.now();
        renderer.setAnimationLoop((now) => {
          const dt = Math.max(0.001, Math.min(0.05, (now - last) / 1000)); last = now;
          if (!inView || document.hidden || failed || (reduced.matches && !invalidated)) return;
          invalidated = false;
          if (!reduced.matches) material.uniforms.uTime.value += dt;
          targetPointer.set(flow.x, flow.y);
          // First contact starts under the pointer, avoiding a sweep from the center.
          if (!flow.seen && flow.hover) {
            smoothPointer.copy(targetPointer); previousPointer.copy(targetPointer);
            velocity.set(0, 0); flow.seen = true;
          }
          smoothPointer.lerp(targetPointer, 1 - Math.exp(-dt * 16));
          rawVelocity.copy(smoothPointer).sub(previousPointer).divideScalar(dt).clampLength(0, 2.5);
          previousPointer.copy(smoothPointer);
          velocity.lerp(rawVelocity, 1 - Math.exp(-dt * 10));
          const u = material.uniforms;
          u.uInfluence.value += ((flow.hover && !reduced.matches ? 1 : 0) - u.uInfluence.value) * (1 - Math.exp(-dt * 7));
          u.uEnergy.value = reduced.matches ? 0 : Math.min(1, velocity.length() * 0.9);
          u.uScroll.value = reduced.matches ? 0 : flow.scroll;
          if (reduced.matches) { velocity.set(0, 0); u.uInfluence.value = 0; }
          flow.scroll *= Math.exp(-dt * 4);
          for (let i = 0; i < 12; i++) {
            const ghost = ghosts[i];
            if (!ghost || reduced.matches) { ghostUniforms[i].set(0, 0, 0, 0); continue; }
            const age = (now - ghost.born) / 1000;
            const opacity = Math.max(0, 1 - age / 1.65) ** 1.7 * 0.55;
            const distance = 0.7 + age * 5;
            ghostUniforms[i].set(ghost.dx * distance, ghost.dy * distance, opacity, ghost.local ? 1 : 0);
            centerUniforms[i].set(ghost.x, ghost.y);
          }
          renderer.render(scene, camera);
        });
      } catch (error) {
        if (!disposed) { failed = true; ready = false; console.error('Letter wall fallback:', error); }
      }
    }
    init();
    return () => {
      disposed = true; generation++;
      animations.forEach((animation) => animation.cancel());
      renderer?.setAnimationLoop(null); resize?.disconnect(); intersection?.disconnect();
      textures.forEach((texture) => texture.dispose());
      material?.dispose(); geometry?.dispose(); renderer?.dispose(); renderer?.domElement.remove();
      window.removeEventListener('pointermove', pointer); window.removeEventListener('blur', reset);
      window.removeEventListener('pointerout', leave);
      window.removeEventListener('wheel', wheel); window.removeEventListener('scroll', scroll);
      host.removeEventListener('touchstart', start); host.removeEventListener('touchmove', touch); host.removeEventListener('touchend', reset);
      host.removeEventListener('touchcancel', reset);
      reduced.removeEventListener('change', motionChange);
    };
  });
</script>

<div class="wall" class:ready={ready && drawn} class:failed bind:this={host} style:border-radius={radius} data-wall="alternate" data-renderer={ready && !failed ? 'webgl' : 'svg'} aria-hidden="true">
  <div class="drawing" class:prepared>{@html drawing}</div>
</div>

<style>
  .wall { position: relative; width: 100%; height: 100%; min-height: 120px; overflow: hidden; }
  .wall :global(canvas) { position: absolute; inset: 0; display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 0.35s; }
  .drawing { visibility: hidden; position: absolute; inset: 0; opacity: 1; transition: opacity 0.35s; }
  .drawing.prepared { visibility: visible; }
  .drawing :global(svg) { display: block; width: 100%; height: 100%; }
  .drawing :global(path) { fill: none; stroke: var(--fill, #ffc0ec); stroke-width: 0.3; }
  .ready :global(canvas) { opacity: 1; }
  .ready .drawing { opacity: 0; }
  .failed .drawing { opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    .drawing, .wall :global(canvas) { transition: none; }
  }
</style>
