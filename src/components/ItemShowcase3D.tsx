import { Gem, Coins, CircleDot, Gift, Crown, ArrowUp, Sparkles } from 'lucide-react';
import type { Game } from '@/data/catalog';

/**
 * 3D rotating carousel of purchasable game items.
 * Items orbit around a central glowing core on a circular path in 3D space.
 * Pure CSS 3D transforms — no canvas/WebGL.
 */

const iconMap: Record<string, typeof Gem> = {
  gem: Gem,
  coins: Coins,
  ball: CircleDot,
  crate: Gift,
  pass: ArrowUp,
  membership: Crown,
};

interface OrbitItem {
  icon: typeof Gem;
  label: string;
  color: string;
  size: number;
}

export default function ItemShowcase3D({ game }: { game: Game }) {
  const TopIcon = iconMap[game.topUpIcon];

  const items: OrbitItem[] = [
    { icon: TopIcon, label: game.topUpUnit, color: game.accent, size: 64 },
    { icon: Crown, label: 'Membership', color: '#f5b200', size: 52 },
    { icon: ArrowUp, label: 'Level Pass', color: '#11bdf7', size: 52 },
    { icon: Gift, label: 'Crates', color: '#34d399', size: 48 },
    { icon: Sparkles, label: 'Skins', color: game.accent, size: 48 },
    { icon: TopIcon, label: game.topUpUnit, color: game.accent, size: 44 },
  ];

  const count = items.length;
  const radius = 140;

  return (
    <div className="perspective relative flex h-full min-h-[340px] w-full items-center justify-center">
      {/* Central core */}
      <div className="preserve-3d absolute" style={{ transformStyle: 'preserve-3d' }}>
        <div
          className="h-16 w-16 rounded-2xl"
          style={{
            background: `linear-gradient(145deg, ${game.accent}, #0a0c1b)`,
            boxShadow: `0 0 40px -4px ${game.accent}80`,
            transform: 'translateZ(20px)',
          }}
        >
          <div className="grid h-full w-full place-items-center">
            <TopIcon className="h-7 w-7 text-white" />
          </div>
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-2xl border-2 animate-pulse-ring" style={{ borderColor: `${game.accent}40` }} />
        <div className="absolute inset-0 rounded-2xl border-2 animate-pulse-ring" style={{ borderColor: `${game.accent}30`, animationDelay: '0.8s' }} />
      </div>

      {/* Orbiting items */}
      <div
        className="preserve-3d absolute"
        style={{
          transformStyle: 'preserve-3d',
          animation: 'item-orbit 16s linear infinite',
        }}
      >
        {items.map((item, i) => {
          const angle = (i / count) * 360;
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="preserve-3d absolute"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Counter-rotate to keep item facing the viewer */}
              <div
                className="preserve-3d"
                style={{
                  transform: `rotateY(${-angle}deg)`,
                  transformStyle: 'preserve-3d',
                  animation: 'float 4s ease-in-out infinite',
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                <div
                  className="grid place-items-center rounded-2xl border backdrop-blur-sm"
                  style={{
                    width: item.size,
                    height: item.size,
                    background: `${item.color}15`,
                    borderColor: `${item.color}40`,
                    boxShadow: `0 0 20px -4px ${item.color}50`,
                  }}
                >
                  <Icon className="h-1/2 w-1/2" style={{ color: item.color }} />
                </div>
                <p
                  className="mt-1.5 text-center text-xs font-medium"
                  style={{ color: item.color }}
                >
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floor reflection grid */}
      <div
        className="absolute bottom-4 h-24 w-72 bg-grid opacity-15"
        style={{ transform: 'rotateX(90deg) translateZ(-40px)' }}
      />
    </div>
  );
}
