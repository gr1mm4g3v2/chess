/**
 * Game Phase Detection
 * 
 * Determines whether the game is in opening, middlegame, or endgame phase.
 */

import { Chess } from 'chess.js';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/**
 * Detect the current game phase based on:
 * - Move count
 * - Piece count and development
 * - Queen presence
 * - Material balance
 */
export function detectGamePhase(chess: Chess): GamePhase {
    const history = chess.history();
    const moveCount = history.length;
    const board = chess.board();

    // Count pieces and calculate material
    let whiteQueens = 0, blackQueens = 0;
    let whiteMaterial = 0, blackMaterial = 0;
    let totalPieces = 0;

    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    for (const row of board) {
        for (const square of row) {
            if (square) {
                totalPieces++;
                const value = pieceValues[square.type] || 0;

                if (square.color === 'w') {
                    whiteMaterial += value;
                    if (square.type === 'q') whiteQueens++;
                } else {
                    blackMaterial += value;
                    if (square.type === 'q') blackQueens++;
                }
            }
        }
    }

    const totalQueens = whiteQueens + blackQueens;

    // Opening: first 10 full moves (20 half-moves) typically
    if (moveCount <= 20 && totalPieces >= 28) {
        return 'opening';
    }

    // Endgame criteria:
    // 1. No queens on board
    // 2. OR very low material (≤ 13 points per side on average)
    // 3. OR very few pieces (≤ 10 pieces total)
    if (
        totalQueens === 0 ||
        (whiteMaterial + blackMaterial) / 2 <= 13 ||
        totalPieces <= 10
    ) {
        return 'endgame';
    }

    // Everything else is middlegame
    return 'middlegame';
}

/**
 * Get phase display info
 */
export function getPhaseInfo(phase: GamePhase): { label: string; icon: string; color: string } {
    switch (phase) {
        case 'opening':
            return { label: 'Opening', icon: '📖', color: 'text-cyan-400' };
        case 'middlegame':
            return { label: 'Middlegame', icon: '⚔️', color: 'text-orange-400' };
        case 'endgame':
            return { label: 'Endgame', icon: '🏁', color: 'text-purple-400' };
    }
}
