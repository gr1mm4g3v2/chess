/**
 * Chess Sound Effects Hook
 * 
 * Provides sound effects for moves, captures, checks, and game events.
 * Uses Web Audio API for low-latency playback.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type SoundType = 'move' | 'capture' | 'check' | 'castle' | 'promote' | 'gameEnd' | 'blunder' | 'brilliant';

// Web Audio API context
let audioContext: AudioContext | null = null;

// Sound data URLs (simple synthesized tones)
const SOUND_FREQUENCIES: Record<SoundType, { freq: number; duration: number; type: OscillatorType }> = {
    move: { freq: 220, duration: 0.08, type: 'sine' },
    capture: { freq: 180, duration: 0.12, type: 'triangle' },
    check: { freq: 440, duration: 0.15, type: 'square' },
    castle: { freq: 200, duration: 0.2, type: 'sine' },
    promote: { freq: 523, duration: 0.25, type: 'sine' },
    gameEnd: { freq: 330, duration: 0.4, type: 'sine' },
    blunder: { freq: 130, duration: 0.3, type: 'sawtooth' },
    brilliant: { freq: 660, duration: 0.2, type: 'sine' }
};

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

export function useChessSounds() {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [volume, setVolume] = useState(0.3);

    // Use refs to avoid closure issues in callbacks
    const soundEnabledRef = useRef(soundEnabled);
    const volumeRef = useRef(volume);

    // Keep refs in sync with state
    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        volumeRef.current = volume;
    }, [volume]);

    // Initialize audio context on first user interaction
    useEffect(() => {
        const initAudio = () => {
            getAudioContext();
            document.removeEventListener('click', initAudio);
        };
        document.addEventListener('click', initAudio);
        return () => document.removeEventListener('click', initAudio);
    }, []);

    const playSound = useCallback((type: SoundType) => {
        // Read from ref to get current value
        if (!soundEnabledRef.current) return;

        try {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const config = SOUND_FREQUENCIES[type];

            // Create oscillator
            const oscillator = ctx.createOscillator();
            oscillator.type = config.type;
            oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);

            // Frequency slide for some sounds
            if (type === 'capture') {
                oscillator.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + config.duration);
            } else if (type === 'brilliant') {
                oscillator.frequency.setValueAtTime(440, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + config.duration);
            } else if (type === 'blunder') {
                oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + config.duration);
            }

            // Create gain node for volume and envelope
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(volumeRef.current, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

            // Connect and play
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + config.duration);
        } catch (e) {
            console.warn('[Sound] Failed to play:', e);
        }
    }, []); // No dependencies - uses refs instead

    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => !prev);
    }, []);

    return {
        playSound,
        soundEnabled,
        toggleSound,
        setSoundEnabled,
        volume,
        setVolume
    };
}
