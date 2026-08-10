<script>
	let { onclose } = $props();
</script>

<nav class="menu" aria-label="Main navigation">
	<a
		class="pagebutton"
		href="/"
		onclick={onclose}
	>
		Home
	</a>

	<a
		class="pagebutton"
		href="/blog"
		onclick={onclose}
	>
		Blog
	</a>

	<button
		type="button"
		class="pagebutton"
		onclick={onclose}
	>
		Close
	</button>
</nav>

<style>
	.menu {
		width: 100vw;
		height: 100%;

		display: flex;
		align-items: center;
		justify-content: space-evenly;

		background: var(--fill);
		/* background-color: brown; */
		
		border-bottom-left-radius: 40px;
		border-bottom-right-radius: 40px;
	}

	.pagebutton {
		position: relative;

		display: inline-block;

		padding: 0.35em;

		font-family: var(--mfont);
		font-size: clamp(24px, 4vw, 52px);
		line-height: 1;

		color: var(--bg);
	

		border: 0;

		text-decoration: none;

		cursor: pointer;

		transition:
			transform 180ms ease,
			-webkit-text-stroke 180ms ease;

				background: transparent;

	}

	.pagebutton:hover {
		transform: scale(1.15);

		-webkit-text-stroke: 0.5px var(--bg);
		-webkit-text-fill-color: transparent;
	}

	.pagebutton:focus-visible {
		outline: 2px solid var(--bg);
		outline-offset: 6px;
	}

	@media (orientation: portrait) {
		.menu {
			flex-direction: column;
		}
	}
</style>