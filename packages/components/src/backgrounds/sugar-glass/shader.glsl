#version 300 es
precision highp float;

#include "@motion-canvas/core/shaders/common.glsl"

uniform float _CrackSpeed;
uniform float _LightBleed;
uniform float _Density;
uniform float _CrackWidth;

uniform vec4 _Color0;
uniform vec4 _Color1;
uniform vec4 _DarkColor;
uniform vec4 _CrackColor;
uniform vec4 _CrackHighlight;
uniform vec4 _RefractColor;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 voronoi(vec2 p, float t) {
    vec2 n = floor(p);
    vec2 f = fract(p);

    float minDist = 8.0;
    vec2 nearestCell = vec2(0.0);
    vec2 nearestPoint = vec2(0.0);

    vec2 g;
    vec2 o;
    vec2 diff;
    float d;

    g = vec2(-1.0, -1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }
    g = vec2(0.0, -1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }
    g = vec2(1.0, -1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }

    g = vec2(-1.0, 0.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }
    g = vec2(0.0, 0.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }
    g = vec2(1.0, 0.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }

    g = vec2(-1.0, 1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }
    g = vec2(0.0, 1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }
    g = vec2(1.0, 1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearestCell = n + g; nearestPoint = diff; }

    float minEdge = 8.0;

    g = vec2(-1.0, -1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }
    g = vec2(0.0, -1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }
    g = vec2(1.0, -1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }

    g = vec2(-1.0, 0.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }
    g = vec2(0.0, 0.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }
    g = vec2(1.0, 0.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }

    g = vec2(-1.0, 1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }
    g = vec2(0.0, 1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }
    g = vec2(1.0, 1.0); o = hash2(n + g) * 0.5 + 0.25; o = 0.5 + 0.4 * sin(t * 0.3 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearestPoint, diff - nearestPoint) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearestPoint + diff), normalize(diff - nearestPoint))); }

    float cellId = hash1(nearestCell);
    return vec3(sqrt(minDist), minEdge, cellId);
}

float voronoiEdge(vec2 p, float t) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float minDist = 8.0;
    vec2 nearPt = vec2(0.0);
    vec2 g; vec2 o; vec2 diff; float d;

    g = vec2(-1.0, -1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(0.0, -1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(1.0, -1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(-1.0, 0.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(0.0, 0.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(1.0, 0.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(-1.0, 1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(0.0, 1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }
    g = vec2(1.0, 1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f; d = dot(diff, diff);
    if (d < minDist) { minDist = d; nearPt = diff; }

    float minEdge = 8.0;
    g = vec2(-1.0, -1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(0.0, -1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(1.0, -1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(-1.0, 0.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(0.0, 0.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(1.0, 0.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(-1.0, 1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(0.0, 1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }
    g = vec2(1.0, 1.0); o = hash2(n + g); o = 0.5 + 0.35 * sin(t * 0.5 + 6.2831 * o); diff = g + o - f;
    if (dot(diff - nearPt, diff - nearPt) > 0.001) { minEdge = min(minEdge, dot(0.5 * (nearPt + diff), normalize(diff - nearPt))); }

    return minEdge;
}

void main() {
    vec2 p = (sourceUV - vec2(0.5)) * vec2(resolution.x / resolution.y, 1.0);

    float t = time * _CrackSpeed;

    vec2 shimmer = vec2(
        sin(p.y * 12.0 + t * 2.3) * 0.003,
        cos(p.x * 10.0 + t * 1.7) * 0.003
    );
    p += shimmer;

    vec2 macroUV = p * (3.5 * _Density) + 0.5;
    vec3 macro = voronoi(macroUV, t);
    float macroCenterDist = macro.x;
    float macroEdge = macro.y;
    float cellId = macro.z;

    float microEdge = voronoiEdge(p * (9.0 * _Density) + vec2(3.7, 1.2), t * 0.7);

    float crackPulse = 0.5 + 0.3 * sin(t * 1.5) + 0.2 * sin(t * 2.7 + 1.0);
    float macroCrackWidth = 0.04 * crackPulse * _CrackWidth;
    float microCrackWidth = 0.025 * crackPulse * _CrackWidth;

    float macroCrack = 1.0 - smoothstep(0.0, macroCrackWidth, macroEdge);
    float microCrack = 1.0 - smoothstep(0.0, microCrackWidth, microEdge);

    float crack = clamp(macroCrack + microCrack * 0.4, 0.0, 1.0);

    float macroGlow = 1.0 - smoothstep(0.0, macroCrackWidth * 4.0, macroEdge);
    float microGlow = 1.0 - smoothstep(0.0, microCrackWidth * 3.0, microEdge);
    float glow = macroGlow * 0.7 + microGlow * 0.3;

    float cellThickness = 0.6 + 0.4 * cellId;
    float cellHueShift = cellId * 0.3;

    vec3 glassColor = mix(_Color0.rgb, _Color1.rgb, cellHueShift);
    glassColor = mix(_DarkColor.rgb, glassColor, cellThickness);

    float cellGrad = smoothstep(0.0, 0.5, macroCenterDist);
    glassColor = mix(glassColor * 1.1, glassColor * 0.85, cellGrad);

    float refractTint = glow * (0.3 + 0.2 * sin(cellId * 12.0 + t * 0.8));
    glassColor = mix(glassColor, _RefractColor.rgb, refractTint * 0.25);

    vec3 lightColor = mix(_CrackColor.rgb, _CrackHighlight.rgb, crack);

    float lightIntensity = crack * _LightBleed;
    float glowIntensity = glow * _LightBleed * 0.5;

    vec3 col = glassColor;
    col = mix(col, lightColor * 0.8, glowIntensity);
    col = mix(col, lightColor, lightIntensity);

    float sss = 0.5 + 0.5 * sin(p.x * 3.0 + t * 0.5) * sin(p.y * 2.5 + t * 0.3);
    col += vec3(0.05, 0.03, 0.01) * sss * cellThickness;

    float vig = 1.0 - dot(p * 0.8, p * 0.8);
    vig = smoothstep(0.0, 1.0, vig);
    col *= 0.6 + 0.4 * vig;

    col = pow(col, vec3(0.95));

    outColor = vec4(col, 1.0);
}