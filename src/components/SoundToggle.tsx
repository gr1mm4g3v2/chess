"use client";

interface SoundToggleProps {
    enabled: boolean;
    onToggle: () => void;
}

export default function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
    return (
        <button
            onClick={onToggle}
            className={`
                p-2 rounded-lg border transition-all duration-200
                ${enabled
                    ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50'
                    : 'bg-neutral-900/50 border-neutral-700/50 text-neutral-500 hover:bg-neutral-800/50'
                }
            `}
            title={enabled ? 'Sound On' : 'Sound Off'}
        >
            {enabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
            )}
        </button>
    );
}
