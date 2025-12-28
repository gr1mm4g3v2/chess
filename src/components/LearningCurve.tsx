"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Area, ComposedChart } from 'recharts';

interface LearningSnapshot {
    game: number;
    timestamp: string;
    positionsLearned: number;
    explorationRate: number;
    winRate: number; // Last 10 games rolling average
    elo: number;
}

interface LearningCurveProps {
    snapshots: LearningSnapshot[];
}

export default function LearningCurve({ snapshots }: LearningCurveProps) {
    if (!snapshots || snapshots.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-neutral-500 text-sm">
                Play more games to see learning progress
            </div>
        );
    }

    // Format data for display
    const data = snapshots.map(s => ({
        game: s.game,
        positions: s.positionsLearned,
        exploration: s.explorationRate * 100, // Convert to percentage
        winRate: s.winRate * 100, // Convert to percentage
        elo: s.elo
    }));

    // Calculate some stats
    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];
    const positionsGrowth = latestSnapshot.positionsLearned - firstSnapshot.positionsLearned;
    const explorationDecay = ((firstSnapshot.explorationRate - latestSnapshot.explorationRate) / firstSnapshot.explorationRate) * 100;

    return (
        <div className="w-full">
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="p-2 bg-neutral-800/50 rounded text-center">
                    <div className="text-[9px] text-neutral-500 uppercase">Positions</div>
                    <div className="text-sm font-bold text-cyan-400">{latestSnapshot.positionsLearned.toLocaleString()}</div>
                    <div className="text-[9px] text-emerald-400">+{positionsGrowth.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-neutral-800/50 rounded text-center">
                    <div className="text-[9px] text-neutral-500 uppercase">ε Rate</div>
                    <div className="text-sm font-bold text-orange-400">{(latestSnapshot.explorationRate * 100).toFixed(1)}%</div>
                    <div className="text-[9px] text-neutral-500">-{explorationDecay.toFixed(0)}% decay</div>
                </div>
                <div className="p-2 bg-neutral-800/50 rounded text-center">
                    <div className="text-[9px] text-neutral-500 uppercase">Win Rate</div>
                    <div className="text-sm font-bold text-emerald-400">{(latestSnapshot.winRate * 100).toFixed(0)}%</div>
                    <div className="text-[9px] text-neutral-500">last 10 games</div>
                </div>
                <div className="p-2 bg-neutral-800/50 rounded text-center">
                    <div className="text-[9px] text-neutral-500 uppercase">ELO</div>
                    <div className="text-sm font-bold text-purple-400">{latestSnapshot.elo}</div>
                    <div className={`text-[9px] ${latestSnapshot.elo >= firstSnapshot.elo ? 'text-emerald-400' : 'text-red-400'}`}>
                        {latestSnapshot.elo >= firstSnapshot.elo ? '+' : ''}{latestSnapshot.elo - firstSnapshot.elo}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-56 w-full bg-neutral-950/50 rounded-lg p-3 border border-neutral-800">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                            dataKey="game"
                            tick={{ fontSize: 10, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 10, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: '#666' }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#171717',
                                borderColor: '#262626',
                                borderRadius: '8px',
                                fontSize: '11px'
                            }}
                            formatter={(value: any, name: any) => {
                                if (value === undefined) return ['-', name];
                                const numValue = typeof value === 'number' ? value : parseFloat(value);
                                if (name === 'positions') return [numValue.toLocaleString(), 'Positions Learned'];
                                if (name === 'exploration') return [`${numValue.toFixed(1)}%`, 'Exploration Rate'];
                                if (name === 'winRate') return [`${numValue.toFixed(0)}%`, 'Win Rate (10g)'];
                                return [value, name];
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '10px' }}
                            iconSize={8}
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="positions"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            dot={false}
                            name="Positions"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="exploration"
                            stroke="#f97316"
                            strokeWidth={2}
                            dot={false}
                            name="Exploration %"
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="winRate"
                            stroke="#10b981"
                            fill="#10b98120"
                            strokeWidth={1.5}
                            name="Win Rate %"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-center text-neutral-600 mt-2 font-mono">
                Learning Progress • {snapshots.length} snapshots
            </p>
        </div>
    );
}
