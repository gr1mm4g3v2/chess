"use client";

import { motion } from "framer-motion";

interface TrainingControlsProps {
    isRunning: boolean;
    isQuickTraining: boolean;
    quickTrainProgress?: { current: number; total: number };
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    onQuickTrain: (numGames: number) => void;
}

export default function TrainingControls({
    isRunning,
    isQuickTraining,
    quickTrainProgress,
    onStart,
    onPause,
    onStop,
    onQuickTrain
}: TrainingControlsProps) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg">
            <span className="text-xs text-neutral-400 font-mono mr-1">Training:</span>

            {!isRunning ? (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onStart}
                    disabled={isQuickTraining}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    Start
                </motion.button>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                    </svg>
                    Pause
                </motion.button>
            )}

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStop}
                disabled={isQuickTraining}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h12v12H6z" />
                </svg>
                Reset
            </motion.button>

            {/* Divider */}
            <div className="w-px h-6 bg-neutral-600 mx-1" />

            {/* Quick Train Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onQuickTrain(5)}
                disabled={isQuickTraining || isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-neutral-600 disabled:to-neutral-600 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
            >
                {isQuickTraining ? (
                    <>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                        />
                        {quickTrainProgress ? `${quickTrainProgress.current}/${quickTrainProgress.total}` : 'Training...'}
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        Quick ×5
                    </>
                )}
            </motion.button>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 ml-2">
                <div className={`w-2 h-2 rounded-full ${isQuickTraining ? 'bg-purple-400 animate-pulse' :
                        isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                    }`} />
                <span className="text-xs text-neutral-400 font-mono">
                    {isQuickTraining ? 'Quick Training' : isRunning ? 'Running' : 'Paused'}
                </span>
            </div>
        </div>
    );
}
