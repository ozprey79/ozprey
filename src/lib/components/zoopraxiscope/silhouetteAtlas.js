const WIDTH = 512;
const HEIGHT = 256;

// Small binary filters remove the photographic grid and join the fur into a contour.
function filter(mask, dilate) {
  const result = new Uint8Array(mask.length);
  for (let y = 1; y < HEIGHT - 1; y++) {
    for (let x = 1; x < WIDTH - 1; x++) {
      const p = y * WIDTH + x;
      let value = dilate ? 0 : 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dilate) value |= mask[p + dy * WIDTH + dx];
          else value &= mask[p + dy * WIDTH + dx];
        }
      }
      result[p] = value;
    }
  }
  return result;
}

function silhouette(pixels) {
  let mask = new Uint8Array(WIDTH * HEIGHT);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    mask[p] = pixels[i] * .299 + pixels[i + 1] * .587 + pixels[i + 2] * .114 < 156 ? 1 : 0;
  }
  // Opening removes thin measurement lines; closing seals the light fur markings.
  mask = filter(filter(mask, false), true);
  for (let i = 0; i < 7; i++) mask = filter(mask, true);
  for (let i = 0; i < 7; i++) mask = filter(mask, false);

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let largest = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let read = 0, write = 1;
    queue[0] = start; visited[start] = 1;
    while (read < write) {
      const p = queue[read++];
      for (const n of [p - WIDTH, p + WIDTH, p % WIDTH ? p - 1 : -1, p % WIDTH < WIDTH - 1 ? p + 1 : -1]) {
        if (n >= 0 && n < mask.length && mask[n] && !visited[n]) {
          visited[n] = 1; queue[write++] = n;
        }
      }
    }
    if (write > largest.length) largest = queue.slice(0, write);
  }
  mask.fill(0);
  for (const p of largest) mask[p] = 1;

  // Fill enclosed highlights so the animal reads as one uninterrupted shadow.
  visited.fill(0);
  let read = 0, write = 1;
  queue[0] = 0; visited[0] = 1;
  while (read < write) {
    const p = queue[read++];
    for (const n of [p - WIDTH, p + WIDTH, p % WIDTH ? p - 1 : -1, p % WIDTH < WIDTH - 1 ? p + 1 : -1]) {
      if (n >= 0 && n < mask.length && !mask[n] && !visited[n]) {
        visited[n] = 1; queue[write++] = n;
      }
    }
  }
  for (let p = 0; p < mask.length; p++) if (!visited[p]) mask[p] = 1;
  return mask;
}

export function createSilhouetteAtlas(image) {
  const atlas = document.createElement('canvas');
  atlas.width = image.naturalWidth; atlas.height = image.naturalHeight;
  const output = atlas.getContext('2d');
  const frame = document.createElement('canvas');
  frame.width = WIDTH; frame.height = HEIGHT;
  const ctx = frame.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < 20; i++) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(image, (i % 5) * WIDTH, Math.floor(i / 5) * HEIGHT, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
    const mask = silhouette(ctx.getImageData(0, 0, WIDTH, HEIGHT).data);
    const result = ctx.createImageData(WIDTH, HEIGHT);
    for (let p = 0; p < mask.length; p++) {
      result.data[p * 4] = 20; result.data[p * 4 + 1] = 17; result.data[p * 4 + 2] = 20;
      result.data[p * 4 + 3] = mask[p] * 255;
    }
    ctx.putImageData(result, 0, 0);
    output.filter = 'blur(1.1px)';
    output.drawImage(frame, (i % 5) * WIDTH, Math.floor(i / 5) * HEIGHT);
  }
  return atlas;
}
