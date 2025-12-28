"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

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

interface BenchmarkPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onRunBenchmark: () => void;
    isRunning: boolean;
    stats: BenchmarkStats | null;
    history: BenchmarkResult[];
}

export default function BenchmarkPanel({
    isOpen,
    onClose,
    onRunBenchmark,
    isRunning,
    stats,
    history
}: BenchmarkPanelProps) {
    const [showHistory, setShowHistory] = useState(false);

    if (!isOpen) return null;

    const winRate = stats && stats.totalGames > 0
        ? Math.round((stats.aiWins / stats.totalGames) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 p-4 border-b border-neutral-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            🐟 Stockfish Benchmark
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-400"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                        Test your AI against Stockfish to estimate true ELO
                    </p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Estimated ELO */}
                    <div className="text-center p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                            Estimated True ELO
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            {stats?.estimatedElo || '—'}
                        </div>
                        {stats?.lastBenchmark && (
                            <div className="text-[10px] text-neutral-600 mt-2">
                                Last benchmark: {new Date(stats.lastBenchmark).toLocaleString()}
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    {stats && stats.totalGames > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            <div className="p-2 bg-neutral-800/50 rounded text-center">
                                <div className="text-xs text-neutral-500">Games</div>
                                <div className="text-lg font-bold text-white">{stats.totalGames}</div>
                            </div>
                            <div className="p-2 bg-emerald-900/30 rounded text-center">
                                <div className="text-xs text-emerald-400">Wins</div>
                                <div className="text-lg font-bold text-emerald-400">{stats.aiWins}</div>
                            </div>
                            <div className="p-2 bg-red-900/30 rounded text-center">
                                <div className="text-xs text-red-400">Losses</div>
                                <div className="text-lg font-bold text-red-400">{stats.stockfishWins}</div>
                            </div>
                            <div className="p-2 bg-yellow-900/30 rounded text-center">
                                <div className="text-xs text-yellow-400">Draws</div>
                                <div className="text-lg font-bold text-yellow-400">{stats.draws}</div>
                            </div>
                        </div>
                    )}

                    {/* Win Rate Bar */}
                    {stats && stats.totalGames > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-neutral-500">
                                <span>Win Rate</span>
                                <span>{winRate}%</span>
                            </div>
                            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                    style={{ width: `${winRate}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Run Benchmark Button */}
                    <button
                        onClick={onRunBenchmark}
                        disabled={isRunning}
                        className={`
                            w-full py-3 rounded-lg font-bold text-sm transition-all
                            flex items-center justify-center gap-2
                            ${isRunning
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white'
                            }
                        `}
                    >
                        {isRunning ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Running Benchmark...
                            </>
                        ) : (
                            <>
                                <span>🎯</span>
                                Run Quick Benchmark (3 games)
                            </>
                        )}
                    </button>

                    {/* History Toggle */}
                    {history.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                {showHistory ? '▼' : '▶'} Benchmark History ({history.length})
                            </button>

                            {showHistory && (
                                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                    {history.slice().reverse().map(result => (
                                        <div
                                            key={result.id}
                                            className={`
                                                p-2 rounded text-xs flex items-center justify-between
                                                ${result.result === 'ai_win' ? 'bg-emerald-900/20' :
                                                    result.result === 'stockfish_win' ? 'bg-red-900/20' :
                                                        'bg-yellow-900/20'}
                                            `}
                                        >
                                            <span className="text-neutral-400">
                                                vs SF Lvl {result.stockfishLevel}
                                            </span>
                                            <span className={`font-bold
                                                ${result.result === 'ai_win' ? 'text-emerald-400' :
                                                    result.result === 'stockfish_win' ? 'text-red-400' :
                                                        'text-yellow-400'}
                                            `}>
                                                {result.result === 'ai_win' ? 'WIN' :
                                                    result.result === 'stockfish_win' ? 'LOSS' : 'DRAW'}
                                            </span>
                                            <span className="text-neutral-500">
                                                {result.moves} moves
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info */}
                    <div className="text-[10px] text-neutral-600 text-center">
                        Benchmark plays 3 games against Stockfish at varying difficulty
                        to estimate your AI&apos;s true playing strength.
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
