<script>
	import { onMount } from 'svelte';
	import { filmInitial, filmFinal, signature, heart } from './titlePaths.js';

	const id = $props.id();
	let { oncomplete = () => {} } = $props();
	let heading;
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
	<div class="title-stage">
	<svg bind:this={artwork} viewBox="36 80 148 59" aria-hidden="true">
		<defs>
			<linearGradient id={`${id}-film-gradient`} gradientUnits="userSpaceOnUse" x1="0" y1="82.84299" x2="0" y2="133.82156">
				<stop class="film-color" offset="0%" />
				<stop offset="100%" stop-color="#000000" />
			</linearGradient>
			<linearGradient id={`${id}-signature-gradient`} gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="134">
				<stop class="signature-color" offset="0%" />
				<stop offset="100%" stop-color="#000000" />
			</linearGradient>
			<clipPath id={`${id}-ground`}><rect x="36" y="80" width="148" height="53.822" /></clipPath>
		</defs>
		<!-- Center FILM's bounds (55.661434–149.06777, 82.84299–133.82156) in the viewBox. -->
		<g transform="translate(7.635398 1.167725)">
			<g clip-path={`url(#${id}-ground)`}>
				<g bind:this={lettering}><path bind:this={letters} class="film" fill={`url(#${id}-film-gradient)`} d={filmFinal} /></g>
			</g>
		</g>
		<!-- Match the menu's background-coloured backing at 2.8 times the ink width. -->
		<g class="signature backing">
			<path bind:this={handwritingBacking} d={signature} stroke-width="2.5" />
			<path bind:this={heartBacking} d={heart} stroke-width="3.018848" />
		</g>
		<g class="signature" style:stroke=var(--heart)>
			<path bind:this={handwriting} d={signature} />
			<path bind:this={heartStroke} d={heart} stroke-width="1.07816" />
		</g>
	</svg>
	</div>
</h1>

<style>
	h1 { --title-gap:clamp(12px, 2.5svh, 28px); position:relative; width:100%; min-width:0; min-height:0; margin:0; line-height:0; pointer-events:none; }
	/* Center on the screen, while the grid row reserves room for the totals below. */
	.title-stage { position:absolute; inset-inline:clamp(12px, 3vw, 56px); top:50svh; height:clamp(0px, calc(200% - 100svh - var(--title-gap) - var(--title-gap)), 64svh); transform:translateY(-50%); }
	svg { display:block; width:100%; height:100%; overflow:visible; }
	.film-color { stop-color:var(--filll, var(--fill)); }
	.signature-color { stop-color:var(--heart); }
	.signature { fill:none; stroke:var(--heart); stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
	.backing { stroke:var(--bg); }
</style>
