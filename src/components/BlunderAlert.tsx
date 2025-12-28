"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

type MoveQuality = 'normal' | 'good' | 'excellent' | 'brilliant' | 'inaccuracy' | 'mistake' | 'blunder';

interface MoveEvaluation {
    moveNumber: number;
    move: string;
    evalBefore: number;
    evalAfter: number;
    evalChange: number;
    quality: MoveQuality;
    player: 'white' | 'black';
}

interface BlunderAlertProps {
    lastMoveEval: MoveEvaluation | null;
}

const qualityInfo: Record<MoveQuality, { label: string; icon: string; color: string; bgColor: string; borderColor: string } | null> = {
    brilliant: { label: 'Brilliant!', icon: '🌟', color: 'text-cyan-300', bgColor: 'bg-cyan-900/80', borderColor: 'border-cyan-500' },
    excellent: { label: 'Excellent', icon: '✨', color: 'text-emerald-300', bgColor: 'bg-emerald-900/80', borderColor: 'border-emerald-500' },
    good: { label: 'Good', icon: '✓', color: 'text-green-300', bgColor: 'bg-green-900/60', borderColor: 'border-green-600' },
    inaccuracy: { label: 'Inaccuracy', icon: '?!', color: 'text-yellow-300', bgColor: 'bg-yellow-900/60', borderColor: 'border-yellow-600' },
    mistake: { label: 'Mistake', icon: '?', color: 'text-orange-300', bgColor: 'bg-orange-900/80', borderColor: 'border-orange-500' },
    blunder: { label: 'Blunder!', icon: '??', color: 'text-red-300', bgColor: 'bg-red-900/80', borderColor: 'border-red-500' },
    normal: null
};

export default function BlunderAlert({ lastMoveEval }: BlunderAlertProps) {
    const [visible, setVisible] = useState(false);
    const [displayEval, setDisplayEval] = useState<MoveEvaluation | null>(null);

    useEffect(() => {
        if (lastMoveEval && lastMoveEval.quality !== 'normal') {
            setDisplayEval(lastMoveEval);
            setVisible(true);

            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [lastMoveEval]);

    const info = displayEval ? qualityInfo[displayEval.quality] : null;
    if (!info) return null;

    return (
        <AnimatePresence>
            {visible && displayEval && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className={`
                        absolute top-4 left-1/2 -translate-x-1/2 z-30
                        px-4 py-2 rounded-lg border-2 shadow-lg backdrop-blur-sm
                        ${info.bgColor} ${info.borderColor}
                    `}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                            <div className={`font-bold ${info.color}`}>{info.label}</div>
                            <div className="text-xs text-neutral-300 font-mono">
                                {displayEval.player === 'white' ? '♔' : '♚'} {displayEval.move}
                                <span className={`ml-2 ${displayEval.evalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {displayEval.evalChange >= 0 ? '+' : ''}{(displayEval.evalChange * 30).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
