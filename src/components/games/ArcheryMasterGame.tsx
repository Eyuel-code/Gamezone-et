import { useState, useEffect, useRef } from 'react';
import { Target, Wind, Award, Zap, Sparkles, Volume2, VolumeX, RotateCcw, ChevronRight, ShieldCheck, Flame } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface ArcheryMasterGameProps {
  onGameOver: (score: number, stats: any) => void;
  onExit?: () => void;
}

interface LevelConfig {
  level: number;
  name: string;
  distance: string;
  targetSpeed: number;
  windMax: number;
  scoreGoal: number;
  multiplier: number;
  hasBalloons: boolean;
  hasPendulum: boolean;
  arrows: number;
}

const LEVELS: LevelConfig[] = [
  { level: 1, name: 'Novice Practice Range', distance: '20m', targetSpeed: 0, windMax: 2, scoreGoal: 40, multiplier: 1.0, hasBalloons: false, hasPendulum: false, arrows: 6 },
  { level: 2, name: 'Breezy Marksman', distance: '35m', targetSpeed: 1.8, windMax: 8, scoreGoal: 90, multiplier: 1.5, hasBalloons: true, hasPendulum: false, arrows: 7 },
  { level: 3, name: 'Gale Valley Challenge', distance: '50m', targetSpeed: 2.8, windMax: 16, scoreGoal: 160, multiplier: 2.2, hasBalloons: true, hasPendulum: false, arrows: 8 },
  { level: 4, name: 'Elite Sniper Gorge', distance: '70m', targetSpeed: 3.8, windMax: 24, scoreGoal: 250, multiplier: 3.2, hasBalloons: true, hasPendulum: true, arrows: 8 },
  { level: 5, name: 'Grandmaster Apex Test', distance: '90m', targetSpeed: 5.0, windMax: 32, scoreGoal: 400, multiplier: 5.0, hasBalloons: true, hasPendulum: true, arrows: 9 },
];

export default function ArcheryMasterGame({ onGameOver, onExit }: ArcheryMasterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [arrowsRemaining, setArrowsRemaining] = useState<number>(6);
  const [bullseyesCount, setBullseyesCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [wind, setWind] = useState<{ speed: number; direction: number }>({ speed: 0, direction: 1 }); // 1 = right, -1 = left
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [tension, setTension] = useState<number>(0);
  const [gameEnded, setGameEnded] = useState<boolean>(false);

  // Mutable game state
  const stateRef = useRef({
    score: 0,
    arrowsRemaining: 6,
    bullseyes: 0,
    currentLevel: 1,
    arrows: [] as {
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      stuck: boolean;
      scoreGiven: boolean;
    }[],
    target: {
      x: 700,
      y: 280,
      radius: 65,
      vy: 1.5,
      direction: 1,
      pendulumAngle: 0,
    },
    balloons: [] as { x: number; y: number; vy: number; radius: number; popped: boolean }[],
    wind: { speed: 0, direction: 1 },
    bow: {
      x: 100,
      y: 280,
      aimX: 400,
      aimY: 280,
      drawing: false,
      pullStrength: 0,
    },
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    floatingTexts: [] as { x: number; y: number; text: string; color: string; life: number }[],
    totalShots: 0,
    hits: 0,
  });

  const levelCfg = LEVELS[currentLevel - 1] || LEVELS[0];

  // Initialize Level
  const initLevel = (lvlIndex: number) => {
    const cfg = LEVELS[lvlIndex - 1] || LEVELS[0];
    setCurrentLevel(cfg.level);
    setArrowsRemaining(cfg.arrows);

    const s = stateRef.current;
    s.currentLevel = cfg.level;
    s.arrowsRemaining = cfg.arrows;
    s.arrows = [];

    // Setup Wind
    const wSpeed = Math.round((Math.random() * cfg.windMax) * 10) / 10;
    const wDir = Math.random() > 0.5 ? 1 : -1;
    s.wind = { speed: wSpeed, direction: wDir };
    setWind({ speed: wSpeed, direction: wDir });

    // Setup Target
    s.target = {
      x: 680,
      y: 260,
      radius: Math.max(45, 70 - cfg.level * 4),
      vy: cfg.targetSpeed,
      direction: 1,
      pendulumAngle: 0,
    };

    // Setup Bonus Balloons
    s.balloons = [];
    if (cfg.hasBalloons) {
      for (let i = 0; i < 3; i++) {
        s.balloons.push({
          x: 520 + i * 50,
          y: 350 + i * 60,
          vy: 1.2 + Math.random() * 0.8,
          radius: 18,
          popped: false,
        });
      }
    }

    setLevelUpMessage(`LEVEL ${cfg.level}: ${cfg.name.toUpperCase()}`);
    gameAudio.playLevelUp();
    setTimeout(() => setLevelUpMessage(null), 2000);
  };

  useEffect(() => {
    initLevel(1);
  }, []);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      const s = stateRef.current;
      const cfg = LEVELS[s.currentLevel - 1] || LEVELS[0];

      // Clear & Background Sky Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#040714');
      grad.addColorStop(0.5, '#0a122c');
      grad.addColorStop(1, '#081735');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Mountains & Shooting Range Atmosphere
      ctx.fillStyle = '#061026';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 80);
      ctx.lineTo(200, 260);
      ctx.lineTo(450, canvas.height - 80);
      ctx.lineTo(650, 240);
      ctx.lineTo(canvas.width, canvas.height - 60);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // Range Floor / Grass with Cyber Marksman Grid
      const floorGrad = ctx.createLinearGradient(0, canvas.height - 90, 0, canvas.height);
      floorGrad.addColorStop(0, '#09211c');
      floorGrad.addColorStop(1, '#030d0a');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, canvas.height - 90, canvas.width, 90);

      // Distance Markers
      ctx.fillStyle = 'rgba(17, 189, 247, 0.4)';
      ctx.font = '10px "JetBrains Mono", monospace';
      for (let d = 150; d < canvas.width; d += 120) {
        ctx.fillRect(d, canvas.height - 90, 1, 25);
        ctx.fillText(`${Math.round((d / canvas.width) * 100)}m`, d + 4, canvas.height - 72);
      }

      // Update & Render Target
      if (cfg.hasPendulum) {
        s.target.pendulumAngle += 0.03 * s.target.vy;
        s.target.y = 260 + Math.sin(s.target.pendulumAngle) * 90;
      } else if (cfg.targetSpeed > 0) {
        s.target.y += s.target.vy * s.target.direction;
        if (s.target.y < 120) s.target.direction = 1;
        if (s.target.y > canvas.height - 150) s.target.direction = -1;
      }

      // Target Stand & Rope
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.target.x, 0);
      ctx.lineTo(s.target.x, s.target.y);
      ctx.stroke();

      // Draw Archery Target Rings (Yellow Bullseye 10, Red 8, Blue 6, Black 4, White 2)
      const trg = s.target;
      const rings = [
        { r: trg.radius, color: '#f8fafc', pts: 2 }, // White
        { r: trg.radius * 0.8, color: '#1e293b', pts: 4 }, // Black
        { r: trg.radius * 0.6, color: '#0284c7', pts: 6 }, // Blue
        { r: trg.radius * 0.4, color: '#dc2626', pts: 8 }, // Red
        { r: trg.radius * 0.2, color: '#facc15', pts: 10 }, // Yellow Bullseye
      ];

      rings.forEach((ring) => {
        ctx.fillStyle = ring.color;
        ctx.beginPath();
        ctx.arc(trg.x, trg.y, ring.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Target Center Crosshair
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(trg.x - 6, trg.y);
      ctx.lineTo(trg.x + 6, trg.y);
      ctx.moveTo(trg.x, trg.y - 6);
      ctx.lineTo(trg.x, trg.y + 6);
      ctx.stroke();

      // Update & Render Bonus Balloons
      s.balloons.forEach((b) => {
        if (b.popped) return;
        b.y -= b.vy;
        if (b.y < -30) b.y = canvas.height - 80;

        // Balloon body
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.radius, b.radius * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // String
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.radius * 1.25);
        ctx.lineTo(b.x, b.y + b.radius * 1.25 + 14);
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+50', b.x, b.y + 3);
        ctx.textAlign = 'left';
      });

      // Player Bow and Archer Platform
      const bow = s.bow;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bow.x, bow.y, 40, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();

      // Bow String
      const bowAngle = Math.atan2(bow.aimY - bow.y, bow.aimX - bow.x);
      const topTipX = bow.x + Math.cos(-Math.PI / 3) * 40;
      const topTipY = bow.y + Math.sin(-Math.PI / 3) * 40;
      const botTipX = bow.x + Math.cos(Math.PI / 3) * 40;
      const botTipY = bow.y + Math.sin(Math.PI / 3) * 40;

      const pullX = bow.drawing ? bow.x - Math.cos(bowAngle) * (bow.pullStrength * 28) : bow.x;
      const pullY = bow.drawing ? bow.y - Math.sin(bowAngle) * (bow.pullStrength * 28) : bow.y;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(topTipX, topTipY);
      ctx.lineTo(pullX, pullY);
      ctx.lineTo(botTipX, botTipY);
      ctx.stroke();

      // Aim Line (Trajectory Guide)
      if (bow.drawing) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(pullX, pullY);
        let simX = pullX;
        let simY = pullY;
        const simSpeed = 16 * bow.pullStrength;
        let simVx = Math.cos(bowAngle) * simSpeed;
        let simVy = Math.sin(bowAngle) * simSpeed;
        for (let i = 0; i < 15; i++) {
          simX += simVx;
          simY += simVy;
          simVy += 0.35; // gravity
          simVx += (s.wind.speed * s.wind.direction) * 0.04;
          ctx.lineTo(simX, simY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Arrows in Flight / Stuck in Target
      s.arrows.forEach((arr) => {
        if (!arr.stuck) {
          arr.x += arr.vx;
          arr.y += arr.vy;
          arr.vy += 0.28; // Gravity drop
          arr.vx += (s.wind.speed * s.wind.direction) * 0.035; // Wind drift!
          arr.angle = Math.atan2(arr.vy, arr.vx);

          // Check Balloon Collisions
          s.balloons.forEach((b) => {
            if (b.popped) return;
            const dist = Math.hypot(arr.x - b.x, arr.y - b.y);
            if (dist < b.radius + 10) {
              b.popped = true;
              s.score += Math.round(50 * cfg.multiplier);
              setScore(s.score);
              gameAudio.playBullseye();
              s.floatingTexts.push({ x: b.x, y: b.y, text: `+${Math.round(50 * cfg.multiplier)} BALLOON!`, color: '#fbbf24', life: 40 });
            }
          });

          // Check Target Collision
          const distToTarget = Math.hypot(arr.x - trg.x, arr.y - trg.y);
          if (distToTarget <= trg.radius) {
            arr.stuck = true;
            s.hits++;
            gameAudio.playHit();

            // Calculate Ring Score
            let pts = 2;
            if (distToTarget <= trg.radius * 0.2) {
              pts = 10; // Bullseye!
              s.bullseyes++;
              setBullseyesCount(s.bullseyes);
              gameAudio.playBullseye();
              // Award bonus arrow on bullseye
              s.arrowsRemaining += 1;
              setArrowsRemaining(s.arrowsRemaining);
              s.floatingTexts.push({ x: trg.x, y: trg.y - 30, text: '🎯 PERFECT BULLSEYE! +1 ARROW', color: '#facc15', life: 60 });
            } else if (distToTarget <= trg.radius * 0.4) {
              pts = 8;
            } else if (distToTarget <= trg.radius * 0.6) {
              pts = 6;
            } else if (distToTarget <= trg.radius * 0.8) {
              pts = 4;
            }

            const earned = Math.round(pts * cfg.multiplier);
            s.score += earned;
            setScore(s.score);
            setCombo((c) => c + 1);

            s.floatingTexts.push({ x: arr.x, y: arr.y, text: `+${earned}`, color: pts === 10 ? '#facc15' : '#38bdf8', life: 45 });

            // Particles
            for (let p = 0; p < 8; p++) {
              s.particles.push({
                x: arr.x,
                y: arr.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 25,
                color: pts === 10 ? '#facc15' : '#38bdf8',
              });
            }

            // Check Level Progression Goal
            if (s.score >= cfg.scoreGoal && s.currentLevel < LEVELS.length) {
              initLevel(s.currentLevel + 1);
            }
          }

          // Off screen / Miss
          if (arr.x > canvas.width || arr.y > canvas.height - 80) {
            arr.stuck = true;
            setCombo(0);
            s.floatingTexts.push({ x: Math.min(arr.x, canvas.width - 50), y: arr.y, text: 'MISS', color: '#ef4444', life: 30 });

            // Check Game Over when out of arrows
            if (s.arrowsRemaining <= 0 && s.arrows.filter((a) => !a.stuck).length === 0) {
              setGameEnded(true);
              onGameOver(s.score, {
                level: s.currentLevel,
                bullseyes: s.bullseyes,
                hits: s.hits,
                totalShots: s.totalShots,
                accuracy: s.totalShots > 0 ? `${Math.round((s.hits / s.totalShots) * 100)}%` : '0%',
              });
            }
          }
        }

        // Render Arrow
        ctx.save();
        ctx.translate(arr.x, arr.y);
        ctx.rotate(arr.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(6, -4);
        ctx.lineTo(6, 4);
        ctx.closePath();
        ctx.fill();

        // Fletching (Feathers)
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(-34, -4);
        ctx.lineTo(-24, 0);
        ctx.lineTo(-34, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Update Particles
      s.particles = s.particles.filter((p) => p.life > 0);
      s.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });

      // Update Floating Score Texts
      s.floatingTexts = s.floatingTexts.filter((t) => t.life > 0);
      s.floatingTexts.forEach((t) => {
        t.y -= 0.8;
        t.life--;
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      });

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Pointer Aim & Release Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (arrowsRemaining <= 0 || gameEnded) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    stateRef.current.bow.aimX = x;
    stateRef.current.bow.aimY = y;
    stateRef.current.bow.drawing = true;
    stateRef.current.bow.pullStrength = 0.5;
    setIsAiming(true);
    setTension(50);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.bow.drawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pullDist = Math.hypot(x - stateRef.current.bow.x, y - stateRef.current.bow.y);
    const strength = Math.min(1.0, Math.max(0.3, pullDist / 250));

    stateRef.current.bow.aimX = x;
    stateRef.current.bow.aimY = y;
    stateRef.current.bow.pullStrength = strength;
    setTension(Math.round(strength * 100));
  };

  const handlePointerUp = () => {
    if (!stateRef.current.bow.drawing) return;
    stateRef.current.bow.drawing = false;
    setIsAiming(false);
    setTension(0);

    const s = stateRef.current;
    if (s.arrowsRemaining <= 0) return;

    s.arrowsRemaining--;
    s.totalShots++;
    setArrowsRemaining(s.arrowsRemaining);

    // Release Arrow
    const bowAngle = Math.atan2(s.bow.aimY - s.bow.y, s.bow.aimX - s.bow.x);
    const speed = 19 * s.bow.pullStrength;
    const vx = Math.cos(bowAngle) * speed;
    const vy = Math.sin(bowAngle) * speed;

    s.arrows.push({
      x: s.bow.x,
      y: s.bow.y,
      vx,
      vy,
      angle: bowAngle,
      stuck: false,
      scoreGiven: false,
    });

    gameAudio.playArrowRelease();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-ink-950 select-none overflow-hidden rounded-2xl border border-primary-500/30 shadow-2xl">
      {/* Top HUD */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-500/20 border border-primary-400/40 text-primary-300 font-bold text-xs">
            <Target className="w-4 h-4 text-primary-400" />
            <span>LEVEL {currentLevel}: {levelCfg.name}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 font-mono">
            <span>Goal:</span> <strong className="text-white">{levelCfg.scoreGoal} pts</strong>
          </div>
        </div>

        {/* Dynamic Wind Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono">
          <Wind className={`w-4 h-4 ${wind.speed > 10 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
          <span>Wind:</span>
          <strong className="text-white">{wind.speed} km/h</strong>
          <span className="text-amber-400">{wind.direction > 0 ? '▶ East' : '◀ West'}</span>
        </div>

        {/* Score & Arrows Remaining */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Rank Score</span>
            <span className="font-display font-black text-xl text-gold-400">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <span className="text-xs text-slate-400 font-mono">Arrows:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-black text-sm border border-rose-500/30">
              {arrowsRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full flex-1 flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full max-w-[900px] max-h-[520px] object-contain rounded-xl cursor-crosshair touch-none border border-slate-800/80 shadow-2xl"
        />

        {/* Level Up Banner Overlay */}
        {levelUpMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center p-6 rounded-3xl bg-gradient-to-b from-primary-950 via-slate-900 to-ink-950 border-2 border-gold-400 shadow-glow-gold">
              <Sparkles className="w-8 h-8 text-gold-400 mx-auto animate-bounce" />
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-2">
                {levelUpMessage}
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Distance: {levelCfg.distance} • Score Multiplier: {levelCfg.multiplier}x RP
              </p>
            </div>
          </div>
        )}

        {/* Tension Meter when Aiming */}
        {isAiming && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 bg-slate-900/90 border border-slate-700 rounded-2xl p-2.5 backdrop-blur-md flex items-center gap-3 z-20">
            <span className="text-xs font-bold text-slate-300 font-mono">Bow Tension</span>
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all"
                style={{ width: `${tension}%` }}
              />
            </div>
            <span className="text-xs font-black text-amber-400 font-mono">{tension}%</span>
          </div>
        )}
      </div>

      {/* Bottom Level Switcher & Controls Guide */}
      <div className="w-full bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Level Select:</span>
          {LEVELS.map((lvl) => (
            <button
              key={lvl.level}
              onClick={() => initLevel(lvl.level)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                currentLevel === lvl.level
                  ? 'bg-primary-500 text-white shadow-glow'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Lvl {lvl.level}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
          <span>🎯 Drag mouse / finger to draw bow</span>
          <span>🌬️ Compensate for wind drift</span>
          <span className="text-gold-300">🎯 Bullseye gives +1 Arrow!</span>
        </div>
      </div>
    </div>
  );
}
