import { useEffect, useRef, useState } from 'react';
import { Gamepad2, RotateCcw, Trophy, Award } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';
import type { OnlineGame } from '@/data/gamesCatalog';

interface RetroArcadeProps {
  game: OnlineGame;
  onGameOver: (score: number, stats: any) => void;
  isMuted?: boolean;
}

export default function RetroArcadeGame({ game, onGameOver, isMuted = false }: RetroArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    gameAudio.enabled = !isMuted;
  }, [isMuted]);

  const stateRef = useRef({
    // Snake / Arcade Grid state
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    score: 0,
    speed: 100,
    gameOver: false,
    keys: {} as Record<string, boolean>,
  });

  const initGame = () => {
    const s = stateRef.current;
    s.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    s.dir = { x: 1, y: 0 };
    s.food = { x: 15, y: 10 };
    s.score = 0;
    s.gameOver = false;
    setScore(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timer: NodeJS.Timeout;

    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const k = e.key.toLowerCase();
      if (['arrowup', 'w'].includes(k) && s.dir.y === 0) s.dir = { x: 0, y: -1 };
      else if (['arrowdown', 's'].includes(k) && s.dir.y === 0) s.dir = { x: 0, y: 1 };
      else if (['arrowleft', 'a'].includes(k) && s.dir.x === 0) s.dir = { x: -1, y: 0 };
      else if (['arrowright', 'd'].includes(k) && s.dir.x === 0) s.dir = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);

    const step = () => {
      const s = stateRef.current;
      if (!s.gameOver) {
        const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
        const gridW = 30;
        const gridH = 20;

        // Wall collisions
        if (head.x < 0 || head.x >= gridW || head.y < 0 || head.y >= gridH) {
          s.gameOver = true;
          setIsGameOver(true);
          gameAudio.playCrash();
          onGameOver(s.score, { length: s.snake.length });
          return;
        }

        // Body collisions
        for (const seg of s.snake) {
          if (seg.x === head.x && seg.y === head.y) {
            s.gameOver = true;
            setIsGameOver(true);
            gameAudio.playCrash();
            onGameOver(s.score, { length: s.snake.length });
            return;
          }
        }

        s.snake.unshift(head);

        // Food collision
        if (head.x === s.food.x && head.y === s.food.y) {
          s.score += 100;
          setScore(s.score);
          gameAudio.playPickup();
          s.food = {
            x: Math.floor(Math.random() * gridW),
            y: Math.floor(Math.random() * gridH),
          };
        } else {
          s.snake.pop();
        }

        // Render
        ctx.fillStyle = '#070a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cellSize = canvas.width / gridW;

        // Food
        ctx.fillStyle = '#ff4516';
        ctx.shadowColor = '#ff4516';
        ctx.shadowBlur = 10;
        ctx.fillRect(s.food.x * cellSize + 2, s.food.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.shadowBlur = 0;

        // Snake
        for (let i = 0; i < s.snake.length; i++) {
          const seg = s.snake[i];
          ctx.fillStyle = i === 0 ? '#11bdf7' : '#0284c7';
          ctx.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }
    };

    timer = setInterval(step, 85);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [game]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-ink-950">
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-xl border border-white/10">
          <Gamepad2 className="w-4 h-4 text-primary-400" />
          <span className="text-white font-bold">{game.title}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-xl border border-primary-500/30">
          <span className="text-slate-400">SCORE:</span>
          <span className="font-bold text-amber-400 text-sm">{score}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={750}
        height={500}
        className="w-full h-full max-w-[750px] max-h-[500px] rounded-2xl border border-slate-800 object-contain bg-ink-950"
      />

      {isGameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <Trophy className="w-12 h-12 text-amber-400" />
          <h2 className="mt-2 text-3xl font-extrabold text-white">GAME OVER</h2>
          <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Final Real Score</div>
            <div className="text-2xl font-bold font-mono text-amber-400">{score}</div>
            <div className="text-xs text-emerald-400 mt-1">+{Math.max(10, Math.floor(score / 20))} Loyalty XP</div>
          </div>
          <button
            onClick={initGame}
            className="mt-4 px-6 py-2.5 rounded-xl font-bold text-sm bg-primary-600 text-white flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}
    </div>
  );
}
