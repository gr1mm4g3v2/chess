/**
 * Opening Book for Chess AI
 * Contains common opening lines that the AI will play in the first ~10 moves
 * when the position matches a known book position.
 */

// Opening book maps FEN position (without move counters) to best moves
// Format: simplified FEN -> [move options with weights]
interface BookMove {
    move: string;
    weight: number; // Higher weight = more likely to be chosen
}

// Simplify FEN to just piece positions and castling rights (for matching)
export function simplifyFen(fen: string): string {
    const parts = fen.split(' ');
    return parts.slice(0, 4).join(' ');
}

// Opening book organized by ECO codes
const OPENING_BOOK: Record<string, BookMove[]> = {
    // Starting position
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
        { move: 'e4', weight: 35 },   // King's Pawn
        { move: 'd4', weight: 35 },   // Queen's Pawn
        { move: 'Nf3', weight: 15 },  // Réti
        { move: 'c4', weight: 15 },   // English
    ],

    // === KING'S PAWN OPENINGS (1. e4) ===

    // After 1. e4
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
        { move: 'e5', weight: 30 },   // Open Game
        { move: 'c5', weight: 30 },   // Sicilian
        { move: 'e6', weight: 15 },   // French
        { move: 'c6', weight: 15 },   // Caro-Kann
        { move: 'd5', weight: 10 },   // Scandinavian
    ],

    // Sicilian Defense: 1. e4 c5
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
        { move: 'Nf3', weight: 60 },  // Open Sicilian
        { move: 'Nc3', weight: 20 },  // Closed Sicilian
        { move: 'c3', weight: 20 },   // Alapin
    ],

    // Sicilian: 1. e4 c5 2. Nf3
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
        { move: 'd6', weight: 35 },   // Najdorf/Dragon setup
        { move: 'Nc6', weight: 35 },  // Classical
        { move: 'e6', weight: 30 },   // Scheveningen/Kan
    ],

    // Sicilian Najdorf: 1. e4 c5 2. Nf3 d6
    'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
        { move: 'd4', weight: 70 },
        { move: 'Bb5+', weight: 30 },
    ],

    // Open Game: 1. e4 e5
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
        { move: 'Nf3', weight: 70 },  // Most common
        { move: 'Nc3', weight: 15 },  // Vienna
        { move: 'Bc4', weight: 15 },  // Bishop's Opening
    ],

    // After 1. e4 e5 2. Nf3
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
        { move: 'Nc6', weight: 70 },  // Most common
        { move: 'Nf6', weight: 20 },  // Petrov
        { move: 'd6', weight: 10 },   // Philidor
    ],

    // Italian Game setup: 1. e4 e5 2. Nf3 Nc6
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
        { move: 'Bc4', weight: 40 },  // Italian
        { move: 'Bb5', weight: 40 },  // Spanish (Ruy Lopez)
        { move: 'd4', weight: 20 },   // Scotch
    ],

    // Italian Game: 1. e4 e5 2. Nf3 Nc6 3. Bc4
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
        { move: 'Bc5', weight: 50 },  // Giuoco Piano
        { move: 'Nf6', weight: 50 },  // Two Knights
    ],

    // Giuoco Piano: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5
    'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': [
        { move: 'c3', weight: 50 },   // Main line
        { move: 'O-O', weight: 30 },  // Development
        { move: 'd3', weight: 20 },   // Quiet
    ],

    // Ruy Lopez: 1. e4 e5 2. Nf3 Nc6 3. Bb5
    'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
        { move: 'a6', weight: 60 },   // Morphy Defense
        { move: 'Nf6', weight: 25 },  // Berlin
        { move: 'Bc5', weight: 15 },  // Classical
    ],

    // French Defense: 1. e4 e6
    'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
        { move: 'd4', weight: 80 },
        { move: 'Nf3', weight: 20 },
    ],

    // French: 1. e4 e6 2. d4
    'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [
        { move: 'd5', weight: 100 },
    ],

    // Caro-Kann: 1. e4 c6
    'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
        { move: 'd4', weight: 70 },
        { move: 'Nc3', weight: 30 },
    ],

    // === QUEEN'S PAWN OPENINGS (1. d4) ===

    // After 1. d4
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
        { move: 'd5', weight: 35 },   // Closed games
        { move: 'Nf6', weight: 40 },  // Indian defenses
        { move: 'e6', weight: 15 },   // Can transpose
        { move: 'f5', weight: 10 },   // Dutch
    ],

    // Queen's Gambit: 1. d4 d5
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
        { move: 'c4', weight: 70 },   // Queen's Gambit
        { move: 'Nf3', weight: 20 },
        { move: 'Bf4', weight: 10 },  // London
    ],

    // Queen's Gambit: 1. d4 d5 2. c4
    'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': [
        { move: 'e6', weight: 40 },   // QGD
        { move: 'c6', weight: 35 },   // Slav
        { move: 'dxc4', weight: 25 }, // QGA
    ],

    // King's Indian: 1. d4 Nf6
    'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
        { move: 'c4', weight: 50 },
        { move: 'Nf3', weight: 30 },
        { move: 'Bf4', weight: 20 },  // London
    ],

    // King's Indian: 1. d4 Nf6 2. c4
    'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': [
        { move: 'g6', weight: 35 },   // King's Indian
        { move: 'e6', weight: 35 },   // Nimzo/QID
        { move: 'c5', weight: 20 },   // Benoni
        { move: 'd5', weight: 10 },   // Grünfeld
    ],

    // King's Indian: 1. d4 Nf6 2. c4 g6
    'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
        { move: 'Nc3', weight: 60 },
        { move: 'Nf3', weight: 30 },
        { move: 'g3', weight: 10 },
    ],

    // Nimzo-Indian: 1. d4 Nf6 2. c4 e6
    'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
        { move: 'Nc3', weight: 50 },  // Allows Nimzo
        { move: 'Nf3', weight: 40 },  // Avoids Nimzo
        { move: 'g3', weight: 10 },   // Catalan
    ],

    // === RÉTI AND ENGLISH ===

    // English: 1. c4
    'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -': [
        { move: 'e5', weight: 30 },
        { move: 'Nf6', weight: 30 },
        { move: 'c5', weight: 25 },   // Symmetrical
        { move: 'e6', weight: 15 },
    ],

    // Réti: 1. Nf3
    'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': [
        { move: 'd5', weight: 40 },
        { move: 'Nf6', weight: 35 },
        { move: 'c5', weight: 25 },
    ],
};

/**
 * Get a book move for the given position, if one exists
 * @param fen Full FEN string of current position
 * @returns Book move in SAN format, or null if not in book
 */
export function getBookMove(fen: string): string | null {
    const simplified = simplifyFen(fen);
    const bookMoves = OPENING_BOOK[simplified];

    if (!bookMoves || bookMoves.length === 0) {
        return null;
    }

    // Weighted random selection
    const totalWeight = bookMoves.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const bookMove of bookMoves) {
        random -= bookMove.weight;
        if (random <= 0) {
            return bookMove.move;
        }
    }

    // Fallback to first move
    return bookMoves[0].move;
}

/**
 * Check if the current position is still in book territory
 * (used to decide when to stop using book moves)
 */
export function isInBook(fen: string): boolean {
    const simplified = simplifyFen(fen);
    return simplified in OPENING_BOOK;
}

/**
 * Get all book moves for a position (for debugging/display)
 */
export function getBookMoves(fen: string): BookMove[] | null {
    const simplified = simplifyFen(fen);
    return OPENING_BOOK[simplified] || null;
}
