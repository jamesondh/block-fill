export type Mode = 1 | 2 | 3;

export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface DifficultyMetrics {
  size: number;
  holeDensity: number;
  branchingFactor: number;
  forcedMoveRatio: number;
  corridorsPercent: number;
  turnRate: number;
  intertwineIndex?: number;
}

export interface Level {
  v: 1;
  mode: Mode;
  w: number;
  h: number;
  open: Uint8Array;
  starts: { color: number; i: number }[];
  pairs?: { color: number; a: number; b: number }[];
  solution: number[];
  metrics: DifficultyMetrics;
  seed: string;
  params: Record<string, number | string>;
}

export interface GameParams {
  v?: number;
  m?: Mode;
  w?: number;
  h?: number;
  k?: number;
  hd?: number;
  diff?: DifficultyTier;
  seed?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Cell {
  index: number;
  x: number;
  y: number;
  color?: number;
  isStart?: boolean;
  isEnd?: boolean;
  isBlocked?: boolean;
}

export interface GameState {
  level: Level | null;
  playerPaths: Map<number, number[]>;
  currentColor: number;
  isDragging: boolean;
  dragPath: number[];
  history: GameState[];
  historyIndex: number;
}

export interface WorkerMessage {
  type: 'generate' | 'validate' | 'solve';
  params?: GameParams;
  level?: Level;
  paths?: Map<number, number[]>;
}

export interface WorkerResponse {
  type: 'generated' | 'validated' | 'solved' | 'error';
  level?: Level;
  valid?: boolean;
  solution?: number[];
  error?: string;
}