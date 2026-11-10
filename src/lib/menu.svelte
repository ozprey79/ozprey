<script>
	import MenuHeadline from '$lib/components/menu-headline/MenuHeadline.svelte';
	let { onclose, open = false } = $props();
	let revealed = $state(false);

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

	function slatFinished(event, index) {
		if (open && index === 7 && event.propertyName === 'transform') revealed = true;
	}
</script>

<nav class="menu" class:open aria-label="Main navigation">
	<div class="blind" aria-hidden="true">
		{#each Array(8) as _, index}
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

		display: flex;
		align-items: center;
		justify-content: space-evenly;

	}

	.blind {
		position: absolute;
		inset: 0;
		z-index: -1;
		display: grid;
		grid-template-rows: repeat(8, 1fr);
		pointer-events: none;
		perspective: 1000px;
	}

	.slat {
		margin-bottom: -1px;
		background: var(--fill);
		transform-origin: center;
		transform: rotateX(-90deg);
		opacity: 0;
		transition: transform 480ms cubic-bezier(.22, 1, .36, 1), opacity 200ms ease;
		transition-delay: calc((7 - var(--slat-index)) * 35ms);
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
