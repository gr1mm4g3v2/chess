"use client";

import { motion } from 'framer-motion';

type GamePhase = 'opening' | 'middlegame' | 'endgame';

interface GamePhaseIndicatorProps {
    phase: GamePhase;
}

const phaseInfo = {
    opening: { label: 'Opening', icon: '📖', color: 'from-cyan-600 to-cyan-400', bg: 'bg-cyan-900/20' },
    middlegame: { label: 'Middlegame', icon: '⚔️', color: 'from-orange-600 to-orange-400', bg: 'bg-orange-900/20' },
    endgame: { label: 'Endgame', icon: '🏁', color: 'from-purple-600 to-purple-400', bg: 'bg-purple-900/20' }
};

export default function GamePhaseIndicator({ phase }: GamePhaseIndicatorProps) {
    const info = phaseInfo[phase];

    return (
        <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${info.bg} border border-neutral-700/50`}
        >
            <span className="text-sm">{info.icon}</span>
            <span className={`text-xs font-bold bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>
                {info.label}
            </span>
        </motion.div>
    );
}
