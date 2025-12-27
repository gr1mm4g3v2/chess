"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface NetworkStats {
    elo: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    positionsLearned: number;
    explorationRate: number;
}

interface MetricsPanelProps {
    whiteStats: NetworkStats | null;
    blackStats: NetworkStats | null;
    eloHistory: { move: number; whiteElo: number; blackElo: number }[];
}

export default function MetricsPanel({ whiteStats, blackStats, eloHistory }: MetricsPanelProps) {
    if (!whiteStats || !blackStats) return null;

    const leader = whiteStats.elo > blackStats.elo ? 'White' : blackStats.elo > whiteStats.elo ? 'Black' : 'Tied';
    const leadAmount = Math.abs(whiteStats.elo - blackStats.elo);

    return (
        <div className="flex flex-col gap-4 w-full max-w-md p-5 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    AI vs AI Training
                </h2>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-500">LEARNING</span>
                </div>
            </div>

            {/* Leader Banner */}
            <div className="text-center py-2 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                <span className="text-xs text-neutral-500 uppercase tracking-wider">Leader: </span>
                <span className={`font-bold ${leader === 'White' ? 'text-white' : leader === 'Black' ? 'text-neutral-400' : 'text-yellow-400'}`}>
                    {leader} {leadAmount > 0 && `(+${leadAmount})`}
                </span>
            </div>

            {/* Dual Stats */}
            <div className="grid grid-cols-2 gap-3">
                {/* White AI */}
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-white border border-neutral-600" />
                        <span className="text-sm font-bold text-white">White AI</span>
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">ELO</span>
                            <span className="text-white font-bold">{whiteStats.elo}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">W/L/D</span>
                            <span className="text-emerald-400">{whiteStats.wins}/{whiteStats.losses}/{whiteStats.draws}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Positions</span>
                            <span className="text-cyan-400">{whiteStats.positionsLearned}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Explore %</span>
                            <span className="text-pink-400">{whiteStats.explorationRate}%</span>
                        </div>
                    </div>
                </div>

                {/* Black AI */}
                <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-500" />
                        <span className="text-sm font-bold text-neutral-300">Black AI</span>
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">ELO</span>
                            <span className="text-neutral-300 font-bold">{blackStats.elo}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">W/L/D</span>
                            <span className="text-emerald-400">{blackStats.wins}/{blackStats.losses}/{blackStats.draws}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Positions</span>
                            <span className="text-cyan-400">{blackStats.positionsLearned}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Explore %</span>
                            <span className="text-pink-400">{blackStats.explorationRate}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ELO Chart */}
            <div className="h-36 w-full bg-neutral-950/50 rounded-lg p-2 border border-neutral-800">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eloHistory}>
                        <XAxis dataKey="move" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', fontSize: '12px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="whiteElo"
                            stroke="#ffffff"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            name="White"
                        />
                        <Line
                            type="monotone"
                            dataKey="blackElo"
                            stroke="#666666"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            name="Black"
                        />
                    </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-center text-neutral-600 mt-1 font-mono">ELO Race</p>
            </div>

            {/* Total Games */}
            <div className="text-center text-xs font-mono text-neutral-500">
                Total Games: {whiteStats.gamesPlayed}
            </div>
        </div>
    );
}
