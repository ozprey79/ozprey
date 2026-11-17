// Read the editable source SVGs in the browser. Keep geometry and stroke widths;
// menu colours and the animated backing remain controlled by HandwrittenMenu.
export function readMenuSvg(source) {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (document.querySelector('parsererror') || root.localName !== 'svg') {
    throw new Error('Invalid menu SVG');
  }
  const strokes = [];
  function visit(element, transforms = [], inheritedWeight = '3') {
    if (['defs', 'metadata', 'namedview', 'clipPath', 'mask'].includes(element.localName)) return;
    const style = Object.fromEntries((element.getAttribute('style') ?? '').split(';').map(rule => {
      const colon = rule.indexOf(':');
      return colon < 0 ? ['', ''] : [rule.slice(0, colon).trim(), rule.slice(colon + 1).trim()];
    }));
    if (style.display === 'none' || element.getAttribute('display') === 'none') return;
    const transform = element.getAttribute('transform');
    const chain = transform ? [...transforms, transform] : transforms;
    const weight = style['stroke-width'] || element.getAttribute('stroke-width') || inheritedWeight;
    if (element.localName === 'path' && element.getAttribute('d')) {
      strokes.push({ d: element.getAttribute('d'), transform: chain.join(' ') || undefined, weight: Number.parseFloat(weight) });
    }
    for (const child of element.children) visit(child, chain, weight);
  }
  visit(root);
  return { viewBox: root.getAttribute('viewBox'), weight: 3, strokes };
}
