precision highp float;
uniform vec2 iResolution;
uniform float iTime;

// A single mirrored sphere, matching the supplied reference silhouette.
// The original cubemap was not supplied: these warm studio reflections
// approximate its copper room and small, bright rectangular light sources.
float noise(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 room(vec3 r) {
    float broad = 0.5 + 0.5 * sin(r.x * 5.0 + r.z * 3.0);
    float floorLight = (1.0 - smoothstep(-0.85, -0.1, r.y));
    vec3 base = mix(vec3(0.15, 0.052, 0.018), vec3(0.64, 0.25, 0.075), broad);
    base += floorLight * vec3(0.58, 0.26, 0.085);
    float ceiling = pow(max(dot(r, normalize(vec3(-0.2, 0.85, -0.4))), 0.0), 60.0);
    float left = pow(max(dot(r, normalize(vec3(-0.85, 0.15, -0.45))), 0.0), 110.0);
    float spot = pow(max(dot(r, normalize(vec3(0.35, 0.28, -0.9))), 0.0), 200.0);
    return base + (ceiling * 4.5 + left * 4.0 + spot * 6.0) * vec3(1.0, 0.96, 0.82);
}
void main() {
    vec2 p = (2.0 * gl_FragCoord.xy - iResolution) / iResolution.y;
    // Leave a small margin around the complete sphere, including its poles.
    p *= 1.07;
    float radius2 = dot(p, p);
    if (radius2 >= 1.0) { gl_FragColor = vec4(0.0); return; }
    vec3 surface = vec3(p, sqrt(max(0.0, 1.0 - radius2)));
    float rotation = iTime * 0.24;
    float tileSize = 0.145;
    vec2 angles = vec2(atan(surface.z, surface.x) + rotation, acos(clamp(surface.y, -1.0, 1.0)));
    vec2 id = floor(angles / tileSize);
    vec2 cell = fract(angles / tileSize);
    vec2 center = (id + 0.5) * tileSize;
    center.x -= rotation;
    vec3 normal = vec3(sin(center.y) * cos(center.x), cos(center.y), sin(center.y) * sin(center.x));
    vec3 reflection = reflect(vec3(0.0, 0.0, -1.0), normal);
    float variation = noise(id);
    vec3 color = room(reflection) * mix(0.65, 1.3, variation);
    float edge = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
    float grout = smoothstep(0.012, 0.046, edge);
    // Fine dark seams and a thin warm bevel keep every tile readable.
    float bevel = smoothstep(0.018, 0.038, edge) * (1.0 - smoothstep(0.038, 0.075, edge));
    color = mix(vec3(0.012, 0.006, 0.003), color, grout);
    color += bevel * vec3(0.32, 0.23, 0.12);
    float grain = noise(gl_FragCoord.xy + id * 13.7);
    // Polished mirror tiles retain only a trace of surface grain.
    color *= 0.97 + grain * 0.04;
    color *= 0.72 + 0.28 * surface.z;
    color = pow(max(color, vec3(0.0)), vec3(0.78));
    float alpha = 1.0 - smoothstep(1.0 - 3.0 / iResolution.y, 1.0, sqrt(radius2));
    gl_FragColor = vec4(color, alpha);
}
