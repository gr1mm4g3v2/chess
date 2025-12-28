/**
 * Saved Bots Persistence
 * 
 * Manages saved AI snapshots for playing against later.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AIState } from './ai/neural-net';

const BOTS_FILE = path.join(process.cwd(), 'saved-bots.json');
const MAX_BOTS = 20;

export interface SavedBot {
    id: string;
    name: string;
    createdAt: string;
    elo: number;
    gamesPlayed: number;
    positionsLearned: number;
    state: AIState;
}

export function loadSavedBots(): SavedBot[] {
    try {
        if (fs.existsSync(BOTS_FILE)) {
            const data = fs.readFileSync(BOTS_FILE, 'utf-8');
            return JSON.parse(data) as SavedBot[];
        }
    } catch (e) {
        console.error('Failed to load saved bots:', e);
    }
    return [];
}

function saveBots(bots: SavedBot[]): void {
    try {
        fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
    } catch (e) {
        console.error('Failed to save bots:', e);
    }
}

export function saveBot(name: string, state: AIState): SavedBot {
    const bots = loadSavedBots();

    const newBot: SavedBot = {
        id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: new Date().toISOString(),
        elo: state.elo,
        gamesPlayed: state.gamesPlayed,
        positionsLearned: Object.keys(state.qTable).length,
        state
    };

    bots.push(newBot);

    // Keep only the most recent bots
    const trimmed = bots.slice(-MAX_BOTS);
    saveBots(trimmed);

    console.log(`Saved bot "${name}" with ELO ${state.elo}`);
    return newBot;
}

export function deleteBot(id: string): boolean {
    const bots = loadSavedBots();
    const filtered = bots.filter(b => b.id !== id);

    if (filtered.length < bots.length) {
        saveBots(filtered);
        console.log(`Deleted bot ${id}`);
        return true;
    }
    return false;
}

export function getBot(id: string): SavedBot | undefined {
    const bots = loadSavedBots();
    return bots.find(b => b.id === id);
}

export function renameBot(id: string, newName: string): boolean {
    const bots = loadSavedBots();
    const bot = bots.find(b => b.id === id);

    if (bot) {
        bot.name = newName;
        saveBots(bots);
        return true;
    }
    return false;
}
