"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import CustomBoard from "@/components/CustomBoard";
import MetricsPanel from "@/components/MetricsPanel";
import EvalBar from "@/components/EvalBar";
import SpeedControl from "@/components/SpeedControl";
import GameHistory from "@/components/GameHistory";

interface NetworkStats {
    elo: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    positionsLearned: number;
    explorationRate: number;
}

interface GameRecord {
    id: number;
    timestamp: string;
    pgn: string;
    moves: string[];
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

    useEffect(() => {
        if (socketRef.current) return;

        const socket = io();
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to Game Server");
        });

        socket.on("game_state", (data: any) => {
            if (!isReplaying) {
                setFen(data.fen);
                setLastMove(data.lastMove);
            }
            setWhiteStats(data.whiteStats);
            setBlackStats(data.blackStats);
            setEvaluation(data.evaluation || 0);

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
        });

        socket.on("game_history", (history: GameRecord[]) => {
            setGameHistory(history);
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

            <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Left: Main Board with Eval Bar */}
                <div className="lg:col-span-2 flex justify-center items-stretch gap-3">
                    <EvalBar evaluation={evaluation} />
                    <div className="relative">
                        <CustomBoard fen={fen} lastMove={lastMove} />
                        {isReplaying && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/80 text-black text-xs font-bold rounded">
                                REPLAY MODE
                            </div>
                        )}
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
                <div className="flex items-center gap-3">
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
        </main>
    );
}
