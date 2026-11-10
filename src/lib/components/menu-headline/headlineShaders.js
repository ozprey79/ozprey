/* ------------------------------------------------------------------------------------------------
 *  One instanced quad per glyph (and per trail ghost).
 *  Everything animated is a pure function of  uTime  -> trails are just "the same glyph, evaluated
 *  a little earlier in time", so they stay perfect while scrubbing / reversing / replaying.
 * ---------------------------------------------------------------------------------------------- */

export const headlineVertex = /* glsl */ `
	attribute vec4 aRect;   // em: left, top, right, bottom   (y down, baseline = 0)
	attribute vec4 aUv;     // atlas uv: u0, v0 (top), u1, v1 (bottom)
	attribute vec4 aHome;   // px: home x, baseline y, line index, direction (+1 / -1)
	attribute vec4 aAnim;   // delay (s), char index in line, trail index k (0 = solid glyph), unused

	uniform float uTime;
	uniform float uFontPx;
	uniform float uTravel;        // px the glyphs travel while sliding in
	uniform float uDur;           // slide duration (s)
	uniform float uSpread;        // extra letter-spacing at the start, in em per character
	uniform float uSpreadDur;     // spacing duration (s)
	uniform float uTrailLag;      // seconds between ghosts
	uniform float uTrailCount;
	uniform float uTrailAlpha;
	uniform float uTrailFalloff;
	uniform float uTrailGate;     // px of displacement over which a ghost fades in
	uniform vec2  uReveal[8];     // per line: [left edge, right edge] in px, animated from JS
	uniform float uHover[64];    // eight delayed spacing samples per line, main glyph first

	varying vec2  vUv;
	varying float vAlpha;
	varying vec2  vReveal;
	varying float vPx;

	float outExpo(float p)  { return p >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * p); }
	float outCubic(float p) { float q = 1.0 - p; return 1.0 - q * q * q; }

	// horizontal displacement from the glyph's home position at time t
	float offsetX(float t, float delay, float dir, float ci) {
		float p  = clamp((t - delay) / uDur, 0.0, 1.0);
		float ps = clamp((t - delay) / uSpreadDur, 0.0, 1.0);
		float slide = -dir * uTravel * (1.0 - outExpo(p));          // arrives from behind
		float track = uSpread * uFontPx * ci * (1.0 - outCubic(ps)); // letter-spacing collapses
		return slide + track;
	}

	void main() {
		float k  = aAnim.z;
		float d0 = offsetX(uTime,                 aAnim.x, aHome.w, aAnim.y); // the solid glyph
		float dk = offsetX(uTime - k * uTrailLag, aAnim.x, aHome.w, aAnim.y); // this ghost
		int lineIndex = int(aHome.z + 0.5);
		float centeredIndex = aAnim.y - aAnim.w;
		d0 += uHover[lineIndex * 8] * uFontPx * 0.12 * centeredIndex;
		dk += uHover[lineIndex * 8 + int(k + 0.5)] * uFontPx * 0.12 * centeredIndex;

		vec2 local = mix(aRect.xy, aRect.zw, position.xy);          // position.xy is the unit quad
		vec2 px = vec2(aHome.x + dk, aHome.y) + local * uFontPx;

		vUv = mix(aUv.xy, aUv.zw, position.xy);

		// ghosts: older = fainter; and only visible while they are actually displaced from the glyph
		float fall = pow(max(1.0 - k / uTrailCount, 0.0), uTrailFalloff);
		float gate = smoothstep(0.0, min(uTrailGate, 6.0), abs(dk - d0));
		vAlpha = k < 0.5 ? 1.0 : uTrailAlpha * fall * gate;

		vReveal = uReveal[int(aHome.z + 0.5)];
		vPx = px.x;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(px, 0.0, 1.0);
	}
`;

export const headlineFragment = /* glsl */ `
	uniform sampler2D tAtlas;
	uniform float uPxRange;      // distanceRange of the atlas, in atlas pixels
	uniform vec2  uAtlasSize;
	uniform vec3  uInk;

	varying vec2  vUv;
	varying float vAlpha;
	varying vec2  vReveal;
	varying float vPx;

	float median(vec3 c) { return max(min(c.r, c.g), min(max(c.r, c.g), c.b)); }

	void main() {
		// Browser-rasterized Instrument Serif Italic coverage.
		float a = texture2D(tAtlas, vUv).a;

		// --- moving reveal edges (1 css-px antialiased) -------------------------------------
		float clipA = clamp(vPx - vReveal.x + 0.5, 0.0, 1.0) * clamp(vReveal.y - vPx + 0.5, 0.0, 1.0);

		gl_FragColor = vec4(uInk, a * clipA * vAlpha);
	}
`;
