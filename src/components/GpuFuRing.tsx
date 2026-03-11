import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// GPGPU SHADERS (Position & Velocity Simulation)
// ---------------------------------------------------------------------------

const SIMULATION_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const POSITION_FRAGMENT_SHADER = `
  uniform sampler2D uCurrentPos;
  uniform sampler2D uCurrentVel;
  uniform float uDeltaTime;
  varying vec2 vUv;

  void main() {
    vec3 pos = texture2D(uCurrentPos, vUv).xyz;
    vec3 vel = texture2D(uCurrentVel, vUv).xyz;
    pos += vel * uDeltaTime;
    gl_FragColor = vec4(pos, 1.0);
  }
`;

const VELOCITY_FRAGMENT_SHADER = `
  uniform sampler2D uCurrentPos;
  uniform sampler2D uCurrentVel;
  uniform float uTime;
  uniform float uSignals[12];
  uniform float uSpikeIntensity;
  uniform float uDeltaTime;
  varying vec2 vUv;

  #define PI 3.14159265359

  // Helper for random values per particle based on UV
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec3 pos = texture2D(uCurrentPos, vUv).xyz;
    vec3 vel = texture2D(uCurrentVel, vUv).xyz;
    float pId = hash(vUv); // Individual "personality" of the particle

    float angle = atan(pos.y, pos.x) + PI;
    float dist = length(pos.xy);
    
    // 1. Get Target Ring Shape from Signals
    float normalizedAngle = (angle / (2.0 * PI)) * 12.0;
    int idx = int(floor(normalizedAngle)) % 12;
    float targetR = 0.5 + (uSignals[idx] * 0.5);
    
    // 2. Swarm Dynamics: Circular Attraction
    vec3 targetPos = vec3(cos(angle) * targetR, sin(angle) * targetR, 0.0);
    vec3 force = (targetPos - pos) * 2.5;

    // 3. Noise / Brownian Motion (Fish school effect)
    force.x += sin(uTime * 2.0 + pos.y * 10.0 + pId * 10.0) * 0.2;
    force.y += cos(uTime * 2.0 + pos.x * 10.0 + pId * 10.0) * 0.2;

    // 4. Transit Spikes (Divergence)
    if(uSpikeIntensity > 0.1) {
        float spikeTrigger = pow(abs(sin(angle * 5.0 + uTime)), 20.0);
        force += normalize(pos) * spikeTrigger * uSpikeIntensity * 5.0;
    }

    // Apply damping
    vel += force * uDeltaTime;
    vel *= 0.96;

    gl_FragColor = vec4(vel, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// RENDER SHADERS (Visualization)
// ---------------------------------------------------------------------------

const RENDER_VERTEX_SHADER = `
  uniform sampler2D uPosTex;
  uniform float uPointSize;
  varying float vDist;
  varying vec2 vUv;

  void main() {
    vec3 pos = texture2D(uPosTex, uv).xyz;
    vDist = length(pos.xy);
    vUv = uv;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Depth-based size
    gl_PointSize = uPointSize * (1.0 / -mvPosition.z);
  }
`;

const RENDER_FRAGMENT_SHADER = `
  varying float vDist;
  varying vec2 vUv;
  uniform vec3 uColor;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if(d > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.0, d) * 0.6;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// REACT COMPONENT
// ---------------------------------------------------------------------------

interface GpuFuRingProps {
  signals: number[];
  size?: number;
  spikeIntensity?: number;
  color?: string;
}

export default function GpuFuRing({
  signals,
  size = 600,
  spikeIntensity = 0,
  color = '#D4AF37'
}: GpuFuRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Simulation params
  const texSize = 256; // 128x128 = 16k particles, 256x256 = 65k particles
  const particleCount = texSize * texSize;

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.01, 100);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(size, size);
    containerRef.current.appendChild(renderer.domElement);

    // 1. Initialize FBOs for Ping-Pong
    const createFBO = () => new THREE.WebGLRenderTarget(texSize, texSize, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });

    let posA = createFBO(), posB = createFBO();
    let velA = createFBO(), velB = createFBO();

    // Fill initial position data
    const initialPosData = new Float32Array(particleCount * 4);
    for(let i=0; i<particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      initialPosData[i*4] = Math.cos(angle) * 0.5;
      initialPosData[i*4+1] = Math.sin(angle) * 0.5;
      initialPosData[i*4+2] = (Math.random() - 0.5) * 0.1;
      initialPosData[i*4+3] = 1;
    }
    const initialPosTex = new THREE.DataTexture(initialPosData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    initialPosTex.needsUpdate = true;

    // 2. Simulation Materials
    const simScene = new THREE.Scene();
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    simScene.add(simQuad);

    const posMat = new THREE.ShaderMaterial({
      uniforms: { uCurrentPos: { value: initialPosTex }, uCurrentVel: { value: null }, uDeltaTime: { value: 0 } },
      vertexShader: SIMULATION_VERTEX_SHADER,
      fragmentShader: POSITION_FRAGMENT_SHADER
    });

    const velMat = new THREE.ShaderMaterial({
      uniforms: { 
        uCurrentPos: { value: initialPosTex }, 
        uCurrentVel: { value: null }, 
        uTime: { value: 0 }, 
        uSignals: { value: signals },
        uSpikeIntensity: { value: spikeIntensity },
        uDeltaTime: { value: 0 }
      },
      vertexShader: SIMULATION_VERTEX_SHADER,
      fragmentShader: VELOCITY_FRAGMENT_SHADER
    });

    // 3. Render Setup
    const renderGeo = new THREE.BufferGeometry();
    const uvs = new Float32Array(particleCount * 2);
    for(let i=0; i<texSize; i++) {
      for(let j=0; j<texSize; j++) {
        uvs[(i*texSize+j)*2] = i/texSize;
        uvs[(i*texSize+j)*2+1] = j/texSize;
      }
    }
    renderGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
    renderGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const renderMat = new THREE.ShaderMaterial({
      uniforms: { uPosTex: { value: null }, uPointSize: { value: 12.0 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: RENDER_VERTEX_SHADER,
      fragmentShader: RENDER_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(renderGeo, renderMat);
    scene.add(points);

    // 4. Loop
    let raf: number;
    const clock = new THREE.Clock();
    
    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Update Velocity
      simQuad.material = velMat;
      velMat.uniforms.uCurrentPos.value = posA.texture;
      velMat.uniforms.uCurrentVel.value = velA.texture;
      velMat.uniforms.uTime.value = time;
      velMat.uniforms.uSignals.value = signals;
      velMat.uniforms.uSpikeIntensity.value = spikeIntensity;
      velMat.uniforms.uDeltaTime.value = dt;
      renderer.setRenderTarget(velB);
      renderer.render(simScene, simCamera);

      // Update Position
      simQuad.material = posMat;
      posMat.uniforms.uCurrentPos.value = posA.texture;
      posMat.uniforms.uCurrentVel.value = velB.texture;
      posMat.uniforms.uDeltaTime.value = dt;
      renderer.setRenderTarget(posB);
      renderer.render(simScene, simCamera);

      // Final Render
      renderer.setRenderTarget(null);
      renderMat.uniforms.uPosTex.value = posB.texture;
      renderMat.uniforms.uColor.value.set(color);
      renderer.render(scene, camera);

      // Swap buffers
      [posA, posB] = [posB, posA];
      [velA, velB] = [velB, velA];

      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      posA.dispose(); posB.dispose();
      velA.dispose(); velB.dispose();
      renderGeo.dispose();
      renderMat.dispose();
      posMat.dispose();
      velMat.dispose();
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [size]); // Re-init only on size change

  // Direct uniform updates for reactivity without re-init
  // (In a production version, we'd use refs to avoid this useEffect overhead)
  
  return <div ref={containerRef} style={{ width: size, height: size, background: 'radial-gradient(circle, #050a10 0%, #000 100%)', borderRadius: '50%' }} />;
}
