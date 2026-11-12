<script>
	import MenuHeadline from '$lib/navigation/headline/MenuHeadline.svelte';
	let { onclose, open = false } = $props();
	const slatCount = 8;
	let revealed = $state(false);

	// Reduced motion skips the slat transition, so reveal the links immediately.
	$effect(() => {
		if (!open) {
			revealed = false;
			return;
		}
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		const revealWithoutMotion = () => { if (reduced.matches) revealed = true; };
		revealWithoutMotion();
		reduced.addEventListener('change', revealWithoutMotion);
		return () => reduced.removeEventListener('change', revealWithoutMotion);
	});

	// Start the headline once the last slat has unfolded.
	function slatFinished(event, index) {
		if (open && index === slatCount - 1 && event.propertyName === 'transform') revealed = true;
	}
</script>

<nav class="menu" class:open aria-label="Main navigation">
	<div class="blind" aria-hidden="true" style:--slat-count={slatCount}>
		{#each Array(slatCount) as _, index}
			<div class="slat" style={`--slat-index: ${index}`} ontransitionend={(event) => slatFinished(event, index)}></div>
		{/each}
	</div>
	{#if open && revealed}
		<MenuHeadline {onclose} />
	{/if}
</nav>

<style>
	.menu {
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100%;

	}

	.blind {
		position: absolute;
		inset: 0;
		z-index: -1;
		display: grid;
		grid-template-rows: repeat(var(--slat-count), 1fr);
		pointer-events: none;
		perspective: 1000px;
	}

	/* Close from bottom to top and open from top to bottom. */
	.slat {
		margin-bottom: -1px;
		background: var(--fill);
		transform-origin: center;
		transform: rotateX(-90deg);
		opacity: 0;
		transition: transform 480ms cubic-bezier(.22, 1, .36, 1), opacity 200ms ease;
		transition-delay: calc((var(--slat-count) - 1 - var(--slat-index)) * 35ms);
	}

	.open .slat {
		transform: rotateX(0deg);
		opacity: 1;
		transition-delay: calc(var(--slat-index) * 45ms);
	}

	@media (prefers-reduced-motion: reduce) {
		.slat, .open .slat { transition: none; }
	}
</style>
