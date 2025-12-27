"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import CustomBoard from "@/components/CustomBoard";
import MetricsPanel from "@/components/MetricsPanel";
import EvalBar from "@/components/EvalBar";
import SpeedControl from "@/components/SpeedControl";

interface NetworkStats {
    elo: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    positionsLearned: number;
    explorationRate: number;
}

export default function Home() {
    const [fen, setFen] = useState("start");
    const [lastMove, setLastMove] = useState<any>(null);
    const [whiteStats, setWhiteStats] = useState<NetworkStats | null>(null);
    const [blackStats, setBlackStats] = useState<NetworkStats | null>(null);
    const [evaluation, setEvaluation] = useState<number>(0);
    const [eloHistory, setEloHistory] = useState<{ move: number; whiteElo: number; blackElo: number }[]>([]);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (socketRef.current) return;

        const socket = io();
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to Game Server");
        });

        socket.on("game_state", (data: any) => {
            setFen(data.fen);
            setWhiteStats(data.whiteStats);
            setBlackStats(data.blackStats);
            setLastMove(data.lastMove);
            setEvaluation(data.evaluation || 0);

            // Update ELO history for chart
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

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 md:p-12 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Left: Main Board with Eval Bar */}
                <div className="lg:col-span-2 flex justify-center items-stretch gap-3">
                    <EvalBar evaluation={evaluation} />
                    <CustomBoard fen={fen} lastMove={lastMove} />
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
                <SpeedControl onSpeedChange={(speedMs) => {
                    if (socketRef.current) {
                        socketRef.current.emit('set_speed', speedMs);
                    }
                }} />
                <div className="opacity-50">
                    <h1 className="text-2xl font-bold tracking-tighter mb-1">NEURO_CHESS_ZERO</h1>
                    <p className="font-mono text-xs max-w-lg mx-auto">
                        White AI vs Black AI • Q-Learning with Position Memory
                    </p>
                </div>
            </div>
        </main>
    );
}
