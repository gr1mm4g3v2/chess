"use client";

import { useState } from 'react';

interface SquareHeatmapProps {
    whiteHeatmap: Record<string, number>;
    blackHeatmap: Record<string, number>;
}

export default function SquareHeatmap({ whiteHeatmap, blackHeatmap }: SquareHeatmapProps) {
    const [viewing, setViewing] = useState<'white' | 'black'>('white');

    const heatmap = viewing === 'white' ? whiteHeatmap : blackHeatmap;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']; // Top to bottom visually

    // Get color for a value (-1 to 1)
    const getHeatColor = (value: number): string => {
        if (Math.abs(value) < 0.05) return 'bg-neutral-800';

        if (value > 0) {
            // Positive: green shades
            if (value > 0.7) return 'bg-emerald-500';
            if (value > 0.4) return 'bg-emerald-600';
            if (value > 0.2) return 'bg-emerald-700';
            return 'bg-emerald-800';
        } else {
            // Negative: red shades
            if (value < -0.7) return 'bg-red-500';
            if (value < -0.4) return 'bg-red-600';
            if (value < -0.2) return 'bg-red-700';
            return 'bg-red-800';
        }
    };

    const getTextColor = (value: number): string => {
        if (Math.abs(value) > 0.4) return 'text-white';
        return 'text-neutral-400';
    };

    // Check if we have any data
    const hasData = heatmap && Object.values(heatmap).some(v => Math.abs(v) > 0.01);

    return (
        <div className="w-full">
            {/* Toggle */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => setViewing('white')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors text-sm
                        ${viewing === 'white'
                            ? 'bg-white/10 border-white/30 text-white'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:bg-neutral-800'}`}
                >
                    <div className="w-3 h-3 rounded-full bg-white border border-neutral-600" />
                    White AI
                </button>
                <button
                    onClick={() => setViewing('black')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors text-sm
                        ${viewing === 'black'
                            ? 'bg-neutral-700/50 border-neutral-500 text-neutral-200'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:bg-neutral-800'}`}
                >
                    <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-500" />
                    Black AI
                </button>
            </div>

            {/* Heatmap Grid */}
            <div className="relative">
                {/* File labels (bottom) */}
                <div className="absolute -bottom-4 left-4 right-0 flex justify-around text-[9px] text-neutral-600 font-mono">
                    {files.map(f => <span key={f}>{f}</span>)}
                </div>

                {/* Rank labels (left) */}
                <div className="absolute -left-3 top-0 bottom-0 flex flex-col justify-around text-[9px] text-neutral-600 font-mono">
                    {ranks.map(r => <span key={r}>{r}</span>)}
                </div>

                {/* Grid */}
                <div className="ml-2 grid grid-cols-8 gap-0.5 bg-neutral-900 p-1 rounded-lg border border-neutral-700">
                    {ranks.map((rank, rankIdx) => (
                        files.map((file, fileIdx) => {
                            const square = file + rank;
                            const value = heatmap?.[square] || 0;
                            const isLight = (rankIdx + fileIdx) % 2 === 0;

                            return (
                                <div
                                    key={square}
                                    className={`
                                        aspect-square flex items-center justify-center text-[8px] font-mono
                                        transition-colors duration-300 rounded-sm
                                        ${hasData ? getHeatColor(value) : (isLight ? 'bg-neutral-700' : 'bg-neutral-800')}
                                        ${getTextColor(value)}
                                    `}
                                    title={`${square}: ${value.toFixed(2)}`}
                                >
                                    {hasData && Math.abs(value) > 0.1 && (
                                        <span>{value > 0 ? '+' : ''}{(value * 10).toFixed(0)}</span>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-neutral-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-600" />
                    <span>Avoided</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-neutral-700" />
                    <span>Neutral</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-600" />
                    <span>Preferred</span>
                </div>
            </div>

            {!hasData && (
                <p className="text-center text-neutral-500 text-xs mt-2">
                    Play more games to build heatmap data
                </p>
            )}
        </div>
    );
}
