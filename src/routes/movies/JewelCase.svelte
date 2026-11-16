<script>
    import { onMount } from "svelte";
    let { movie } = $props();
    let host;
    let controller = $state(null);
    $effect(() => {
        if (controller) controller.setMovie(movie);
    });
    let failed = $state(false);
    let opened = $state(false);
    let moved = false;
    function toggle() {
        opened = !opened;
        controller?.setOpen(opened);
    }
    function up() {
        if (dragging && !moved) toggle();
        dragging = false;
    }
    let dragging = $state(false);
    let rotationY = $state(-0.25);
    let startX = 0,
        startY = 0,
        rotationX = -0.08,
        originX = 0,
        originY = 0;
    onMount(() => {
        let disposed = false;
        import("./jewelScene.js")
            .then(async ({ createJewelScene }) => {
                if (disposed) return;
                try {
                    const next = await createJewelScene(host);
                    if (disposed) {
                        next.dispose();
                        return;
                    }
                    controller = next;
                    controller.setOpen(opened);
                } catch (error) {
                    console.error("3D case unavailable", error);
                    failed = true;
                }
            })
            .catch(() => {
                failed = true;
            });
        return () => {
            disposed = true;
            controller?.dispose();
        };
    });
    function down(e) {
        moved = false;
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        originX = rotationX;
        originY = rotationY;
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function move(e) {
        if (!dragging) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6)
            moved = true;
        rotationX = Math.max(
            -0.75,
            Math.min(0.75, originX + (e.clientY - startY) * 0.006),
        );
        rotationY = Math.max(
            -1.2,
            Math.min(1.2, originY + (e.clientX - startX) * 0.006),
        );
        controller?.rotate(rotationX, rotationY);
    }
    function reset() {
        rotationX = -0.08;
        rotationY = -0.25;
        controller?.reset();
    }
    function key(e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
            return;
        }
        if (
            ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
            ].includes(e.key)
        )
            return;
        e.preventDefault();
        if (e.key === "Home") {
            reset();
            return;
        }
        rotationY = Math.max(
            -1.2,
            Math.min(
                1.2,
                rotationY +
                    (e.key === "ArrowRight"
                        ? 0.15
                        : e.key === "ArrowLeft"
                          ? -0.15
                          : 0),
            ),
        );
        rotationX = Math.max(
            -0.75,
            Math.min(
                0.75,
                rotationX +
                    (e.key === "ArrowDown"
                        ? 0.15
                        : e.key === "ArrowUp"
                          ? -0.15
                          : 0),
            ),
        );
        controller?.rotate(rotationX, rotationY);
    }
</script>

<section class="disc-panel" aria-labelledby="disc-heading">
    <header>
        <div>
            <p class="eyebrow">FROM THE COLLECTION / {movie.id}</p>
            <h2 id="disc-heading">On disc.</h2>
        </div>
        <span class="edition">THE JEWEL CASE EDITION</span>
    </header>
    <div
        class="stage"
        class:dragging
        bind:this={host}
        role="slider"
        tabindex="0"
        aria-label={`Rotate the case for ${movie.title}`}
        aria-valuemin="-69"
        aria-valuemax="69"
        aria-valuenow={Math.round((rotationY * 180) / Math.PI)}
        aria-valuetext="Arrow keys rotate; Enter opens or closes; Home resets the view"
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={() => (dragging = false)}
        onlostpointercapture={() => (dragging = false)}
        onkeydown={key}
    >
        {#if failed}<p class="fallback">3D is unavailable on this device.</p>
            {#if movie.posterPath}<img
                    src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                    alt={`Poster for ${movie.title}`}
                />{/if}{/if}
    </div>
    <div class="movie-details" aria-live="polite">
        <p>
            {movie.genres?.join(" · ") || "Genre unavailable"} · {movie.language ||
                "Language unknown"}
        </p>
        <p>
            Watched: {movie.watchedDate || "Not recorded"} · Your rating: {movie.personalRating !=
            null
                ? `${movie.personalRating}/10`
                : "Not rated"}{movie.favorite ? " · Favourite" : ""}
        </p>
        <!-- <a href={movie.url} target="_blank" rel="noreferrer">View on TMDB ↗</a> -->
    </div>
    <footer>
        <span
            >{movie.title}<small
                >{movie.director || "Director unavailable"} · {movie.releaseDate?.slice(
                    0,
                    4,
                ) || "Year unknown"} · {movie.runtime
                    ? `${movie.runtime} min`
                    : "Runtime unknown"}</small
            ></span
        >
        <!-- <div>
            <p>Click to open / close · Drag to turn</p>
            <button onclick={toggle} aria-pressed={opened}
                >{opened ? "Close case" : "Open case"}</button
            > <button onclick={reset}>Reset view ↺</button>
        </div> -->
    </footer>
</section>

<style>
    @font-face {
        font-family: 'Disc Signature';
        src: url('../../lib/assets/fonts/Clarity-Signature-BF6aa5046924898.otf') format('opentype');
        font-weight: 400;
        font-display: swap;
    }
    .movie-details {
        font-size: 13px;
        line-height: 1.8;
        margin-bottom: 22px;
    }
    .movie-details a {
        color: inherit;
        text-underline-offset: 3px;
    }
    .disc-panel {
        width: 66.6667%;
        margin: 46px auto 66px;
        font-family: var(--bfont);
    }
    header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 16px;
        border-bottom: 1px solid #ffffff26;
        padding-bottom: 22px;
    }
    .eyebrow,
    .edition {
        font-size: 10px;
        letter-spacing: 0.18em;
        opacity: 0.55;
    }
    h2 {
        font-family: var(--mfont);
        font-size: clamp(42px, 7vw, 80px);
        font-weight: 400;
        margin-top: 12px;
        line-height: 1;
    }
    .stage {
        position: relative;
        width: 100%;
        height: clamp(227px, 38vw, 480px);
        cursor: grab;
        touch-action: pan-y;
        background: transparent;
        border-radius: 20px;
        overflow: hidden;
    }
    .stage.dragging {
        cursor: grabbing;
    }
    .stage:focus-visible {
        outline: 2px solid var(--heart);
        outline-offset: 3px;
    }
    .stage img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .fallback {
        position: absolute;
        bottom: 10px;
        width: 100%;
        text-align: center;
        font-size: 12px;
    }
    footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        border-top: 1px solid #ffffff26;
        padding-top: 20px;
    }
    footer > span {
        font-family: 'Disc Signature', cursive;
        font-size: clamp(32px, 3.4vw, 52px);
        line-height: 1.2;
        color: var(--heart);
    }
    small {
        font-family: var(--bfont);
        color: var(--fill);
        line-height: 1.5;
        display: block;
        font-size: 11px;
        opacity: 0.55;
        margin-top: 6px;
    }
    footer p {
        font-size: 11px;
        opacity: 0.6;
    }
    footer div {
        text-align: right;
    }
    button {
        background: none;
        color: inherit;
        border: 1px solid #ffffff40;
        border-radius: 20px;
        padding: 7px 14px;
        margin-top: 10px;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
    }
    button:focus-visible {
        outline: 2px solid var(--heart);
    }
    @media (max-width: 600px) {
        .edition {
            display: none;
        }
        .disc-panel {
            width: 100%;
            margin-top: 30px;
        }
        .stage {
            margin-inline: -15px;
            width: calc(100% + 30px);
        }
        footer {
            align-items: start;
        }
        footer p {
            max-width: 140px;
            line-height: 1.5;
        }
    }
</style>
