"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Chessboard = dynamic(() => import("react-chessboard").then((mod) => mod.Chessboard), {
    ssr: false,
    loading: () => <div className="aspect-square w-full bg-neutral-800 rounded-lg animate-pulse" />
});

interface LiveBoardProps {
    fen: string;
    lastMove?: { from: string, to: string } | null;
}

export default function LiveBoard({ fen, lastMove }: LiveBoardProps) {
    // React-chessboard might prefer just the position part of the FEN?
    const boardPosition = fen.split(' ')[0];

    const customSquareStyles = lastMove ? {
        [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
        [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
    } : {};

    return (
        <div className="flex flex-col gap-2 w-full max-w-[600px]">
            <div className="w-full aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-neutral-800 relative z-0">
                <Chessboard
                    animationDuration={200}
                    position={boardPosition}
                    arePiecesDraggable={false}
                    customDarkSquareStyle={{ backgroundColor: '#779556' }}
                    customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
                    customSquareStyles={customSquareStyles}
                />
            </div>
            <p className="text-[10px] text-neutral-600 font-mono break-all truncate">
                DEBUG FEN: {fen}
            </p>
        </div>
    );
}
