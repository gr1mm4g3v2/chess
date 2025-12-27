"use client";

interface EvalBarProps {
    evaluation: number; // -1 (black winning) to 1 (white winning)
}

export default function EvalBar({ evaluation }: EvalBarProps) {
    // Clamp evaluation between -1 and 1
    const clampedEval = Math.max(-1, Math.min(1, evaluation));

    // Convert to percentage (0% = black winning, 100% = white winning)
    const whitePercent = ((clampedEval + 1) / 2) * 100;

    // Format display value
    const displayValue = Math.abs(clampedEval * 10).toFixed(1);
    const leader = clampedEval > 0.05 ? "+" : clampedEval < -0.05 ? "-" : "";

    return (
        <div className="flex flex-col items-center gap-1 h-full">
            <div className="relative w-6 h-full min-h-[400px] bg-neutral-900 rounded overflow-hidden shadow-lg border border-neutral-700">
                {/* White section (bottom) */}
                <div
                    className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300 ease-out"
                    style={{ height: `${whitePercent}%` }}
                />
                {/* Black section (top) - implicit via background */}

                {/* Center line */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-neutral-600 -translate-y-1/2" />
            </div>

            {/* Evaluation number */}
            <div className="text-xs font-mono text-neutral-400">
                {leader}{displayValue}
            </div>
        </div>
    );
}
