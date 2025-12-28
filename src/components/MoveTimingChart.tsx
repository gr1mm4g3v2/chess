"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MoveTimingChartProps {
    moveTimes: number[];
}

export default function MoveTimingChart({ moveTimes }: MoveTimingChartProps) {
    if (!moveTimes || moveTimes.length === 0) {
        return (
            <div className="h-32 flex items-center justify-center text-neutral-500 text-sm">
                Waiting for move data...
            </div>
        );
    }

    // Format data for chart
    const data = moveTimes.map((time, i) => ({
        move: i + 1,
        time,
        isWhite: i % 2 === 0
    }));

    // Calculate stats
    const avgTime = moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
    const maxTime = Math.max(...moveTimes);
    const minTime = Math.min(...moveTimes);

    return (
        <div className="w-full">
            {/* Stats Bar */}
            <div className="flex justify-between text-xs font-mono mb-2 px-1">
                <div className="flex items-center gap-1">
                    <span className="text-neutral-500">Avg:</span>
                    <span className="text-cyan-400">{avgTime.toFixed(1)}ms</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-neutral-500">Max:</span>
                    <span className="text-orange-400">{maxTime}ms</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-neutral-500">Min:</span>
                    <span className="text-emerald-400">{minTime}ms</span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-28 w-full bg-neutral-950/50 rounded-lg p-2 border border-neutral-800">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                            <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="move"
                            tick={{ fontSize: 9, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickLine={false}
                            tickFormatter={(v) => `${v}ms`}
                        />
                        <ReferenceLine y={avgTime} stroke="#666" strokeDasharray="3 3" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#171717',
                                borderColor: '#262626',
                                borderRadius: '6px',
                                fontSize: '11px',
                                padding: '4px 8px'
                            }}
                            formatter={(value, _name, props) => {
                                const timeValue = typeof value === 'number' ? value : 0;
                                const isWhite = props?.payload?.isWhite;
                                return [`${timeValue}ms`, isWhite ? 'White' : 'Black'];
                            }}
                            labelFormatter={(v) => `Move ${v}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="time"
                            stroke="#06b6d4"
                            strokeWidth={1.5}
                            fill="url(#timeGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-center text-neutral-600 mt-1 font-mono">
                Move Timing • {moveTimes.length} moves
            </p>
        </div>
    );
}
