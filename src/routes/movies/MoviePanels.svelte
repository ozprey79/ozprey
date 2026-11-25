<script>
	import { onMount } from 'svelte';
	import Lenis from 'lenis';
	import Snap from 'lenis/snap';
	import 'lenis/dist/lenis.css';
	import { panelDrift, elasticSnap } from './panelMotion.js';

	let { children, ready = false } = $props();
	const labels = ['Title', 'Disc & abacus', 'Decades & directors', 'World map', 'The list'];
	let viewport;
	let track;
	let active = $state(0);
	let landscape = $state(false);
	let navigate = () => {};

	onMount(() => {
		const orientation = window.matchMedia('(orientation: landscape)');
		let lenis;
		let snap;
		let removeSnaps = [];
		const panels = () => [...viewport.querySelectorAll('.movie-panel')];
		const menu = document.querySelector('.handwritten-menu, #portfolio-menu');
		const menuOpen = () => menu && (menu.classList.contains('handwritten-menu') ? !menu.inert : menu.classList.contains('mopen'));
		function render() {
			if (!landscape || !viewport.clientWidth) return;
			const width = viewport.clientWidth;
			const scroll = viewport.scrollLeft;
			panels().forEach((panel, index) => {
				panel.style.setProperty('--panel-drift', `${panelDrift(scroll, index, width)}px`);
				panel.style.setProperty('--panel-order', index);
			});
			active = Math.max(0, Math.min(labels.length - 1, Math.round(scroll / width)));
		}
		function virtualScroll(data) {
			const { event } = data;
			if (!ready || menuOpen() || event.defaultPrevented || event.ctrlKey || event.metaKey) return false;
			const vertical = Math.abs(data.deltaY) >= Math.abs(data.deltaX);
			const delta = vertical ? data.deltaY : data.deltaX;
			// Keep menus native and leave touch rotation/dragging to the artwork.
			for (const element of event.composedPath()) {
				if (element === viewport) break;
				if (!(element instanceof Element)) continue;
				if (element.matches('select, textarea, [contenteditable="true"]')) return false;
				if (event.type.startsWith('touch') && element.matches('[role="slider"], .fish-button')) return false;
				const axis = vertical ? 'Y' : 'X';
				const style = getComputedStyle(element);
				const position = vertical ? element.scrollTop : element.scrollLeft;
				const extent = vertical ? element.scrollHeight - element.clientHeight : element.scrollWidth - element.clientWidth;
				if (/(auto|scroll)/.test(style[`overflow${axis}`]) && extent > 1 &&
					((delta > 0 && position < extent - 1) || (delta < 0 && position > 1))) {
					return false;
				}
			}
			// Normalize vertical wheels and horizontal swipes for Lenis and its snap plugin.
			data.deltaX = delta;
			data.deltaY = 0;
			return true;
		}
		function destroyScroll() {
			snap?.stop();
			snap?.destroy();
			removeSnaps.forEach(remove => remove());
			removeSnaps = [];
			lenis?.destroy();
			snap = lenis = undefined;
		}
		function resized() {
			const selected = active;
			landscape = orientation.matches;
			if (!landscape) {
				destroyScroll();
				panels().forEach(panel => {
					panel.style.removeProperty('--panel-drift');
					panel.style.removeProperty('--panel-order');
				});
				viewport.scrollLeft = 0;
				active = 0;
				return;
			}
			if (!lenis) {
				lenis = new Lenis({
					wrapper: viewport, content: track, orientation: 'horizontal', gestureOrientation: 'both',
					autoRaf: true, lerp: 0.085, smoothWheel: true, syncTouch: true,
					overscroll: false, virtualScroll
				});
				lenis.on('scroll', render);
				snap = new Snap(lenis, { type: 'mandatory', debounce: 1000, duration: 0.9, lerp: 0, easing: elasticSnap });
			}
			lenis.resize();
			removeSnaps.forEach(remove => remove());
			removeSnaps = panels().map((_, index) => snap.add(index * viewport.clientWidth));
			lenis.scrollTo(selected * viewport.clientWidth, { immediate: true, force: true });
			render();
			updateMenu();
		}
		navigate = index => snap?.goTo(Math.max(0, Math.min(labels.length - 1, index)));
		function updateMenu() {
			if (menuOpen()) { snap?.stop(); lenis?.stop(); }
			else { lenis?.start(); snap?.start(); }
		}
		function keydown(event) {
			if (!landscape || !ready || menuOpen() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
				event.target.closest('input, select, textarea, button, a, summary, [contenteditable="true"], [role="button"], [role="slider"]')) return;
			const direction = { ArrowRight: 1, ArrowLeft: -1, PageDown: 1, PageUp: -1 }[event.key];
			if (direction) {
				event.preventDefault();
				navigate(Math.max(0, Math.min(labels.length - 1, active + direction)));
			} else if (event.key === 'Home' || event.key === 'End') {
				event.preventDefault();
				navigate(event.key === 'Home' ? 0 : labels.length - 1);
			}
		}
		function focusPanel(event) {
			if (!landscape) return;
			const index = panels().indexOf(event.target.closest('.movie-panel'));
			if (index >= 0) lenis?.scrollTo(index * viewport.clientWidth, { immediate: true });
		}
		const resize = new ResizeObserver(resized);
		resize.observe(viewport);
		const content = new MutationObserver(resized);
		content.observe(track, { childList: true });
		const menuObserver = new MutationObserver(updateMenu);
		if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ['inert', 'class'] });
		viewport.addEventListener('scroll', render, { passive: true });
		viewport.addEventListener('focusin', focusPanel);
		window.addEventListener('keydown', keydown);
		orientation.addEventListener('change', resized);
		resized();
		return () => {
			destroyScroll();
			resize.disconnect();
			content.disconnect();
			menuObserver.disconnect();
			viewport.removeEventListener('scroll', render);
			viewport.removeEventListener('focusin', focusPanel);
			window.removeEventListener('keydown', keydown);
			orientation.removeEventListener('change', resized);
		};
	});
</script>

<div class="film-browser">
	<div class="panel-viewport" bind:this={viewport} data-native-scroll={landscape ? '' : undefined} role="region" aria-label="Scrollable film panels" tabindex={landscape ? 0 : undefined}>
		<div class="panel-track" bind:this={track}>{@render children()}</div>
	</div>
	<nav class="panel-navigation" aria-label="Film panels">
		{#each labels as label, index}
			<button aria-label={label} aria-current={active === index ? 'step' : undefined} disabled={!ready && index > 0} onclick={() => navigate(index)}><span class="panel-dot" aria-hidden="true"></span></button>
		{/each}
	</nav>
</div>

<style>
	.film-browser, .panel-viewport, .panel-track { display:contents; }
	.panel-navigation { display:none; }
	@media (orientation:landscape) {
		.film-browser { display:grid; grid-template-rows:minmax(0,1fr) auto; height:100svh; }
		.panel-viewport { display:block; min-height:0; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; }
		.panel-viewport::-webkit-scrollbar { display:none; }
		.panel-viewport:focus-visible { outline:2px solid var(--heart); outline-offset:-2px; }
		.panel-track { display:flex; height:100%; isolation:isolate; }
		.panel-track > :global(.movie-panel) {
			flex:0 0 100%; width:100%; height:100%; min-width:0; min-height:0; margin:0;
			padding:max(76px,10svh) max(24px,calc((100vw - 1400px)/2)) 24px;
			overflow:clip;
			position:relative; z-index:var(--panel-order,0);
			transform:translate3d(var(--panel-drift,0px),0,0);
			background-color:var(--bg);
			background-image:radial-gradient(var(--bgdot) .9px,var(--bg) .1px);
			background-size:17px 17px;
			box-shadow:-20px 0 40px #0002;
		}
		.panel-track > :global(.film-intro) { padding-block:0; overflow:hidden; }
		.panel-navigation { display:flex; align-items:center; justify-content:center; justify-self:center; gap:4px; padding:0 6px; }
		button { display:grid; place-items:center; width:28px; height:28px; min-height:28px; padding:0; margin:0; background:transparent; color:var(--fill); border:0; border-radius:50%; cursor:pointer; opacity:.45; }
		.panel-dot { display:block; width:6px; height:6px; border-radius:50%; background:currentColor; }
		button[aria-current="step"] { color:var(--heart); opacity:1; }
		button[aria-current="step"] .panel-dot { transform:scale(1.25); }
		button:hover, button:focus-visible { opacity:1; }
		button:focus-visible { outline:2px solid var(--heart); outline-offset:-3px; }
		button:disabled { cursor:default; opacity:.25; }
	}
	@media (orientation:landscape) and (max-height:500px) {
		.panel-track > :global(.movie-panel:not(.film-intro)) { padding-block:56px 12px; }
	}
</style>
