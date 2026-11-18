import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Gauge, Zap, Flame, RotateCcw, Trophy, Award, Sparkles } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface AddisDrift3DProps {
  onGameOver: (score: number, stats: { distance: number; topSpeed: number; nearMisses: number }) => void;
  isMuted?: boolean;
}

interface Traffic3D {
  mesh: THREE.Group;
  lane: number; // -1, 0, 1
  speed: number;
}

interface Item3D {
  mesh: THREE.Mesh;
  type: 'coin' | 'nitro';
}

interface DriftLevel {
  level: number;
  name: string;
  goalMeters: number;
  baseSpeed: number;
  multiplier: number;
}

const DRIFT_LEVELS: DriftLevel[] = [
  { level: 1, name: 'Meskel Square Cruise', goalMeters: 600, baseSpeed: 120, multiplier: 1.0 },
  { level: 2, name: 'Bole Boulevard Rush', goalMeters: 1500, baseSpeed: 155, multiplier: 1.5 },
  { level: 3, name: 'Expressway Midnight', goalMeters: 2800, baseSpeed: 190, multiplier: 2.2 },
  { level: 4, name: 'Storm Overdrive', goalMeters: 4500, baseSpeed: 230, multiplier: 3.2 },
  { level: 5, name: 'Apex Grandmaster Velocity', goalMeters: 7500, baseSpeed: 275, multiplier: 5.0 },
];

export default function AddisDrift3DGame({ onGameOver, isMuted = false }: AddisDrift3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // HUD States
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
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
    carX: 0,
    currentLevel: 1,
    speed: 120,
    maxSpeed: 190,
    nitroSpeed: 275,
    nitroFuel: 100,
    isBoosting: false,
    distance: 0,
    score: 0,
    nearMisses: 0,
    topSpeed: 120,
    keys: {} as Record<string, boolean>,
    traffic: [] as Traffic3D[],
    items: [] as Item3D[],
    roadSegments: [] as THREE.Mesh[],
    gameOver: false,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    stateRef.current = {
      carX: 0,
      currentLevel: 1,
      speed: 120,
      maxSpeed: 190,
      nitroSpeed: 275,
      nitroFuel: 100,
      isBoosting: false,
      distance: 0,
      score: 0,
      nearMisses: 0,
      topSpeed: 120,
      keys: {},
      traffic: [],
      items: [],
      roadSegments: [],
      gameOver: false,
    };
    setSpeed(120);
    setNitroFuel(100);
    setDistance(0);
    setScore(0);
    setNearMisses(0);
    setIsGameOver(false);
    setIsBoosting(false);

    // =========================================================================
    // 1. THREE.JS SCENE SETUP
    // =========================================================================
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050714);
    scene.fog = new THREE.FogExp2(0x050714, 0.006);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 4.5, -9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // =========================================================================
    // 2. LIGHTING & ENVIRONMENT
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0x404870, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight.position.set(20, 40, -30);
    scene.add(dirLight);

    // Distant Neon Addis Towers
    const towerGeo = new THREE.BoxGeometry(10, 80, 10);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x0a0f24, metalness: 0.8, roughness: 0.2 });
    for (let i = 0; i < 12; i++) {
      const tower = new THREE.Mesh(towerGeo, towerMat);
      const x = i % 2 === 0 ? -45 - Math.random() * 30 : 45 + Math.random() * 30;
      const z = 80 + i * 40;
      tower.position.set(x, 40, z);
      scene.add(tower);
    }

    // =========================================================================
    // 3. 3D REPEATING HIGHWAY ROAD & LANES
    // =========================================================================
    const roadWidth = 22;
    const roadLength = 200;

    // Road Bed
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 32);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x111625, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, roadLength / 2 - 20);
    scene.add(road);

    // Neon Guardrails (Left and Right)
    const railGeo = new THREE.BoxGeometry(0.8, 1.2, roadLength);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x11bdf7,
      emissive: 0x11bdf7,
      emissiveIntensity: 0.5,
    });
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-roadWidth / 2, 0.6, roadLength / 2 - 20);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(roadWidth / 2, 0.6, roadLength / 2 - 20);
    scene.add(rightRail);

    // Center Dashed Lane Markers
    const dashGroup = new THREE.Group();
    const dashGeo = new THREE.BoxGeometry(0.35, 0.05, 3.5);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dashes: THREE.Mesh[] = [];

    for (let z = 0; z < roadLength; z += 9) {
      const dash1 = new THREE.Mesh(dashGeo, dashMat);
      dash1.position.set(-roadWidth * 0.17, 0.03, z);
      dashGroup.add(dash1);
      dashes.push(dash1);

      const dash2 = new THREE.Mesh(dashGeo, dashMat);
      dash2.position.set(roadWidth * 0.17, 0.03, z);
      dashGroup.add(dash2);
      dashes.push(dash2);
    }
    scene.add(dashGroup);

    // =========================================================================
    // 4. 3D PLAYER SPORTS CAR
    // =========================================================================
    const carGroup = new THREE.Group();
    scene.add(carGroup);

    // Chassis
    const chassisGeo = new THREE.BoxGeometry(2.4, 0.8, 4.6);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.7;
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Cabin / Windshield
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.75, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.35, -0.2);
    carGroup.add(cabin);

    // Rear Spoiler
    const spoilerGeo = new THREE.BoxGeometry(2.3, 0.15, 0.6);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
    spoiler.position.set(0, 1.4, -2.0);
    carGroup.add(spoiler);

    // Taillights
    const tailLightGeo = new THREE.BoxGeometry(0.5, 0.2, 0.1);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(tailLightGeo, tailLightMat);
    tl1.position.set(-0.8, 0.8, -2.31);
    carGroup.add(tl1);
    const tl2 = new THREE.Mesh(tailLightGeo, tailLightMat);
    tl2.position.set(0.8, 0.8, -2.31);
    carGroup.add(tl2);

    // Nitro Exhaust Flames
    const exhaustGeo = new THREE.ConeGeometry(0.35, 1.6, 8);
    const exhaustMat = new THREE.MeshBasicMaterial({ color: 0xff4516 });
    const exhaustL = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaustL.rotation.x = Math.PI / 2;
    exhaustL.position.set(-0.6, 0.5, -3.1);
    exhaustL.visible = false;
    carGroup.add(exhaustL);

    const exhaustR = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaustR.rotation.x = Math.PI / 2;
    exhaustR.position.set(0.6, 0.5, -3.1);
    exhaustR.visible = false;
    carGroup.add(exhaustR);

    // Underglow Neon Light
    const underglow = new THREE.PointLight(0x11bdf7, 3, 8);
    underglow.position.set(0, 0.2, 0);
    carGroup.add(underglow);

    // =========================================================================
    // 5. 3D TRAFFIC & COLLECTIBLE ITEMS
    // =========================================================================
    const trafficList: Traffic3D[] = [];
    const itemList: Item3D[] = [];

    const createTrafficCar = (color: number) => {
      const g = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(2.3, 0.9, 4.4);
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      g.add(body);

      const topGeo = new THREE.BoxGeometry(1.7, 0.7, 2.0);
      const topMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(0, 1.3, -0.1);
      g.add(top);
      return g;
    };

    // Seed traffic ahead
    const lanes = [-roadWidth * 0.28, 0, roadWidth * 0.28];
    const colors = [0x0ea5e9, 0xec4899, 0x8b5cf6, 0x10b981];

    for (let i = 0; i < 5; i++) {
      const tMesh = createTrafficCar(colors[i % colors.length]);
      const lane = lanes[i % 3];
      const zPos = 30 + i * 35;
      tMesh.position.set(lane, 0, zPos);
      scene.add(tMesh);

      trafficList.push({
        mesh: tMesh,
        lane: i % 3,
        speed: 50 + Math.random() * 30,
      });
    }

    // Seed Coins
    const coinGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 4; i++) {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.rotation.x = Math.PI / 2;
      coin.position.set(lanes[(i + 1) % 3], 1.0, 40 + i * 45);
      scene.add(coin);
      itemList.push({ mesh: coin, type: 'coin' });
    }

    // =========================================================================
    // 6. INPUT HANDLING
    // =========================================================================
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

    // =========================================================================
    // 7. 60 FPS RACING LOOP & 3D CAMERA CHASE
    // =========================================================================
    let animId: number;
    const clock = new THREE.Clock();

    const loop = () => {
      const delta = clock.getDelta();
      const s = stateRef.current;

      if (!s.gameOver) {
        // --- Steering ---
        let steer = 0;
        if (s.keys['a'] || s.keys['arrowleft']) steer -= 1;
        if (s.keys['d'] || s.keys['arrowright']) steer += 1;

        s.carX += steer * 14.0 * delta;
        s.carX = Math.max(-roadWidth * 0.42, Math.min(roadWidth * 0.42, s.carX));
        carGroup.position.x = s.carX;
        carGroup.rotation.y = -steer * 0.14; // Car chassis yaw
        carGroup.rotation.z = steer * 0.08; // Chassis roll

        // --- Nitro & Speed ---
        const wantsNitro = (s.keys[' '] || s.keys['shift']) && s.nitroFuel > 0;
        if (wantsNitro) {
          s.isBoosting = true;
          s.nitroFuel = Math.max(0, s.nitroFuel - 12 * delta);
          s.speed = Math.min(s.nitroSpeed, s.speed + 60 * delta);
          exhaustL.visible = true;
          exhaustR.visible = true;
          if (Math.random() > 0.85) gameAudio.playNitro();
        } else {
          s.isBoosting = false;
          exhaustL.visible = false;
          exhaustR.visible = false;
          if (s.keys['w'] || s.keys['arrowup']) {
            s.speed = Math.min(s.maxSpeed, s.speed + 25 * delta);
          } else if (s.keys['s'] || s.keys['arrowdown']) {
            s.speed = Math.max(60, s.speed - 60 * delta);
          } else {
            if (s.speed > s.maxSpeed) s.speed -= 35 * delta;
            else if (s.speed < 120) s.speed += 10 * delta;
          }
        }

        s.topSpeed = Math.max(s.topSpeed, Math.round(s.speed));
        setSpeed(Math.round(s.speed));
        setNitroFuel(Math.round(s.nitroFuel));
        setIsBoosting(s.isBoosting);

        // Distance & Real Score with Level Multipliers
        const curLvlCfg = DRIFT_LEVELS[s.currentLevel - 1] || DRIFT_LEVELS[0];
        const frameDist = (s.speed * 0.28) * delta;
        s.distance += frameDist;
        s.score += Math.round(frameDist * (s.isBoosting ? 2.5 : 1.2) * curLvlCfg.multiplier);
        setDistance(Math.round(s.distance));
        setScore(s.score);

        // Check Level Advance
        if (s.distance >= curLvlCfg.goalMeters && s.currentLevel < DRIFT_LEVELS.length) {
          s.currentLevel++;
          setCurrentLevel(s.currentLevel);
          const nextCfg = DRIFT_LEVELS[s.currentLevel - 1];
          setLevelUpMsg(`LEVEL ${nextCfg.level}: ${nextCfg.name.toUpperCase()}`);
          gameAudio.playLevelUp();
          setTimeout(() => setLevelUpMsg(null), 2200);
        }

        // Move Road Dashes Backward to simulate high speed
        const dashSpeed = s.speed * 0.8 * delta;
        dashes.forEach((d) => {
          d.position.z -= dashSpeed;
          if (d.position.z < -10) {
            d.position.z += roadLength;
          }
        });

        // Dynamic 3D Chase Camera
        const desiredCamZ = s.isBoosting ? -11.5 : -9.5;
        const desiredCamY = s.isBoosting ? 4.0 : 4.6;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredCamZ, 0.1);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredCamY, 0.1);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, s.carX * 0.45, 0.12);
        camera.lookAt(s.carX * 0.6, 1.2, 18);

        // --- Traffic Logic ---
        for (const t of trafficList) {
          // Relative approach speed
          t.mesh.position.z -= (s.speed - t.speed) * 0.3 * delta;

          // Check Near Miss & Collision with Player
          const distZ = t.mesh.position.z - carGroup.position.z;
          const distX = Math.abs(t.mesh.position.x - carGroup.position.x);

          if (Math.abs(distZ) < 3.8 && distX < 2.0) {
            // 3D CRASH!
            gameAudio.playCrash();
            s.gameOver = true;
            setIsGameOver(true);
            onGameOver(s.score, {
              distance: Math.round(s.distance),
              topSpeed: s.topSpeed,
              nearMisses: s.nearMisses,
            });
            break;
          } else if (distZ < 0 && distZ > -3.0 && distX < 3.4 && distX >= 2.0) {
            // Near Miss Bonus!
            s.nearMisses++;
            s.score += 200;
            s.nitroFuel = Math.min(100, s.nitroFuel + 15);
            setNearMisses(s.nearMisses);
            setScore(s.score);
            gameAudio.playPickup();
          }

          // Respawn traffic ahead
          if (t.mesh.position.z < -15) {
            t.mesh.position.z = 160 + Math.random() * 40;
            t.mesh.position.x = lanes[Math.floor(Math.random() * 3)];
            t.speed = 50 + Math.random() * 40;
          }
        }

        // --- Collectible Items ---
        for (const item of itemList) {
          item.mesh.position.z -= s.speed * 0.3 * delta;
          item.mesh.rotation.z += 3 * delta;

          const distZ = item.mesh.position.z - carGroup.position.z;
          const distX = Math.abs(item.mesh.position.x - carGroup.position.x);

          if (Math.abs(distZ) < 2.5 && distX < 2.0) {
            gameAudio.playPickup();
            s.score += 150;
            s.nitroFuel = Math.min(100, s.nitroFuel + 25);
            setScore(s.score);
            item.mesh.position.z = 180 + Math.random() * 50;
            item.mesh.position.x = lanes[Math.floor(Math.random() * 3)];
          }

          if (item.mesh.position.z < -15) {
            item.mesh.position.z = 180 + Math.random() * 50;
            item.mesh.position.x = lanes[Math.floor(Math.random() * 3)];
          }
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);

      roadGeo.dispose();
      roadMat.dispose();
      railGeo.dispose();
      railMat.dispose();
      dashGeo.dispose();
      dashMat.dispose();
      chassisGeo.dispose();
      chassisMat.dispose();
      cabinGeo.dispose();
      cabinMat.dispose();

      trafficList.forEach((t) => scene.remove(t.mesh));
      itemList.forEach((item) => scene.remove(item.mesh));

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const curLvlCfg = DRIFT_LEVELS[currentLevel - 1] || DRIFT_LEVELS[0];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-ink-950 overflow-hidden">
      {/* 3D Speed HUD */}
      <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono pointer-events-none">
        {/* Speedometer & Level Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xl font-black text-white">{speed}</span>
            <span className="text-[10px] text-slate-400 uppercase">KM/H</span>
          </div>

          <div className="flex items-center gap-1.5 bg-primary-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-primary-400/40 text-primary-300 font-bold text-xs">
            <Trophy className="w-3.5 h-3.5 text-gold-400" />
            <span>LVL {currentLevel}: {curLvlCfg.name.toUpperCase()} ({curLvlCfg.multiplier}x)</span>
          </div>
        </div>

        {/* Real Score & Distance */}
        <div className="flex items-center gap-4 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-xl border border-primary-500/30">
          <div>
            <span className="text-slate-400">SCORE: </span>
            <span className="font-bold text-amber-400 text-sm">{score.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">DISTANCE: </span>
            <span className="font-bold text-white text-sm">{distance}m / {curLvlCfg.goalMeters}m</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">NEAR MISS: </span>
            <span className="font-bold text-emerald-400 text-sm">{nearMisses}</span>
          </div>
        </div>

        {/* Nitro Meter */}
        <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
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

      {/* Level Up Announcement Banner */}
      {levelUpMsg && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="text-center p-6 rounded-3xl bg-gradient-to-b from-primary-950 via-slate-900 to-ink-950 border-2 border-gold-400 shadow-glow-gold">
            <Sparkles className="w-8 h-8 text-gold-400 mx-auto animate-bounce" />
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {levelUpMsg}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Traffic speed increased • Score Multiplier: {curLvlCfg.multiplier}x RP!
            </p>
          </div>
        </div>
      )}

      {/* Three.js Container */}
      <div ref={mountRef} className="w-full h-full cursor-pointer" />

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-up">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-rose-500/20 text-rose-400">
            <Flame className="w-10 h-10" />
          </div>

          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white font-display">
            3D HIGHWAY CRASH!
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            You pushed the sports car past 240 KM/H on Addis Ababa Expressway!
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase">3D Final Score</div>
              <div className="text-xl font-bold font-mono text-amber-400">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Distance</div>
              <div className="text-xl font-bold font-mono text-white">{distance}m</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Ranked Points</div>
              <div className="text-xl font-bold font-mono text-emerald-400">+{Math.max(15, Math.floor(score / 40))} RP</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
