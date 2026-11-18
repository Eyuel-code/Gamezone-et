import { useEffect, useRef, useState } from 'react';
import { Trophy, Target, Sparkles, RotateCcw, Award } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface BoleShootoutProps {
  onGameOver: (score: number, stats: { goals: number; saves: number; topBins: number }) => void;
  isMuted?: boolean;
}

interface Ball {
  x: number;
  y: number;
  z: number; // 0 (near player) to 1 (at goal line)
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  radius: number;
}

interface Goalkeeper {
  x: number; // goal center is 0, -180 (left post) to 180 (right post)
  y: number;
  diveTargetX: number;
  diveTargetY: number;
  state: 'ready' | 'diving' | 'saved' | 'beaten';
}

export default function BoleShootoutGame({ onGameOver, isMuted = false }: BoleShootoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Match HUD states
  const [round, setRound] = useState(1);
  const [maxRounds] = useState(5);
  const [goals, setGoals] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedbackText, setFeedbackText] = useState('Swipe or drag ball to curve into the top corner!');
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    gameAudio.enabled = !isMuted;
  }, [isMuted]);

  const stateRef = useRef({
    ball: {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      radius: 16,
    } as Ball,
    keeper: {
      x: 0,
      y: 0,
      diveTargetX: 0,
      diveTargetY: 0,
      state: 'ready',
    } as Goalkeeper,
    dragStart: null as { x: number; y: number } | null,
    isAiming: false,
    shotInFlight: false,
    goals: 0,
    saves: 0,
    topBins: 0,
    round: 1,
    score: 0,
    streak: 0,
    gameOver: false,
  });

  const resetBall = () => {
    const s = stateRef.current;
    s.ball = {
      x: 0,
      y: 110,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      radius: 16,
    };
    s.keeper = {
      x: (Math.random() - 0.5) * 40,
      y: -15,
      diveTargetX: 0,
      diveTargetY: 0,
      state: 'ready',
    };
    s.shotInFlight = false;
    s.isAiming = false;
    s.dragStart = null;
  };

  const initGame = () => {
    const s = stateRef.current;
    s.goals = 0;
    s.saves = 0;
    s.topBins = 0;
    s.round = 1;
    s.score = 0;
    s.streak = 0;
    s.gameOver = false;

    setRound(1);
    setGoals(0);
    setScore(0);
    setStreak(0);
    setFeedbackText('Swipe or drag ball to curve into the top corner!');
    setIsGameOver(false);

    resetBall();
  };

  useEffect(() => {
    initGame();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const onPointerDown = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.shotInFlight || s.gameOver) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Check if clicked near ball
      const ballScreenX = canvas.width / 2 + s.ball.x;
      const ballScreenY = canvas.height * 0.76 + s.ball.y;
      const dist = Math.hypot(clientX - ballScreenX, clientY - ballScreenY);

      if (dist < 50) {
        s.isAiming = true;
        s.dragStart = { x: clientX, y: clientY };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s.isAiming || !s.dragStart || s.shotInFlight || s.gameOver) return;

      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const dx = endX - s.dragStart.x;
      const dy = endY - s.dragStart.y;
      const power = Math.hypot(dx, dy);

      if (power > 25 && dy < 0) {
        // Kick Ball Towards Goal!
        s.shotInFlight = true;
        s.isAiming = false;

        const forwardForce = Math.min(18, Math.max(8, -dy * 0.12));
        s.ball.vz = 0.024;
        s.ball.vx = dx * 0.045;
        s.ball.vy = dy * 0.038;
        s.ball.spin = dx * 0.015;

        // Goalkeeper AI Reaction
        const targetX = s.ball.vx * 35;
        const targetY = s.ball.vy * 20;
        s.keeper.state = 'diving';
        s.keeper.diveTargetX = Math.max(-170, Math.min(170, targetX + (Math.random() - 0.5) * 50));
        s.keeper.diveTargetY = Math.max(-50, Math.min(10, targetY));

        gameAudio.playGunshot(); // Kick thump
      } else {
        s.isAiming = false;
        s.dragStart = null;
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    // Main 60fps Loop
    const loop = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;

      if (s.shotInFlight && !s.gameOver) {
        // Move Ball in 3D Depth
        s.ball.z += s.ball.vz;
        s.ball.x += s.ball.vx + s.ball.spin * s.ball.z;
        s.ball.y += s.ball.vy;
        s.ball.vy += 0.25; // gravity

        // Move Goalkeeper
        if (s.keeper.state === 'diving') {
          s.keeper.x += (s.keeper.diveTargetX - s.keeper.x) * 0.14;
          s.keeper.y += (s.keeper.diveTargetY - s.keeper.y) * 0.14;
        }

        // Check if ball reached goal line (z >= 0.88)
        if (s.ball.z >= 0.88) {
          s.shotInFlight = false;

          // Goal dimensions: Post left -180, Post right 180, Crossbar y: -80, Ground y: 20
          const inPostX = s.ball.x > -180 && s.ball.x < 180;
          const inPostY = s.ball.y > -80 && s.ball.y < 20;

          // Check Goalkeeper Save
          const distToKeeper = Math.hypot(s.ball.x - s.keeper.x, s.ball.y - s.keeper.y);
          const isSaved = distToKeeper < 45;

          if (inPostX && inPostY && !isSaved) {
            // GOAL SCORED!
            s.goals++;
            s.streak++;
            const isTopBin = (s.ball.x < -130 || s.ball.x > 130) && s.ball.y < -50;
            if (isTopBin) s.topBins++;

            const pts = (isTopBin ? 500 : 300) * (s.streak >= 2 ? 1.5 : 1);
            s.score += Math.round(pts);

            setGoals(s.goals);
            setScore(s.score);
            setStreak(s.streak);
            setFeedbackText(isTopBin ? '🚀 UPPER 90 TOP BIN! GOAAAAL! (+500)' : '⚽ GOAAAAL! Beautiful Finish! (+300)');
            gameAudio.playGoal();
          } else {
            // SAVED OR MISSED
            s.saves++;
            s.streak = 0;
            setStreak(0);
            if (isSaved) {
              setFeedbackText('🧤 SAVED! Goalkeeper made a brilliant reflex stop!');
              gameAudio.playHit();
            } else {
              setFeedbackText('❌ OFF TARGET! Hit the crossbar or went wide!');
              gameAudio.playCrash();
            }
          }

          // Advance round after delay
          setTimeout(() => {
            if (s.round >= maxRounds) {
              s.gameOver = true;
              setIsGameOver(true);
              onGameOver(s.score, { goals: s.goals, saves: s.saves, topBins: s.topBins });
            } else {
              s.round++;
              setRound(s.round);
              resetBall();
            }
          }, 1400);
        }
      }

      // =========================================================================
      // RENDER SECTION
      // =========================================================================
      ctx.clearRect(0, 0, w, h);

      // Bole Stadium pitch background
      const pitchGrad = ctx.createLinearGradient(0, 0, 0, h);
      pitchGrad.addColorStop(0, '#0f172a'); // Night sky
      pitchGrad.addColorStop(0.35, '#1e293b'); // Stadium stands
      pitchGrad.addColorStop(0.36, '#064e3b'); // Grass horizon
      pitchGrad.addColorStop(1, '#047857'); // Emerald green grass
      ctx.fillStyle = pitchGrad;
      ctx.fillRect(0, 0, w, h);

      // Stadium floodlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(w * 0.2, 50, 40, 0, Math.PI * 2);
      ctx.arc(w * 0.8, 50, 40, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Box Grass Stripes
      ctx.fillStyle = '#059669';
      for (let y = h * 0.45; y < h; y += 35) {
        ctx.fillRect(0, y, w, 16);
      }

      // Goal Center Origin
      const goalCenterX = w / 2;
      const goalCenterY = h * 0.44;

      // Draw Goal Frame & Net
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 10;

      // Net pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(goalCenterX - 180, goalCenterY - 80, 360, 100);

      // Goal Posts
      ctx.beginPath();
      ctx.moveTo(goalCenterX - 180, goalCenterY + 20);
      ctx.lineTo(goalCenterX - 180, goalCenterY - 80);
      ctx.lineTo(goalCenterX + 180, goalCenterY - 80);
      ctx.lineTo(goalCenterX + 180, goalCenterY + 20);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Top Corner Target Bullseyes
      ctx.strokeStyle = '#f5b200';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(goalCenterX - 150, goalCenterY - 55, 18, 0, Math.PI * 2);
      ctx.arc(goalCenterX + 150, goalCenterY - 55, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Goalkeeper
      const keeperScreenX = goalCenterX + s.keeper.x;
      const keeperScreenY = goalCenterY + s.keeper.y;

      ctx.save();
      ctx.translate(keeperScreenX, keeperScreenY);

      // Keeper Body (Yellow goalkeeper kit)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, -18, 14, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.fillRect(-14, -4, 28, 32); // torso

      // Gloves (Neon Orange)
      ctx.fillStyle = '#ff4516';
      ctx.beginPath();
      ctx.arc(-20, 2, 8, 0, Math.PI * 2);
      ctx.arc(20, 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Ball (Scales down with 3D depth)
      const ballScale = Math.max(0.4, 1 - s.ball.z * 0.55);
      const ballScreenX = goalCenterX + s.ball.x;
      const ballScreenY = h * 0.76 + s.ball.y - s.ball.z * 180;

      ctx.save();
      ctx.translate(ballScreenX, ballScreenY);
      ctx.scale(ballScale, ballScale);

      // Ball shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball white sphere
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ball black pentagons
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Drag Aim Guide Line
      if (s.isAiming && s.dragStart) {
        ctx.strokeStyle = '#f5b200';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(goalCenterX, h * 0.76);
        ctx.lineTo(goalCenterX, goalCenterY - 40);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-ink-950 select-none">
      {/* Top Football HUD */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between text-xs font-mono pointer-events-none">
        {/* Round Counter */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-bold text-sm">PENALTY {round}/{maxRounds}</span>
        </div>

        {/* Real Score & Goals */}
        <div className="flex items-center gap-4 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-xl border border-emerald-500/30">
          <div>
            <span className="text-slate-400">SCORE: </span>
            <span className="font-bold text-amber-400 text-sm">{score.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">GOALS: </span>
            <span className="font-bold text-emerald-400 text-sm">{goals}/{maxRounds}</span>
          </div>
          {streak > 1 && (
            <>
              <div className="h-4 w-px bg-slate-700" />
              <div className="text-amber-400 font-bold animate-pulse">
                STREAK {streak}X
              </div>
            </>
          )}
        </div>

        {/* Stadium Indicator */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">Bole Stadium</span>
        </div>
      </div>

      {/* Floating Dynamic Feedback Text */}
      <div className="absolute top-14 left-0 right-0 z-10 text-center pointer-events-none">
        <span className="inline-block px-4 py-1 rounded-full bg-black/60 border border-white/10 text-xs font-semibold text-white backdrop-blur-md">
          {feedbackText}
        </span>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] rounded-2xl shadow-2xl border border-slate-800 object-contain bg-ink-950 cursor-pointer touch-none"
      />

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-up">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/20 text-emerald-400 shadow-glow">
            <Trophy className="w-10 h-10" />
          </div>

          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white font-display">
            SHOOTOUT FINISHED!
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {goals >= 3 ? 'Match Won! Bole Stadium crowd goes wild!' : 'Good effort! Practice your curve shots!'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Final Score</div>
              <div className="text-xl font-bold font-mono text-amber-400">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Goals Scored</div>
              <div className="text-xl font-bold font-mono text-emerald-400">{goals}/{maxRounds}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Loyalty XP</div>
              <div className="text-xl font-bold font-mono text-primary-400">+{Math.max(10, Math.floor(score / 30))} XP</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={initGame}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-glow flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Shoot Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
