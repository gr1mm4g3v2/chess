"use client";

import { motion } from "framer-motion";

type AIMode = 'q-learning' | 'mcts' | 'hybrid';

interface ModeSelectorProps {
    currentMode: AIMode;
    onChange: (mode: AIMode) => void;
}

const modes: { value: AIMode; label: string; description: string }[] = [
    { value: 'q-learning', label: 'Q-Learning', description: 'Fast - uses learned move values' },
    { value: 'mcts', label: 'MCTS', description: 'Slow - simulates future positions' },
    { value: 'hybrid', label: 'Hybrid', description: 'Balanced - combines both' },
];

export default function ModeSelector({ currentMode, onChange }: ModeSelectorProps) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg">
            <span className="text-xs text-neutral-400 font-mono mr-1">Mode:</span>

            {modes.map((mode) => (
                <motion.button
                    key={mode.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onChange(mode.value)}
                    className={`relative px-3 py-1.5 rounded text-xs font-medium transition-all ${currentMode === mode.value
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50'
                            : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-600/50'
                        }`}
                    title={mode.description}
                >
                    {mode.label}
                    {currentMode === mode.value && (
                        <motion.div
                            layoutId="activeMode"
                            className="absolute inset-0 bg-cyan-600 rounded -z-10"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                </motion.button>
            ))}
        </div>
    );
}
