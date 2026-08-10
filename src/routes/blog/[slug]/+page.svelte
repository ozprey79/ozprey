<script>
	let { data } = $props();

	const post = data.post;
</script>


<svelte:head>
	<title>{post.title} — Ozprey</title>
	<meta
		name="description"
		content={post.excerpt}
	/>
</svelte:head>


<article class="essay">
	<header class="essay-header">
		<div class="essay-nav">
			<a href="/blog">
				← Journal
			</a>

			<div class="meta">
				<span>{post.category}</span>
				<span>{post.date}</span>
				<span>{post.readTime}</span>
			</div>
		</div>


		<div class="number">
			{post.number}
		</div>


		<h1>{post.title}</h1>


		<p class="dek">
			{post.excerpt}
		</p>


		<div class="header-rule">
			<span></span>
			<span>Essay / {post.number}</span>
		</div>
	</header>


	<div class="essay-body">
		<aside class="margin">
			<div class="margin-inner">
				<span>OZPREY</span>
				<span>WRITING / {post.number}</span>
			</div>
		</aside>


		<div class="content">
			{#each post.content as block}
				{#if block.type === 'lead'}
					<p class="lead">
						{block.text}
					</p>

				{:else if block.type === 'heading'}
					<h2>
						{block.text}
					</h2>

				{:else if block.type === 'quote'}
					<blockquote>
						{block.text}
					</blockquote>

				{:else}
					<p>
						{block.text}
					</p>
				{/if}
			{/each}
		</div>
	</div>


	<footer class="essay-footer">
		<div>
			<span>End / {post.number}</span>
		</div>

		<a href="/blog">
			All essays
			<span>↗</span>
		</a>
	</footer>
</article>


<style>
	.essay {
		width:
			min(1500px, calc(100% - 40px));

		margin-inline: auto;

		padding:
			clamp(110px, 13vw, 180px)
			0
			70px;

		color: var(--fill);
	}


	/* -------------------------
		HEADER
	------------------------- */

	.essay-header {
		position: relative;

		min-height: 76dvh;

		display: flex;
		flex-direction: column;
	}


	.essay-nav {
		display: flex;

		justify-content: space-between;
		align-items: center;

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 10px;

		text-transform: uppercase;
		letter-spacing: 0.12em;
	}


	.essay-nav a {
		color: var(--fill);

		text-decoration: none;
	}


	.meta {
		display: flex;
		gap:
			clamp(12px, 3vw, 40px);
	}


	.number {
		position: absolute;

		top: 20%;
		right: 0;

		font-family: var(--mfont);

		font-size:
			clamp(100px, 25vw, 400px);

		line-height: 0.6;

		color: transparent;

		-webkit-text-stroke:
			1px rgba(255, 192, 236, .32);

		pointer-events: none;
	}


	.essay-header h1 {
		position: relative;

		z-index: 1;

		max-width: 1200px;

		margin-top: auto;

		font-family: var(--mfont);

		font-size:
			clamp(72px, 13vw, 210px);

		font-weight: 400;

		line-height: 0.78;

		letter-spacing: -0.025em;

		text-transform: uppercase;
	}


	.dek {
		position: relative;
		z-index: 1;

		width:
			min(620px, 80%);

		margin:
			clamp(35px, 5vw, 65px)
			0
			50px
			auto;

		font-family: 'Gambarino';

		font-size:
			clamp(20px, 2.3vw, 32px);

		line-height: 1.25;
	}


	.header-rule {
		display: grid;

		grid-template-columns:
			1fr auto;

		align-items: center;

		gap: 20px;

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 9px;

		letter-spacing: .15em;
	}


	.header-rule > span:first-child {
		height: 1px;

		background: var(--fill);
	}


	/* -------------------------
		ESSAY
	------------------------- */

	.essay-body {
		display: grid;

		grid-template-columns:
			minmax(100px, 1fr)
			minmax(0, 700px)
			1fr;

		padding:
			clamp(90px, 12vw, 180px)
			0;
	}


	.margin {
		grid-column: 1;
	}


	.margin-inner {
		position: sticky;

		top: 40px;

		display: flex;
		flex-direction: column;

		gap: 7px;

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 8px;

		letter-spacing: .16em;

		writing-mode:
			vertical-rl;

		transform:
			rotate(180deg);

		opacity: .65;
	}


	.content {
		grid-column: 2;

		font-family: 'Gambarino';

		font-size:
			clamp(20px, 1.6vw, 25px);

		line-height: 1.55;
	}


	.content p {
		margin-bottom: 1.5em;
	}


	.content .lead {
		margin-bottom: 2em;

		font-size:
			clamp(28px, 3.3vw, 48px);

		line-height: 1.15;
	}


	.content .lead::first-letter {
		float: left;

		margin:
			0.04em
			0.12em
			0
			0;

		font-family: var(--mfont);

		font-size: 4.3em;

		line-height: .69;
	}


	.content h2 {
		margin:
			2.2em
			0
			.65em;

		font-family: var(--mfont);

		font-size:
			clamp(52px, 7vw, 100px);

		font-weight: 400;

		line-height: .85;

		text-transform: uppercase;
	}


	blockquote {
		position: relative;

		width: min(900px, 90vw);

		margin:
			2.2em
			0
			2.2em
			clamp(-160px, -10vw, -70px);

		padding:
			.25em
			0;

		font-family: var(--mfont);

		font-size:
			clamp(50px, 8vw, 120px);

		line-height: .85;

		text-transform: uppercase;

		color: transparent;

		-webkit-text-stroke:
			1px var(--fill);
	}


	/* -------------------------
		FOOTER
	------------------------- */

	.essay-footer {
		display: flex;
		justify-content: space-between;

		padding-top: 35px;

		border-top:
			1px solid var(--fill);

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 10px;

		text-transform: uppercase;
		letter-spacing: .12em;
	}


	.essay-footer a {
		display: flex;
		gap: 15px;

		color: var(--fill);

		text-decoration: none;
	}


	/* -------------------------
		MOBILE
	------------------------- */

	@media (max-width: 700px) {
		.essay {
			width:
				calc(100% - 28px);

			padding-top: 110px;
		}


		.essay-header {
			min-height: 70dvh;
		}


		.meta span:nth-child(2) {
			display: none;
		}


		.number {
			top: 28%;
		}


		.essay-header h1 {
			font-size:
				clamp(70px, 22vw, 130px);
		}


		.dek {
			width: 100%;
		}


		.essay-body {
			display: block;

			padding: 90px 0;
		}


		.margin {
			display: none;
		}


		.content {
			font-size: 19px;
		}


		blockquote {
			width: 100%;

			margin:
				2em 0;

			font-size:
				clamp(45px, 15vw, 85px);
		}
	}
</style>