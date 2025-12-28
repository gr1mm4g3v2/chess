"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveBotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    currentElo: number;
    positionsLearned: number;
}

export default function SaveBotModal({
    isOpen,
    onClose,
    onSave,
    currentElo,
    positionsLearned
}: SaveBotModalProps) {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            setName('');
            onClose();
        }
    };

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
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                    >
                        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-2xl">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span>💾</span> Save Current AI
                            </h2>

                            <p className="text-sm text-neutral-400 mb-4">
                                Create a snapshot of the current AI that you can play against later.
                            </p>

                            {/* Stats preview */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="p-3 bg-neutral-800/50 rounded-lg text-center">
                                    <div className="text-[10px] text-neutral-500 uppercase">ELO</div>
                                    <div className="text-lg font-bold text-emerald-400">{currentElo}</div>
                                </div>
                                <div className="p-3 bg-neutral-800/50 rounded-lg text-center">
                                    <div className="text-[10px] text-neutral-500 uppercase">Positions</div>
                                    <div className="text-lg font-bold text-cyan-400">{positionsLearned.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Name input */}
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Bot name (e.g., 'Early Learner')"
                                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 mb-4"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!name.trim()}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg font-semibold transition-colors"
                                >
                                    Save Bot
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
