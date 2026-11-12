import { ShapeGeometry, BufferGeometry, Float32BufferAttribute, REVISION } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

/** Reads  viewBox="x y w h"  from the SVG markup (landscape and portrait walls differ). */
export function parseViewBox(svgText) {
	const m = /viewBox\s*=\s*"([^"]+)"/.exec(svgText);
	const [x, y, w, h] = m[1].trim().split(/[\s,]+/).map(Number);
	return { x, y, w, h };
}

/** Same numbers as the original CSS: stroke-width .3, and SVG's defaults for join / cap / miterlimit */
const STROKE_WIDTH = 0.3;
const MITER_LIMIT = 4; // SVG default; joins sharper than this fall back to a bevel, exactly like a browser

/**
 * Robust SVG-style stroker (butt caps, miter joins with miter-limit -> bevel fallback).
 *
 * three's SVGLoader.pointsToStroke() mis-places the inner join point when curve samples
 * are shorter than the stroke width (which is always the case for a 0.3-unit stroke on a
 * finely sampled curve) and visibly thins the stroke. This stroker instead emits
 *   - one quad per segment, and
 *   - one bevel triangle (+ one miter triangle if within the limit) per join,
 * which is correct for any segment length. The pieces overlap; the renderer's stencil test
 * (see Wall3D.svelte) guarantees each pixel of a stroke is painted exactly once.
 */
function strokePolyline(pts, halfW, closed, out) {
	// drop zero-length segments
	const P = [];
	for (const p of pts) {
		const q = P[P.length - 1];
		if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-7) P.push({ x: p.x, y: p.y });
	}
	if (closed && P.length > 1) {
		const a = P[0], b = P[P.length - 1];
		if (Math.hypot(a.x - b.x, a.y - b.y) <= 1e-7) P.pop();
	}
	const n = P.length;
	if (n < 2) return;

	const segCount = closed ? n : n - 1;
	const D = []; // unit directions
	for (let i = 0; i < segCount; i++) {
		const a = P[i], b = P[(i + 1) % n];
		const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
		D.push({ x: dx / l, y: dy / l });
	}

	// geometry is generated in SVG space (y down) and written with y negated (scene space, y up)
	const tri = (ax, ay, bx, by, cx, cy) => out.push(ax, -ay, 0, bx, -by, 0, cx, -cy, 0);

	for (let i = 0; i < segCount; i++) {
		const a = P[i], b = P[(i + 1) % n], d = D[i];
		const nx = -d.y * halfW, ny = d.x * halfW;
		tri(a.x + nx, a.y + ny, a.x - nx, a.y - ny, b.x - nx, b.y - ny);
		tri(a.x + nx, a.y + ny, b.x - nx, b.y - ny, b.x + nx, b.y + ny);
	}

	const joinCount = closed ? n : n - 2;
	for (let k = 0; k < joinCount; k++) {
		const vi = closed ? k : k + 1; // vertex index
		const d0 = D[closed ? (vi - 1 + n) % n : vi - 1];
		const d1 = D[closed ? vi % n : vi];
		const V = P[vi];
		const cross = d0.x * d1.y - d0.y * d1.x;
		const dot = d0.x * d1.x + d0.y * d1.y;
		if (Math.abs(cross) < 1e-12 && dot > 0) continue; // collinear, nothing to fill
		const s = cross > 0 ? -1 : 1; // outer side of the turn
		const n0x = -d0.y * halfW * s, n0y = d0.x * halfW * s;
		const n1x = -d1.y * halfW * s, n1y = d1.x * halfW * s;
		const ax = V.x + n0x, ay = V.y + n0y;
		const bx = V.x + n1x, by = V.y + n1y;
		tri(V.x, V.y, ax, ay, bx, by); // bevel
		// miter ratio = 1 / cos(turn/2); within limit -> add the tip
		const c2 = (1 + dot) / 2;
		if (c2 > 1e-12 && 1 / Math.sqrt(c2) <= MITER_LIMIT) {
			const k2 = 1 / (1 + dot);
			tri(ax, ay, V.x + (n0x + n1x) * k2, V.y + (n0y + n1y) * k2, bx, by);
		}
	}
}

/**
 * Parses the original SVG markup and returns one "part" per <path>, in DOM order.
 *
 *  part = {
 *    kind:   'filled' | 'empty',          // from the original class names
 *    fill:   BufferGeometry | null,       // triangulated interior (filled letters only)
 *    stroke: BufferGeometry,              // 0.3-unit stroke, miter joins, butt caps
 *    bboxX:  [minX, maxX] | null          // objectBoundingBox x-range -> drives the gradient
 *  }
 *
 * Geometry is returned in "scene" space: x = SVG x, y = -SVG y (y-up), so a normal
 * orthographic camera can be used.
 *
 * `divisions` = samples per curve segment. three's default (12) visibly facets these large
 * glyphs; 96 keeps the curve error far below a device pixel even on 4K.
 */
export function buildWallParts(svgText, { divisions = 96 } = {}) {
	const data = new SVGLoader().parse(svgText);
	const parts = [];

	for (const path of data.paths) {
		const cls = path.userData.node.getAttribute('class') || '';
		const kind = cls.includes('filledLetters') ? 'filled' : 'empty';

		/* ---------- stroke: every sub-path, high-res ---------- */
		const verts = [];
		for (const sub of path.subPaths) {
			strokePolyline(sub.getPoints(divisions), STROKE_WIDTH / 2, !!sub.autoClose, verts);
		}
		const stroke = new BufferGeometry();
		stroke.setAttribute('position', new Float32BufferAttribute(verts, 3));

		/* ---------- fill (filled letters only) ---------- */
		let fill = null;
		let bboxX = null;
		if (kind === 'filled') {
			// createShapes() was deprecated in r185 in favour of ShapePath.toShapes()
			const shapes = parseInt(REVISION, 10) >= 185 ? path.toShapes() : SVGLoader.createShapes(path);
			fill = new ShapeGeometry(shapes, divisions);
			fill.deleteAttribute('normal');
			fill.deleteAttribute('uv');
			fill.computeBoundingBox();
			bboxX = [fill.boundingBox.min.x, fill.boundingBox.max.x]; // objectBoundingBox (stroke excluded, like SVG)
			fill.scale(1, -1, 1);
		}

		parts.push({ kind, fill, stroke, bboxX });
	}
	return parts;
}
