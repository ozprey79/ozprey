<script>
	import "./layout.css";

	import { onMount } from "svelte";
	import { afterNavigate } from "$app/navigation";

	import Menu from "$lib/navigation/Menu.svelte";
	import HandwrittenMenu from "$lib/navigation/HandwrittenMenu.svelte";
	import PageTransition from "$lib/navigation/PageTransition.svelte";
	import favicon from "$lib/assets/icons/favicon.svg";
	import { cat, swan } from "$lib/assets/icons/paths.js";
	import catSound from "$lib/navigation/assets/cat.mp3";

	let { children } = $props();

	// Flip this back to restore the original slat menu.
	const useHandwrittenMenu = true;
	let status = $state(false);
	let menuClass = $derived(status ? "mopen" : "mclose");
	let catButton;

	let gsap;
	let audio;
	// Prepare the menu sound once per layout.
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

	// Load the cat morph independently of the menu controls.
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

	// Original slat menu handler.
	function toggleMenu() {
		setMenuOpen(!status);
	}

	function setMenuOpen(open) {
		status = open;
		navigator.vibrate?.([60, 120, 40, 300]);
		playCatSound();

		if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		gsap.to("#caty", {
			morphSVG: cat[status ? 2 : 1],
			overwrite: true,
			duration: 0.5,
			delay: 0.1,
			ease: "power4.out",
		});
	}

	const toggleActiveMenu = useHandwrittenMenu ? () => setMenuOpen(!status) : toggleMenu;

	function closeMenu() {
		if (status) toggleActiveMenu();
	}

	afterNavigate(() => {
		if (useHandwrittenMenu) closeMenu();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onkeydown={(event) => {
	if (event.key !== 'Escape' || !status) return;
	closeMenu();
	catButton?.focus();
}} />

<!-- Keep the site controls above the full-screen overlay. -->
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
	bind:this={catButton}
	onclick={toggleActiveMenu}
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

{#if useHandwrittenMenu}
	<HandwrittenMenu open={status} />
{:else}
	<div id="portfolio-menu" class={menuClass} inert={!status}>
		<Menu onclose={closeMenu} open={status} />
	</div>
{/if}

{@render children()}

<PageTransition />
