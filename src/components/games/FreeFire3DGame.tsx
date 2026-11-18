import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Flame, Shield, Heart, Zap, Crosshair, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface FreeFire3DProps {
  onGameOver: (score: number, stats: { kills: number; headshots: number; waves: number }) => void;
  isMuted?: boolean;
}

interface Bullet3D {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  speed: number;
  isEnemy: boolean;
  damage: number;
  life: number;
}

interface Enemy3D {
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  shootCooldown: number;
  radius: number;
}

interface Drop3D {
  mesh: THREE.Group;
  type: 'medkit' | 'ammo';
}

export default function FreeFire3DGame({ onGameOver, isMuted = false }: FreeFire3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // HUD States
  const [hp, setHp] = useState(100);
  const [armor, setArmor] = useState(50);
  const [ammo, setAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(90);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isBooyah, setIsBooyah] = useState(false);
  const [stormDist, setStormDist] = useState(150);

  useEffect(() => {
    gameAudio.enabled = !isMuted;
  }, [isMuted]);

  const stateRef = useRef({
    keys: {} as Record<string, boolean>,
    mouseAim: new THREE.Vector2(),
    score: 0,
    kills: 0,
    headshots: 0,
    wave: 1,
    shootTimer: 0,
    gameOver: false,
    booyah: false,
    playerHp: 100,
    playerArmor: 50,
    playerAmmo: 30,
    playerReserve: 90,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Reset local state
    stateRef.current = {
      keys: {},
      mouseAim: new THREE.Vector2(),
      score: 0,
      kills: 0,
      headshots: 0,
      wave: 1,
      shootTimer: 0,
      gameOver: false,
      booyah: false,
      playerHp: 100,
      playerArmor: 50,
      playerAmmo: 30,
      playerReserve: 90,
    };
    setHp(100);
    setArmor(50);
    setAmmo(30);
    setReserveAmmo(90);
    setScore(0);
    setKills(0);
    setWave(1);
    setIsGameOver(false);
    setIsBooyah(false);

    // =========================================================================
    // 1. THREE.JS SCENE SETUP
    // =========================================================================
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060814);
    scene.fog = new THREE.FogExp2(0x060814, 0.007);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 12, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // =========================================================================
    // 2. LIGHTING & ENVIRONMENT
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0x384166, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    scene.add(sunLight);

    // Neon atmospheric accents (Addis battleground glow)
    const neonLight1 = new THREE.PointLight(0xff4516, 3, 50);
    neonLight1.position.set(-20, 5, -20);
    scene.add(neonLight1);

    const neonLight2 = new THREE.PointLight(0x11bdf7, 3, 50);
    neonLight2.position.set(20, 5, 20);
    scene.add(neonLight2);

    // =========================================================================
    // 3. 3D BATTLE ARENA TERRAIN & COVER
    // =========================================================================
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(240, 240, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1526,
      roughness: 0.85,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid wireframe lines on ground
    const gridHelper = new THREE.GridHelper(240, 48, 0xff4516, 0x1e293b);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Obstacles / Military Crates
    const crateGeo = new THREE.BoxGeometry(3, 3, 3);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.3,
    });
    const obstaclePositions = [
      [-15, 1.5, -10],
      [18, 1.5, -15],
      [-22, 1.5, 18],
      [20, 1.5, 15],
      [-5, 1.5, -30],
      [10, 1.5, -35],
      [-30, 1.5, 0],
      [32, 1.5, -5],
    ];

    obstaclePositions.forEach(([x, y, z]) => {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(x, y, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);
    });

    // 3D Safe Zone Energy Dome
    let safeRadius = 75;
    const safeZoneGeo = new THREE.CylinderGeometry(safeRadius, safeRadius, 30, 32, 1, true);
    const safeZoneMat = new THREE.MeshBasicMaterial({
      color: 0x11bdf7,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const safeZoneMesh = new THREE.Mesh(safeZoneGeo, safeZoneMat);
    safeZoneMesh.position.y = 15;
    scene.add(safeZoneMesh);

    // =========================================================================
    // 4. PLAYER CHARACTER: OPERATOR ALOK (Full 3D Model)
    // =========================================================================
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);

    // Body (Tactical Jacket)
    const torsoGeo = new THREE.BoxGeometry(1.4, 2.0, 0.9);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 2.0;
    torso.castShadow = true;
    playerGroup.add(torso);

    // Tactical Vest Plates (Free Fire Orange Accent)
    const vestGeo = new THREE.BoxGeometry(1.5, 1.4, 1.0);
    const vestMat = new THREE.MeshStandardMaterial({ color: 0xff4516, roughness: 0.5, metalness: 0.4 });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.set(0, 2.0, 0);
    vest.castShadow = true;
    playerGroup.add(vest);

    // Head with Shades & Beret
    const headGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a373 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 3.4, 0);
    head.castShadow = true;
    playerGroup.add(head);

    // Beret Hat
    const beretGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.25, 16);
    const beretMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
    const beret = new THREE.Mesh(beretGeo, beretMat);
    beret.position.set(0, 3.9, 0);
    playerGroup.add(beret);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.5, 1.6, 0.5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x27272a });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.4, 0.8, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.4, 0.8, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    // Signature Weapon: EVO MP40 Predatory Cobra (Glowing red & gold rifle)
    const gunGroup = new THREE.Group();
    const gunBodyGeo = new THREE.BoxGeometry(0.25, 0.35, 1.8);
    const gunBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xff4516,
      emissiveIntensity: 0.6,
    });
    const gunMesh = new THREE.Mesh(gunBodyGeo, gunBodyMat);
    gunGroup.add(gunMesh);
    gunGroup.position.set(0.7, 2.0, 0.8);
    playerGroup.add(gunGroup);

    // =========================================================================
    // 5. BULLETS, ENEMIES, & DROPS COLLECTIONS
    // =========================================================================
    const bullets: Bullet3D[] = [];
    const enemies: Enemy3D[] = [];
    const drops: Drop3D[] = [];

    // Create 3D Enemy Mesh
    const createEnemyMesh = () => {
      const group = new THREE.Group();
      // Body
      const bGeo = new THREE.BoxGeometry(1.3, 1.9, 0.8);
      const bMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.y = 1.9;
      bMesh.castShadow = true;
      group.add(bMesh);

      // Head
      const hGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const hMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.4 });
      const hMesh = new THREE.Mesh(hGeo, hMat);
      hMesh.position.y = 3.2;
      group.add(hMesh);

      // Enemy Gun
      const egGeo = new THREE.BoxGeometry(0.2, 0.25, 1.4);
      const egMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
      const egMesh = new THREE.Mesh(egGeo, egMat);
      egMesh.position.set(0.6, 2.0, 0.6);
      group.add(egMesh);

      return group;
    };

    // Spawn Waves of 3D Enemies
    const spawnWave = (waveNum: number) => {
      const count = 4 + waveNum * 2;
      for (let i = 0; i < count; i++) {
        const mesh = createEnemyMesh();
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 35;
        mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        scene.add(mesh);

        enemies.push({
          mesh,
          hp: 50 + waveNum * 20,
          maxHp: 50 + waveNum * 20,
          speed: 0.08 + waveNum * 0.02,
          shootCooldown: Math.floor(40 + Math.random() * 60),
          radius: 1.2,
        });
      }
    };

    spawnWave(1);

    // =========================================================================
    // 6. INPUT HANDLING & EVENT LISTENERS
    // =========================================================================
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === 'r') {
        reloadWeapon();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      stateRef.current.mouseAim.set(x, y);
    };

    const onPointerDown = () => {
      firePlayerBullet();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const reloadWeapon = () => {
      const s = stateRef.current;
      if (s.playerAmmo < 30 && s.playerReserve > 0) {
        const needed = 30 - s.playerAmmo;
        const take = Math.min(needed, s.playerReserve);
        s.playerAmmo += take;
        s.playerReserve -= take;
        setAmmo(s.playerAmmo);
        setReserveAmmo(s.playerReserve);
        gameAudio.playPickup();
      }
    };

    const firePlayerBullet = () => {
      const s = stateRef.current;
      if (s.gameOver || s.booyah) return;

      if (s.playerAmmo > 0) {
        s.playerAmmo--;
        setAmmo(s.playerAmmo);
        gameAudio.playGunshot();

        // Spawn 3D glowing plasma bullet
        const bGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const bMat = new THREE.MeshBasicMaterial({ color: 0xff4516 });
        const bMesh = new THREE.Mesh(bGeo, bMat);

        const spawnPos = new THREE.Vector3();
        gunGroup.getWorldPosition(spawnPos);
        bMesh.position.copy(spawnPos);
        scene.add(bMesh);

        // Calculate 3D forward direction from player rotation
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);

        bullets.push({
          mesh: bMesh,
          direction: forward,
          speed: 1.8,
          isEnemy: false,
          damage: 35,
          life: 45,
        });
      } else {
        reloadWeapon();
      }
    };

    // =========================================================================
    // 7. 60 FPS ANIMATION & GAME PHYSICS LOOP
    // =========================================================================
    let animId: number;
    const clock = new THREE.Clock();

    const loop = () => {
      const delta = clock.getDelta();
      const s = stateRef.current;

      if (!s.gameOver && !s.booyah) {
        // --- Move Player ---
        const moveSpeed = 9.0 * delta;
        const moveDir = new THREE.Vector3();

        if (s.keys['w'] || s.keys['arrowup']) moveDir.z += 1;
        if (s.keys['s'] || s.keys['arrowdown']) moveDir.z -= 1;
        if (s.keys['a'] || s.keys['arrowleft']) moveDir.x += 1;
        if (s.keys['d'] || s.keys['arrowright']) moveDir.x -= 1;

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          playerGroup.position.x += moveDir.x * moveSpeed;
          playerGroup.position.z += moveDir.z * moveSpeed;

          // Leg running animation
          const t = clock.getElapsedTime() * 12;
          leftLeg.rotation.x = Math.sin(t) * 0.6;
          rightLeg.rotation.x = -Math.sin(t) * 0.6;
        } else {
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
        }

        // Aim player at mouse pointer in 3D world space
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(s.mouseAim, camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2);
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, targetPoint);

        if (targetPoint) {
          const angle = Math.atan2(targetPoint.x - playerGroup.position.x, targetPoint.z - playerGroup.position.z);
          playerGroup.rotation.y = angle;
        }

        // Camera Follows Player smoothly
        const desiredCamPos = new THREE.Vector3(
          playerGroup.position.x,
          playerGroup.position.y + 11,
          playerGroup.position.z - 13
        );
        camera.position.lerp(desiredCamPos, 0.08);
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 2, playerGroup.position.z);

        // Safe Zone Shrink
        if (safeRadius > 25) {
          safeRadius -= 1.2 * delta;
          safeZoneMesh.scale.set(safeRadius / 75, 1, safeRadius / 75);
          setStormDist(Math.round(safeRadius));
        }

        // Storm damage outside safe circle
        const distFromCenter = Math.hypot(playerGroup.position.x, playerGroup.position.z);
        if (distFromCenter > safeRadius) {
          s.playerHp -= 6 * delta;
          setHp(Math.max(0, Math.round(s.playerHp)));
          if (s.playerHp <= 0) {
            triggerEnd(false);
          }
        }

        // --- Update Bullets ---
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.mesh.position.addScaledVector(b.direction, b.speed);
          b.life--;

          if (b.life <= 0) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
            continue;
          }

          // Bullet vs Enemy Collision
          if (!b.isEnemy) {
            for (let j = enemies.length - 1; j >= 0; j--) {
              const enemy = enemies[j];
              const dist = b.mesh.position.distanceTo(enemy.mesh.position);
              if (dist < 1.8) {
                enemy.hp -= b.damage;
                gameAudio.playHit();

                s.score += 180;
                setScore(s.score);

                scene.remove(b.mesh);
                bullets.splice(i, 1);

                if (enemy.hp <= 0) {
                  s.kills++;
                  s.score += 350;
                  setKills(s.kills);
                  setScore(s.score);

                  scene.remove(enemy.mesh);
                  enemies.splice(j, 1);

                  // Check wave progression
                  if (enemies.length === 0) {
                    if (s.wave >= 4) {
                      triggerEnd(true); // BOOYAH
                    } else {
                      s.wave++;
                      s.score += 600;
                      setWave(s.wave);
                      setScore(s.score);
                      gameAudio.playPickup();
                      spawnWave(s.wave);
                    }
                  }
                }
                break;
              }
            }
          } else {
            // Enemy Bullet vs Player
            const dist = b.mesh.position.distanceTo(playerGroup.position);
            if (dist < 1.6) {
              gameAudio.playHit();
              if (s.playerArmor > 0) {
                s.playerArmor -= 15;
                s.playerHp -= 5;
              } else {
                s.playerHp -= 20;
              }
              setArmor(Math.max(0, Math.round(s.playerArmor)));
              setHp(Math.max(0, Math.round(s.playerHp)));

              scene.remove(b.mesh);
              bullets.splice(i, 1);

              if (s.playerHp <= 0) {
                triggerEnd(false);
              }
            }
          }
        }

        // --- Update Enemies AI ---
        for (const enemy of enemies) {
          const toPlayer = new THREE.Vector3().subVectors(playerGroup.position, enemy.mesh.position);
          const dist = toPlayer.length();

          // Move towards player
          if (dist > 8) {
            toPlayer.normalize();
            enemy.mesh.position.x += toPlayer.x * enemy.speed;
            enemy.mesh.position.z += toPlayer.z * enemy.speed;
          }

          // Orient enemy towards player
          const angle = Math.atan2(toPlayer.x, toPlayer.z);
          enemy.mesh.rotation.y = angle;

          // Shoot at player
          enemy.shootCooldown--;
          if (enemy.shootCooldown <= 0 && dist < 45) {
            enemy.shootCooldown = Math.floor(45 + Math.random() * 55);

            const ebGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const ebMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const ebMesh = new THREE.Mesh(ebGeo, ebMat);
            ebMesh.position.set(enemy.mesh.position.x, 2.0, enemy.mesh.position.z);
            scene.add(ebMesh);

            toPlayer.normalize();
            bullets.push({
              mesh: ebMesh,
              direction: toPlayer,
              speed: 1.0,
              isEnemy: true,
              damage: 18,
              life: 50,
            });
          }
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    const triggerEnd = (won: boolean) => {
      const s = stateRef.current;
      if (won) {
        s.booyah = true;
        s.score += 1500; // Booyah bonus!
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

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      // Dispose Three.js objects
      groundGeo.dispose();
      groundMat.dispose();
      crateGeo.dispose();
      crateMat.dispose();
      safeZoneGeo.dispose();
      safeZoneMat.dispose();
      torsoGeo.dispose();
      torsoMat.dispose();
      vestGeo.dispose();
      vestMat.dispose();
      headGeo.dispose();
      headMat.dispose();
      legGeo.dispose();
      legMat.dispose();
      gunBodyGeo.dispose();
      gunBodyMat.dispose();

      bullets.forEach((b) => {
        scene.remove(b.mesh);
        b.mesh.geometry.dispose();
      });
      enemies.forEach((e) => {
        scene.remove(e.mesh);
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-ink-950 overflow-hidden">
      {/* 3D Combat HUD */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between text-xs font-mono pointer-events-none">
        {/* Health & Armor */}
        <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-current" />
            <span className="font-bold text-white">{hp}</span>
            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 transition-all" style={{ width: `${hp}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">{armor}</span>
          </div>
        </div>

        {/* Real Score & Kills */}
        <div className="flex items-center gap-4 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-xl border border-primary-500/30">
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
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400">SAFE ZONE: </span>
            <span className="font-bold text-cyan-400 text-sm">{stormDist}m</span>
          </div>
        </div>

        {/* EVO Weapon Ammo */}
        <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white text-sm">{ammo}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400 text-xs">{reserveAmmo}</span>
        </div>
      </div>

      {/* Crosshair Center Reticle */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none z-10 opacity-70">
        <Crosshair className="w-6 h-6 text-primary-400" />
      </div>

      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

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
            {isBooyah ? 'You survived all battle royale squads in full 3D!' : 'Better luck next drop in Bermuda 3D!'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-sm p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase">3D Match Score</div>
              <div className="text-xl font-bold font-mono text-amber-400">{score.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Eliminations</div>
              <div className="text-xl font-bold font-mono text-rose-400">{kills}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase">Ranked Points (RP)</div>
              <div className="text-xl font-bold font-mono text-emerald-400">+{Math.max(15, Math.floor(score / 35))} RP</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
