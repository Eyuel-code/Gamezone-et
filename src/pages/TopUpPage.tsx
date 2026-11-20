import { useState, Suspense } from 'react';
import { motion } from 'motion/react';
import {
  Flame, Crosshair, Gem, Coins, CircleDot, Crown, ArrowUp, Check, Sparkles,
  ShieldCheck, Zap, Gift, Star, Info, HelpCircle,
} from 'lucide-react';
import { games, formatETB, rarityStyles } from '@/data/catalog';
import type { Game, TopUpPackage, MembershipTier, GamePass, CrateItem } from '@/data/catalog';
import Reveal, { StaggerGrid, StaggerItem } from '@/components/Reveal';
import ResilientImage from '@/components/ResilientImage';
import type { ProductItem } from '@/services/db';
import { useTilt } from '@/hooks/useMotion';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const CheckoutModal = lazyWithRetry(() => import('@/components/CheckoutModal'));
const ItemShowcase3D = lazyWithRetry(() => import('@/components/ItemShowcase3D'));

type Tab = 'topup' | 'membership' | 'passes' | 'crates';

const topUpIcons: Record<string, typeof Gem> = { gem: Gem, coins: Coins, ball: CircleDot };
const gameIcons: Record<string, typeof Flame> = { flame: Flame, crosshair: Crosshair, football: Crosshair };

export default function TopUpPage({
  onPurchase,
  onNavigateToOrders,
}: {
  onPurchase?: (label: string, priceETB: number) => void;
  onNavigateToOrders?: () => void;
}) {
  const [activeGameId, setActiveGameId] = useState<'freefire' | 'pubg' | 'eafc'>('freefire');
  const [tab, setTab] = useState<Tab>('topup');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  const activeGame = games.find((g) => g.id === activeGameId) || games[0];

  const handleBuyPackage = (pkg: TopUpPackage) => {
    const productItem: ProductItem = {
      id: pkg.id,
      gameId: activeGameId,
      gameName: activeGame.name,
      name: `${pkg.amount.toLocaleString()} ${pkg.unit}`,
      category: activeGameId === 'freefire' ? 'Diamonds' : activeGameId === 'pubg' ? 'UC' : 'FC Points',
      amount: pkg.amount,
      unit: pkg.unit,
      bonus: pkg.bonus,
      priceETB: pkg.priceETB,
      popular: pkg.popular,
      bestValue: pkg.bestValue,
      inStock: true,
      description: `Direct delivery to your ${activeGame.name} Player ID`,
    };
    setSelectedProduct(productItem);
    setCheckoutOpen(true);
  };

  const handleBuyGeneric = (title: string, priceETB: number, category: any) => {
    const productItem: ProductItem = {
      id: `item-${Date.now()}`,
      gameId: activeGameId,
      gameName: activeGame.name,
      name: title,
      category,
      amount: 1,
      unit: 'Item',
      priceETB,
      inStock: true,
      description: `Direct activation for ${activeGame.name}`,
    };
    setSelectedProduct(productItem);
    setCheckoutOpen(true);
  };

  return (
    <div className="relative min-h-screen pt-20">
      {/* Header */}
      <section className="relative overflow-hidden py-12">
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="container-x">
          <Reveal className="text-center">
            <span className="chip border-primary-400/30 bg-primary-400/10 text-primary-200">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Instant Ethiopian Top-Up
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
              Top up your <span className="text-gradient">game</span>
            </h1>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Ethiopian top-up marketplace supporting Telebirr and CBE Birr checkout. Zero password required, delivered directly to your Player ID.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Game selector */}
      <section className="py-4" aria-label="Choose supported game">
        <div className="container-x">
          <div className="flex flex-wrap justify-center gap-3" role="group" aria-label="Game titles">
            {games.map((g) => {
              const Icon = gameIcons[g.iconKey];
              const active = g.id === activeGameId;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setTab('topup');
                    setActiveGameId(g.id as any);
                  }}
                  className={`nav-luminous-item group relative flex items-center gap-3 rounded-2xl border px-5 py-3 transition-all duration-300 cursor-pointer ${
                    active
                      ? 'border-primary-400/60 bg-primary-400/10 shadow-glow'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: `${g.accent}22`, color: g.accent }}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-left">
                    <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>
                      {g.name}
                    </span>
                    <span className="block text-xs text-slate-500">{g.platform}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Game showcase + details */}
      <GameShowcase game={activeGame} />

      {/* Tabs + content */}
      <section className="py-8">
        <div className="container-x">
          <GamePanel
            key={activeGame.id}
            game={activeGame}
            tab={tab}
            setTab={setTab}
            onBuyPackage={handleBuyPackage}
            onBuyGeneric={handleBuyGeneric}
          />
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-12 border-t border-white/5">
        <div className="container-x max-w-4xl">
          <div className="text-center mb-8">
            <span className="chip border-primary-400/30 bg-primary-400/10 text-primary-200">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> Top-Up Guide
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">Frequently Asked Questions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-1">
              <h3 className="font-bold text-white text-sm">How does GameZoneET top up my account?</h3>
              <p className="text-slate-400">
                We only need your public In-Game Player ID. We NEVER ask for account passwords or social media credentials. Diamonds or UC are credited automatically.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-1">
              <h3 className="font-bold text-white text-sm">Which payment methods are supported?</h3>
              <p className="text-slate-400">
                You can pay conveniently using Telebirr (USSD / App push) and CBE Birr in Ethiopian Birr with instant order confirmation.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-1">
              <h3 className="font-bold text-white text-sm">Where do I find my Player ID?</h3>
              <p className="text-slate-400">
                Open Free Fire or PUBG Mobile, click your profile avatar in the top-left corner, and tap the copy icon next to your numeric User ID.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-1">
              <h3 className="font-bold text-white text-sm">Can I get a receipt?</h3>
              <p className="text-slate-400">
                Yes! Every completed order generates a receipt with a unique reference number you can inspect anytime in My Orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6-Step Top-Up Modal (Lazy-loaded on demand) */}
      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            initialGameId={activeGameId}
            initialProduct={selectedProduct}
            onOrderCompleted={() => {
              if (onPurchase && selectedProduct) {
                onPurchase(selectedProduct.name, selectedProduct.priceETB);
              }
            }}
            onNavigateToOrders={onNavigateToOrders}
          />
        </Suspense>
      )}
    </div>
  );
}

function GameShowcase({ game }: { game: Game }) {
  const TopIcon = topUpIcons[game.topUpIcon];
  return (
    <Reveal className="py-6">
      <div className="container-x">
        <div className="glass-strong overflow-hidden rounded-3xl">
          <div className={`relative h-32 bg-gradient-to-r ${game.color} sm:h-36`}>
            <ResilientImage src={game.coverImage} alt="" decorative className="absolute inset-0 h-full w-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 to-transparent" />
            <div className="relative flex h-full items-end gap-4 p-5 sm:p-7">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold text-white shadow-card"
                style={{ background: `linear-gradient(135deg, ${game.accent}, #0a0c1b)` }}
              >
                {game.logoInitials}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold text-white sm:text-2xl">{game.name}</h2>
                <p className="text-sm text-slate-300">{game.tagline}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-gold-400" aria-hidden="true" /> {game.rating}</span>
                  <span aria-hidden="true">·</span><span>{game.activePlayers} active</span>
                  <span aria-hidden="true">·</span><span>{game.publisher}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3D showcase + what you can buy */}
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
            <div className="glass relative min-w-0 min-h-[280px] sm:min-h-[340px] overflow-hidden rounded-2xl">
              <div className="absolute left-4 top-4 z-10">
                <span className="chip" style={{ borderColor: `${game.accent}40`, color: game.accent }}>
                  <TopIcon className="h-3.5 w-3.5" aria-hidden="true" /> {game.topUpLabel}
                </span>
              </div>
              <Suspense fallback={<div className="flex h-full min-h-[340px] items-center justify-center text-xs text-slate-400">Loading 3D showcase...</div>}>
                <ItemShowcase3D game={game} />
              </Suspense>
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold text-white">About {game.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{game.description}</p>
              <h4 className="mt-5 font-display text-sm font-bold uppercase tracking-wider text-slate-300">What you can buy</h4>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {game.whatYouCanBuy.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: game.accent }} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function GamePanel({
  game,
  tab,
  setTab,
  onBuyPackage,
  onBuyGeneric,
}: {
  game: Game;
  tab: Tab;
  setTab: (t: Tab) => void;
  onBuyPackage: (pkg: TopUpPackage) => void;
  onBuyGeneric: (title: string, price: number, cat: any) => void;
}) {
  const TopIcon = topUpIcons[game.topUpIcon];

  const tabs = [
    { id: 'topup' as const, label: game.topUpLabel, icon: TopIcon },
    { id: 'membership' as const, label: 'Memberships', icon: Crown },
    { id: 'passes' as const, label: 'Passes', icon: ArrowUp },
    { id: 'crates' as const, label: 'Crates & Packs', icon: Gift },
  ];

  return (
    <Reveal delay={100}>
      <div className="glass-strong overflow-hidden rounded-3xl">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label={`${game.name} product categories`}
          className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 pt-3 scrollbar-none sm:px-7"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`topup-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`topup-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" style={active ? { color: game.accent } : {}} aria-hidden="true" />
                {t.label}
                {active && (
                  <motion.span
                    layoutId="topup-tab-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    aria-hidden="true"
                    className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full"
                    style={{ background: game.accent, boxShadow: `0 0 10px ${game.accent}` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          id={`topup-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`topup-tab-${tab}`}
          className="p-4 sm:p-7"
        >
          <h2 className="sr-only">{game.name} {tabs.find((t) => t.id === tab)?.label}</h2>
          {tab === 'topup' && <PackageGrid game={game} onBuyPackage={onBuyPackage} />}
          {tab === 'membership' && (
            <MembershipGrid
              game={game}
              onBuy={(title, price) => onBuyGeneric(title, price, 'Membership')}
            />
          )}
          {tab === 'passes' && (
            <PassList
              game={game}
              onBuy={(title, price) => onBuyGeneric(title, price, 'Pass')}
            />
          )}
          {tab === 'crates' && (
            <CrateGrid
              game={game}
              onBuy={(title, price) => onBuyGeneric(title, price, 'Diamonds')}
            />
          )}
        </div>
      </div>
    </Reveal>
  );
}

function PackageGrid({
  game,
  onBuyPackage,
}: {
  game: Game;
  onBuyPackage: (pkg: TopUpPackage) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start sm:items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-slate-400">
        <Info className="h-3.5 w-3.5 text-primary-400 shrink-0 mt-0.5 sm:mt-0" />
        Select your package. You will enter your Player ID and choose Telebirr or CBE Birr in the checkout step.
      </div>
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {game.packages.map((pkg, i) => (
          <StaggerItem key={pkg.id} className="h-full">
            <PackageCard
              pkg={pkg}
              game={game}
              index={i}
              onBuy={() => onBuyPackage(pkg)}
            />
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}

function PackageCard({
  pkg,
  game,
  index,
  onBuy,
}: {
  pkg: TopUpPackage;
  game: Game;
  index: number;
  onBuy: () => void;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(8);
  const Icon = topUpIcons[game.topUpIcon];
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="card-spotlight group preserve-3d relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:border-white/20 flex flex-col justify-between"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div>
        {pkg.popular && (
          <span className="absolute right-3 top-3 rounded-full bg-primary-400/20 px-2.5 py-0.5 text-xs font-semibold text-primary-200">
            Popular
          </span>
        )}
        {pkg.bestValue && (
          <span className="absolute right-3 top-3 rounded-full bg-gold-400/20 px-2.5 py-0.5 text-xs font-semibold text-gold-200">
            Best Value
          </span>
        )}
        <div className="flex items-center gap-3" style={{ transform: 'translateZ(20px)' }}>
          <span
            className="grid h-12 w-12 place-items-center rounded-xl"
            style={{ background: `${game.accent}22`, color: game.accent }}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-white">{pkg.amount.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{pkg.unit}</p>
          </div>
        </div>
        {pkg.bonus && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-lg bg-success-400/10 px-2 py-1 text-xs font-medium text-success-400">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> +{pkg.bonus} bonus
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2" style={{ transform: 'translateZ(15px)' }}>
        <span className="font-mono text-lg font-bold text-white">{formatETB(pkg.priceETB)}</span>
        <button
          type="button"
          onClick={onBuy}
          aria-label={`Top Up ${pkg.amount.toLocaleString()} ${pkg.unit} for ${formatETB(pkg.priceETB)}`}
          className="btn-primary rounded-lg px-4 py-2 text-sm font-bold text-white cursor-pointer"
        >
          Top Up
        </button>
      </div>
    </div>
  );
}

function MembershipGrid({
  game,
  onBuy,
}: {
  game: Game;
  onBuy: (t: string, p: number) => void;
}) {
  return (
    <StaggerGrid className="grid gap-4 lg:grid-cols-2">
      {game.memberships.map((m) => (
        <StaggerItem key={m.id} className="h-full">
          <div
            className={`card-spotlight relative h-full overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-card flex flex-col justify-between ${
              m.highlight
                ? 'border-gold-400/40 bg-gradient-to-br from-gold-400/10 to-transparent'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <div>
              {m.highlight && (
                <span className="absolute right-4 top-4 rounded-full bg-gold-400/20 px-3 py-1 text-xs font-semibold text-gold-200">
                  Recommended
                </span>
              )}
              <Crown className={`h-7 w-7 ${m.highlight ? 'text-gold-400' : 'text-primary-400'}`} aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl font-bold text-white">{m.name}</h3>
              <p className="text-sm text-slate-400">{m.duration}</p>
              <p className="mt-4 font-mono text-3xl font-bold text-white">{formatETB(m.priceETB)}</p>
              <ul className="mt-5 space-y-2.5">
                {m.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: game.accent }} aria-hidden="true" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onBuy(`${m.name} (${m.duration})`, m.priceETB)}
              className={`mt-6 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer ${
                m.highlight ? 'btn-glow-gold' : 'btn-ghost'
              }`}
            >
              Get {m.name}
            </button>
          </div>
        </StaggerItem>
      ))}
    </StaggerGrid>
  );
}

function PassList({
  game,
  onBuy,
}: {
  game: Game;
  onBuy: (t: string, p: number) => void;
}) {
  return (
    <div className="space-y-4">
      {game.passes.map((pass) => (
        <div
          key={pass.id}
          className={`card-spotlight group flex flex-col items-start gap-4 rounded-2xl border p-5 transition-all duration-300 hover:border-white/20 sm:flex-row sm:items-center sm:justify-between ${
            pass.highlight ? 'border-primary-400/30 bg-primary-400/5' : 'border-white/10 bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-4">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl"
              style={{ background: `${game.accent}22`, color: game.accent }}
              aria-hidden="true"
            >
              <ArrowUp className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">{pass.name}</h3>
                {pass.highlight && (
                  <span className="rounded-full bg-primary-400/20 px-2 py-0.5 text-xs text-primary-200">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{pass.season} · Max Level {pass.maxLevel}</p>
              <p className="mt-1 text-sm text-slate-300">{pass.reward}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:items-end">
            <span className="font-mono text-xl font-bold text-white">{formatETB(pass.priceETB)}</span>
            <button
              type="button"
              onClick={() => onBuy(`${pass.name} (${pass.season})`, pass.priceETB)}
              className="btn-primary rounded-lg px-4 py-2 text-sm font-bold text-white cursor-pointer"
            >
              Unlock Pass
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-start sm:items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4 text-success-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        All passes are applied to your in-game account within minutes of payment.
      </div>
    </div>
  );
}

function CrateGrid({
  game,
  onBuy,
}: {
  game: Game;
  onBuy: (t: string, p: number) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start sm:items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-slate-400">
        <Gift className="h-3.5 w-3.5 text-gold-400 shrink-0 mt-0.5 sm:mt-0" />
        Crates contain in-game skins and cosmetic drops. Rarity determines drop chances.
      </div>
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {game.crateItems.map((crate, i) => (
          <StaggerItem key={crate.id} className="h-full">
            <CrateCard
              crate={crate}
              index={i}
              onBuy={() => onBuy(`${crate.name}`, crate.priceETB)}
            />
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}

function CrateCard({
  crate,
  index,
  onBuy,
}: {
  crate: CrateItem;
  index: number;
  onBuy: () => void;
}) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(8);
  const r = rarityStyles[crate.rarity];
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`card-spotlight preserve-3d relative h-full overflow-hidden rounded-2xl border p-5 ${r.border} ${r.bg} transition-all duration-200 hover:shadow-card flex flex-col justify-between`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div>
        <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5" aria-hidden="true">
            <Gift className={`h-6 w-6 ${r.color}`} />
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.color} ${r.bg} ${r.border} border`}>
            {r.label}
          </span>
        </div>
        <h3 className="mt-4 font-display text-sm font-bold text-white">{crate.name}</h3>
        <p className="text-xs text-slate-400">{crate.type}</p>
      </div>
      <div className="mt-4 flex items-end justify-between" style={{ transform: 'translateZ(15px)' }}>
        <span className="font-mono text-lg font-bold text-white">{formatETB(crate.priceETB)}</span>
        <button
          type="button"
          onClick={onBuy}
          aria-label={`Open ${crate.name} for ${formatETB(crate.priceETB)}`}
          className="btn-ghost rounded-lg px-3 py-2 text-sm font-semibold text-white cursor-pointer"
        >
          Open
        </button>
      </div>
    </div>
  );
}
