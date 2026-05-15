import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

// ─── AI Roadmap Data ────────────────────────────────────────────────────────
const NODES = [
  {
    id: 0,
    label: "Data Processing",
    icon: "⬡",
    color: "#7dd3fc",
    emissive: "#0ea5e9",
    position: [-4, 0, 0],
    short: "The foundation of all AI",
    description:
      "Data Processing is the bedrock of any AI system. Raw data is collected, cleaned, normalized, and transformed into structured formats that models can learn from.",
    topics: ["Data Cleaning", "Feature Engineering", "ETL Pipelines", "Normalization", "Exploratory Data Analysis"],
    duration: "3–4 weeks",
    difficulty: "Beginner",
    tools: ["Pandas", "NumPy", "Apache Spark", "SQL"],
  },
  {
    id: 1,
    label: "Machine Learning",
    icon: "◈",
    color: "#a78bfa",
    emissive: "#7c3aed",
    position: [-1.5, 1.2, -1],
    short: "Teaching machines to learn",
    description:
      "Machine Learning algorithms enable systems to improve automatically through experience. From regression to ensemble methods, this stage builds the core intuition for pattern recognition.",
    topics: ["Supervised Learning", "Unsupervised Learning", "Model Evaluation", "Regularization", "Ensemble Methods"],
    duration: "4–6 weeks",
    difficulty: "Intermediate",
    tools: ["Scikit-learn", "XGBoost", "Statsmodels", "Matplotlib"],
  },
  {
    id: 2,
    label: "Neural Networks",
    icon: "◎",
    color: "#86efac",
    emissive: "#16a34a",
    position: [1.5, -0.8, -2],
    short: "Deep learning architecture",
    description:
      "Neural Networks are the engine of modern AI. Layers of interconnected nodes learn hierarchical representations — from edges to objects to concepts — enabling remarkably human-like perception.",
    topics: ["Perceptrons", "Backpropagation", "CNNs", "RNNs & LSTMs", "Transformers"],
    duration: "5–7 weeks",
    difficulty: "Advanced",
    tools: ["PyTorch", "TensorFlow", "Keras", "CUDA"],
  },
  {
    id: 3,
    label: "AI Agents",
    icon: "⬟",
    color: "#fcd34d",
    emissive: "#d97706",
    position: [4, 0.5, -1],
    short: "Autonomous decision-making",
    description:
      "AI Agents perceive their environment and take actions to achieve goals. Reinforcement learning trains agents through reward signals, enabling everything from game-playing to robotics.",
    topics: ["Reinforcement Learning", "Q-Learning", "Policy Gradients", "Multi-Agent Systems", "Reward Shaping"],
    duration: "5–6 weeks",
    difficulty: "Advanced",
    tools: ["OpenAI Gym", "Stable Baselines", "Ray RLlib", "Unity ML"],
  },
  {
    id: 4,
    label: "Automation",
    icon: "⬡",
    color: "#f9a8d4",
    emissive: "#db2777",
    position: [6.5, -0.5, 0],
    short: "AI in production workflows",
    description:
      "AI Automation integrates intelligent models into real-world pipelines. From robotic process automation to intelligent orchestration, this stage turns research into scalable impact.",
    topics: ["MLOps", "CI/CD for ML", "API Deployment", "Monitoring & Drift", "LLM Orchestration"],
    duration: "4–5 weeks",
    difficulty: "Intermediate",
    tools: ["LangChain", "Airflow", "Docker", "FastAPI"],
  },
];

const DIFFICULTY_COLOR = { Beginner: "#86efac", Intermediate: "#fcd34d", Advanced: "#f87171" };

// ─── Three.js Scene Setup ────────────────────────────────────────────────────
function createScene(canvas) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080c1a, 0.035);

  // Camera
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
  camera.position.set(1, 3.5, 12);
  camera.lookAt(1, 0, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0x111827, 2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 8);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 1800; i++) {
    starVerts.push(
      THREE.MathUtils.randFloatSpread(120),
      THREE.MathUtils.randFloatSpread(80),
      THREE.MathUtils.randFloatSpread(120) - 20
    );
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.7 })
  );
  scene.add(stars);

  // Subtle ground plane
  const groundGeo = new THREE.PlaneGeometry(60, 60, 30, 30);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a1628, wireframe: true, transparent: true, opacity: 0.08,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.8;
  scene.add(ground);

  // Connection path (spline through node positions)
  const pathPoints = NODES.map((n) => new THREE.Vector3(...n.position));
  const curve = new THREE.CatmullRomCurve3(pathPoints);
  const tubeGeo = new THREE.TubeGeometry(curve, 200, 0.015, 8, false);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 });
  scene.add(new THREE.Mesh(tubeGeo, tubeMat));

  // Nodes
  const nodeMeshes = [];
  const nodeRings = [];
  const nodeGlows = [];

  NODES.forEach((node) => {
    const group = new THREE.Group();
    group.position.set(...node.position);

    // Core sphere
    const geo = new THREE.IcosahedronGeometry(0.55, 3);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(node.color),
      emissive: new THREE.Color(node.emissive),
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.7,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.userData = { nodeId: node.id, originalEmissive: 0.35, originalScale: 1 };
    group.add(mesh);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(0.82, 0.018, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color), transparent: true, opacity: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Glow sprite
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    const ctx = glowCanvas.getContext("2d");
    const grd = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, node.color + "cc");
    grd.addColorStop(1, node.color + "00");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.4, depthWrite: false });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(2.4, 2.4, 1);
    group.add(glow);

    scene.add(group);
    nodeMeshes.push({ group, mesh, mat, ring, ringMat, glow, glowMat, nodeId: node.id });
    nodeRings.push(ring);
    nodeGlows.push(glow);
  });

  // Floating particles along path
  const particleCount = 120;
  const particleGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(particleCount * 3);
  const pProgress = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    pProgress[i] = Math.random();
    const pt = curve.getPoint(pProgress[i]);
    pPositions[i * 3] = pt.x + THREE.MathUtils.randFloatSpread(0.4);
    pPositions[i * 3 + 1] = pt.y + THREE.MathUtils.randFloatSpread(0.4);
    pPositions[i * 3 + 2] = pt.z + THREE.MathUtils.randFloatSpread(0.4);
  }
  particleGeo.setAttribute("position", new THREE.Float32BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.7 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  return { renderer, scene, camera, nodeMeshes, curve, particles, particleGeo, pProgress, stars };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIRoadmap() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const animRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const hoveredRef = useRef(null);
  const cameraTargetRef = useRef({ pos: new THREE.Vector3(1, 3.5, 12), look: new THREE.Vector3(1, 0, 0) });

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Init Three.js
  useEffect(() => {
    const canvas = canvasRef.current;
    const s = createScene(canvas);
    sceneRef.current = s;

    // Animate
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const t = clockRef.current.getElapsedTime();
      const { renderer, scene, camera, nodeMeshes, curve, particles, particleGeo, pProgress, stars } = s;

      // Rotate stars slowly
      stars.rotation.y = t * 0.008;
      stars.rotation.x = t * 0.003;

      // Animate node meshes
      nodeMeshes.forEach(({ group, mesh, mat, ring, ringMat, glow, glowMat }, i) => {
        const node = NODES[i];
        const isHov = hoveredRef.current === i;
        const isSel = selected === i;

        // Float
        group.position.y = node.position[1] + Math.sin(t * 0.7 + i * 1.2) * 0.12;

        // Spin
        mesh.rotation.y += 0.004;
        mesh.rotation.x += 0.002;

        // Ring orbit
        ring.rotation.z = t * 0.6 + i * 0.8;
        ring.rotation.y = t * 0.3;

        // Scale on hover/select
        const targetScale = isHov || isSel ? 1.18 : 1;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Emissive glow
        const targetEmissive = isSel ? 0.9 : isHov ? 0.65 : 0.35 + Math.sin(t * 1.5 + i) * 0.08;
        mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.1;

        // Ring opacity
        const targetRingOp = isHov || isSel ? 0.9 : 0.4;
        ringMat.opacity += (targetRingOp - ringMat.opacity) * 0.1;

        // Glow scale
        const tGlowScale = isHov || isSel ? 3.5 : 2.4;
        glow.scale.lerp(new THREE.Vector3(tGlowScale, tGlowScale, 1), 0.08);
        const tGlowOp = isSel ? 0.65 : isHov ? 0.55 : 0.35 + Math.sin(t + i) * 0.08;
        glowMat.opacity += (tGlowOp - glowMat.opacity) * 0.08;
      });

      // Animate particles along curve
      const posAttr = particleGeo.getAttribute("position");
      for (let i = 0; i < pProgress.length; i++) {
        pProgress[i] = (pProgress[i] + 0.0008) % 1;
        const pt = curve.getPoint(pProgress[i]);
        posAttr.setXYZ(i, pt.x + Math.sin(t * 2 + i) * 0.12, pt.y + Math.cos(t + i) * 0.12, pt.z);
      }
      posAttr.needsUpdate = true;

      // Smooth camera
      const tgt = cameraTargetRef.current;
      camera.position.lerp(tgt.pos, 0.04);
      const currentLook = new THREE.Vector3();
      camera.getWorldDirection(currentLook);
      const desiredDir = tgt.look.clone().sub(camera.position).normalize();
      currentLook.lerp(desiredDir, 0.04);
      camera.lookAt(camera.position.clone().add(currentLook));

      // Subtle drift when nothing selected
      if (selected === null) {
        const drift = t * 0.08;
        tgt.pos.set(1 + Math.sin(drift) * 0.6, 3.5 + Math.sin(drift * 0.5) * 0.3, 12 + Math.cos(drift * 0.3) * 0.5);
        tgt.look.set(1, 0, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const { renderer, camera } = s;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    setTimeout(() => setLoaded(true), 600);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      s.renderer.dispose();
    };
    // eslint-disable-next-line
  }, []);

  // Update animation loop when selected changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (selected !== null) {
      const node = NODES[selected];
      const [nx, ny, nz] = node.position;
      cameraTargetRef.current.pos = new THREE.Vector3(nx, ny + 1.5, nz + 4.5);
      cameraTargetRef.current.look = new THREE.Vector3(nx, ny, nz);
    } else {
      cameraTargetRef.current.pos = new THREE.Vector3(1, 3.5, 12);
      cameraTargetRef.current.look = new THREE.Vector3(1, 0, 0);
    }
  }, [selected]);

  // Mouse move (hover detection)
  const handleMouseMove = useCallback((e) => {
    if (!sceneRef.current) return;
    const { renderer, camera, nodeMeshes } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const meshes = nodeMeshes.map((n) => n.mesh);
    const hits = raycasterRef.current.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = hits[0].object.userData.nodeId;
      if (hoveredRef.current !== id) { hoveredRef.current = id; setHovered(id); }
      renderer.domElement.style.cursor = "pointer";
    } else {
      hoveredRef.current = null;
      setHovered(null);
      renderer.domElement.style.cursor = "default";
    }
  }, []);

  // Click
  const handleClick = useCallback((e) => {
    if (!sceneRef.current) return;
    const { renderer, camera, nodeMeshes } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const meshes = nodeMeshes.map((n) => n.mesh);
    const hits = raycasterRef.current.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = hits[0].object.userData.nodeId;
      setSelected((prev) => (prev === id ? null : id));
      setSidebarVisible(true);
      setIntroVisible(false);
    } else {
      // click empty space → deselect
      setSelected(null);
      setSidebarVisible(false);
    }
  }, []);

  const closeSidebar = () => { setSelected(null); setSidebarVisible(false); };
  const node = selected !== null ? NODES[selected] : null;

  return (
    <div style={{ width: "100%", height: "100vh", background: "#060d1a", position: "relative", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {/* Loading overlay */}
      {!loaded && (
        <div style={{ position: "absolute", inset: 0, background: "#060d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, zIndex: 100 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #1e3a5f", borderTop: "2px solid #7dd3fc", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#7dd3fc", fontSize: 14, letterSpacing: "0.2em", margin: 0 }}>INITIALIZING</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Top Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, background: "linear-gradient(to bottom, rgba(6,13,26,0.95) 0%, transparent 100%)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, filter: "drop-shadow(0 0 8px #7dd3fc)" }}>◎</span>
            <span style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em" }}>ZEN SKY AI</span>
          </div>
          <p style={{ color: "#475569", fontSize: 11, margin: "4px 0 0", letterSpacing: "0.15em" }}>INTERACTIVE ROADMAP</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {NODES.map((n, i) => (
            <button
              key={n.id}
              onClick={() => { setSelected(i); setSidebarVisible(true); setIntroVisible(false); }}
              title={n.label}
              style={{
                width: 10, height: 10, borderRadius: "50%", border: "none", cursor: "pointer",
                background: selected === i ? n.color : "#1e293b",
                boxShadow: selected === i ? `0 0 8px ${n.color}` : "none",
                transition: "all 0.3s", padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Intro Hint */}
      {introVisible && loaded && (
        <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
          <p style={{ color: "#94a3b8", fontSize: 13, letterSpacing: "0.1em", margin: 0, animation: "pulse 2.5s ease-in-out infinite" }}>
            Click a node to explore the AI journey
          </p>
          <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
        </div>
      )}

      {/* Hover Label */}
      {hovered !== null && selected === null && (
        <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.9)", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 18px", zIndex: 10, pointerEvents: "none", backdropFilter: "blur(8px)" }}>
          <p style={{ color: NODES[hovered].color, fontSize: 13, margin: 0, fontWeight: 600 }}>{NODES[hovered].label}</p>
          <p style={{ color: "#64748b", fontSize: 11, margin: "2px 0 0" }}>{NODES[hovered].short}</p>
        </div>
      )}

      {/* Node Labels (HTML overlay) */}
      <NodeLabels nodes={NODES} selected={selected} hovered={hovered} sceneRef={sceneRef} />

      {/* Sidebar */}
      <div style={{
        position: "absolute", top: 0, right: 0, height: "100%", width: Math.min(380, window.innerWidth * 0.88),
        background: "rgba(6,13,26,0.96)",
        borderLeft: node ? `1px solid ${node.color}33` : "1px solid #1e293b",
        transform: sidebarVisible && node ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s",
        zIndex: 20, overflowY: "auto", backdropFilter: "blur(16px)",
        display: "flex", flexDirection: "column",
      }}>
        {node && (
          <>
            {/* Sidebar Header */}
            <div style={{ padding: "24px 24px 0", position: "sticky", top: 0, background: "rgba(6,13,26,0.96)", zIndex: 2, borderBottom: `1px solid ${node.color}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, color: node.color, filter: `drop-shadow(0 0 12px ${node.color})` }}>{node.icon}</span>
                    <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.2em", background: `${node.color}18`, border: `1px solid ${node.color}40`, padding: "3px 10px", borderRadius: 4 }}>
                      MILESTONE {node.id + 1} / {NODES.length}
                    </span>
                  </div>
                  <h2 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{node.label}</h2>
                </div>
                <button onClick={closeSidebar} style={{ background: "none", border: "1px solid #1e293b", color: "#475569", width: 32, height: 32, borderRadius: 6, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
              </div>

              {/* Meta badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 16 }}>
                <span style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "4px 10px", borderRadius: 20, letterSpacing: "0.05em" }}>⏱ {node.duration}</span>
                <span style={{ fontSize: 11, background: `${DIFFICULTY_COLOR[node.difficulty]}22`, color: DIFFICULTY_COLOR[node.difficulty], padding: "4px 10px", borderRadius: 20, border: `1px solid ${DIFFICULTY_COLOR[node.difficulty]}44`, letterSpacing: "0.05em" }}>
                  ◆ {node.difficulty}
                </span>
              </div>
            </div>

            {/* Sidebar Body */}
            <div style={{ padding: "20px 24px 32px", flex: 1 }}>
              {/* Description */}
              <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.75, margin: "0 0 24px" }}>{node.description}</p>

              {/* Topics */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", margin: "0 0 12px" }}>CORE TOPICS</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {node.topics.map((topic, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0d1b2e", borderRadius: 8, border: "1px solid #1e293b", transition: "border-color 0.2s" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: node.color, flexShrink: 0, boxShadow: `0 0 6px ${node.color}` }} />
                      <span style={{ color: "#cbd5e1", fontSize: 13 }}>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", margin: "0 0 12px" }}>KEY TOOLS</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {node.tools.map((tool, i) => (
                    <span key={i} style={{ fontSize: 12, color: node.color, background: `${node.color}14`, border: `1px solid ${node.color}30`, padding: "5px 12px", borderRadius: 6, fontFamily: "monospace" }}>{tool}</span>
                  ))}
                </div>
              </div>

              {/* Progress bar visual */}
              <div style={{ background: "#0d1b2e", borderRadius: 8, padding: "14px 16px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ color: "#64748b", fontSize: 11, letterSpacing: "0.1em" }}>ROADMAP PROGRESS</span>
                  <span style={{ color: node.color, fontSize: 11 }}>{Math.round(((node.id + 1) / NODES.length) * 100)}%</span>
                </div>
                <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${((node.id + 1) / NODES.length) * 100}%`, background: `linear-gradient(90deg, ${node.emissive}, ${node.color})`, borderRadius: 2, transition: "width 0.8s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  {NODES.map((n, i) => (
                    <button key={i} onClick={() => setSelected(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: i <= node.id ? n.color : "#1e293b", border: `1px solid ${i <= node.id ? n.color : "#334155"}`, transition: "all 0.3s", boxShadow: i === node.id ? `0 0 8px ${n.color}` : "none" }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Nav buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                {node.id > 0 && (
                  <button onClick={() => setSelected(node.id - 1)} style={{ flex: 1, padding: "10px 0", background: "#0d1b2e", border: "1px solid #1e293b", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer", letterSpacing: "0.05em" }}>
                    ← Previous
                  </button>
                )}
                {node.id < NODES.length - 1 && (
                  <button onClick={() => setSelected(node.id + 1)} style={{ flex: 1, padding: "10px 0", background: `${node.color}18`, border: `1px solid ${node.color}40`, borderRadius: 8, color: node.color, fontSize: 13, cursor: "pointer", fontWeight: 600, letterSpacing: "0.05em" }}>
                    Next →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile node buttons */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: sidebarVisible ? Math.min(380, window.innerWidth * 0.88) : 0, display: "flex", overflowX: "auto", gap: 8, padding: "12px 16px 20px", zIndex: 10, background: "linear-gradient(to top, rgba(6,13,26,0.95) 0%, transparent 100%)", transition: "right 0.45s" }}>
        {NODES.map((n, i) => (
          <button
            key={n.id}
            onClick={() => { setSelected(i); setSidebarVisible(true); setIntroVisible(false); }}
            style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 20,
              background: selected === i ? `${n.color}22` : "rgba(15,23,42,0.8)",
              border: selected === i ? `1px solid ${n.color}` : "1px solid #1e293b",
              color: selected === i ? n.color : "#475569", fontSize: 11,
              cursor: "pointer", letterSpacing: "0.06em", fontWeight: selected === i ? 600 : 400,
              transition: "all 0.3s", backdropFilter: "blur(8px)",
              boxShadow: selected === i ? `0 0 12px ${n.color}44` : "none",
            }}
          >
            {n.icon} {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HTML Node Labels Overlay ────────────────────────────────────────────────
function NodeLabels({ nodes, selected, hovered, sceneRef }) {
  const [positions, setPositions] = useState([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const update = () => {
      frameRef.current = requestAnimationFrame(update);
      if (!sceneRef.current) return;
      const { renderer, camera } = sceneRef.current;
      const rect = renderer.domElement.getBoundingClientRect();
      const newPos = nodes.map((node) => {
        const pos = new THREE.Vector3(...node.position);
        pos.project(camera);
        const x = ((pos.x + 1) / 2) * rect.width;
        const y = ((-pos.y + 1) / 2) * rect.height;
        return { x, y, z: pos.z };
      });
      setPositions(newPos);
    };
    update();
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes, sceneRef]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
      {nodes.map((node, i) => {
        const p = positions[i];
        if (!p || p.z > 1) return null;
        const isActive = selected === i || hovered === i;
        return (
          <div key={node.id} style={{
            position: "absolute", left: p.x, top: p.y - 72,
            transform: "translateX(-50%)", textAlign: "center",
            opacity: isActive ? 1 : 0.55, transition: "opacity 0.3s",
            pointerEvents: "none",
          }}>
            <div style={{ color: node.color, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", whiteSpace: "nowrap", textShadow: `0 0 12px ${node.color}`, marginBottom: 2 }}>
              {node.label}
            </div>
            {isActive && <div style={{ color: "#64748b", fontSize: 10, whiteSpace: "nowrap" }}>{node.short}</div>}
          </div>
        );
      })}
    </div>
  );
}