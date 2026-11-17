<script>
	import { onMount } from 'svelte';
	import { filmInitial, filmFinal, signature, heart } from './titlePaths.js';

	const id = $props.id();
	let { oncomplete = () => {} } = $props();
	let presenting = $state(true);
	let heading;
	let stage;
	let artwork;
	let letters;
	let lettering;
	let handwriting;
	let heartStroke;
	let handwritingBacking;
	let heartBacking;

	onMount(() => {
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let disposed = false;
		let context;
		let timeline;

		function showFinal() {
			timeline?.progress(1).pause();
			presenting = false;
			artwork.style.visibility = '';
			oncomplete();
		}
		function updateMotion() {
			if (motion.matches) showFinal();
		}
		motion.addEventListener('change', updateMotion);

		async function animate() {
			if (motion.matches) { showFinal(); return; }
			artwork.style.visibility = 'hidden';
			try {
				const [{ gsap }, { MorphSVGPlugin }, { DrawSVGPlugin }] = await Promise.all([
					import('gsap'), import('gsap/MorphSVGPlugin'), import('gsap/DrawSVGPlugin')
				]);
				if (disposed) return;
				if (motion.matches) { showFinal(); return; }
				gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin);
				context = gsap.context(() => {
					gsap.set(letters, { attr: { d: filmInitial } });
					gsap.set(lettering, { y: 54 });
					gsap.set([handwritingBacking, heartBacking, handwriting, heartStroke], { drawSVG: '0%' });
					artwork.style.visibility = '';
					timeline = gsap.timeline({ delay: 0.15, onComplete: oncomplete })
						.to(lettering, { y: 0, duration: 1.15, ease: 'power2.inOut' })
						.to(letters, { morphSVG: { shape: filmFinal, shapeIndex: 0 }, duration: 1.1, ease: 'power2.inOut' })
						.to(stage, {
							left: () => heading.getBoundingClientRect().left,
							top: () => heading.getBoundingClientRect().top,
							width: () => heading.getBoundingClientRect().width,
							height: () => heading.getBoundingClientRect().height,
							padding: 0, duration: 1, ease: 'power2.inOut',
							onComplete: () => {
								presenting = false;
								gsap.set(stage, { clearProps: 'all' });
							}
						})
						.to([handwritingBacking, handwriting], { drawSVG: '100%', duration: 1.8, ease: 'none' }, '+=0.12')
						.to([heartBacking, heartStroke], { drawSVG: '100%', duration: 0.28, ease: 'none' });
				}, heading);
			} catch (error) {
				context?.revert();
				showFinal();
				console.warn('Film title animation could not load', error);
			}
		}
		animate();
		return () => {
			disposed = true;
			motion.removeEventListener('change', updateMotion);
			context?.revert();
		};
	});
</script>

<h1 bind:this={heading} aria-label="Film archive">
	<div bind:this={stage} class="stage" class:presenting>
	<svg bind:this={artwork} viewBox="36 80 148 59" aria-hidden="true">
		<defs>
			<clipPath id={`${id}-ground`}><rect x="36" y="80" width="148" height="53.822" /></clipPath>
		</defs>
		<g clip-path={`url(#${id}-ground)`}>
			<g bind:this={lettering}><path bind:this={letters} class="film" d={filmFinal} /></g>
		</g>
		<!-- Match the menu's background-coloured backing at 2.8 times the ink width. -->
		<g class="signature backing">
			<path bind:this={handwritingBacking} d={signature} stroke-width="7" />
			<path bind:this={heartBacking} d={heart} stroke-width="3.018848" />
		</g>
		<g class="signature">
			<path bind:this={handwriting} d={signature} />
			<path bind:this={heartStroke} d={heart} stroke-width="1.07816" />
		</g>
	</svg>
	</div>
</h1>

<style>
	h1 { width:min(100%, 620px); aspect-ratio:148 / 59; margin:0 auto clamp(32px, 5vw, 64px); line-height:0; }
	.stage { width:100%; height:100%; }
	.stage.presenting { position:fixed; z-index:20; left:0; top:0; width:100vw; height:100dvh; box-sizing:border-box; padding:32px; pointer-events:none; }
	.presenting svg { width:100%; height:100%; }
	svg { display:block; width:100%; height:auto; overflow:visible; }
	.film { fill:var(--filll, var(--fill)); }
	.signature { fill:none; stroke:var(--heart); stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
	.backing { stroke:var(--bg); }
</style>
