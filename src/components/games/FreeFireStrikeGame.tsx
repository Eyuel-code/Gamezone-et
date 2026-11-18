import { useEffect, useRef, useState } from 'react';
import { Flame, Shield, Heart, Zap, Crosshair, RotateCcw, Trophy, Award, Sparkles } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface FreeFireGameProps {
  onGameOver: (score: number, stats: { kills: number; headshots: number; waves: number }) => void;
  isMuted?: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
  damage: number;
  life: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  shootCooldown: number;
  radius: number;
}

interface ItemDrop {
  x: number;
  y: number;
  type: 'medkit' | 'ammo';
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export default function FreeFireStrikeGame({ onGameOver, isMuted = false }: FreeFireGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time game HUD state
  const [hp, setHp] = useState(100);
  const [armor, setArmor] = useState(50);
  const [ammo, setAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(90);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isBooyah, setIsBooyah] = useState(false);
  const [safeZoneRadius, setSafeZoneRadius] = useState(360);

  // Sync mute state to audio synth
  useEffect(() => {
    gameAudio.enabled = !isMuted;
  }, [isMuted]);

  // Game Engine Reference Object
  const stateRef = useRef({
    player: {
      x: 400,
      y: 250,
      radius: 16,
      angle: 0,
      hp: 100,
      armor: 50,
      ammo: 30,
      reserveAmmo: 90,
      speed: 3.5,
    },
    keys: {} as Record<string, boolean>,
    mouse: { x: 400, y: 250, isDown: false },
    touchMove: { active: false, x: 0, y: 0, originX: 0, originY: 0 },
    touchAim: { active: false, angle: 0 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    items: [] as ItemDrop[],
    particles: [] as Particle[],
    score: 0,
    kills: 0,
    headshots: 0,
    wave: 1,
    shootTimer: 0,
    safeZone: {
      x: 400,
      y: 250,
      radius: 360,
      shrinkRate: 0.12,
    },
    gameOver: false,
    booyah: false,
  });

  const initGame = () => {
    const s = stateRef.current;
    s.player = {
      x: 400,
      y: 250,
      radius: 16,
      angle: 0,
      hp: 100,
      armor: 50,
      ammo: 30,
      reserveAmmo: 90,
      speed: 3.5,
    };
    s.score = 0;
    s.kills = 0;
    s.headshots = 0;
    s.wave = 1;
    s.bullets = [];
    s.items = [];
    s.particles = [];
    s.safeZone = { x: 400, y: 250, radius: 360, shrinkRate: 0.12 };
    s.gameOver = false;
    s.booyah = false;

    // Spawn Initial Wave 1 Enemies
    spawnEnemies(5, 1);

    setHp(100);
    setArmor(50);
    setAmmo(30);
    setReserveAmmo(90);
    setScore(0);
    setKills(0);
    setWave(1);
    setIsGameOver(false);
    setIsBooyah(false);
  };

  const spawnEnemies = (count: number, waveNum: number) => {
    const s = stateRef.current;
    s.enemies = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 220 + Math.random() * 120;
      s.enemies.push({
        id: Date.now() + i,
        x: s.safeZone.x + Math.cos(angle) * dist,
        y: s.safeZone.y + Math.sin(angle) * dist,
        hp: 40 + waveNum * 15,
        maxHp: 40 + waveNum * 15,
        speed: 1.2 + waveNum * 0.25,
        shootCooldown: Math.floor(60 + Math.random() * 90),
        radius: 14,
      });
    }

    // Drop random medkit and ammo
    s.items.push({
      x: s.safeZone.x + (Math.random() - 0.5) * 200,
      y: s.safeZone.y + (Math.random() - 0.5) * 200,
      type: 'medkit',
      radius: 12,
    });
    s.items.push({
      x: s.safeZone.x + (Math.random() - 0.5) * 200,
      y: s.safeZone.y + (Math.random() - 0.5) * 200,
      type: 'ammo',
      radius: 12,
    });
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
      if (e.key.toLowerCase() === 'r') {
        reloadGun();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouse.x = (e.clientX - rect.left) * scaleX;
      stateRef.current.mouse.y = (e.clientY - rect.top) * scaleY;
    };

    const onMouseDown = () => {
      stateRef.current.mouse.isDown = true;
    };

    const onMouseUp = () => {
      stateRef.current.mouse.isDown = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    const reloadGun = () => {
      const s = stateRef.current;
      if (s.player.ammo < 30 && s.player.reserveAmmo > 0) {
        const needed = 30 - s.player.ammo;
        const take = Math.min(needed, s.player.reserveAmmo);
        s.player.ammo += take;
        s.player.reserveAmmo -= take;
        setAmmo(s.player.ammo);
        setReserveAmmo(s.player.reserveAmmo);
        gameAudio.playPickup();
      }
    };

    // Main 60fps Game Loop
    const loop = () => {
      const s = stateRef.current;
      if (!s.gameOver && !s.booyah) {
        // --- 1. UPDATE PLAYER ---
        let dx = 0;
        let dy = 0;
        if (s.keys['w'] || s.keys['arrowup']) dy -= 1;
        if (s.keys['s'] || s.keys['arrowdown']) dy += 1;
        if (s.keys['a'] || s.keys['arrowleft']) dx -= 1;
        if (s.keys['d'] || s.keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        s.player.x = Math.max(20, Math.min(canvas.width - 20, s.player.x + dx * s.player.speed));
        s.player.y = Math.max(20, Math.min(canvas.height - 20, s.player.y + dy * s.player.speed));

        // Player aim angle
        s.player.angle = Math.atan2(s.mouse.y - s.player.y, s.mouse.x - s.player.x);

        // --- 2. SHOOTING LOGIC (EVO MP40) ---
        s.shootTimer++;
        if ((s.mouse.isDown || s.keys[' ']) && s.shootTimer >= 8) {
          if (s.player.ammo > 0) {
            s.player.ammo--;
            s.shootTimer = 0;
            setAmmo(s.player.ammo);
            gameAudio.playGunshot();

            // Spawn bullet with slight spread
            const spread = (Math.random() - 0.5) * 0.12;
            const bulletAngle = s.player.angle + spread;
            const bSpeed = 12;

            s.bullets.push({
              x: s.player.x + Math.cos(s.player.angle) * 22,
              y: s.player.y + Math.sin(s.player.angle) * 22,
              vx: Math.cos(bulletAngle) * bSpeed,
              vy: Math.sin(bulletAngle) * bSpeed,
              isEnemy: false,
              damage: 28,
              life: 55,
            });

            // Muzzle particles
            for (let p = 0; p < 4; p++) {
              s.particles.push({
                x: s.player.x + Math.cos(s.player.angle) * 22,
                y: s.player.y + Math.sin(s.player.angle) * 22,
                vx: Math.cos(bulletAngle) * (3 + Math.random() * 4) + (Math.random() - 0.5) * 2,
                vy: Math.sin(bulletAngle) * (3 + Math.random() * 4) + (Math.random() - 0.5) * 2,
                color: '#ff4516',
                life: 12,
                maxLife: 12,
              });
            }
          } else {
            reloadGun();
          }
        }

        // --- 3. SHRINKING SAFE ZONE (Battle Royale Mechanics) ---
        if (s.safeZone.radius > 90) {
          s.safeZone.radius -= s.safeZone.shrinkRate;
          setSafeZoneRadius(Math.round(s.safeZone.radius));
        }

        // Check if player is outside safe zone (take storm damage)
        const distFromCenter = Math.hypot(s.player.x - s.safeZone.x, s.player.y - s.safeZone.y);
        if (distFromCenter > s.safeZone.radius) {
          s.player.hp -= 0.15; // storm tick
          setHp(Math.max(0, Math.round(s.player.hp)));
          if (s.player.hp <= 0) {
            triggerGameOver(false);
          }
        }

        // --- 4. UPDATE BULLETS ---
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.x += b.vx;
          b.y += b.vy;
          b.life--;

          if (b.life <= 0 || b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            s.bullets.splice(i, 1);
            continue;
          }

          // Bullet vs Enemy collision
          if (!b.isEnemy) {
            for (let j = s.enemies.length - 1; j >= 0; j--) {
              const enemy = s.enemies[j];
              const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
              if (dist < enemy.radius + 4) {
                // Check Headshot (top part)
                const isHead = Math.random() > 0.65;
                const dmg = isHead ? b.damage * 1.8 : b.damage;
                enemy.hp -= dmg;
                gameAudio.playHit();

                // Spark particles
                for (let k = 0; k < 6; k++) {
                  s.particles.push({
                    x: b.x,
                    y: b.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    color: isHead ? '#f5b200' : '#11bdf7',
                    life: 14,
                    maxLife: 14,
                  });
                }

                // Add points
                const pts = isHead ? 250 : 150;
                s.score += pts;
                if (isHead) s.headshots++;
                setScore(s.score);

                s.bullets.splice(i, 1);

                // Enemy eliminated
                if (enemy.hp <= 0) {
                  s.kills++;
                  s.score += 300; // Elimination bonus
                  setKills(s.kills);
                  setScore(s.score);

                  // Drop ammo or medkit
                  if (Math.random() > 0.4) {
                    s.items.push({
                      x: enemy.x,
                      y: enemy.y,
                      type: Math.random() > 0.5 ? 'ammo' : 'medkit',
                      radius: 12,
                    });
                  }
                  s.enemies.splice(j, 1);

                  // Check wave completion
                  if (s.enemies.length === 0) {
                    if (s.wave >= 4) {
                      triggerGameOver(true); // BOOYAH VICTORY!
                    } else {
                      s.wave++;
                      s.score += 500; // Wave bonus
                      setWave(s.wave);
                      setScore(s.score);
                      gameAudio.playPickup();
                      spawnEnemies(4 + s.wave * 2, s.wave);
                    }
                  }
                }
                break;
              }
            }
          } else {
            // Enemy bullet vs Player
            const dist = Math.hypot(b.x - s.player.x, b.y - s.player.y);
            if (dist < s.player.radius + 4) {
              gameAudio.playHit();
              if (s.player.armor > 0) {
                s.player.armor -= b.damage * 0.7;
                s.player.hp -= b.damage * 0.3;
              } else {
                s.player.hp -= b.damage;
              }
              setArmor(Math.max(0, Math.round(s.player.armor)));
              setHp(Math.max(0, Math.round(s.player.hp)));
              s.bullets.splice(i, 1);

              if (s.player.hp <= 0) {
                triggerGameOver(false);
              }
            }
          }
        }

        // --- 5. UPDATE ENEMIES ---
        for (let i = 0; i < s.enemies.length; i++) {
          const enemy = s.enemies[i];
          const angleToPlayer = Math.atan2(s.player.y - enemy.y, s.player.x - enemy.x);
          const distToPlayer = Math.hypot(s.player.x - enemy.x, s.player.y - enemy.y);

          // Move towards player or circle
          if (distToPlayer > 120) {
            enemy.x += Math.cos(angleToPlayer) * enemy.speed;
            enemy.y += Math.sin(angleToPlayer) * enemy.speed;
          }

          // Shoot at player
          enemy.shootCooldown--;
          if (enemy.shootCooldown <= 0 && distToPlayer < 350) {
            enemy.shootCooldown = Math.floor(70 + Math.random() * 60);
            const spread = (Math.random() - 0.5) * 0.25;
            const bAngle = angleToPlayer + spread;
            s.bullets.push({
              x: enemy.x + Math.cos(angleToPlayer) * 16,
              y: enemy.y + Math.sin(angleToPlayer) * 16,
              vx: Math.cos(bAngle) * 5.5,
              vy: Math.sin(bAngle) * 5.5,
              isEnemy: true,
              damage: 14 + s.wave * 2,
              life: 60,
            });
          }
        }

        // --- 6. UPDATE ITEMS ---
        for (let i = s.items.length - 1; i >= 0; i--) {
          const item = s.items[i];
          const dist = Math.hypot(s.player.x - item.x, s.player.y - item.y);
          if (dist < s.player.radius + item.radius) {
            gameAudio.playPickup();
            if (item.type === 'medkit') {
              s.player.hp = Math.min(100, s.player.hp + 50);
              s.player.armor = Math.min(100, s.player.armor + 30);
              setHp(Math.round(s.player.hp));
              setArmor(Math.round(s.player.armor));
            } else {
              s.player.reserveAmmo += 60;
              setReserveAmmo(s.player.reserveAmmo);
            }
            s.score += 75;
            setScore(s.score);
            s.items.splice(i, 1);
          }
        }

        // --- 7. UPDATE PARTICLES ---
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      // =========================================================================
      // RENDER SECTION
      // =========================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark tactical grid floor
      ctx.fillStyle = '#070a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid mesh
      ctx.strokeStyle = 'rgba(255, 69, 22, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Safe Zone boundary (Electric Blue/Purple)
      ctx.strokeStyle = '#11bdf7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#11bdf7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(s.safeZone.x, s.safeZone.y, s.safeZone.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Storm danger zone overlay outside safe zone
      ctx.fillStyle = 'rgba(120, 20, 255, 0.12)';
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.arc(s.safeZone.x, s.safeZone.y, s.safeZone.radius, 0, Math.PI * 2, true);
      ctx.fill();

      // Render Item Drops
      for (const item of s.items) {
        ctx.save();
        ctx.translate(item.x, item.y);
        if (item.type === 'medkit') {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-2, -6, 4, 12);
          ctx.fillRect(-6, -2, 12, 4);
        } else {
          ctx.fillStyle = '#f5b200';
          ctx.beginPath();
          ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('AMMO', -11, 3);
        }
        ctx.restore();
      }

      // Render Bullets
      for (const b of s.bullets) {
        ctx.fillStyle = b.isEnemy ? '#ef4444' : '#ff4516';
        ctx.shadowColor = b.isEnemy ? '#ef4444' : '#f5b200';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.isEnemy ? 3.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render Enemies
      for (const enemy of s.enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Health bar
        ctx.fillStyle = '#334155';
        ctx.fillRect(-16, -22, 32, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-16, -22, (enemy.hp / enemy.maxHp) * 32, 4);

        // Body
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // Vest
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Render Player (Alok with signature tactical jacket & glowing EVO gun)
      ctx.save();
      ctx.translate(s.player.x, s.player.y);
      ctx.rotate(s.player.angle);

      // Glowing Aura
      ctx.fillStyle = 'rgba(255, 69, 22, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();

      // Body (Tactical Jacket)
      ctx.fillStyle = '#ff4516';
      ctx.beginPath();
      ctx.arc(0, 0, s.player.radius, 0, Math.PI * 2);
      ctx.fill();

      // Armor vest
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, s.player.radius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // EVO MP40 Predatory Cobra Barrel
      ctx.fillStyle = '#f5b200';
      ctx.shadowColor = '#ff4516';
      ctx.shadowBlur = 10;
      ctx.fillRect(10, -3.5, 18, 7);
      ctx.shadowBlur = 0;

      ctx.restore();

      // Render Particles
      for (const p of s.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const triggerGameOver = (won: boolean) => {
    const s = stateRef.current;
    if (won) {
      s.booyah = true;
      s.score += 1200; // Booyah bonus!
      setIsBooyah(true);
      gameAudio.playGoal();
    } else {
      s.gameOver = true;
      setIsGameOver(true);
      gameAudio.playCrash();
    }
    setScore(s.score);
    onGameOver(s.score, { kills: s.kills, headshots: s.headshots, waves: s.wave });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center bg-ink-950">
      {/* Top Combat HUD */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between text-xs font-mono pointer-events-none">
        {/* Health & Armor */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-current" />
            <span className="font-bold text-white">{hp}</span>
            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${hp}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">{armor}</span>
          </div>
        </div>

        {/* Real Score & Kills */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-primary-500/30">
          <div>
            <span className="text-slate-400">SCORE: </span>
            <span className="font-bold text-amber-400 text-sm">{score.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">KILLS: </span>
            <span className="font-bold text-rose-400 text-sm">{kills}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">WAVE: </span>
            <span className="font-bold text-primary-400 text-sm">{wave}/4</span>
          </div>
        </div>

        {/* Ammo */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white text-sm">{ammo}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400 text-xs">{reserveAmmo}</span>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full max-w-[800px] max-h-[500px] rounded-2xl shadow-2xl border border-slate-800 cursor-crosshair object-contain bg-ink-950"
      />

      {/* Mobile Touch Controls Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between sm:hidden pointer-events-auto">
        <div className="flex flex-col items-center gap-1 bg-black/60 p-2 rounded-2xl border border-white/10">
          <button
            onPointerDown={() => { stateRef.current.keys['w'] = true; }}
            onPointerUp={() => { stateRef.current.keys['w'] = false; }}
            className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center active:bg-primary-600"
          >
            ▲
          </button>
          <div className="flex gap-1">
            <button
              onPointerDown={() => { stateRef.current.keys['a'] = true; }}
              onPointerUp={() => { stateRef.current.keys['a'] = false; }}
              className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center active:bg-primary-600"
            >
              ◀
            </button>
            <button
              onPointerDown={() => { stateRef.current.keys['s'] = true; }}
              onPointerUp={() => { stateRef.current.keys['s'] = false; }}
              className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center active:bg-primary-600"
            >
              ▼
            </button>
            <button
              onPointerDown={() => { stateRef.current.keys['d'] = true; }}
              onPointerUp={() => { stateRef.current.keys['d'] = false; }}
              className="w-10 h-10 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center active:bg-primary-600"
            >
              ▶
            </button>
          </div>
        </div>

        <button
          onPointerDown={() => { stateRef.current.mouse.isDown = true; }}
          onPointerUp={() => { stateRef.current.mouse.isDown = false; }}
          className="w-16 h-16 rounded-full bg-primary-600 border-2 border-amber-400 text-white font-bold flex items-center justify-center shadow-lg active:scale-95"
        >
          FIRE
        </button>
      </div>

      {/* Game Over / Booyah Result Screen */}
      {(isGameOver || isBooyah) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-up">
          <div className={`grid h-20 w-20 place-items-center rounded-3xl ${isBooyah ? 'bg-amber-500/20 text-amber-400 shadow-glow-gold' : 'bg-rose-500/20 text-rose-400'}`}>
            {isBooyah ? <Trophy className="w-10 h-10" /> : <Flame className="w-10 h-10" />}
          </div>

          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white font-display">
            {isBooyah ? 'BOOYAH! MATCH WON!' : 'ELIMINATED!'}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {isBooyah ? 'You survived all battle royale waves!' : 'Better luck next drop in Bermuda!'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Final Score</div>
              <div className="text-xl font-bold font-mono text-amber-400">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Kills</div>
              <div className="text-xl font-bold font-mono text-rose-400">{kills}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Loyalty XP</div>
              <div className="text-xl font-bold font-mono text-emerald-400">+{Math.max(10, Math.floor(score / 35))} XP</div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={initGame}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-glow flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
