<script>
	import { onMount } from 'svelte';

	let canvas;

	let visible = $state(true);
	let ready = $state(false);

	onMount(() => {
		let renderer;
		let geometry;
		let material;
		let frame;

		let disposed = false;
		let removeResize = () => {};

		async function init() {
			const THREE = await import('three');

			if (disposed || !canvas) return;

			/* --------------------------------
				RENDERER
			-------------------------------- */

			renderer = new THREE.WebGLRenderer({
				canvas,
				alpha: true,
				antialias: true,
				powerPreference: 'high-performance'
			});

			renderer.setClearColor(0x000000, 0);

			const pixelRatio = Math.min(
				window.devicePixelRatio || 1,
				2
			);

			renderer.setPixelRatio(pixelRatio);

			renderer.setSize(
				window.innerWidth,
				window.innerHeight,
				false
			);

			/* --------------------------------
				SCENE
			-------------------------------- */

			const scene = new THREE.Scene();

			const camera =
				new THREE.OrthographicCamera(
					-1,
					1,
					1,
					-1,
					0,
					1
				);

			/* --------------------------------
				UNIFORMS
			-------------------------------- */

			const uniforms = {
				uProgress: {
					value: 0
				},

				uTime: {
					value: 0
				},

				uResolution: {
					value: new THREE.Vector2()
				},

				/*
					Wave begins near the cat/menu area.
				*/
				uOrigin: {
					value: new THREE.Vector2(
						0.88,
						0.84
					)
				},

				/*
					Base size used to build
					variable rectangles.
				*/
				uBaseCell: {
					value: 58 * pixelRatio
				},

				uBlack: {
					value: new THREE.Color('grey')
				},

				uGraphite: {
					value: new THREE.Color('#505050')
				},

				uSlate: {
					value: new THREE.Color('#181818')
				},

				uLime: {
					value: new THREE.Color('#fbceee')
				}
			};

			renderer.getDrawingBufferSize(
				uniforms.uResolution.value
			);

			/* --------------------------------
				GEOMETRY
			-------------------------------- */

			geometry =
				new THREE.PlaneGeometry(2, 2);

			/* --------------------------------
				MATERIAL
			-------------------------------- */

			material =
				new THREE.ShaderMaterial({
					transparent: true,
					depthWrite: false,
					depthTest: false,

					uniforms,

					vertexShader: `
						varying vec2 vUv;

						void main() {
							vUv = uv;

							gl_Position = vec4(
								position.xy,
								0.0,
								1.0
							);
						}
					`,

					fragmentShader: `
						precision highp float;

						varying vec2 vUv;

						uniform float uProgress;
						uniform float uTime;

						uniform vec2 uResolution;
						uniform vec2 uOrigin;

						uniform float uBaseCell;

						uniform vec3 uBlack;
						uniform vec3 uGraphite;
						uniform vec3 uSlate;
						uniform vec3 uLime;


						/* ================================
							UTILITIES
						================================ */

						float hash21(vec2 p) {
							p = fract(
								p *
								vec2(
									123.34,
									345.45
								)
							);

							p += dot(
								p,
								p + 34.345
							);

							return fract(
								p.x * p.y
							);
						}


						float easeInOut(float t) {
							return t < 0.5
								? 4.0 * t * t * t
								: 1.0 -
								  pow(
									  -2.0 * t + 2.0,
									  3.0
								  ) * 0.5;
						}


						float rectMask(
							vec2 p,
							vec2 halfSize,
							float softness
						) {
							vec2 d =
								abs(p) -
								halfSize;

							float outside =
								max(
									d.x,
									d.y
								);

							return 1.0 -
								smoothstep(
									0.0,
									softness,
									outside
								);
						}


						void main() {

							/* ============================
								PARENT MOSAIC GRID
							============================ */

							vec2 pixel =
								gl_FragCoord.xy;

							float base =
								uBaseCell;

							/*
								Each parent block is divided
								into a different arrangement.
							*/
							float parentSize =
								base * 5.0;

							vec2 parentID =
								floor(
									pixel /
									parentSize
								);

							vec2 local =
								mod(
									pixel,
									parentSize
								) /
								parentSize -
								0.5;


							float patternRnd =
								hash21(
									parentID +
									2.7
								);

							float pattern =
								floor(
									patternRnd *
									6.0
								);


							vec2 tileCenter =
								vec2(0.0);

							vec2 halfSize =
								vec2(0.1);

							float childID =
								0.0;


							/* ============================
								PATTERN 0

								One large block
							============================ */

							if (pattern < 1.0) {

								tileCenter =
									vec2(
										0.0,
										0.0
									);

								halfSize =
									vec2(
										0.5,
										0.5
									);

								childID =
									0.0;
							}


							/* ============================
								PATTERN 1

								Two tall rectangles
							============================ */

							else if (
								pattern < 2.0
							) {

								bool right =
									local.x >
									0.0;

								tileCenter =
									vec2(
										right
											? 0.25
											: -0.25,

										0.0
									);

								halfSize =
									vec2(
										0.25,
										0.5
									);

								childID =
									right
										? 1.0
										: 2.0;
							}


							/* ============================
								PATTERN 2

								Two wide rectangles
							============================ */

							else if (
								pattern < 3.0
							) {

								bool top =
									local.y >
									0.0;

								tileCenter =
									vec2(
										0.0,

										top
											? 0.25
											: -0.25
									);

								halfSize =
									vec2(
										0.5,
										0.25
									);

								childID =
									top
										? 3.0
										: 4.0;
							}


							/* ============================
								PATTERN 3

								Four smaller squares
							============================ */

							else if (
								pattern < 4.0
							) {

								bool right =
									local.x >
									0.0;

								bool top =
									local.y >
									0.0;

								tileCenter =
									vec2(
										right
											? 0.25
											: -0.25,

										top
											? 0.25
											: -0.25
									);

								halfSize =
									vec2(
										0.25,
										0.25
									);

								childID =
									5.0 +
									(
										right
											? 1.0
											: 0.0
									) +
									(
										top
											? 2.0
											: 0.0
									);
							}


							/* ============================
								PATTERN 4

								Tall left +
								two right blocks
							============================ */

							else if (
								pattern < 5.0
							) {

								if (
									local.x <
									0.0
								) {

									tileCenter =
										vec2(
											-0.25,
											0.0
										);

									halfSize =
										vec2(
											0.25,
											0.5
										);

									childID =
										10.0;

								} else {

									bool top =
										local.y >
										0.0;

									tileCenter =
										vec2(
											0.25,

											top
												? 0.25
												: -0.25
										);

									halfSize =
										vec2(
											0.25,
											0.25
										);

									childID =
										top
											? 11.0
											: 12.0;
								}
							}


							/* ============================
								PATTERN 5

								Mirror arrangement
							============================ */

							else {

								if (
									local.x >
									0.0
								) {

									tileCenter =
										vec2(
											0.25,
											0.0
										);

									halfSize =
										vec2(
											0.25,
											0.5
										);

									childID =
										13.0;

								} else {

									bool top =
										local.y >
										0.0;

									tileCenter =
										vec2(
											-0.25,

											top
												? 0.25
												: -0.25
										);

									halfSize =
										vec2(
											0.25,
											0.25
										);

									childID =
										top
											? 14.0
											: 15.0;
								}
							}


							vec2 tileKey =
								parentID *
								17.0 +
								vec2(
									childID,
									pattern
								);


							/* ============================
								TILE POSITION
							============================ */

							vec2 tileCentrePx =
								parentID *
								parentSize +
								(
									tileCenter +
									0.5
								) *
								parentSize;


							vec2 tileCentreUV =
								tileCentrePx /
								uResolution;


							/* ============================
								WAVE DELAY
							============================ */

							vec2 d =
								tileCentreUV -
								uOrigin;

							d.x *=
								uResolution.x /
								uResolution.y;


							float dist =
								length(d);


							float maxDist =
								length(
									vec2(
										uResolution.x /
										uResolution.y,

										1.0
									)
								);


							float delay =
								dist /
								maxDist;


							/*
								Tiny randomness stops the
								wave from feeling perfectly
								mathematical.
							*/
							delay +=
								(
									hash21(
										tileKey +
										3.9
									) -
									0.5
								) *
								0.055;


							delay =
								clamp(
									delay,
									0.0,
									1.0
								);


							/*
								IMPORTANT:

								Compress the delay spread.

								This prevents half of the
								screen disappearing while
								the other half remains frozen.
							*/
							delay *=
								0.78;


							/* ============================
								LOCAL PROGRESS
							============================ */

							float window =
								0.48;


							float tileStart =
								delay *
								(
									1.0 -
									window
								);


							float localT =
								clamp(
									(
										uProgress -
										tileStart
									) /
									window,

									0.0,
									1.0
								);


							float t =
								easeInOut(
									localT
								);


							/* ============================
								LOCAL TILE COORDINATE
							============================ */

							vec2 localRel =
								local -
								tileCenter;


							/* ============================
								FULL GRAPHITE PLATE

								Important fix:
								the tile doesn't instantly
								become an empty black hole.
							============================ */

							float fullTile =
								rectMask(
									localRel,
									halfSize,
									0.008
								);


							/* ============================
								SHUTTER ORIENTATION
							============================ */

							float orient =
								step(
									0.5,
									hash21(
										tileKey +
										9.4
									)
								);


							float softness =
								0.009;


							float mask =
								0.0;


							/* ============================
								LEFT / RIGHT OPENING
							============================ */

							if (
								orient >
								0.5
							) {

								float panelHalfW =
									halfSize.x *
									0.5;


								float travel =
									t *
									(
										halfSize.x *
										1.55 +
										0.08
									);


								float leftPanel =
									rectMask(
										localRel -
										vec2(
											-panelHalfW -
											travel,

											0.0
										),

										vec2(
											panelHalfW,
											halfSize.y
										),

										softness
									);


								float rightPanel =
									rectMask(
										localRel -
										vec2(
											panelHalfW +
											travel,

											0.0
										),

										vec2(
											panelHalfW,
											halfSize.y
										),

										softness
									);


								mask =
									max(
										leftPanel,
										rightPanel
									);
							}


							/* ============================
								TOP / BOTTOM OPENING
							============================ */

							else {

								float panelHalfH =
									halfSize.y *
									0.5;


								float travel =
									t *
									(
										halfSize.y *
										1.55 +
										0.08
									);


								float topPanel =
									rectMask(
										localRel -
										vec2(
											0.0,

											panelHalfH +
											travel
										),

										vec2(
											halfSize.x,
											panelHalfH
										),

										softness
									);


								float bottomPanel =
									rectMask(
										localRel -
										vec2(
											0.0,

											-panelHalfH -
											travel
										),

										vec2(
											halfSize.x,
											panelHalfH
										),

										softness
									);


								mask =
									max(
										topPanel,
										bottomPanel
									);
							}


							/* ============================
								BACK PLATE HOLD

								This is the main correction
								for the "stuck black" look.
							============================ */

							float plateHold =
								1.0 -
								smoothstep(
									0.50,
									0.92,
									localT
								);


							/* ============================
								GRAPHITE MATERIAL
							============================ */

							float r1 =
								hash21(
									tileKey +
									1.3
								);


							float r2 =
								hash21(
									tileKey +
									7.7
								);


							float r3 =
								hash21(
									tileKey +
									18.2
								);


							vec3 tileColor =
								mix(
									uBlack,
									uGraphite,
									0.48 +
									0.28 *
									r1
								);


							tileColor =
								mix(
									tileColor,
									uSlate,
									r2 *
									0.25
								);


							tileColor *=
								0.90 +
								0.12 *
								r3;


							/*
								Faint graphite lift while
								the back plate remains.
							*/
							tileColor =
								mix(
									tileColor,
									uSlate,
									plateHold *
									0.13
								);


							/* ============================
								SUBTLE GRAPHITE SHEEN
							============================ */

							float sheen =
								0.5 +
								0.5 *
								sin(
									(
										tileKey.x +
										tileKey.y
									) *
									0.47 +

									uTime *
									0.42
								);


							tileColor +=
								vec3(
									sheen *
									0.018 *
									(
										1.0 -
										t
									)
								);


							/* ============================
								THIN LIME BORDER
							============================ */

							vec2 edgeVector =
								halfSize -
								abs(
									localRel
								);


							float innerEdge =
								min(
									edgeVector.x,
									edgeVector.y
								);


							/*
								Only count pixels inside
								the rectangle.
							*/
							float inside =
								step(
									0.0,
									innerEdge
								);


							/*
								Narrow lime line.
							*/
							float limeEdge =
								(
									1.0 -
									smoothstep(
										0.0,
										0.0055,
										innerEdge
									)
								) *
								inside;


							/*
								Edge remains visible while
								the rectangle starts moving,
								then gently dies away.
							*/
							float limeStrength =
								limeEdge *
								(
									0.82 -
									t *
									0.38
								);


							tileColor =
								mix(
									tileColor,
									uLime,
									limeStrength
								);


							/* ============================
								ALPHA

								Visible shutters +
								temporary translucent plate.
							============================ */

							float plateAlpha =
								fullTile *
								plateHold *
								0.20;


							float alpha =
								max(
									mask,
									plateAlpha
								);


							/* ============================
								GLOBAL FINAL CLEANUP
							============================ */

							alpha *=
								1.0 -
								smoothstep(
									0.94,
									1.0,
									uProgress
								);


							gl_FragColor =
								vec4(
									tileColor,
									alpha
								);
						}
					`
				});


			/* --------------------------------
				MESH
			-------------------------------- */

			const mesh =
				new THREE.Mesh(
					geometry,
					material
				);

			scene.add(mesh);


			/* --------------------------------
				FIRST FRAME

				The wrapper is currently solid black.
				We render the shader once before
				making that wrapper transparent.
			-------------------------------- */

			renderer.render(
				scene,
				camera
			);

			ready = true;


			/* --------------------------------
				REDUCED MOTION
			-------------------------------- */

			const reducedMotion =
				window.matchMedia(
					'(prefers-reduced-motion: reduce)'
				).matches;


			const delay =
				reducedMotion
					? 80
					: 200;


			const duration =
				reducedMotion
					? 280
					: 1750;


			const startTime =
				performance.now() +
				delay;


			/* --------------------------------
				MAIN EASING
			-------------------------------- */

			function easeInOutCubic(t) {
				return t < 0.5
					? 4 *
					  t *
					  t *
					  t
					: 1 -
					  Math.pow(
						  -2 * t + 2,
						  3
					  ) /
						  2;
			}


			/* --------------------------------
				ANIMATION
			-------------------------------- */

			function animate(time) {
				if (disposed) return;

				uniforms.uTime.value =
					time *
					0.001;


				const elapsed =
					time -
					startTime;


				const rawProgress =
					Math.min(
						Math.max(
							elapsed /
								duration,
							0
						),

						1
					);


				uniforms.uProgress.value =
					easeInOutCubic(
						rawProgress
					);


				renderer.render(
					scene,
					camera
				);


				if (
					rawProgress <
					1
				) {
					frame =
						requestAnimationFrame(
							animate
						);
				} else {
					/*
						Allow the fully transparent
						frame to actually paint.
					*/
					frame =
						requestAnimationFrame(
							() => {
								if (!disposed) {
									visible = false;
								}
							}
						);
				}
			}


			/* --------------------------------
				RESIZE
			-------------------------------- */

			function resize() {
				const ratio =
					Math.min(
						window.devicePixelRatio ||
							1,
						2
					);


				renderer.setPixelRatio(
					ratio
				);


				renderer.setSize(
					window.innerWidth,
					window.innerHeight,
					false
				);


				renderer.getDrawingBufferSize(
					uniforms.uResolution.value
				);


				/*
					Keep the apparent mosaic size
					roughly consistent on retina
					and non-retina displays.
				*/
				uniforms.uBaseCell.value =
					58 *
					ratio;
			}


			window.addEventListener(
				'resize',
				resize
			);


			removeResize = () => {
				window.removeEventListener(
					'resize',
					resize
				);
			};


			frame =
				requestAnimationFrame(
					animate
				);
		}


		init();


		return () => {
			disposed = true;

			cancelAnimationFrame(
				frame
			);

			removeResize();

			geometry?.dispose();
			material?.dispose();
			renderer?.dispose();
		};
	});
</script>


{#if visible}
	<div
		class="shader-shell"
		class:ready
		aria-hidden="true"
	>
		<canvas
			bind:this={canvas}
			class="shader-loader"
		></canvas>
	</div>
{/if}


<style>
	.shader-shell {
		position: fixed;
		inset: 0;

		width: 100vw;
		height: 100dvh;

		z-index: 99999;

		pointer-events: none;
		overflow: hidden;

		/*
			Only used during the fraction of
			a second before WebGL draws.
		*/
		background: #050505;
	}


	/*
		Once the first shader frame exists,
		the wrapper MUST become transparent.

		Otherwise every opened rectangle
		would simply expose a black layer.
	*/
	.shader-shell.ready {
		background: transparent;
	}


	.shader-loader {
		display: block;

		width: 100%;
		height: 100%;

		background: transparent;

		pointer-events: none;
	}
</style>