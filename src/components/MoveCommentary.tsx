"use client";

import { motion, AnimatePresence } from 'framer-motion';

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

interface MoveCommentaryProps {
    lastMove: string | null;
    analysis: MoveAnalysis[];
    playerColor: 'white' | 'black';
}

export default function MoveCommentary({ lastMove, analysis, playerColor }: MoveCommentaryProps) {
    if (!analysis || analysis.length === 0) {
        return (
            <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800 text-center text-neutral-600 text-sm">
                Waiting for move analysis...
            </div>
        );
    }

    // Find the chosen move in analysis
    const chosenMoveAnalysis = lastMove ? analysis.find(a => a.san === lastMove) : analysis[0];
    const topMoves = analysis.slice(0, 5);
    const maxScore = Math.max(...topMoves.map(m => m.totalScore), 0.01);
    const minScore = Math.min(...topMoves.map(m => m.totalScore), 0);

    // Get tag color
    const getTagColor = (tag: string): string => {
        switch (tag) {
            case 'checkmate': return 'bg-purple-600';
            case 'check': return 'bg-orange-600';
            case 'winning capture': return 'bg-emerald-600';
            case 'sacrifice': return 'bg-red-600';
            case 'trade': return 'bg-yellow-600';
            case 'promotion': return 'bg-pink-600';
            case 'castling': return 'bg-blue-600';
            case 'development': return 'bg-cyan-600';
            case 'center control': return 'bg-indigo-600';
            default: return 'bg-neutral-600';
        }
    };

    // Normalize score for bar width
    const normalizeScore = (score: number): number => {
        const range = maxScore - minScore || 1;
        return Math.max(5, ((score - minScore) / range) * 100);
    };

    const isWhite = playerColor === 'white';

    return (
        <div className="p-3 bg-neutral-900/80 backdrop-blur-sm rounded-lg border border-neutral-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isWhite ? 'bg-white' : 'bg-neutral-800 border border-neutral-500'}`} />
                    <span className="text-sm font-bold text-neutral-300">
                        {isWhite ? 'White' : 'Black'} Analysis
                    </span>
                </div>
                {lastMove && (
                    <span className="text-xs font-mono text-neutral-500">
                        Played: <span className="text-white font-bold">{lastMove}</span>
                    </span>
                )}
            </div>

            {/* Chosen Move Commentary */}
            {chosenMoveAnalysis && (
                <div className="mb-3 p-2 bg-neutral-800/50 rounded border border-neutral-700">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-500">Why this move?</span>
                        <div className="flex gap-1">
                            {chosenMoveAnalysis.tags.map((tag, i) => (
                                <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${getTagColor(tag)} text-white`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div className="text-center p-1 bg-neutral-900/50 rounded">
                            <div className="text-neutral-500 text-[9px]">Q-Value</div>
                            <div className={`${chosenMoveAnalysis.qValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {chosenMoveAnalysis.qValue.toFixed(3)}
                            </div>
                        </div>
                        <div className="text-center p-1 bg-neutral-900/50 rounded">
                            <div className="text-neutral-500 text-[9px]">Immediate</div>
                            <div className="text-cyan-400">{chosenMoveAnalysis.immediateValue.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-1 bg-neutral-900/50 rounded">
                            <div className="text-neutral-500 text-[9px]">Visits</div>
                            <div className="text-yellow-400">{chosenMoveAnalysis.visits}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Candidate Moves */}
            <div className="space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Top Candidates</span>
                <AnimatePresence mode="popLayout">
                    {topMoves.map((move, i) => {
                        const isChosen = move.san === lastMove;
                        return (
                            <motion.div
                                key={move.san}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-center gap-2 p-1.5 rounded text-xs ${isChosen ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-neutral-800/30'}`}
                            >
                                <span className={`w-5 text-center font-bold ${i === 0 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                                    {i + 1}
                                </span>
                                <span className={`font-mono font-bold w-12 ${isChosen ? 'text-emerald-400' : 'text-white'}`}>
                                    {move.san}
                                </span>
                                <div className="flex-1 h-3 bg-neutral-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${normalizeScore(move.totalScore)}%` }}
                                        transition={{ duration: 0.3, delay: i * 0.05 }}
                                        className={`h-full ${isChosen ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-cyan-700 to-cyan-500'}`}
                                    />
                                </div>
                                <span className="font-mono text-[10px] text-neutral-400 w-10 text-right">
                                    {move.totalScore >= 0 ? '+' : ''}{move.totalScore.toFixed(2)}
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="mt-3 pt-2 border-t border-neutral-800 text-[9px] text-neutral-600 text-center">
                Score = Q-Value (learned) + Immediate Value (captures, checks)
            </div>
        </div>
    );
}
