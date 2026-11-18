import React from 'react';
import type { OnlineGame } from '@/data/gamesCatalog';
import type { GamerProfile } from './AuthModal';
import ResponsiveGameModal from './ResponsiveGameModal';

export interface GamePlayerModalProps {
  game: OnlineGame | null;
  onClose: () => void;
  currentUser?: GamerProfile | null;
  onGameCompleted?: (game: OnlineGame, score: number) => void;
  onOpenAuth?: () => void;
}

export default function GamePlayerModal(props: GamePlayerModalProps) {
  return <ResponsiveGameModal {...props} />;
}
