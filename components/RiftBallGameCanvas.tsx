"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Flame, ShieldAlert, Sparkles } from "lucide-react";

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  avatar: string | null;
  isPlayer1: boolean;
  keys: { [key: string]: boolean };
  facingAngle: number;
  kickCooldown: number;
  sprintStamina: number;
  hasBall: boolean;
  isDefending: boolean;
  tackleCooldown: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

const FIELD_WIDTH = 1200;
const FIELD_HEIGHT = 650;
const PITCH_MARGIN_X = 70;
const PITCH_MARGIN_Y = 45;
const PITCH_LEFT = PITCH_MARGIN_X;
const PITCH_RIGHT = FIELD_WIDTH - PITCH_MARGIN_X;
const PITCH_TOP = PITCH_MARGIN_Y;
const PITCH_BOTTOM = FIELD_HEIGHT - PITCH_MARGIN_Y;

const PLAYER_RADIUS = 24;
const BALL_RADIUS = 13;
const BASE_PLAYER_SPEED = 4.2;
const SPRINT_MULTIPLIER = 1.45;
const BALL_FRICTION = 0.985;
const PLAYER_FRICTION = 0.88;
const GOAL_DEPTH = 65;
const GOAL_HEIGHT = 180;
const MATCH_DURATION_SECONDS = 90;

const STORAGE_KEY = "riftball_best_record_v2";

export type RiftBallRecord = {
  wins: number;
  losses: number;
  bestGoalDiff: number;
  totalGoalsScored: number;
  highestScoreInMatch: number;
};

const DEFAULT_RECORD: RiftBallRecord = {
  wins: 0,
  losses: 0,
  bestGoalDiff: 0,
  totalGoalsScored: 0,
  highestScoreInMatch: 0,
};

export default function RiftBallGameCanvas() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio mute
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Match states
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [matchTime, setMatchTime] = useState(MATCH_DURATION_SECONDS);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const scoreRef = useRef<[number, number]>([0, 0]);
  const matchEndedRef = useRef(false);
  const [matchOver, setMatchOver] = useState(false);
  const [difficulty, setDifficulty] = useState<"normal" | "pro" | "champion">("pro");
  const [record, setRecord] = useState<RiftBallRecord>(DEFAULT_RECORD);
  const [isNewBest, setIsNewBest] = useState(false);

  // Keep scoreRef up to date
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Load record from localStorage with fallback to migrate and normalize v1 if needed
  useEffect(() => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_KEY);
      if (savedV2) {
        setRecord(JSON.parse(savedV2));
        return;
      }
      // If user had v1 with doubled stats, halve them cleanly
      const savedV1 = localStorage.getItem("riftball_best_record_v1");
      if (savedV1) {
        const parsed = JSON.parse(savedV1);
        const normalized: RiftBallRecord = {
          wins: Math.floor((parsed.wins || 0) / 2),
          losses: Math.floor((parsed.losses || 0) / 2),
          bestGoalDiff: parsed.bestGoalDiff || 0,
          totalGoalsScored: Math.floor((parsed.totalGoalsScored || 0) / 2),
          highestScoreInMatch: parsed.highestScoreInMatch || 0,
        };
        setRecord(normalized);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch {}
  }, []);

  const saveRecord = useCallback((updater: (prev: RiftBallRecord) => RiftBallRecord) => {
    setRecord((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Web Audio Synthesizer
  const playSound = useCallback((type: "kick" | "goal" | "whistle" | "bounce" | "tackle") => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = ctx.currentTime;

      if (type === "kick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "bounce") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "tackle") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "whistle") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.setValueAtTime(2800, now + 0.06);
        osc.frequency.setValueAtTime(2400, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "goal") {
        // Multi-tone chord for goal celebration
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.2, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + 1.2);
        });
      }
    } catch {}
  }, []);

  // Game internal mutable state
  const stateRef = useRef<{
    p1: Player;
    p2: Player;
    ball: Ball;
    particles: Particle[];
    goalCooldown: number; // freeze after goal
    goalScoredSide: "p1" | "p2" | null;
    goalFlash: number;
    shootCharging: boolean;
    shootPower: number;
    difficulty: "normal" | "pro" | "champion";
  }>({
    p1: {
      x: PITCH_LEFT + 180,
      y: FIELD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      avatar: session?.user?.image ?? null,
      isPlayer1: true,
      keys: {},
      facingAngle: 0,
      kickCooldown: 0,
      sprintStamina: 100,
      hasBall: false,
      isDefending: false,
      tackleCooldown: 0,
    },
    p2: {
      x: PITCH_RIGHT - 180,
      y: FIELD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RiftKeeper&backgroundColor=purple",
      isPlayer1: false,
      keys: {},
      facingAngle: Math.PI,
      kickCooldown: 0,
      sprintStamina: 100,
      hasBall: false,
      isDefending: false,
      tackleCooldown: 0,
    },
    ball: {
      x: FIELD_WIDTH / 2,
      y: FIELD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      trail: [],
    },
    particles: [],
    goalCooldown: 0,
    goalScoredSide: null,
    goalFlash: 0,
    shootCharging: false,
    shootPower: 0,
    difficulty: "pro",
  });

  const pauseRef = useRef(false);
  const avatarImgsRef = useRef<{ p1?: HTMLImageElement; p2?: HTMLImageElement }>({});

  useEffect(() => {
    stateRef.current.difficulty = difficulty;
  }, [difficulty]);

  // Preload avatars
  useEffect(() => {
    if (session?.user?.image) {
      const img1 = new Image();
      img1.crossOrigin = "anonymous";
      img1.src = session.user.image;
      img1.onload = () => {
        avatarImgsRef.current.p1 = img1;
      };
    }
    const img2 = new Image();
    img2.crossOrigin = "anonymous";
    img2.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=RiftKeeper&backgroundColor=purple";
    img2.onload = () => {
      avatarImgsRef.current.p2 = img2;
    };
  }, [session?.user?.image]);

  const resetPositions = useCallback((whoScored?: "p1" | "p2") => {
    const s = stateRef.current;
    s.p1.x = PITCH_LEFT + 220;
    s.p1.y = FIELD_HEIGHT / 2;
    s.p1.vx = 0;
    s.p1.vy = 0;
    s.p1.facingAngle = 0;
    s.p1.hasBall = false;
    s.p1.isDefending = false;
    s.p1.tackleCooldown = 0;

    s.p2.x = PITCH_RIGHT - 220;
    s.p2.y = FIELD_HEIGHT / 2;
    s.p2.vx = 0;
    s.p2.vy = 0;
    s.p2.facingAngle = Math.PI;
    s.p2.hasBall = false;
    s.p2.isDefending = false;
    s.p2.tackleCooldown = 0;

    s.ball.x = FIELD_WIDTH / 2;
    s.ball.y = FIELD_HEIGHT / 2;
    s.ball.vx = whoScored === "p1" ? -1.5 : whoScored === "p2" ? 1.5 : 0;
    s.ball.vy = (Math.random() - 0.5) * 1.5;
    s.ball.trail = [];
    s.shootCharging = false;
    s.shootPower = 0;
  }, []);

  const spawnGoalParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 5,
        alpha: 1.0,
        life: 1.0,
      });
    }
  };

  // Match countdown timer
  useEffect(() => {
    if (!gameStarted || isPaused || matchOver) return;
    const timer = window.setInterval(() => {
      setMatchTime((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (!matchEndedRef.current) {
            matchEndedRef.current = true;
            setMatchOver(true);
            playSound("whistle");

            // Evaluate Match Result & Personal Record safely once
            const [p1Score, p2Score] = scoreRef.current;
            const diff = p1Score - p2Score;
            const isWin = p1Score > p2Score;

            saveRecord((prevRec) => {
              const newWins = isWin ? prevRec.wins + 1 : prevRec.wins;
              const newLosses = p2Score > p1Score ? prevRec.losses + 1 : prevRec.losses;
              const newTotalGoals = prevRec.totalGoalsScored + p1Score;
              const newBestDiff = Math.max(prevRec.bestGoalDiff, diff);
              const newHighMatch = Math.max(prevRec.highestScoreInMatch, p1Score);

              if (p1Score > prevRec.highestScoreInMatch || diff > prevRec.bestGoalDiff) {
                setIsNewBest(true);
              }

              return {
                wins: newWins,
                losses: newLosses,
                bestGoalDiff: newBestDiff,
                totalGoalsScored: newTotalGoals,
                highestScoreInMatch: newHighMatch,
              };
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameStarted, isPaused, matchOver, playSound, saveRecord]);

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!stateRef.current) return;

      if ((key === "p" || key === "escape") && gameStarted && !matchOver) {
        e.preventDefault();
        pauseRef.current = !pauseRef.current;
        setIsPaused(pauseRef.current);
        return;
      }

      stateRef.current.p1.keys[key] = true;

      // Space key handling: shoot charging if holding ball, defending stance if not holding ball
      if (e.key === " " && !matchOver) {
        e.preventDefault();
        const p1 = stateRef.current.p1;
        if (p1.hasBall) {
          stateRef.current.shootCharging = true;
        } else {
          p1.isDefending = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!stateRef.current) return;
      stateRef.current.p1.keys[key] = false;

      // Release space key
      if (e.key === " " && !matchOver) {
        e.preventDefault();
        const p1 = stateRef.current.p1;
        const ball = stateRef.current.ball;

        // If player was charging a shot while in possession of the ball:
        if (stateRef.current.shootCharging && p1.hasBall) {
          // Release and kick the ball with charged power
          p1.hasBall = false;
          // Shoot in player's facing direction
          const shootAngle = p1.facingAngle;
          // Base power 10, scales up to 30 based on charge
          const power = 10 + (stateRef.current.shootPower / 100) * 20;
          ball.vx = Math.cos(shootAngle) * power;
          ball.vy = Math.sin(shootAngle) * power;
          // Offset ball slightly ahead so player doesn't instantly recapture
          ball.x = p1.x + Math.cos(shootAngle) * (p1.radius + ball.radius + 6);
          ball.y = p1.y + Math.sin(shootAngle) * (p1.radius + ball.radius + 6);
          p1.kickCooldown = 20;
          playSound("kick");
        }

        // Reset defending & charging states
        p1.isDefending = false;
        stateRef.current.shootCharging = false;
        stateRef.current.shootPower = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameStarted, matchOver, playSound]);

  // Main game update physics
  const updateGamePhysics = useCallback(() => {
    if (!gameStarted || pauseRef.current || matchOver) return;

    const s = stateRef.current;
    const { p1, p2, ball } = s;

    // Handle Goal Celebration Freeze
    if (s.goalCooldown > 0) {
      s.goalCooldown -= 1 / 60;
      s.goalFlash = Math.max(0, s.goalFlash - 0.02);
      if (s.goalCooldown <= 0) {
        resetPositions(s.goalScoredSide ?? undefined);
        s.goalScoredSide = null;
      }
      return;
    }

    // Power shot charge accumulator
    if (s.shootCharging && p1.hasBall) {
      s.shootPower = Math.min(100, s.shootPower + 2.4);
    }

    // Decrement kick & tackle cooldowns
    if (p1.kickCooldown > 0) p1.kickCooldown--;
    if (p2.kickCooldown > 0) p2.kickCooldown--;
    if (p1.tackleCooldown > 0) p1.tackleCooldown--;
    if (p2.tackleCooldown > 0) p2.tackleCooldown--;

    // 1. PLAYER 1 (Human) MOVEMENT, SPRINT & DEFENDING/BALL POSSESSION SLOW
    const isSprinting = Boolean(p1.keys["shift"]) && p1.sprintStamina > 5 && !p1.isDefending;
    // When in defending state (holding space without ball), player is slowed (55% speed)
    const defendSlowMult = p1.isDefending ? 0.55 : 1.0;
    // When holding the ball, dribbling slows the player down (78% speed)
    const ballPossessionSlowMult = p1.hasBall ? 0.78 : 1.0;
    const moveSpeed = BASE_PLAYER_SPEED * (isSprinting ? SPRINT_MULTIPLIER : 1.0) * defendSlowMult * ballPossessionSlowMult;

    let ax1 = 0;
    let ay1 = 0;
    if (p1.keys["w"] || p1.keys["arrowup"]) ay1 -= 1;
    if (p1.keys["s"] || p1.keys["arrowdown"]) ay1 += 1;
    if (p1.keys["a"] || p1.keys["arrowleft"]) ax1 -= 1;
    if (p1.keys["d"] || p1.keys["arrowright"]) ax1 += 1;

    if (ax1 !== 0 || ay1 !== 0) {
      const mag = Math.hypot(ax1, ay1);
      p1.vx += (ax1 / mag) * moveSpeed * 0.3;
      p1.vy += (ay1 / mag) * moveSpeed * 0.3;
      p1.facingAngle = Math.atan2(ay1, ax1);

      if (isSprinting) {
        p1.sprintStamina = Math.max(0, p1.sprintStamina - 0.5);
      }
    } else {
      p1.sprintStamina = Math.min(100, p1.sprintStamina + 0.35);
    }

    // 2. PLAYER 2 (Pro AI) BEHAVIOR TREE - Balanced tuning
    const aiSpeedMult = s.difficulty === "normal" ? 0.76 : s.difficulty === "pro" ? 0.88 : 0.98;
    const goalP1Y = FIELD_HEIGHT / 2;
    const targetY = ball.y;

    let targetX = ball.x;
    if (p2.hasBall) {
      // AI holds the ball and advances toward Player 1 goal to shoot
      targetX = PITCH_LEFT + 90;
    } else if (p1.hasBall) {
      // Close in to tackle Player 1!
      targetX = p1.x + 15;
      // AI enters defending stance when close to tackle
      const distToP1 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      p2.isDefending = distToP1 < 85;
    } else if (ball.x > FIELD_WIDTH * 0.45) {
      // Free ball press
      targetX = ball.x + 18;
      p2.isDefending = false;
    } else {
      // Guard the backline
      targetX = Math.max(PITCH_RIGHT - 160, ball.x + 140);
      p2.isDefending = false;
    }

    const aiDx = targetX - p2.x;
    const aiDy = targetY - p2.y;
    const aiDist = Math.hypot(aiDx, aiDy);

    if (aiDist > 5) {
      const aiDribbleSlow = p2.hasBall ? 0.80 : 1.0;
      const aiSpeed = BASE_PLAYER_SPEED * aiSpeedMult * (p2.isDefending ? 0.55 : 1.0) * aiDribbleSlow;
      p2.vx += (aiDx / aiDist) * aiSpeed * 0.20;
      p2.vy += (aiDy / aiDist) * aiSpeed * 0.20;
      p2.facingAngle = Math.atan2(aiDy, aiDx);
    }

    // AI dynamic shooting when in possession or close to ball
    if (p2.hasBall) {
      // AI shoots when lined up within shooting range of goal
      if (p2.x <= PITCH_LEFT + 340 && p2.kickCooldown <= 0) {
        const shootAngle = Math.atan2(goalP1Y - p2.y + (Math.random() - 0.5) * 70, PITCH_LEFT - p2.x);
        const kickSpeed = 15 + Math.random() * 4;
        ball.vx = Math.cos(shootAngle) * kickSpeed;
        ball.vy = Math.sin(shootAngle) * kickSpeed;
        ball.x = p2.x + Math.cos(shootAngle) * (p2.radius + ball.radius + 6);
        ball.y = p2.y + Math.sin(shootAngle) * (p2.radius + ball.radius + 6);
        p2.hasBall = false;
        p2.kickCooldown = 32;
        playSound("kick");
      }
    } else {
      const aiBallDist = Math.hypot(ball.x - p2.x, ball.y - p2.y);
      if (aiBallDist <= p2.radius + ball.radius + 14 && p2.kickCooldown <= 0 && !p1.hasBall) {
        // Shoot toward Player 1's goal
        const shootAngle = Math.atan2(goalP1Y - ball.y + (Math.random() - 0.5) * 70, PITCH_LEFT - ball.x);
        const kickSpeed = 14 + Math.random() * 5;
        ball.vx = Math.cos(shootAngle) * kickSpeed;
        ball.vy = Math.sin(shootAngle) * kickSpeed;
        p2.kickCooldown = 30;
        playSound("kick");
      }
    }

    // Apply friction to players
    p1.vx *= PLAYER_FRICTION;
    p1.vy *= PLAYER_FRICTION;
    p2.vx *= PLAYER_FRICTION;
    p2.vy *= PLAYER_FRICTION;

    p1.x += p1.vx;
    p1.y += p1.vy;
    p2.x += p2.vx;
    p2.y += p2.vy;

    // Pitch boundaries & walls for players
    p1.x = Math.max(PITCH_LEFT + p1.radius, Math.min(PITCH_RIGHT - p1.radius, p1.x));
    p1.y = Math.max(PITCH_TOP + p1.radius, Math.min(PITCH_BOTTOM - p1.radius, p1.y));
    p2.x = Math.max(PITCH_LEFT + p2.radius, Math.min(PITCH_RIGHT - p2.radius, p2.x));
    p2.y = Math.max(PITCH_TOP + p2.radius, Math.min(PITCH_BOTTOM - p2.radius, p2.y));

    // Handle Ball Possession Carrier Position or Free Physics
    if (p1.hasBall) {
      // Ball is held directly in front of Player 1
      const holdDist = p1.radius + ball.radius - 2;
      ball.x = p1.x + Math.cos(p1.facingAngle) * holdDist;
      ball.y = p1.y + Math.sin(p1.facingAngle) * holdDist;
      ball.vx = p1.vx;
      ball.vy = p1.vy;
    } else if (p2.hasBall) {
      // Ball is held directly in front of Player 2
      const holdDist = p2.radius + ball.radius - 2;
      ball.x = p2.x + Math.cos(p2.facingAngle) * holdDist;
      ball.y = p2.y + Math.sin(p2.facingAngle) * holdDist;
      ball.vx = p2.vx;
      ball.vy = p2.vy;
    } else {
      // Free Ball: Apply friction & free movement
      ball.vx *= BALL_FRICTION;
      ball.vy *= BALL_FRICTION;
      ball.x += ball.vx;
      ball.y += ball.vy;
    }

    // Ball trail
    if (Math.hypot(ball.vx, ball.vy) > 3) {
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.6 });
      if (ball.trail.length > 8) ball.trail.shift();
    } else if (ball.trail.length > 0) {
      ball.trail.shift();
    }
    ball.trail.forEach((t) => (t.alpha *= 0.85));

    // Player vs Player collision & TACKLE MECHANIC
    const pDx = p2.x - p1.x;
    const pDy = p2.y - p1.y;
    const pDist = Math.hypot(pDx, pDy);
    const pMinDist = p1.radius + p2.radius;

    // Defending tackle zone is slightly extended so a defender can actively strip the ball
    const tackleRange = pMinDist + 18;

    // 1) Human Player 1 tackles ball away from Player 2
    if (p1.isDefending && p2.hasBall && pDist <= tackleRange && p1.tackleCooldown <= 0) {
      p2.hasBall = false;
      p1.hasBall = true;
      p1.tackleCooldown = 35;
      p2.kickCooldown = 25;
      // Stun/knock back P2 slightly
      p2.vx += Math.cos(p1.facingAngle) * 7;
      p2.vy += Math.sin(p1.facingAngle) * 7;
      playSound("tackle");
      // Tackling spark particles
      for (let i = 0; i < 15; i++) {
        const ang = Math.random() * Math.PI * 2;
        s.particles.push({
          x: ball.x,
          y: ball.y,
          vx: Math.cos(ang) * (3 + Math.random() * 4),
          vy: Math.sin(ang) * (3 + Math.random() * 4),
          color: "#38bdf8",
          size: 3 + Math.random() * 3,
          alpha: 1.0,
          life: 0.8,
        });
      }
    }
    // 2) AI Player 2 tackles ball away from Player 1
    else if (p2.isDefending && p1.hasBall && pDist <= tackleRange && p2.tackleCooldown <= 0) {
      p1.hasBall = false;
      p2.hasBall = true;
      p2.tackleCooldown = 35;
      p1.kickCooldown = 25;
      s.shootCharging = false;
      s.shootPower = 0;
      // Knock back P1 slightly
      p1.vx += Math.cos(p2.facingAngle) * 7;
      p1.vy += Math.sin(p2.facingAngle) * 7;
      playSound("tackle");
      for (let i = 0; i < 15; i++) {
        const ang = Math.random() * Math.PI * 2;
        s.particles.push({
          x: ball.x,
          y: ball.y,
          vx: Math.cos(ang) * (3 + Math.random() * 4),
          vy: Math.sin(ang) * (3 + Math.random() * 4),
          color: "#a855f7",
          size: 3 + Math.random() * 3,
          alpha: 1.0,
          life: 0.8,
        });
      }
    }

    // Physical body elastic collision between players
    if (pDist < pMinDist) {
      const overlap = pMinDist - pDist;
      const nx = pDx / (pDist || 1);
      const ny = pDy / (pDist || 1);
      p1.x -= nx * overlap * 0.5;
      p1.y -= ny * overlap * 0.5;
      p2.x += nx * overlap * 0.5;
      p2.y += ny * overlap * 0.5;

      const kx = p1.vx - p2.vx;
      const ky = p1.vy - p2.vy;
      const p = 2 * (nx * kx + ny * ky) / 2;
      p1.vx -= p * nx * 0.7;
      p1.vy -= p * ny * 0.7;
      p2.vx += p * nx * 0.7;
      p2.vy += p * ny * 0.7;
      playSound("tackle");
    }

    // Player vs Free Ball: Defending Block/Deflection OR Normal Possession Pickup
    if (!p1.hasBall && !p2.hasBall) {
      [p1, p2].forEach((player) => {
        const bDx = ball.x - player.x;
        const bDy = ball.y - player.y;
        const bDist = Math.hypot(bDx, bDy);
        const bMinDist = player.radius + ball.radius;

        // DEFENDING STATE BLOCK / DEFLECTION MECHANIC:
        // If player is in defending state, instead of grabbing possession of the incoming ball,
        // the ball is powerfully pushed/deflected away from the defending player!
        if (player.isDefending && bDist < bMinDist + 16) {
          const nx = bDx / (bDist || 1);
          const ny = bDy / (bDist || 1);
          const incomingSpeed = Math.hypot(ball.vx, ball.vy);
          // Push away speed: maintains incoming kinetic energy + defensive clearance impulse
          const repelSpeed = Math.max(12, incomingSpeed * 1.15);

          ball.x = player.x + nx * (bMinDist + 8);
          ball.y = player.y + ny * (bMinDist + 8);
          ball.vx = nx * repelSpeed;
          ball.vy = ny * repelSpeed;
          player.kickCooldown = 15;
          playSound("bounce");

          // Deflection shield spark effects
          for (let i = 0; i < 8; i++) {
            const ang = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.2;
            s.particles.push({
              x: ball.x,
              y: ball.y,
              vx: Math.cos(ang) * (4 + Math.random() * 4),
              vy: Math.sin(ang) * (4 + Math.random() * 4),
              color: player.isPlayer1 ? "#38bdf8" : "#c084fc",
              size: 2.5 + Math.random() * 3,
              alpha: 1.0,
              life: 0.6,
            });
          }
          return;
        }

        // Standard possession acquisition when NOT defending
        if (bDist < bMinDist + 6 && player.kickCooldown <= 0) {
          // Player moves toward ball or contacts ball, take possession
          player.hasBall = true;
          const holdDist = player.radius + ball.radius - 2;
          ball.x = player.x + Math.cos(player.facingAngle) * holdDist;
          ball.y = player.y + Math.sin(player.facingAngle) * holdDist;
          ball.vx = player.vx;
          ball.vy = player.vy;
          playSound("bounce");
        } else if (bDist < bMinDist) {
          // Normal bounce if still cooling down from kick/deflect
          const nx = bDx / (bDist || 1);
          const ny = bDy / (bDist || 1);
          ball.x = player.x + nx * bMinDist;
          ball.y = player.y + ny * bMinDist;
          const dot = (ball.vx - player.vx) * nx + (ball.vy - player.vy) * ny;
          if (dot < 0) {
            ball.vx -= (1 + 0.6) * dot * nx;
            ball.vy -= (1 + 0.6) * dot * ny;
          }
          ball.vx += player.vx * 0.8;
          ball.vy += player.vy * 0.8;
          playSound("bounce");
        }
      });
    }

    // GOAL POST DETECTION (Left goal: PITCH_LEFT, Right goal: PITCH_RIGHT)
    const goalTop = FIELD_HEIGHT / 2 - GOAL_HEIGHT / 2;
    const goalBottom = FIELD_HEIGHT / 2 + GOAL_HEIGHT / 2;

    // LEFT GOAL DETECTION (Player 2 Scores)
    if (ball.x - ball.radius <= PITCH_LEFT) {
      if (ball.y >= goalTop && ball.y <= goalBottom) {
        // Goal inside net!
        if (ball.x <= PITCH_LEFT - GOAL_DEPTH + ball.radius) {
          ball.vx = Math.abs(ball.vx) * 0.5;
        }
        if (s.goalCooldown <= 0) {
          s.goalCooldown = 2.4;
          s.goalScoredSide = "p2";
          s.goalFlash = 1.0;
          p1.hasBall = false;
          p2.hasBall = false;
          playSound("goal");
          spawnGoalParticles(PITCH_LEFT, ball.y, "#9d7fff");
          setScore((prev) => [prev[0], prev[1] + 1]);
        }
      } else {
        // Bounce off left goal line / wall
        ball.vx = Math.abs(ball.vx) * 0.75;
        ball.x = PITCH_LEFT + ball.radius;
        playSound("bounce");
      }
    }

    // RIGHT GOAL DETECTION (Player 1 Scores)
    if (ball.x + ball.radius >= PITCH_RIGHT) {
      if (ball.y >= goalTop && ball.y <= goalBottom) {
        // Goal inside net!
        if (ball.x >= PITCH_RIGHT + GOAL_DEPTH - ball.radius) {
          ball.vx = -Math.abs(ball.vx) * 0.5;
        }
        if (s.goalCooldown <= 0) {
          s.goalCooldown = 2.4;
          s.goalScoredSide = "p1";
          s.goalFlash = 1.0;
          p1.hasBall = false;
          p2.hasBall = false;
          playSound("goal");
          spawnGoalParticles(PITCH_RIGHT, ball.y, "#e31c3d");
          setScore((prev) => [prev[0] + 1, prev[1]]);
        }
      } else {
        // Bounce off right goal line / wall
        ball.vx = -Math.abs(ball.vx) * 0.75;
        ball.x = PITCH_RIGHT - ball.radius;
        playSound("bounce");
      }
    }

    // Top / Bottom pitch walls bounce
    if (ball.y - ball.radius <= PITCH_TOP) {
      ball.vy = Math.abs(ball.vy) * 0.8;
      ball.y = PITCH_TOP + ball.radius;
      playSound("bounce");
    }
    if (ball.y + ball.radius >= PITCH_BOTTOM) {
      ball.vy = -Math.abs(ball.vy) * 0.8;
      ball.y = PITCH_BOTTOM - ball.radius;
      playSound("bounce");
    }

    // Update particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      if (!p) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= 0.025;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        s.particles.splice(i, 1);
      }
    }
  }, [gameStarted, matchOver, playSound, resetPositions]);

  // Canvas render pipeline
  const drawPitch = (ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;

    // 1. Stadium border apron & background
    ctx.fillStyle = "#070b10";
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 2. Football Pitch Turf with alternating grass bands
    const numBands = 10;
    const bandWidth = (PITCH_RIGHT - PITCH_LEFT) / numBands;
    for (let i = 0; i < numBands; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#154726" : "#1a532d";
      ctx.fillRect(PITCH_LEFT + i * bandWidth, PITCH_TOP, bandWidth, PITCH_BOTTOM - PITCH_TOP);
    }

    // 3. Pitch lines & markings
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 3;

    // Outer touchlines
    ctx.strokeRect(PITCH_LEFT, PITCH_TOP, PITCH_RIGHT - PITCH_LEFT, PITCH_BOTTOM - PITCH_TOP);

    // Halfway line
    const midX = FIELD_WIDTH / 2;
    const midY = FIELD_HEIGHT / 2;
    ctx.beginPath();
    ctx.moveTo(midX, PITCH_TOP);
    ctx.lineTo(midX, PITCH_BOTTOM);
    ctx.stroke();

    // Center circle & spot
    ctx.beginPath();
    ctx.arc(midX, midY, 80, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(midX, midY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Penalty Areas (18-yard boxes)
    const penaltyHeight = 300;
    const penaltyWidth = 140;
    const pBoxTop = midY - penaltyHeight / 2;

    // Left penalty box
    ctx.strokeRect(PITCH_LEFT, pBoxTop, penaltyWidth, penaltyHeight);
    // Left penalty spot
    ctx.beginPath();
    ctx.arc(PITCH_LEFT + 100, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Right penalty box
    ctx.strokeRect(PITCH_RIGHT - penaltyWidth, pBoxTop, penaltyWidth, penaltyHeight);
    // Right penalty spot
    ctx.beginPath();
    ctx.arc(PITCH_RIGHT - 100, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Goals (Left & Right Nets)
    const goalTop = midY - GOAL_HEIGHT / 2;

    // Left Goal Net (RIFT Red Goal)
    ctx.fillStyle = "rgba(227, 28, 61, 0.15)";
    ctx.fillRect(PITCH_LEFT - GOAL_DEPTH, goalTop, GOAL_DEPTH, GOAL_HEIGHT);
    ctx.strokeStyle = "#e31c3d";
    ctx.lineWidth = 4;
    ctx.strokeRect(PITCH_LEFT - GOAL_DEPTH, goalTop, GOAL_DEPTH, GOAL_HEIGHT);

    // Net mesh lines for left goal
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    for (let gy = goalTop + 15; gy < goalTop + GOAL_HEIGHT; gy += 15) {
      ctx.beginPath();
      ctx.moveTo(PITCH_LEFT - GOAL_DEPTH, gy);
      ctx.lineTo(PITCH_LEFT, gy);
      ctx.stroke();
    }
    for (let gx = PITCH_LEFT - GOAL_DEPTH + 15; gx < PITCH_LEFT; gx += 15) {
      ctx.beginPath();
      ctx.moveTo(gx, goalTop);
      ctx.lineTo(gx, goalTop + GOAL_HEIGHT);
      ctx.stroke();
    }

    // Right Goal Net (Opponent Purple Goal)
    ctx.fillStyle = "rgba(108, 92, 231, 0.15)";
    ctx.fillRect(PITCH_RIGHT, goalTop, GOAL_DEPTH, GOAL_HEIGHT);
    ctx.strokeStyle = "#6c5ce7";
    ctx.lineWidth = 4;
    ctx.strokeRect(PITCH_RIGHT, goalTop, GOAL_DEPTH, GOAL_HEIGHT);

    // Net mesh lines for right goal
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    for (let gy = goalTop + 15; gy < goalTop + GOAL_HEIGHT; gy += 15) {
      ctx.beginPath();
      ctx.moveTo(PITCH_RIGHT, gy);
      ctx.lineTo(PITCH_RIGHT + GOAL_DEPTH, gy);
      ctx.stroke();
    }
    for (let gx = PITCH_RIGHT + 15; gx < PITCH_RIGHT + GOAL_DEPTH; gx += 15) {
      ctx.beginPath();
      ctx.moveTo(gx, goalTop);
      ctx.lineTo(gx, goalTop + GOAL_HEIGHT);
      ctx.stroke();
    }

    // 5. Ball trail
    s.ball.trail.forEach((t) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_RADIUS * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Ball (Football pattern with hexagons)
    ctx.save();
    ctx.translate(s.ball.x, s.ball.y);
    // Ball Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(3, 4, BALL_RADIUS, BALL_RADIUS * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball Base
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Ball black spots
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.4, 0, Math.PI * 2);
    ctx.fill();
    for (let a = 0; a < 5; a++) {
      const angle = (a * Math.PI * 2) / 5;
      const bx = Math.cos(angle) * (BALL_RADIUS * 0.7);
      const by = Math.sin(angle) * (BALL_RADIUS * 0.7);
      ctx.beginPath();
      ctx.arc(bx, by, BALL_RADIUS * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 7. Draw Players
    const drawPlayer = (p: Player, color: string, border: string, img?: HTMLImageElement) => {
      // Player Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(p.x + 3, p.y + 5, p.radius, p.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Defending Stance Shield Aura
      if (p.isDefending) {
        ctx.strokeStyle = p.isPlayer1 ? "rgba(56, 189, 248, 0.7)" : "rgba(168, 85, 247, 0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Defense badge text above player
        ctx.fillStyle = p.isPlayer1 ? "#38bdf8" : "#c084fc";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("🛡️ DEFENDING", p.x, p.y - p.radius - 18);
      }

      // Ball Possession ring indicator
      if (p.hasBall) {
        ctx.strokeStyle = "#facc15"; // gold outline
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Possession badge
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚽ DRIBBLE", p.x, p.y - p.radius - (p.isDefending ? 28 : 18));
      }

      // Power shot charging glow & dynamic arc
      if (p.isPlayer1 && s.shootCharging && p.hasBall) {
        const ringGlow = (s.shootPower / 100) * 16;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + (s.shootPower / 100) * 0.5})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 6 + ringGlow, 0, Math.PI * 2);
        ctx.stroke();

        // Shot Power Charge Meter Bar
        const barW = 44;
        const barH = 6;
        const barX = p.x - barW / 2;
        const barY = p.y + p.radius + 10;
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = s.shootPower > 70 ? "#ef4444" : s.shootPower > 35 ? "#f59e0b" : "#eab308";
        ctx.fillRect(barX, barY, (s.shootPower / 100) * barW, barH);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`POWER ${Math.round(s.shootPower)}%`, p.x, barY + 15);
      }

      // Player circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Avatar
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, p.x - p.radius + 2, p.y - p.radius + 2, (p.radius - 2) * 2, (p.radius - 2) * 2);
        ctx.restore();
      }

      // Border ring
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Player direction pointer
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.facingAngle) * (p.radius + 7), p.y + Math.sin(p.facingAngle) * (p.radius + 7));
      ctx.stroke();

      // Stamina Bar for Player 1
      if (p.isPlayer1) {
        const barW = 38;
        const barH = 5;
        const barX = p.x - barW / 2;
        const barY = p.y - p.radius - 8;

        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = p.sprintStamina > 30 ? "#38bdf8" : "#f43f5e";
        ctx.fillRect(barX, barY, (p.sprintStamina / 100) * barW, barH);
      }
    };

    drawPlayer(s.p1, "#e31c3d", "#ff5975", avatarImgsRef.current.p1);
    drawPlayer(s.p2, "#6c5ce7", "#a29bfe", avatarImgsRef.current.p2);

    // 8. Goal Explosion Particles
    s.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 9. Goal Celebration Banner Overlay
    if (s.goalCooldown > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * s.goalFlash})`;
      ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

      ctx.fillStyle = s.goalScoredSide === "p1" ? "#e31c3d" : "#6c5ce7";
      ctx.font = "900 68px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = s.goalScoredSide === "p1" ? "rgba(227, 28, 61, 0.8)" : "rgba(108, 92, 231, 0.8)";
      ctx.shadowBlur = 25;
      ctx.fillText("GOOOAL!!!", midX, midY - 10);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Arial, sans-serif";
      ctx.fillText(
        s.goalScoredSide === "p1" ? "RIFT Player Scored!" : "Opponent Scored!",
        midX,
        midY + 36
      );
    }

    // 10. Pause Overlay
    if (pauseRef.current) {
      ctx.fillStyle = "rgba(10, 10, 11, 0.75)";
      ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 52px Arial";
      ctx.fillText("MATCH PAUSED", midX, midY - 10);
      ctx.font = "18px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText("Press P or Esc to resume match", midX, midY + 30);
    }
  };

  // Main animation frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const loop = () => {
      updateGamePhysics();
      drawPitch(ctx);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [updateGamePhysics]);

  const startMatch = () => {
    matchEndedRef.current = false;
    setScore([0, 0]);
    scoreRef.current = [0, 0];
    setMatchTime(MATCH_DURATION_SECONDS);
    setMatchOver(false);
    setIsNewBest(false);
    pauseRef.current = false;
    setIsPaused(false);
    resetPositions();
    setGameStarted(true);
    playSound("whistle");
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Header & Controls bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rift-red animate-pulse" />
            <p className="rift-eyebrow text-rift-red">Official Stadium Match</p>
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-black uppercase tracking-wider text-foreground">
            RIFTBALL PRO ARENA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full 2D esports football physics. Pass, sprint, tackle, and charge up power shots to score.
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-lg border border-border bg-secondary/40 p-1">
            {(["normal", "pro", "champion"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficulty(lvl)}
                className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all ${
                  difficulty === lvl
                    ? "bg-rift-red text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground transition-colors hover:bg-secondary"
            title={soundEnabled ? "Mute sound" : "Unmute sound"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </button>

          <button
            type="button"
            onClick={startMatch}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(227,28,61,0.4)]"
          >
            {gameStarted && !matchOver ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {gameStarted && !matchOver ? "Restart" : "Kick Off"}
          </button>
        </div>
      </div>

      {/* Player Best Record Banner */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-3 text-center">
          <p className="font-mono text-[10px] uppercase font-bold text-amber-400">Best Match Goals</p>
          <p className="font-display text-2xl font-black text-amber-300">{record.highestScoreInMatch} Goals</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
          <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">Match Record</p>
          <p className="font-display text-xl font-bold text-foreground">
            {record.wins}W - {record.losses}L
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
          <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">Best Goal Diff</p>
          <p className="font-display text-xl font-bold text-emerald-400">+{record.bestGoalDiff}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-center">
          <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground">Total Goals</p>
          <p className="font-display text-xl font-bold text-foreground">{record.totalGoalsScored}</p>
        </div>
      </div>

      {/* Main Stadium Scoreboard & Match Time Bar */}
      <div className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-secondary/40 px-6 py-3 shadow-lg">
        {/* Home Player (Red) */}
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-rift-red shadow-[0_0_8px_#e31c3d]" />
          <div>
            <span className="block font-display text-sm font-bold uppercase tracking-wider text-foreground">
              {session?.user?.name ?? "You (Red)"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase">Home Team</span>
          </div>
          <span className="ml-2 font-display text-3xl font-black text-rift-red">{score[0]}</span>
        </div>

        {/* Center Clock */}
        <div className="flex flex-col items-center">
          <span className="font-mono text-xl font-black text-foreground">
            {Math.floor(matchTime / 60)}:{(matchTime % 60).toString().padStart(2, "0")}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {matchOver ? "FULL TIME" : isPaused ? "PAUSED" : "MATCH CLOCK"}
          </span>
        </div>

        {/* Away Player (Purple) */}
        <div className="flex items-center gap-3">
          <span className="mr-2 font-display text-3xl font-black text-violet-400">{score[1]}</span>
          <div className="text-right">
            <span className="block font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Rift Keeper ({difficulty})
            </span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase">Away Team</span>
          </div>
          <div className="h-3 w-3 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6]" />
        </div>
      </div>

      {/* Pitch Canvas Container */}
      <div className="glass-panel relative overflow-hidden rounded-2xl border-2 border-rift-red/40 p-2 shadow-[0_0_50px_rgba(227,28,61,0.25)]">
        <canvas
          ref={canvasRef}
          width={FIELD_WIDTH}
          height={FIELD_HEIGHT}
          className="block w-full h-auto max-w-[1200px] rounded-xl cursor-crosshair"
        />

        {/* Start Game Overlay */}
        {!gameStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rift-red/40 bg-rift-red/20 text-rift-red shadow-[0_0_30px_rgba(227,28,61,0.4)]">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold uppercase tracking-wide text-foreground">
              Ready For Kick Off?
            </h2>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground">
              Dribble past defenders, time your tackles, and hold <kbd className="rounded bg-secondary px-1.5 py-0.5 text-foreground font-mono">SPACE</kbd> to charge up unstoppable power shots.
            </p>
            <button
              type="button"
              onClick={startMatch}
              className="mt-6 btn-primary flex items-center gap-2 px-8 py-3.5 text-sm uppercase tracking-wider font-bold shadow-xl shadow-rift-red/40"
            >
              <Play className="h-4 w-4" />
              Start Match
            </button>
          </div>
        )}

        {/* Match Over Modal */}
        {matchOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center">
            <div className="rounded-2xl border border-white/10 bg-secondary/80 p-8 max-w-md w-full shadow-2xl">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Full Time Whistle</span>
              <h2 className="mt-2 font-display text-4xl font-black uppercase text-foreground">
                {score[0] > score[1] ? "VICTORY!" : score[0] < score[1] ? "DEFEAT" : "DRAW"}
              </h2>

              <div className="my-6 flex items-center justify-center gap-6 font-display text-5xl font-black">
                <span className="text-rift-red">{score[0]}</span>
                <span className="text-muted-foreground text-3xl">-</span>
                <span className="text-violet-400">{score[1]}</span>
              </div>

              {isNewBest && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-mono text-xs font-bold text-amber-300 animate-pulse">
                  <Sparkles className="h-4 w-4" />
                  NEW PERSONAL RECORD SET!
                </div>
              )}

              <button
                type="button"
                onClick={startMatch}
                className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Tactics Guide */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-border/60">
          <span className="font-mono text-[10px] uppercase font-bold text-rift-red">Dribble & Move</span>
          <p className="mt-1 text-sm text-foreground font-semibold">WASD / Arrow Keys</p>
          <p className="mt-1 text-xs text-muted-foreground">Touch the ball to gain possession and dribble with directional momentum.</p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-border/60">
          <span className="font-mono text-[10px] uppercase font-bold text-cyan-400">Sprint Turbo</span>
          <p className="mt-1 text-sm text-foreground font-semibold">HOLD SHIFT</p>
          <p className="mt-1 text-xs text-muted-foreground">Boost speed by +45% with stamina recharge meter.</p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-border/60">
          <span className="font-mono text-[10px] uppercase font-bold text-amber-400">Hold Ball & Shoot</span>
          <p className="mt-1 text-sm text-foreground font-semibold">HOLD & RELEASE SPACE</p>
          <p className="mt-1 text-xs text-muted-foreground">When holding the ball, hold SPACE to charge power up to 100% and release to blast a shot!</p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-border/60">
          <span className="font-mono text-[10px] uppercase font-bold text-emerald-400">Defend, Tackle & Deflect</span>
          <p className="mt-1 text-sm text-foreground font-semibold">HOLD SPACE WITHOUT BALL</p>
          <p className="mt-1 text-xs text-muted-foreground">Defensive stance slows movement. Tackle carriers to steal the ball, or deflect incoming shots cleanly away!</p>
        </div>
      </div>
    </div>
  );
}

