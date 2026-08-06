#version 300 es
precision highp float;

#include "@motion-canvas/core/shaders/common.glsl"

uniform vec4 _Color0;
uniform vec4 _Color1;
uniform float _Number;
uniform float _Random;

vec2 hash(vec2 p) {
    p += vec2(_Random);
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 18.5453);
}

float cellDist(vec2 cell, vec2 offset, vec2 uv) {
    vec2 h = hash(cell + offset);
    vec2 r = offset - uv + (0.5 + 0.5 * sin(time * 0.3 + 6.1831 * h));
    return dot(r, r);
}

float mixAmount(vec2 uv) {
    vec2 cell = floor(uv);
    uv = fract(uv);
    float m = 0.0;
    m += cellDist(cell, vec2(-1.0, -1.0), uv);
    m += cellDist(cell, vec2( 0.0, -1.0), uv);
    m += cellDist(cell, vec2( 1.0, -1.0), uv);
    m += cellDist(cell, vec2(-1.0,  0.0), uv);
    m += cellDist(cell, vec2( 0.0,  0.0), uv);
    m += cellDist(cell, vec2( 1.0,  0.0), uv);
    m += cellDist(cell, vec2(-1.0,  1.0), uv);
    m += cellDist(cell, vec2( 0.0,  1.0), uv);
    m += cellDist(cell, vec2( 1.0,  1.0), uv);
    return sqrt(m);
}

void main() {
    vec2 uv = (sourceUV - vec2(0.5)) * vec2(resolution.x / resolution.y, 1.0);
    float m = mixAmount(_Number * uv);
    outColor = mix(_Color1, _Color0, clamp(m / 5.0, 0.0, 1.0));
}