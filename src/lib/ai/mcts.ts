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

    while (!chess.isGameOver() && depth < MAX_SIMULATION_DEPTH) {
        const moves = chess.moves();
        if (moves.length === 0) break;

        // Random move selection with slight bias toward captures
        let selectedMove: string;
        const captureMoves = moves.filter(m => m.includes('x'));

        if (captureMoves.length > 0 && Math.random() < 0.3) {
            selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else {
            selectedMove = moves[Math.floor(Math.random() * moves.length)];
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

    // If max depth reached, use material evaluation
    return evaluateMaterial(chess, originalTurn);
}

/**
 * Simple material evaluation for incomplete simulations
 */
function evaluateMaterial(chess: Chess, perspective: 'w' | 'b'): number {
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const board = chess.board();
    let whiteScore = 0;
    let blackScore = 0;

    for (const row of board) {
        for (const square of row) {
            if (square) {
                const value = pieceValues[square.type] || 0;
                if (square.color === 'w') {
                    whiteScore += value;
                } else {
                    blackScore += value;
                }
            }
        }
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
