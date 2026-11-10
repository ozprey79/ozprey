# Cat motion studies

24 original vector silhouettes, numbered 01.svg through 24.svg in playback order.
Every frame uses the same 360 × 225 viewBox, anatomical proportions, and baseline.
They form a seamless walking cycle; all artwork is editable SVG with Bézier contours.

To regenerate or adjust the anatomy and gait, edit `scripts/generate-cat-frames.mjs`
and run `node scripts/generate-cat-frames.mjs` from the project root.

The viewer loads these files locally with Vite and packs them into a six-column
texture atlas. It no longer uses the photographic cat or the stick-figure sequence.
