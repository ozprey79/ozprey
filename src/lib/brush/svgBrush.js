const SVG_NS = 'http://www.w3.org/2000/svg';

export const brushParameters = Object.freeze([
  { key: 'width', label: 'Width', min: 1, max: 100, step: 1, initial: 24 },
  { key: 'bristles', label: 'Bristle count', min: 4, max: 128, step: 1, initial: 40 },
  { key: 'flow', label: 'Ink flow', min: 0.05, max: 1, step: 0.01, initial: 0.82 },
  { key: 'dryness', label: 'Dryness', min: 0, max: 1, step: 0.01, initial: 0.47 },
  { key: 'taper', label: 'End taper', min: 0, max: 0.95, step: 0.01, initial: 0.62 },
  { key: 'roughness', label: 'Roughness', min: 0, max: 1, step: 0.01, initial: 0.32 },
  { key: 'angle', label: 'Nib angle', min: -75, max: 75, step: 1, initial: 15 },
  { key: 'seed', label: 'Texture seed', min: 1, max: 65535, step: 1, initial: 21 },
]);

/** Normalize settings from UI controls or a saved JSON preset. */
export function normalizeBrush(settings = {}) {
  const result = {};
  for (const { key, min, max, step, initial } of brushParameters) {
    const value = settings?.[key];
    const bounded = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : initial;
    result[key] = step === 1 ? Math.round(bounded) : bounded;
  }
  const color = settings?.color;
  result.color = typeof color === 'string' && /^#[\da-f]{6}$/i.test(color) ? color : '#f1bda5';
  return result;
}

/** Paint a single continuous SVG path into a group in the guide's coordinate space. */
export function paintSvgBrush(guide, group, settings) {
  const d = guide.getAttribute('d') ?? '';
  if ((d.match(/[Mm]/g) ?? []).length !== 1 || !/^\s*[Mm]/.test(d)) {
    throw new Error('Use one continuous SVG path per brush stroke.');
  }

  const length = guide.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error('The SVG path needs a visible segment.');
  }

  const brush = normalizeBrush(settings);
  const steps = Math.min(600, Math.max(32, Math.ceil(length / 2)));
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = guide.getPointAtLength(length * t);
    const before = guide.getPointAtLength(length * Math.max(0, (i - 0.5) / steps));
    const after = guide.getPointAtLength(length * Math.min(1, (i + 0.5) / steps));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) + brush.angle * Math.PI / 180;
    samples.push({ x: point.x, y: point.y, nx: -Math.sin(angle), ny: Math.cos(angle) });
  }

  let seed = brush.seed;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const fragment = group.ownerDocument.createDocumentFragment();
  const bristles = [];
  const spacing = brush.width / (brush.bristles - 1);
  const coord = (value) => Number(value.toFixed(3));
  for (let i = 0; i < brush.bristles; i++) {
    const across = (i / (brush.bristles - 1) - 0.5) * 2;
    const end = Math.max(2, Math.round(steps * (1 - brush.dryness * random() * 0.88)));
    const phase = random() * 2 * Math.PI;
    const offset = (random() - 0.5) * brush.roughness * 2;
    const points = [];
    for (let j = 0; j <= end; j++) {
      const { x, y, nx, ny } = samples[j];
      const t = j / steps;
      const taper = 1 - brush.taper * t * t;
      const wobble = brush.roughness * Math.sin(t * 40 + phase);
      const shift = taper * (across * brush.width / 2 + spacing * (offset + wobble));
      points.push(`${coord(x + nx * shift)} ${coord(y + ny * shift)}`);
    }

    const path = group.ownerDocument.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M' + points.join('L'));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', brush.color);
    path.setAttribute('stroke-width', spacing * (0.65 + random() * 0.85));
    path.setAttribute('stroke-opacity', brush.flow * (1 - brush.dryness * random() * 0.75));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('pathLength', '1');
    fragment.append(path);
    bristles.push({ path, end: end / steps });
  }

  group.replaceChildren(fragment);
  return {
    /** Reveal a fraction of the guide, from 0 to 1. */
    setProgress(value) {
      const progress = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
      for (const { path, end } of bristles) {
        path.style.visibility = progress === 0 ? 'hidden' : '';
        if (progress >= end) {
          path.removeAttribute('stroke-dasharray');
          path.removeAttribute('stroke-dashoffset');
        } else {
          path.setAttribute('stroke-dasharray', '1 1');
          path.setAttribute('stroke-dashoffset', 1 - progress / end);
        }
      }
    }
  };
}
