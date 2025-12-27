"use client";

import { useMemo } from "react";

interface CustomBoardProps {
    fen: string;
    lastMove?: { from: string; to: string } | null;
}

// Chess piece SVG components (standard piece designs)
const PieceSVG: Record<string, React.FC<{ color: "white" | "black" }>> = {
    k: ({ color }) => (
        <svg viewBox="0 0 45 45" className="w-full h-full">
            <g fill={color === "white" ? "#fff" : "#000"} stroke={color === "white" ? "#000" : "#fff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
                <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={color === "white" ? "#fff" : "#000"} strokeLinecap="butt" strokeLinejoin="miter" />
                <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill={color === "white" ? "#fff" : "#000"} />
                <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
            </g>
        </svg>
    ),
    q: ({ color }) => (
        <svg viewBox="0 0 45 45" className="w-full h-full">
            <g fill={color === "white" ? "#fff" : "#000"} stroke={color === "white" ? "#000" : "#fff"} strokeWidth="1.5" strokeLinejoin="round">
                <circle cx="6" cy="12" r="2.75" />
                <circle cx="14" cy="9" r="2.75" />
                <circle cx="22.5" cy="8" r="2.75" />
                <circle cx="31" cy="9" r="2.75" />
                <circle cx="39" cy="12" r="2.75" />
                <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-7-5.5 8-5.5-8-3.5 7-7.5-12.5L9 26z" strokeLinecap="butt" />
                <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt" />
                <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" strokeLinecap="butt" />
                <path d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0" fill="none" stroke={color === "white" ? "#000" : "#fff"} />
            </g>
        </svg>
    ),
    r: ({ color }) => (
        <svg viewBox="0 0 45 45" className="w-full h-full">
            <g fill={color === "white" ? "#fff" : "#000"} stroke={color === "white" ? "#000" : "#fff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
                <path d="M34 14l-3 3H14l-3-3" />
                <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
                <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
                <path d="M11 14h23" fill="none" strokeLinejoin="miter" />
            </g>
        </svg>
    ),
    b: ({ color }) => (
        <svg viewBox="0 0 45 45" className="w-full h-full">
            <g fill={color === "white" ? "#fff" : "#000"} stroke={color === "white" ? "#000" : "#fff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
                <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
                <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
                <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={color === "white" ? "#000" : "#fff"} strokeLinejoin="miter" fill="none" />
            </g>
        </svg>
    ),
    n: ({ color }) => (
        <svg viewBox="0 0 45 45" className="w-full h-full">
            <g fill={color === "white" ? "#fff" : "#000"} stroke={color === "white" ? "#000" : "#fff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
                <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
                <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill={color === "white" ? "#000" : "#fff"} stroke="none" />
            </g>
        </svg>
    ),
    p: ({ color }) => (
        <svg viewBox="0 0 45 45" className="w-full h-full">
            <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={color === "white" ? "#fff" : "#000"} stroke={color === "white" ? "#000" : "#fff"} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
};

function fenToBoard(fen: string): (string | null)[][] {
    const boardPart = fen.split(" ")[0];
    const rows = boardPart.split("/");
    const board: (string | null)[][] = [];

    for (const row of rows) {
        const boardRow: (string | null)[] = [];
        for (const char of row) {
            if (/\d/.test(char)) {
                for (let i = 0; i < parseInt(char, 10); i++) {
                    boardRow.push(null);
                }
            } else {
                boardRow.push(char);
            }
        }
        board.push(boardRow);
    }
    return board;
}

function squareToCoords(square: string): { row: number; col: number } | null {
    if (!square || square.length !== 2) return null;
    const col = square.charCodeAt(0) - "a".charCodeAt(0);
    const row = 8 - parseInt(square[1], 10);
    return { row, col };
}

export default function CustomBoard({ fen, lastMove }: CustomBoardProps) {
    const board = useMemo(() => fenToBoard(fen), [fen]);

    const lastMoveSquares = useMemo(() => {
        if (!lastMove) return new Set<string>();
        const set = new Set<string>();
        const from = squareToCoords(lastMove.from);
        const to = squareToCoords(lastMove.to);
        if (from) set.add(`${from.row}-${from.col}`);
        if (to) set.add(`${to.row}-${to.col}`);
        return set;
    }, [lastMove]);

    return (
        <div className="flex flex-col gap-2 w-full max-w-[600px]">
            <div className="w-full aspect-square grid grid-cols-8 grid-rows-8 border-4 border-neutral-700 rounded-lg overflow-hidden shadow-2xl">
                {board.map((row, rowIdx) =>
                    row.map((piece, colIdx) => {
                        const isLight = (rowIdx + colIdx) % 2 === 0;
                        const isHighlighted = lastMoveSquares.has(`${rowIdx}-${colIdx}`);
                        const bgColor = isHighlighted
                            ? "rgba(255, 255, 0, 0.5)"
                            : isLight
                                ? "#f0d9b5"
                                : "#b58863";

                        const pieceKey = piece?.toLowerCase();
                        const PieceComponent = pieceKey ? PieceSVG[pieceKey] : null;
                        const pieceColor = piece && piece === piece.toUpperCase() ? "white" : "black";

                        return (
                            <div
                                key={`${rowIdx}-${colIdx}`}
                                className="flex items-center justify-center select-none p-[5%]"
                                style={{ backgroundColor: bgColor }}
                            >
                                {PieceComponent && <PieceComponent color={pieceColor} />}
                            </div>
                        );
                    })
                )}
            </div>
            <p className="text-[10px] text-neutral-600 font-mono break-all truncate">
                DEBUG FEN: {fen}
            </p>
        </div>
    );
}
