<script>
  import { onMount } from 'svelte';
  const FRAME_COUNT = 20;
  let { oncomplete } = $props();
  let host;
  let fallback;
  let leaving = $state(false);
  let failed = $state(false);


  let finishTimer;

  function finish() {
    if (leaving) return;
    leaving = true;
    finishTimer = window.setTimeout(oncomplete, 550);
  }

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const backgroundControls = [...document.querySelectorAll('.catmenu, .swanmenu')];
    const oldInert = backgroundControls.map((node) => node.inert);
    backgroundControls.forEach((node) => { node.inert = true; });
    let disposed = false, raf, renderer, texture, geometry, observer;
    let velocity = 0, turn = 0, lastTime = 0, lastFrame = 0, lastHaptic = 0;
    let touchY = null, activated = false;
    let render = () => {};
    const atlas = new Image();
    atlas.src = '/motion/cat-atlas.png';
    const impulse = (delta) => {
      if (leaving) return;
      activated = true;
      const value = Math.max(-160, Math.min(160, delta));
      if (reduced.matches) { turn = Math.max(0, Math.min(1, turn + value / 3500)); return; }
      velocity = Math.max(-2.2, Math.min(2.2, velocity + value * .0032));
    };
    const wheel = (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      impulse(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1));
    };
    const key = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input')) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); impulse(110); }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); impulse(-110); }
    };
    const touchStart = (e) => { touchY = e.touches[0]?.clientY ?? null; activated = true; };
    const touchMove = (e) => {
      if (touchY === null) return;
      e.preventDefault(); const next = e.touches[0].clientY;
      impulse((touchY - next) * 1.5); touchY = next;
    };
    const touchEnd = () => { touchY = null; };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);

    let material;
    let shadows;
    async function init() {
      try {
        await atlas.decode();
        shadows = atlas;
        const THREE = await import('three');
        if (disposed) return;
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0, 0);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
        camera.position.z = 1;
        texture = new THREE.Texture(atlas); texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        geometry = new THREE.PlaneGeometry(2, 2);
        material = new THREE.ShaderMaterial({
          transparent: true, depthTest: false, depthWrite: false,
          uniforms: { atlas: { value: texture }, turn: { value: 0 }, energy: { value: 0 }, aspect: { value: 1 } },
          vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
          fragmentShader: `
            uniform sampler2D atlas;
            uniform float turn;
            uniform float energy;
            uniform float aspect;
            varying vec2 vUv;
            float photograph(float frame, vec2 uv){
              frame=mod(frame+20.,20.);
              vec2 cell=vec2(mod(frame,5.),3.-floor(frame/5.));
              vec2 p=(cell+clamp(uv,vec2(.002),vec2(.998)))/vec2(5.,4.);
              vec3 rgb=texture2D(atlas,p).rgb;
              return 1.-smoothstep(.12,.86,dot(rgb,vec3(.299,.587,.114)));
            }
            void main(){
              vec2 uv=vec2(vUv.x,1.-vUv.y);
              float bow=1.-pow((uv.x-.5)*2.,2.);
              float top=.22+.16*bow;
              float bottom=.82+.12*bow;
              float y=(uv.y-top)/(bottom-top);
              if(y<-.025 || y>1.025){gl_FragColor=vec4(0.);return;}
              if(y<0. || y>1.){gl_FragColor=vec4(.07,.07,.07,1.);return;}
              float count=clamp(aspect*2.25,1.1,5.);
              float strip=(uv.x-.5)*count+.5+turn*20.;
              float frame=floor(strip);
              float photoHeight=aspect/(count*2.234);
              vec2 local=vec2(fract(strip),1.-(uv.y-(.65-photoHeight*.5))/photoHeight);
              float density=0.;
              if(local.y>0. && local.y<1.){
                density=photograph(frame+floor(turn*20.),local);
                density=max(density,photograph(frame+floor(turn*20.)-1.,local)*energy*.10);
              }
              vec3 paper=vec3(.87,.69,.81);
              vec3 ink=vec3(.105,.10,.105);
              float falloff=1.-.17*pow(abs(uv.x-.5)*2.,2.);
              vec3 color=mix(paper,ink,density*.94)*falloff;
              float edge=smoothstep(0.,.035,y)*smoothstep(0.,.035,1.-y);
              color*=mix(.72,1.,edge);
              gl_FragColor=vec4(color,1.);
            }`
        });
        scene.add(new THREE.Mesh(geometry, material));
        const resize = () => {
          const { width, height } = host.getBoundingClientRect();
          renderer.setSize(width, height);
          material.uniforms.aspect.value=width/height;
        };
        observer = new ResizeObserver(resize); observer.observe(host); resize();
        render = () => {
          material.uniforms.turn.value = turn;
          material.uniforms.energy.value = reduced.matches ? 0 : Math.abs(velocity);
          renderer.render(scene, camera);
        };
      } catch (error) {
        console.warn('Using the flat canvas motion fallback.', error);
        if (disposed) return;
        failed = true;
        const ctx = fallback.getContext('2d');
        render = () => {
          if (!shadows) return;
          const { width: w, height: h } = host.getBoundingClientRect();
          fallback.width = w * devicePixelRatio; fallback.height = h * devicePixelRatio;
          ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          ctx.save(); ctx.beginPath(); ctx.moveTo(0,h*.22);
          ctx.quadraticCurveTo(w*.5,h*.54,w,h*.22); ctx.lineTo(w,h*.82);
          ctx.quadraticCurveTo(w*.5,h*1.06,0,h*.82); ctx.closePath(); ctx.clip();
          ctx.fillStyle='#deb0cf'; ctx.fillRect(0,0,w,h);
          const count=Math.max(1.1,Math.min(5,w/h*2.25));
          const cell=w/count, offset=turn*20+.5-count*.5;
          for(let i=-1;i<=Math.ceil(count);i++){
            const frame=((i+Math.floor(offset)+Math.floor(turn*20))%20+20)%20;
            const photoHeight=cell/2.234;
            ctx.drawImage(atlas,(frame%5)*512,Math.floor(frame/5)*256,512,256,(i-(offset-Math.floor(offset)))*cell,h*.65-photoHeight*.5,cell,photoHeight);
          }
          ctx.globalCompositeOperation='multiply'; ctx.fillStyle='#deb0cf'; ctx.fillRect(0,0,w,h);
          ctx.restore();
        };
      }
    }
    init();
    const animate = (now) => {
      if (disposed) return;
      const dt = Math.min((now - (lastTime || now)) / 1000, .05); lastTime = now;
      if (!leaving) {
        turn = Math.max(0, Math.min(1, turn + velocity * dt * .17));
        if (turn === 0 && velocity < 0) velocity = 0;
        velocity *= Math.exp(-3.1 * dt);
        if (Math.abs(velocity) < .001) velocity = 0;
        const frame = Math.floor(turn * FRAME_COUNT);
        if (frame !== lastFrame && activated && now - lastHaptic > 60) {
          navigator.vibrate?.(8); lastHaptic = now;
        }
        lastFrame = frame; render();
        if (turn >= 1) finish();
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      disposed = true; cancelAnimationFrame(raf); clearTimeout(finishTimer); observer?.disconnect();
      window.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key);
      window.removeEventListener('touchstart', touchStart); window.removeEventListener('touchmove', touchMove); window.removeEventListener('touchend', touchEnd);
      document.body.style.overflow = oldOverflow;
      backgroundControls.forEach((node, i) => { node.inert = oldInert[i]; });
      material?.dispose(); texture?.dispose(); geometry?.dispose();
      renderer?.dispose(); renderer?.domElement.remove();
    };
  });
</script>

<section class="study" class:leaving aria-label="Scroll to animate the photographic cat sequence. Complete one cycle to enter. Arrow keys also work.">
  <div class="artwork" bind:this={host}></div>
  <canvas class="fallback" class:visible={failed} bind:this={fallback} aria-hidden="true"></canvas>
  <button class="skip" onclick={finish} aria-label="Skip animation and enter site">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" /></svg>
  </button>
</section>

<style>
  .study { position: fixed; inset: 0; z-index: 30; background-color: var(--bg); background-image: radial-gradient(var(--bgdot) .9px, var(--bg) .1px); background-size: 17px 17px; transition: opacity .55s ease; }
  .study.leaving { opacity: 0; pointer-events: none; }
  .artwork, .fallback { position: absolute; inset: 0; width: 100%; height: 100%; }
  .artwork :global(canvas) { display: block; width: 100%; height: 100%; }
  .fallback { display: none; pointer-events: none; }
  .fallback.visible { display: block; }
  .skip { position: absolute; right: 25px; top: 25px; width: 28px; height: 28px; margin: 0; padding: 5px; cursor: pointer; opacity: .4; transition: opacity .2s; }
  .skip:hover, .skip:focus-visible { opacity: 1; }
  .skip:focus-visible { outline: 1px solid var(--fill); outline-offset: 5px; }
  .skip svg { display: block; width: 100%; height: 100%; stroke: var(--fill); stroke-width: 1; }
  @media (prefers-reduced-motion: reduce) { .study { transition: none; } }
</style>
