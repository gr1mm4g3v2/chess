"use client";

interface StreakDisplayProps {
    currentStreak: number;
    bestWinStreak: number;
    bestLossStreak: number;
    color: 'white' | 'black';
}

export default function StreakDisplay({
    currentStreak,
    bestWinStreak,
    bestLossStreak,
    color
}: StreakDisplayProps) {
    const isWinStreak = currentStreak > 0;
    const isLossStreak = currentStreak < 0;
    const streakValue = Math.abs(currentStreak);

    // Get streak icon and color
    const getStreakDisplay = () => {
        if (streakValue === 0) {
            return { icon: '−', color: 'text-neutral-500', label: 'No streak' };
        }
        if (isWinStreak) {
            if (streakValue >= 5) return { icon: '🔥', color: 'text-orange-400', label: `${streakValue} wins` };
            if (streakValue >= 3) return { icon: '🔥', color: 'text-yellow-400', label: `${streakValue} wins` };
            return { icon: '✓', color: 'text-emerald-400', label: `${streakValue} win${streakValue > 1 ? 's' : ''}` };
        }
        // Loss streak
        if (streakValue >= 5) return { icon: '❄️', color: 'text-blue-400', label: `${streakValue} losses` };
        if (streakValue >= 3) return { icon: '↓', color: 'text-red-400', label: `${streakValue} losses` };
        return { icon: '✗', color: 'text-red-400', label: `${streakValue} loss${streakValue > 1 ? 'es' : ''}` };
    };

    const streak = getStreakDisplay();
    const isWhite = color === 'white';

    return (
        <div className={`p-3 rounded-lg border ${isWhite ? 'bg-white/5 border-white/10' : 'bg-neutral-950/50 border-neutral-700/50'}`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${isWhite ? 'bg-white border-neutral-600' : 'bg-neutral-800 border-neutral-500'} border`} />
                <span className={`text-sm font-bold ${isWhite ? 'text-white' : 'text-neutral-300'}`}>
                    {isWhite ? 'White' : 'Black'} Streaks
                </span>
            </div>

            {/* Current Streak */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">Current</span>
                <div className={`flex items-center gap-1 ${streak.color}`}>
                    <span className="text-lg">{streak.icon}</span>
                    <span className="text-xs font-mono">{streak.label}</span>
                </div>
            </div>

            {/* Best Streaks */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex flex-col items-center p-1.5 bg-neutral-800/50 rounded">
                    <span className="text-neutral-500 text-[10px]">Best Win</span>
                    <span className="text-emerald-400">{bestWinStreak}</span>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-neutral-800/50 rounded">
                    <span className="text-neutral-500 text-[10px]">Worst Loss</span>
                    <span className="text-red-400">{bestLossStreak}</span>
                </div>
            </div>
        </div>
    );
}
