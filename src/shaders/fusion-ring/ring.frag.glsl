#define PI 3.14159265359
#define TAU 6.28318530718

uniform float uTime;
uniform vec3 uColors[12];
uniform float uPulseIntensity;
uniform float uKpIndex;
uniform float uGlowBlur;

varying vec2 vUv;
varying vec3 vWorldPos;
varying float vSignalStrength;
varying float vSectorIndex;

vec3 readColor(int index) {
  vec3 outColor = vec3(1.0);
  for (int i = 0; i < 12; i++) {
    if (i == index) {
      outColor = uColors[i];
    }
  }
  return outColor;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float causticsNoise(vec2 uv, float time) {
  float n = 0.0;
  float freq = 2.5;
  float amp = 0.5;

  for (int i = 0; i < 3; i++) {
    n += sin(uv.x * freq + time * (0.3 + float(i) * 0.2))
      * sin(uv.y * freq + time * (0.25 + float(i) * 0.1))
      * amp;
    freq *= 1.9;
    amp *= 0.55;
  }

  return n * 0.5 + 0.5;
}

void main() {
  int idx0 = int(floor(vSectorIndex));
  int idx1 = int(mod(float(idx0 + 1), 12.0));
  float blend = smoothstep(0.0, 1.0, fract(vSectorIndex));

  vec3 color0 = readColor(idx0);
  vec3 color1 = readColor(idx1);
  vec3 baseColor = mix(color0, color1, blend);

  float tubeEdge = abs(vUv.y - 0.5) * 2.0;
  float edgeMask = smoothstep(1.0, 0.1, tubeEdge);

  float caustics = causticsNoise(vUv * 4.0, uTime) * 0.35;
  float signalGlow = max(0.0, vSignalStrength) * 1.8;
  float spaceNoise = hash(vUv * 16.0 + uTime * 0.2) * clamp(uKpIndex / 9.0, 0.0, 1.0);

  vec3 pulseColor = vec3(1.0) * uPulseIntensity;
  vec3 color = baseColor * (0.7 + signalGlow + caustics) + pulseColor;
  color += vec3(spaceNoise * 0.25);

  float alpha = (0.25 + edgeMask * 0.75) + signalGlow * 0.2;
  alpha = min(1.0, alpha + spaceNoise * 0.2);

  float blurNorm = clamp(uGlowBlur / 40.0, 0.0, 1.0);
  float glowFalloff = smoothstep(0.0, blurNorm, edgeMask);
  alpha *= glowFalloff;

  gl_FragColor = vec4(color, alpha);
}
