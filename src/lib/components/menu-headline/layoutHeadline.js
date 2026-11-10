/* ----------------------------------------------------------------------------------------------
 *  Pure layout: text -> one instance per glyph (+ one per trail ghost).  No three.js in here, so it
 *  can be unit-tested in Node.  Units: "em" inside the atlas, CSS px for the result.
 * -------------------------------------------------------------------------------------------- */

export function createFont(json) {
	const byCode = new Map(json.glyphs.map((g) => [g.unicode, g]));
	const kern = new Map((json.kerning || []).map((k) => [k.unicode1 * 65536 + k.unicode2, k.advance]));
	// planeBounds/atlasBounds include the SDF padding (distanceRange / 2 px on every side)
	const padEm = json.atlas.distanceRange / 2 / json.atlas.size;
	const H = byCode.get(72); // 'H'
	const capEm = H ? -H.planeBounds.top - padEm : 0.66;
	return { json, byCode, kern, atlas: json.atlas, capEm, padEm };
}

/** advance-based layout of one line, in em (includes kerning) */
export function measureLine(font, text) {
	const glyphs = [];
	let x = 0;
	let prev = null;
	for (const ch of text) {
		const code = ch.codePointAt(0);
		const g = font.byCode.get(code) ?? font.byCode.get(63); // '?' fallback
		const real = g ? g.unicode : 63;
		if (prev !== null) x += font.kern.get(prev * 65536 + real) ?? 0;
		glyphs.push({ g, x });
		x += g ? g.advance : 0.25;
		prev = real;
	}
	return { glyphs, width: x };
}

/**
 * @param font    createFont() result
 * @param lines   string[]
 * @param o       { W, H, fit, leading, align, dirs, trails, lineStagger, charStagger, clampHeight }
 *
 * Instances are ordered   trail T-1 ... trail 1, main  (outer loop)   so that, with normal alpha
 * blending, the oldest ghosts are painted first and the solid letter last.
 */
export function buildHeadline(font, lines, o) {
	const {
		W,
		H,
		fit = 1,
		leading = 0.74,
		align = 'center',
		dirs = [1, -1],
		trails = 10,
		lineStagger = 0.16,
		charStagger = 0.045,
		clampHeight = true,
		maxFontPx = Infinity
	} = o;

	const measured = lines.map((t) => measureLine(font, t));
	const widest = Math.max(...measured.map((m) => m.width), 0.001);
	let fontPx = (W * fit) / widest;
	if (clampHeight) {
		const blockEm = (lines.length - 1) * leading + font.capEm;
		fontPx = Math.min(fontPx, (H * 0.92) / blockEm);
	}
	fontPx = Math.min(fontPx, maxFontPx);

	// vertical: centre the block (cap-height to baseline of last line)
	const blockPx = ((lines.length - 1) * leading + font.capEm) * fontPx;
	const firstBaseline = (H - blockPx) / 2 + font.capEm * fontPx;

	const lineInfo = [];
	const glyphs = []; // flat, one entry per visible glyph
	let maxChars = 0;
	measured.forEach((m, l) => {
		const wPx = m.width * fontPx;
		const x0 = align === 'left' ? 0 : align === 'right' ? W - wPx : (W - wPx) / 2;
		const baseline = firstBaseline + l * leading * fontPx;
		const dir = dirs[l % dirs.length];
		lineInfo.push({ x0, x1: x0 + wPx, baseline, dir });
		maxChars = Math.max(maxChars, m.glyphs.length);
		m.glyphs.forEach((gl, c) => {
			if (!gl.g || !gl.g.planeBounds) return; // space: advances, but has no quad
			glyphs.push({
				l,
				c,
				center: (m.glyphs.length - 1) / 2,
				homeX: x0 + gl.x * fontPx,
				baseline,
				dir,
				delay: l * lineStagger + c * charStagger,
				pb: gl.g.planeBounds,
				ab: gl.g.atlasBounds
			});
		});
	});

	const T = Math.max(1, trails);
	const n = glyphs.length;
	const count = n * T;
	const rect = new Float32Array(count * 4);
	const uv = new Float32Array(count * 4);
	const home = new Float32Array(count * 4);
	const anim = new Float32Array(count * 4);
	const aw = font.atlas.width;
	const ah = font.atlas.height;

	let i = 0;
	for (let k = T - 1; k >= 0; k--) {
		for (const g of glyphs) {
			rect.set([g.pb.left, g.pb.top, g.pb.right, g.pb.bottom], i * 4); // em, y down, baseline = 0
			uv.set([g.ab.left / aw, g.ab.top / ah, g.ab.right / aw, g.ab.bottom / ah], i * 4); // v from the top
			home.set([g.homeX, g.baseline, g.l, g.dir], i * 4);
			anim.set([g.delay, g.c, k, g.center], i * 4);
			i++;
		}
	}

	const lastDelay = (lines.length - 1) * lineStagger + (maxChars - 1) * charStagger;
	return { fontPx, lineInfo, glyphCount: n, trails: T, count, rect, uv, home, anim, lastDelay };
}

/* ----------------------------------------------------------------------------------------------
 *  Moving reveal edges: a pure function of time (so it scrubs / replays exactly like the glyphs).
 *  A line travelling right (dir +1) is uncovered by its RIGHT edge sweeping out from the line's
 *  start; a line travelling left (dir -1) by its LEFT edge sweeping from the line's end.
 *  Returns [left0, right0, left1, right1, ...] in css px.
 * -------------------------------------------------------------------------------------------- */
const inOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export function revealAt(lineInfo, W, t, { lineStagger = 0.16, revealDur = 1.7, revealDelay = 0.05, margin = 40 } = {}) {
	const out = new Float32Array(16).fill(0);
	for (let i = 0; i < 8; i++) {
		out[i * 2] = -1e5; // unused lines: wide open
		out[i * 2 + 1] = 1e5;
	}
	lineInfo.forEach((li, l) => {
		const p = Math.min(1, Math.max(0, (t - revealDelay - l * lineStagger) / revealDur));
		const e = inOutCubic(p);
		if (li.dir >= 0) {
			out[l * 2] = -margin;
			out[l * 2 + 1] = li.x0 + (W + margin - li.x0) * e;
		} else {
			out[l * 2] = li.x1 + (-margin - li.x1) * e;
			out[l * 2 + 1] = W + margin;
		}
	});
	return out;
}
