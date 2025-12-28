import * as fs from 'fs';
import * as path from 'path';
import { AIState } from './ai/neural-net';

const STATE_FILE = path.join(process.cwd(), 'ai-state.json');
const HISTORY_FILE = path.join(process.cwd(), 'game-history.json');
const LEARNING_FILE = path.join(process.cwd(), 'learning-snapshots.json');
const MAX_GAMES_STORED = 50;
const MAX_SNAPSHOTS_STORED = 100;

export interface DualAIState {
    white: AIState;
    black: AIState;
}

export interface GameRecord {
    id: number;
    timestamp: string;
    pgn: string;
    moves: string[];
    moveTimesMs: number[]; // Time taken for each move in milliseconds
    result: 'white' | 'black' | 'draw';
    reason: string;
    whiteElo: number;
    blackElo: number;
}

export interface LearningSnapshot {
    game: number;
    timestamp: string;
    positionsLearned: number;
    explorationRate: number;
    winRate: number; // Last 10 games rolling average
    elo: number;
}

export function loadDualAIState(): DualAIState | null {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf-8');
            console.log('Loaded dual AI state from disk:', STATE_FILE);
            return JSON.parse(data) as DualAIState;
        }
    } catch (e) {
        console.error('Failed to load AI state:', e);
    }
    return null;
}

export function saveDualAIState(state: DualAIState): void {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log('Saved dual AI state to disk');
    } catch (e) {
        console.error('Failed to save AI state:', e);
    }
}

export function loadGameHistory(): GameRecord[] {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
            return JSON.parse(data) as GameRecord[];
        }
    } catch (e) {
        console.error('Failed to load game history:', e);
    }
    return [];
}

export function saveGameToHistory(game: Omit<GameRecord, 'id' | 'timestamp'>): void {
    try {
        const history = loadGameHistory();
        const newGame: GameRecord = {
            ...game,
            id: history.length > 0 ? Math.max(...history.map(g => g.id)) + 1 : 1,
            timestamp: new Date().toISOString()
        };

        history.push(newGame);

        // Keep only the last N games
        const trimmed = history.slice(-MAX_GAMES_STORED);

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
        console.log(`Saved game #${newGame.id} to history`);
    } catch (e) {
        console.error('Failed to save game to history:', e);
    }
}

export function loadLearningSnapshots(): LearningSnapshot[] {
    try {
        if (fs.existsSync(LEARNING_FILE)) {
            const data = fs.readFileSync(LEARNING_FILE, 'utf-8');
            return JSON.parse(data) as LearningSnapshot[];
        }
    } catch (e) {
        console.error('Failed to load learning snapshots:', e);
    }
    return [];
}

export function saveLearningSnapshot(snapshot: Omit<LearningSnapshot, 'timestamp'>): void {
    try {
        const snapshots = loadLearningSnapshots();
        const newSnapshot: LearningSnapshot = {
            ...snapshot,
            timestamp: new Date().toISOString()
        };

        snapshots.push(newSnapshot);

        // Keep only the last N snapshots
        const trimmed = snapshots.slice(-MAX_SNAPSHOTS_STORED);

        fs.writeFileSync(LEARNING_FILE, JSON.stringify(trimmed, null, 2));
        console.log(`Saved learning snapshot for game #${newSnapshot.game}`);
    } catch (e) {
        console.error('Failed to save learning snapshot:', e);
    }
}


