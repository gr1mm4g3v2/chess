/**
 * Blunder Detection
 * 
 * Tracks evaluation changes and flags blunders (big drops) or brilliant moves (big gains).
 */

export type MoveQuality = 'normal' | 'good' | 'excellent' | 'brilliant' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveEvaluation {
    moveNumber: number;
    move: string;
    evalBefore: number;
    evalAfter: number;
    evalChange: number;
    quality: MoveQuality;
    player: 'white' | 'black';
}

// Thresholds for evaluation changes (in normalized units, -1 to 1 scale)
const THRESHOLDS = {
    BLUNDER: -0.15,      // Losing more than ~4.5 pawns worth
    MISTAKE: -0.08,      // Losing ~2.4 pawns worth
    INACCURACY: -0.04,   // Losing ~1.2 pawns worth
    GOOD: 0.02,          // Gaining ~0.6 pawns worth
    EXCELLENT: 0.05,     // Gaining ~1.5 pawns worth
    BRILLIANT: 0.10,     // Gaining ~3 pawns worth (usually a tactic)
};

/**
 * Classify a move's quality based on evaluation change
 * Note: evalChange is from the perspective of the player who just moved
 */
export function classifyMove(evalChange: number): MoveQuality {
    if (evalChange <= THRESHOLDS.BLUNDER) return 'blunder';
    if (evalChange <= THRESHOLDS.MISTAKE) return 'mistake';
    if (evalChange <= THRESHOLDS.INACCURACY) return 'inaccuracy';
    if (evalChange >= THRESHOLDS.BRILLIANT) return 'brilliant';
    if (evalChange >= THRESHOLDS.EXCELLENT) return 'excellent';
    if (evalChange >= THRESHOLDS.GOOD) return 'good';
    return 'normal';
}

/**
 * Get display info for move quality
 */
export function getMoveQualityInfo(quality: MoveQuality): {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
} {
    switch (quality) {
        case 'brilliant':
            return { label: 'Brilliant!', icon: '🌟', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30' };
        case 'excellent':
            return { label: 'Excellent', icon: '✨', color: 'text-emerald-400', bgColor: 'bg-emerald-900/30' };
        case 'good':
            return { label: 'Good', icon: '✓', color: 'text-green-400', bgColor: 'bg-green-900/30' };
        case 'inaccuracy':
            return { label: 'Inaccuracy', icon: '?!', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' };
        case 'mistake':
            return { label: 'Mistake', icon: '?', color: 'text-orange-400', bgColor: 'bg-orange-900/30' };
        case 'blunder':
            return { label: 'Blunder!', icon: '??', color: 'text-red-400', bgColor: 'bg-red-900/30' };
        default:
            return { label: '', icon: '', color: '', bgColor: '' };
    }
}

/**
 * Blunder detector class to track evaluation history during a game
 */
export class BlunderDetector {
    private evalHistory: number[] = [];
    private moveHistory: MoveEvaluation[] = [];
    private lastMoveNumber: number = 0;

    /**
     * Record a position evaluation
     */
    recordEval(evaluation: number): void {
        this.evalHistory.push(evaluation);
    }

    /**
     * Evaluate a move that was just made
     * @param move The SAN notation of the move
     * @param evalBefore Evaluation before the move (from white's perspective)
     * @param evalAfter Evaluation after the move (from white's perspective)
     * @param didWhiteMove Whether white made this move
     */
    evaluateMove(
        move: string,
        evalBefore: number,
        evalAfter: number,
        didWhiteMove: boolean
    ): MoveEvaluation {
        this.lastMoveNumber++;

        // Calculate eval change from the perspective of the player who moved
        // If white moved, positive change = good for white
        // If black moved, we flip the perspective (negative change = good for black)
        let evalChange = evalAfter - evalBefore;
        if (!didWhiteMove) {
            evalChange = -evalChange; // Flip for black's perspective
        }

        const quality = classifyMove(evalChange);

        const moveEval: MoveEvaluation = {
            moveNumber: this.lastMoveNumber,
            move,
            evalBefore,
            evalAfter,
            evalChange,
            quality,
            player: didWhiteMove ? 'white' : 'black'
        };

        this.moveHistory.push(moveEval);
        return moveEval;
    }

    /**
     * Get all recorded move evaluations
     */
    getMoveHistory(): MoveEvaluation[] {
        return [...this.moveHistory];
    }

    /**
     * Get blunders and mistakes only
     */
    getBlundersAndMistakes(): MoveEvaluation[] {
        return this.moveHistory.filter(m =>
            m.quality === 'blunder' || m.quality === 'mistake'
        );
    }

    /**
     * Get brilliant and excellent moves
     */
    getBrilliantMoves(): MoveEvaluation[] {
        return this.moveHistory.filter(m =>
            m.quality === 'brilliant' || m.quality === 'excellent'
        );
    }

    /**
     * Get game statistics
     */
    getStats(): {
        totalMoves: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
        goodMoves: number;
        excellentMoves: number;
        brilliantMoves: number;
    } {
        const counts = {
            totalMoves: this.moveHistory.length,
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            goodMoves: 0,
            excellentMoves: 0,
            brilliantMoves: 0
        };

        for (const m of this.moveHistory) {
            switch (m.quality) {
                case 'blunder': counts.blunders++; break;
                case 'mistake': counts.mistakes++; break;
                case 'inaccuracy': counts.inaccuracies++; break;
                case 'good': counts.goodMoves++; break;
                case 'excellent': counts.excellentMoves++; break;
                case 'brilliant': counts.brilliantMoves++; break;
            }
        }

        return counts;
    }

    /**
     * Reset for new game
     */
    reset(): void {
        this.evalHistory = [];
        this.moveHistory = [];
        this.lastMoveNumber = 0;
    }
}
