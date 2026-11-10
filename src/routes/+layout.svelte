<script>
	import "./layout.css";

	import { onMount } from "svelte";
	import ShaderLoader from "$lib/ShaderLoader.svelte";

	import Menu from "$lib/menu.svelte";
	import favicon from "$lib/assets/favicon.svg";
	import { cat, swan } from "$lib/svgpaths";
	import catSound from "$lib/assets/caty.mp3";

	let { children } = $props();

	let status = $state(false);
	let menuClass = $derived(status ? "mopen" : "mclose");

	let gsap;
	let audio;

	onMount(() => {
		audio = new Audio(catSound);
		audio.preload = "auto";
		audio.volume = 0.7;

		return () => {
			audio?.pause();
			audio = null;
		};
	});

	function playCatSound() {
		if (!audio) return;

		audio.currentTime = 0;

		audio.play().catch((error) => {
			console.warn("Audio could not play:", error);
		});
	}

	onMount(async () => {
		const [
			{ gsap: gsapCore },
			{ MorphSVGPlugin },
		] = await Promise.all([
			import("gsap"),
			import("gsap/MorphSVGPlugin"),
		]);

		gsap = gsapCore;
		gsap.registerPlugin(MorphSVGPlugin);
	});

	function toggleMenu() {
		status = !status;

		navigator.vibrate?.([60, 120, 40, 300]);
		playCatSound();

		/*
			GSAP may still be loading during the very first moment
			the page opens, so don't animate until it is ready.
		*/
		if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		if (status) {
			gsap.to("#caty", {
				morphSVG: cat[2],
				duration: 0.5,
				delay: 0.1,
				ease: "power4.out",
			});
		} else {
			gsap.to("#caty", {
				morphSVG: cat[1],
				duration: 0.5,
				delay: 0.1,
				ease: "power4.out",
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

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') closeMenu(); }} />

<!-- <ShaderLoader /> -->

<button
	class="swanmenu"
	aria-label={status ? "Close menu" : "Open menu"}
	aria-expanded={status}
	aria-controls="portfolio-menu"
>
	<a href="/" aria-label="Blog">
		<svg viewBox="0 0 30 30" aria-hidden="true">
			<g transform="translate(0 3)">
				<path id="swan" d={swan} />
			</g>
		</svg></a
	>
</button>
<button
	class="catmenu"
	onclick={toggleMenu}
	aria-label={status ? "Close menu" : "Open menu"}
	aria-expanded={status}
	aria-controls="portfolio-menu"
>
	<svg viewBox="0 0 30 30" aria-hidden="true">
		<g transform="translate(0 3)">
			<path id="caty" d={cat[1]} />
		</g>
	</svg>
</button>

<div id="portfolio-menu" class={menuClass} inert={!status}>
	<Menu onclose={closeMenu} open={status} />
</div>

{@render children()}
