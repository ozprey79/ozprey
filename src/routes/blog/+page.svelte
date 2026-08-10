<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Blog — Ozprey</title>

	<meta
		name="description"
		content="Writing on design, technology, typography and visual culture."
	/>
</svelte:head>


<main class="blog">
	<header class="blog-header">
		<div class="eyebrow">
			<span>Archive / Writing</span>
			<span>{data.posts.length.toString().padStart(2, '0')} entries</span>
		</div>

		<h1>
			<span>Journal</span>
			<span class="outline">of things</span>
		</h1>

		<p class="intro">
			Notes on design, engineering, type,
			images and whatever survives long
			enough to become a thought.
		</p>
	</header>


	<section class="post-list" aria-label="Essays">
		{#each data.posts as post}
			<a
				class="post"
				href={`/blog/${post.slug}`}
			>
				<div class="post-number">
					{post.number}
				</div>

				<div class="post-main">
					<div class="post-meta">
						<span>{post.category}</span>
						<span>{post.date}</span>
					</div>

					<h2>{post.title}</h2>

					<p>{post.excerpt}</p>
				</div>

				<div class="post-side">
					<span>{post.readTime}</span>

					<span class="arrow">
						↗
					</span>
				</div>
			</a>
		{/each}
	</section>


	<footer class="blog-footer">
		<span>END OF CURRENT RECORDS</span>

		<span class="dot">●</span>

		<a href="/">Return home</a>
	</footer>
</main>


<style>
	.blog {
		width: min(1500px, calc(100% - 40px));

		margin-inline: auto;

		padding:
			clamp(100px, 13vw, 180px)
			0
			60px;

		color: var(--fill);
	}


	/* -------------------------
		HEADER
	------------------------- */

	.blog-header {
		min-height: 55vh;

		display: flex;
		flex-direction: column;

		justify-content: space-between;

		padding-bottom:
			clamp(50px, 8vw, 110px);
	}


	.eyebrow {
		display: flex;
		justify-content: space-between;

		margin-bottom: 40px;

		font-family:
			'PlusJakartaSans-SemiBold',
			sans-serif;

		font-size: 11px;

		letter-spacing: 0.15em;

		text-transform: uppercase;
	}


	h1 {
		display: flex;
		flex-direction: column;

		font-family: var(--mfont);

		font-size:
			clamp(80px, 16vw, 260px);

		font-weight: 400;

		line-height: 0.72;

		text-transform: uppercase;

		letter-spacing: -0.025em;
	}


	h1 .outline {
		align-self: flex-end;

		color: transparent;

		-webkit-text-stroke:
			1.5px var(--fill);
	}


	.intro {
		width:
			min(480px, 100%);

		align-self: flex-end;

		margin-top: 70px;

		font-family: 'Gambarino';
		font-size:
			clamp(18px, 2vw, 28px);

		line-height: 1.25;
	}


	/* -------------------------
		POST LIST
	------------------------- */

	.post-list {
		border-top:
			1px solid var(--fill);
	}


	.post {
		position: relative;

		display: grid;

		grid-template-columns:
			minmax(60px, 0.4fr)
			4fr
			minmax(80px, 0.7fr);

		gap:
			clamp(20px, 4vw, 70px);

		padding:
			clamp(25px, 4vw, 55px)
			0;

		border-bottom:
			1px solid var(--fill);

		color: var(--fill);

		text-decoration: none;

		overflow: hidden;

		transition:
			padding 350ms ease;
	}


	/*
		Pink fill growing behind a row.
	*/
	.post::before {
		content: '';

		position: absolute;
		inset: 0;

		z-index: -1;

		background: var(--fill);

		transform:
			scaleY(0);

		transform-origin:
			bottom;

		transition:
			transform 350ms
			cubic-bezier(.2,.8,.2,1);
	}


	.post:hover::before {
		transform:
			scaleY(1);
	}


	.post:hover {
		color: var(--bg);

		padding-left: 18px;
		padding-right: 18px;
	}


	.post-number {
		font-family: var(--mfont);

		font-size:
			clamp(30px, 4vw, 62px);

		line-height: 1;
	}


	.post-meta {
		display: flex;

		gap: 18px;

		margin-bottom: 14px;

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 10px;

		text-transform: uppercase;

		letter-spacing: 0.12em;
	}


	.post h2 {
		max-width: 900px;

		font-family: var(--mfont);

		font-size:
			clamp(42px, 7vw, 110px);

		font-weight: 400;

		line-height: 0.9;

		text-transform: uppercase;
	}


	.post-main p {
		max-width: 550px;

		margin-top: 20px;

		font-family: 'Gambarino';

		font-size:
			clamp(16px, 1.4vw, 21px);

		line-height: 1.3;
	}


	.post-side {
		display: flex;
		flex-direction: column;

		align-items: flex-end;
		justify-content: space-between;

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 11px;

		text-transform: uppercase;
	}


	.arrow {
		font-family: var(--mfont);

		font-size: 38px;

		transition:
			transform 300ms ease;
	}


	.post:hover .arrow {
		transform:
			translate(7px, -7px);
	}


	/* -------------------------
		FOOTER
	------------------------- */

	.blog-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;

		padding-top: 70px;

		font-family:
			'PlusJakartaSans-SemiBold';

		font-size: 10px;

		letter-spacing: 0.12em;
	}


	.blog-footer a {
		color: var(--fill);
	}


	.dot {
		font-size: 7px;
	}


	/* -------------------------
		MOBILE
	------------------------- */

	@media (max-width: 700px) {
		.blog {
			width:
				calc(100% - 28px);
		}


		.blog-header {
			min-height: 65dvh;
		}


		.eyebrow {
			font-size: 9px;
		}


		h1 {
			font-size:
				clamp(72px, 25vw, 150px);
		}


		.intro {
			align-self: flex-start;

			margin-top: 50px;
		}


		.post {
			grid-template-columns:
				50px 1fr;
		}


		.post-side {
			display: none;
		}


		.post h2 {
			font-size:
				clamp(40px, 15vw, 80px);
		}


		.post-main p {
			font-size: 16px;
		}


		.blog-footer {
			gap: 20px;
		}
	}
</style>v