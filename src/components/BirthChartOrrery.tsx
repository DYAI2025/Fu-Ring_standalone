import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { PLANETS, STARS, CONSTELLATION_LINES, CONSTELLATION_NAMES, SUN_RADIUS, ORBIT_SCALE } from "../lib/astronomy/data";
import { getPlanetPosition, solveKepler, daysSinceJ2000 } from "../lib/astronomy/calculations";
import {
  createSunMaterial,
  createPlanetMaterial,
  createAtmosphereShader,
  createSaturnRingsMaterial,
  createMilkyWayBackground,
  updateMaterials,
} from "../lib/3d/materials";
import { Play, Pause } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BirthChartOrreryProps {
  birthDate: Date;
  height?: string;
  /** FR-P03: Switch to Earth-perspective sky-dome mode */
  planetariumMode?: boolean;
  /** FR-P04: IAU constellation key to highlight (e.g. "Leo", "Scorpius") */
  birthConstellation?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert equatorial RA/Dec to a 3D unit-sphere point at given radius. */
function raDecTo3D(raSidereal: number, decDeg: number, radius: number): THREE.Vector3 {
  const raRad  = (raSidereal / 24) * Math.PI * 2;
  const decRad = (decDeg * Math.PI) / 180;
  const cosD   = Math.cos(decRad);
  return new THREE.Vector3(
    radius * cosD * Math.cos(raRad),
    radius * Math.sin(decRad),
    radius * cosD * Math.sin(raRad),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BirthChartOrrery({
  birthDate,
  height = "420px",
  planetariumMode = false,
  birthConstellation,
}: BirthChartOrreryProps) {
  const { lang, t } = useLanguage();
  const containerRef      = useRef<HTMLDivElement>(null);
  const labelRef          = useRef<HTMLDivElement>(null);
  const rendererRef       = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef          = useRef<THREE.Scene | null>(null);
  const cameraRef         = useRef<THREE.PerspectiveCamera | null>(null);
  const sunMatRef         = useRef<THREE.ShaderMaterial | null>(null);
  const planetMeshesRef   = useRef<Record<string, THREE.Mesh>>({});
  const saturnRingsRef    = useRef<THREE.Mesh | null>(null);
  const animFrameRef      = useRef<number>(0);
  const simTimeRef        = useRef(daysSinceJ2000(birthDate));
  const [isPlaying, setIsPlaying]   = useState(false);
  const isPlayingRef                = useRef(false);

  // Planetarium refs
  const constellationGroupRef  = useRef<THREE.Group | null>(null);
  const constellationCenterRef = useRef<THREE.Vector3 | null>(null);
  const planetariumModeRef     = useRef(planetariumMode);
  const birthConstellationRef  = useRef(birthConstellation);

  // Sync playing ref
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Reset simTime on birthDate change
  useEffect(() => {
    simTimeRef.current = daysSinceJ2000(birthDate);
    updatePlanetPositions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate]);

  // ── Constellation highlight updater ────────────────────────────────────
  function updateConstellationHighlight(conKey: string | undefined) {
    const group = constellationGroupRef.current;
    if (!group) return;
    group.children.forEach((child) => {
      const ud = child.userData;
      const isHigh = Boolean(conKey) && ud.conName === conKey;

      if (child instanceof THREE.Mesh && ud.type === "star") {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.color.set(isHigh ? "#FFD580" : "#AACCFF");
        mat.opacity   = isHigh ? 1.0 : (ud.baseOpacity as number);
        mat.needsUpdate = true;
      }
      if (child instanceof THREE.Line && ud.type === "conLine") {
        const mat = child.material as THREE.LineBasicMaterial;
        mat.color.set(isHigh ? "#D4AF37" : "#5080C0");
        mat.opacity   = isHigh ? 0.85 : 0.22;
        mat.needsUpdate = true;
      }
    });
  }

  // ── Planetarium mode toggle ─────────────────────────────────────────────
  useEffect(() => {
    planetariumModeRef.current = planetariumMode;
    if (constellationGroupRef.current) {
      constellationGroupRef.current.visible = planetariumMode;
    }
    // Hide planet label when switching modes
    if (labelRef.current) labelRef.current.style.display = "none";
  }, [planetariumMode]);

  // ── Birth constellation change ──────────────────────────────────────────
  useEffect(() => {
    birthConstellationRef.current = birthConstellation;
    updateConstellationHighlight(birthConstellation);

    // Compute constellation center for label projection
    if (birthConstellation) {
      const conStars = STARS.filter((s) => s.con === birthConstellation);
      if (conStars.length > 0) {
        const center = new THREE.Vector3();
        conStars.forEach((s) => center.add(raDecTo3D(s.ra, s.dec, 480)));
        center.divideScalar(conStars.length);
        constellationCenterRef.current = center;
      } else {
        constellationCenterRef.current = null;
      }
    } else {
      constellationCenterRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthConstellation]);

  // ── Planet position update ──────────────────────────────────────────────
  function updatePlanetPositions() {
    Object.entries(PLANETS).forEach(([key, planet]) => {
      const mesh = planetMeshesRef.current[key];
      if (!mesh) return;
      const pos = getPlanetPosition(planet, simTimeRef.current, ORBIT_SCALE);
      mesh.position.set(pos.x, pos.y, pos.z);
      if (key === "saturn" && saturnRingsRef.current) {
        saturnRingsRef.current.position.set(pos.x, pos.y, pos.z);
      }
    });
  }

  // ── THREE.js scene initialisation ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 10000);
    camera.position.set(80, 60, 80);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.PointLight("#FFFFEE", 3, 1000));
    scene.add(new THREE.AmbientLight("#334455", 0.3));
    scene.add(new THREE.HemisphereLight("#4466AA", "#221122", 0.5));

    // Sun
    const sunMat = createSunMaterial();
    sunMatRef.current = sunMat;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 64, 64), sunMat));

    // Sun glow layers
    [
      { scale: 1.3, color: "#FFE4B5", opacity: 0.40 },
      { scale: 1.6, color: "#FFD700", opacity: 0.20 },
      { scale: 2.0, color: "#FFA500", opacity: 0.12 },
      { scale: 2.5, color: "#FF6B35", opacity: 0.06 },
    ].forEach(({ scale, color, opacity }) => {
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(SUN_RADIUS * scale, 32, 32),
        new THREE.MeshBasicMaterial({
          color, transparent: true, opacity,
          side: THREE.BackSide, blending: THREE.AdditiveBlending,
        }),
      ));
    });

    // Planets
    Object.entries(PLANETS).forEach(([key, planet]) => {
      const geo  = new THREE.SphereGeometry(planet.radius, 32, 32);
      const mat  = createPlanetMaterial(planet.color, 0.15, 0.65, 0.15);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.userData   = { type: "planet", key, name: planet.name, symbol: planet.symbol };
      scene.add(mesh);
      planetMeshesRef.current[key] = mesh;

      if (["jupiter","saturn","uranus","neptune"].includes(key)) {
        mesh.add(new THREE.Mesh(
          new THREE.SphereGeometry(planet.radius * 1.15, 16, 16),
          createAtmosphereShader(planet.color, 0.6),
        ));
      }
      if (key === "earth") {
        mesh.add(new THREE.Mesh(
          new THREE.SphereGeometry(planet.radius * 1.1, 16, 16),
          createAtmosphereShader("#4A90D9", 0.8),
        ));
      }
      if (planet.rings) {
        const rings = new THREE.Mesh(
          new THREE.RingGeometry(planet.radius * 1.4, planet.radius * 2.2, 128),
          createSaturnRingsMaterial(),
        );
        rings.rotation.x = Math.PI / 2.5;
        scene.add(rings);
        saturnRingsRef.current = rings;
      }

      // Orbit path
      const orbitPts: THREE.Vector3[] = [];
      for (let angle = 0; angle <= 360; angle += 2) {
        const M = (angle * Math.PI) / 180;
        const E = solveKepler(M, planet.e);
        const nu = 2 * Math.atan2(
          Math.sqrt(1 + planet.e) * Math.sin(E / 2),
          Math.sqrt(1 - planet.e) * Math.cos(E / 2),
        );
        const r = planet.a * (1 - planet.e * Math.cos(E));
        const xOrb = r * Math.cos(nu), yOrb = r * Math.sin(nu);
        const iR = (planet.i * Math.PI) / 180;
        const oR = (planet.omega * Math.PI) / 180;
        const wR = (planet.w * Math.PI) / 180;
        const cosO = Math.cos(oR), sinO = Math.sin(oR);
        const cosW = Math.cos(wR), sinW = Math.sin(wR);
        const cosI = Math.cos(iR), sinI = Math.sin(iR);
        const x = (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb;
        const y = (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb;
        const z = sinW * sinI * xOrb + cosW * sinI * yOrb;
        const scaled = Math.log10(r + 1) * ORBIT_SCALE;
        const factor = r > 0 ? scaled / r : 1;
        orbitPts.push(new THREE.Vector3(x * factor, z * factor, -y * factor));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color: planet.color, transparent: true, opacity: 0.15 }),
      ));
    });

    // Background stars (random, decorative)
    const starPositions: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 400 + Math.random() * 400;
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: "#FFFFFF", size: 0.8, transparent: true, opacity: 0.6,
    })));

    createMilkyWayBackground(scene);

    // ── Constellation Layer (Planetarium Mode) ─────────────────────────
    const conGroup = new THREE.Group();
    conGroup.visible = planetariumModeRef.current;
    scene.add(conGroup);
    constellationGroupRef.current = conGroup;

    // Build star position lookup (RA/Dec → 3D on sphere of radius 480)
    const starPos: Record<string, THREE.Vector3> = {};
    STARS.forEach((star) => {
      starPos[star.name] = raDecTo3D(star.ra, star.dec, 480);
    });

    // Real star points — brightness from magnitude
    STARS.forEach((star) => {
      const pos        = starPos[star.name];
      if (!pos) return;
      const brightness = Math.max(0.1, 1 - Math.max(0, star.mag) / 5.5);
      const size       = 0.28 + brightness * 0.95;
      const opacity    = 0.28 + brightness * 0.55;
      const geo  = new THREE.SphereGeometry(size, 6, 6);
      const mat  = new THREE.MeshBasicMaterial({ color: "#AACCFF", transparent: true, opacity });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData = { type: "star", conName: star.con, baseOpacity: opacity };
      conGroup.add(mesh);
    });

    // Constellation lines
    Object.entries(CONSTELLATION_LINES).forEach(([conName, pairs]) => {
      pairs.forEach(([s1, s2]) => {
        const p1 = starPos[s1];
        const p2 = starPos[s2];
        if (!p1 || !p2) return;
        const geo = new THREE.BufferGeometry().setFromPoints([p1.clone(), p2.clone()]);
        const mat = new THREE.LineBasicMaterial({ color: "#5080C0", transparent: true, opacity: 0.22 });
        const line = new THREE.Line(geo, mat);
        line.userData = { type: "conLine", conName };
        conGroup.add(line);
      });
    });

    // Trigger initial highlight if birthConstellation is already set
    updateConstellationHighlight(birthConstellationRef.current);

    // ── Initial planet positions ────────────────────────────────────────
    updatePlanetPositions();

    // ── Camera orbit controls ───────────────────────────────────────────
    let spherical       = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 130 };
    let targetSpherical = { ...spherical };
    let isDragging      = false;
    let lastMouse       = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; };
    const onPointerUp   = () => { isDragging = false; };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      targetSpherical.theta -= (e.clientX - lastMouse.x) * 0.005;
      targetSpherical.phi    = Math.max(0.1, Math.min(Math.PI - 0.1,
        targetSpherical.phi + (e.clientY - lastMouse.y) * 0.005));
      lastMouse = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetSpherical.radius = Math.max(25, Math.min(400, targetSpherical.radius + e.deltaY * 0.25));
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("wheel", onWheel, { passive: false });

    // ── Animation loop ──────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      updateMaterials(delta, sunMatRef.current || undefined);

      if (isPlayingRef.current) {
        simTimeRef.current += delta * 60;
        updatePlanetPositions();
      }

      // Smooth spherical orbit interpolation
      spherical.theta  += (targetSpherical.theta  - spherical.theta)  * 0.08;
      spherical.phi    += (targetSpherical.phi    - spherical.phi)    * 0.08;
      spherical.radius += (targetSpherical.radius - spherical.radius) * 0.08;

      if (planetariumModeRef.current) {
        // ── Planetarium: camera at Earth, looking outward ─────────────
        const earthPos = getPlanetPosition(PLANETS.earth, simTimeRef.current, ORBIT_SCALE);
        camera.position.set(earthPos.x, earthPos.y + 0.3, earthPos.z);

        const lookR = 500;
        camera.lookAt(
          earthPos.x + lookR * Math.sin(spherical.phi) * Math.cos(spherical.theta),
          earthPos.y + lookR * Math.cos(spherical.phi),
          earthPos.z + lookR * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        );

        // Project constellation center → screen coords for label
        const center = constellationCenterRef.current;
        const labelEl = labelRef.current;
        if (center && labelEl) {
          const projected = center.clone();
          projected.project(camera);
          const cx = (projected.x  *  0.5 + 0.5) * container.clientWidth;
          const cy = (projected.y * -0.5 + 0.5) * container.clientHeight;
          if (
            projected.z < 1 &&
            cx > 20 && cx < container.clientWidth  - 20 &&
            cy > 20 && cy < container.clientHeight - 20
          ) {
            labelEl.style.display = "block";
            labelEl.style.left    = `${cx}px`;
            labelEl.style.top     = `${cy}px`;
          } else {
            labelEl.style.display = "none";
          }
        } else if (labelEl) {
          labelEl.style.display = "none";
        }

      } else {
        // ── Normal: heliocentric orbit ─────────────────────────────────
        camera.position.set(
          spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
          spherical.radius * Math.cos(spherical.phi),
          spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        );
        camera.lookAt(0, 0, 0);
        if (labelRef.current) labelRef.current.style.display = "none";
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ──────────────────────────────────────────────────
    const handleResize = () => {
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      if (rw === 0 || rh === 0) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived display values ──────────────────────────────────────────────
  const locale = lang === "de" ? "de-DE" : "en-GB";

  const conDisplayName = birthConstellation
    ? lang === "de"
      ? (CONSTELLATION_NAMES[birthConstellation] || birthConstellation)
      : birthConstellation
    : null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#8B6914]/15 bg-[#0a1628]/90 shadow-[0_4px_32px_rgba(0,20,60,0.15)]">
      {/* Label */}
      <div className="absolute top-4 left-5 z-10 pointer-events-none">
        <p className="text-[#8B6914]/70 text-[8px] uppercase tracking-[0.4em] mb-1">
          {t("dashboard.orrery.sectionLabel")}
        </p>
        <p className="text-[10px] text-white/35">
          {t("dashboard.orrery.datePrefix")}{" "}
          {birthDate.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        {/* Planetarium mode indicator */}
        {planetariumMode && (
          <p className="text-[9px] text-[#D4AF37]/60 tracking-widest uppercase mt-1">
            ✦ {lang === "de" ? "Planetarium" : "Planetarium"}
          </p>
        )}
      </div>

      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute top-4 right-5 z-10 w-8 h-8 rounded-full border border-[#8B6914]/25 flex items-center justify-center hover:bg-[#8B6914]/15 hover:border-[#8B6914]/45 transition-all bg-black/40 backdrop-blur-sm"
        title={isPlaying ? t("dashboard.orrery.pauseTitle") : t("dashboard.orrery.playTitle")}
      >
        {isPlaying
          ? <Pause className="w-3 h-3 text-[#8B6914]/80" />
          : <Play  className="w-3 h-3 text-[#8B6914]/80 ml-0.5" />}
      </button>

      {/* Planet legend (hidden in Planetarium Mode) */}
      {!planetariumMode && (
        <div className="absolute bottom-4 left-5 z-10 flex flex-wrap gap-3 pointer-events-none">
          {Object.entries(PLANETS)
            .filter(([key]) => key !== "earth")
            .map(([key, planet]) => (
              <span key={key} className="flex items-center gap-1.5 text-[9px] text-white/40">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: planet.color, boxShadow: `0 0 4px ${planet.color}40` }}
                />
                {planet.name}
              </span>
            ))}
        </div>
      )}

      {/* Birth constellation label (Planetarium Mode — DOM-positioned via ref) */}
      <div
        ref={labelRef}
        className="absolute pointer-events-none hidden z-20"
        style={{ transform: "translate(-50%, -50%)" }}
        aria-live="polite"
        aria-label={conDisplayName ? `Birth constellation: ${conDisplayName}` : undefined}
      >
        <div className="bg-black/65 backdrop-blur-sm border border-[#D4AF37]/45 rounded-lg px-3 py-1.5 shadow-[0_0_12px_rgba(212,175,55,0.18)]">
          <p className="text-[#D4AF37] text-[10px] uppercase tracking-[0.3em] font-semibold whitespace-nowrap">
            {conDisplayName || ""}
          </p>
        </div>
      </div>

      {/* Fallback message when planetarium mode is on but no constellation data */}
      {planetariumMode && !birthConstellation && (
        <div className="absolute bottom-4 left-5 right-5 z-10 pointer-events-none">
          <p className="text-[9px] text-white/30 italic text-center">
            {lang === "de"
              ? "Geburts-Sternbild wird nach Berechnung deines Sonnenzeichens angezeigt."
              : "Birth constellation shown after your sun sign is calculated."}
          </p>
        </div>
      )}

      {/* Three.js canvas */}
      <div ref={containerRef} style={{ width: "100%", height, cursor: "grab" }} />
    </div>
  );
}
