# Cassette

`cassette.glb` is original geometry built by `scripts/build-cassette-blender.py`,
using the supplied cassette images as visual references. No reference textures
or Sony branding are copied into the asset.

Editable master: `output/cassette/cassette.blend`.
Studio render: `output/cassette/cassette-preview.png`.

Rebuild with Blender 5.3:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.3/blender.exe' --background --python scripts/build-cassette-blender.py
```

The model includes two thin clear plastic shells, open spindle holes, reel hubs
and teeth, unequal tape packs, guide rollers, screws, ribs and separate paper
labels. Coordinates use a 10-unit cassette width; the browser preserves that
scale. Blender exports its Z-up assembly as glTF Y-up.

`src/routes/music/cassetteScene.js` loads the GLB and applies a canvas ink layer
on both white stickers. Titles come from the selected Last.fm single and use
the same Clarity Signature font as the jewel case. Long text shrinks to fit.
The scene renders on changes only, and disposes its GPU resources on unmount.
