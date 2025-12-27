"use client";

import { useState } from "react";

interface SpeedControlProps {
    onSpeedChange: (speedMs: number) => void;
}

const SPEED_PRESETS = [
    { label: "Slow", value: 1500, desc: "Watch moves" },
    { label: "Normal", value: 800, desc: "Default" },
    { label: "Fast", value: 300, desc: "Quick training" },
    { label: "Turbo", value: 50, desc: "Rapid learning" },
];

export default function SpeedControl({ onSpeedChange }: SpeedControlProps) {
    const [speed, setSpeed] = useState(800);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSpeedChange = (value: number) => {
        setSpeed(value);
        onSpeedChange(value);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg transition-colors text-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="font-mono text-xs">
                    {speed}ms
                </span>
            </button>

            {isExpanded && (
                <div className="absolute bottom-full left-0 mb-2 p-3 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl min-w-[200px] z-50">
                    <p className="text-xs text-neutral-400 mb-3 uppercase tracking-wider">Training Speed</p>

                    <input
                        type="range"
                        min={50}
                        max={1500}
                        step={50}
                        value={speed}
                        onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    <div className="flex justify-between text-[10px] text-neutral-500 mt-1 mb-3">
                        <span>Turbo</span>
                        <span>Slow</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {SPEED_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => handleSpeedChange(preset.value)}
                                className={`px-2 py-1.5 rounded text-xs transition-colors ${speed === preset.value
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
