"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import CustomBoard from "@/components/CustomBoard";
import MetricsPanel from "@/components/MetricsPanel";
import EvalBar from "@/components/EvalBar";
import SpeedControl from "@/components/SpeedControl";
import GameHistory from "@/components/GameHistory";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import BenchmarkPanel from "@/components/BenchmarkPanel";
import MoveCommentary from "@/components/MoveCommentary";
import GamePhaseIndicator from "@/components/GamePhaseIndicator";
import BlunderAlert from "@/components/BlunderAlert";
import SoundToggle from "@/components/SoundToggle";
import SaveBotModal from "@/components/SaveBotModal";
import BotManager from "@/components/BotManager";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import TrainingControls from "@/components/TrainingControls";
import { useChessSounds } from "@/hooks/useChessSounds";

// Move analysis from AI
interface MoveAnalysis {
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
    tags: string[];
}

type GamePhase = 'opening' | 'middlegame' | 'endgame';
type MoveQuality = 'normal' | 'good' | 'excellent' | 'brilliant' | 'inaccuracy' | 'mistake' | 'blunder';

interface MoveEvaluation {
    moveNumber: number;
    move: string;
    evalBefore: number;
    evalAfter: number;
    evalChange: number;
    quality: MoveQuality;
    player: 'white' | 'black';
}

interface BenchmarkResult {
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

interface BenchmarkStats {
    totalGames: number;
    aiWins: number;
    stockfishWins: number;
    draws: number;
    estimatedElo: number;
    lastBenchmark: string | null;
}

interface NetworkStats {
    elo: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    positionsLearned: number;
    explorationRate: number;
    currentStreak: number;
    bestWinStreak: number;
    bestLossStreak: number;
}

interface GameRecord {
    id: number;
    timestamp: string;
    pgn: string;
    moves: string[];
    moveTimesMs?: number[];
    result: 'white' | 'black' | 'draw';
    reason: string;
    whiteElo: number;
    blackElo: number;
}

export default function Home() {
    const [fen, setFen] = useState("start");
    const [lastMove, setLastMove] = useState<any>(null);
    const [whiteStats, setWhiteStats] = useState<NetworkStats | null>(null);
    const [blackStats, setBlackStats] = useState<NetworkStats | null>(null);
    const [evaluation, setEvaluation] = useState<number>(0);
    const [eloHistory, setEloHistory] = useState<{ move: number; whiteElo: number; blackElo: number }[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
    const [isReplaying, setIsReplaying] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Analytics state
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [moveTimes, setMoveTimes] = useState<number[]>([]);
    const [whiteHeatmap, setWhiteHeatmap] = useState<Record<string, number>>({});
    const [blackHeatmap, setBlackHeatmap] = useState<Record<string, number>>({});
    const [gameEloHistory, setGameEloHistory] = useState<{ game: number; whiteElo: number; blackElo: number }[]>([]);

    // Benchmark state
    const [showBenchmark, setShowBenchmark] = useState(false);
    const [benchmarkRunning, setBenchmarkRunning] = useState(false);
    const [benchmarkStats, setBenchmarkStats] = useState<BenchmarkStats | null>(null);
    const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResult[]>([]);

    // AI Commentary state
    const [moveAnalysis, setMoveAnalysis] = useState<MoveAnalysis[]>([]);
    const [gamePhase, setGamePhase] = useState<GamePhase>('opening');
    const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w');
    const [lastMoveEval, setLastMoveEval] = useState<MoveEvaluation | null>(null);

    // Learning curve state
    interface LearningSnapshot {
        game: number;
        timestamp: string;
        positionsLearned: number;
        explorationRate: number;
        winRate: number;
        elo: number;
    }
    const [learningSnapshots, setLearningSnapshots] = useState<LearningSnapshot[]>([]);

    // Sound effects
    const { playSound, soundEnabled, toggleSound } = useChessSounds();
    const prevFenRef = useRef<string>("");

    // Saved bots state
    interface SavedBot {
        id: string;
        name: string;
        createdAt: string;
        elo: number;
        gamesPlayed: number;
        positionsLearned: number;
    }
    const [showSaveBot, setShowSaveBot] = useState(false);
    const [showBotManager, setShowBotManager] = useState(false);
    const [savedBots, setSavedBots] = useState<SavedBot[]>([]);
    const [playingAgainstBot, setPlayingAgainstBot] = useState<string | null>(null);

    // AI thinking status
    const [aiStatus, setAiStatus] = useState<{ status: 'thinking' | 'waiting' | 'idle'; turn: 'w' | 'b'; delayMs?: number }>({ status: 'idle', turn: 'w' });

    // Training status
    const [isTrainingRunning, setIsTrainingRunning] = useState(false);

    // Quick training state
    const [isQuickTraining, setIsQuickTraining] = useState(false);
    const [quickTrainProgress, setQuickTrainProgress] = useState<{ current: number; total: number } | undefined>(undefined);

    useEffect(() => {
        if (socketRef.current) return;

        const socket = io();
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to Game Server");
            // Request training status on connect
            socket.emit('get_training_status');
        });

        socket.on("game_state", (data: any) => {
            if (!isReplaying) {
                setFen(data.fen);
                setLastMove(data.lastMove);
            }
            setWhiteStats(data.whiteStats);
            setBlackStats(data.blackStats);
            setEvaluation(data.evaluation || 0);

            // Play move sounds
            if (data.lastMove && prevFenRef.current !== data.fen) {
                prevFenRef.current = data.fen;
                if (data.lastMove.san?.includes('#')) {
                    playSound('check'); // Checkmate!
                } else if (data.lastMove.san?.includes('+')) {
                    playSound('check');
                } else if (data.lastMove.captured) {
                    playSound('capture');
                } else if (data.lastMove.san === 'O-O' || data.lastMove.san === 'O-O-O') {
                    playSound('castle');
                } else if (data.lastMove.promotion) {
                    playSound('promote');
                } else {
                    playSound('move');
                }
            }

            // Update move times for current game
            if (data.moveTimesMs) {
                setMoveTimes(data.moveTimesMs);
            }

            // AI Commentary updates
            if (data.moveAnalysis) {
                setMoveAnalysis(data.moveAnalysis);
            }
            if (data.gamePhase) {
                setGamePhase(data.gamePhase);
            }
            if (data.turn) {
                setCurrentTurn(data.turn);
            }

            // Blunder detection
            if (data.lastMoveEval !== undefined) {
                setLastMoveEval(data.lastMoveEval);
            }

            if (data.whiteStats && data.blackStats) {
                setEloHistory(prev => {
                    const newEntry = {
                        move: prev.length,
                        whiteElo: data.whiteStats.elo,
                        blackElo: data.blackStats.elo
                    };
                    const newHistory = [...prev, newEntry];
                    if (newHistory.length > 100) return newHistory.slice(newHistory.length - 100);
                    return newHistory;
                });
            }
        });

        socket.on("game_over", (data: any) => {
            console.log("Game Over", data);
            // Update game-by-game ELO history
            if (data.whiteStats && data.blackStats) {
                setGameEloHistory(prev => {
                    const newEntry = {
                        game: prev.length + 1,
                        whiteElo: data.whiteStats.elo,
                        blackElo: data.blackStats.elo
                    };
                    return [...prev, newEntry].slice(-50); // Keep last 50 games
                });
            }
            // Reset move times for next game
            setMoveTimes([]);
        });

        socket.on("game_history", (history: GameRecord[]) => {
            setGameHistory(history);
            // Build ELO history from game records
            const eloFromHistory = history.map((g, i) => ({
                game: i + 1,
                whiteElo: g.whiteElo,
                blackElo: g.blackElo
            }));
            setGameEloHistory(eloFromHistory);
        });

        socket.on("heatmap_data", (data: { white: Record<string, number>; black: Record<string, number> }) => {
            setWhiteHeatmap(data.white);
            setBlackHeatmap(data.black);
        });

        // Benchmark listeners
        socket.on("benchmark_started", () => {
            setBenchmarkRunning(true);
        });

        socket.on("benchmark_complete", (data: { stats: BenchmarkStats; history: BenchmarkResult[] }) => {
            setBenchmarkStats(data.stats);
            setBenchmarkHistory(data.history);
            setBenchmarkRunning(false);
        });

        socket.on("benchmark_error", (error: string) => {
            console.error('[Benchmark] Error:', error);
            setBenchmarkRunning(false);
        });

        socket.on("benchmark_stats", (data: { stats: BenchmarkStats; history: BenchmarkResult[] }) => {
            setBenchmarkStats(data.stats);
            setBenchmarkHistory(data.history);
        });

        socket.on("learning_snapshots", (data: LearningSnapshot[]) => {
            setLearningSnapshots(data);
        });

        // Saved bots listeners
        socket.on("saved_bots", (data: SavedBot[]) => {
            setSavedBots(data);
        });

        socket.on("playing_against", (botId: string | null) => {
            setPlayingAgainstBot(botId);
        });

        socket.on("ai_status", (data: { status: 'thinking' | 'waiting'; turn: 'w' | 'b'; delayMs?: number }) => {
            setAiStatus(data);
        });

        socket.on("training_status", (data: { running: boolean }) => {
            setIsTrainingRunning(data.running);
        });

        socket.on("quick_train_started", () => {
            setIsQuickTraining(true);
            setQuickTrainProgress(undefined);
        });

        socket.on("quick_train_progress", (data: { current: number; total: number }) => {
            setQuickTrainProgress(data);
        });

        socket.on("quick_train_complete", () => {
            setIsQuickTraining(false);
            setQuickTrainProgress(undefined);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isReplaying]);

    const openHistory = () => {
        if (socketRef.current) {
            socketRef.current.emit('get_history');
        }
        setShowHistory(true);
    };

    const openAnalytics = () => {
        if (socketRef.current) {
            socketRef.current.emit('get_heatmap');
            socketRef.current.emit('get_history');
            socketRef.current.emit('get_learning_snapshots');
        }
        setShowAnalytics(true);
    };

    const handleReplay = useCallback((replayFen: string) => {
        setIsReplaying(true);
        setFen(replayFen);
        setLastMove(null);
    }, []);

    const closeHistory = () => {
        setShowHistory(false);
        setIsReplaying(false);
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 md:p-12 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left: Main Board with Eval Bar */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex justify-center items-stretch gap-3">
                        <EvalBar evaluation={evaluation} />
                        <div className="relative">
                            {/* Game Phase Indicator */}
                            <div className="absolute -top-8 left-0 z-20">
                                <GamePhaseIndicator phase={gamePhase} />
                            </div>
                            {/* AI Thinking Indicator */}
                            <div className="absolute -top-8 right-0 z-20">
                                <ThinkingIndicator
                                    status={aiStatus.status}
                                    turn={aiStatus.turn}
                                    delayMs={aiStatus.delayMs}
                                />
                            </div>
                            <CustomBoard fen={fen} lastMove={lastMove} />
                            {isReplaying && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/80 text-black text-xs font-bold rounded">
                                    REPLAY MODE
                                </div>
                            )}
                            {/* Blunder Alert Overlay */}
                            <BlunderAlert lastMoveEval={lastMoveEval} />
                        </div>
                    </div>

                    {/* AI Commentary - below board */}
                    <div className="w-full max-w-[600px] mx-auto">
                        <MoveCommentary
                            lastMove={lastMove?.san || null}
                            analysis={moveAnalysis}
                            playerColor={currentTurn === 'w' ? 'white' : 'black'}
                        />
                    </div>
                </div>

                {/* Right: Metrics */}
                <div className="flex justify-center w-full">
                    <MetricsPanel
                        whiteStats={whiteStats}
                        blackStats={blackStats}
                        eloHistory={eloHistory}
                    />
                </div>
            </div>

            <div className="mt-8 text-center z-10 flex flex-col items-center gap-4">
                {/* Training Controls */}
                <TrainingControls
                    isRunning={isTrainingRunning}
                    isQuickTraining={isQuickTraining}
                    quickTrainProgress={quickTrainProgress}
                    onStart={() => socketRef.current?.emit('training_start')}
                    onPause={() => socketRef.current?.emit('training_pause')}
                    onStop={() => socketRef.current?.emit('training_stop')}
                    onQuickTrain={(numGames) => socketRef.current?.emit('quick_train', numGames)}
                />

                <div className="flex items-center gap-3">
                    <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
                    <SpeedControl onSpeedChange={(speedMs) => {
                        if (socketRef.current) {
                            socketRef.current.emit('set_speed', speedMs);
                        }
                    }} />
                    <button
                        onClick={openHistory}
                        className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg transition-colors text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3v5h5" />
                            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                            <path d="M12 7v5l4 2" />
                        </svg>
                        <span className="font-mono text-xs">History</span>
                    </button>
                    <button
                        onClick={openAnalytics}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-900/50 to-emerald-900/50 hover:from-cyan-800/50 hover:to-emerald-800/50 border border-cyan-700/50 rounded-lg transition-colors text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3v18h18" />
                            <path d="M18 17V9" />
                            <path d="M13 17V5" />
                            <path d="M8 17v-3" />
                        </svg>
                        <span className="font-mono text-xs">Analytics</span>
                    </button>
                    <button
                        onClick={() => {
                            if (socketRef.current) {
                                socketRef.current.emit('get_benchmark_stats');
                            }
                            setShowBenchmark(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-900/50 to-red-900/50 hover:from-orange-800/50 hover:to-red-800/50 border border-orange-700/50 rounded-lg transition-colors text-sm"
                    >
                        🐟
                        <span className="font-mono text-xs">Benchmark</span>
                    </button>
                    <button
                        onClick={() => setShowSaveBot(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-800/50 hover:to-pink-800/50 border border-purple-700/50 rounded-lg transition-colors text-sm"
                    >
                        💾
                        <span className="font-mono text-xs">Save AI</span>
                    </button>
                    <button
                        onClick={() => {
                            if (socketRef.current) {
                                socketRef.current.emit('get_saved_bots');
                            }
                            setShowBotManager(true);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm border ${playingAgainstBot
                            ? 'bg-emerald-600 border-emerald-500'
                            : 'bg-neutral-800/50 hover:bg-neutral-700/50 border-neutral-700'
                            }`}
                    >
                        🤖
                        <span className="font-mono text-xs">{playingAgainstBot ? 'Playing Bot' : 'Bots'}</span>
                    </button>
                </div>
                <div className="opacity-50">
                    <h1 className="text-2xl font-bold tracking-tighter mb-1">NEURO_CHESS_ZERO</h1>
                    <p className="font-mono text-xs max-w-lg mx-auto">
                        White AI vs Black AI • Q-Learning with Position Memory
                    </p>
                </div>
            </div>

            {showHistory && (
                <GameHistory
                    games={gameHistory}
                    onReplay={handleReplay}
                    onClose={closeHistory}
                />
            )}

            <AnalyticsPanel
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
                whiteStats={whiteStats}
                blackStats={blackStats}
                eloHistory={gameEloHistory}
                moveTimes={moveTimes}
                whiteHeatmap={whiteHeatmap}
                blackHeatmap={blackHeatmap}
                learningSnapshots={learningSnapshots}
            />

            <BenchmarkPanel
                isOpen={showBenchmark}
                onClose={() => setShowBenchmark(false)}
                onRunBenchmark={() => {
                    if (socketRef.current) {
                        socketRef.current.emit('run_benchmark');
                    }
                }}
                isRunning={benchmarkRunning}
                stats={benchmarkStats}
                history={benchmarkHistory}
            />

            <SaveBotModal
                isOpen={showSaveBot}
                onClose={() => setShowSaveBot(false)}
                onSave={(name) => {
                    if (socketRef.current) {
                        socketRef.current.emit('save_bot', { name, color: 'white' });
                    }
                }}
                currentElo={whiteStats?.elo || 800}
                positionsLearned={whiteStats?.positionsLearned || 0}
            />

            <BotManager
                isOpen={showBotManager}
                onClose={() => setShowBotManager(false)}
                bots={savedBots}
                onPlayAgainst={(botId) => {
                    if (socketRef.current) {
                        socketRef.current.emit('play_against_bot', botId);
                    }
                }}
                onDelete={(botId) => {
                    if (socketRef.current) {
                        socketRef.current.emit('delete_bot', botId);
                    }
                }}
                currentlyPlaying={playingAgainstBot}
            />
        </main>
    );
}

