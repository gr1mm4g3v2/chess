import { Server as SocketIOServer } from 'socket.io';
import { Chess } from 'chess.js';
import { NeuralNetwork } from '../ai/neural-net';
import { loadDualAIState, saveDualAIState, saveGameToHistory, loadGameHistory } from '../persistence';

export class GameManager {
    private io: SocketIOServer;
    private chess: Chess;
    private whiteAI: NeuralNetwork;
    private blackAI: NeuralNetwork;
    private timer: NodeJS.Timeout | null = null;
    private moveIntervalMs: number = 800;
    private isRunning: boolean = false;

    constructor(io: SocketIOServer) {
        this.io = io;
        this.chess = new Chess();

        // Create two competing networks
        this.whiteAI = new NeuralNetwork('white', 800);
        this.blackAI = new NeuralNetwork('black', 800);

        // Load saved state if exists
        const savedState = loadDualAIState();
        if (savedState) {
            this.whiteAI.importState(savedState.white);
            this.blackAI.importState(savedState.black);
        }

        // Listen for speed changes from clients
        io.on('connection', (socket) => {
            socket.on('set_speed', (speedMs: number) => {
                this.setSpeed(speedMs);
                console.log(`[Speed] Set to ${speedMs}ms per move`);
            });

            socket.on('get_history', () => {
                const history = loadGameHistory();
                socket.emit('game_history', history);
            });
        });
    }

    public setSpeed(ms: number): void {
        this.moveIntervalMs = Math.max(50, Math.min(2000, ms));
    }


    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.gameLoop();
    }

    private getCurrentAI(): NeuralNetwork {
        return this.chess.turn() === 'w' ? this.whiteAI : this.blackAI;
    }

    private async gameLoop() {
        if (!this.isRunning) return;

        // Check game over
        if (this.chess.isGameOver()) {
            this.handleGameOver();
            // Restart after a delay
            this.timer = setTimeout(() => {
                this.chess.reset();
                this.broadcastState();
                this.gameLoop();
            }, 3000);
            return;
        }

        // Get the current player's AI
        const currentAI = this.getCurrentAI();
        const move = currentAI.decideMove(this.chess);

        if (move) {
            try {
                const color = this.chess.turn() === 'w' ? 'White' : 'Black';
                console.log(`[${color}] Move: ${move}`);
                this.chess.move(move);
            } catch (e) {
                console.error("Invalid move generated", move, e);
                this.chess.reset();
            }
        } else {
            console.log("AI returned null move");
        }

        this.broadcastState();

        // Schedule next move
        this.timer = setTimeout(() => {
            this.gameLoop();
        }, this.moveIntervalMs);
    }

    private handleGameOver() {
        let winner: 'white' | 'black' | 'draw' = 'draw';

        if (this.chess.isCheckmate()) {
            // The player who just moved won (opposite of current turn)
            winner = this.chess.turn() === 'w' ? 'black' : 'white';
        }

        // Update stats and learn
        if (winner === 'white') {
            this.whiteAI.updateStats('win');
            this.whiteAI.learn('win');
            this.blackAI.updateStats('loss');
            this.blackAI.learn('loss');
            console.log('[Game Over] White wins by checkmate!');
        } else if (winner === 'black') {
            this.blackAI.updateStats('win');
            this.blackAI.learn('win');
            this.whiteAI.updateStats('loss');
            this.whiteAI.learn('loss');
            console.log('[Game Over] Black wins by checkmate!');
        } else {
            this.whiteAI.updateStats('draw');
            this.whiteAI.learn('draw');
            this.blackAI.updateStats('draw');
            this.blackAI.learn('draw');
            console.log(`[Game Over] Draw: ${this.getGameOverReason()}`);
        }

        // Save both AIs' state
        saveDualAIState({
            white: this.whiteAI.exportState(),
            black: this.blackAI.exportState()
        });

        // Save game to history
        saveGameToHistory({
            pgn: this.chess.pgn(),
            moves: this.chess.history(),
            result: winner,
            reason: this.getGameOverReason(),
            whiteElo: this.whiteAI.getStats().elo,
            blackElo: this.blackAI.getStats().elo
        });

        this.io.emit('game_over', {
            reason: this.getGameOverReason(),
            winner,
            whiteStats: this.whiteAI.getStats(),
            blackStats: this.blackAI.getStats()
        });
    }

    private getGameOverReason(): string {
        if (this.chess.isCheckmate()) return "Checkmate";
        if (this.chess.isDraw()) return "Draw";
        if (this.chess.isStalemate()) return "Stalemate";
        if (this.chess.isThreefoldRepetition()) return "Threefold Repetition";
        if (this.chess.isInsufficientMaterial()) return "Insufficient Material";
        return "Game Over";
    }

    public broadcastState() {
        const currentAI = this.getCurrentAI();
        this.io.emit('game_state', {
            fen: this.chess.fen(),
            pgn: this.chess.pgn(),
            turn: this.chess.turn(),
            whiteStats: this.whiteAI.getStats(),
            blackStats: this.blackAI.getStats(),
            lastMove: this.chess.history({ verbose: true }).pop(),
            evaluation: currentAI.evaluatePosition(this.chess)
        });
    }

    public getCurrentState() {
        const currentAI = this.getCurrentAI();
        return {
            fen: this.chess.fen(),
            pgn: this.chess.pgn(),
            turn: this.chess.turn(),
            whiteStats: this.whiteAI.getStats(),
            blackStats: this.blackAI.getStats(),
            lastMove: this.chess.history({ verbose: true }).pop(),
            evaluation: currentAI.evaluatePosition(this.chess)
        };
    }
}
