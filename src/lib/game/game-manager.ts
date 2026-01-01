import { Server as SocketIOServer } from 'socket.io';
import { Chess } from 'chess.js';
import { NeuralNetwork, AIMode } from '../ai/neural-net';
import { loadDualAIState, saveDualAIState, saveGameToHistory, loadGameHistory, saveLearningSnapshot, loadLearningSnapshots } from '../persistence';
import { StockfishEngine } from '../ai/stockfish';
import { runQuickBenchmark, getBenchmarkStats, getBenchmarkHistory } from './benchmark-manager';
import { detectGamePhase } from './game-phase';
import { BlunderDetector, MoveEvaluation } from '../ai/blunder-detector';
import { loadSavedBots, saveBot, deleteBot, getBot } from '../saved-bots';

export class GameManager {
    private io: SocketIOServer;
    private chess: Chess;
    private whiteAI: NeuralNetwork;
    private blackAI: NeuralNetwork;
    private timer: NodeJS.Timeout | null = null;
    private moveIntervalMs: number = 800;
    private isRunning: boolean = false;
    private moveTimesMs: number[] = []; // Track time for each move
    private lastMoveTime: number = Date.now();
    private stockfish: StockfishEngine | null = null;
    private isBenchmarking: boolean = false;
    private blunderDetector: BlunderDetector = new BlunderDetector();
    private lastEval: number = 0;
    private lastMoveEval: MoveEvaluation | null = null;
    // Saved bot for play-against mode
    private opponentBot: NeuralNetwork | null = null;
    private playingAgainstBotId: string | null = null;

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

            socket.on('get_heatmap', () => {
                socket.emit('heatmap_data', {
                    white: this.whiteAI.getHeatmapData(),
                    black: this.blackAI.getHeatmapData()
                });
            });

            socket.on('set_ai_mode', (mode: AIMode) => {
                this.whiteAI.setMode(mode);
                this.blackAI.setMode(mode);
                this.io.emit('ai_mode_changed', mode);
                console.log(`[AI Mode] Set to ${mode}`);
            });

            socket.on('get_ai_mode', () => {
                socket.emit('ai_mode', this.whiteAI.getMode());
            });

            // Benchmark handlers
            socket.on('run_benchmark', async () => {
                if (this.isBenchmarking) {
                    socket.emit('benchmark_error', 'Benchmark already running');
                    return;
                }

                this.isBenchmarking = true;
                socket.emit('benchmark_started');

                try {
                    // Initialize Stockfish if needed
                    if (!this.stockfish) {
                        this.stockfish = new StockfishEngine();
                        const initialized = await this.stockfish.init();
                        if (!initialized) {
                            socket.emit('benchmark_error', 'Failed to initialize Stockfish');
                            this.isBenchmarking = false;
                            return;
                        }
                    }

                    // Run benchmark with White AI
                    const stats = await runQuickBenchmark(this.whiteAI, this.stockfish);

                    socket.emit('benchmark_complete', {
                        stats,
                        history: getBenchmarkHistory()
                    });
                } catch (e) {
                    console.error('[Benchmark] Error:', e);
                    socket.emit('benchmark_error', 'Benchmark failed');
                } finally {
                    this.isBenchmarking = false;
                }
            });

            socket.on('get_benchmark_stats', () => {
                socket.emit('benchmark_stats', {
                    stats: getBenchmarkStats(),
                    history: getBenchmarkHistory()
                });
            });

            socket.on('get_learning_snapshots', () => {
                socket.emit('learning_snapshots', loadLearningSnapshots());
            });

            // Saved bots handlers
            socket.on('get_saved_bots', () => {
                socket.emit('saved_bots', loadSavedBots());
            });

            socket.on('save_bot', (data: { name: string; color: 'white' | 'black' }) => {
                const ai = data.color === 'white' ? this.whiteAI : this.blackAI;
                const bot = saveBot(data.name, ai.exportState());
                socket.emit('bot_saved', bot);
                socket.emit('saved_bots', loadSavedBots());
            });

            socket.on('delete_bot', (botId: string) => {
                deleteBot(botId);
                socket.emit('saved_bots', loadSavedBots());
            });

            socket.on('play_against_bot', (botId: string) => {
                if (!botId) {
                    // Stop playing against bot
                    this.opponentBot = null;
                    this.playingAgainstBotId = null;
                    console.log('[Bot] Stopped playing against bot');
                } else {
                    const bot = getBot(botId);
                    if (bot) {
                        this.opponentBot = new NeuralNetwork('black');
                        this.opponentBot.importState(bot.state);
                        this.playingAgainstBotId = botId;
                        console.log(`[Bot] Now playing against "${bot.name}" (ELO: ${bot.elo})`);
                    }
                }
                socket.emit('playing_against', this.playingAgainstBotId);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected', socket.id);
            });

            // Training control handlers
            socket.on('training_start', () => {
                this.start();
                this.io.emit('training_status', { running: this.isRunning });
                console.log('[Training] Started');
            });

            socket.on('training_pause', () => {
                this.pause();
                this.io.emit('training_status', { running: this.isRunning });
                console.log('[Training] Paused');
            });

            socket.on('training_stop', () => {
                this.stop();
                this.io.emit('training_status', { running: this.isRunning });
                console.log('[Training] Stopped and reset');
            });

            socket.on('get_training_status', () => {
                socket.emit('training_status', { running: this.isRunning });
            });

            socket.on('quick_train', async (numGames: number) => {
                const games = Math.min(Math.max(1, numGames || 5), 50); // Clamp between 1-50
                console.log(`[Quick Train] Starting ${games} games...`);
                this.io.emit('quick_train_started', { games });

                const results = await this.quickTrain(games);

                this.io.emit('quick_train_complete', results);
                console.log(`[Quick Train] Complete: ${results.whiteWins}W / ${results.blackWins}B / ${results.draws}D`);

                // Broadcast updated state
                this.broadcastState();
            });
        });
    }

    public setSpeed(ms: number): void {
        this.moveIntervalMs = Math.max(50, Math.min(2000, ms));
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.io.emit('ai_status', { status: 'idle', turn: this.chess.turn() });
        this.gameLoop();
    }

    public pause() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.io.emit('ai_status', { status: 'idle', turn: this.chess.turn() });
    }

    public stop() {
        this.pause();
        // Reset the game
        this.chess.reset();
        this.moveTimesMs = [];
        this.blunderDetector.reset();
        this.lastMoveEval = null;
        this.broadcastState();
    }

    // Run N games quickly without UI updates
    private async quickTrain(numGames: number): Promise<{
        gamesPlayed: number;
        whiteWins: number;
        blackWins: number;
        draws: number;
        whiteStats: ReturnType<NeuralNetwork['getStats']>;
        blackStats: ReturnType<NeuralNetwork['getStats']>;
    }> {
        // Pause normal training if running
        const wasRunning = this.isRunning;
        if (wasRunning) {
            this.pause();
        }

        let whiteWins = 0, blackWins = 0, draws = 0;

        for (let game = 0; game < numGames; game++) {
            // Reset for new game
            this.chess.reset();

            // Play game to completion
            while (!this.chess.isGameOver()) {
                const currentAI = this.chess.turn() === 'w' ? this.whiteAI : this.blackAI;
                const move = currentAI.decideMoveAuto(this.chess);

                if (move) {
                    try {
                        this.chess.move(move);
                    } catch {
                        // Invalid move - shouldn't happen but break if it does
                        break;
                    }
                } else {
                    break;
                }
            }

            // Determine winner and update stats
            let winner: 'white' | 'black' | 'draw' = 'draw';
            if (this.chess.isCheckmate()) {
                winner = this.chess.turn() === 'w' ? 'black' : 'white';
            }

            if (winner === 'white') {
                whiteWins++;
                this.whiteAI.updateStats('win');
                this.whiteAI.learn('win');
                this.blackAI.updateStats('loss');
                this.blackAI.learn('loss');
            } else if (winner === 'black') {
                blackWins++;
                this.blackAI.updateStats('win');
                this.blackAI.learn('win');
                this.whiteAI.updateStats('loss');
                this.whiteAI.learn('loss');
            } else {
                draws++;
                this.whiteAI.updateStats('draw');
                this.whiteAI.learn('draw');
                this.blackAI.updateStats('draw');
                this.blackAI.learn('draw');
            }

            // Save game to history
            saveGameToHistory({
                pgn: this.chess.pgn(),
                moves: this.chess.history(),
                moveTimesMs: [],
                result: winner,
                reason: this.chess.isCheckmate() ? 'Checkmate' : 'Draw',
                whiteElo: this.whiteAI.getStats().elo,
                blackElo: this.blackAI.getStats().elo
            });

            // Emit progress periodically
            if ((game + 1) % 5 === 0 || game === numGames - 1) {
                this.io.emit('quick_train_progress', {
                    current: game + 1,
                    total: numGames,
                    whiteWins,
                    blackWins,
                    draws
                });
            }
        }

        // Save AI state
        saveDualAIState({
            white: this.whiteAI.exportState(),
            black: this.blackAI.exportState()
        });

        // Reset board for display
        this.chess.reset();

        return {
            gamesPlayed: numGames,
            whiteWins,
            blackWins,
            draws,
            whiteStats: this.whiteAI.getStats(),
            blackStats: this.blackAI.getStats()
        };
    }

    private getCurrentAI(): NeuralNetwork {
        if (this.chess.turn() === 'w') {
            return this.whiteAI;
        } else {
            // Use opponent bot if playing against a saved bot, otherwise use the training black AI
            return this.opponentBot || this.blackAI;
        }
    }

    private async gameLoop() {
        if (!this.isRunning) return;

        // Check game over
        if (this.chess.isGameOver()) {
            this.handleGameOver();
            // Reset move times and blunder detector for next game
            this.moveTimesMs = [];
            this.lastMoveTime = Date.now();
            this.blunderDetector.reset();
            this.lastMoveEval = null;
            // Restart after a delay
            this.timer = setTimeout(() => {
                this.chess.reset();
                this.broadcastState();
                this.gameLoop();
            }, 3000);
            return;
        }

        // Emit thinking state
        this.io.emit('ai_status', { status: 'thinking', turn: this.chess.turn() });

        // Track move timing
        const moveStartTime = Date.now();

        // Get the current player's AI and use auto mode (respects Q/MCTS/Hybrid setting)
        const currentAI = this.getCurrentAI();
        const isWhiteMoving = this.chess.turn() === 'w';

        // Capture evaluation BEFORE the move
        const evalBefore = currentAI.evaluatePosition(this.chess);

        const move = currentAI.decideMoveAuto(this.chess);

        if (move) {
            try {
                const color = isWhiteMoving ? 'White' : 'Black';
                const thinkTime = Date.now() - moveStartTime;
                this.moveTimesMs.push(thinkTime);
                console.log(`[${color}] Move: ${move} (${thinkTime}ms)`);
                this.chess.move(move);

                // Evaluate AFTER the move for blunder detection
                const evalAfter = currentAI.evaluatePosition(this.chess);
                this.lastMoveEval = this.blunderDetector.evaluateMove(
                    move,
                    evalBefore,
                    evalAfter,
                    isWhiteMoving
                );
                this.lastEval = evalAfter;

                if (this.lastMoveEval.quality !== 'normal') {
                    console.log(`[${color}] ${this.lastMoveEval.quality.toUpperCase()}: ${move} (${(this.lastMoveEval.evalChange * 30).toFixed(1)})`);
                }
            } catch (e) {
                console.error("Invalid move generated", move, e);
                this.chess.reset();
                this.moveTimesMs = [];
                this.blunderDetector.reset();
            }
        } else {
            console.log("AI returned null move");
        }

        this.broadcastState();

        // Emit waiting state
        this.io.emit('ai_status', { status: 'waiting', turn: this.chess.turn(), delayMs: this.moveIntervalMs });

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
            moveTimesMs: [...this.moveTimesMs],
            result: winner,
            reason: this.getGameOverReason(),
            whiteElo: this.whiteAI.getStats().elo,
            blackElo: this.blackAI.getStats().elo
        });

        // Save learning snapshot (calculate rolling win rate from history)
        const history = loadGameHistory();
        const last10 = history.slice(-10);
        const whiteWins = last10.filter(g => g.result === 'white').length;
        const winRate = last10.length > 0 ? whiteWins / last10.length : 0;

        saveLearningSnapshot({
            game: this.whiteAI.getStats().gamesPlayed,
            positionsLearned: this.whiteAI.getStats().positionsLearned,
            explorationRate: this.whiteAI.getStats().explorationRate,
            winRate,
            elo: this.whiteAI.getStats().elo
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
        const nextAI = this.chess.turn() === 'w' ? this.whiteAI : this.blackAI;

        this.io.emit('game_state', {
            fen: this.chess.fen(),
            pgn: this.chess.pgn(),
            turn: this.chess.turn(),
            whiteStats: this.whiteAI.getStats(),
            blackStats: this.blackAI.getStats(),
            lastMove: this.chess.history({ verbose: true }).pop(),
            evaluation: currentAI.evaluatePosition(this.chess),
            moveTimesMs: this.moveTimesMs,
            lastMoveTimeMs: this.moveTimesMs.length > 0 ? this.moveTimesMs[this.moveTimesMs.length - 1] : 0,
            // AI Commentary data
            moveAnalysis: nextAI.getMoveAnalysis(this.chess),
            gamePhase: detectGamePhase(this.chess),
            // Blunder detection
            lastMoveEval: this.lastMoveEval,
            blunderStats: this.blunderDetector.getStats()
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
