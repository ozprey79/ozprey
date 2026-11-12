export const vertexShader = /* glsl */ `
 varying vec2 vUv;
 void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const fragmentShader = /* glsl */ `
 uniform sampler2D uFill;
 uniform sampler2D uOutline;
 uniform vec3 uColor;
 uniform vec2 uResolution;
 uniform float uTime;
 uniform vec2 uPointer;
 uniform vec2 uVelocity;
 uniform float uInfluence;
 uniform float uEnergy;
 uniform float uScroll;
 uniform vec4 uGhosts[12]; // screen offset, opacity, localized (1) or scroll (0)
 uniform vec2 uCenters[12];
 varying vec2 vUv;

 float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
 float noise(vec2 p) {
   vec2 i = floor(p), f = fract(p);
   f = f * f * (3.0 - 2.0 * f);
   return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
 }
 float outlineAt(vec2 uv) {
   if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
   return texture2D(uOutline, uv).a;
 }
 vec2 fluidUV(vec2 uv) {
   float aspect = uResolution.x / uResolution.y;
   vec2 p = (uv - uPointer) * vec2(aspect, 1.0);
   float r = length(p);
   float lens = exp(-dot(p, p) * 14.0);
   vec2 direction = p / max(r, 0.0001);
   vec2 tangent = vec2(-direction.y, direction.x);
   // One shared displacement for the complete RGBA artwork: no color-channel separation.
   vec2 drag = uVelocity * 0.035 * lens;
   vec2 ripple = direction * sin(r * 46.0 - uTime * 6.0) * exp(-r * 6.0) * 0.008;
   vec2 curl = tangent * sin(r * 18.0 - uTime * 2.0) * lens * 0.006;
   vec2 offset = drag + (ripple + curl) / vec2(aspect, 1.0) * uEnergy;
   offset *= uInfluence;
   // Scrolling gives the same liquid field a soft vertical push.
   offset += vec2(sin(p.y * 12.0 - uTime * 2.0) * 0.004 / aspect, 0.018) * uScroll * lens;
   return uv - offset;
 }
 void main() {
   vec2 uv = fluidUV(vUv);
   vec4 mask = vec4(0.0);
   if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
     mask = texture2D(uFill, uv); // R = per-letter horizontal gradient, A = filled glyph
   }
   float edge = outlineAt(uv);
   vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0);
   float cloud = noise(p * 5.0 + vec2(uTime * 0.045, -uTime * 0.03));
   cloud += noise(p * 15.0 - uTime * 0.02) * 0.3;
   float grain = hash(gl_FragCoord.xy) - 0.5;
   float gradient = smoothstep(0.12, 1.1, mask.r + (cloud - 0.6) * 0.6);
   vec3 ink = mix(uColor, uColor * 0.035, gradient) * (0.82 + cloud * 0.24);
   ink = max(vec3(0.0), ink + grain * 0.19);

   // Tiny four-point highlights remain clipped to filled letters.
   vec2 grid = p * 135.0;
   vec2 cell = floor(grid), q = fract(grid) - 0.5;
   float seed = hash(cell);
   float twinkle = pow(max(0.0, sin(uTime * (0.8 + seed) + seed * 79.0)), 12.0);
   float star = exp(-length(q) * 23.0);
   star += 0.45 * exp(-abs(q.x) * 70.0 - abs(q.y) * 12.0);
   star += 0.45 * exp(-abs(q.y) * 70.0 - abs(q.x) * 12.0);
   ink += vec3(1.0, 0.91, 1.0) * star * step(0.955, seed) * twinkle * 2.0;

   float ghost = 0.0;
   for (int i = 0; i < 12; i++) {
     vec4 trace = uGhosts[i];
     if (trace.z > 0.001) {
       vec2 delta = (uv - trace.xy - uCenters[i]) * vec2(uResolution.x / uResolution.y, 1.0);
       float brush = mix(1.0, exp(-dot(delta, delta) * 7.0), trace.w);
       float impression = outlineAt(uv - trace.xy) * trace.z * brush;
       ghost = 1.0 - (1.0 - ghost) * (1.0 - impression);
     }
   }
   float alpha = mask.a + edge * (1.0 - mask.a);
   vec3 artwork = mix(ink, uColor, edge) * alpha;
   vec3 ghostColor = mix(uColor, vec3(0.72, 0.76, 1.0), 0.25);
   gl_FragColor = vec4(artwork + ghostColor * ghost * (1.0 - alpha), alpha + ghost * (1.0 - alpha));
 }
`;
