import { Level, GameState } from '@/types';

const STORAGE_KEY = 'blockfill_gamestate';
const STORAGE_VERSION = 1;

export interface StoredGameState {
  version: number;
  level: Level | null;
  playerPaths: [number, number[]][];
  currentColor: number;
  timestamp: number;
}

export function saveGameState(state: Partial<GameState>): void {
  try {
    if (!state.level) return;
    
    const storedState: StoredGameState = {
      version: STORAGE_VERSION,
      level: state.level,
      playerPaths: Array.from(state.playerPaths || new Map()),
      currentColor: state.currentColor || 0,
      timestamp: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadGameState(): Partial<GameState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed: StoredGameState = JSON.parse(stored);
    
    // Check version compatibility
    if (parsed.version !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Convert arrays back to proper types
    if (parsed.level) {
      parsed.level.open = new Uint8Array(Object.values(parsed.level.open));
    }
    
    return {
      level: parsed.level,
      playerPaths: new Map(parsed.playerPaths),
      currentColor: parsed.currentColor
    };
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}

export function hasStoredGame(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}