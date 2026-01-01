import { Chess, Move } from 'chess.js';
import { getBookMove, isInBook } from './openings';
import { mcts } from './mcts';

// AI decision mode
export type AIMode = 'q-learning' | 'mcts' | 'hybrid';

export interface NetworkStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  positionsLearned: number;
  explorationRate: number;
  currentStreak: number; // positive = wins, negative = losses
  bestWinStreak: number;
  bestLossStreak: number;
}

export interface QTableEntry {
  value: number;
  visits: number;
}

// Move analysis for AI commentary
export interface MoveAnalysis {
  move: string;
  san: string;
  qValue: number;
  immediateValue: number;
  totalScore: number;
  visits: number;
  isCapture: boolean;
  isCheck: boolean;
  isPromotion: boolean;
  isCastling: boolean;
  tags: string[]; // e.g., "developing", "defensive", "aggressive"
}

export interface AIState {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  qTable: Record<string, Record<string, QTableEntry>>; // position -> move -> value
  currentStreak: number;
  bestWinStreak: number;
  bestLossStreak: number;
}

const MAX_POSITIONS = 10000;
const INITIAL_EXPLORATION = 0.3;
const MIN_EXPLORATION = 0.05;
const EXPLORATION_DECAY = 0.995;
const LEARNING_RATE = 0.1;
const DISCOUNT_FACTOR = 0.9;

export class NeuralNetwork {
  private elo: number = 800;
  private gamesPlayed: number = 0;
  private wins: number = 0;
  private losses: number = 0;
  private draws: number = 0;
  private explorationRate: number = INITIAL_EXPLORATION;
  private currentStreak: number = 0; // positive = wins, negative = losses
  private bestWinStreak: number = 0;
  private bestLossStreak: number = 0;

  // Q-table: maps position hash -> move -> Q-value
  private qTable: Map<string, Map<string, QTableEntry>> = new Map();

  // Move history for current game (for learning after game ends)
  private gameHistory: { positionHash: string; move: string; reward: number }[] = [];

  public readonly color: 'white' | 'black';
  private mode: AIMode = 'hybrid'; // Default to hybrid mode
  private mctsSimulations: number = 30; // Number of MCTS simulations per move

  constructor(color: 'white' | 'black', initialElo: number = 800) {
    this.color = color;
    this.elo = initialElo;
  }

  // Create a simplified hash of the position
  private hashPosition(chess: Chess): string {
    // Use FEN but remove move counters for simpler hashing
    const fen = chess.fen();
    return fen.split(' ').slice(0, 4).join(' ');
  }

  // Get Q-value for a position-move pair
  private getQValue(posHash: string, move: string): number {
    const posEntry = this.qTable.get(posHash);
    if (!posEntry) return 0;
    const moveEntry = posEntry.get(move);
    return moveEntry ? moveEntry.value : 0;
  }

  // Set Q-value for a position-move pair
  private setQValue(posHash: string, move: string, value: number): void {
    if (!this.qTable.has(posHash)) {
      // Check if we need to prune
      if (this.qTable.size >= MAX_POSITIONS) {
        this.pruneQTable();
      }
      this.qTable.set(posHash, new Map());
    }

    const posEntry = this.qTable.get(posHash)!;
    const existing = posEntry.get(move);
    posEntry.set(move, {
      value,
      visits: existing ? existing.visits + 1 : 1
    });
  }

  // Prune least-visited positions when table is full
  private pruneQTable(): void {
    const entries: [string, number][] = [];
    this.qTable.forEach((moves, pos) => {
      let totalVisits = 0;
      moves.forEach(entry => totalVisits += entry.visits);
      entries.push([pos, totalVisits]);
    });

    // Sort by visits and remove bottom 20%
    entries.sort((a, b) => a[1] - b[1]);
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.qTable.delete(entries[i][0]);
    }
  }

  // Evaluate position for eval bar (material count + endgame adjustments)
  public evaluatePosition(chess: Chess): number {
    const board = chess.board();
    let score = 0;

    // Check if we're in an endgame
    const endgame = this.isEndgame(chess);

    // Material evaluation with endgame piece value adjustments
    const pieceValues: Record<string, number> = endgame
      ? { p: 1.5, n: 2.5, b: 3.5, r: 5, q: 9, k: 0 }  // Pawns and bishops worth more in endgame
      : { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (const row of board) {
      for (const square of row) {
        if (square) {
          const value = pieceValues[square.type] || 0;
          score += square.color === 'w' ? value : -value;
        }
      }
    }

    // Add endgame-specific evaluation
    if (endgame) {
      score += this.evaluateEndgame(chess);
    }

    return Math.max(-1, Math.min(1, score / 30));
  }

  // Detect if we're in an endgame
  private isEndgame(chess: Chess): boolean {
    const board = chess.board();
    let whiteQueens = 0, blackQueens = 0;
    let whitePieces = 0, blackPieces = 0;
    let totalMaterial = 0;

    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (const row of board) {
      for (const square of row) {
        if (square) {
          const value = pieceValues[square.type] || 0;
          totalMaterial += value;

          if (square.type === 'q') {
            if (square.color === 'w') whiteQueens++;
            else blackQueens++;
          } else if (square.type !== 'k' && square.type !== 'p') {
            if (square.color === 'w') whitePieces++;
            else blackPieces++;
          }
        }
      }
    }

    // Endgame conditions:
    // 1. No queens, OR
    // 2. Each side has ≤1 minor piece with queen, OR
    // 3. Total material is low (excluding kings)
    const noQueens = whiteQueens === 0 && blackQueens === 0;
    const lightQueenEndgame = (whiteQueens <= 1 && whitePieces <= 1) &&
      (blackQueens <= 1 && blackPieces <= 1);
    const lowMaterial = totalMaterial <= 26; // Roughly queens traded + some pieces

    return noQueens || lightQueenEndgame || lowMaterial;
  }

  // Endgame-specific evaluation bonuses
  private evaluateEndgame(chess: Chess): number {
    const board = chess.board();
    let score = 0;

    // Find king positions
    let whiteKingPos = { row: 0, col: 0 };
    let blackKingPos = { row: 0, col: 0 };
    const whitePawns: { row: number; col: number }[] = [];
    const blackPawns: { row: number; col: number }[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = board[row][col];
        if (square) {
          if (square.type === 'k') {
            if (square.color === 'w') whiteKingPos = { row, col };
            else blackKingPos = { row, col };
          } else if (square.type === 'p') {
            if (square.color === 'w') whitePawns.push({ row, col });
            else blackPawns.push({ row, col });
          }
        }
      }
    }

    // King centralization bonus (center squares are more valuable)
    const centerDistance = (pos: { row: number; col: number }) => {
      const centerRow = 3.5, centerCol = 3.5;
      return Math.abs(pos.row - centerRow) + Math.abs(pos.col - centerCol);
    };

    // White king centralization (bonus for being closer to center)
    score += (7 - centerDistance(whiteKingPos)) * 0.1;
    // Black king centralization penalty (from white's perspective)
    score -= (7 - centerDistance(blackKingPos)) * 0.1;

    // Passed pawn detection and bonus
    for (const pawn of whitePawns) {
      if (this.isPassedPawn(board, pawn, 'w')) {
        // Bonus based on how far advanced (row 1 = rank 7 for white = closer to promotion)
        const advancementBonus = (7 - pawn.row) * 0.15;
        score += 0.3 + advancementBonus;
      }
    }

    for (const pawn of blackPawns) {
      if (this.isPassedPawn(board, pawn, 'b')) {
        // Bonus based on how far advanced (row 6 = rank 2 for black = closer to promotion)
        const advancementBonus = pawn.row * 0.15;
        score -= 0.3 + advancementBonus;
      }
    }

    // King proximity to pawns (important for pawn races)
    for (const pawn of whitePawns) {
      const whiteKingDist = Math.abs(whiteKingPos.row - pawn.row) + Math.abs(whiteKingPos.col - pawn.col);
      const blackKingDist = Math.abs(blackKingPos.row - pawn.row) + Math.abs(blackKingPos.col - pawn.col);
      // Bonus if our king is closer to support our pawn
      score += (blackKingDist - whiteKingDist) * 0.05;
    }

    for (const pawn of blackPawns) {
      const whiteKingDist = Math.abs(whiteKingPos.row - pawn.row) + Math.abs(whiteKingPos.col - pawn.col);
      const blackKingDist = Math.abs(blackKingPos.row - pawn.row) + Math.abs(blackKingPos.col - pawn.col);
      // Penalty if their king is closer to their pawn
      score -= (whiteKingDist - blackKingDist) * 0.05;
    }

    return score;
  }

  // Check if a pawn is passed (no enemy pawns blocking or attacking its path)
  private isPassedPawn(
    board: ({ type: string; color: string } | null)[][],
    pawn: { row: number; col: number },
    color: 'w' | 'b'
  ): boolean {
    const direction = color === 'w' ? -1 : 1; // White pawns move up (decreasing row)
    const enemyColor = color === 'w' ? 'b' : 'w';
    const startRow = color === 'w' ? pawn.row - 1 : pawn.row + 1;
    const endRow = color === 'w' ? 0 : 7;

    // Check the file and adjacent files for enemy pawns
    for (let row = startRow; color === 'w' ? row >= endRow : row <= endRow; row += direction) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        const col = pawn.col + colOffset;
        if (col >= 0 && col < 8) {
          const square = board[row][col];
          if (square && square.type === 'p' && square.color === enemyColor) {
            return false; // Blocked or can be attacked by enemy pawn
          }
        }
      }
    }
    return true;
  }

  // Get detailed analysis of all candidate moves for AI commentary
  public getMoveAnalysis(chess: Chess): MoveAnalysis[] {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return [];

    const posHash = this.hashPosition(chess);
    const analysis: MoveAnalysis[] = [];

    for (const move of moves) {
      const qValue = this.getQValue(posHash, move.san);
      const immediateValue = this.evaluateMove(move, chess);
      const totalScore = qValue + immediateValue;
      const posEntry = this.qTable.get(posHash);
      const visits = posEntry?.get(move.san)?.visits || 0;

      // Determine move tags
      const tags: string[] = [];

      if (move.captured) {
        const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        const capturedValue = values[move.captured] || 0;
        const pieceValue = values[move.piece] || 0;
        if (capturedValue > pieceValue) tags.push('winning capture');
        else if (capturedValue < pieceValue) tags.push('sacrifice');
        else tags.push('trade');
      }

      if (move.san.includes('+')) tags.push('check');
      if (move.san.includes('#')) tags.push('checkmate');
      if (move.promotion) tags.push('promotion');
      if (move.san === 'O-O' || move.san === 'O-O-O') tags.push('castling');

      // Development moves (knights and bishops from starting squares)
      if (['n', 'b'].includes(move.piece)) {
        if (['b1', 'g1', 'c1', 'f1', 'b8', 'g8', 'c8', 'f8'].includes(move.from)) {
          tags.push('development');
        }
      }

      // Center control
      if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
        tags.push('center control');
      }

      if (tags.length === 0) tags.push('quiet move');

      analysis.push({
        move: move.from + move.to + (move.promotion || ''),
        san: move.san,
        qValue,
        immediateValue,
        totalScore,
        visits,
        isCapture: !!move.captured,
        isCheck: move.san.includes('+') || move.san.includes('#'),
        isPromotion: !!move.promotion,
        isCastling: move.san === 'O-O' || move.san === 'O-O-O',
        tags
      });
    }

    // Sort by total score descending
    return analysis.sort((a, b) => b.totalScore - a.totalScore);
  }

  // Evaluate a move's immediate value (with optional endgame awareness)
  private evaluateMove(move: Move, chess?: Chess): number {
    let score = 0;

    // Basic capture value
    if (move.captured) {
      const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score += (values[move.captured] || 0) * 0.1;
    }

    // Promotion is always great
    if (move.promotion) score += 0.9;

    // Checks
    if (move.san.includes('+')) score += 0.1;
    if (move.san.includes('#')) score += 1.0;

    // Endgame-specific bonuses
    if (chess && this.isEndgame(chess)) {
      // Pawn pushes are more valuable in endgames
      if (move.piece === 'p') {
        const toRank = parseInt(move.to[1]);
        const isWhite = chess.turn() === 'w';
        // Bonus for advancing pawns toward promotion
        if (isWhite) {
          score += (toRank - 2) * 0.05; // Rank 7 = 0.25 bonus
        } else {
          score += (7 - toRank) * 0.05; // Rank 2 = 0.25 bonus
        }
      }

      // King centralization is valuable
      if (move.piece === 'k') {
        const toFile = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
        const toRank = parseInt(move.to[1]) - 1;
        const centerDist = Math.abs(toFile - 3.5) + Math.abs(toRank - 3.5);
        score += (7 - centerDist) * 0.02;
      }
    }

    return score;
  }

  // Decide move using opening book + epsilon-greedy Q-learning
  public decideMove(chess: Chess): string | null {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    const fen = chess.fen();
    const posHash = this.hashPosition(chess);

    // Try opening book first (only if not exploring and position is in book)
    if (isInBook(fen) && Math.random() > this.explorationRate * 0.5) {
      const bookMove = getBookMove(fen);
      if (bookMove && moves.some(m => m.san === bookMove)) {
        console.log(`[${this.color}] Book move: ${bookMove}`);
        // Don't add to game history for learning - book moves are established theory
        return bookMove;
      }
    }

    // Epsilon-greedy: explore or exploit
    if (Math.random() < this.explorationRate) {
      // Explore: pick random move, but weight by immediate value
      const weights = moves.map(m => 1 + this.evaluateMove(m, chess));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;

      for (let i = 0; i < moves.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          const selectedMove = moves[i].san;
          this.gameHistory.push({ positionHash: posHash, move: selectedMove, reward: this.evaluateMove(moves[i], chess) });
          return selectedMove;
        }
      }
    }

    // Exploit: pick best Q-value move
    let bestMove = moves[0];
    let bestValue = -Infinity;

    for (const move of moves) {
      const qValue = this.getQValue(posHash, move.san) + this.evaluateMove(move, chess);
      if (qValue > bestValue) {
        bestValue = qValue;
        bestMove = move;
      }
    }

    this.gameHistory.push({ positionHash: posHash, move: bestMove.san, reward: this.evaluateMove(bestMove, chess) });
    return bestMove.san;
  }

  // Decide move using MCTS with Q-value bias
  public decideMoveWithMCTS(chess: Chess): string | null {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    const fen = chess.fen();
    const posHash = this.hashPosition(chess);

    // Check opening book first
    if (isInBook(fen)) {
      const bookMove = getBookMove(fen);
      if (bookMove && moves.some(m => m.san === bookMove)) {
        console.log(`[${this.color}] Book move: ${bookMove}`);
        return bookMove;
      }
    }

    // Use MCTS with Q-value bias for hybrid mode
    const qBias = this.mode === 'hybrid'
      ? (move: string) => this.getQValue(posHash, move)
      : undefined;

    const mctsMove = mcts(fen, this.mctsSimulations, qBias);

    if (mctsMove) {
      // Record for learning
      const moveObj = moves.find(m => m.san === mctsMove);
      const reward = moveObj ? this.evaluateMove(moveObj, chess) : 0;
      this.gameHistory.push({ positionHash: posHash, move: mctsMove, reward });
      return mctsMove;
    }

    // Fallback to Q-learning if MCTS fails
    return this.decideMove(chess);
  }

  // Public method to decide move based on current mode
  public decideMoveAuto(chess: Chess): string | null {
    if (this.mode === 'mcts' || this.mode === 'hybrid') {
      return this.decideMoveWithMCTS(chess);
    }
    return this.decideMove(chess);
  }

  // Set AI mode
  public setMode(mode: AIMode): void {
    this.mode = mode;
    console.log(`[${this.color}] AI mode set to: ${mode}`);
  }

  // Get current mode
  public getMode(): AIMode {
    return this.mode;
  }

  // Set MCTS simulation count
  public setMCTSSimulations(count: number): void {
    this.mctsSimulations = Math.max(10, Math.min(200, count));
  }

  // Called after game ends to update Q-values
  public learn(result: 'win' | 'loss' | 'draw'): void {
    const finalReward = result === 'win' ? 1.0 : result === 'loss' ? -1.0 : 0.1;

    // Propagate rewards backwards through game history
    let cumulativeReward = finalReward;

    for (let i = this.gameHistory.length - 1; i >= 0; i--) {
      const { positionHash, move, reward } = this.gameHistory[i];

      const oldQ = this.getQValue(positionHash, move);
      const newQ = oldQ + LEARNING_RATE * (cumulativeReward - oldQ);
      this.setQValue(positionHash, move, newQ);

      // Decay reward as we go back in time
      cumulativeReward = reward + DISCOUNT_FACTOR * cumulativeReward;
    }

    // Clear history for next game
    this.gameHistory = [];

    // Decay exploration rate
    this.explorationRate = Math.max(MIN_EXPLORATION, this.explorationRate * EXPLORATION_DECAY);
  }

  public updateStats(result: 'win' | 'loss' | 'draw'): void {
    this.gamesPlayed++;
    if (result === 'win') {
      this.wins++;
      this.elo += 15 + Math.random() * 5;
      // Update streak
      this.currentStreak = this.currentStreak > 0 ? this.currentStreak + 1 : 1;
      this.bestWinStreak = Math.max(this.bestWinStreak, this.currentStreak);
    } else if (result === 'loss') {
      this.losses++;
      this.elo = Math.max(100, this.elo - 10);
      // Update streak
      this.currentStreak = this.currentStreak < 0 ? this.currentStreak - 1 : -1;
      this.bestLossStreak = Math.max(this.bestLossStreak, Math.abs(this.currentStreak));
    } else {
      this.draws++;
      this.elo += 2;
      // Draws reset the streak
      this.currentStreak = 0;
    }
  }

  public getStats(): NetworkStats {
    return {
      elo: Math.floor(this.elo),
      gamesPlayed: this.gamesPlayed,
      wins: this.wins,
      losses: this.losses,
      draws: this.draws,
      positionsLearned: this.qTable.size,
      explorationRate: Math.round(this.explorationRate * 100),
      currentStreak: this.currentStreak,
      bestWinStreak: this.bestWinStreak,
      bestLossStreak: this.bestLossStreak
    };
  }

  // Get heatmap data - aggregated Q-values by destination square
  public getHeatmapData(): Record<string, number> {
    const squareValues: Record<string, { sum: number; count: number }> = {};

    // Initialize all squares
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const file of files) {
      for (const rank of ranks) {
        squareValues[file + rank] = { sum: 0, count: 0 };
      }
    }

    // Aggregate Q-values by destination square
    this.qTable.forEach((moves) => {
      moves.forEach((entry, moveSan) => {
        // Extract destination square from SAN (last 2 chars usually)
        const match = moveSan.match(/([a-h][1-8])/g);
        if (match) {
          const destSquare = match[match.length - 1];
          if (squareValues[destSquare]) {
            squareValues[destSquare].sum += entry.value;
            squareValues[destSquare].count += 1;
          }
        }
      });
    });

    // Calculate averages and normalize
    const result: Record<string, number> = {};
    let maxVal = 0;
    let minVal = 0;

    for (const square in squareValues) {
      const { sum, count } = squareValues[square];
      result[square] = count > 0 ? sum / count : 0;
      maxVal = Math.max(maxVal, result[square]);
      minVal = Math.min(minVal, result[square]);
    }

    // Normalize to -1 to 1 range
    const range = Math.max(Math.abs(maxVal), Math.abs(minVal)) || 1;
    for (const square in result) {
      result[square] = result[square] / range;
    }

    return result;
  }

  // Serialize state for persistence
  public exportState(): AIState {
    const qTableObj: Record<string, Record<string, QTableEntry>> = {};
    this.qTable.forEach((moves, pos) => {
      qTableObj[pos] = {};
      moves.forEach((entry, move) => {
        qTableObj[pos][move] = entry;
      });
    });

    return {
      elo: Math.floor(this.elo),
      gamesPlayed: this.gamesPlayed,
      wins: this.wins,
      losses: this.losses,
      draws: this.draws,
      qTable: qTableObj,
      currentStreak: this.currentStreak,
      bestWinStreak: this.bestWinStreak,
      bestLossStreak: this.bestLossStreak
    };
  }

  // Load state from persistence
  public importState(state: AIState): void {
    this.elo = state.elo;
    this.gamesPlayed = state.gamesPlayed;
    this.wins = state.wins;
    this.losses = state.losses;
    this.draws = state.draws;
    this.currentStreak = state.currentStreak || 0;
    this.bestWinStreak = state.bestWinStreak || 0;
    this.bestLossStreak = state.bestLossStreak || 0;

    this.qTable = new Map();
    for (const pos in state.qTable) {
      const moves = new Map<string, QTableEntry>();
      for (const move in state.qTable[pos]) {
        moves.set(move, state.qTable[pos][move]);
      }
      this.qTable.set(pos, moves);
    }

    // Adjust exploration based on experience
    this.explorationRate = Math.max(MIN_EXPLORATION, INITIAL_EXPLORATION * Math.pow(EXPLORATION_DECAY, this.gamesPlayed));

    console.log(`[${this.color}] Loaded: ELO ${this.elo}, ${this.gamesPlayed} games, ${this.qTable.size} positions learned`);
  }
}
