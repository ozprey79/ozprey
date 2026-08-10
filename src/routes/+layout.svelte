<script>
	import './layout.css';

	import { onMount } from 'svelte';
    import ShaderLoader from '$lib/ShaderLoader.svelte';
	import Menu from '$lib/menu.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { cat } from '$lib/svgpaths';

	let { children } = $props();

	let status = $state(false);
	let menuClass = $derived(status ? 'mopen' : 'mclose');

	let gsap;
	let SplitText;

	onMount(async () => {
		const [
			{ gsap: gsapCore },
			{ MorphSVGPlugin },
			{ SplitText: SplitTextPlugin }
		] = await Promise.all([
			import('gsap'),
			import('gsap/MorphSVGPlugin'),
			import('gsap/SplitText')
		]);

		gsap = gsapCore;
		SplitText = SplitTextPlugin;

		gsap.registerPlugin(MorphSVGPlugin, SplitTextPlugin);
	});

	function toggleMenu() {
		status = !status;

		navigator.vibrate?.([60, 120, 40, 300]);

		/*
			GSAP may still be loading during the very first moment
			the page opens, so don't animate until it is ready.
		*/
		if (!gsap || !SplitText) return;

		if (status) {
			gsap.fromTo(
				'.pagebutton',
				{
					color: 'transparent'
				},
				{
					color: 'var(--bg)',
					backgroundColor: 'transparent',
					ease: 'linear'
				}
			);

			SplitText.create('.pagebutton', {
				type: 'lines, chars',
				mask: 'lines',
				autoSplit: true,

				onSplit(self) {
					return gsap.from(self.chars, {
						duration: 1,
						y: 100,
						autoAlpha: 0,
						stagger: 0.05,
						ease: 'circ.inOut'
					});
				}
			});

			gsap.to('#caty', {
				morphSVG: cat[2],
				duration: 0.5,
				delay: 0.1,
				ease: 'power4.out'
			});
		} else {
			gsap.to('.pagebutton', {
				delay: 0.1,
				color: 'transparent',
				backgroundColor: 'transparent'
			});

			gsap.to('#caty', {
				morphSVG: cat[1],
				duration: 0.5,
				delay: 0.1,
				ease: 'power4.out'
			});
		}
	}

	function closeMenu() {
		if (status) {
			toggleMenu();
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<ShaderLoader />
<button
	class="catmenu"
	onclick={toggleMenu}
	aria-label={status ? 'Close menu' : 'Open menu'}
	aria-expanded={status}
	aria-controls="portfolio-menu"
>
	<svg viewBox="0 0 30 30" aria-hidden="true">
		<g transform="translate(0 3)">
			<path id="caty" d={cat[1]} />
		</g>
	</svg>
</button>

<div
	id="portfolio-menu"
	class={menuClass}
>
	<Menu onclose={closeMenu} />
</div>

{@render children()}