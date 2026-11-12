<script>
  import { onMount } from 'svelte';
  import instrument from '$lib/assets/fonts/InstrumentSerif-Regular.ttf?url';

  let { children, ontransitionstart = () => {}, ontransitionend = () => {} } = $props();
  let surface, overlay;
  let ready = $state(false);
  let pending = $state(true);
  let replay = () => {};

  onMount(() => {
    // HTML-first text meshes, following Eemeli Haakana's Codrops tutorial:
    // https://tympanus.net/codrops/2025/06/05/how-to-create-responsive-and-seo-friendly-webgl-text/
    // The canvas belongs to the section, so browser scrolling moves HTML and
    // WebGL together. No fixed-canvas scroll synchronization or text swapping.
    const canvas = overlay;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, failed = false, generation = 0;
    let renderer, target, material, quadGeometry, scene, camera, postScene, postCamera;
    let frame = 0, resizeFrame = 0, meshes = [], width = 0, height = 0;
    let animating = false, elapsed = 0, lastTime = null, inView = true, firstRun = true;
    let THREE, Text;
    let completed = false;
    function complete() {
      if (disposed || completed) return;
      completed = true;
      ontransitionend();
    }
    const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    // Never leave content hidden if font loading or WebGL initialization stalls.
    const loadingTimeout = window.setTimeout(fallback, 8000);

    function fallback() {
      failed = true;
      ready = false;
      pending = false;
      clearTimeout(loadingTimeout);
      cancelAnimationFrame(frame);
      frame = 0;
      complete();
    }
    function draw() {
      if (disposed || failed || !renderer || !target) return;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    }
    function animate(now) {
      frame = 0;
      if (disposed || failed || document.hidden || !inView) { lastTime = null; return; }
      if (animating) {
        if (lastTime !== null) elapsed += now - lastTime;
        lastTime = now;
        const p = Math.min(elapsed / 2600, 1);
        // Enter already curved, reveal behind a travelling ripple, then relax.
        // Both displacement and its velocity settle to exactly zero.
        material.uniforms.uProgress.value = p;
        material.uniforms.uStrength.value = material.uniforms.uReveal.value > 0.5
          ? 1 - ease(p)
          : p < 0.24 ? ease(p / 0.24) : 1 - ease((p - 0.24) / 0.76);
        if (p === 1) { animating = false; lastTime = null; }
      }
      draw();
      if (!animating) complete();
      if (animating) frame = requestAnimationFrame(animate);
    }
    function schedule() {
      if (!frame && ready && !document.hidden && inView) frame = requestAnimationFrame(animate);
    }
    function release(items) {
      for (const mesh of items) {
        mesh.removeFromParent();
        if (mesh instanceof Text) mesh.dispose();
        else { mesh.geometry.dispose(); mesh.material.dispose(); }
        mesh.userData.baseMaterial?.dispose();
      }
    }

    // Read actual browser line breaks only on layout changes, never in a
    // render frame or on Replay. Troika handles glyphs in its worker.
    function linesFor(element) {
      const lines = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        for (let i = 0; i < node.length; i++) {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (!rect.height || !rect.width) continue;
          let line = lines[lines.length - 1];
          if (!line || Math.abs(line.top - rect.top) > 2) {
            line = { text: '', left: rect.left, top: rect.top, height: rect.height };
            lines.push(line);
          }
          line.text += node.textContent[i];
        }
      }
      return lines.filter((line) => line.text.trim());
    }
    async function layout() {
      if (disposed || failed || !renderer) return;
      const version = ++generation, bounds = surface.getBoundingClientRect();
      const next = [], jobs = [];
      for (const element of surface.querySelectorAll('[data-lens-text]')) {
        const style = getComputedStyle(element), size = parseFloat(style.fontSize);
        const font = instrument;
        const color = style.getPropertyValue('--lens-ink').trim() || style.color;
        for (const line of linesFor(element)) {
          const mesh = new Text();
          Object.assign(mesh, {
            text: line.text, font, fontSize: size,
            letterSpacing: (parseFloat(style.letterSpacing) || 0) / size,
            lineHeight: line.height / size, whiteSpace: 'nowrap',
            anchorX: 'left', anchorY: 'middle', color,
            sdfGlyphSize: size > 80 ? 128 : 64
          });
          const base = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
          mesh.material = base;
          mesh.userData.baseMaterial = base;
          mesh.matrixAutoUpdate = false;
          const skew = 0;
          const x = line.left - bounds.left - bounds.width / 2;
          const y = bounds.height / 2 - (line.top - bounds.top + line.height / 2);
          mesh.matrix.set(1, skew, 0, x, 0, 1, 0, y, 0, 0, 1, 0, 0, 0, 0, 1);
          next.push(mesh);
          jobs.push(new Promise((resolve) => mesh.sync(resolve)));
        }
      }
      for (const element of surface.querySelectorAll('[data-lens-rule]')) {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect.width, rect.height),
          new THREE.MeshBasicMaterial({ color: style.getPropertyValue('--lens-rule-ink').trim() || style.backgroundColor, depthTest: false }));
        mesh.position.set(rect.left - bounds.left + rect.width / 2 - bounds.width / 2,
          bounds.height / 2 - (rect.top - bounds.top + rect.height / 2), 0);
        next.push(mesh);
      }
      await Promise.all(jobs);
      if (disposed || version !== generation) { release(next); return; }
      const staged = new THREE.Scene();
      staged.add(...next);
      // Compile the next layout while the previous canvas is still intact.
      // Resizing clears a WebGL canvas, so commit size + scene + draw together.
      await renderer.compileAsync(staged, camera);
      if (disposed || version !== generation || failed || motion.matches) { release(next); return; }
      release(meshes);
      meshes = next;
      scene.add(...meshes);
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      target.setSize(Math.round(width * ratio), Math.round(height * ratio));
      Object.assign(camera, { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2 });
      camera.updateProjectionMatrix();
      material.uniforms.uAspect.value = width / height;
      draw();
      if (failed) return;
      ready = true;
      pending = false;
      clearTimeout(loadingTimeout);
      schedule();
    }
    function onResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const bounds = surface.getBoundingClientRect();
        if (Math.abs(bounds.width - width) > 0.5 || Math.abs(bounds.height - height) > 0.5) layout().catch(fallback);
      });
    }
    function onMotion() {
      if (motion.matches) {
        animating = false;
        if (material) {
          material.uniforms.uStrength.value = 0;
          material.uniforms.uProgress.value = 1;
        }
        ready = false;
        pending = false;
        clearTimeout(loadingTimeout);
        cancelAnimationFrame(frame);
        frame = 0;
        complete();
      } else if (renderer && !failed) layout().catch(fallback);
      else if (!renderer && !failed) init();
    }
    function onVisibility() { lastTime = null; if (!document.hidden) schedule(); }

    async function init() {
      if (motion.matches || disposed) { pending = false; clearTimeout(loadingTimeout); complete(); return; }
      try {
        const modules = await Promise.all([import('three'), import('troika-three-text'), document.fonts.ready]);
        if (disposed || failed || motion.matches) return;
        THREE = modules[0];
        Text = modules[1].Text;
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setClearColor(0x000000, 0);
        renderer.debug.onShaderError = fallback;
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;
        target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
        postScene = new THREE.Scene();
        postCamera = new THREE.Camera();
        // Subdivide the display surface so the whole panel bends in perspective,
        // while the fragment pass also liquifies contours within each glyph.
        quadGeometry = new THREE.PlaneGeometry(2, 2, 96, 64);
        material = new THREE.ShaderMaterial({
          depthTest: false, depthWrite: false, transparent: true,
          uniforms: {
            uPage: { value: target.texture }, uStrength: { value: 1 },
            uProgress: { value: 0 }, uReveal: { value: 1 }, uAspect: { value: 1 }
          },
          vertexShader: `
            uniform float uStrength;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              vec2 p = position.xy;
              float depth = (1.0 - p.x * p.x) * (1.0 - 0.3 * p.y * p.y) * uStrength;
              p.y += 0.24 * uStrength * (p.x * p.x - 0.45);
              // Homogeneous division gives a genuinely curved perspective,
              // rather than just moving a flat text block around.
              gl_Position = vec4(p, 0.0, 1.0 + 0.32 * depth);
            }`,
          fragmentShader: `
            uniform sampler2D uPage;
            uniform float uStrength;
            uniform float uProgress;
            uniform float uReveal;
            uniform float uAspect;
            varying vec2 vUv;
            void main() {
              vec2 q = vUv - vec2(0.48, 0.55);
              vec2 aspect = vec2(uAspect, 1.0);
              vec2 radial = q * aspect;
              float distanceFromCenter = length(radial);
              float radius = distanceFromCenter / (0.5 * length(aspect));
              float front = mix(-0.18, 1.5, smoothstep(0.0, 0.9, uProgress));
              float band = exp(-pow((radius - front) * 5.5, 2.0));
              vec2 direction = radial / max(distanceFromCenter, 0.001);

              // A moving wave packet stretches and compresses individual
              // strokes, with a smaller trailing wave and tangential flow.
              float wave = sin((radius - front) * 27.0) * band * 0.085;
              wave += sin(radius * 35.0 - uProgress * 19.0) * 0.015
                * exp(-radius * 1.7);
              vec2 uv = 0.5 + (vUv - 0.5)
                * (1.0 + 0.8 * uStrength * radius * radius) / (1.0 + 0.22 * uStrength);
              uv += direction / aspect * wave * uStrength;
              uv += vec2(-direction.y, direction.x) / aspect
                * sin(radius * 13.0 - uProgress * 9.0) * band * uStrength * 0.028;
              uv.x += sin(vUv.y * 17.0 + vUv.x * 6.0 - uProgress * 11.0)
                * uStrength * 0.014;
              uv.y += sin(vUv.x * 19.0 - vUv.y * 5.0 + uProgress * 8.0)
                * uStrength * 0.012;
              vec4 color = texture2D(uPage, clamp(uv, 0.0, 1.0));
              float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
              float reveal = mix(1.0, 1.0 - smoothstep(front - 0.1, front + 0.04, radius), uReveal);
              float rim = exp(-pow((radius - front) * 65.0, 2.0))
                * uStrength * smoothstep(0.0, 0.08, uProgress) * 0.08;
              vec3 ink = color.rgb / max(color.a, 0.0001);
              float alpha = color.a * inside * reveal;
              gl_FragColor = vec4(mix(vec3(1.0, 0.53, 0.83), ink,
                alpha / max(alpha + rim, 0.0001)), max(alpha, rim));
              #include <colorspace_fragment>
            }`
        });
        postScene.add(new THREE.Mesh(quadGeometry, material));
        await layout();
        if (disposed || failed || motion.matches) return;
        replay = () => {
          // Repeated clicks never interrupt and restart a running lens.
          if (disposed || failed || motion.matches || animating) return;
          completed = false;
          ontransitionstart();
          animating = true;
          elapsed = 0;
          lastTime = null;
          material.uniforms.uReveal.value = firstRun ? 1 : 0;
          material.uniforms.uProgress.value = 0;
          material.uniforms.uStrength.value = firstRun ? 1 : 0;
          firstRun = false;
          draw();
          schedule();
        };
        replay();
      } catch (error) {
        console.warn('Fisheye text could not initialize; keeping HTML visible.', error);
        fallback();
      }
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(surface);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      lastTime = null;
      if (inView) schedule();
    });
    observer.observe(surface);
    canvas.addEventListener('webglcontextlost', fallback);
    window.addEventListener('resize', onResize);
    motion.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    init();

    return () => {
      disposed = true;
      generation++;
      clearTimeout(loadingTimeout);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', fallback);
      window.removeEventListener('resize', onResize);
      motion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      release(meshes);
      target?.dispose();
      material?.dispose();
      quadGeometry?.dispose();
      renderer?.dispose();
    };
  });
</script>

<div class="lens-surface" class:ready class:pending bind:this={surface}>
  {@render children()}
  <canvas bind:this={overlay} aria-hidden="true"></canvas>
  {#if ready}
    <button class="replay" onclick={() => replay()} aria-label="Replay fisheye transition">
      <span aria-hidden="true">↻</span> Replay the lens
    </button>
  {/if}
</div>

<style>
  .lens-surface { position: relative; isolation: isolate; background: #181818; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; visibility: hidden; }
  .ready canvas { visibility: visible; }
  .ready :global([data-lens-text]) { color: transparent !important; }
  .ready :global([data-lens-rule]) { background-color: transparent !important; }
  .ready :global([data-lens-text]::selection) { color: #181818; background: #ffc0ec; }
  .ready :global([data-lens-text]:hover) { text-decoration-color: var(--fill); }
  /* Applies from the server's first paint, before imports/fonts initialize.
     With scripting disabled, the ordinary HTML remains visible. */
  @media (scripting: enabled) {
    .pending :global([data-lens-text]) { color: transparent !important; }
    .pending :global([data-lens-rule]) { background-color: transparent !important; }
  }
  .replay { position: absolute; bottom: 24px; right: 5vw; z-index: 3; margin: 0; padding: 10px 0; font: 11px 'Instrument Serif', sans-serif; cursor: pointer; letter-spacing: .02em; }
  .replay span { display: inline-block; margin-right: 6px; font-size: 18px; vertical-align: middle; }
  .replay:hover { text-decoration: underline; text-underline-offset: 5px; }
  .replay:focus-visible { outline: 1px solid var(--fill); outline-offset: 5px; }
  @media (prefers-reduced-motion: reduce) {
    .replay, canvas { display: none; }
    .ready :global([data-lens-text]), .pending :global([data-lens-text]) { color: var(--lens-ink, var(--fill)) !important; }
    .ready :global([data-lens-rule]), .pending :global([data-lens-rule]) { background-color: var(--lens-rule-ink, #614454) !important; }
  }
</style>
