
import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { NODES, DIFFICULTY_COLOR, CONTACT } from "./roadmapData.js";

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE: Shared geometries & materials (created once, reused everywhere)
// ─────────────────────────────────────────────────────────────────────────────
const SHARED = {
  boxGeo:    new THREE.BoxGeometry(1, 1, 1),
  octGeo:    new THREE.OctahedronGeometry(0.55, 0),
  torusGeo:  new THREE.TorusGeometry(0.75, 0.02, 6, 40),
  cylGeo:    new THREE.CylinderGeometry(0.02, 0.02, 1, 4),
  sphereGeo: new THREE.SphereGeometry(0.08, 6, 6),
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILD THREE.JS SCENE — AI elements replace planets
// ─────────────────────────────────────────────────────────────────────────────
function buildScene(canvas) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  // Renderer — antialias only if not mobile for 60fps
  const isMobile = W < 768;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  // NO shadowMap — saves huge GPU cost at 60fps

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030712, 0.028);

  const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
  camera.position.set(1, 3, 13);
  camera.lookAt(1, 0, 0);

  // ── Lights ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x111827, 3));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(8, 12, 10);
  scene.add(sun);
  const fillLight = new THREE.PointLight(0x6366f1, 1.5, 30);
  fillLight.position.set(-5, 3, 5);
  scene.add(fillLight);

  // ── Starfield (BufferGeometry — single draw call) ────────────────────────
  const starGeo = new THREE.BufferGeometry();
  const sv = [];
  for (let i = 0; i < 2000; i++) {
    sv.push(
      THREE.MathUtils.randFloatSpread(150),
      THREE.MathUtils.randFloatSpread(100),
      THREE.MathUtils.randFloatSpread(150) - 30
    );
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sv, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.65 })
  );
  scene.add(stars);

  // ── Grid floor ───────────────────────────────────────────────────────────
  const gridHelper = new THREE.GridHelper(60, 40, 0x0f172a, 0x0f172a);
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.25;
  gridHelper.position.y = -3.2;
  scene.add(gridHelper);

  // ── Floating AI elements (circuit-board style) ───────────────────────────
  // These replace "planets" — they are abstract tech shapes
  const floatingAI = [];

  // Helper: circuit node (small box + 3 arms)
  function makeCircuitNode(x, y, z, color) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    // Central box
    const box = new THREE.Mesh(
      SHARED.boxGeo,
      new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.7 })
    );
    box.scale.set(0.22, 0.22, 0.22);
    g.add(box);

    // Arms (3 cylinders radiating outward)
    const angles = [0, Math.PI / 1.5, Math.PI * 4 / 3];
    angles.forEach((angle) => {
      const arm = new THREE.Mesh(
        SHARED.cylGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
      );
      arm.scale.set(1, 0.45, 1);
      arm.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = angle;
      g.add(arm);

      // End dot
      const dot = new THREE.Mesh(
        SHARED.sphereGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
      );
      dot.position.set(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55);
      g.add(dot);
    });

    scene.add(g);
    floatingAI.push({ group: g, rotY: Math.random() * 0.012 + 0.004, rotX: Math.random() * 0.006, baseY: y, phase: Math.random() * Math.PI * 2 });
    return g;
  }

  // Helper: neural ring (torus with dots)
  function makeNeuralRing(x, y, z, color, radius = 1.2) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.015, 6, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
    );
    g.add(ring);

    // Nodes on ring
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dot = new THREE.Mesh(
        SHARED.sphereGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
      );
      dot.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      dot.scale.setScalar(0.7);
      g.add(dot);
    }

    scene.add(g);
    floatingAI.push({ group: g, rotY: Math.random() * 0.008, rotX: Math.random() * 0.01 + 0.005, baseY: y, phase: Math.random() * Math.PI * 2 });
    return g;
  }

  // Helper: hexagonal data block (octahedron)
  function makeDataBlock(x, y, z, color) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const mesh = new THREE.Mesh(
      SHARED.octGeo,
      new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.1, wireframe: false, transparent: true, opacity: 0.55 })
    );
    mesh.scale.set(0.45, 0.45, 0.45);
    g.add(mesh);
    const wire = new THREE.Mesh(
      SHARED.octGeo,
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35 })
    );
    wire.scale.set(0.55, 0.55, 0.55);
    g.add(wire);
    scene.add(g);
    floatingAI.push({ group: g, rotY: Math.random() * 0.014 + 0.008, rotX: Math.random() * 0.008, baseY: y, phase: Math.random() * Math.PI * 2 });
    return g;
  }

  // Scatter AI elements around the scene — NOT planets, these are tech shapes
  makeCircuitNode(-12, 4,  -8,  0x38bdf8);
  makeCircuitNode( 11, 3,  -6,  0xa78bfa);
  makeCircuitNode(-10, -2, -4,  0x34d399);
  makeCircuitNode( 12, -3, -8,  0xfb923c);
  makeCircuitNode( 0,  5,  -10, 0xf472b6);
  makeCircuitNode(-7,  2,  -12, 0x38bdf8);
  makeNeuralRing( -14, 1,  -5,  0x6366f1, 1.0);
  makeNeuralRing(  13, -1, -7,  0x34d399, 0.8);
  makeNeuralRing( -3,  -3, -9,  0xfb923c, 1.1);
  makeNeuralRing(  7,  4,  -11, 0xa78bfa, 0.9);
  makeDataBlock( -9,  -1, -6,   0x38bdf8);
  makeDataBlock(  10,  2,  -5,  0xf472b6);
  makeDataBlock( -5,   3,  -8,  0x34d399);
  makeDataBlock(  5,  -2,  -7,  0xfb923c);
  makeDataBlock( -13,  0,  -10, 0xa78bfa);

  // ── Spline path connecting nodes ─────────────────────────────────────────
  const pathPts = NODES.map((n) => new THREE.Vector3(...n.position));
  const curve = new THREE.CatmullRomCurve3(pathPts);

  const tubeGeo = new THREE.TubeGeometry(curve, 240, 0.018, 6, false);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.55 });
  scene.add(new THREE.Mesh(tubeGeo, tubeMat));

  // ── Particles along path ─────────────────────────────────────────────────
  const P_COUNT = 80;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(P_COUNT * 3);
  const pProg = new Float32Array(P_COUNT);
  for (let i = 0; i < P_COUNT; i++) {
    pProg[i] = Math.random();
    const pt = curve.getPoint(pProg[i]);
    pPos[i * 3] = pt.x; pPos[i * 3 + 1] = pt.y; pPos[i * 3 + 2] = pt.z;
  }
  pGeo.setAttribute("position", new THREE.Float32BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.9 })
  );
  scene.add(particles);

  // ── Main AI Milestone Nodes ───────────────────────────────────────────────
  const nodeMeshes = [];

  NODES.forEach((node) => {
    const g = new THREE.Group();
    g.position.set(...node.position);

    // Core: octahedron (AI/tech shape — NOT a sphere/planet)
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(node.color),
      emissive: new THREE.Color(node.emissive),
      emissiveIntensity: 0.4,
      metalness: 0.75,
      roughness: 0.15,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(SHARED.octGeo, coreMat);
    core.scale.setScalar(1.05);
    core.userData.nodeId = node.id;
    g.add(core);

    // Wireframe shell around core
    const shell = new THREE.Mesh(
      SHARED.octGeo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color), wireframe: true, transparent: true, opacity: 0.25 })
    );
    shell.scale.setScalar(1.4);
    g.add(shell);

    // Orbiting ring (tilted like a data orbit, not a planet ring)
    const ring = new THREE.Mesh(
      SHARED.torusGeo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color), transparent: true, opacity: 0.45 })
    );
    ring.rotation.x = 1.1; ring.rotation.z = 0.4;
    g.add(ring);

    // Glow sprite
    const glowC = document.createElement("canvas");
    glowC.width = glowC.height = 128;
    const ctx = glowC.getContext("2d");
    const grd = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grd.addColorStop(0, node.color + "bb");
    grd.addColorStop(1, node.color + "00");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowC);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.38, depthWrite: false })
    );
    glow.scale.set(2.8, 2.8, 1);
    g.add(glow);

    // FPS perf: Label as small circuit arms
    const armMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color), transparent: true, opacity: 0.3 });
    [0, 1.2, 2.4, 3.6].forEach((angle) => {
      const arm = new THREE.Mesh(SHARED.cylGeo, armMat);
      arm.scale.set(1, 0.6, 1);
      arm.position.set(Math.cos(angle) * 0.95, 0, Math.sin(angle) * 0.95);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = angle;
      g.add(arm);
    });

    scene.add(g);
    nodeMeshes.push({ group: g, core, coreMat, ring, shell, glow: glow.material, nodeId: node.id });
  });

  return { renderer, scene, camera, nodeMeshes, curve, particles, pGeo, pProg, stars, floatingAI, fillLight };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN REACT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef   = useRef(null);
  const sceneRef    = useRef(null);
  const rafRef      = useRef(null);
  const clockRef    = useRef(new THREE.Clock());
  const mouseRef    = useRef(new THREE.Vector2());
  const rayRef      = useRef(new THREE.Raycaster());
  const hovRef      = useRef(null);
  const camTgt      = useRef({ pos: new THREE.Vector3(1, 3, 13), look: new THREE.Vector3(1, 0, 0) });
  const selRef      = useRef(null);  // mirror of selected for animation loop

  const [selected,  setSelected]  = useState(null);
  const [hovered,   setHovered]   = useState(null);
  const [loaded,    setLoaded]    = useState(false);
  const [showSide,  setShowSide]  = useState(false);
  const [showHint,  setShowHint]  = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [fpsDisplay, setFpsDisplay] = useState(60);

  // Sync selRef with state (avoids stale closure in RAF loop)
  useEffect(() => { selRef.current = selected; }, [selected]);

  // ── Scene init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const s = buildScene(canvas);
    sceneRef.current = s;

    let frameCount = 0;
    let lastFpsTime = performance.now();

    // ── RAF animation loop — targeting 60 FPS ─────────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const t = clockRef.current.getElapsedTime();
      const { renderer, scene, camera, nodeMeshes, curve, particles, pGeo, pProg, stars, floatingAI, fillLight } = s;

      // FPS counter (updates every 60 frames)
      frameCount++;
      if (frameCount % 60 === 0) {
        const now = performance.now();
        const fps = Math.round(60000 / (now - lastFpsTime));
        lastFpsTime = now;
        setFpsDisplay(Math.min(fps, 60));
      }

      // ── Stars slow drift ───────────────────────────────────────────────
      stars.rotation.y = t * 0.006;

      // ── Fill light color cycle ─────────────────────────────────────────
      fillLight.color.setHSL((t * 0.04) % 1, 0.6, 0.4);

      // ── Floating AI elements ───────────────────────────────────────────
      // FAST: using direct property mutation (no object allocation in loop)
      for (let i = 0; i < floatingAI.length; i++) {
        const fa = floatingAI[i];
        fa.group.rotation.y += fa.rotY;
        fa.group.rotation.x += fa.rotX * 0.5;
        // Float up/down — use Math.sin directly (no new Vector3)
        fa.group.position.y = fa.baseY + Math.sin(t * 0.55 + fa.phase) * 0.22;
      }

      // ── Main node animations ───────────────────────────────────────────
      const selId = selRef.current;
      for (let i = 0; i < nodeMeshes.length; i++) {
        const { group, core, coreMat, ring, glow } = nodeMeshes[i];
        const node = NODES[i];
        const isSel = selId === i;
        const isHov = hovRef.current === i;

        // Float — FAST: direct y mutation
        group.position.y = node.position[1] + Math.sin(t * 0.75 + i * 1.1) * 0.1;

        // Spin the octahedron core
        core.rotation.y += isSel ? 0.025 : 0.008;
        core.rotation.x += 0.004;

        // Ring orbit (faster speed)
        ring.rotation.z += isSel ? 0.04 : 0.018;
        ring.rotation.x = 1.1 + Math.sin(t * 0.4 + i) * 0.15;

        // Scale — lerp without allocating new Vector3
        const ts = isSel ? 1.22 : isHov ? 1.12 : 1;
        core.scale.x += (ts - core.scale.x) * 0.12;
        core.scale.y = core.scale.z = core.scale.x;

        // Emissive pulse (faster)
        const te = isSel ? 1.0 : isHov ? 0.7 : 0.38 + Math.sin(t * 2.2 + i) * 0.1;
        coreMat.emissiveIntensity += (te - coreMat.emissiveIntensity) * 0.12;

        // Glow
        const tgo = isSel ? 0.72 : isHov ? 0.58 : 0.32 + Math.sin(t * 1.2 + i) * 0.08;
        glow.opacity += (tgo - glow.opacity) * 0.1;
      }

      // ── Particles along path (faster movement) ─────────────────────────
      const posAttr = pGeo.getAttribute("position");
      for (let i = 0; i < P_COUNT_REF; i++) {
        pProg[i] = (pProg[i] + 0.0018) % 1; // was 0.0008 — now 2.25x faster
        const pt = curve.getPoint(pProg[i]);
        posAttr.setXYZ(
          i,
          pt.x + Math.sin(t * 2.5 + i * 0.4) * 0.09,
          pt.y + Math.cos(t * 1.8 + i * 0.3) * 0.09,
          pt.z
        );
      }
      posAttr.needsUpdate = true;

      // ── Camera smooth follow ───────────────────────────────────────────
      // Lerp speed 0.055 → snappier than before (was 0.04)
      const cp = camTgt.current.pos;
      const cl = camTgt.current.look;
      camera.position.x += (cp.x - camera.position.x) * 0.055;
      camera.position.y += (cp.y - camera.position.y) * 0.055;
      camera.position.z += (cp.z - camera.position.z) * 0.055;

      // Drift when idle
      if (selId === null) {
        const d = t * 0.07;
        cp.set(1 + Math.sin(d) * 0.5, 3 + Math.sin(d * 0.4) * 0.25, 13 + Math.cos(d * 0.25) * 0.4);
        cl.set(1, 0, 0);
      }
      camera.lookAt(cl);

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const onResize = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      s.renderer.setSize(W, H);
      s.camera.aspect = W / H;
      s.camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    setTimeout(() => setLoaded(true), 500);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      s.renderer.dispose();
    };
  }, []);

  // ── Camera target update when selected changes ────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    if (selected !== null) {
      const [nx, ny, nz] = NODES[selected].position;
      camTgt.current.pos.set(nx, ny + 1.8, nz + 5.5);
      camTgt.current.look.set(nx, ny, nz);
    } else {
      camTgt.current.pos.set(1, 3, 13);
      camTgt.current.look.set(1, 0, 0);
    }
  }, [selected]);

  // ── Mouse hover ───────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!sceneRef.current) return;
    const { renderer, camera, nodeMeshes } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rayRef.current.setFromCamera(mouseRef.current, camera);
    const hits = rayRef.current.intersectObjects(nodeMeshes.map((n) => n.core));
    if (hits.length > 0) {
      const id = hits[0].object.userData.nodeId;
      if (hovRef.current !== id) { hovRef.current = id; setHovered(id); }
      renderer.domElement.style.cursor = "pointer";
    } else {
      if (hovRef.current !== null) { hovRef.current = null; setHovered(null); }
      renderer.domElement.style.cursor = "default";
    }
  }, []);

  // ── Mouse click ───────────────────────────────────────────────────────────
  const handleClick = useCallback((e) => {
    if (!sceneRef.current) return;
    const { renderer, camera, nodeMeshes } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rayRef.current.setFromCamera(mouseRef.current, camera);
    const hits = rayRef.current.intersectObjects(nodeMeshes.map((n) => n.core));
    if (hits.length > 0) {
      const id = hits[0].object.userData.nodeId;
      setSelected(id);
      setShowSide(true);
      setShowHint(false);
      setShowContact(false);
    } else {
      setSelected(null);
      setShowSide(false);
    }
  }, []);

  const P_COUNT_REF = 80;

  const closePanel = () => { setSelected(null); setShowSide(false); };
  const node = selected !== null ? NODES[selected] : null;
  const sideW = typeof window !== "undefined" ? Math.min(400, window.innerWidth * 0.92) : 380;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        style={S.canvas}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {/* Loading screen */}
      {!loaded && (
        <div style={S.loader}>
          <div style={S.loaderRing} />
          <p style={S.loaderText}>INITIALIZING AI ROADMAP</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* FPS badge */}
      {loaded && (
        <div style={{ ...S.fpsBadge, color: fpsDisplay >= 55 ? "#34d399" : fpsDisplay >= 40 ? "#fbbf24" : "#f87171" }}>
          {fpsDisplay} FPS
        </div>
      )}

      {/* Header */}
      <header style={S.header}>
        <div>
          <div style={S.headerBrand}>
            <span style={S.headerIcon}>⬡</span>
            <span style={S.headerTitle}>ZEN SKY AI</span>
          </div>
          <p style={S.headerSub}>Enterprise AI Automation Training</p>
        </div>
        <div style={S.headerRight}>
          <button
            onClick={() => { setShowContact((v) => !v); setShowSide(false); setSelected(null); }}
            style={{ ...S.ctaBtn, background: showContact ? "#6366f122" : "transparent" }}
          >
            Contact Us
          </button>
          {/* Node indicator dots */}
          <div style={S.dotRow}>
            {NODES.map((n, i) => (
              <button key={i} onClick={() => { setSelected(i); setShowSide(true); setShowContact(false); }}
                title={n.label}
                style={{ ...S.dot, background: selected === i ? n.color : "#1e293b", boxShadow: selected === i ? `0 0 8px ${n.color}` : "none" }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Intro hint */}
      {showHint && loaded && (
        <div style={S.hint}>
          <p style={S.hintText}>Click a milestone node to explore your AI journey</p>
          <style>{`@keyframes pls{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered !== null && selected === null && (
        <div style={S.tooltip}>
          <p style={{ ...S.tooltipTitle, color: NODES[hovered].color }}>{NODES[hovered].label}</p>
          <p style={S.tooltipSub}>{NODES[hovered].tagline}</p>
        </div>
      )}

      {/* HTML node labels overlay */}
      <NodeLabels sceneRef={sceneRef} selected={selected} hovered={hovered} />

      {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
      <aside style={{ ...S.sidebar, width: sideW, transform: showSide && node ? "translateX(0)" : "translateX(100%)", borderLeftColor: node ? node.color + "44" : "#1e293b" }}>
        {node && (
          <>
            {/* Sidebar header */}
            <div style={{ ...S.sideHead, borderBottomColor: node.color + "22" }}>
              <div style={S.sideTopRow}>
                <div>
                  <div style={S.sideMilestone}>
                    <span style={{ ...S.sideIcon, color: node.color, textShadow: `0 0 14px ${node.color}` }}>{node.icon}</span>
                    <span style={{ ...S.sideBadge, color: node.color, borderColor: node.color + "44", background: node.color + "15" }}>
                      MODULE {node.id + 1} / {NODES.length}
                    </span>
                  </div>
                  <h2 style={S.sideTitle}>{node.label}</h2>
                  <p style={S.sideTagline}>{node.tagline}</p>
                </div>
                <button onClick={closePanel} style={S.closeBtn}>✕</button>
              </div>
              {/* Meta */}
              <div style={S.metaRow}>
                <span style={S.metaChip}>⏱ {node.duration}</span>
                <span style={{ ...S.metaChip, color: DIFFICULTY_COLOR[node.difficulty], borderColor: DIFFICULTY_COLOR[node.difficulty] + "55", background: DIFFICULTY_COLOR[node.difficulty] + "15" }}>
                  ◆ {node.difficulty}
                </span>
                <span style={{ ...S.metaChip, color: "#34d399", borderColor: "#34d39955", background: "#34d39915" }}>
                  📈 {node.roi}
                </span>
              </div>
            </div>

            {/* Sidebar body */}
            <div style={S.sideBody}>
              <p style={S.desc}>{node.description}</p>

              {/* Learning Outcomes */}
              <Section title="WHAT YOU WILL ACHIEVE" color={node.color}>
                {node.outcomes.map((o, i) => (
                  <div key={i} style={S.outcomeRow}>
                    <span style={{ ...S.bullet, background: node.color, boxShadow: `0 0 6px ${node.color}` }} />
                    <span style={S.outcomeText}>{o}</span>
                  </div>
                ))}
              </Section>

              {/* Topics */}
              <Section title="CORE CURRICULUM" color={node.color}>
                <div style={S.topicGrid}>
                  {node.topics.map((tp, i) => (
                    <div key={i} style={{ ...S.topicChip, borderColor: node.color + "30", background: node.color + "0d" }}>
                      <span style={{ ...S.bullet, background: node.color, width: 5, height: 5 }} />
                      <span style={{ color: "#cbd5e1", fontSize: 12 }}>{tp}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Tools */}
              <Section title="TOOLS & PLATFORMS" color={node.color}>
                <div style={S.toolRow}>
                  {node.tools.map((t, i) => (
                    <span key={i} style={{ ...S.toolTag, color: node.color, borderColor: node.color + "35", background: node.color + "12" }}>{t}</span>
                  ))}
                </div>
              </Section>

              {/* Progress bar */}
              <div style={S.progressBox}>
                <div style={S.progressLabel}>
                  <span style={{ color: "#64748b", fontSize: 11, letterSpacing: "0.1em" }}>ROADMAP PROGRESS</span>
                  <span style={{ color: node.color, fontSize: 11 }}>{Math.round(((node.id + 1) / NODES.length) * 100)}%</span>
                </div>
                <div style={S.progressTrack}>
                  <div style={{ ...S.progressFill, width: `${((node.id + 1) / NODES.length) * 100}%`, background: `linear-gradient(90deg,${node.emissive},${node.color})` }} />
                </div>
                <div style={S.dotProgress}>
                  {NODES.map((n, i) => (
                    <button key={i} onClick={() => setSelected(i)} style={{ ...S.progressDot, background: i <= node.id ? n.color : "#1e293b", borderColor: i <= node.id ? n.color : "#334155", boxShadow: i === node.id ? `0 0 10px ${n.color}` : "none" }} />
                  ))}
                </div>
              </div>

              {/* Prev / Next nav */}
              <div style={S.navRow}>
                {node.id > 0 && (
                  <button onClick={() => setSelected(node.id - 1)} style={S.navBtnGhost}>← Previous</button>
                )}
                {node.id < NODES.length - 1 && (
                  <button onClick={() => setSelected(node.id + 1)} style={{ ...S.navBtnPrimary, borderColor: node.color + "55", color: node.color, background: node.color + "18" }}>
                    Next Module →
                  </button>
                )}
                {node.id === NODES.length - 1 && (
                  <button onClick={() => { setShowContact(true); setShowSide(false); setSelected(null); }}
                    style={{ ...S.navBtnPrimary, borderColor: "#34d39955", color: "#34d399", background: "#34d39918", flex: 1 }}>
                    🚀 Enroll Now
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ── CONTACT PANEL ─────────────────────────────────────────────────── */}
      <div style={{ ...S.contactPanel, transform: showContact ? "translateY(0)" : "translateY(110%)" }}>
        <div style={S.contactInner}>
          <button onClick={() => setShowContact(false)} style={{ ...S.closeBtn, position: "absolute", top: 20, right: 20 }}>✕</button>
          <p style={S.contactPre}>READY TO TRANSFORM YOUR ENTERPRISE?</p>
          <h2 style={S.contactTitle}>{CONTACT.tagline}</h2>
          <p style={S.contactDesc}>
            Our corporate AI trainers work with your team on-site or remotely. Customized curriculum, hands-on workshops, and post-training support — built for business leaders.
          </p>
          <div style={S.contactCards}>
            <a href={`mailto:${CONTACT.email}`} style={S.contactCard}>
              <span style={S.contactCardIcon}>✉</span>
              <div>
                <p style={S.contactCardLabel}>Email Us</p>
                <p style={S.contactCardValue}>{CONTACT.email}</p>
              </div>
            </a>
            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} style={S.contactCard}>
              <span style={S.contactCardIcon}>📞</span>
              <div>
                <p style={S.contactCardLabel}>Call Us</p>
                <p style={S.contactCardValue}>{CONTACT.phone}</p>
              </div>
            </a>
            <a href={`https://${CONTACT.website}`} target="_blank" rel="noreferrer" style={S.contactCard}>
              <span style={S.contactCardIcon}>🌐</span>
              <div>
                <p style={S.contactCardLabel}>Website</p>
                <p style={S.contactCardValue}>{CONTACT.website}</p>
              </div>
            </a>
          </div>
          <div style={S.contactStats}>
            {[["500+", "Enterprises Trained"], ["40–60%", "Avg Cost Reduction"], ["24/7", "Support Access"], ["5", "AI Modules"]].map(([val, label]) => (
              <div key={label} style={S.statBox}>
                <p style={S.statVal}>{val}</p>
                <p style={S.statLabel}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom node nav pills */}
      <div style={{ ...S.pillBar, right: showSide ? sideW : 0 }}>
        {NODES.map((n, i) => (
          <button key={n.id}
            onClick={() => { setSelected(i); setShowSide(true); setShowContact(false); setShowHint(false); }}
            style={{ ...S.pill, borderColor: selected === i ? n.color : "#1e293b", color: selected === i ? n.color : "#475569", background: selected === i ? n.color + "1a" : "rgba(15,23,42,0.85)", boxShadow: selected === i ? `0 0 12px ${n.color}44` : "none", fontWeight: selected === i ? 700 : 400 }}
          >
            {n.icon} {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE LABELS — projects 3D positions to 2D screen
// ─────────────────────────────────────────────────────────────────────────────
function NodeLabels({ sceneRef, selected, hovered }) {
  const [positions, setPositions] = useState([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const update = () => {
      rafRef.current = requestAnimationFrame(update);
      if (!sceneRef.current) return;
      const { renderer, camera } = sceneRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      setPositions(
        NODES.map((node) => {
          const p = new THREE.Vector3(...node.position).project(camera);
          return {
            x: ((p.x + 1) / 2) * rect.width,
            y: ((-p.y + 1) / 2) * rect.height,
            z: p.z,
          };
        })
      );
    };
    update();
    return () => cancelAnimationFrame(rafRef.current);
  }, [sceneRef]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
      {NODES.map((node, i) => {
        const p = positions[i];
        if (!p || p.z > 1) return null;
        const active = selected === i || hovered === i;
        return (
          <div key={node.id} style={{ position: "absolute", left: p.x, top: p.y - 78, transform: "translateX(-50%)", textAlign: "center", opacity: active ? 1 : 0.5, transition: "opacity 0.25s" }}>
            <p style={{ color: node.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap", textShadow: `0 0 10px ${node.color}`, margin: 0 }}>{node.label}</p>
            {active && <p style={{ color: "#64748b", fontSize: 10, margin: "2px 0 0", whiteSpace: "nowrap" }}>{node.tagline}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION helper component
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", margin: "0 0 10px", borderLeft: `3px solid ${color}`, paddingLeft: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  root:         { width: "100%", height: "100vh", background: "#030712", position: "relative", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" },
  canvas:       { position: "absolute", inset: 0, width: "100%", height: "100%" },

  loader:       { position: "absolute", inset: 0, background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 200 },
  loaderRing:   { width: 48, height: 48, borderRadius: "50%", border: "2px solid #1e3a5f", borderTop: "2px solid #38bdf8", animation: "spin 0.9s linear infinite" },
  loaderText:   { color: "#38bdf8", fontSize: 12, letterSpacing: "0.22em", margin: 0 },

  fpsBadge:     { position: "absolute", top: 80, left: 18, fontSize: 10, letterSpacing: "0.12em", fontFamily: "monospace", background: "rgba(3,7,18,0.75)", border: "1px solid #1e293b", padding: "3px 8px", borderRadius: 4, zIndex: 50 },

  header:       { position: "absolute", top: 0, left: 0, right: 0, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 30, background: "linear-gradient(to bottom,rgba(3,7,18,0.97) 0%,transparent 100%)" },
  headerBrand:  { display: "flex", alignItems: "center", gap: 10 },
  headerIcon:   { fontSize: 22, color: "#38bdf8", filter: "drop-shadow(0 0 8px #38bdf8)" },
  headerTitle:  { color: "#e2e8f0", fontSize: 15, fontWeight: 700, letterSpacing: "0.08em" },
  headerSub:    { color: "#334155", fontSize: 10, letterSpacing: "0.15em", margin: "4px 0 0" },
  headerRight:  { display: "flex", alignItems: "center", gap: 14 },
  ctaBtn:       { color: "#94a3b8", border: "1px solid #1e293b", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, letterSpacing: "0.06em", transition: "all 0.2s" },
  dotRow:       { display: "flex", gap: 6 },
  dot:          { width: 9, height: 9, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s" },

  hint:         { position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 10, pointerEvents: "none" },
  hintText:     { color: "#475569", fontSize: 12, letterSpacing: "0.08em", margin: 0, animation: "pls 2.8s ease-in-out infinite" },
  tooltip:      { position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(3,7,18,0.92)", border: "1px solid #1e293b", borderRadius: 10, padding: "9px 20px", zIndex: 15, pointerEvents: "none", backdropFilter: "blur(10px)" },
  tooltipTitle: { fontSize: 13, margin: 0, fontWeight: 700 },
  tooltipSub:   { color: "#475569", fontSize: 11, margin: "3px 0 0" },

  // Sidebar
  sidebar:      { position: "absolute", top: 0, right: 0, height: "100%", background: "rgba(3,7,18,0.97)", borderLeft: "1px solid #1e293b", transform: "translateX(100%)", transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)", zIndex: 40, overflowY: "auto", backdropFilter: "blur(20px)" },
  sideHead:     { padding: "22px 22px 0", position: "sticky", top: 0, background: "rgba(3,7,18,0.97)", zIndex: 2, borderBottom: "1px solid #1e293b" },
  sideTopRow:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  sideMilestone:{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  sideIcon:     { fontSize: 24, fontFamily: "monospace", fontWeight: 700 },
  sideBadge:    { fontSize: 10, border: "1px solid", padding: "3px 10px", borderRadius: 4, letterSpacing: "0.12em" },
  sideTitle:    { color: "#f1f5f9", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" },
  sideTagline:  { color: "#475569", fontSize: 12, margin: "5px 0 0", fontStyle: "italic" },
  metaRow:      { display: "flex", gap: 7, flexWrap: "wrap", paddingBottom: 14, marginTop: 12 },
  metaChip:     { fontSize: 10, background: "#0f172a", color: "#94a3b8", border: "1px solid #1e293b", padding: "4px 10px", borderRadius: 20, letterSpacing: "0.04em" },
  closeBtn:     { background: "none", border: "1px solid #1e293b", color: "#475569", width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sideBody:     { padding: "18px 22px 30px" },
  desc:         { color: "#94a3b8", fontSize: 13, lineHeight: 1.8, margin: "0 0 22px" },

  outcomeRow:   { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  outcomeText:  { color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 },
  bullet:       { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 5 },

  topicGrid:    { display: "flex", flexDirection: "column", gap: 6 },
  topicChip:    { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#0d1b2e", borderRadius: 7, border: "1px solid #1e293b" },

  toolRow:      { display: "flex", flexWrap: "wrap", gap: 8 },
  toolTag:      { fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "1px solid", fontFamily: "monospace" },

  progressBox:  { background: "#080f20", borderRadius: 8, padding: "14px 16px", border: "1px solid #1e293b", marginBottom: 18 },
  progressLabel:{ display: "flex", justifyContent: "space-between", marginBottom: 8 },
  progressTrack:{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 0.9s ease" },
  dotProgress:  { display: "flex", justifyContent: "space-between" },
  progressDot:  { width: 12, height: 12, borderRadius: "50%", border: "1px solid", cursor: "pointer", transition: "all 0.3s" },

  navRow:       { display: "flex", gap: 10 },
  navBtnGhost:  { flex: 1, padding: "10px 0", background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer", letterSpacing: "0.04em" },
  navBtnPrimary:{ flex: 1, padding: "10px 0", border: "1px solid", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 700, letterSpacing: "0.04em", transition: "all 0.2s" },

  // Contact panel
  contactPanel: { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(3,7,18,0.98)", borderTop: "1px solid #6366f133", backdropFilter: "blur(24px)", transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)", zIndex: 50, maxHeight: "85vh", overflowY: "auto" },
  contactInner: { maxWidth: 760, margin: "0 auto", padding: "36px 28px 40px", position: "relative" },
  contactPre:   { color: "#38bdf8", fontSize: 10, letterSpacing: "0.22em", margin: "0 0 8px" },
  contactTitle: { color: "#f1f5f9", fontSize: 26, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2 },
  contactDesc:  { color: "#64748b", fontSize: 13, lineHeight: 1.75, margin: "0 0 28px", maxWidth: 560 },
  contactCards: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 },
  contactCard:  { display: "flex", alignItems: "center", gap: 14, background: "#0d1b2e", border: "1px solid #1e3a5f", borderRadius: 12, padding: "16px 20px", textDecoration: "none", flex: 1, minWidth: 180, transition: "border-color 0.2s, background 0.2s", cursor: "pointer" },
  contactCardIcon: { fontSize: 24, flexShrink: 0 },
  contactCardLabel: { color: "#475569", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 3px" },
  contactCardValue: { color: "#e2e8f0", fontSize: 13, fontWeight: 600, margin: 0, wordBreak: "break-all" },
  contactStats: { display: "flex", gap: 12, flexWrap: "wrap" },
  statBox:      { flex: 1, minWidth: 120, background: "#080f20", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", textAlign: "center" },
  statVal:      { color: "#38bdf8", fontSize: 22, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" },
  statLabel:    { color: "#475569", fontSize: 11, margin: 0, letterSpacing: "0.04em" },

  // Bottom pills
  pillBar:      { position: "absolute", bottom: 0, left: 0, display: "flex", overflowX: "auto", gap: 8, padding: "10px 14px 16px", zIndex: 20, background: "linear-gradient(to top,rgba(3,7,18,0.96) 0%,transparent 100%)", transition: "right 0.4s", scrollbarWidth: "none" },
  pill:         { flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontSize: 11, letterSpacing: "0.06em", backdropFilter: "blur(8px)", transition: "all 0.25s" },
};