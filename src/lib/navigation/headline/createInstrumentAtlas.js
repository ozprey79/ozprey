// Use the same local italic face for WebGL glyphs and the accessible HTML fallback.
// Browser rasterization also retains the font's kerning without an external atlas tool.
export async function createInstrumentAtlas(lines) {
  const size = 192, cell = 256, columns = 8, padding = 8;
  const loaded = await document.fonts.load(`italic ${size}px "Instrument Serif"`);
  if (!loaded.length) throw new Error('Instrument Serif Italic did not load');
  const chars = [...new Set(`H? ${lines.join('')}`)];
  const canvas = document.createElement('canvas');
  canvas.width = columns * cell;
  canvas.height = Math.ceil(chars.length / columns) * cell;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Cannot create menu font atlas');
  context.font = `italic ${size}px "Instrument Serif"`;
  context.fillStyle = '#fff';
  context.textBaseline = 'alphabetic';
  const glyphs = chars.map((char, index) => {
    const metrics = context.measureText(char);
    const glyph = { unicode: char.codePointAt(0), advance: metrics.width / size };
    if (char === ' ') return glyph;
    const x = (index % columns) * cell + 32;
    const y = Math.floor(index / columns) * cell + 200;
    const left = -metrics.actualBoundingBoxLeft - padding;
    const top = -metrics.actualBoundingBoxAscent - padding;
    const right = metrics.actualBoundingBoxRight + padding;
    const bottom = metrics.actualBoundingBoxDescent + padding;
    if (x + left < Math.floor(index % columns) * cell || right > cell - 32 || top < -200 || bottom > cell - 200) {
      throw new Error('Menu glyph exceeds atlas cell');
    }
    context.fillText(char, x, y);
    glyph.planeBounds = { left: left / size, top: top / size, right: right / size, bottom: bottom / size };
    glyph.atlasBounds = { left: x + left, top: y + top, right: x + right, bottom: y + bottom };
    return glyph;
  });
  const pairs = new Map();
  for (const line of lines) {
    const letters = [...line];
    for (let i = 1; i < letters.length; i++) {
      const pair = letters[i - 1] + letters[i];
      pairs.set(pair, {
        unicode1: letters[i - 1].codePointAt(0), unicode2: letters[i].codePointAt(0),
        advance: (context.measureText(pair).width - context.measureText(letters[i - 1]).width - context.measureText(letters[i]).width) / size
      });
    }
  }
  return {
    canvas,
    json: { atlas: { width: canvas.width, height: canvas.height, size, distanceRange: padding * 2 }, glyphs, kerning: [...pairs.values()] }
  };
}
