#define PI 3.14159265359
#define TAU 6.28318530718

uniform float uTime;
uniform vec3 uColors[12];
uniform float uPulseIntensity;
uniform float uKpIndex;
uniform float uGlowBlur;
uniform vec3 uCameraPos;
uniform float uOpacityScale;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
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

// 4-octave FBM using sin/cos — GPU-friendly, no texture lookups
float fbm(vec2 p) {
  float val = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  float ox = 0.0;
  for (int i = 0; i < 4; i++) {
    val += amp * sin(p.x * freq + uTime * 0.10 + ox)
               * cos(p.y * freq * 1.3 + uTime * 0.07);
    ox  += 1.7;
    freq *= 2.1;
    amp  *= 0.5;
  }
  return val * 0.5 + 0.5;
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
    amp  *= 0.55;
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

  // ── Tube cross-section shading ────────────────────────────────
  // vUv.y runs 0→1 around the tube cross-section.
  // Map to a signed distance from tube centre for 3D volume lighting.
  float tubeDist = abs(vUv.y - 0.5) * 2.0;   // 0 at tube centre, 1 at edges

  // Specular highlight band — bright stripe along the tube centre gives
  // the "glass pipe" look seen in the reference images.
  float tubeHighlight = pow(1.0 - tubeDist, 3.0);       // strong centre
  float tubeRim       = pow(tubeDist, 2.5) * 0.55;      // subtle bright rim at edges

  // Soft edge mask — keeps the tube edges from hard-clipping
  float edgeMask = smoothstep(1.0, 0.25, tubeDist);

  // ── Domain-warped caustics ────────────────────────────────────
  vec2 warpOffset = vec2(
    fbm(vUv * 3.0 + vec2(1.7, 9.2)) - 0.5,
    fbm(vUv * 3.0 + vec2(8.3, 2.8)) - 0.5
  ) * 0.14;
  vec2 warpedUV = vUv + warpOffset;
  float caustics = causticsNoise(warpedUV * 4.0, uTime) * 0.30;

  float signalGlow = max(0.0, vSignalStrength) * 1.4;
  float spaceNoise = hash(vUv * 16.0 + uTime * 0.2) * clamp(uKpIndex / 9.0, 0.0, 1.0);

  // ── Fresnel iridescence ───────────────────────────────────────
  vec3 viewDir = normalize(uCameraPos - vWorldPos);
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, normalize(vNormal))), 3.0);
  vec3 iridescent = vec3(baseColor.b, baseColor.r, baseColor.g) * fresnel * 0.45;

  // ── Energy arc — bright band travelling around the ring ───────
  float arcPhase = vSectorIndex / 12.0 * TAU - uTime * 1.8;
  float arcBand  = pow(max(0.0, sin(arcPhase)), 12.0);
  vec3 arcColor  = baseColor * 2.0 * arcBand * (0.4 + max(0.0, vSignalStrength) * 0.6);

  // ── Compose ───────────────────────────────────────────────────
  // Core brightness uses tube highlight to give 3D volume
  float coreBrightness = 0.45 + tubeHighlight * 0.55 + signalGlow * 0.6 + caustics;
  vec3 pulseColor = vec3(1.0) * uPulseIntensity;

  vec3 color = baseColor * coreBrightness
             + baseColor * tubeRim
             + pulseColor
             + iridescent
             + arcColor;
  color += vec3(spaceNoise * 0.15);

  // ── Alpha: tube structure visible, edges fade naturally ───────
  // Higher base opacity so the tube reads as a solid glowing object,
  // not a fuzzy glow blob. Edges taper off via edgeMask.
  float alpha = (0.50 + edgeMask * 0.50) + signalGlow * 0.12;
  alpha = min(1.0, alpha + spaceNoise * 0.1);

  float blurNorm   = clamp(uGlowBlur / 40.0, 0.0, 1.0);
  float glowFalloff = smoothstep(0.0, blurNorm, edgeMask);
  alpha *= glowFalloff * uOpacityScale;

  gl_FragColor = vec4(color, alpha);
}
