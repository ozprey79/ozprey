<script>
	import "./layout.css";

	import { onMount, setContext } from "svelte";
	import { afterNavigate, onNavigate } from "$app/navigation";

	import Menu from "$lib/navigation/Menu.svelte";
	import HandwrittenMenu from "$lib/navigation/HandwrittenMenu.svelte";
	import PageTransition from "$lib/navigation/PageTransition.svelte";
	import { smoothScroll } from "$lib/navigation/smoothScroll.js";
	import favicon from "$lib/assets/icons/favicon.svg";
	import { cat, swan } from "$lib/assets/icons/paths.js";
	import catSound from "$lib/navigation/assets/cat.mp3";

	let { children } = $props();

	// APEX belongs to the initial entry; STRINGS handles subsequent navigation.
	// Layout context survives route changes and stays isolated per SSR request.
	const entrance = { entered: false };
	setContext('apex-entrance', entrance);
	onNavigate(() => { entrance.entered = true; });

	// Flip this back to restore the original slat menu.
	const useHandwrittenMenu = true;
	let status = $state(false);
	let menuClass = $derived(status ? "mopen" : "mclose");
	let scrolled = $state(false);
	let hideCat = $derived(scrolled && !status);
	let catButton;

	let gsap;
	let audio;
	let scrolling;
	onMount(() => {
		scrolling = smoothScroll({ paused: () => status });
		return () => scrolling.destroy();
	});
	onNavigate(() => scrolling?.stop());
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
		scrolling?.stop();
		status = open;
		navigator.vibrate?.([60, 120, 40, 300]);
		playCatSound();

		if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		gsap.to("#caty", {
			morphSVG: cat[status ? 1 : 0],
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

	function updateScroll() {
		scrolled = window.scrollY > 24;
	}

	afterNavigate(() => {
		scrolling?.stop();
		updateScroll();
		if (useHandwrittenMenu) closeMenu();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onscroll={updateScroll} onkeydown={(event) => {
	if (event.key !== 'Escape' || !status) return;
	closeMenu();
	if (!scrolled) catButton?.focus({ preventScroll: true });
}} />

<!-- Keep the site controls above the full-screen overlay. -->
<button
	class="swanmenu"
	class:scroll-hidden={scrolled}
	inert={scrolled}
	aria-label={status ? "Close menu" : "Open menu"}
	aria-expanded={status}
	aria-controls="portfolio-menu"
>
	<!-- <a href="/" aria-label="Blog">
		<svg viewBox="0 0 30 30" aria-hidden="true">
			<g transform="translate(0 3)">
				<path id="swan" d={swan} />
			</g>
		</svg></a
	> -->
</button>
<button
	class="catmenu"
	class:scroll-hidden={hideCat}
	inert={hideCat}
	bind:this={catButton}
	onclick={toggleActiveMenu}
	aria-label={status ? "Close menu" : "Open menu"}
	aria-expanded={status}
	aria-controls="portfolio-menu"
>
	<svg viewBox="0 0 30 30" aria-hidden="true">
		<g transform="translate(0 3)">
			<path id="caty" d={cat[0]} />
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
