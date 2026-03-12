#define PI 3.14159265359
#define TAU 6.28318530718

uniform float uTime;
uniform float uSignals[12];
uniform float uBaseRadius;
uniform float uDeformationScale;
uniform float uBreathAmplitude;
uniform float uKpIndex;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vSignalStrength;
varying float vSectorIndex;

float readSignal(int index) {
  float value = 0.0;
  for (int i = 0; i < 12; i++) {
    if (i == index) {
      value = uSignals[i];
    }
  }
  return value;
}

void main() {
  vUv = uv;

  vec3 pos = position;
  float angle = atan(pos.y, pos.x);
  float normalized = mod((angle + PI) / TAU * 12.0, 12.0);

  int idx0 = int(floor(normalized));
  int idx1 = int(mod(float(idx0 + 1), 12.0));
  float blend = smoothstep(0.0, 1.0, fract(normalized));

  float sig0 = readSignal(idx0);
  float sig1 = readSignal(idx1);
  float rawSignal = mix(sig0, sig1, blend);

  float deformedSignal = sign(rawSignal) * pow(abs(rawSignal), 1.5);
  vSignalStrength = deformedSignal;
  vSectorIndex = normalized;

  float breath = sin(uTime * 1.2 + normalized * 0.9) * uBreathAmplitude;
  float stormBoost = max(0.0, uKpIndex - 5.0) * 0.08;

  float totalDeformation = deformedSignal * uDeformationScale + breath + stormBoost;
  pos += normal * totalDeformation;

  // Pass world-space normal for Fresnel in fragment shader
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
