"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Crosshair, Zap, Type, MousePointerClick, RotateCcw, Volume2, VolumeX, ShieldAlert, CheckCircle2, Flame } from "lucide-react";

type GameId = "aim" | "reaction" | "typing" | "clicker";

export type ArcadeBestScores = {
  aimScore: number;
  aimHits: number;
  aimAccuracy: number;
  reactionTime: number | null; // ms (lower is better)
  typingWpm: number;
  typingAccuracy: number;
  clickerCps: number;
  clickerClicks: number;
};

const DEFAULT_BEST_SCORES: ArcadeBestScores = {
  aimScore: 0,
  aimHits: 0,
  aimAccuracy: 0,
  reactionTime: null,
  typingWpm: 0,
  typingAccuracy: 0,
  clickerCps: 0,
  clickerClicks: 0,
};

const STORAGE_KEY = "rift_arcade_best_scores_v1";

const gameTabs: { id: GameId; label: string; detail: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "aim", label: "Aim Trainer", detail: "FPS Pointer Lock", icon: Crosshair },
  { id: "reaction", label: "Reaction Test", detail: "Reflexes", icon: Zap },
  { id: "typing", label: "Typing Race", detail: "Endless Sprint", icon: Type },
  { id: "clicker", label: "RIFT Clicker", detail: "10s CPS Burst", icon: MousePointerClick },
];

export default function MiniGamesArcade() {
  const [activeGame, setActiveGame] = useState<GameId>("aim");
  const [bestScores, setBestScores] = useState<ArcadeBestScores>(DEFAULT_BEST_SCORES);

  // Load best scores from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setBestScores((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateBest = useCallback((updater: (prev: ArcadeBestScores) => ArcadeBestScores) => {
    setBestScores((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const getBestSummary = (id: GameId) => {
    switch (id) {
      case "aim":
        return bestScores.aimScore > 0 ? `PB: ${bestScores.aimScore.toLocaleString()} pts` : "No attempt yet";
      case "reaction":
        return bestScores.reactionTime !== null ? `PB: ${bestScores.reactionTime}ms` : "No attempt yet";
      case "typing":
        return bestScores.typingWpm > 0 ? `PB: ${bestScores.typingWpm} WPM` : "No attempt yet";
      case "clicker":
        return bestScores.clickerCps > 0 ? `PB: ${bestScores.clickerCps.toFixed(1)} CPS` : "No attempt yet";
    }
  };

  return (
    <section className="space-y-4">
      {/* Navigation tabs */}
      <nav className="glass-panel grid grid-cols-2 gap-1.5 rounded-xl p-1.5 sm:grid-cols-4" aria-label="Mini-games">
        {gameTabs.map((game) => {
          const Icon = game.icon;
          const isActive = activeGame === game.id;
          const bestText = getBestSummary(game.id);
          const hasAttempt = bestText !== "No attempt yet";

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => setActiveGame(game.id)}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-left transition-all ${
                isActive
                  ? "bg-rift-red/15 border border-rift-red/40 text-foreground shadow-[0_0_15px_rgba(227,28,61,0.2)]"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-rift-red text-white" : "bg-secondary text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-display text-xs font-bold uppercase tracking-wider">{game.label}</span>
                <span className={`mt-0.5 block truncate font-mono text-[10px] uppercase font-medium ${hasAttempt ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                  {bestText}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Main Game Container */}
      <div className="glass-panel relative overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
        {activeGame === "aim" && <AimTrainer bestScores={bestScores} onUpdateBest={updateBest} />}
        {activeGame === "reaction" && <ReactionTest bestScores={bestScores} onUpdateBest={updateBest} />}
        {activeGame === "typing" && <TypingRace bestScores={bestScores} onUpdateBest={updateBest} />}
        {activeGame === "clicker" && <RiftClicker bestScores={bestScores} onUpdateBest={updateBest} />}
      </div>
    </section>
  );
}

function GameHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/50 bg-secondary/20 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
      <div>
        <p className="rift-eyebrow text-rift-red flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-rift-red animate-pulse" />
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide">{title}</h2>
        <p className="mt-1 max-w-xl text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ========================================================================= */
/* 1. AIM TRAINER (3D ThreeJS First-Person Esports Arena)                     */
/* ========================================================================= */

interface Target3D {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  id: number;
  createdAt: number;
  maxLife: number;
  targetScale: number;
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

function AimTrainer({
  bestScores,
  onUpdateBest,
}: {
  bestScores: ArcadeBestScores;
  onUpdateBest: (updater: (prev: ArcadeBestScores) => ArcadeBestScores) => void;
}) {
  const [running, setRunning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sensitivity, setSensitivity] = useState(1.8);
  const [fov, setFov] = useState(90);
  const [crosshairStyle, setCrosshairStyle] = useState<"dot" | "cross" | "circle">("cross");
  const [crosshairColor, setCrosshairColor] = useState<string>("#00ffcc");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [targetMode, setTargetMode] = useState<"reflex" | "grid">("reflex");
  const [isNewRecord, setIsNewRecord] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const nextTargetId = useRef(1);
  const scoreRef = useRef(score);
  const hitsRef = useRef(hits);
  const missesRef = useRef(misses);

  useEffect(() => {
    scoreRef.current = score;
    hitsRef.current = hits;
    missesRef.current = misses;
  }, [score, hits, misses]);

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    targets: Target3D[];
    particles: Particle3D[];
    yaw: number;
    pitch: number;
    raycaster: THREE.Raycaster;
  } | null>(null);

  const sensitivityRef = useRef(sensitivity);
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const fovRef = useRef(fov);
  useEffect(() => {
    fovRef.current = fov;
    if (threeRef.current?.camera) {
      threeRef.current.camera.fov = fov;
      threeRef.current.camera.updateProjectionMatrix();
    }
  }, [fov]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const targetModeRef = useRef(targetMode);
  useEffect(() => {
    targetModeRef.current = targetMode;
  }, [targetMode]);

  // Audio Synthesizers
  const playHitSound = useCallback((frequency = 880, type: OscillatorType = "sine", duration = 0.08) => {
    if (!soundEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  }, []);

  const playMissSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  }, []);

  // Request pointer lock
  const requestLock = useCallback(() => {
    if (!containerRef.current) return;
    if (document.pointerLockElement !== containerRef.current) {
      containerRef.current.requestPointerLock?.();
    }
  }, []);

  // Pointer lock listener
  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      setIsLocked(locked);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          queueMicrotask(() => {
            setRunning(false);
            if (document.pointerLockElement) {
              document.exitPointerLock?.();
            }

            // Evaluate best attempt
            const finalScore = scoreRef.current;
            const finalHits = hitsRef.current;
            const finalMisses = missesRef.current;
            const total = finalHits + finalMisses;
            const finalAcc = total > 0 ? Math.round((finalHits / total) * 100) : 0;

            if (finalScore > bestScores.aimScore) {
              setIsNewRecord(true);
              onUpdateBest((prevBest) => ({
                ...prevBest,
                aimScore: Math.max(prevBest.aimScore, finalScore),
                aimHits: Math.max(prevBest.aimHits, finalHits),
                aimAccuracy: finalAcc,
              }));
            }
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, bestScores.aimScore, onUpdateBest]);

  // Target spawning in 3D arena
  const spawnTarget3D = useCallback((scene: THREE.Scene) => {
    const geometry = new THREE.SphereGeometry(1.3, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe31c3d,
      emissive: 0xe31c3d,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Glow shell
    const glowGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff3b5c,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);

    // Arena spawn wall in front of player (X: -16 to 16, Y: -8 to 8, Z: -22 to -26)
    const x = (Math.random() - 0.5) * 28;
    const y = (Math.random() - 0.5) * 14;
    const z = -24 + (Math.random() - 0.5) * 4;

    mesh.position.set(x, y, z);
    glowMesh.position.set(x, y, z);
    mesh.scale.set(0.01, 0.01, 0.01);
    glowMesh.scale.set(0.01, 0.01, 0.01);

    scene.add(mesh);
    scene.add(glowMesh);

    return {
      mesh,
      glowMesh,
      id: nextTargetId.current++,
      createdAt: performance.now(),
      maxLife: targetModeRef.current === "reflex" ? 2200 : 3800,
      targetScale: 1.0,
    };
  }, []);

  // Spawn 3D hit particles
  const spawnParticles3D = (scene: THREE.Scene, pos: THREE.Vector3, color = 0xe31c3d) => {
    const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const pMat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 16; i++) {
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(pos);
      scene.add(pMesh);

      const speed = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;

      threeRef.current?.particles.push({
        mesh: pMesh,
        vx,
        vy,
        vz,
        life: 1.0,
      });
    }
  };

  // Three.js Scene Setup & Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06090e);
    scene.fog = new THREE.FogExp2(0x06090e, 0.022);

    const camera = new THREE.PerspectiveCamera(fovRef.current, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const redLight = new THREE.PointLight(0xe31c3d, 2.5, 40);
    redLight.position.set(0, 0, -10);
    scene.add(redLight);

    // 3D Cyber Training Arena (Grid Box Room)
    const roomGeo = new THREE.BoxGeometry(40, 24, 45);
    const roomMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      side: THREE.BackSide,
      roughness: 0.8,
      metalness: 0.2,
    });
    const roomMesh = new THREE.Mesh(roomGeo, roomMat);
    roomMesh.position.set(0, 0, -12);
    scene.add(roomMesh);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(40, 30, 0xe31c3d, 0x1e293b);
    gridHelper.position.set(0, -12, -12);
    scene.add(gridHelper);

    // Grid Back Wall Lines
    const backGrid = new THREE.GridHelper(40, 30, 0x38bdf8, 0x111827);
    backGrid.position.set(0, 0, -34.4);
    backGrid.rotation.x = Math.PI / 2;
    scene.add(backGrid);

    const raycaster = new THREE.Raycaster();

    threeRef.current = {
      scene,
      camera,
      renderer,
      targets: [],
      particles: [],
      yaw: 0,
      pitch: 0,
      raycaster,
    };

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Mouse Movement for First-Person Look
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== containerRef.current || !threeRef.current) return;

      const sens = sensitivityRef.current * 0.0016;
      threeRef.current.yaw -= e.movementX * sens;
      threeRef.current.pitch -= e.movementY * sens;

      // Pitch clamping (-85 deg to 85 deg)
      const maxPitch = (Math.PI / 2) * 0.94;
      threeRef.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, threeRef.current.pitch));

      // Apply euler rotation (YXZ order)
      threeRef.current.camera.rotation.set(0, 0, 0);
      threeRef.current.camera.rotation.y = threeRef.current.yaw;
      threeRef.current.camera.rotation.x = threeRef.current.pitch;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Render Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!threeRef.current) return;
      const { scene, camera, renderer, targets, particles } = threeRef.current;

      // Target animations & lifecycle
      if (runningRef.current) {
        const goalCount = targetModeRef.current === "grid" ? 4 : 3;
        while (targets.length < goalCount) {
          targets.push(spawnTarget3D(scene));
        }

        for (let i = targets.length - 1; i >= 0; i--) {
          const t = targets[i];
          if (!t) continue;
          const age = now - t.createdAt;

          // Target expiration in reflex mode
          if (age > t.maxLife && targetModeRef.current === "reflex") {
            scene.remove(t.mesh);
            scene.remove(t.glowMesh);
            t.mesh.geometry.dispose();
            (t.mesh.material as THREE.Material).dispose();
            t.glowMesh.geometry.dispose();
            (t.glowMesh.material as THREE.Material).dispose();

            spawnParticles3D(scene, t.mesh.position, 0x991b1b);
            targets.splice(i, 1);
            setMisses((m) => m + 1);
            setCombo(0);
            continue;
          }

          // Spawn scale up animation
          const scaleFrac = Math.min(1, age / 120);
          t.mesh.scale.setScalar(scaleFrac * t.targetScale);
          t.glowMesh.scale.setScalar(scaleFrac * t.targetScale);

          // Subtle pulse
          const pulse = 1 + Math.sin(now * 0.006 + t.id) * 0.06;
          t.glowMesh.scale.multiplyScalar(pulse);
        }
      }

      // Particles physics
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;

        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.life -= dt * 2.2;

        p.mesh.scale.setScalar(Math.max(0.01, p.life));

        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      renderer.dispose();
    };
  }, [spawnTarget3D]);

  // Start new run
  const startGame = useCallback(() => {
    if (threeRef.current) {
      const { scene, targets, particles } = threeRef.current;
      targets.forEach((t) => {
        scene.remove(t.mesh);
        scene.remove(t.glowMesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        t.glowMesh.geometry.dispose();
        (t.glowMesh.material as THREE.Material).dispose();
      });
      particles.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      threeRef.current.targets = [];
      threeRef.current.particles = [];
      threeRef.current.yaw = 0;
      threeRef.current.pitch = 0;
      threeRef.current.camera.rotation.set(0, 0, 0);

      const goalCount = targetMode === "grid" ? 4 : 3;
      for (let i = 0; i < goalCount; i++) {
        threeRef.current.targets.push(spawnTarget3D(scene));
      }
    }

    setRunning(true);
    setTime(60);
    setScore(0);
    setHits(0);
    setMisses(0);
    setCombo(0);
    setIsNewRecord(false);
    requestLock();
  }, [targetMode, spawnTarget3D, requestLock]);

  // Handle 3D Firing via Raycaster directly through fixed center crosshair (0, 0)
  const handleArenaClick = useCallback(() => {
    if (!running) {
      startGame();
      return;
    }

    if (!isLocked) {
      requestLock();
      return;
    }

    if (!threeRef.current) return;
    const { scene, camera, targets, raycaster } = threeRef.current;

    // Raycast from camera center (0, 0 in normalized device coords)
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const targetMeshes = targets.map((t) => t.mesh);
    const intersects = raycaster.intersectObjects(targetMeshes, false);

    if (intersects.length > 0 && intersects[0]) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const targetIndex = targets.findIndex((t) => t.mesh === hitMesh);

      if (targetIndex !== -1) {
        const hitTarget = targets[targetIndex];
        if (hitTarget) {
          spawnParticles3D(scene, hitTarget.mesh.position, 0xe31c3d);
          playHitSound(880, "triangle");

          scene.remove(hitTarget.mesh);
          scene.remove(hitTarget.glowMesh);
          hitTarget.mesh.geometry.dispose();
          (hitTarget.mesh.material as THREE.Material).dispose();
          hitTarget.glowMesh.geometry.dispose();
          (hitTarget.glowMesh.material as THREE.Material).dispose();

          targets.splice(targetIndex, 1);
          targets.push(spawnTarget3D(scene));

          setHits((h) => h + 1);
          setScore((s) => s + 100);
          setCombo((c) => c + 1);
        }
      }
    } else {
      // Missed shot
      playMissSound();
      setMisses((m) => m + 1);
      setCombo(0);
      setScore((s) => Math.max(0, s - 25));
    }
  }, [running, isLocked, startGame, requestLock, spawnTarget3D, playHitSound, playMissSound]);

  const totalShots = hits + misses;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 100;
  const scoreKps = hits > 0 ? (hits / (60 - time || 1)).toFixed(1) : "0.0";

  return (
    <div>
      <GameHeader
        eyebrow="3D FPS Training Arena"
        title="3D Aim Trainer"
        description="Full 3D first-person camera simulation with locked center crosshair. Move your mouse to aim, calibrate your exact sensitivity and FOV, and lock in."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground transition-colors hover:bg-secondary"
              title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </button>
            <button
              type="button"
              onClick={startGame}
              className="btn-primary flex items-center gap-2 shadow-[0_0_20px_rgba(227,28,61,0.4)]"
            >
              <RotateCcw className="h-4 w-4" />
              {running ? "Restart Run" : "Start Trainer"}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_280px]">
        {/* 3D Viewport with Fixed Center Crosshair Overlay */}
        <div
          onClick={handleArenaClick}
          className={`relative min-h-[440px] sm:min-h-[480px] w-full select-none overflow-hidden rounded-xl border transition-all ${
            isLocked
              ? "border-rift-red/80 shadow-[0_0_35px_rgba(227,28,61,0.2)] cursor-none"
              : "border-border/60 hover:border-rift-red/40 cursor-pointer"
          } bg-[#06090e]`}
        >
          {/* Three.js Canvas Container */}
          <div ref={containerRef} className="absolute inset-0 h-full w-full" />

          {/* PERMANENT TRUE CENTER CROSSHAIR */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {crosshairStyle === "dot" && (
              <div
                style={{ backgroundColor: crosshairColor, boxShadow: `0 0 8px ${crosshairColor}` }}
                className="h-2 w-2 rounded-full"
              />
            )}

            {crosshairStyle === "cross" && (
              <div className="relative flex items-center justify-center">
                {/* Center dot */}
                <div style={{ backgroundColor: crosshairColor }} className="h-1 w-1 rounded-full" />
                {/* Top */}
                <div
                  style={{ backgroundColor: crosshairColor, boxShadow: `0 0 6px ${crosshairColor}` }}
                  className="absolute bottom-1.5 h-2.5 w-0.5"
                />
                {/* Bottom */}
                <div
                  style={{ backgroundColor: crosshairColor, boxShadow: `0 0 6px ${crosshairColor}` }}
                  className="absolute top-1.5 h-2.5 w-0.5"
                />
                {/* Left */}
                <div
                  style={{ backgroundColor: crosshairColor, boxShadow: `0 0 6px ${crosshairColor}` }}
                  className="absolute right-1.5 h-0.5 w-2.5"
                />
                {/* Right */}
                <div
                  style={{ backgroundColor: crosshairColor, boxShadow: `0 0 6px ${crosshairColor}` }}
                  className="absolute left-1.5 h-0.5 w-2.5"
                />
              </div>
            )}

            {crosshairStyle === "circle" && (
              <div
                style={{ borderColor: crosshairColor, boxShadow: `0 0 8px ${crosshairColor}` }}
                className="flex h-5 w-5 items-center justify-center rounded-full border-2"
              >
                <div style={{ backgroundColor: crosshairColor }} className="h-1 w-1 rounded-full" />
              </div>
            )}
          </div>

          {/* Top HUD Overlay */}
          <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-black/70 px-3 py-1.5 font-bold text-foreground border border-white/10 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-rift-red animate-ping" />
                {time}s
              </span>
              <span className="rounded-md bg-black/70 px-3 py-1.5 text-rift-red font-bold border border-white/10 backdrop-blur-md">
                {score.toLocaleString()} PTS
              </span>
            </div>

            {combo > 1 && (
              <div className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 font-bold text-amber-300 border border-amber-500/40 animate-bounce backdrop-blur-md">
                <Flame className="h-3.5 w-3.5 fill-amber-400" />
                {combo}x STREAK
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  isLocked
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {isLocked ? "MOUSE LOCKED [ESC to release]" : "CLICK 3D ARENA TO LOCK"}
              </span>
            </div>
          </div>

          {/* Idle start screen */}
          {!running && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6 text-center backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rift-red/40 bg-rift-red/10 text-rift-red shadow-[0_0_30px_rgba(227,28,61,0.3)]">
                <Crosshair className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase tracking-wider">3D Aim Trainer Arena</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                First-person 3D mouse look with true center crosshair. Click to capture mouse and shoot neon targets.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rift-red px-5 py-2.5 font-display text-sm font-bold uppercase text-white shadow-lg shadow-rift-red/40">
                Click To Lock & Play
              </div>
            </div>
          )}

          {running && !isLocked && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-950/80 px-4 py-2 font-mono text-xs text-amber-200 shadow-xl backdrop-blur-md">
                <ShieldAlert className="h-4 w-4 animate-bounce text-amber-400" />
                Click arena to re-lock mouse look
              </div>
            </div>
          )}
        </div>

        {/* Telemetry & Controls */}
        <div className="flex flex-col justify-between space-y-6">
          {/* Player Personal Best Display */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-3.5 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Player Best Attempt
              </span>
              {isNewRecord && (
                <span className="animate-pulse rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-black">
                  NEW RECORD!
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-2xl font-black text-amber-300">
                {bestScores.aimScore > 0 ? `${bestScores.aimScore.toLocaleString()} PTS` : "0 PTS"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {bestScores.aimHits > 0 ? `${bestScores.aimHits} hits (${bestScores.aimAccuracy}%)` : "No attempts recorded"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Current Hits" value={hits} highlight />
            <Metric label="Accuracy" value={`${accuracy}%`} />
            <Metric label="Current Score" value={score} />
            <Metric label="Speed" value={`${scoreKps} /s`} />
          </div>

          <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/30 p-4">
            {/* Mouse Sensitivity */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-foreground">Sensitivity</span>
                <span className="font-mono text-xs font-bold text-rift-red">{sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.05"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="mt-2.5 w-full accent-rift-red cursor-pointer"
              />
              <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
                <span>0.2x (Slow)</span>
                <span>1.8x (Default)</span>
                <span>4.0x (Fast)</span>
              </div>
            </div>

            {/* Camera FOV */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-foreground">Field of View (FOV)</span>
                <span className="font-mono text-xs font-bold text-rift-red">{fov}°</span>
              </div>
              <input
                type="range"
                min="65"
                max="115"
                step="1"
                value={fov}
                onChange={(e) => setFov(parseInt(e.target.value))}
                className="mt-2.5 w-full accent-rift-red cursor-pointer"
              />
            </div>

            {/* Training Mode */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Training Mode
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetMode("reflex")}
                  className={`rounded-md px-2.5 py-1.5 text-center font-display text-[11px] font-bold uppercase transition-all ${
                    targetMode === "reflex" ? "bg-rift-red text-white" : "bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reflex (Flick)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("grid")}
                  className={`rounded-md px-2.5 py-1.5 text-center font-display text-[11px] font-bold uppercase transition-all ${
                    targetMode === "grid" ? "bg-rift-red text-white" : "bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Grid Shot
                </button>
              </div>
            </div>

            {/* Crosshair Customizer */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Center Crosshair
              </span>
              <div className="flex items-center gap-2">
                {(["cross", "dot", "circle"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCrosshairStyle(style)}
                    className={`flex-1 rounded-md py-1.5 text-center font-mono text-[10px] uppercase font-bold transition-all ${
                      crosshairStyle === style ? "border border-rift-red bg-rift-red/20 text-foreground" : "bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                {["#00ffcc", "#e31c3d", "#39ff14", "#ff007f", "#ffffff"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCrosshairColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      crosshairColor === color ? "scale-110 border-white shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-black/40 p-3 text-center font-mono text-[10px] text-muted-foreground border border-white/5">
            Tip: Press <kbd className="rounded bg-secondary px-1 text-foreground">ESC</kbd> at any time to release your mouse cursor.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 2. REACTION TEST                                                          */
/* ========================================================================= */

function ReactionTest({
  bestScores,
  onUpdateBest,
}: {
  bestScores: ArcadeBestScores;
  onUpdateBest: (updater: (prev: ArcadeBestScores) => ArcadeBestScores) => void;
}) {
  const [status, setStatus] = useState<"idle" | "waiting" | "ready" | "result" | "early">("idle");
  const [result, setResult] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const startedAt = useRef(0);
  const timeout = useRef<number | null>(null);

  function start() {
    if (timeout.current) window.clearTimeout(timeout.current);
    setResult(null);
    setIsNewRecord(false);
    setStatus("waiting");
    timeout.current = window.setTimeout(() => {
      startedAt.current = performance.now();
      setStatus("ready");
    }, 1500 + Math.random() * 3000);
  }

  function clickArea() {
    if (status === "waiting") {
      if (timeout.current) window.clearTimeout(timeout.current);
      setStatus("early");
      return;
    }
    if (status === "ready") {
      const ms = Math.round(performance.now() - startedAt.current);
      setResult(ms);
      setStatus("result");

      // Lower reaction time is better
      if (bestScores.reactionTime === null || ms < bestScores.reactionTime) {
        setIsNewRecord(true);
        onUpdateBest((prev) => ({
          ...prev,
          reactionTime: prev.reactionTime === null ? ms : Math.min(prev.reactionTime, ms),
        }));
      }
    }
  }

  return (
    <div>
      <GameHeader
        eyebrow="Reflex Benchmarking"
        title="Reaction Time Test"
        description="Wait for the panel to turn bright emerald, then click or tap instantly. Pro esports players average around 180ms."
        action={
          <button type="button" onClick={start} className="btn-primary">
            {status === "result" || status === "early" ? "Try Again" : "Start Test"}
          </button>
        }
      />
      <div className="p-5 sm:p-7 space-y-4">
        {/* Player Best Attempt Banner */}
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
              Player Best Attempt
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isNewRecord && (
              <span className="animate-pulse rounded bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-black">
                NEW RECORD!
              </span>
            )}
            <span className="font-display text-xl font-black text-amber-300">
              {bestScores.reactionTime !== null ? `${bestScores.reactionTime} ms` : "No attempt yet"}
            </span>
          </div>
        </div>

        <div
          onClick={clickArea}
          className={`flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-2xl border transition-all select-none ${
            status === "ready"
              ? "border-emerald-400 bg-emerald-500/25 shadow-[0_0_50px_rgba(52,211,153,0.35)]"
              : status === "waiting"
              ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
              : status === "early"
              ? "border-rift-red/60 bg-rift-red/20 shadow-[0_0_30px_rgba(227,28,61,0.2)]"
              : "border-border/60 bg-secondary/30 hover:border-rift-red/40"
          }`}
        >
          <div className="text-center p-6">
            <span className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-wide">
              {status === "idle" && "Click Start Test"}
              {status === "waiting" && "Wait for Green..."}
              {status === "ready" && "CLICK NOW!"}
              {status === "result" && `${result} ms`}
              {status === "early" && "Too early!"}
            </span>
            <p className="mt-3 text-sm text-muted-foreground font-mono">
              {status === "idle" && "Press the start button above to test your reflexes."}
              {status === "waiting" && "Do not click yet or it will trigger a false start."}
              {status === "ready" && "Lightning fast reflexes required!"}
              {status === "result" && (result && result < 200 ? "⚡ Godlike tier reaction!" : result && result < 260 ? "🔥 Great esports reflex!" : "Good effort. Practice makes perfect.")}
              {status === "early" && "You clicked before the signal turned green. Click here or restart."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Current Latency" value={result ? `${result}ms` : "--"} highlight={Boolean(result)} />
          <Metric label="Player Best" value={bestScores.reactionTime !== null ? `${bestScores.reactionTime}ms` : "--"} />
          <Metric label="Esports Pro Benchmark" value="~185ms" />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. TYPING RACE (Normal Word Sprint - Lowercase, No Punctuation, Endless)  */
/* ========================================================================= */

const RAW_WORD_BANK: string[] = [
  "climb", "together", "compete", "purpose", "leave", "mark", "every", "match",
  "leaderboard", "precision", "speed", "victory", "champion", "reflex", "tactical",
  "focus", "strike", "power", "team", "squad", "crosshair", "recoil", "control",
  "battle", "arena", "player", "gaming", "esports", "fast", "velocity", "target",
  "score", "points", "rank", "glory", "legend", "shadow", "rush", "defend", "attack",
  "clutch", "headshot", "round", "tournament", "champion", "energy", "burst", "streak",
  "flow", "motion", "mastery", "custom", "profile", "discord", "challenge", "winner",
  "arcade", "system", "dynamic", "clean", "impact", "quick", "reflexes", "sharp",
  "vision", "action", "pulse", "drive", "zone", "pace", "focus", "timing", "skill",
  "clash", "storm", "rival", "apex", "dominance", "execute", "strategy", "prime"
];

function generateWordBatch(count = 40): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * RAW_WORD_BANK.length);
    words.push(RAW_WORD_BANK[randomIndex] ?? "rift");
  }
  return words;
}

function TypingRace({
  bestScores,
  onUpdateBest,
}: {
  bestScores: ArcadeBestScores;
  onUpdateBest: (updater: (prev: ArcadeBestScores) => ArcadeBestScores) => void;
}) {
  const [running, setRunning] = useState(false);
  const [words, setWords] = useState<string[]>(() => generateWordBatch(50));
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [wordStatuses, setWordStatuses] = useState<("correct" | "incorrect" | "pending")[]>([]);
  const [seconds, setSeconds] = useState(30);
  const [totalSeconds, setTotalSeconds] = useState(30);
  const [finished, setFinished] = useState(false);
  const [correctWordCount, setCorrectWordCount] = useState(0);
  const [incorrectWordCount, setIncorrectWordCount] = useState(0);
  const [correctCharCount, setCorrectCharCount] = useState(0);
  const [totalCharCount, setTotalCharCount] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wordContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const statsRef = useRef({ correctCharCount: 0, totalCharCount: 0, totalSeconds: 30 });

  useEffect(() => {
    statsRef.current = { correctCharCount, totalCharCount, totalSeconds };
  }, [correctCharCount, totalCharCount, totalSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!running || finished) return;
    const timer = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          queueMicrotask(() => {
            setRunning(false);
            setFinished(true);

            // Evaluate score on finish
            const durMin = statsRef.current.totalSeconds / 60;
            const finalWpm = durMin > 0 ? Math.round((statsRef.current.correctCharCount / 5) / durMin) : 0;
            const finalAcc = statsRef.current.totalCharCount > 0
              ? Math.round((statsRef.current.correctCharCount / statsRef.current.totalCharCount) * 100)
              : 100;

            if (finalWpm > bestScores.typingWpm) {
              setIsNewRecord(true);
              onUpdateBest((prevBest) => ({
                ...prevBest,
                typingWpm: Math.max(prevBest.typingWpm, finalWpm),
                typingAccuracy: finalAcc,
              }));
            }
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, finished, bestScores.typingWpm, onUpdateBest]);

  // Keep adding more words if user is nearing the end of current list
  useEffect(() => {
    if (currentWordIndex >= words.length - 15) {
      setWords((prev) => [...prev, ...generateWordBatch(40)]);
    }
  }, [currentWordIndex, words.length]);

  // Auto-scroll word container so the current word and upcoming words are always visible in view
  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [currentWordIndex]);

  const startRace = (duration = 30) => {
    const newWords = generateWordBatch(50);
    setWords(newWords);
    setCurrentWordIndex(0);
    setCurrentInput("");
    setWordStatuses([]);
    setTotalSeconds(duration);
    setSeconds(duration);
    setFinished(false);
    setRunning(true);
    setCorrectWordCount(0);
    setIncorrectWordCount(0);
    setCorrectCharCount(0);
    setTotalCharCount(0);
    setIsNewRecord(false);
    startTimeRef.current = performance.now();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (!running && !finished) {
      setRunning(true);
      startTimeRef.current = performance.now();
    }

    // Space advances to next word
    if (val.endsWith(" ")) {
      const trimmedVal = val.trim();
      if (trimmedVal.length === 0) return; // ignore initial accidental spaces

      const targetWord = words[currentWordIndex] ?? "";
      const isCorrect = trimmedVal === targetWord;

      // Track stats
      if (isCorrect) {
        setCorrectWordCount((c) => c + 1);
        setCorrectCharCount((c) => c + targetWord.length + 1); // include space
      } else {
        setIncorrectWordCount((c) => c + 1);
      }
      setTotalCharCount((c) => c + trimmedVal.length + 1);

      setWordStatuses((prev) => {
        const next = [...prev];
        next[currentWordIndex] = isCorrect ? "correct" : "incorrect";
        return next;
      });

      setCurrentWordIndex((i) => i + 1);
      setCurrentInput("");
    } else {
      setCurrentInput(val.toLowerCase().replace(/[^a-z]/g, ""));
    }
  };

  // Keyboard navigation (backspace to fix or reset)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && currentInput === "" && currentWordIndex > 0) {
      // Optional: don't jump back to keep simple standard race flow
    }
  };

  const elapsedMinutes = startTimeRef.current
    ? Math.max(0.01, (performance.now() - startTimeRef.current) / 60000)
    : 0.01;

  const netWpm = elapsedMinutes > 0 ? Math.round((correctCharCount / 5) / elapsedMinutes) : 0;
  const rawWpm = elapsedMinutes > 0 ? Math.round((totalCharCount / 5) / elapsedMinutes) : 0;
  const accuracy = totalCharCount > 0 ? Math.round((correctCharCount / totalCharCount) * 100) : 100;

  return (
    <div>
      <GameHeader
        eyebrow="Speed & Velocity"
        title="Typing Race"
        description="Type continuous lowercase words as fast as you can. Hit SPACE to submit each word. Words auto-replenish endlessly until the timer ends."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startRace(totalSeconds)}
              className="btn-primary flex items-center gap-2 shadow-[0_0_15px_rgba(227,28,61,0.3)]"
            >
              <RotateCcw className="h-4 w-4" />
              {running ? "Restart Sprint" : "Start Race"}
            </button>
          </div>
        }
      />

      <div className="p-5 sm:p-7 space-y-6">
        {/* Player Best Attempt Banner */}
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
              Player Best Attempt
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isNewRecord && (
              <span className="animate-pulse rounded bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-black">
                NEW RECORD!
              </span>
            )}
            <span className="font-display text-xl font-black text-amber-300">
              {bestScores.typingWpm > 0 ? `${bestScores.typingWpm} WPM (${bestScores.typingAccuracy}% ACC)` : "No attempt yet"}
            </span>
          </div>
        </div>
        {/* Sprint Header & Timer selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">Duration:</span>
            {[15, 30, 60].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => startRace(t)}
                className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                  totalSeconds === t
                    ? "bg-rift-red text-white shadow-md shadow-rift-red/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="flex items-center gap-2 rounded-lg bg-black/70 px-3.5 py-1.5 font-bold text-foreground border border-white/10 backdrop-blur-md">
              <span className={`h-2 w-2 rounded-full ${running ? "bg-rift-red animate-ping" : "bg-muted-foreground"}`} />
              {seconds}s left
            </span>
          </div>
        </div>

        {/* Word Display Stream Box */}
        <div
          ref={wordContainerRef}
          onClick={() => inputRef.current?.focus()}
          className="relative h-44 overflow-y-auto rounded-xl border border-border/80 bg-[#070b10] p-6 font-mono text-xl sm:text-2xl leading-relaxed select-none transition-all scroll-smooth"
        >
          <div className="flex flex-wrap gap-x-3.5 gap-y-3">
            {words.map((word, index) => {
              const isCurrent = index === currentWordIndex;
              const status = wordStatuses[index];
              const isPending = !status && !isCurrent;

              // Check if current word has typos while being typed
              let isTypo = false;
              if (isCurrent && currentInput.length > 0) {
                isTypo = !word.startsWith(currentInput);
              }

              return (
                <span
                  key={`${word}-${index}`}
                  ref={isCurrent ? activeWordRef : null}
                  className={`rounded-md px-2 py-0.5 transition-all font-mono tracking-wide ${
                    status === "correct"
                      ? "text-emerald-400 opacity-70"
                      : status === "incorrect"
                      ? "text-rift-red bg-rift-red/20 line-through opacity-80"
                      : isCurrent
                      ? isTypo
                        ? "bg-rift-red/30 text-rift-red border border-rift-red font-bold"
                        : "bg-white/10 text-white font-bold border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      : isPending
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>

          {!running && !finished && currentInput.length === 0 && currentWordIndex === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <div className="rounded-lg border border-white/10 bg-black/80 px-5 py-2.5 font-display text-sm uppercase text-foreground shadow-2xl">
                Type in the box below or press <span className="text-rift-red font-bold">Start Race</span>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Fast Typing Input Bar */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={finished || seconds <= 0}
            placeholder={running ? "Type the highlighted word and press space..." : "Click Start Race to begin typing..."}
            className="w-full rounded-xl border-2 border-border bg-secondary/30 px-5 py-3.5 font-mono text-lg text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-rift-red focus:bg-background/80 focus:shadow-[0_0_25px_rgba(227,28,61,0.25)] disabled:opacity-50"
            autoFocus
            aria-label="Typing input field"
          />
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground border border-white/10">
            [SPACE] for next word
          </div>
        </div>

        {/* Real-time Telemetry */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Net WPM" value={netWpm} highlight />
          <Metric label="Accuracy" value={`${accuracy}%`} />
          <Metric label="Correct Words" value={correctWordCount} />
          <Metric label="Raw Speed" value={`${rawWpm} WPM`} />
        </div>

        {/* Final Score Card on Completion */}
        {finished && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-display text-lg font-bold uppercase text-emerald-300">Race Finished!</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Score: <span className="font-bold text-foreground text-sm">{netWpm} WPM</span> with <span className="font-bold text-foreground text-sm">{accuracy}% accuracy</span> ({correctWordCount} words correct, {incorrectWordCount} errors).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => startRace(totalSeconds)}
              className="btn-primary shrink-0 text-xs px-5 py-2.5 shadow-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 4. RIFT CLICKER (CPS Burst)                                               */
/* ========================================================================= */

function RiftClicker({
  bestScores,
  onUpdateBest,
}: {
  bestScores: ArcadeBestScores;
  onUpdateBest: (updater: (prev: ArcadeBestScores) => ArcadeBestScores) => void;
}) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(10);
  const [clicks, setClicks] = useState(0);
  const [highestCps, setHighestCps] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const clicksRef = useRef(0);

  useEffect(() => {
    clicksRef.current = clicks;
  }, [clicks]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((v) => {
        if (v <= 1) {
          window.clearInterval(timer);
          // Defer finish and score record outside of render / state updater
          queueMicrotask(() => {
            setRunning(false);
            const finalClicks = clicksRef.current;
            const finalCps = finalClicks / 10;

            if (finalCps > bestScores.clickerCps) {
              setIsNewRecord(true);
              onUpdateBest((prev) => ({
                ...prev,
                clickerCps: Math.max(prev.clickerCps, finalCps),
                clickerClicks: Math.max(prev.clickerClicks, finalClicks),
              }));
            }
          });
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, bestScores.clickerCps, onUpdateBest]);

  function start() {
    setRunning(true);
    setSeconds(10);
    setClicks(0);
    setHighestCps(0);
    setIsNewRecord(false);
  }

  const currentCps = clicks > 0 ? (clicks / Math.max(1, 10 - seconds)).toFixed(1) : "0.0";

  const handleClick = () => {
    if (!running && seconds === 10) {
      setRunning(true);
      setIsNewRecord(false);
    }
    if (running || seconds === 10) {
      setClicks((c) => {
        const next = c + 1;
        const cps = next / Math.max(1, 10 - seconds);
        setHighestCps((h) => Math.max(h, cps));
        return next;
      });
    }
  };

  return (
    <div>
      <GameHeader
        eyebrow="Burst CPS Benchmark"
        title="RIFT Clicker"
        description="Click the energy core as fast as possible in 10 seconds to test your jitter and butterfly click speed."
        action={
          <button type="button" onClick={start} className="btn-primary">
            {running ? "Restart Round" : "Start Round"}
          </button>
        }
      />
      <div className="p-5 sm:p-7 space-y-4">
        {/* Player Best Attempt Banner */}
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
              Player Best Attempt
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isNewRecord && (
              <span className="animate-pulse rounded bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-black">
                NEW RECORD!
              </span>
            )}
            <span className="font-display text-xl font-black text-amber-300">
              {bestScores.clickerCps > 0
                ? `${bestScores.clickerCps.toFixed(1)} CPS (${bestScores.clickerClicks} clicks)`
                : "No attempt yet"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={seconds <= 0}
          className="group relative flex min-h-[320px] w-full items-center justify-center overflow-hidden rounded-2xl border border-rift-red/40 bg-[#16070d] shadow-[inset_0_0_90px_rgba(227,28,61,0.2)] transition-all active:scale-[0.99] select-none cursor-pointer"
        >
          <span className="absolute right-5 top-5 font-mono text-xs text-muted-foreground border border-white/10 rounded-md px-3 py-1 bg-black/40">
            {seconds}s left
          </span>
          <div className="flex flex-col items-center">
            <span className="flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full border-4 border-rift-red bg-rift-red/20 font-display text-5xl sm:text-6xl font-extrabold text-rift-red shadow-[0_0_65px_rgba(227,28,61,0.5)] transition-transform group-active:scale-95 group-hover:scale-105">
              {clicks}
            </span>
            <span className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {running ? "Click as fast as you can!" : seconds === 10 ? "Click to start immediately" : "Time is up!"}
            </span>
          </div>
        </button>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="Total Clicks" value={clicks} highlight />
          <Metric label="Current CPS" value={currentCps} />
          <Metric label="Player Best CPS" value={bestScores.clickerCps > 0 ? bestScores.clickerCps.toFixed(1) : "--"} />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* Reusable Metric Card                                                      */
/* ========================================================================= */

function Metric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-center border transition-all ${
        highlight
          ? "bg-rift-red/10 border-rift-red/40 shadow-[0_0_15px_rgba(227,28,61,0.1)]"
          : "bg-secondary/40 border-border/50"
      }`}
    >
      <p className={`font-display text-xl sm:text-2xl font-bold ${highlight ? "text-rift-red" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
