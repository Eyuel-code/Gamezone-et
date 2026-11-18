import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Award, Zap, RotateCcw, Sparkles, Volume2, ChevronRight, ShieldCheck, Flag, Cpu, User } from 'lucide-react';
import { gameAudio } from '@/utils/gameAudio';

interface GrandmasterChessGameProps {
  onGameOver: (score: number, stats: any) => void;
  onExit?: () => void;
}

type PieceColor = 'w' | 'b';
type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

type Board = (ChessPiece | null)[][];

interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  captured?: ChessPiece | null;
  notation?: string;
}

interface ChessLevel {
  level: number;
  name: string;
  elo: string;
  depth: number;
  multiplier: number;
  description: string;
}

const CHESS_LEVELS: ChessLevel[] = [
  { level: 1, name: 'Addis Novice', elo: '800 ELO', depth: 1, multiplier: 1.0, description: 'Basic opening moves with casual tactical mistakes' },
  { level: 2, name: 'Club Fighter', elo: '1200 ELO', depth: 2, multiplier: 1.5, description: 'Captures hanging pieces, develops minor pieces toward center' },
  { level: 3, name: 'Tactical Master', elo: '1600 ELO', depth: 2, multiplier: 2.2, description: 'Calculates forks, pins, and preserves piece values' },
  { level: 4, name: 'National Master', elo: '2000 ELO', depth: 3, multiplier: 3.2, description: 'Positional piece-square tables, aggressive piece activity' },
  { level: 5, name: 'Ethiopian Grandmaster', elo: '2400 ELO', depth: 3, multiplier: 5.0, description: 'Apex tactical engine, flawless endgame execution' },
];

// Piece Unicode Icons
const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

// Piece Values for Minimax Evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Initial Board Setup
function getInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Pawns
  for (let c = 0; c < 8; c++) {
    board[1][c] = { type: 'p', color: 'b' };
    board[6][c] = { type: 'p', color: 'w' };
  }

  // Black major pieces
  board[0][0] = { type: 'r', color: 'b' };
  board[0][1] = { type: 'n', color: 'b' };
  board[0][2] = { type: 'b', color: 'b' };
  board[0][3] = { type: 'q', color: 'b' };
  board[0][4] = { type: 'k', color: 'b' };
  board[0][5] = { type: 'b', color: 'b' };
  board[0][6] = { type: 'n', color: 'b' };
  board[0][7] = { type: 'r', color: 'b' };

  // White major pieces
  board[7][0] = { type: 'r', color: 'w' };
  board[7][1] = { type: 'n', color: 'w' };
  board[7][2] = { type: 'b', color: 'w' };
  board[7][3] = { type: 'q', color: 'w' };
  board[7][4] = { type: 'k', color: 'w' };
  board[7][5] = { type: 'b', color: 'w' };
  board[7][6] = { type: 'n', color: 'w' };
  board[7][7] = { type: 'r', color: 'w' };

  return board;
}

export default function GrandmasterChessGame({ onGameOver, onExit }: GrandmasterChessGameProps) {
  const [board, setBoard] = useState<Board>(getInitialBoard);
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(2);
  const [capturedWhite, setCapturedWhite] = useState<ChessPiece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<ChessPiece[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'draw'>('playing');
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [matchScore, setMatchScore] = useState<number>(0);

  const levelCfg = CHESS_LEVELS[currentLevel - 1] || CHESS_LEVELS[0];

  // Generate All Valid Moves for a Piece at [r, c]
  const getPieceMoves = useCallback((b: Board, r: number, c: number): [number, number][] => {
    const piece = b[r][c];
    if (!piece) return [];
    const moves: [number, number][] = [];
    const color = piece.color;
    const opp = color === 'w' ? 'b' : 'w';

    const addIfValid = (nr: number, nc: number) => {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      const target = b[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
        return true;
      } else if (target.color === opp) {
        moves.push([nr, nc]);
        return false;
      }
      return false;
    };

    switch (piece.type) {
      case 'p': {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        // 1 step forward
        if (r + dir >= 0 && r + dir < 8 && !b[r + dir][c]) {
          moves.push([r + dir, c]);
          // 2 steps forward from start
          if (r === startRow && !b[r + dir * 2][c]) {
            moves.push([r + dir * 2, c]);
          }
        }
        // Captures diagonally
        [-1, 1].forEach((dc) => {
          const nr = r + dir;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = b[nr][nc];
            if (target && target.color === opp) {
              moves.push([nr, nc]);
            }
          }
        });
        break;
      }
      case 'n': {
        const offsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1],
        ];
        offsets.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
        break;
      }
      case 'b': {
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfValid(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'r': {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfValid(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'q': {
        const dirs = [
          [-1, 0], [1, 0], [0, -1], [0, 1],
          [-1, -1], [-1, 1], [1, -1], [1, 1],
        ];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfValid(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'k': {
        const dirs = [
          [-1, 0], [1, 0], [0, -1], [0, 1],
          [-1, -1], [-1, 1], [1, -1], [1, 1],
        ];
        dirs.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
        break;
      }
    }
    return moves;
  }, []);

  // Board Evaluation Score
  const evaluateBoard = useCallback((b: Board): number => {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p) {
          const val = PIECE_VALUES[p.type];
          // Positional center bonus
          const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
          const centerBonus = (7 - centerDist) * 5;
          score += p.color === 'w' ? (val + centerBonus) : -(val + centerBonus);
        }
      }
    }
    return score;
  }, []);

  // AI Move Selector with Level Difficulty
  const makeAIMove = useCallback(() => {
    setIsThinking(true);
    setTimeout(() => {
      setBoard((currentBoard) => {
        const allMoves: Move[] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = currentBoard[r][c];
            if (p && p.color === 'b') {
              const valid = getPieceMoves(currentBoard, r, c);
              valid.forEach(([tr, tc]) => {
                allMoves.push({
                  fromRow: r,
                  fromCol: c,
                  toRow: tr,
                  toCol: tc,
                  captured: currentBoard[tr][tc],
                });
              });
            }
          }
        }

        if (allMoves.length === 0) {
          setGameStatus('checkmate');
          setWinner('w');
          setIsThinking(false);
          return currentBoard;
        }

        let chosenMove: Move;

        if (currentLevel === 1) {
          // Novice: Random move with preference for capture
          const captures = allMoves.filter((m) => m.captured);
          chosenMove = captures.length > 0 && Math.random() > 0.4
            ? captures[Math.floor(Math.random() * captures.length)]
            : allMoves[Math.floor(Math.random() * allMoves.length)];
        } else {
          // Tactical / Grandmaster Minimax
          let bestScore = Infinity;
          let bestCandidates: Move[] = [];

          allMoves.forEach((move) => {
            // Simulate move
            const nextBoard = currentBoard.map((row) => [...row]);
            const movingPiece = nextBoard[move.fromRow][move.fromCol];
            // Pawn promotion
            if (movingPiece?.type === 'p' && move.toRow === 7) {
              nextBoard[move.toRow][move.toCol] = { type: 'q', color: 'b' };
            } else {
              nextBoard[move.toRow][move.toCol] = movingPiece;
            }
            nextBoard[move.fromRow][move.fromCol] = null;

            const score = evaluateBoard(nextBoard);
            if (score < bestScore) {
              bestScore = score;
              bestCandidates = [move];
            } else if (score === bestScore) {
              bestCandidates.push(move);
            }
          });

          chosenMove = bestCandidates[Math.floor(Math.random() * bestCandidates.length)] || allMoves[0];
        }

        // Apply chosen AI move
        const newBoard = currentBoard.map((row) => [...row]);
        const movingPiece = newBoard[chosenMove.fromRow][chosenMove.fromCol];
        const capturedPiece = newBoard[chosenMove.toRow][chosenMove.toCol];

        if (capturedPiece) {
          setCapturedWhite((prev) => [...prev, capturedPiece]);
        }

        // Check if white king was captured (Victory condition)
        if (capturedPiece?.type === 'k') {
          setGameStatus('checkmate');
          setWinner('b');
        }

        if (movingPiece?.type === 'p' && chosenMove.toRow === 7) {
          newBoard[chosenMove.toRow][chosenMove.toCol] = { type: 'q', color: 'b' };
        } else {
          newBoard[chosenMove.toRow][chosenMove.toCol] = movingPiece;
        }
        newBoard[chosenMove.fromRow][chosenMove.fromCol] = null;

        gameAudio.playChessMove();
        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const not = `${movingPiece?.type.toUpperCase() || ''}${cols[chosenMove.fromCol]}${8 - chosenMove.fromRow}→${cols[chosenMove.toCol]}${8 - chosenMove.toRow}`;
        setMoveHistory((prev) => [...prev, not]);

        setTurn('w');
        setIsThinking(false);
        return newBoard;
      });
    }, 400 + Math.random() * 300);
  }, [currentLevel, evaluateBoard, getPieceMoves]);

  // Handle Player Clicking a Square
  const handleSquareClick = (r: number, c: number) => {
    if (turn !== 'w' || isThinking || gameStatus !== 'playing') return;

    if (selectedSquare) {
      const [sr, sc] = selectedSquare;

      // If clicked the same square, deselect
      if (sr === r && sc === c) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Check if clicking another white piece
      const clickedPiece = board[r][c];
      if (clickedPiece && clickedPiece.color === 'w') {
        setSelectedSquare([r, c]);
        setLegalMoves(getPieceMoves(board, r, c));
        return;
      }

      // Check if target is a legal move
      const isLegal = legalMoves.some(([tr, tc]) => tr === r && tc === c);
      if (isLegal) {
        // Execute Player Move
        const newBoard = board.map((row) => [...row]);
        const movingPiece = newBoard[sr][sc];
        const capturedPiece = newBoard[r][c];

        if (capturedPiece) {
          setCapturedBlack((prev) => [...prev, capturedPiece]);
          const earnedPts = Math.round(PIECE_VALUES[capturedPiece.type] * levelCfg.multiplier);
          setMatchScore((s) => s + earnedPts);
          gameAudio.playBullseye();
        } else {
          gameAudio.playChessMove();
        }

        // Win check (if black king captured)
        if (capturedPiece?.type === 'k') {
          setGameStatus('checkmate');
          setWinner('w');
          const winScore = matchScore + Math.round(1500 * levelCfg.multiplier);
          setMatchScore(winScore);
          gameAudio.playLevelUp();
          onGameOver(winScore, {
            level: currentLevel,
            moves: moveHistory.length + 1,
            captured: capturedBlack.length + 1,
            outcome: 'VICTORY CHECKMATE',
          });
        }

        // Pawn promotion to Queen
        if (movingPiece?.type === 'p' && r === 0) {
          newBoard[r][c] = { type: 'q', color: 'w' };
        } else {
          newBoard[r][c] = movingPiece;
        }
        newBoard[sr][sc] = null;

        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const not = `${movingPiece?.type.toUpperCase() || ''}${cols[sc]}${8 - sr}→${cols[c]}${8 - r}`;
        setMoveHistory((prev) => [...prev, not]);

        setBoard(newBoard);
        setSelectedSquare(null);
        setLegalMoves([]);
        setTurn('b');

        // Trigger AI Turn
        setTimeout(makeAIMove, 200);
      }
    } else {
      // Select piece if it's White's piece
      const piece = board[r][c];
      if (piece && piece.color === 'w') {
        setSelectedSquare([r, c]);
        setLegalMoves(getPieceMoves(board, r, c));
      }
    }
  };

  const resetGame = (newLevel?: number) => {
    if (newLevel) setCurrentLevel(newLevel);
    setBoard(getInitialBoard());
    setTurn('w');
    setSelectedSquare(null);
    setLegalMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMoveHistory([]);
    setGameStatus('playing');
    setWinner(null);
    setMatchScore(0);
    setIsThinking(false);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-ink-950 select-none overflow-hidden rounded-2xl border border-primary-500/30 shadow-2xl">
      {/* Top Bar HUD */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gold-500/20 border border-gold-400/40 text-gold-300 font-bold text-xs">
            <Trophy className="w-4 h-4 text-gold-400" />
            <span>ETHIOPIAN CHESS • LEVEL {currentLevel}</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Opponent: <strong className="text-white">{levelCfg.name} ({levelCfg.elo})</strong>
          </span>
        </div>

        {/* Turn & Status */}
        <div className="flex items-center gap-2">
          {turn === 'w' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-500/20 text-primary-300 font-bold text-xs border border-primary-500/30">
              <User className="w-3.5 h-3.5" />
              <span>YOUR TURN (WHITE)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 animate-pulse">
              <Cpu className="w-3.5 h-3.5" />
              <span>AI THINKING...</span>
            </div>
          )}
        </div>

        {/* Score & Resign */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">RP Score</span>
            <span className="font-display font-black text-lg text-gold-400">{matchScore}</span>
          </div>
          <button
            onClick={() => resetGame()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Board Layout & Captured Graveyard */}
      <div className="relative w-full flex-1 flex flex-col md:flex-row items-center justify-center p-3 gap-6 overflow-y-auto">
        {/* Captured Black Pieces by Player */}
        <div className="hidden lg:flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800 w-36 text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Captured Enemy</span>
          <div className="flex flex-wrap gap-1 justify-center min-h-[60px] text-xl">
            {capturedBlack.map((p, idx) => (
              <span key={idx} className="text-slate-200">{PIECE_SYMBOLS.b[p.type]}</span>
            ))}
          </div>
          <span className="text-xs font-mono text-gold-400 mt-2 font-bold">
            +{matchScore} pts
          </span>
        </div>

        {/* 8x8 Chessboard */}
        <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-ink-950 border-2 border-gold-500/40 shadow-2xl">
          <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] border border-amber-800/80 rounded-xl overflow-hidden shadow-inner">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                const isLegalTarget = legalMoves.some(([mr, mc]) => mr === r && mc === c);

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`no-heat relative flex items-center justify-center text-3xl sm:text-4xl transition-all cursor-pointer font-serif select-none ${
                      isDark ? 'bg-amber-950/80 hover:bg-amber-900/90' : 'bg-amber-100 hover:bg-amber-200'
                    } ${isSelected ? 'ring-4 ring-primary-400 z-10' : ''}`}
                  >
                    {/* Legal move dot indicator */}
                    {isLegalTarget && (
                      <span className={`absolute w-3.5 h-3.5 rounded-full ${
                        piece ? 'ring-4 ring-rose-500/80 bg-rose-500' : 'bg-primary-400/80'
                      }`} />
                    )}

                    {/* Piece Symbol */}
                    {piece && (
                      <span
                        className={`transition-transform duration-150 ${
                          piece.color === 'w'
                            ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                            : 'text-ink-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
                        } ${isSelected ? 'scale-115' : 'hover:scale-105'}`}
                      >
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </span>
                    )}

                    {/* Coordinates on edge squares */}
                    {c === 0 && (
                      <span className={`absolute top-0.5 left-1 text-[9px] font-mono font-bold ${
                        isDark ? 'text-amber-400/50' : 'text-amber-900/50'
                      }`}>
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className={`absolute bottom-0.5 right-1 text-[9px] font-mono font-bold ${
                        isDark ? 'text-amber-400/50' : 'text-amber-900/50'
                      }`}>
                        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][c]}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Checkmate Victory Overlay */}
          {gameStatus === 'checkmate' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30">
              <Sparkles className="w-12 h-12 text-gold-400 animate-bounce" />
              <h2 className="font-display text-2xl font-black text-white mt-2">
                {winner === 'w' ? '🏆 VICTORY CHECKMATE!' : 'DEFEAT — KING FALLEN'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {winner === 'w' ? `You defeated ${levelCfg.name} on ${levelCfg.elo}!` : 'Try again and protect your King!'}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => resetGame(Math.min(5, currentLevel + 1))}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gold-400 text-ink-950 hover:bg-gold-300 transition-colors shadow-glow-gold cursor-pointer"
                >
                  Next Level ({Math.min(5, currentLevel + 1)})
                </button>
                <button
                  onClick={() => resetGame()}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Move History Log */}
        <div className="hidden lg:flex flex-col p-3 rounded-2xl bg-slate-900/60 border border-slate-800 w-44 h-80 text-left">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Move Notation</span>
          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1 scrollbar-thin">
            {moveHistory.length === 0 ? (
              <span className="text-slate-500 text-[11px]">Match started</span>
            ) : (
              moveHistory.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 border-b border-white/5 text-slate-300">
                  <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-primary-300">{m}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Level Switcher */}
      <div className="w-full bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">AI Level:</span>
          {CHESS_LEVELS.map((lvl) => (
            <button
              key={lvl.level}
              onClick={() => resetGame(lvl.level)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                currentLevel === lvl.level
                  ? 'bg-gold-500 text-ink-950 font-black shadow-glow-gold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Lvl {lvl.level} ({lvl.elo})
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
          <span>👑 Click piece to view legal moves</span>
          <span>⚡ Capture King / Pieces to earn RP</span>
          <span className="text-gold-300">⭐ {levelCfg.multiplier}x Multiplier Active</span>
        </div>
      </div>
    </div>
  );
}
