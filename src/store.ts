import { writable } from 'svelte/store';

export type GameState = 'lobby' | 'settingWord' | 'playing' | 'gameOver';

export const gameState = writable<GameState>('lobby');
export const roomId = writable<string | null>(null);
export const wordToGuess = writable<string>('');
export const opponentGuesses = writable<any[]>([]); // Array of guess arrays
export const winnerId = writable<string | null>(null);
export const errorMessage = writable<string | null>(null);

// Add this new store
export const activePlayerId = writable<string | null>(null);
export const gameOverDetails = writable<any>(null);
