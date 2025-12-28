"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedBot {
    id: string;
    name: string;
    createdAt: string;
    elo: number;
    gamesPlayed: number;
    positionsLearned: number;
}

interface BotManagerProps {
    isOpen: boolean;
    onClose: () => void;
    bots: SavedBot[];
    onPlayAgainst: (botId: string) => void;
    onDelete: (botId: string) => void;
    currentlyPlaying: string | null;
}

export default function BotManager({
    isOpen,
    onClose,
    bots,
    onPlayAgainst,
    onDelete,
    currentlyPlaying
}: BotManagerProps) {
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    if (!isOpen) return null;

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

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
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-neutral-900/95 backdrop-blur-md border-l border-neutral-800 z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 p-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span>🤖</span> Saved Bots
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
                        <div className="p-4">
                            {bots.length === 0 ? (
                                <div className="text-center py-12 text-neutral-500">
                                    <div className="text-4xl mb-3">🤖</div>
                                    <p>No saved bots yet</p>
                                    <p className="text-sm mt-1">Save the current AI to create a bot</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bots.map((bot) => (
                                        <div
                                            key={bot.id}
                                            className={`
                                                p-4 rounded-xl border transition-all
                                                ${currentlyPlaying === bot.id
                                                    ? 'bg-emerald-900/30 border-emerald-600'
                                                    : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-white flex items-center gap-2">
                                                        {bot.name}
                                                        {currentlyPlaying === bot.id && (
                                                            <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded-full">Playing</span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-neutral-500">{formatDate(bot.createdAt)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-emerald-400">{bot.elo}</div>
                                                    <div className="text-[10px] text-neutral-500">ELO</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 text-xs text-neutral-400 mb-3">
                                                <span>📊 {bot.gamesPlayed} games</span>
                                                <span>•</span>
                                                <span>🧠 {bot.positionsLearned.toLocaleString()} positions</span>
                                            </div>

                                            <div className="flex gap-2">
                                                {currentlyPlaying === bot.id ? (
                                                    <button
                                                        onClick={() => onPlayAgainst('')}
                                                        className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm transition-colors"
                                                    >
                                                        Stop Playing
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onPlayAgainst(bot.id)}
                                                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition-colors"
                                                    >
                                                        ⚔️ Play Against
                                                    </button>
                                                )}

                                                {confirmDelete === bot.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                onDelete(bot.id);
                                                                setConfirmDelete(null);
                                                            }}
                                                            className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDelete(bot.id)}
                                                        className="px-3 py-2 bg-neutral-700 hover:bg-red-600/50 rounded-lg text-sm transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
