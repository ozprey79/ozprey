<script>
    import { onMount } from 'svelte';
    import fragment from './disco.frag?raw';
    let { hero = false } = $props();
    let canvas;
    let paused = $state(false);
    let unavailable = $state(false);
    let synchronize = () => {};
    $effect(() => { synchronize(paused); });
    onMount(() => {
        const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: 'low-power' });
        if (!gl) { unavailable = true; return; }
        const shaders = [];
        let program, buffer, frame;
        let inView = false, stopped = false, last = 0, elapsed = 0;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const release = () => {
            if (buffer) gl.deleteBuffer(buffer);
            if (program) gl.deleteProgram(program);
            shaders.forEach((shader) => gl.deleteShader(shader));
        };
        try {
            const compile = (type, source) => {
                const shader = gl.createShader(type);
                shaders.push(shader);
                gl.shaderSource(shader, source); gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
                return shader;
            };
            program = gl.createProgram();
            gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }'));
            gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
            gl.useProgram(program);
            buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
            const position = gl.getAttribLocation(program, 'position');
            gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        } catch (error) {
            console.warn('Disco panel unavailable:', error);
            unavailable = true; release(); return;
        }
        const resolution = gl.getUniformLocation(program, 'iResolution');
        const time = gl.getUniformLocation(program, 'iTime');
        const draw = () => {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(resolution, canvas.width, canvas.height);
            gl.uniform1f(time, elapsed); gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        const animate = (now) => {
            if (stopped) return;
            elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
            last = now; draw(); frame = requestAnimationFrame(animate);
        };
        synchronize = () => {
            cancelAnimationFrame(frame); last = 0;
            if (!stopped && inView && !paused && !motion.matches && !document.hidden) frame = requestAnimationFrame(animate);
        };
        const resize = new ResizeObserver(() => {
            const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
            canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
            if (!stopped) draw();
        });
        resize.observe(canvas);
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; synchronize(); });
        observer.observe(canvas);
        const lost = (event) => { event.preventDefault(); stopped = true; unavailable = true; cancelAnimationFrame(frame); };
        canvas.addEventListener('webglcontextlost', lost);
        motion.addEventListener('change', synchronize);
        document.addEventListener('visibilitychange', synchronize);
        return () => {
            stopped = true; cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect();
            motion.removeEventListener('change', synchronize);
            document.removeEventListener('visibilitychange', synchronize);
            canvas.removeEventListener('webglcontextlost', lost);
            synchronize = () => {}; release();
        };
    });
</script>

<aside class="disco-panel" class:hero aria-label={hero ? 'Music' : 'Disco light study'}>
    {#if !hero}<div class="panel-heading"><p>After hours</p><span>Light study</span></div>{/if}
    <div class="screen" role="img" aria-label="Rotating copper mirror ball with warm golden reflections">
        <canvas bind:this={canvas} aria-hidden="true"></canvas>
        {#if unavailable}<p class="fallback">The dance floor is quiet.<br /><small>This browser cannot display the light study.</small></p>{/if}
    </div>
    {#if hero}<h1>Music</h1>{/if}
    <div class="panel-footer"><p>{hero ? 'A listening journal in plays and hours.' : 'A little disco, on the side.'}</p><button type="button" disabled={unavailable} aria-pressed={paused} onclick={() => paused = !paused}>{paused ? 'Resume' : 'Pause'}</button></div>
</aside>

<style>
    .disco-panel { width: min(100%, 380px); margin: 40px 0 0 auto; border: 1px solid color-mix(in srgb, var(--fill) 24%, transparent); background: transparent; }
    .disco-panel.hero { position:relative; display:grid; grid-template-rows:minmax(0,1fr) auto; width:100%; height:100%; min-height:0; margin:0; border:0; padding-top:64px; }
    .hero .screen { align-self:center; justify-self:center; width:auto; height:min(85vw,68svh,100%); aspect-ratio:1; }
    .hero h1 { position:absolute; left:0; right:0; bottom:clamp(62px,12svh,120px); margin:0; text-align:center; font:400 clamp(6rem,24vw,22rem)/.8 var(--mfont); text-transform:uppercase; letter-spacing:-.055em; pointer-events:none; }
    .hero .panel-footer { position:relative; padding:20px 0; }
    .hero .panel-footer p { font-size:1rem; }
    .panel-heading, .panel-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; }
    .panel-heading p { font-family: var(--mfont), serif; font-size: 1.8rem; }
    .panel-heading span { font-size: .62rem; letter-spacing: .12em; text-transform: uppercase; color: var(--heart); }
    .screen { position: relative; aspect-ratio: 4 / 3; background: transparent; }
    canvas { display: block; width: 100%; height: 100%; }
    .fallback { position: absolute; inset: 0; display: grid; align-content: center; text-align: center; padding: 20px; font-family: var(--mfont), serif; font-size: 1.5rem; }
    .fallback small { font: .8rem sans-serif; opacity: .6; margin-top: 10px; }
    .panel-footer p { font-size: .8rem; opacity: .65; }
    button { border-bottom: 1px solid var(--heart); padding: 4px 0; font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; cursor: pointer; }
    button:focus-visible { outline: 1px solid var(--heart); outline-offset: 4px; }
    @media (prefers-reduced-motion: reduce) { button { display: none; } }
</style>
