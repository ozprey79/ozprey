<script>
	import { onMount } from 'svelte';
	import { gsap } from 'gsap/dist/gsap';
	import * as THREE from 'three';
	import { WALL_SVG } from './wallSvg.js';
	import { buildWallParts, VIEWBOX } from './wallGeometry.js';
	import {
		letterVertex,
		fillFragment,
		strokeFragment,
		postVertex,
		postFragment
	} from './wallShaders.js';

	/**
	 * fill      Used when the CSS custom property --fill is not set on / above this component.
	 * maxDpr    Cap on devicePixelRatio (2 is visually lossless on phones, 3+ mostly wasted fill-rate).
	 * samples   MSAA samples for the artwork (clamped to what the GPU supports).
	 * distortion Global multiplier for the pointer effect. 0 = off, 1 = default.
	 * smoothFill false (default) = exact replica: the gradient fill pops in when each letter's
	 *            tween ends (what GSAP actually did). true = fade it in with the same eased value.
	 */
	let {
		fill = '#ffc0ec',
		maxDpr = 2,
		samples = 4,
		distortion = 1,
		smoothFill = false
	} = $props();

	let container = $state(null);

	const PINK = [255 / 255, 192 / 255, 236 / 255]; // rgb(255, 192, 236) from #grad1

	/** Any CSS colour string -> [r,g,b] in 0..1 (sRGB, no colour-management). */
	function cssToRgb01(css) {
		const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
		c.fillStyle = '#000';
		c.fillStyle = css; // invalid strings are ignored -> stays black
		c.fillRect(0, 0, 1, 1);
		const d = c.getImageData(0, 0, 1, 1).data;
		return [d[0] / 255, d[1] / 255, d[2] / 255];
	}

	onMount(() => {
		/* ------------------------------------------------------------ renderer */
		const renderer = new THREE.WebGLRenderer({
			antialias: false, // MSAA happens in the render target below
			alpha: true,
			premultipliedAlpha: true,
			powerPreference: 'high-performance'
		});
		renderer.setClearColor(0x000000, 0);
		const canvas = renderer.domElement;
		canvas.style.cssText = 'display:block;width:100%;height:100%';
		container.appendChild(canvas);

		const rt = new THREE.WebGLRenderTarget(1, 1, {
			samples: Math.min(samples, renderer.capabilities.maxSamples),
			stencilBuffer: true, // used so every stroke pixel is painted exactly once
			depthBuffer: true,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			type: THREE.UnsignedByteType
		});

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

		/* ------------------------------------------------------------ colours (--fill) */
		const cssFill = getComputedStyle(container).getPropertyValue('--fill').trim() || fill;
		const strokeRgb = cssToRgb01(cssFill);

		/* ------------------------------------------------------------ shared uniforms
		   every letter material gets these, so you can also drive effects in the letters'
		   own vertex/fragment shaders (positions are in scene units, y up) */
		const shared = {
			uTime: { value: 0 },
			uPointerW: { value: new THREE.Vector2(1e5, 1e5) },
			uVelocityW: { value: new THREE.Vector2() },
			uEnergy: { value: 0 },
			uInfluence: { value: 0 }
		};

		/* ------------------------------------------------------------ letters */
		const parts = buildWallParts(WALL_SVG);
		const empties = []; // .emptyletters  (stroke only, slides in)
		const filled = []; // .filledLetters (stroke fades in, then gradient fill)
		const disposables = [];

		parts.forEach((p, i) => {
			const strokeMat = new THREE.ShaderMaterial({
				vertexShader: letterVertex,
				fragmentShader: strokeFragment,
				uniforms: {
					uColor: { value: new THREE.Vector3(...strokeRgb) },
					uP: { value: p.kind === 'empty' ? 1 : 0 },
					...shared
				},
				transparent: true,
				depthTest: false,
				depthWrite: false,
				side: THREE.DoubleSide,
				// paint each pixel of this stroke once, even where its own triangles overlap
				stencilWrite: true,
				stencilFunc: THREE.NotEqualStencilFunc,
				stencilRef: (i % 254) + 1,
				stencilFail: THREE.KeepStencilOp,
				stencilZFail: THREE.KeepStencilOp,
				stencilZPass: THREE.ReplaceStencilOp
			});
			const strokeMesh = new THREE.Mesh(p.stroke, strokeMat);
			strokeMesh.renderOrder = i * 2 + 1; // DOM order == SVG paint order (fill, then stroke)
			strokeMesh.frustumCulled = false;
			disposables.push(p.stroke, strokeMat);

			if (p.kind === 'empty') {
				scene.add(strokeMesh);
				empties.push({ state: { x: 0 }, strokeMesh });
				return;
			}

			const fillMat = new THREE.ShaderMaterial({
				vertexShader: letterVertex,
				fragmentShader: fillFragment,
				uniforms: {
					uBBoxX: { value: new THREE.Vector2(p.bboxX[0], p.bboxX[1]) },
					uPink: { value: new THREE.Vector3(...PINK) },
					uAlpha: { value: 1 },
					...shared
				},
				transparent: true,
				depthTest: false,
				depthWrite: false,
				side: THREE.DoubleSide
			});
			const fillMesh = new THREE.Mesh(p.fill, fillMat);
			fillMesh.renderOrder = i * 2;
			fillMesh.frustumCulled = false;
			fillMesh.visible = false; // fromTo({fill:'none', stroke:'none'}) renders immediately
			strokeMesh.visible = false;
			scene.add(fillMesh, strokeMesh);
			disposables.push(p.fill, fillMat);
			filled.push({ state: { n: 0 }, fillMesh, strokeMesh, fillMat, strokeMat });
		});

		/* ------------------------------------------------------------ post pass */
		const post = new THREE.ShaderMaterial({
			vertexShader: postVertex,
			fragmentShader: postFragment,
			uniforms: {
				tScene: { value: rt.texture },
				uPointer: { value: new THREE.Vector2(0.5, 0.5) },
				uVelocity: { value: new THREE.Vector2() },
				uInfluence: shared.uInfluence,
				uEnergy: shared.uEnergy,
				uAspect: { value: 1 },
				uTime: shared.uTime,
				uStrength: { value: distortion }
			},
			depthTest: false,
			depthWrite: false,
			blending: THREE.NoBlending // writes premultiplied RGBA straight to the canvas
		});
		const quadGeo = new THREE.PlaneGeometry(2, 2);
		const quad = new THREE.Mesh(quadGeo, post);
		quad.frustumCulled = false;
		const postScene = new THREE.Scene();
		postScene.add(quad);
		const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

		/* ------------------------------------------------------------ timeline (identical numbers) */
		const ctx = gsap.context(() => {
			const tl = gsap.timeline({ delay: 0.5 });

			tl.from(
				empties.map((e) => e.state),
				{
					x: () => gsap.utils.random(20, 55),
					duration: 1.4,
					stagger: { amount: 1.1, from: 'start' },
					ease: 'power3.inOut'
				}
			);

			tl.fromTo(
				filled.map((f) => f.state),
				{ n: 0 },
				{
					n: 1,
					duration: 2.2,
					stagger: { amount: 1.9, from: 'start' },
					ease: 'elastic.inOut(1, 0.35)'
				},
				'-=0.5'
			);
		}, container);

		/* ------------------------------------------------------------ layout ("xMidYMid slice") */
		const drawSize = new THREE.Vector2();
		function layout() {
			const w = Math.max(1, container.clientWidth);
			const h = Math.max(1, container.clientHeight);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
			renderer.setSize(w, h, false);
			renderer.getDrawingBufferSize(drawSize);
			rt.setSize(drawSize.x, drawSize.y);

			const scale = Math.max(w / VIEWBOX.w, h / VIEWBOX.h); // slice = cover
			const vw = w / scale;
			const vh = h / scale;
			const cx = VIEWBOX.x + VIEWBOX.w / 2;
			const cy = -(VIEWBOX.y + VIEWBOX.h / 2); // scene y is flipped
			camera.left = cx - vw / 2;
			camera.right = cx + vw / 2;
			camera.top = cy + vh / 2;
			camera.bottom = cy - vh / 2;
			camera.updateProjectionMatrix();
			post.uniforms.uAspect.value = w / h;
		}
		layout();
		const ro = new ResizeObserver(layout);
		ro.observe(container);

		/* ------------------------------------------------------------ pointer
		   listened on window so it still works when text/UI sits on top of the wall */
		const target = new THREE.Vector2(0.5, 0.5); // uv, y up
		const smooth = new THREE.Vector2(0.5, 0.5);
		const prev = new THREE.Vector2(0.5, 0.5);
		const vel = new THREE.Vector2();
		let hover = false;
		let seen = false;

		function onPointerMove(e) {
			const r = container.getBoundingClientRect();
			const u = (e.clientX - r.left) / r.width;
			const v = 1 - (e.clientY - r.top) / r.height;
			hover = u >= 0 && u <= 1 && v >= 0 && v <= 1;
			if (!hover) return;
			target.set(u, v);
			if (!seen) {
				smooth.copy(target); // first contact: no sweep from the centre
				prev.copy(target);
				seen = true;
			}
		}
		function onPointerOut(e) {
			if (!e.relatedTarget) hover = false; // left the window
		}
		window.addEventListener('pointermove', onPointerMove, { passive: true });
		window.addEventListener('pointerout', onPointerOut, { passive: true });

		/* ------------------------------------------------------------ frame */
		let last = performance.now();
		const rough = (n) => Math.round(n * 1e4) / 1e4; // GSAP writes numbers with 4 decimals

		renderer.setAnimationLoop((now) => {
			const dt = Math.min(0.05, Math.max(1e-4, (now - last) / 1000));
			last = now;
			shared.uTime.value += dt;

			/* 1. apply the GSAP state to the meshes */
			for (const e of empties) e.strokeMesh.position.x = e.state.x;

			for (const f of filled) {
				const n = f.state.n;
				f.strokeMat.uniforms.uP.value = n;
				f.strokeMesh.visible = n > 0;
				if (smoothFill) {
					f.fillMat.uniforms.uAlpha.value = Math.min(1, Math.max(0, n));
					f.fillMesh.visible = n > 0;
				} else {
					// GSAP animated  fill: url(#grad<n>)  -> the reference only resolves when n === 1,
					// every other frame the paint server is invalid and the fill is simply not drawn.
					f.fillMesh.visible = rough(n) === 1;
				}
			}

			/* 2. pointer smoothing -> uniforms */
			const k = 1 - Math.exp(-dt * 14);
			smooth.lerp(target, k);
			const raw = prev.clone().sub(smooth).multiplyScalar(-1 / dt); // uv / s
			prev.copy(smooth);
			vel.lerp(raw, 1 - Math.exp(-dt * 10));
			if (vel.length() > 4) vel.setLength(4);

			shared.uInfluence.value += ((hover ? 1 : 0) - shared.uInfluence.value) * (1 - Math.exp(-dt * 6));
			shared.uEnergy.value += (Math.min(1, vel.length() * 0.8) - shared.uEnergy.value) * (1 - Math.exp(-dt * 8));

			post.uniforms.uPointer.value.copy(smooth);
			post.uniforms.uVelocity.value.copy(vel);
			post.uniforms.uStrength.value = distortion;

			// the same pointer in scene units for effects inside the letter shaders
			shared.uPointerW.value.set(
				camera.left + smooth.x * (camera.right - camera.left),
				camera.bottom + smooth.y * (camera.top - camera.bottom)
			);
			shared.uVelocityW.value.set(
				vel.x * (camera.right - camera.left),
				vel.y * (camera.top - camera.bottom)
			);

			/* 3. artwork -> MSAA texture -> screen */
			renderer.setRenderTarget(rt);
			renderer.clear();
			renderer.render(scene, camera);
			renderer.setRenderTarget(null);
			renderer.render(postScene, postCam);
		});

		/* ------------------------------------------------------------ teardown */
		return () => {
			renderer.setAnimationLoop(null);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerout', onPointerOut);
			ro.disconnect();
			ctx.revert();
			disposables.forEach((d) => d.dispose());
			post.dispose();
			quadGeo.dispose();
			rt.dispose();
			renderer.dispose();
			canvas.remove();
		};
	});
</script>

<div class="wall" bind:this={container}></div>

<style>
	.wall {
		width: 100%;
		height: 100%;
		position: relative;
	}
</style>