"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface EloHistoryChartProps {
    history: { game: number; whiteElo: number; blackElo: number }[];
}

export default function EloHistoryChart({ history }: EloHistoryChartProps) {
    if (!history || history.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-neutral-500 text-sm">
                No game history yet
            </div>
        );
    }

    // Calculate stats
    const latestWhite = history[history.length - 1]?.whiteElo || 800;
    const latestBlack = history[history.length - 1]?.blackElo || 800;
    const firstWhite = history[0]?.whiteElo || 800;
    const firstBlack = history[0]?.blackElo || 800;
    const whiteChange = latestWhite - firstWhite;
    const blackChange = latestBlack - firstBlack;

    return (
        <div className="w-full">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white border border-neutral-600" />
                        <span className="text-xs text-neutral-400">White</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-white">{latestWhite}</span>
                        <span className={`text-xs ml-1 ${whiteChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {whiteChange >= 0 ? '+' : ''}{Math.round(whiteChange)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-neutral-950/50 rounded-lg border border-neutral-700/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-500" />
                        <span className="text-xs text-neutral-400">Black</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-neutral-300">{latestBlack}</span>
                        <span className={`text-xs ml-1 ${blackChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {blackChange >= 0 ? '+' : ''}{Math.round(blackChange)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-48 w-full bg-neutral-950/50 rounded-lg p-3 border border-neutral-800">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis
                            dataKey="game"
                            tick={{ fontSize: 10, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickLine={{ stroke: '#333' }}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 10, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickLine={{ stroke: '#333' }}
                        />
                        <ReferenceLine y={800} stroke="#444" strokeDasharray="3 3" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#171717',
                                borderColor: '#262626',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            labelFormatter={(v) => `Game ${v}`}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            iconSize={8}
                        />
                        <Line
                            type="monotone"
                            dataKey="whiteElo"
                            stroke="#ffffff"
                            strokeWidth={2}
                            dot={false}
                            name="White"
                        />
                        <Line
                            type="monotone"
                            dataKey="blackElo"
                            stroke="#666666"
                            strokeWidth={2}
                            dot={false}
                            name="Black"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-center text-neutral-600 mt-2 font-mono">
                ELO History • {history.length} games
            </p>
        </div>
    );
}
