const files = import.meta.glob('/src/lib/assets/cat/*.svg', {
  query: '?url', import: 'default', eager: true
});
const frames = Object.entries(files).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
export const FRAME_COUNT = frames.length;
export const FRAME_SIZE = 512;
export const FRAME_HEIGHT = 320;
export const ATLAS_COLUMNS = 6;
export const ATLAS_ROWS = Math.ceil(FRAME_COUNT / ATLAS_COLUMNS);

// Every cat uses the same landscape viewBox, scale, and baseline.
// Their alpha is used as the silhouette; the strip shader supplies the ink color.
export async function createLandingFrameAtlas() {
  if (!FRAME_COUNT) throw new Error('No SVGs found in assets/cat.');
  const images = await Promise.all(frames.map(async ([, url]) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  }));
  const atlas = document.createElement('canvas');
  atlas.width = FRAME_SIZE * ATLAS_COLUMNS;
  atlas.height = FRAME_HEIGHT * ATLAS_ROWS;
  const ctx = atlas.getContext('2d');
  images.forEach((image, index) => {
    const scale = Math.min(FRAME_SIZE / image.naturalWidth, FRAME_HEIGHT / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (index % ATLAS_COLUMNS) * FRAME_SIZE + (FRAME_SIZE - width) / 2, Math.floor(index / ATLAS_COLUMNS) * FRAME_HEIGHT + (FRAME_HEIGHT - height) / 2, width, height);
  });
  // Give the Canvas fallback the same solid ink as the shader.
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#110e11';
  ctx.fillRect(0, 0, atlas.width, atlas.height);
  return atlas;
}
