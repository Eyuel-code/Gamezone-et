import { Gift, Coins, Star, Ticket, Headphones, Zap, Crown, ShieldCheck } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { useTilt } from '@/hooks/useMotion';

const rewards = [
  { name: '100 Loyalty Points', cost: 500, icon: Coins, desc: 'Redeem for Br 50 wallet credit' },
  { name: 'Free Entry Ticket', cost: 800, icon: Ticket, desc: 'Join any open tournament free' },
  { name: 'Diamond Bonus Pack', cost: 1200, icon: Zap, desc: '10% extra on next top-up' },
  { name: 'Premium Support Pass', cost: 600, icon: Headphones, desc: 'Priority 24/7 chat support' },
  { name: 'Exclusive Avatar Frame', cost: 400, icon: Star, desc: 'Show off on leaderboards' },
  { name: 'VIP Member Badge', cost: 2000, icon: Crown, desc: 'Gold profile badge + perks' },
];

const tiers = [
  { name: 'Bronze', range: '0 - 999 pts', color: 'from-amber-700 to-amber-900', perks: ['1% top-up cashback', 'Birthday bonus'] },
  { name: 'Silver', range: '1,000 - 4,999', color: 'from-slate-300 to-slate-500', perks: ['3% cashback', 'Early tournament access', 'Monthly 50 Br'] },
  { name: 'Gold', range: '5,000 - 19,999', color: 'from-gold-300 to-gold-500', perks: ['5% cashback', 'Priority support', 'Free entry ticket / month'] },
  { name: 'Platinum', range: '20,000+', color: 'from-primary-200 to-primary-500', perks: ['8% cashback', 'VIP tournaments', 'Personal account manager'] },
];

export default function RewardsPage({
  loyaltyPoints,
  onRedeem,
}: {
  loyaltyPoints: number;
  onRedeem: (name: string, cost: number) => void;
}) {
  const currentTierName =
    loyaltyPoints >= 20000
      ? 'Platinum Member'
      : loyaltyPoints >= 5000
      ? 'Gold Member'
      : loyaltyPoints >= 1000
      ? 'Silver Member'
      : 'Bronze Member';

  return (
    <div className="relative min-h-screen pt-20">
      <section className="relative overflow-hidden py-12">
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="container-x">
          <Reveal className="text-center">
            <span className="chip border-gold-400/30 bg-gold-400/10 text-gold-200"><Gift className="h-3.5 w-3.5" aria-hidden="true" /> Loyalty Program</span>
            <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">Earn points, <span className="text-gradient-gold">claim rewards</span></h1>
            <p className="mt-4 text-slate-400">Every top-up and tournament earns loyalty points. Redeem them for wallet credit, free entries, and exclusive perks.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-6">
        <div className="container-x space-y-8">
          {/* Points balance */}
          <Reveal>
            <div className="glass-strong flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-400/15 text-gold-300" aria-hidden="true"><Coins className="h-7 w-7" /></span>
                <div><p className="text-sm text-slate-400">Your loyalty points</p><p className="font-mono text-3xl font-bold text-white">{loyaltyPoints.toLocaleString()}</p></div>
              </div>
              <div className="text-center sm:text-right"><p className="text-xs text-slate-400">Current tier</p><p className="font-display text-lg font-bold text-gradient-gold">{currentTierName}</p></div>
            </div>
          </Reveal>

          {/* Reward grid */}
          <div>
            <h2 className="sr-only">Available Loyalty Rewards</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((r, i) => {
                const Icon = r.icon;
                const affordable = loyaltyPoints >= r.cost;
                return (
                  <Reveal key={r.name} delay={i * 80} as="article">
                    <RewardCard icon={Icon} name={r.name} cost={r.cost} desc={r.desc} affordable={affordable} onRedeem={() => onRedeem(r.name, r.cost)} />
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* Tier ladder */}
          <Reveal>
            <h2 className="font-display text-xl font-bold text-white">Membership tiers</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((t) => (
                <div key={t.name} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="pointer-events-none absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle at 90% 10%, rgba(139, 92, 246, 0.35), transparent 55%)' }} aria-hidden="true" />
                  <span className={`inline-block rounded-full bg-gradient-to-r ${t.color} bg-clip-text px-3 py-1 text-sm font-bold text-transparent`}>{t.name}</span>
                  <p className="mt-2 text-xs text-slate-400">{t.range}</p>
                  <ul className="mt-3 space-y-1.5">
                    {t.perks.map((perk) => <li key={perk} className="flex items-start gap-2 text-xs text-slate-300"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-400" aria-hidden="true" />{perk}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function RewardCard({ icon: Icon, name, cost, desc, affordable, onRedeem }: { icon: typeof Gift; name: string; cost: number; desc: string; affordable: boolean; onRedeem: () => void }) {
  const { ref, onMove, onLeave } = useTilt<HTMLDivElement>(8);
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className="preserve-3d group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:border-gold-400/30">
      <div className="flex items-center gap-3" style={{ transform: 'translateZ(20px)' }}>
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-400/15 text-gold-300" aria-hidden="true"><Icon className="h-6 w-6" /></span>
        <div><h3 className="font-display text-base font-bold text-white">{name}</h3><p className="text-xs text-slate-400">{desc}</p></div>
      </div>
      <div className="mt-5 flex items-center justify-between" style={{ transform: 'translateZ(15px)' }}>
        <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-gold-300"><Coins className="h-4 w-4" aria-hidden="true" /> {cost.toLocaleString()} pts</span>
        <button type="button" onClick={onRedeem} disabled={!affordable} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${affordable ? 'bg-gold-400 text-ink-950 hover:scale-105 cursor-pointer' : 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-400'}`}>{affordable ? 'Redeem' : 'Not enough'}</button>
      </div>
    </div>
  );
}
