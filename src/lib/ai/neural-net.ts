import { Chess, Move } from 'chess.js';

export interface NetworkStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  positionsLearned: number;
  explorationRate: number;
}

export interface QTableEntry {
  value: number;
  visits: number;
}

export interface AIState {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  qTable: Record<string, Record<string, QTableEntry>>; // position -> move -> value
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

  // Q-table: maps position hash -> move -> Q-value
  private qTable: Map<string, Map<string, QTableEntry>> = new Map();

  // Move history for current game (for learning after game ends)
  private gameHistory: { positionHash: string; move: string; reward: number }[] = [];

  public readonly color: 'white' | 'black';

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

  // Evaluate position for eval bar (material count)
  public evaluatePosition(chess: Chess): number {
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const board = chess.board();
    let score = 0;

    for (const row of board) {
      for (const square of row) {
        if (square) {
          const value = pieceValues[square.type] || 0;
          score += square.color === 'w' ? value : -value;
        }
      }
    }

    return Math.max(-1, Math.min(1, score / 30));
  }

  // Evaluate a move's immediate value
  private evaluateMove(move: Move): number {
    let score = 0;
    if (move.captured) {
      const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score += (values[move.captured] || 0) * 0.1;
    }
    if (move.promotion) score += 0.9;
    if (move.san.includes('+')) score += 0.1;
    if (move.san.includes('#')) score += 1.0;
    return score;
  }

  // Decide move using epsilon-greedy Q-learning
  public decideMove(chess: Chess): string | null {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    const posHash = this.hashPosition(chess);

    // Epsilon-greedy: explore or exploit
    if (Math.random() < this.explorationRate) {
      // Explore: pick random move, but weight by immediate value
      const weights = moves.map(m => 1 + this.evaluateMove(m));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;

      for (let i = 0; i < moves.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          const selectedMove = moves[i].san;
          this.gameHistory.push({ positionHash: posHash, move: selectedMove, reward: this.evaluateMove(moves[i]) });
          return selectedMove;
        }
      }
    }

    // Exploit: pick best Q-value move
    let bestMove = moves[0];
    let bestValue = -Infinity;

    for (const move of moves) {
      const qValue = this.getQValue(posHash, move.san) + this.evaluateMove(move);
      if (qValue > bestValue) {
        bestValue = qValue;
        bestMove = move;
      }
    }

    this.gameHistory.push({ positionHash: posHash, move: bestMove.san, reward: this.evaluateMove(bestMove) });
    return bestMove.san;
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
    } else if (result === 'loss') {
      this.losses++;
      this.elo = Math.max(100, this.elo - 10);
    } else {
      this.draws++;
      this.elo += 2;
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
      explorationRate: Math.round(this.explorationRate * 100)
    };
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
      qTable: qTableObj
    };
  }

  // Load state from persistence
  public importState(state: AIState): void {
    this.elo = state.elo;
    this.gamesPlayed = state.gamesPlayed;
    this.wins = state.wins;
    this.losses = state.losses;
    this.draws = state.draws;

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
