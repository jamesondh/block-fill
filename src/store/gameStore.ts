import { create } from 'zustand';
import { Level, GameParams, DifficultyTier } from '@/types';
import { saveGameState, loadGameState, clearGameState } from '@/lib/storage';
import { areNeighbors, interpolatePath } from '@/lib/pathUtils';

interface HistoryEntry {
  playerPaths: Map<number, number[]>;
  timestamp: number;
}

interface GameStore {
  level: Level | null;
  playerPaths: Map<number, number[]>;
  currentColor: number;
  isDragging: boolean;
  dragPath: number[];
  history: HistoryEntry[];
  historyIndex: number;
  params: GameParams;
  isGenerating: boolean;
  error: string | null;
  
  setLevel: (level: Level) => void;
  setPlayerPaths: (paths: Map<number, number[]>) => void;
  setCurrentColor: (color: number) => void;
  startDrag: (cellIndex: number) => void;
  updateDrag: (cellIndex: number) => void;
  endDrag: () => void;
  clearPath: (color: number) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  reset: () => void;
  setParams: (params: Partial<GameParams>) => void;
  setIsGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  clearStorage: () => void;
}

const MAX_HISTORY_SIZE = 50;

export const useGameStore = create<GameStore>((set, get) => ({
  level: null,
  playerPaths: new Map(),
  currentColor: 0,
  isDragging: false,
  dragPath: [],
  history: [],
  historyIndex: -1,
  params: {
    v: 1,
    m: 1,
    diff: 'medium' as DifficultyTier,
    seed: '',
  },
  isGenerating: false,
  error: null,
  
  setLevel: (level) => {
    set({ 
      level, 
      playerPaths: new Map(),
      history: [],
      historyIndex: -1,
      error: null 
    });
    saveGameState({ level, playerPaths: new Map(), currentColor: 0 });
  },
  
  setPlayerPaths: (paths) => {
    set({ playerPaths: paths });
    const { level, currentColor } = get();
    saveGameState({ level, playerPaths: paths, currentColor });
  },
  
  setCurrentColor: (color) => set({ currentColor: color }),
  
  startDrag: (cellIndex) => {
    const { level, currentColor, saveToHistory } = get();
    if (!level) return;
    
    saveToHistory();
    set({ 
      isDragging: true, 
      dragPath: [cellIndex],
      playerPaths: new Map(get().playerPaths).set(currentColor, [cellIndex])
    });
  },
  
  updateDrag: (cellIndex) => {
    const { isDragging, dragPath, currentColor, playerPaths, level } = get();
    if (!isDragging || !level) return;
    
    const lastCell = dragPath[dragPath.length - 1];
    if (lastCell === cellIndex) return;
    
    // Check if the cell is open/valid
    if (level.open[cellIndex] !== 1) return;
    
    // Handle backtracking - if the cell is already in the path
    if (dragPath.includes(cellIndex)) {
      const index = dragPath.indexOf(cellIndex);
      const newPath = dragPath.slice(0, index + 1);
      set({ 
        dragPath: newPath,
        playerPaths: new Map(playerPaths).set(currentColor, newPath)
      });
      return;
    }
    
    // Check if cells are neighbors (4-directional)
    if (areNeighbors(lastCell, cellIndex, level.w)) {
      // Direct neighbor - just add it
      const newPath = [...dragPath, cellIndex];
      set({ 
        dragPath: newPath,
        playerPaths: new Map(playerPaths).set(currentColor, newPath)
      });
    } else {
      // Not a direct neighbor - interpolate the path
      const interpolated = interpolatePath(
        lastCell,
        cellIndex,
        level.w,
        level.h,
        level.open,
        dragPath
      );
      
      if (interpolated && interpolated.length > 0) {
        // Successfully found a path - add all intermediate cells
        const newPath = [...dragPath, ...interpolated];
        set({ 
          dragPath: newPath,
          playerPaths: new Map(playerPaths).set(currentColor, newPath)
        });
      }
      // If no valid path found, ignore the input
    }
  },
  
  endDrag: () => set({ isDragging: false, dragPath: [] }),
  
  clearPath: (color) => {
    const { playerPaths, saveToHistory } = get();
    saveToHistory();
    const newPaths = new Map(playerPaths);
    newPaths.delete(color);
    set({ playerPaths: newPaths });
  },
  
  saveToHistory: () => {
    const { playerPaths, history, historyIndex } = get();
    const newEntry: HistoryEntry = {
      playerPaths: new Map(playerPaths),
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }
    
    set({ 
      history: newHistory, 
      historyIndex: newHistory.length - 1 
    });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      set({ 
        playerPaths: new Map(prevEntry.playerPaths),
        historyIndex: historyIndex - 1
      });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1];
      set({ 
        playerPaths: new Map(nextEntry.playerPaths),
        historyIndex: historyIndex + 1
      });
    }
  },
  
  reset: () => set({ 
    playerPaths: new Map(),
    currentColor: 0,
    isDragging: false,
    dragPath: [],
    history: [],
    historyIndex: -1,
    error: null
  }),
  
  setParams: (params) => set((state) => ({ 
    params: { ...state.params, ...params } 
  })),
  
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  
  setError: (error) => set({ error }),
  
  loadFromStorage: () => {
    const stored = loadGameState();
    if (stored) {
      set({
        level: stored.level || null,
        playerPaths: stored.playerPaths || new Map(),
        currentColor: stored.currentColor || 0,
        history: [],
        historyIndex: -1
      });
    }
  },
  
  saveToStorage: () => {
    const { level, playerPaths, currentColor } = get();
    saveGameState({ level, playerPaths, currentColor });
  },
  
  clearStorage: () => {
    clearGameState();
    set({ 
      playerPaths: new Map(),
      currentColor: 0,
      history: [],
      historyIndex: -1
    });
  }
}));