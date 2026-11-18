import { useEffect, useRef, useState } from 'react';
import { Gauge, Zap, Flame, RotateCcw, Trophy, Award, Sparkles } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface AddisDriftProps {
  onGameOver: (score: number, stats: { distance: number; topSpeed: number; nearMisses: number }) => void;
  isMuted?: boolean;
}

interface TrafficCar {
  x: number; // -1 to 1 across lanes
  y: number; // distance ahead in road depth
  speed: number;
  color: string;
  type: 'sedan' | 'truck' | 'sport';
}

interface RoadItem {
  x: number;
  y: number;
  type: 'coin' | 'nitro';
}

export default function AddisDriftGame({ onGameOver, isMuted = false }: AddisDriftProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // HUD States
  const [speed, setSpeed] = useState(120);
  const [nitroFuel, setNitroFuel] = useState(100);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [nearMisses, setNearMisses] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    gameAudio.enabled = !isMuted;
  }, [isMuted]);

  const stateRef = useRef({
    carX: 0, // -1 (left shoulder) to 1 (right shoulder)
    speed: 120,
    maxSpeed: 180,
    nitroSpeed: 265,
    nitroFuel: 100,
    isBoosting: false,
    distance: 0,
    score: 0,
    nearMisses: 0,
    topSpeed: 120,
    keys: {} as Record<string, boolean>,
    traffic: [] as TrafficCar[],
    items: [] as RoadItem[],
    roadOffset: 0,
    curve: 0,
    targetCurve: 0,
    gameOver: false,
    shake: 0,
  });

  const initGame = () => {
    const s = stateRef.current;
    s.carX = 0;
    s.speed = 120;
    s.nitroFuel = 100;
    s.isBoosting = false;
    s.distance = 0;
    s.score = 0;
    s.nearMisses = 0;
    s.topSpeed = 120;
    s.traffic = [];
    s.items = [];
    s.roadOffset = 0;
    s.curve = 0;
    s.targetCurve = 0;
    s.gameOver = false;
    s.shake = 0;

    // Seed traffic
    for (let i = 0; i < 6; i++) {
      s.traffic.push({
        x: (Math.random() - 0.5) * 1.5,
        y: 300 + i * 220,
        speed: 60 + Math.random() * 40,
        color: ['#0ea5e9', '#ec4899', '#8b5cf6', '#eab308'][Math.floor(Math.random() * 4)],
        type: Math.random() > 0.7 ? 'truck' : 'sedan',
      });
    }

    setSpeed(120);
    setNitroFuel(100);
    setDistance(0);
    setScore(0);
    setNearMisses(0);
    setIsGameOver(false);
    setIsBoosting(false);
  };

  useEffect(() => {
    initGame();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Main 60fps Loop
    const loop = () => {
      const s = stateRef.current;
      if (!s.gameOver) {
        // --- 1. CAR STEERING & ACCELERATION ---
        let steer = 0;
        if (s.keys['a'] || s.keys['arrowleft']) steer -= 1;
        if (s.keys['d'] || s.keys['arrowright']) steer += 1;

        s.carX += steer * 0.038;
        s.carX = Math.max(-0.9, Math.min(0.9, s.carX));

        // Boosting with Nitro (Spacebar / Shift)
        const wantsBoost = (s.keys[' '] || s.keys['shift']) && s.nitroFuel > 0;
        if (wantsBoost) {
          s.isBoosting = true;
          s.nitroFuel = Math.max(0, s.nitroFuel - 0.45);
          s.speed = Math.min(s.nitroSpeed, s.speed + 3);
          s.shake = 3;
          if (Math.random() > 0.85) gameAudio.playNitro();
        } else {
          s.isBoosting = false;
          if (s.keys['w'] || s.keys['arrowup']) {
            s.speed = Math.min(s.maxSpeed, s.speed + 1.2);
          } else if (s.keys['s'] || s.keys['arrowdown']) {
            s.speed = Math.max(60, s.speed - 3.5);
          } else {
            // natural cruise
            if (s.speed > s.maxSpeed) s.speed -= 1.5;
            else if (s.speed < 120) s.speed += 0.5;
          }
        }

        s.topSpeed = Math.max(s.topSpeed, Math.round(s.speed));
        setSpeed(Math.round(s.speed));
        setNitroFuel(Math.round(s.nitroFuel));
        setIsBoosting(s.isBoosting);

        // Distance & Base Score
        const frameDist = s.speed * 0.04;
        s.distance += frameDist;
        s.score += Math.round(frameDist * (s.isBoosting ? 2.5 : 1.2));
        setDistance(Math.round(s.distance));
        setScore(s.score);

        // Road curve shifting
        s.roadOffset += s.speed * 0.08;
        if (Math.random() > 0.985) {
          s.targetCurve = (Math.random() - 0.5) * 1.6;
        }
        s.curve += (s.targetCurve - s.curve) * 0.02;

        // --- 2. TRAFFIC UPDATES & COLLISIONS ---
        for (let i = 0; i < s.traffic.length; i++) {
          const t = s.traffic[i];
          // Relative approach speed
          t.y -= (s.speed - t.speed) * 0.07;

          // Check passing player
          if (t.y < 35 && t.y > -25) {
            const laneDiff = Math.abs(s.carX - t.x);
            // Collision!
            if (laneDiff < 0.22) {
              gameAudio.playCrash();
              s.gameOver = true;
              setIsGameOver(true);
              onGameOver(s.score, {
                distance: Math.round(s.distance),
                topSpeed: s.topSpeed,
                nearMisses: s.nearMisses,
              });
              break;
            } else if (laneDiff < 0.42 && t.y > 0 && t.y < 15) {
              // Near miss bonus!
              s.nearMisses++;
              s.score += 150;
              s.nitroFuel = Math.min(100, s.nitroFuel + 12);
              setNearMisses(s.nearMisses);
              setScore(s.score);
              gameAudio.playPickup();
            }
          }

          // Respawn traffic far ahead
          if (t.y < -50) {
            t.y = 1200 + Math.random() * 300;
            t.x = (Math.random() - 0.5) * 1.5;
            t.speed = 50 + Math.random() * 50;
          }
        }

        // --- 3. ROAD ITEMS (COINS & NITRO REFILLS) ---
        if (Math.random() > 0.97 && s.items.length < 5) {
          s.items.push({
            x: (Math.random() - 0.5) * 1.4,
            y: 1100,
            type: Math.random() > 0.6 ? 'nitro' : 'coin',
          });
        }

        for (let i = s.items.length - 1; i >= 0; i--) {
          const item = s.items[i];
          item.y -= s.speed * 0.07;

          // Collect item
          if (item.y < 30 && item.y > -20 && Math.abs(s.carX - item.x) < 0.25) {
            gameAudio.playPickup();
            if (item.type === 'coin') {
              s.score += 75;
            } else {
              s.nitroFuel = Math.min(100, s.nitroFuel + 30);
              s.score += 100;
            }
            setScore(s.score);
            s.items.splice(i, 1);
            continue;
          }

          if (item.y < -40) {
            s.items.splice(i, 1);
          }
        }
      }

      // =========================================================================
      // RENDER SECTION (Pseudo-3D Highway Canvas)
      // =========================================================================
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.85;
      }

      const w = canvas.width;
      const h = canvas.height;
      const horizon = h * 0.44;

      // Sky gradient (Addis Ababa Cyber Twilight)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
      skyGrad.addColorStop(0, '#050714');
      skyGrad.addColorStop(0.7, '#1e1145');
      skyGrad.addColorStop(1, '#ff4516');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizon);

      // Distant mountain silhouettes & neon city skyline
      ctx.fillStyle = '#0a0d24';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w * 0.15, horizon - 40);
      ctx.lineTo(w * 0.35, horizon - 15);
      ctx.lineTo(w * 0.55, horizon - 55);
      ctx.lineTo(w * 0.75, horizon - 20);
      ctx.lineTo(w, horizon - 45);
      ctx.lineTo(w, horizon);
      ctx.fill();

      // Road Ground (Neon cyber grid terrain)
      ctx.fillStyle = '#090c1b';
      ctx.fillRect(0, horizon, w, h - horizon);

      // Draw Perspective Road Polygon
      const roadWBottom = w * 0.75;
      const roadWTop = w * 0.08;
      const centerX = w * 0.5 + s.curve * 120;

      ctx.fillStyle = '#141829';
      ctx.beginPath();
      ctx.moveTo(centerX - roadWTop / 2, horizon);
      ctx.lineTo(centerX + roadWTop / 2, horizon);
      ctx.lineTo(w * 0.5 + roadWBottom / 2, h);
      ctx.lineTo(w * 0.5 - roadWBottom / 2, h);
      ctx.closePath();
      ctx.fill();

      // Road Neon Borders (Cyan / Magenta)
      ctx.strokeStyle = '#11bdf7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#11bdf7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(centerX - roadWTop / 2, horizon);
      ctx.lineTo(w * 0.5 - roadWBottom / 2, h);
      ctx.moveTo(centerX + roadWTop / 2, horizon);
      ctx.lineTo(w * 0.5 + roadWBottom / 2, h);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dashed lane lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let y = horizon; y < h; y += 22) {
        const factor = (y - horizon) / (h - horizon);
        const shiftY = (y + s.roadOffset) % (h - horizon);
        const actualY = horizon + shiftY;
        const widthAtY = roadWTop + (roadWBottom - roadWTop) * factor;
        const curX = w * 0.5 + s.curve * 120 * (1 - factor);

        ctx.beginPath();
        ctx.moveTo(curX - widthAtY * 0.16, actualY);
        ctx.lineTo(curX - widthAtY * 0.16, actualY + 8 * factor);
        ctx.moveTo(curX + widthAtY * 0.16, actualY);
        ctx.lineTo(curX + widthAtY * 0.16, actualY + 8 * factor);
        ctx.stroke();
      }

      // Render Traffic Cars in 3D depth
      const sortedTraffic = [...s.traffic].sort((a, b) => b.y - a.y);
      for (const t of sortedTraffic) {
        if (t.y < 0 || t.y > 1000) continue;
        const factor = (1000 - t.y) / 1000;
        const screenY = horizon + (h - horizon) * factor;
        const roadWAtY = roadWTop + (roadWBottom - roadWTop) * factor;
        const curCenterX = w * 0.5 + s.curve * 120 * (1 - factor);
        const screenX = curCenterX + (t.x * roadWAtY) / 2;

        const carScale = Math.max(0.2, factor) * 44;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.fillStyle = t.color;
        ctx.fillRect(-carScale / 2, -carScale * 0.6, carScale, carScale * 0.6);

        // Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-carScale * 0.45, -carScale * 0.2, carScale * 0.2, carScale * 0.15);
        ctx.fillRect(carScale * 0.25, -carScale * 0.2, carScale * 0.2, carScale * 0.15);
        ctx.restore();
      }

      // Render Road Items (Coins / Nitro)
      for (const item of s.items) {
        if (item.y < 0 || item.y > 1000) continue;
        const factor = (1000 - item.y) / 1000;
        const screenY = horizon + (h - horizon) * factor;
        const roadWAtY = roadWTop + (roadWBottom - roadWTop) * factor;
        const curCenterX = w * 0.5 + s.curve * 120 * (1 - factor);
        const screenX = curCenterX + (item.x * roadWAtY) / 2;
        const scale = Math.max(0.2, factor) * 22;

        ctx.save();
        ctx.translate(screenX, screenY);
        if (item.type === 'coin') {
          ctx.fillStyle = '#f5b200';
          ctx.shadowColor = '#f5b200';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, scale / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#11bdf7';
          ctx.shadowColor = '#11bdf7';
          ctx.shadowBlur = 10;
          ctx.fillRect(-scale / 2, -scale / 2, scale, scale);
        }
        ctx.restore();
      }

      // Render Player Sports Car at foreground
      const playerScreenX = w * 0.5 + (s.carX * roadWBottom) / 2;
      const playerScreenY = h - 65;

      ctx.save();
      ctx.translate(playerScreenX, playerScreenY);

      // Nitro exhaust glow
      if (s.isBoosting) {
        ctx.fillStyle = '#ff4516';
        ctx.shadowColor = '#ff4516';
        ctx.shadowBlur = 20;
        ctx.fillRect(-18, 20, 10, 25);
        ctx.fillRect(8, 20, 10, 25);
        ctx.shadowBlur = 0;
      }

      // Car Body
      ctx.fillStyle = '#f5b200';
      ctx.shadowColor = s.isBoosting ? '#11bdf7' : '#000000';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(-28, -25, 56, 48, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Windshield & roof
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-20, -18, 40, 22);

      // Headlight/taillight trails
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-24, 18, 12, 5);
      ctx.fillRect(12, 18, 12, 5);

      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-ink-950">
      {/* Top Racing HUD */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between text-xs font-mono pointer-events-none">
        {/* Speedometer */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="text-xl font-black text-white">{speed}</span>
          <span className="text-[10px] text-slate-400 uppercase">KM/H</span>
        </div>

        {/* Real Score & Distance */}
        <div className="flex items-center gap-4 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-xl border border-primary-500/30">
          <div>
            <span className="text-slate-400">SCORE: </span>
            <span className="font-bold text-amber-400 text-sm">{score.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">DISTANCE: </span>
            <span className="font-bold text-white text-sm">{distance}m</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">NEAR MISS: </span>
            <span className="font-bold text-emerald-400 text-sm">{nearMisses}</span>
          </div>
        </div>

        {/* Nitro Meter */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <Zap className={`w-4 h-4 ${isBoosting ? 'text-amber-400 animate-bounce' : 'text-primary-400'}`} />
          <span className="text-xs text-slate-300">NITRO</span>
          <div className="w-16 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${isBoosting ? 'bg-amber-400' : 'bg-primary-500'} transition-all`}
              style={{ width: `${nitroFuel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] rounded-2xl shadow-2xl border border-slate-800 object-contain bg-ink-950"
      />

      {/* Mobile Touch Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between sm:hidden pointer-events-auto">
        <div className="flex gap-2">
          <button
            onPointerDown={() => { stateRef.current.keys['a'] = true; }}
            onPointerUp={() => { stateRef.current.keys['a'] = false; }}
            className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/10 text-white font-bold flex items-center justify-center text-xl active:bg-primary-600"
          >
            ◀
          </button>
          <button
            onPointerDown={() => { stateRef.current.keys['d'] = true; }}
            onPointerUp={() => { stateRef.current.keys['d'] = false; }}
            className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/10 text-white font-bold flex items-center justify-center text-xl active:bg-primary-600"
          >
            ▶
          </button>
        </div>

        <button
          onPointerDown={() => { stateRef.current.keys[' '] = true; }}
          onPointerUp={() => { stateRef.current.keys[' '] = false; }}
          className="w-20 h-14 rounded-2xl bg-gradient-to-r from-primary-600 to-amber-500 text-ink-950 font-black text-sm flex items-center justify-center shadow-lg active:scale-95"
        >
          NITRO
        </button>
      </div>

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-up">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-rose-500/20 text-rose-400">
            <Flame className="w-10 h-10" />
          </div>

          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white font-display">
            HIGHWAY CRASH!
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            You pushed the limits on Addis Ababa Expressway!
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Final Score</div>
              <div className="text-xl font-bold font-mono text-amber-400">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Distance</div>
              <div className="text-xl font-bold font-mono text-white">{distance}m</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Loyalty XP</div>
              <div className="text-xl font-bold font-mono text-emerald-400">+{Math.max(10, Math.floor(score / 40))} XP</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={initGame}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-glow flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Drive Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
