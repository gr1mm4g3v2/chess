"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ThinkingIndicatorProps {
    status: 'thinking' | 'waiting' | 'idle';
    turn: 'w' | 'b';
    delayMs?: number;
}

export default function ThinkingIndicator({ status, turn, delayMs }: ThinkingIndicatorProps) {
    const color = turn === 'w' ? 'White' : 'Black';

    return (
        <AnimatePresence mode="wait">
            {status !== 'idle' && (
                <motion.div
                    key={status}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                        background: status === 'thinking'
                            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))'
                            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
                        border: status === 'thinking'
                            ? '1px solid rgba(251, 191, 36, 0.4)'
                            : '1px solid rgba(34, 197, 94, 0.4)',
                    }}
                >
                    {status === 'thinking' ? (
                        <>
                            <motion.div
                                className="flex gap-0.5"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            >
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                            </motion.div>
                            <span className="text-amber-300">{color} thinking...</span>
                        </>
                    ) : (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full"
                            />
                            <span className="text-emerald-300">
                                Waiting {delayMs ? `${delayMs}ms` : ''}
                            </span>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
