import { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, Zap, ShieldCheck, Flame, RotateCcw, Award, ChevronRight, Coins } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface CardRoyaleGameProps {
  onGameOver: (score: number, stats: any) => void;
  onExit?: () => void;
}

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  num: number;
}

interface CardLevel {
  level: number;
  name: string;
  tableLimit: string;
  multiplier: number;
  chipGoal: number;
  dealerRules: string;
}

const CARD_LEVELS: CardLevel[] = [
  { level: 1, name: 'Bole Lounge', tableLimit: '10 - 100 Chips', multiplier: 1.0, chipGoal: 300, dealerRules: 'Dealer stands on all 17s' },
  { level: 2, name: 'Kazanchis Club', tableLimit: '25 - 250 Chips', multiplier: 1.5, chipGoal: 700, dealerRules: 'Dealer hits on soft 17' },
  { level: 3, name: 'Piazza High Roller', tableLimit: '50 - 500 Chips', multiplier: 2.2, chipGoal: 1400, dealerRules: 'Aggressive dealer peek + tighter timer' },
  { level: 4, name: 'Addis Syndicate', tableLimit: '100 - 1000 Chips', multiplier: 3.2, chipGoal: 2500, dealerRules: 'High-stakes multi-deck shoe' },
  { level: 5, name: 'Grandmaster Apex Vault', tableLimit: '200 - 2500 Chips', multiplier: 5.0, chipGoal: 4500, dealerRules: 'Boss Dealer with maximum variance' },
];

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const VALUES = [
  { v: 'A', n: 11 },
  { v: '2', n: 2 },
  { v: '3', n: 3 },
  { v: '4', n: 4 },
  { v: '5', n: 5 },
  { v: '6', n: 6 },
  { v: '7', n: 7 },
  { v: '8', n: 8 },
  { v: '9', n: 9 },
  { v: '10', n: 10 },
  { v: 'J', n: 10 },
  { v: 'Q', n: 10 },
  { v: 'K', n: 10 },
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    VALUES.forEach(({ v, n }) => {
      deck.push({ suit, value: v, num: n });
    });
  });
  // Shuffle Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  hand.forEach((c) => {
    total += c.num;
    if (c.value === 'A') aces++;
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export default function CardRoyaleGame({ onGameOver, onExit }: CardRoyaleGameProps) {
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [chips, setChips] = useState<number>(1000);
  const [currentBet, setCurrentBet] = useState<number>(50);
  const [deck, setDeck] = useState<Card[]>(createDeck);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [roundState, setRoundState] = useState<'betting' | 'playing' | 'dealer_turn' | 'round_over'>('betting');
  const [roundResult, setRoundResult] = useState<string | null>(null);
  const [handsPlayed, setHandsPlayed] = useState<number>(0);
  const [blackjacks, setBlackjacks] = useState<number>(0);
  const [hasShieldPerk, setHasShieldPerk] = useState<boolean>(true);
  const [hasVenomPerk, setHasVenomPerk] = useState<boolean>(true);
  const [matchScore, setMatchScore] = useState<number>(0);

  const levelCfg = CARD_LEVELS[currentLevel - 1] || CARD_LEVELS[0];

  const dealInitialHand = () => {
    if (chips < currentBet) return;
    setChips((c) => c - currentBet);
    gameAudio.playChip();

    let curDeck = [...deck];
    if (curDeck.length < 15) curDeck = createDeck();

    const p1 = curDeck.pop()!;
    const d1 = curDeck.pop()!;
    const p2 = curDeck.pop()!;
    const d2 = curDeck.pop()!;

    setDeck(curDeck);
    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setRoundState('playing');
    setRoundResult(null);
    gameAudio.playCardDeal();

    // Natural 21 check
    const pVal = calculateHandValue([p1, p2]);
    if (pVal === 21) {
      setTimeout(() => finishRound([p1, p2], [d1, d2], true), 600);
    }
  };

  const handleHit = () => {
    if (roundState !== 'playing') return;
    let curDeck = [...deck];
    if (curDeck.length < 5) curDeck = createDeck();
    const newCard = curDeck.pop()!;
    setDeck(curDeck);

    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    gameAudio.playCardDeal();

    const val = calculateHandValue(newHand);
    if (val > 21) {
      // Check if Shield Perk saves player!
      if (hasShieldPerk && val <= 24) {
        setHasShieldPerk(false);
        gameAudio.playBullseye();
        // Convert last card to 1
        newHand[newHand.length - 1].num = 1;
        setPlayerHand([...newHand]);
      } else {
        setRoundState('round_over');
        setRoundResult('BUST! OVER 21');
        gameAudio.playCrash();
        setHandsPlayed((h) => h + 1);
      }
    } else if (val === 21) {
      handleStand(newHand);
    }
  };

  const handleStand = (currentPHand = playerHand) => {
    if (roundState !== 'playing') return;
    setRoundState('dealer_turn');

    let curDeck = [...deck];
    let dHand = [...dealerHand];

    const runDealer = () => {
      let dVal = calculateHandValue(dHand);
      if (dVal < 17) {
        if (curDeck.length < 5) curDeck = createDeck();
        const c = curDeck.pop()!;
        dHand.push(c);
        setDealerHand([...dHand]);
        gameAudio.playCardDeal();
        setTimeout(runDealer, 400);
      } else {
        setDeck(curDeck);
        finishRound(currentPHand, dHand, false);
      }
    };

    setTimeout(runDealer, 300);
  };

  const finishRound = (pHand: Card[], dHand: Card[], isNatural: boolean) => {
    const pVal = calculateHandValue(pHand);
    const dVal = calculateHandValue(dHand);
    setHandsPlayed((h) => h + 1);

    let payout = 0;
    let resultStr = '';

    if (isNatural) {
      const naturalPayout = Math.round(currentBet * 2.5);
      payout = naturalPayout;
      resultStr = '🔥 BLACKJACK! PAYS 3:2';
      setBlackjacks((b) => b + 1);
      gameAudio.playLevelUp();
    } else if (pVal > 21) {
      resultStr = 'BUST — DEALER WINS';
      gameAudio.playCrash();
    } else if (dVal > 21) {
      payout = currentBet * 2;
      resultStr = 'DEALER BUST! YOU WIN';
      gameAudio.playBullseye();
    } else if (pVal > dVal) {
      payout = currentBet * 2;
      resultStr = `YOU WIN! (${pVal} vs ${dVal})`;
      gameAudio.playBullseye();
    } else if (pVal < dVal) {
      resultStr = `DEALER WINS (${dVal} vs ${pVal})`;
      gameAudio.playCrash();
    } else {
      payout = currentBet; // Push
      resultStr = `PUSH / TIE (${pVal})`;
      gameAudio.playChip();
    }

    if (payout > 0) {
      setChips((c) => c + payout);
      const earnedRP = Math.round((payout / 10) * levelCfg.multiplier);
      setMatchScore((s) => s + earnedRP);

      // Level check
      if (chips + payout >= levelCfg.chipGoal && currentLevel < CARD_LEVELS.length) {
        setCurrentLevel((l) => l + 1);
        gameAudio.playLevelUp();
      }
    }

    setRoundResult(resultStr);
    setRoundState('round_over');

    // Out of chips check
    if (chips - currentBet <= 0 && payout === 0) {
      setTimeout(() => {
        onGameOver(matchScore, {
          level: currentLevel,
          handsPlayed: handsPlayed + 1,
          blackjacks,
          chipsFinal: chips + payout,
        });
      }, 1500);
    }
  };

  const pScore = calculateHandValue(playerHand);
  const dScore = roundState === 'playing' ? dealerHand[0]?.num || 0 : calculateHandValue(dealerHand);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-ink-950 select-none overflow-hidden rounded-2xl border border-primary-500/30 shadow-2xl">
      {/* Top HUD */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>LEVEL {currentLevel}: {levelCfg.name.toUpperCase()}</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Goal: <strong className="text-white">{levelCfg.chipGoal} Chips</strong>
          </span>
        </div>

        {/* Chips Balance */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">
            <Coins className="w-4 h-4 text-gold-400" />
            <span className="font-display font-black text-sm text-gold-300">{chips.toLocaleString()} CHIPS</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono block">RP SCORE</span>
            <span className="font-display font-black text-lg text-primary-400">{matchScore}</span>
          </div>
        </div>
      </div>

      {/* Felt Casino Table Area */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-between p-4 bg-radial-fade">
        {/* Dealer Hand Area */}
        <div className="w-full flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              Dealer's Hand {roundState !== 'playing' && dealerHand.length > 0 && `(${dScore})`}
            </span>
          </div>
          <div className="flex items-center gap-2 min-h-[95px]">
            {dealerHand.map((card, idx) => (
              <div
                key={idx}
                className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl flex flex-col justify-between p-2 shadow-2xl border transition-all ${
                  roundState === 'playing' && idx === 1
                    ? 'bg-gradient-to-br from-primary-900 to-ink-950 border-primary-500/50 flex items-center justify-center'
                    : 'bg-white border-slate-200'
                }`}
              >
                {roundState === 'playing' && idx === 1 ? (
                  <Sparkles className="w-6 h-6 text-primary-400 animate-pulse" />
                ) : (
                  <>
                    <span className={`font-bold text-sm ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {card.value}{card.suit}
                    </span>
                    <span className={`text-2xl sm:text-3xl self-center ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {card.suit}
                    </span>
                    <span className={`font-bold text-sm self-end ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {card.value}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Round Result Banner */}
        {roundResult && (
          <div className="my-2 px-6 py-2 rounded-2xl bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 border-2 border-gold-400 shadow-glow-gold z-20 animate-in zoom-in-95">
            <span className="font-display font-black text-sm sm:text-base text-gold-300 tracking-wider">
              {roundResult}
            </span>
          </div>
        )}

        {/* Player Hand Area */}
        <div className="w-full flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">
              Your Hand {playerHand.length > 0 && `(${pScore})`}
            </span>
          </div>
          <div className="flex items-center gap-2 min-h-[95px]">
            {playerHand.map((card, idx) => (
              <div
                key={idx}
                className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl flex flex-col justify-between p-2 shadow-2xl bg-white border border-slate-200"
              >
                <span className={`font-bold text-sm ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`}>
                  {card.value}{card.suit}
                </span>
                <span className={`text-2xl sm:text-3xl self-center ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`}>
                  {card.suit}
                </span>
                <span className={`font-bold text-sm self-end ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`}>
                  {card.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control Actions Bottom Bar */}
      <div className="w-full bg-slate-900/95 border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Bet Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 font-mono">BET:</span>
          {[25, 50, 100, 250, 500].map((amt) => (
            <button
              key={amt}
              disabled={roundState === 'playing'}
              onClick={() => { setCurrentBet(amt); gameAudio.playChip(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentBet === amt
                  ? 'bg-amber-400 text-ink-950 shadow-glow-gold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {roundState === 'playing' ? (
            <>
              <button
                onClick={handleHit}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-primary-500 hover:bg-primary-400 text-white shadow-glow transition-all cursor-pointer"
              >
                HIT (+Card)
              </button>
              <button
                onClick={() => handleStand()}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-white transition-all cursor-pointer"
              >
                STAND (Hold)
              </button>
            </>
          ) : (
            <button
              onClick={dealInitialHand}
              className="px-6 py-2.5 rounded-xl font-black text-xs bg-gold-400 hover:bg-gold-300 text-ink-950 shadow-glow-gold transition-all cursor-pointer uppercase tracking-wider"
            >
              DEAL CARDS ({currentBet} Chips)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
