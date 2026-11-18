import { useEffect, useRef } from 'react';

/**
 * Cinematic 3D character arrival animation — Free Fire style.
 * A soldier materializes from swirling particles, with:
 * - Filled 3D body parts (helmet, visor, vest, arms, legs, weapon)
 * - Materialization sequence (particles converge → solidify)
 * - Energy beam from sky, ground impact, shockwaves
 * - Smoke/dust clouds, sparks, floating embers
 * - Screen shake on impact
 * - Slow rotation with depth-sorted filled polygons
 * - Aura glow, pulsing visor light, holographic grid floor
 * - Re-loops every ~10s
 */

interface Vec3 { x: number; y: number; z: number }
interface Particle3D {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number };
}
interface SmokeCloud {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
}
interface Shockwave {
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  thickness: number;
  color: { r: number; g: number; b: number };
}
interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}
interface FloatingEmber {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  flicker: number;
}

type RGB = { r: number; g: number; b: number };

// 3D triangle (face) with normal for shading
interface Face {
  pts: [number, number, number];
  color: RGB;
  emissive: number; // 0-1, how much it glows regardless of lighting
}

export default function Character3D({ accent = '#11bdf7' }: { accent?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduce = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const accentRgb = hexToRgb(accent);
    const accent2: RGB = { r: 0, g: 255, b: 200 };
    const gold: RGB = { r: 255, g: 195, b: 60 };
    const white: RGB = { r: 220, g: 235, b: 255 };
    const darkMetal: RGB = { r: 35, g: 45, b: 65 };
    const midMetal: RGB = { r: 55, g: 70, b: 95 };
    const lightMetal: RGB = { r: 80, g: 100, b: 135 };

    // === Build 3D character ===
    // Model space: origin at center, feet at y~+45, head at y~-75
    const verts: Vec3[] = [];
    const v = (x: number, y: number, z: number): number => {
      verts.push({ x, y, z });
      return verts.length - 1;
    };

    // --- HELMET (dome shape) ---
    const helmetTop = v(0, -80, 0);
    const helmetRim: number[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      helmetRim.push(v(Math.cos(a) * 15, -68, Math.sin(a) * 15));
    }
    const helmetFaces: Face[] = [];
    for (let i = 0; i < 12; i++) {
      helmetFaces.push({
        pts: [helmetTop, helmetRim[i], helmetRim[(i + 1) % 12]],
        color: darkMetal,
        emissive: 0.1,
      });
    }
    // Rim ring faces (connect to inner)
    const helmetInner: number[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      helmetInner.push(v(Math.cos(a) * 14, -66, Math.sin(a) * 14));
    }
    for (let i = 0; i < 12; i++) {
      helmetFaces.push({
        pts: [helmetRim[i], helmetRim[(i + 1) % 12], helmetInner[(i + 1) % 12]],
        color: midMetal,
        emissive: 0.05,
      });
      helmetFaces.push({
        pts: [helmetRim[i], helmetInner[(i + 1) % 12], helmetInner[i]],
        color: midMetal,
        emissive: 0.05,
      });
    }

    // --- VISOR (glowing visor strip across front) ---
    const visorTL = v(-12, -72, 8);
    const visorTR = v(12, -72, 8);
    const visorBR = v(11, -66, 10);
    const visorBL = v(-11, -66, 10);
    const visorFaces: Face[] = [
      { pts: [visorTL, visorTR, visorBR], color: accentRgb, emissive: 0.9 },
      { pts: [visorTL, visorBR, visorBL], color: accentRgb, emissive: 0.9 },
    ];

    // --- NECK ---
    const neckTL = v(-6, -64, 4);
    const neckTR = v(6, -64, 4);
    const neckBR = v(7, -56, 4);
    const neckBL = v(-7, -56, 4);
    const neckTB = v(0, -64, -4);
    const neckBB = v(0, -56, -4);
    const neckFaces: Face[] = [
      { pts: [neckTL, neckTR, neckBR], color: darkMetal, emissive: 0.08 },
      { pts: [neckTL, neckBR, neckBL], color: darkMetal, emissive: 0.08 },
      { pts: [neckTL, neckBL, neckBB], color: darkMetal, emissive: 0.06 },
      { pts: [neckTL, neckBB, neckTB], color: darkMetal, emissive: 0.06 },
      { pts: [neckTR, neckTB, neckBB], color: darkMetal, emissive: 0.06 },
      { pts: [neckTR, neckBB, neckBR], color: darkMetal, emissive: 0.06 },
    ];

    // --- TORSO / VEST (box with bevels) ---
    const tFL = v(-16, -54, 10);
    const tFR = v(16, -54, 10);
    const tFT = v(0, -54, 12);
    const tBL = v(-14, -54, -8);
    const tBR = v(14, -54, -8);
    const wFL = v(-14, -12, 10);
    const wFR = v(14, -12, 10);
    const wBL = v(-13, -12, -8);
    const wBR = v(13, -12, -8);
    const torsoFaces: Face[] = [
      // Front (upper chest)
      { pts: [tFL, tFR, tFT], color: midMetal, emissive: 0.12 },
      // Front sides
      { pts: [tFL, tFT, wFL], color: midMetal, emissive: 0.1 },
      { pts: [tFR, wFR, tFT], color: midMetal, emissive: 0.1 },
      // Left side
      { pts: [tFL, wFL, wBL], color: darkMetal, emissive: 0.06 },
      { pts: [tFL, wBL, tBL], color: darkMetal, emissive: 0.06 },
      // Right side
      { pts: [tFR, tBR, wBR], color: darkMetal, emissive: 0.06 },
      { pts: [tFR, wBR, wFR], color: darkMetal, emissive: 0.06 },
      // Back
      { pts: [tBL, wBL, wBR], color: darkMetal, emissive: 0.04 },
      { pts: [tBL, wBR, tBR], color: darkMetal, emissive: 0.04 },
      // Bottom
      { pts: [wFL, wFR, wBR], color: darkMetal, emissive: 0.05 },
      { pts: [wFL, wBR, wBL], color: darkMetal, emissive: 0.05 },
    ];

    // --- CHEST RIG (glowing accent plates on vest front) ---
    const rigTL = v(-8, -40, 11);
    const rigTR = v(8, -40, 11);
    const rigBR = v(8, -20, 11);
    const rigBL = v(-8, -20, 11);
    const rigFaces: Face[] = [
      { pts: [rigTL, rigTR, rigBR], color: accentRgb, emissive: 0.7 },
      { pts: [rigTL, rigBR, rigBL], color: accentRgb, emissive: 0.7 },
    ];
    // Center glow strip
    const cStripT = v(-1.5, -38, 11.5);
    const cStripB = v(-1.5, -22, 11.5);
    const cStripTR = v(1.5, -38, 11.5);
    const cStripBR = v(1.5, -22, 11.5);
    rigFaces.push(
      { pts: [cStripT, cStripTR, cStripBR], color: white, emissive: 1 },
      { pts: [cStripT, cStripBR, cStripB], color: white, emissive: 1 },
    );

    // --- SHOULDERS (rounded pads) ---
    const shL: number[] = [];
    const shR: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      shL.push(v(-22 + Math.cos(a) * 6, -52, Math.sin(a) * 6));
      shR.push(v(22 + Math.cos(a) * 6, -52, Math.sin(a) * 6));
    }
    const shoulderFaces: Face[] = [];
    for (let i = 0; i < 6; i++) {
      shoulderFaces.push({
        pts: [shL[i], shL[(i + 1) % 6], v(-22, -46, 0)],
        color: lightMetal,
        emissive: 0.08,
      });
      shoulderFaces.push({
        pts: [shR[i], shR[(i + 1) % 6], v(22, -46, 0)],
        color: lightMetal,
        emissive: 0.08,
      });
    }

    // --- ARMS (tapered cylinders) ---
    function makeArm(side: number): Face[] {
      const sx = side * 22;
      const top: number[] = [];
      const mid: number[] = [];
      const bot: number[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        top.push(v(sx + Math.cos(a) * 5, -46, Math.sin(a) * 5));
        mid.push(v(sx + Math.cos(a) * 4, -30, Math.sin(a) * 4 + side * 2));
        bot.push(v(sx + Math.cos(a) * 3.5, -14, Math.sin(a) * 3.5 + side * 6));
      }
      const faces: Face[] = [];
      for (let i = 0; i < 6; i++) {
        const ni = (i + 1) % 6;
        faces.push({ pts: [top[i], top[ni], mid[ni]], color: midMetal, emissive: 0.07 });
        faces.push({ pts: [top[i], mid[ni], mid[i]], color: midMetal, emissive: 0.07 });
        faces.push({ pts: [mid[i], mid[ni], bot[ni]], color: darkMetal, emissive: 0.05 });
        faces.push({ pts: [mid[i], bot[ni], bot[i]], color: darkMetal, emissive: 0.05 });
      }
      return faces;
    }
    const armFaces = [...makeArm(-1), ...makeArm(1)];

    // --- WEAPON (rifle) ---
    const gunStockL = v(-22, -20, 14);
    const gunStockR = v(-14, -20, 14);
    const gunStockLB = v(-22, -16, 12);
    const gunStockRB = v(-14, -16, 12);
    const gunBodyL = v(-12, -22, 16);
    const gunBodyR = v(6, -22, 16);
    const gunBodyLB = v(-12, -18, 14);
    const gunBodyRB = v(6, -18, 14);
    const gunBarrelL = v(8, -22, 16);
    const gunBarrelR = v(22, -22, 16);
    const gunBarrelLB = v(8, -20, 15);
    const gunBarrelRB = v(22, -20, 15);
    const gunFaces: Face[] = [
      // Stock
      { pts: [gunStockL, gunStockR, gunStockRB], color: darkMetal, emissive: 0.05 },
      { pts: [gunStockL, gunStockRB, gunStockLB], color: darkMetal, emissive: 0.05 },
      // Body
      { pts: [gunBodyL, gunBodyR, gunBodyRB], color: midMetal, emissive: 0.08 },
      { pts: [gunBodyL, gunBodyRB, gunBodyLB], color: midMetal, emissive: 0.08 },
      // Barrel
      { pts: [gunBarrelL, gunBarrelR, gunBarrelRB], color: lightMetal, emissive: 0.1 },
      { pts: [gunBarrelL, gunBarrelRB, gunBarrelLB], color: lightMetal, emissive: 0.1 },
      // Connect stock to body
      { pts: [gunStockR, gunBodyL, gunBodyLB], color: darkMetal, emissive: 0.05 },
      { pts: [gunStockR, gunBodyLB, gunStockRB], color: darkMetal, emissive: 0.05 },
      // Connect body to barrel
      { pts: [gunBodyR, gunBarrelL, gunBarrelLB], color: midMetal, emissive: 0.07 },
      { pts: [gunBodyR, gunBarrelLB, gunBodyRB], color: midMetal, emissive: 0.07 },
    ];
    // Glowing sight on top
    const sightF = v(2, -25, 16);
    const sightB = v(-2, -25, 16);
    const sightT = v(0, -28, 16);
    gunFaces.push(
      { pts: [sightF, sightB, sightT], color: gold, emissive: 0.8 },
    );

    // --- LEGS (tapered) ---
    function makeLeg(side: number): Face[] {
      const sx = side * 8;
      const hip: number[] = [];
      const knee: number[] = [];
      const foot: number[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        hip.push(v(sx + Math.cos(a) * 6, -10, Math.sin(a) * 6));
        knee.push(v(sx + Math.cos(a) * 5, 14, Math.sin(a) * 5));
        foot.push(v(sx + Math.cos(a) * 4, 38, Math.sin(a) * 4 + 3));
      }
      const faces: Face[] = [];
      for (let i = 0; i < 6; i++) {
        const ni = (i + 1) % 6;
        faces.push({ pts: [hip[i], hip[ni], knee[ni]], color: midMetal, emissive: 0.07 });
        faces.push({ pts: [hip[i], knee[ni], knee[i]], color: midMetal, emissive: 0.07 });
        faces.push({ pts: [knee[i], knee[ni], foot[ni]], color: darkMetal, emissive: 0.05 });
        faces.push({ pts: [knee[i], foot[ni], foot[i]], color: darkMetal, emissive: 0.05 });
      }
      // Boot sole (glow strip)
      const soleL = v(sx - 4, 42, 0);
      const soleR = v(sx + 4, 42, 0);
      const soleLB = v(sx - 4, 42, 10);
      const soleRB = v(sx + 4, 42, 10);
      faces.push(
        { pts: [soleL, soleR, soleRB], color: accentRgb, emissive: 0.6 },
        { pts: [soleL, soleRB, soleLB], color: accentRgb, emissive: 0.6 },
      );
      return faces;
    }
    const legFaces = [...makeLeg(-1), ...makeLeg(1)];

    const allFaces: Face[] = [
      ...helmetFaces, ...visorFaces, ...neckFaces, ...torsoFaces,
      ...rigFaces, ...shoulderFaces, ...armFaces, ...gunFaces, ...legFaces,
    ];

    // === Projection ===
    const project = (p: Vec3, rotY: number, rotX: number, yOffset: number, camZ: number, scale: number) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      // Rotate around Y
      const rx = p.x * cosY - p.z * sinY;
      const rz1 = p.x * sinY + p.z * cosY;
      // Rotate around X (slight tilt)
      const ry = (p.y + yOffset) * cosX - rz1 * sinX;
      const rz = (p.y + yOffset) * sinX + rz1 * cosX;
      const f = camZ / (camZ + rz);
      return {
        sx: w / 2 + rx * f * scale,
        sy: h / 2 + ry * f * scale,
        depth: rz,
        f,
      };
    };

    // === Compute face normal (for lighting) ===
    const computeNormal = (p0: Vec3, p1: Vec3, p2: Vec3): Vec3 => {
      const ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
      const vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
      return {
        x: uy * vz - uz * vy,
        y: uz * vx - ux * vz,
        z: ux * vy - uy * vx,
      };
    };

    const normalize = (n: Vec3): Vec3 => {
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1;
      return { x: n.x / len, y: n.y / len, z: n.z / len };
    };

    // Light direction (from upper-left-front)
    const lightDir = normalize({ x: -0.5, y: -0.6, z: 0.6 });

    // === Materialization particles (converge to form character) ===
    const matParticles: Particle3D[] = [];
    const initMatParticles = () => {
      matParticles.length = 0;
      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 120;
        const height = (Math.random() - 0.5) * 200;
        matParticles.push({
          pos: {
            x: Math.cos(angle) * dist,
            y: height,
            z: Math.sin(angle) * dist * 0.5,
          },
          vel: { x: 0, y: 0, z: 0 },
          life: 0,
          maxLife: 0.8 + Math.random() * 0.4,
          size: 1.5 + Math.random() * 2,
          color: Math.random() < 0.7 ? accentRgb : accent2,
        });
      }
    };

    // === Smoke clouds ===
    const smokeClouds: SmokeCloud[] = [];

    // === Shockwaves ===
    const shockwaves: Shockwave[] = [];

    // === Sparks ===
    const sparks: Spark[] = [];

    // === Floating embers ===
    const embers: FloatingEmber[] = [];
    for (let i = 0; i < 30; i++) {
      embers.push({
        x: (Math.random() - 0.5) * 180,
        y: (Math.random() - 0.5) * 250,
        z: (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.3 - Math.random() * 0.4,
        size: 1 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.3,
        flicker: Math.random() * Math.PI * 2,
      });
    }

    // === State ===
    let rotY = 0;
    let time = 0;
    let phase: 'converge' | 'beam' | 'impact' | 'idle' = 'converge';
    let phaseTime = 0;
    let arrivalY = -200;
    let arrivalAlpha = 0;
    let screenShake = 0;
    let auraPulse = 0;
    let beamAlpha = 0;
    let materializeAmount = 0; // 0 = invisible, 1 = fully solid

    const camZ = 200;
    const baseScale = () => Math.min(w, h) / 280;

    const triggerImpact = () => {
      // Smoke
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
        const speed = 1 + Math.random() * 2;
        smokeClouds.push({
          x: Math.cos(angle) * 15,
          y: 40,
          z: Math.sin(angle) * 10,
          vx: Math.cos(angle) * speed,
          vy: -0.3 - Math.random() * 0.5,
          size: 5,
          maxSize: 25 + Math.random() * 20,
          life: 0,
          maxLife: 1.5 + Math.random() * 0.8,
        });
      }
      // Shockwaves
      shockwaves.push({ radius: 5, maxRadius: 160, life: 0, maxLife: 1.3, thickness: 4, color: accentRgb });
      shockwaves.push({ radius: 5, maxRadius: 110, life: 0.1, maxLife: 1.0, thickness: 2.5, color: accent2 });
      shockwaves.push({ radius: 5, maxRadius: 70, life: 0.2, maxLife: 0.7, thickness: 1.5, color: gold });
      // Sparks
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        sparks.push({
          x: 0, y: 38, z: 0,
          vx: Math.cos(angle) * speed,
          vy: -Math.random() * 5 - 1,
          vz: Math.sin(angle) * speed * 0.5,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.5,
        });
      }
      screenShake = 12;
    };

    const animate = () => {
      if (!ctx) return;
      const dt = Math.min(1 / 30, 1 / 60);
      time += dt;
      phaseTime += dt;

      const scale = baseScale();

      // === Phase management ===
      if (phase === 'converge') {
        // Particles converge toward character
        const t = phaseTime / 1.5;
        materializeAmount = Math.min(1, t * 1.2);
        arrivalAlpha = Math.min(1, t);
        arrivalY = -200 * (1 - Math.min(1, t * 1.3));
        beamAlpha = Math.min(1, phaseTime / 0.5);
        // Update convergence particles
        for (const p of matParticles) {
          p.life += dt;
          const target = { x: 0, y: 0, z: 0 };
          const dir = {
            x: target.x - p.pos.x,
            y: target.y - p.pos.y,
            z: target.z - p.pos.z,
          };
          const dist = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2) || 1;
          const speed = 3 + p.life * 4;
          p.pos.x += (dir.x / dist) * speed;
          p.pos.y += (dir.y / dist) * speed;
          p.pos.z += (dir.z / dist) * speed;
        }
        if (phaseTime > 1.5) {
          phase = 'impact';
          phaseTime = 0;
          triggerImpact();
          arrivalY = 0;
          materializeAmount = 1;
        }
      } else if (phase === 'impact') {
        beamAlpha = Math.max(0, beamAlpha - dt * 2);
        if (phaseTime > 0.5) {
          phase = 'idle';
          phaseTime = 0;
        }
      } else if (phase === 'idle') {
        if (phaseTime > 8) {
          // Reset
          phase = 'converge';
          phaseTime = 0;
          time = 0;
          arrivalY = -200;
          arrivalAlpha = 0;
          beamAlpha = 0;
          materializeAmount = 0;
          smokeClouds.length = 0;
          shockwaves.length = 0;
          sparks.length = 0;
          initMatParticles();
        }
      }

      // Continuous rotation
      rotY += dt * 0.5;
      auraPulse = Math.sin(time * 2.5) * 0.5 + 0.5;
      screenShake *= 0.88;

      // === Clear with slight fade for motion blur ===
      ctx.fillStyle = 'rgba(3, 6, 18, 0.18)';
      ctx.fillRect(0, 0, w, h);

      // Screen shake offset
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // === Holographic grid floor ===
      drawGridFloor(ctx, w, h, scale, accentRgb, time);

      // === Energy beam from sky ===
      if (beamAlpha > 0.01) {
        const cx = w / 2;
        const beamW = 30 * scale * (0.5 + beamAlpha * 0.5);
        const beamGrad = ctx.createLinearGradient(cx - beamW, 0, cx + beamW, 0);
        beamGrad.addColorStop(0, 'rgba(0,0,0,0)');
        beamGrad.addColorStop(0.3, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.15 * beamAlpha})`);
        beamGrad.addColorStop(0.5, `rgba(${white.r},${white.g},${white.b},${0.4 * beamAlpha})`);
        beamGrad.addColorStop(0.7, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.15 * beamAlpha})`);
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(cx - beamW, 0, beamW * 2, h / 2 + 20 * scale);

        // Inner bright beam
        const innerW = 4 * scale * beamAlpha;
        const innerGrad = ctx.createLinearGradient(cx - innerW, 0, cx + innerW, 0);
        innerGrad.addColorStop(0, 'rgba(0,0,0,0)');
        innerGrad.addColorStop(0.5, `rgba(${white.r},${white.g},${white.b},${beamAlpha})`);
        innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = innerGrad;
        ctx.fillRect(cx - innerW, 0, innerW * 2, h / 2 + 20 * scale);
      }

      // === Convergence particles ===
      if (phase === 'converge') {
        for (const p of matParticles) {
          const proj = project(p.pos, rotY * 0.5, 0.15, 0, camZ, scale);
          const alpha = Math.min(1, (1 - p.life / p.maxLife)) * 0.8;
          const col = p.color;
          ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, p.size * proj.f, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, p.size * proj.f * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === Aura glow behind character ===
      if (arrivalAlpha > 0.1) {
        const cx = w / 2;
        const cy = h / 2 + arrivalY * scale - 10 * scale;
        const auraR = (70 + auraPulse * 20) * scale;
        const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
        auraGrad.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.2 * auraPulse * arrivalAlpha})`);
        auraGrad.addColorStop(0.4, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.08 * auraPulse * arrivalAlpha})`);
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

        // Secondary gold aura
        const goldGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR * 0.6);
        goldGrad.addColorStop(0, `rgba(${gold.r},${gold.g},${gold.b},${0.06 * auraPulse * arrivalAlpha})`);
        goldGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // === Draw 3D character (filled faces) ===
      if (arrivalAlpha > 0.05) {
        const rotX = 0.12; // slight downward tilt

        // Project all vertices
        const projected = verts.map((p) =>
          project(p, rotY, rotX, arrivalY, camZ, scale)
        );

        // Compute face data with depth and lighting
        const faceData = allFaces.map((face) => {
          const p0 = verts[face.pts[0]];
          const p1 = verts[face.pts[1]];
          const p2 = verts[face.pts[2]];

          // Rotate normal to match view
          const cosY = Math.cos(rotY);
          const sinY = Math.sin(rotY);
          const cosX = Math.cos(rotX);
          const sinX = Math.sin(rotX);
          const rawNormal = computeNormal(p0, p1, p2);
          // Rotate normal around Y
          let nx = rawNormal.x * cosY - rawNormal.z * sinY;
          let nz = rawNormal.x * sinY + rawNormal.z * cosY;
          let ny = rawNormal.y;
          // Rotate around X
          const ny2 = ny * cosX - nz * sinX;
          nz = ny * sinX + nz * cosX;
          ny = ny2;
          const norm = normalize({ x: nx, y: ny, z: nz });

          // Lighting: dot product with light dir
          const lightDot = Math.max(0, -(norm.x * lightDir.x + norm.y * lightDir.y + norm.z * lightDir.z));
          const avgDepth = (projected[face.pts[0]].depth + projected[face.pts[1]].depth + projected[face.pts[2]].depth) / 3;
          const isBackface = nz < 0;

          return { face, lightDot, avgDepth, isBackface, proj: [projected[face.pts[0]], projected[face.pts[1]], projected[face.pts[2]]] };
        });

        // Sort by depth (far first)
        faceData.sort((a, b) => b.avgDepth - a.avgDepth);

        // Draw faces
        for (const fd of faceData) {
          if (fd.isBackface && fd.face.emissive < 0.5) continue; // Skip backfaces for non-emissive

          const lit = fd.face.emissive > 0.5
            ? fd.face.color
            : blendColor(fd.face.color, black, 1 - fd.lightDot * 0.7 - fd.face.emissive * 0.5);

          const alpha = arrivalAlpha * materializeAmount;

          ctx.fillStyle = `rgba(${lit.r},${lit.g},${lit.b},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(fd.proj[0].sx, fd.proj[0].sy);
          ctx.lineTo(fd.proj[1].sx, fd.proj[1].sy);
          ctx.lineTo(fd.proj[2].sx, fd.proj[2].sy);
          ctx.closePath();
          ctx.fill();

          // Edge highlight for emissive faces
          if (fd.face.emissive > 0.5) {
            ctx.strokeStyle = `rgba(${white.r},${white.g},${white.b},${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Glowing visor light (additive glow on top)
        if (materializeAmount > 0.5) {
          const vp = project({ x: 0, y: -69, z: 10 }, rotY, rotX, arrivalY, camZ, scale);
          const visorGlow = ctx.createRadialGradient(vp.sx, vp.sy, 0, vp.sx, vp.sy, 25 * scale);
          visorGlow.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.5 * auraPulse})`);
          visorGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = visorGlow;
          ctx.beginPath();
          ctx.arc(vp.sx, vp.sy, 25 * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Chest rig glow
        if (materializeAmount > 0.5) {
          const cp = project({ x: 0, y: -30, z: 12 }, rotY, rotX, arrivalY, camZ, scale);
          const rigGlow = ctx.createRadialGradient(cp.sx, cp.sy, 0, cp.sx, cp.sy, 18 * scale);
          rigGlow.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.3 * auraPulse})`);
          rigGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rigGlow;
          ctx.beginPath();
          ctx.arc(cp.sx, cp.sy, 18 * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Boot glow
        if (materializeAmount > 0.5) {
          for (const sx of [-8, 8]) {
            const bp = project({ x: sx, y: 42, z: 5 }, rotY, rotX, arrivalY, camZ, scale);
            const bGrad = ctx.createRadialGradient(bp.sx, bp.sy, 0, bp.sx, bp.sy, 12 * scale);
            bGrad.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.25 * auraPulse})`);
            bGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.arc(bp.sx, bp.sy, 12 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // === Shockwaves ===
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life += dt;
        const t = sw.life / sw.maxLife;
        if (t >= 1) {
          shockwaves.splice(i, 1);
          continue;
        }
        sw.radius = 5 + (sw.maxRadius - 5) * easeOut(t);
        const alpha = (1 - t) * 0.7;
        const cx = w / 2;
        const cy = h / 2 + 35 * scale;
        const col = sw.color;

        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
        ctx.lineWidth = sw.thickness * (1 - t * 0.5);
        ctx.beginPath();
        ctx.ellipse(cx, cy, sw.radius * scale, sw.radius * scale * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Glow ring
        ctx.strokeStyle = `rgba(${white.r},${white.g},${white.b},${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, sw.radius * 0.9 * scale, sw.radius * 0.9 * scale * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // === Smoke clouds ===
      for (let i = smokeClouds.length - 1; i >= 0; i--) {
        const s = smokeClouds[i];
        s.life += dt;
        const t = s.life / s.maxLife;
        if (t >= 1) {
          smokeClouds.splice(i, 1);
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.02;
        s.size = 5 + (s.maxSize - 5) * easeOut(t);
        const alpha = (1 - t) * 0.25;
        const proj = project({ x: s.x, y: s.y, z: s.z }, rotY * 0.2, 0.1, 0, camZ, scale);
        const grad = ctx.createRadialGradient(proj.sx, proj.sy, 0, proj.sx, proj.sy, s.size * proj.f);
        grad.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${alpha})`);
        grad.addColorStop(0.4, `rgba(60,70,90,${alpha * 0.8})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, s.size * proj.f, 0, Math.PI * 2);
        ctx.fill();
      }

      // === Sparks ===
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy += 0.2;
        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;
        const proj = project({ x: s.x, y: s.y, z: s.z }, rotY * 0.3, 0.12, 0, camZ, scale);
        const t = s.life / s.maxLife;
        const alpha = (1 - t) * 0.9;
        const col = Math.random() < 0.5 ? gold : accent2;
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, 1.5 * proj.f, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(proj.sx, proj.sy);
        ctx.lineTo(proj.sx - s.vx * 3 * proj.f, proj.sy - s.vy * 3 * proj.f);
        ctx.stroke();
      }

      // === Floating embers ===
      for (const e of embers) {
        e.x += e.vx;
        e.y += e.vy;
        e.flicker += dt * 5;
        if (e.y < -130) {
          e.y = 50;
          e.x = (Math.random() - 0.5) * 180;
          e.z = (Math.random() - 0.5) * 80;
        }
        const proj = project({ x: e.x, y: e.y, z: e.z }, rotY, 0.12, 0, camZ, scale);
        const flick = 0.5 + Math.sin(e.flicker) * 0.5;
        const depthAlpha = (1 - e.z / 80) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(${accent2.r},${accent2.g},${accent2.b},${e.alpha * depthAlpha * flick})`;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, e.size * proj.f, 0, Math.PI * 2);
        ctx.fill();
      }

      // === Floor light pool ===
      if (arrivalAlpha > 0.1) {
        const cx = w / 2;
        const cy = h / 2 + 38 * scale;
        const poolGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 * scale);
        poolGrad.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.25 * auraPulse * arrivalAlpha})`);
        poolGrad.addColorStop(0.5, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${0.08 * arrivalAlpha})`);
        poolGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 55 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // === Scan line overlay ===
      const scanY = (time * 80) % h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
      scanGrad.addColorStop(0, 'rgba(0,0,0,0)');
      scanGrad.addColorStop(0.5, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.04)`);
      scanGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 50, w, 100);

      // === Vignette ===
      const vGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.7);
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(animate);
    };

    initMatParticles();

    if (reduce.current) {
      // Static render
      const scale = baseScale();
      const projected = verts.map((p) => project(p, 0.5, 0.12, 0, camZ, scale));
      const faceData = allFaces.map((face) => {
        const avgDepth = (projected[face.pts[0]].depth + projected[face.pts[1]].depth + projected[face.pts[2]].depth) / 3;
        return { face, avgDepth, proj: [projected[face.pts[0]], projected[face.pts[1]], projected[face.pts[2]]] };
      });
      faceData.sort((a, b) => b.avgDepth - a.avgDepth);
      for (const fd of faceData) {
        ctx.fillStyle = `rgba(${fd.face.color.r},${fd.face.color.g},${fd.face.color.b},0.7)`;
        ctx.beginPath();
        ctx.moveTo(fd.proj[0].sx, fd.proj[0].sy);
        ctx.lineTo(fd.proj[1].sx, fd.proj[1].sy);
        ctx.lineTo(fd.proj[2].sx, fd.proj[2].sy);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [accent]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="3D character arrival animation"
    />
  );
}

// === Helpers ===

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const black: RGB = { r: 10, g: 15, b: 30 };

function blendColor(a: RGB, b: RGB, t: number): RGB {
  const tt = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r * (1 - tt) + b.r * tt),
    g: Math.round(a.g * (1 - tt) + b.g * tt),
    b: Math.round(a.b * (1 - tt) + b.b * tt),
  };
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function drawGridFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  color: RGB,
  time: number,
) {
  const cx = w / 2;
  const cy = h / 2 + 38 * scale;
  const gridSize = 28 * scale;
  const lines = 7;

  ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},0.12)`;
  ctx.lineWidth = 1;

  for (let i = -lines; i <= lines; i++) {
    const offset = ((time * 15) % gridSize);
    const y = cy + i * gridSize + offset;
    const perspective = 1 - Math.abs(i) / (lines + 2);
    const alpha = perspective * 0.15;
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;

    ctx.beginPath();
    const halfW = w * 0.5 * perspective;
    ctx.moveTo(cx - halfW, y);
    ctx.lineTo(cx + halfW, y);
    ctx.stroke();
  }

  // Vertical perspective lines
  for (let i = -4; i <= 4; i++) {
    const xRatio = i / 4;
    const xBottom = cx + xRatio * w * 0.45;
    const xTop = cx + xRatio * 20;
    const alpha = 0.1 - Math.abs(xRatio) * 0.04;
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.beginPath();
    ctx.moveTo(xBottom, cy + lines * gridSize);
    ctx.lineTo(xTop, cy - gridSize);
    ctx.stroke();
  }
}
