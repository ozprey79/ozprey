# Ozprey

A SvelteKit portfolio with animated typography, WebGL letter walls, a blog,
and film and music visualizations. Uses Svelte 5, Three.js, and GSAP.

## Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and supply the private credentials used by the
film and music routes: `TMDB_ACCESS_TOKEN`, `TMDB_LIST_ID`,
`LASTFM_API_KEY`, and `LASTFM_USERNAME`. Keep `.env` out of version control.

The books page uses `HARDCOVER_API_TOKEN` and optional `HARDCOVER_USERNAME`
(defaults to `ozprey7`). It reads only public library entries from Hardcover,
refreshes at most once every five minutes, and falls back to a saved public
collection if the API is unavailable. Tokens stay on the server.

```sh
npm run build    # Compile client and server for production
npm run preview  # Preview the production build locally
```

Deployment uses `@sveltejs/adapter-auto`; configure an appropriate adapter
if the deployment target is not supported automatically.

## Code map

See [the library guide](src/lib/README.md) for folder conventions.

- `src/routes/+layout.svelte`: shared navigation, menu sound, and icon morphing.
- `src/routes/+page.svelte`: intro selection and transition into the home scene.
- `src/routes/layout.css`: shared palette, fonts, reset, and navigation styles.
- `src/lib/home/Home.svelte`: responsive home layout and wall selection.
- `src/lib/home/wall/`: landscape and portrait SVG artwork, geometry, and WebGL effects.
- `src/lib/navigation/headline/`: browser-generated font atlas and animated headline.
- `src/lib/home/loaders/`: S-window intro and optional cat-film intro.
- `src/routes/about/` and `src/lib/about/FisheyeSurface.svelte`: interactive biography.
- `src/routes/blog/data.js`: blog content used by the list and article routes.
- `src/routes/movies/` and `src/routes/music/`: server-side API loading and orbit views.
- `src/routes/books/` and `src/lib/books/`: Hardcover library, interactive page-count shelf, author and publication-decade charts, and searchable index.

## Animation assets

The home route keeps both intro options available through its `loader` constant.
The home component defaults to the `traces` wall and retains the alternate 3D wall.

Run `scripts/generate-s-frames.ps1` on Windows to regenerate the S-window SVG
outlines in `sFrames.json`; the script requires its listed fonts to be installed.
`node scripts/generate-cat-frames.mjs` regenerates the editable cat SVG sequence
in `src/lib/assets/source-art/cat/`. The optional cat-film intro uses the separate photographic
atlas documented in `static/motion/README.md`.

Source artwork is retained for future editing. Build output, local logs, and OS
metadata are ignored by Git.
