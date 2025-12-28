"use client";

import { motion, AnimatePresence } from 'framer-motion';
import EloHistoryChart from './EloHistoryChart';
import MoveTimingChart from './MoveTimingChart';
import SquareHeatmap from './SquareHeatmap';
import StreakDisplay from './StreakDisplay';
import LearningCurve from './LearningCurve';

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

interface LearningSnapshot {
    game: number;
    timestamp: string;
    positionsLearned: number;
    explorationRate: number;
    winRate: number;
    elo: number;
}

interface AnalyticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    whiteStats: NetworkStats | null;
    blackStats: NetworkStats | null;
    eloHistory: { game: number; whiteElo: number; blackElo: number }[];
    moveTimes: number[];
    whiteHeatmap: Record<string, number>;
    blackHeatmap: Record<string, number>;
    learningSnapshots: LearningSnapshot[];
}

export default function AnalyticsPanel({
    isOpen,
    onClose,
    whiteStats,
    blackStats,
    eloHistory,
    moveTimes,
    whiteHeatmap,
    blackHeatmap,
    learningSnapshots
}: AnalyticsPanelProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-xl bg-neutral-900/95 backdrop-blur-md border-l border-neutral-800 z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 p-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                📊 Analytics Dashboard
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-6">
                            {/* Streak Section */}
                            <section>
                                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>🔥</span> Win/Loss Streaks
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {whiteStats && (
                                        <StreakDisplay
                                            currentStreak={whiteStats.currentStreak}
                                            bestWinStreak={whiteStats.bestWinStreak}
                                            bestLossStreak={whiteStats.bestLossStreak}
                                            color="white"
                                        />
                                    )}
                                    {blackStats && (
                                        <StreakDisplay
                                            currentStreak={blackStats.currentStreak}
                                            bestWinStreak={blackStats.bestWinStreak}
                                            bestLossStreak={blackStats.bestLossStreak}
                                            color="black"
                                        />
                                    )}
                                </div>
                            </section>

                            {/* ELO History Section */}
                            <section>
                                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>📈</span> ELO Progress
                                </h3>
                                <EloHistoryChart history={eloHistory} />
                            </section>

                            {/* Learning Curve Section */}
                            <section>
                                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>🧠</span> Learning Progress
                                </h3>
                                <LearningCurve snapshots={learningSnapshots} />
                            </section>

                            {/* Move Timing Section */}
                            <section>
                                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>⏱️</span> Move Timing (Current Game)
                                </h3>
                                <MoveTimingChart moveTimes={moveTimes} />
                            </section>

                            {/* Heatmap Section */}
                            <section>
                                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>🗺️</span> Square Preferences
                                </h3>
                                <SquareHeatmap
                                    whiteHeatmap={whiteHeatmap}
                                    blackHeatmap={blackHeatmap}
                                />
                            </section>

                            {/* Quick Stats */}
                            <section className="pb-8">
                                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>📋</span> Quick Stats
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                                        <div className="text-neutral-500 text-xs mb-1">Total Games</div>
                                        <div className="text-2xl font-bold text-white">
                                            {whiteStats?.gamesPlayed || 0}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                                        <div className="text-neutral-500 text-xs mb-1">Positions Learned</div>
                                        <div className="text-2xl font-bold text-cyan-400">
                                            {((whiteStats?.positionsLearned || 0) + (blackStats?.positionsLearned || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                                        <div className="text-neutral-500 text-xs mb-1">White Win Rate</div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {whiteStats && whiteStats.gamesPlayed > 0
                                                ? `${Math.round((whiteStats.wins / whiteStats.gamesPlayed) * 100)}%`
                                                : '—'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                                        <div className="text-neutral-500 text-xs mb-1">Black Win Rate</div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {blackStats && blackStats.gamesPlayed > 0
                                                ? `${Math.round((blackStats.wins / blackStats.gamesPlayed) * 100)}%`
                                                : '—'}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
