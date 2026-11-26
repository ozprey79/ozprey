# Vinyl record and sleeve

`vinyl.glb` is original Blender geometry built by
`scripts/build-vinyl-blender.py` from the supplied vinyl-and-sleeve references.

- Editable master: `output/vinyl/vinyl.blend`.
- Transparent studio render: `output/vinyl/vinyl-preview.png`.
- Runtime: `src/routes/music/vinylScene.js` and `Vinyl.svelte`.

Rebuild with Blender 5.3:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.3/blender.exe' --background --python scripts/build-vinyl-blender.py
```

The 12-inch record has 152 physical groove rings on each face, four quiet
bands, a rounded outer rim, an open spindle bore, and separate paper labels.
The square sleeve has two cardboard faces with real thickness, an open right
edge, folded spine, glued seams, and a die-cut thumb notch. The record is
partially withdrawn, matching the reference silhouette. Blender units are
centimetres, front is -Y, and glTF converts the assembly to Y-up.

Last.fm artwork is printed onto the sleeve and label at runtime. A charcoal
sleeve and orange label are used when artwork is absent or a placeholder.
The record and sleeve support drag rotation, keyboard-accessible turn/reset
buttons, and optional record spinning. Spinning pauses out of view and in
hidden tabs; reduced-motion preferences disable continuous rotation. Static
views render on changes. Scene resources are disposed on navigation.

## Archived cassette assets

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

The cassette model is retained as an archived asset. The Music page uses
the vinyl assembly instead; the old cassette component and scene were removed.
