<script>
	import { onMount } from 'svelte';

	import { bigS, letterA } from './homePaths.js';
	import { createLetter } from './createLetter.js';

	let canvas;

	onMount(() => {
		let renderer;
		let scene;
		let camera;

		let letterS;
		let letterAObject;
		let lettersGroup;

		let frame;
		let cleanupEvents;
		let disposed = false;

		async function init() {
			const THREE = await import('three');
			const { SVGLoader } = await import(
				'three/addons/loaders/SVGLoader.js'
			);

			if (disposed || !canvas) return;

			/*
			 * SCENE
			 */
			scene = new THREE.Scene();

			/*
			 * CAMERA
			 */
			camera = new THREE.PerspectiveCamera(
				35,
				window.innerWidth / window.innerHeight,
				0.1,
				100
			);

			camera.position.set(0, 0, 8);

			/*
			 * RENDERER
			 */
			renderer = new THREE.WebGLRenderer({
				canvas,
				alpha: true,
				antialias: true
			});

			renderer.setPixelRatio(
				Math.min(window.devicePixelRatio, 1.5)
			);

			renderer.setSize(
				window.innerWidth,
				window.innerHeight
			);

			renderer.setClearColor(0x000000, 0);

			/*
			 * LETTERS GROUP
			 * Rotate this group instead of individual letters
			 */
			lettersGroup = new THREE.Group();
			scene.add(lettersGroup);

			/*
			 * CREATE LETTERS
			 */
			letterS = createLetter(
				THREE,
				SVGLoader,
				bigS,
				{
					depth: 4,
					scale: 0.055,
					pink: 0xffc0ec,
					dark: 0x24131f,
					gradientStart: 0.55
				}
			);

			letterAObject = createLetter(
				THREE,
				SVGLoader,
				letterA,
				{
					depth: 4,
					scale: 0.055,
					pink: 0xffc0ec,
					dark: 0x24131f,
					gradientStart: 0.55
				}
			);

			/*
			 * POSITION LETTERS
			 */
			letterS.position.set(-1.2, 0, 0);

			letterAObject.position.set(2.2, -1.7, -0.5);
			letterAObject.scale.setScalar(0.7);

			lettersGroup.add(letterS);
			lettersGroup.add(letterAObject);

			/*
			 * RESTING ROTATION
			 */
			const baseRotationX = 0.02;
			const baseRotationY = -0.12;

			lettersGroup.rotation.x = baseRotationX;
			lettersGroup.rotation.y = baseRotationY;

			/*
			 * LIGHTS
			 */
			const keyLight = new THREE.DirectionalLight(0xffffff, 3);
			keyLight.position.set(-4, 4, 6);
			scene.add(keyLight);

			const rimLight = new THREE.DirectionalLight(0xff8fd8, 1.5);
			rimLight.position.set(5, -1, 3);
			scene.add(rimLight);

			const pinkLight = new THREE.PointLight(0xffc0ec, 12, 20);
			pinkLight.position.set(-3, 1, 4);
			scene.add(pinkLight);

			const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
			scene.add(ambientLight);

			/*
			 * POINTER
			 */
			let mouseX = 0;
			let mouseY = 0;

			function pointerMove(event) {
				mouseX = (event.clientX / window.innerWidth) * 2 - 1;
				mouseY = (event.clientY / window.innerHeight) * 2 - 1;
			}

			window.addEventListener('pointermove', pointerMove);

			/*
			 * RESIZE
			 */
			function resize() {
				if (!renderer || !camera) return;

				const width = window.innerWidth;
				const height = window.innerHeight;

				camera.aspect = width / height;
				camera.updateProjectionMatrix();

				renderer.setSize(width, height);
			}

			window.addEventListener('resize', resize);

			/*
			 * ANIMATION
			 */
			function animate() {
				if (disposed) return;

				frame = requestAnimationFrame(animate);

				const targetRotationY = baseRotationY + mouseX * 0.14;
				const targetRotationX = baseRotationX - mouseY * 0.07;

				lettersGroup.rotation.y +=
					(targetRotationY - lettersGroup.rotation.y) * 0.045;

				lettersGroup.rotation.x +=
					(targetRotationX - lettersGroup.rotation.x) * 0.045;

				renderer.render(scene, camera);
			}

			animate();

			/*
			 * EVENT CLEANUP
			 */
			return () => {
				window.removeEventListener('pointermove', pointerMove);
				window.removeEventListener('resize', resize);
			};
		}

		init().then((cleanup) => {
			cleanupEvents = cleanup;
		});

		/*
		 * SVELTE CLEANUP
		 */
		return () => {
			disposed = true;

			if (frame) {
				cancelAnimationFrame(frame);
			}

			cleanupEvents?.();

			if (lettersGroup) {
				lettersGroup.traverse((object) => {
					object.geometry?.dispose();

					if (Array.isArray(object.material)) {
						object.material.forEach((material) => {
							material.dispose();
						});
					} else {
						object.material?.dispose();
					}
				});
			}

			renderer?.dispose();
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		pointer-events: none;
	}
</style>