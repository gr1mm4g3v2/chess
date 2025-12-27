"use client";

import { useState, useEffect } from "react";
import { Chess } from "chess.js";

interface GameRecord {
    id: number;
    timestamp: string;
    pgn: string;
    moves: string[];
    result: 'white' | 'black' | 'draw';
    reason: string;
    whiteElo: number;
    blackElo: number;
}

interface GameHistoryProps {
    games: GameRecord[];
    onReplay: (fen: string) => void;
    onClose: () => void;
}

export default function GameHistory({ games, onReplay, onClose }: GameHistoryProps) {
    const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
    const [replayIndex, setReplayIndex] = useState(0);
    const [positions, setPositions] = useState<string[]>([]);

    useEffect(() => {
        if (selectedGame) {
            // Generate all positions from the game
            const chess = new Chess();
            const allPositions = [chess.fen()];
            for (const move of selectedGame.moves) {
                try {
                    chess.move(move);
                    allPositions.push(chess.fen());
                } catch (e) {
                    break;
                }
            }
            setPositions(allPositions);
            setReplayIndex(0);
        }
    }, [selectedGame]);

    useEffect(() => {
        if (positions.length > 0) {
            onReplay(positions[replayIndex]);
        }
    }, [replayIndex, positions, onReplay]);

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const resultIcon = (result: string) => {
        if (result === 'white') return '⚪';
        if (result === 'black') return '⚫';
        return '🤝';
    };

    if (selectedGame) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 max-w-md w-full">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg">Game #{selectedGame.id}</h3>
                            <p className="text-xs text-neutral-400">{formatDate(selectedGame.timestamp)}</p>
                        </div>
                        <button
                            onClick={() => setSelectedGame(null)}
                            className="text-neutral-500 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-4 text-sm">
                        <span>{resultIcon(selectedGame.result)} {selectedGame.reason}</span>
                        <span className="text-neutral-400">
                            W: {selectedGame.whiteElo} | B: {selectedGame.blackElo}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <button
                            onClick={() => setReplayIndex(0)}
                            disabled={replayIndex === 0}
                            className="px-2 py-1 bg-neutral-800 rounded disabled:opacity-50"
                        >
                            ⏮
                        </button>
                        <button
                            onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}
                            disabled={replayIndex === 0}
                            className="px-2 py-1 bg-neutral-800 rounded disabled:opacity-50"
                        >
                            ◀
                        </button>
                        <span className="flex-1 text-center font-mono text-sm">
                            {replayIndex} / {positions.length - 1}
                        </span>
                        <button
                            onClick={() => setReplayIndex(Math.min(positions.length - 1, replayIndex + 1))}
                            disabled={replayIndex >= positions.length - 1}
                            className="px-2 py-1 bg-neutral-800 rounded disabled:opacity-50"
                        >
                            ▶
                        </button>
                        <button
                            onClick={() => setReplayIndex(positions.length - 1)}
                            disabled={replayIndex >= positions.length - 1}
                            className="px-2 py-1 bg-neutral-800 rounded disabled:opacity-50"
                        >
                            ⏭
                        </button>
                    </div>

                    <div className="bg-neutral-950 rounded p-2 text-xs font-mono text-neutral-400 max-h-32 overflow-auto">
                        {selectedGame.moves.map((move, i) => (
                            <span
                                key={i}
                                className={`${i === replayIndex - 1 ? 'text-emerald-400 font-bold' : ''}`}
                            >
                                {i % 2 === 0 && <span className="text-neutral-600">{Math.floor(i / 2) + 1}. </span>}
                                {move}{' '}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 max-w-md w-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">Game History</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-500 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {games.length === 0 ? (
                    <p className="text-neutral-400 text-center py-8">No games recorded yet</p>
                ) : (
                    <div className="flex-1 overflow-auto space-y-2">
                        {[...games].reverse().map((game) => (
                            <button
                                key={game.id}
                                onClick={() => setSelectedGame(game)}
                                className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg text-left transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-bold">Game #{game.id}</span>
                                    <span className="text-xl">{resultIcon(game.result)}</span>
                                </div>
                                <div className="text-xs text-neutral-400 mt-1">
                                    {formatDate(game.timestamp)}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                    {game.moves.length} moves • {game.reason}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
