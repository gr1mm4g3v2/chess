/**
 * Monte Carlo Tree Search (MCTS) Implementation for Chess AI
 * 
 * Uses UCB1 (Upper Confidence Bound) for tree exploration.
 * Integrates with Q-learning values for move evaluation bias.
 */

import { Chess, Move } from 'chess.js';

// MCTS Configuration
const EXPLORATION_CONSTANT = 1.41; // √2 for UCB1
const DEFAULT_SIMULATIONS = 50;
const MAX_SIMULATION_DEPTH = 50;

interface MCTSNode {
    move: string | null;  // null for root
    parent: MCTSNode | null;
    children: MCTSNode[];
    visits: number;
    wins: number;
    untriedMoves: string[];
    fen: string;
}

/**
 * Create a new MCTS node
 */
function createNode(
    fen: string,
    move: string | null = null,
    parent: MCTSNode | null = null
): MCTSNode {
    const chess = new Chess(fen);
    const legalMoves = chess.moves();

    return {
        move,
        parent,
        children: [],
        visits: 0,
        wins: 0,
        untriedMoves: [...legalMoves],
        fen
    };
}

/**
 * Calculate UCB1 value for a node
 */
function ucb1(node: MCTSNode, explorationConstant: number): number {
    if (node.visits === 0) return Infinity;

    const exploitation = node.wins / node.visits;
    const exploration = Math.sqrt(
        Math.log(node.parent?.visits || 1) / node.visits
    );

    return exploitation + explorationConstant * exploration;
}

/**
 * Select the best child node using UCB1
 */
function selectChild(node: MCTSNode): MCTSNode {
    let bestChild = node.children[0];
    let bestUcb = ucb1(bestChild, EXPLORATION_CONSTANT);

    for (const child of node.children.slice(1)) {
        const childUcb = ucb1(child, EXPLORATION_CONSTANT);
        if (childUcb > bestUcb) {
            bestUcb = childUcb;
            bestChild = child;
        }
    }

    return bestChild;
}

/**
 * Expand a node by adding a new child
 */
function expand(node: MCTSNode): MCTSNode {
    if (node.untriedMoves.length === 0) {
        throw new Error("Cannot expand node with no untried moves");
    }

    // Pick a random untried move
    const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    const move = node.untriedMoves[moveIndex];
    node.untriedMoves.splice(moveIndex, 1);

    // Apply move to get new position
    const chess = new Chess(node.fen);
    chess.move(move);

    // Create child node
    const child = createNode(chess.fen(), move, node);
    node.children.push(child);

    return child;
}

/**
 * Simulate a random game from a position and return result
 * Returns: 1 for win (from perspective of player to move at start), 0 for loss, 0.5 for draw
 */
function simulate(fen: string, originalTurn: 'w' | 'b'): number {
    const chess = new Chess(fen);
    let depth = 0;
    const inEndgame = isEndgame(chess);

    while (!chess.isGameOver() && depth < MAX_SIMULATION_DEPTH) {
        const moves = chess.moves({ verbose: true });
        if (moves.length === 0) break;

        let selectedMove: string;

        if (inEndgame) {
            // Endgame-aware move selection
            selectedMove = selectEndgameMove(moves, chess.turn());
        } else {
            // Random move selection with slight bias toward captures
            const captureMoves = moves.filter(m => m.captured);
            if (captureMoves.length > 0 && Math.random() < 0.3) {
                selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)].san;
            } else {
                selectedMove = moves[Math.floor(Math.random() * moves.length)].san;
            }
        }

        chess.move(selectedMove);
        depth++;
    }

    // Evaluate final position
    if (chess.isCheckmate()) {
        // Current player (loser) perspective
        const loser = chess.turn();
        return loser === originalTurn ? 0 : 1;
    }

    if (chess.isDraw()) {
        return 0.5;
    }

    // If max depth reached, use material evaluation with endgame bonuses
    return evaluatePosition(chess, originalTurn);
}

/**
 * Select a move in endgame with smarter heuristics
 */
function selectEndgameMove(moves: Move[], turn: 'w' | 'b'): string {
    // Score each move based on endgame principles
    const scoredMoves = moves.map(move => {
        let score = Math.random() * 0.5; // Base random component

        // Strongly prefer pawn advances (especially passed pawns approaching promotion)
        if (move.piece === 'p') {
            const toRank = parseInt(move.to[1]);
            if (turn === 'w') {
                score += (toRank - 2) * 0.3; // Rank 7 = 1.5 bonus
            } else {
                score += (7 - toRank) * 0.3; // Rank 2 = 1.5 bonus
            }
            // Extra bonus for promotion
            if (move.promotion) {
                score += 2.0;
            }
        }

        // Prefer king moves toward center in endgames
        if (move.piece === 'k') {
            const toFile = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
            const toRank = parseInt(move.to[1]) - 1;
            const centerDist = Math.abs(toFile - 3.5) + Math.abs(toRank - 3.5);
            score += (7 - centerDist) * 0.15;
        }

        // Prefer captures (especially winning ones)
        if (move.captured) {
            const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
            const capturedValue = values[move.captured] || 0;
            const pieceValue = values[move.piece] || 0;
            score += capturedValue * 0.2;
            if (capturedValue >= pieceValue) {
                score += 0.3; // Bonus for not losing material
            }
        }

        // Avoid stalemate - if king move check if it leaves options
        if (move.san.includes('+')) {
            score += 0.4; // Checks are often good
        }

        return { move: move.san, score };
    });

    // Select move probabilistically based on scores
    const totalScore = scoredMoves.reduce((sum, m) => sum + Math.max(0.1, m.score), 0);
    let rand = Math.random() * totalScore;

    for (const sm of scoredMoves) {
        rand -= Math.max(0.1, sm.score);
        if (rand <= 0) {
            return sm.move;
        }
    }

    return scoredMoves[0].move;
}

/**
 * Detect if position is an endgame
 */
function isEndgame(chess: Chess): boolean {
    const board = chess.board();
    let queens = 0;
    let minorMajor = 0;
    let totalMaterial = 0;

    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (const row of board) {
        for (const square of row) {
            if (square) {
                const value = pieceValues[square.type] || 0;
                totalMaterial += value;
                if (square.type === 'q') queens++;
                else if (['n', 'b', 'r'].includes(square.type)) minorMajor++;
            }
        }
    }

    // Endgame: no queens, or low material, or few pieces
    return queens === 0 || totalMaterial <= 26 || minorMajor <= 4;
}

/**
 * Enhanced position evaluation with endgame bonuses
 */
function evaluatePosition(chess: Chess, perspective: 'w' | 'b'): number {
    const board = chess.board();
    const inEndgame = isEndgame(chess);

    // Adjust piece values for endgame
    const pieceValues: Record<string, number> = inEndgame
        ? { p: 1.5, n: 2.5, b: 3.5, r: 5, q: 9, k: 0 }
        : { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    let whiteScore = 0;
    let blackScore = 0;
    let whiteKingPos = { row: 0, col: 0 };
    let blackKingPos = { row: 0, col: 0 };

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = board[row][col];
            if (square) {
                const value = pieceValues[square.type] || 0;
                if (square.color === 'w') {
                    whiteScore += value;
                    if (square.type === 'k') whiteKingPos = { row, col };
                } else {
                    blackScore += value;
                    if (square.type === 'k') blackKingPos = { row, col };
                }
            }
        }
    }

    // Add endgame bonuses
    if (inEndgame) {
        // King centralization bonus
        const centerDist = (pos: { row: number; col: number }) =>
            Math.abs(pos.row - 3.5) + Math.abs(pos.col - 3.5);

        whiteScore += (7 - centerDist(whiteKingPos)) * 0.2;
        blackScore += (7 - centerDist(blackKingPos)) * 0.2;
    }

    const scoreDiff = whiteScore - blackScore;
    const normalizedScore = Math.max(0, Math.min(1, 0.5 + scoreDiff / 30));

    return perspective === 'w' ? normalizedScore : 1 - normalizedScore;
}

/**
 * Backpropagate simulation result up the tree
 */
function backpropagate(node: MCTSNode | null, result: number): void {
    let currentNode = node;
    let currentResult = result;

    while (currentNode !== null) {
        currentNode.visits++;
        currentNode.wins += currentResult;
        // Flip result for parent (opponent's perspective)
        currentResult = 1 - currentResult;
        currentNode = currentNode.parent;
    }
}

/**
 * Main MCTS algorithm
 * Returns the best move found after running simulations
 */
export function mcts(
    fen: string,
    numSimulations: number = DEFAULT_SIMULATIONS,
    qValueBias?: (move: string) => number
): string | null {
    const chess = new Chess(fen);
    const originalTurn = chess.turn();
    const legalMoves = chess.moves();

    if (legalMoves.length === 0) return null;
    if (legalMoves.length === 1) return legalMoves[0];

    const root = createNode(fen);

    for (let i = 0; i < numSimulations; i++) {
        let node = root;

        // Selection: traverse tree using UCB1
        while (node.untriedMoves.length === 0 && node.children.length > 0) {
            node = selectChild(node);
        }

        // Expansion: add a new child if possible
        if (node.untriedMoves.length > 0) {
            node = expand(node);
        }

        // Simulation: play out randomly
        const result = simulate(node.fen, originalTurn);

        // Backpropagation: update stats
        backpropagate(node, result);
    }

    // Select best move from root
    let bestChild = root.children[0];
    let bestScore = -Infinity;

    for (const child of root.children) {
        // Combine visit count with optional Q-value bias
        let score = child.visits;

        if (qValueBias && child.move) {
            const qBonus = qValueBias(child.move) * numSimulations * 0.1;
            score += qBonus;
        }

        if (score > bestScore) {
            bestScore = score;
            bestChild = child;
        }
    }

    // Log MCTS stats
    console.log(`[MCTS] ${numSimulations} simulations, best move: ${bestChild.move} (visits: ${bestChild.visits}, win rate: ${(bestChild.wins / bestChild.visits * 100).toFixed(1)}%)`);

    return bestChild.move;
}

/**
 * Get MCTS analysis for display (all move stats)
 */
export function getMCTSAnalysis(
    fen: string,
    numSimulations: number = DEFAULT_SIMULATIONS
): { move: string; visits: number; winRate: number }[] {
    const chess = new Chess(fen);
    const legalMoves = chess.moves();

    if (legalMoves.length === 0) return [];

    const root = createNode(fen);
    const originalTurn = chess.turn();

    for (let i = 0; i < numSimulations; i++) {
        let node = root;

        while (node.untriedMoves.length === 0 && node.children.length > 0) {
            node = selectChild(node);
        }

        if (node.untriedMoves.length > 0) {
            node = expand(node);
        }

        const result = simulate(node.fen, originalTurn);
        backpropagate(node, result);
    }

    return root.children
        .filter(c => c.move !== null)
        .map(child => ({
            move: child.move!,
            visits: child.visits,
            winRate: child.visits > 0 ? child.wins / child.visits : 0
        }))
        .sort((a, b) => b.visits - a.visits);
}
