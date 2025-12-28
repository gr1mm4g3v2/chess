/**
 * Benchmark Manager
 * 
 * Runs AI vs Stockfish games to estimate true ELO rating
 */

import { Chess } from 'chess.js';
import { StockfishEngine } from '../ai/stockfish';
import { NeuralNetwork } from '../ai/neural-net';

export interface BenchmarkResult {
    id: number;
    timestamp: string;
    aiColor: 'white' | 'black';
    aiElo: number;
    stockfishLevel: number;
    stockfishElo: number;
    result: 'ai_win' | 'stockfish_win' | 'draw';
    reason: string;
    moves: number;
    estimatedElo: number;
}

export interface BenchmarkStats {
    totalGames: number;
    aiWins: number;
    stockfishWins: number;
    draws: number;
    estimatedElo: number;
    lastBenchmark: string | null;
}

const benchmarkHistory: BenchmarkResult[] = [];

/**
 * Run a single benchmark game
 */
export async function runBenchmarkGame(
    ai: NeuralNetwork,
    stockfish: StockfishEngine,
    aiPlaysWhite: boolean,
    stockfishLevel: number
): Promise<BenchmarkResult | null> {
    const chess = new Chess();
    stockfish.setSkillLevel(stockfishLevel);

    const aiColor = aiPlaysWhite ? 'white' : 'black';
    let moveCount = 0;
    const maxMoves = 200; // Limit to prevent infinite games

    console.log(`[Benchmark] Starting: AI (${aiColor}) vs Stockfish (level ${stockfishLevel})`);

    while (!chess.isGameOver() && moveCount < maxMoves) {
        const isAITurn = (chess.turn() === 'w') === aiPlaysWhite;

        let move: string | null;

        if (isAITurn) {
            // AI's turn
            move = ai.decideMoveAuto(chess);
        } else {
            // Stockfish's turn
            const sfMove = await stockfish.getBestMove(chess.fen(), 500);
            if (sfMove) {
                // Convert UCI move to SAN
                try {
                    const fromSquare = sfMove.substring(0, 2);
                    const toSquare = sfMove.substring(2, 4);
                    const promotion = sfMove.length > 4 ? sfMove[4] : undefined;

                    const moveObj = chess.move({
                        from: fromSquare,
                        to: toSquare,
                        promotion: promotion as any
                    });
                    move = moveObj?.san || null;

                    // Undo so we can apply below
                    if (moveObj) chess.undo();
                } catch {
                    move = null;
                }
            } else {
                move = null;
            }
        }

        if (!move) {
            console.error('[Benchmark] No valid move returned');
            break;
        }

        try {
            chess.move(move);
            moveCount++;
        } catch (e) {
            console.error('[Benchmark] Invalid move:', move, e);
            break;
        }
    }

    // Determine result
    let result: 'ai_win' | 'stockfish_win' | 'draw' = 'draw';
    let reason = 'Unknown';

    if (chess.isCheckmate()) {
        // Loser is the one whose turn it is
        const loserIsWhite = chess.turn() === 'w';
        const aiLost = loserIsWhite === aiPlaysWhite;
        result = aiLost ? 'stockfish_win' : 'ai_win';
        reason = 'Checkmate';
    } else if (chess.isDraw()) {
        result = 'draw';
        if (chess.isStalemate()) reason = 'Stalemate';
        else if (chess.isThreefoldRepetition()) reason = 'Threefold Repetition';
        else if (chess.isInsufficientMaterial()) reason = 'Insufficient Material';
        else reason = 'Draw';
    } else if (moveCount >= maxMoves) {
        result = 'draw';
        reason = 'Move limit reached';
    }

    // Calculate estimated ELO
    const stockfishElo = StockfishEngine.skillLevelToElo(stockfishLevel);
    let estimatedElo = ai.getStats().elo;

    if (result === 'ai_win') {
        estimatedElo = Math.max(estimatedElo, stockfishElo + 50);
    } else if (result === 'stockfish_win') {
        estimatedElo = Math.min(estimatedElo, stockfishElo - 50);
    } else {
        // Draw - ELO is roughly equal to opponent
        estimatedElo = (estimatedElo + stockfishElo) / 2;
    }

    const benchmarkResult: BenchmarkResult = {
        id: benchmarkHistory.length + 1,
        timestamp: new Date().toISOString(),
        aiColor,
        aiElo: ai.getStats().elo,
        stockfishLevel,
        stockfishElo,
        result,
        reason,
        moves: moveCount,
        estimatedElo: Math.round(estimatedElo)
    };

    benchmarkHistory.push(benchmarkResult);
    console.log(`[Benchmark] Complete: ${result} (${reason}) after ${moveCount} moves`);

    return benchmarkResult;
}

/**
 * Get benchmark statistics
 */
export function getBenchmarkStats(): BenchmarkStats {
    const aiWins = benchmarkHistory.filter(r => r.result === 'ai_win').length;
    const stockfishWins = benchmarkHistory.filter(r => r.result === 'stockfish_win').length;
    const draws = benchmarkHistory.filter(r => r.result === 'draw').length;

    // Calculate weighted average estimated ELO
    let estimatedElo = 800;
    if (benchmarkHistory.length > 0) {
        const recentResults = benchmarkHistory.slice(-10);
        estimatedElo = Math.round(
            recentResults.reduce((sum, r) => sum + r.estimatedElo, 0) / recentResults.length
        );
    }

    return {
        totalGames: benchmarkHistory.length,
        aiWins,
        stockfishWins,
        draws,
        estimatedElo,
        lastBenchmark: benchmarkHistory.length > 0
            ? benchmarkHistory[benchmarkHistory.length - 1].timestamp
            : null
    };
}

/**
 * Get benchmark history
 */
export function getBenchmarkHistory(): BenchmarkResult[] {
    return [...benchmarkHistory];
}

/**
 * Run a quick benchmark (3 games at adaptive difficulty)
 */
export async function runQuickBenchmark(
    ai: NeuralNetwork,
    stockfish: StockfishEngine
): Promise<BenchmarkStats> {
    // Start at skill level based on AI's current ELO estimate
    const startLevel = StockfishEngine.eloToSkillLevel(ai.getStats().elo);

    // Run 3 games: one at estimated level, one above, one below
    const levels = [
        Math.max(0, startLevel - 2),
        startLevel,
        Math.min(20, startLevel + 2)
    ];

    for (let i = 0; i < levels.length; i++) {
        const playWhite = i % 2 === 0;
        await runBenchmarkGame(ai, stockfish, playWhite, levels[i]);
    }

    return getBenchmarkStats();
}
