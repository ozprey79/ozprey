# Library organization

Keep components and their implementation helpers together by feature:

```text
lib/
  about/                 Biography interactions
    assets/              Stroke artwork and extracted paths
  home/
    Home.svelte          Responsive home layout
    loaders/             S-window and cat-film intros
    wall/                Wall components, SVG data, geometry, and shaders
  navigation/
    Menu.svelte          Site menu
    assets/              Menu sound
    headline/            Headline renderer, font atlas, and layout helpers
  assets/
    fonts/               Shared fonts and license information
    icons/               Site favicon and navigation SVG paths
    source-art/          Editable design studies, separate from runtime assets
```

Import features from routes with `$lib/home/...`, `$lib/about/...`, or
`$lib/navigation/...`. Keep relative imports for neighboring implementation
helpers. Add shared assets under a descriptive `assets/` subfolder; keep
feature-specific assets beside their owner.

Route loading and page composition stay in `src/routes`. Public assets addressed
by URL, such as `/motion/cat-atlas.png`, stay in `static`.

The generators in `scripts/` write to `home/loaders/sFrames.json` and
`assets/source-art/cat/`; update those destinations when relocating their output.
