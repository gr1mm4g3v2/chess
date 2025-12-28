/**
 * Stockfish Engine Wrapper
 * 
 * Provides a simple interface to interact with the Stockfish chess engine
 * for benchmarking the AI's strength.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// Try to find stockfish binary
const STOCKFISH_PATHS = [
    'stockfish', // System PATH
    path.join(process.cwd(), 'node_modules', 'stockfish', 'src', 'stockfish.js'),
    '/usr/bin/stockfish',
    '/usr/local/bin/stockfish'
];

export class StockfishEngine {
    private process: ChildProcess | null = null;
    private ready: boolean = false;
    private skillLevel: number = 10; // 0-20 scale
    private pendingResolve: ((move: string) => void) | null = null;
    private outputBuffer: string = '';

    /**
     * Initialize the Stockfish engine
     */
    async init(): Promise<boolean> {
        return new Promise((resolve) => {
            // Try to spawn stockfish
            for (const sfPath of STOCKFISH_PATHS) {
                try {
                    if (sfPath.endsWith('.js')) {
                        // Node.js stockfish
                        this.process = spawn('node', [sfPath]);
                    } else {
                        this.process = spawn(sfPath);
                    }

                    if (this.process.pid) {
                        console.log(`[Stockfish] Started with PID ${this.process.pid}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!this.process || !this.process.stdout) {
                console.error('[Stockfish] Failed to start engine');
                resolve(false);
                return;
            }

            this.process.stdout.on('data', (data: Buffer) => {
                this.outputBuffer += data.toString();
                this.processOutput();
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                console.error('[Stockfish Error]', data.toString());
            });

            this.process.on('close', (code) => {
                console.log(`[Stockfish] Process exited with code ${code}`);
                this.ready = false;
            });

            // Send UCI initialization
            this.send('uci');

            // Wait for 'uciok'
            const checkReady = setInterval(() => {
                if (this.outputBuffer.includes('uciok')) {
                    clearInterval(checkReady);
                    this.ready = true;
                    this.setSkillLevel(this.skillLevel);
                    resolve(true);
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                if (!this.ready) {
                    console.error('[Stockfish] Initialization timeout');
                    resolve(false);
                }
            }, 5000);
        });
    }

    /**
     * Send a command to Stockfish
     */
    private send(command: string): void {
        if (this.process?.stdin) {
            this.process.stdin.write(command + '\n');
        }
    }

    /**
     * Process Stockfish output
     */
    private processOutput(): void {
        const lines = this.outputBuffer.split('\n');

        for (const line of lines) {
            // Check for best move response
            if (line.startsWith('bestmove')) {
                const parts = line.split(' ');
                const move = parts[1];
                if (this.pendingResolve && move) {
                    this.pendingResolve(move);
                    this.pendingResolve = null;
                }
            }
        }
    }

    /**
     * Set Stockfish skill level (0-20)
     */
    setSkillLevel(level: number): void {
        this.skillLevel = Math.max(0, Math.min(20, level));
        this.send(`setoption name Skill Level value ${this.skillLevel}`);
        console.log(`[Stockfish] Skill level set to ${this.skillLevel}`);
    }

    /**
     * Get best move for a position
     */
    async getBestMove(fen: string, thinkTimeMs: number = 1000): Promise<string | null> {
        if (!this.ready) {
            console.error('[Stockfish] Engine not ready');
            return null;
        }

        return new Promise((resolve) => {
            this.outputBuffer = '';
            this.pendingResolve = resolve;

            this.send('ucinewgame');
            this.send(`position fen ${fen}`);
            this.send(`go movetime ${thinkTimeMs}`);

            // Timeout
            setTimeout(() => {
                if (this.pendingResolve) {
                    this.pendingResolve = null;
                    resolve(null);
                }
            }, thinkTimeMs + 2000);
        });
    }

    /**
     * Shutdown the engine
     */
    quit(): void {
        if (this.process) {
            this.send('quit');
            this.process.kill();
            this.process = null;
            this.ready = false;
        }
    }

    /**
     * Check if engine is ready
     */
    isReady(): boolean {
        return this.ready;
    }

    /**
     * Get approximate ELO for skill level
     * Rough estimates based on Stockfish skill level documentation
     */
    static skillLevelToElo(level: number): number {
        // Skill level 0 ≈ 800, level 20 ≈ 3200
        return 800 + (level * 120);
    }

    /**
     * Get skill level for target ELO
     */
    static eloToSkillLevel(elo: number): number {
        const level = Math.round((elo - 800) / 120);
        return Math.max(0, Math.min(20, level));
    }
}
