/* ------------------------------------------------------------------ *
 *  Letters                                                            *
 *  All colour maths is done in raw sRGB (no linear conversion), which *
 *  is what a browser does when it paints an SVG - so the result is    *
 *  numerically the same as the original.                              *
 * ------------------------------------------------------------------ */

export const letterVertex = /* glsl */ `
	varying vec2 vPos;                       // scene-space position (x = SVG x, y = -SVG y)
	void main() {
		vPos = position.xy;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

/**
 * <linearGradient id="grad1" x1=0% x2=100% y1=0% y2=0%>   (objectBoundingBox units -> per letter)
 *   0%   rgb(255,192,236)
 *   40%  rgb(255,192,236)
 *   100% black
 */
export const fillFragment = /* glsl */ `
	uniform vec2  uBBoxX;                    // this letter's [minX, maxX]
	uniform vec3  uPink;                     // rgb(255,192,236) / 255
	uniform float uAlpha;
	varying vec2  vPos;
	void main() {
		float t = clamp((vPos.x - uBBoxX.x) / (uBBoxX.y - uBBoxX.x), 0.0, 1.0);
		vec3 c = mix(uPink, vec3(0.0), clamp((t - 0.4) / 0.6, 0.0, 1.0));
		gl_FragColor = vec4(c, uAlpha);
	}
`;

/**
 * GSAP tweened  stroke: 'none' -> 'var(--fill)'  as  rgba(0,0,0,0) -> rgba(fill,1)
 * i.e. every channel (alpha included) is linear in the eased value p, clamped to 0..1.
 * Output is NON-premultiplied; normal blending then reproduces CSS rgba() painting.
 */
export const strokeFragment = /* glsl */ `
	uniform vec3  uColor;                    // the --fill colour, 0..1
	uniform float uP;                        // eased tween value (may over/undershoot)
	void main() {
		float a = clamp(uP, 0.0, 1.0);
		gl_FragColor = vec4(uColor * a, a);
	}
`;

/* ------------------------------------------------------------------ *
 *  Post pass - THIS is where the pointer effects live.                *
 *  The whole composition is first rendered (MSAA) into a texture, so  *
 *  anything you do here warps the real, anti-aliased artwork.         *
 *  With uInfluence = 0 the pass is an exact 1:1 copy.                 *
 * ------------------------------------------------------------------ */

export const postVertex = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}
`;

export const postFragment = /* glsl */ `
	uniform sampler2D tScene;                // premultiplied RGBA of the artwork
	uniform vec2  uPointer;                  // smoothed pointer, uv (0..1, y up)
	uniform vec2  uVelocity;                 // smoothed pointer velocity, uv / second
	uniform float uInfluence;                // 0 -> 1 fade while the pointer is over the wall
	uniform float uEnergy;                   // 0 -> 1, how fast the pointer is moving
	uniform float uAspect;                   // width / height
	uniform float uTime;
	uniform float uStrength;                 // global effect multiplier (component prop)
	varying vec2  vUv;

	void main() {
		vec2 p = vUv - uPointer;
		p.x *= uAspect;                      // make the falloff circular on screen
		float r = length(p);

		float lens   = exp(-r * r * 16.0);                    // soft gaussian around the cursor
		float ripple = sin(r * 55.0 - uTime * 8.0) * exp(-r * 5.0);

		vec2 dir  = p / max(r, 1e-4);
		dir.x    /= uAspect;

		// drag the artwork along the motion + emit ripples proportional to speed
		vec2 offset = (uVelocity * 0.05 * lens + dir * ripple * 0.006 * uEnergy)
		            * uInfluence * uStrength;

		// tiny chromatic split along the displacement
		vec4 sr = texture2D(tScene, vUv + offset * 1.35);
		vec4 sg = texture2D(tScene, vUv + offset);
		vec4 sb = texture2D(tScene, vUv + offset * 0.65);

		gl_FragColor = vec4(sr.r, sg.g, sb.b, max(sr.a, max(sg.a, sb.a)));
	}
`;
