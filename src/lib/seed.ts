import { GameParams, DifficultyTier, Mode } from '@/types';

export function generateSeed(length: number = 8): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function parseShareCode(hash: string): GameParams {
  const params: GameParams = {};
  
  if (!hash || !hash.startsWith('#')) return params;
  
  const parts = hash.slice(1).split(';');
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    
    switch (key) {
      case 'v':
        params.v = parseInt(value, 10);
        break;
      case 'm':
        params.m = parseInt(value, 10) as Mode;
        break;
      case 'w':
        params.w = parseInt(value, 10);
        break;
      case 'h':
        params.h = parseInt(value, 10);
        break;
      case 'k':
        params.k = parseInt(value, 10);
        break;
      case 'hd':
        params.hd = parseFloat(value);
        break;
      case 'diff':
        params.diff = value as DifficultyTier;
        break;
      case 'seed':
        params.seed = value;
        break;
    }
  }
  
  return params;
}

export function serializeShareCode(params: GameParams): string {
  const parts: string[] = [];
  
  if (params.v !== undefined) parts.push(`v=${params.v}`);
  if (params.m !== undefined) parts.push(`m=${params.m}`);
  if (params.w !== undefined) parts.push(`w=${params.w}`);
  if (params.h !== undefined) parts.push(`h=${params.h}`);
  if (params.k !== undefined) parts.push(`k=${params.k}`);
  if (params.hd !== undefined) parts.push(`hd=${params.hd}`);
  if (params.diff !== undefined) parts.push(`diff=${params.diff}`);
  if (params.seed !== undefined) parts.push(`seed=${params.seed}`);
  
  return '#' + parts.join(';');
}

export const DEFAULT_PARAMS: Record<DifficultyTier, Record<Mode, GameParams>> = {
  easy: {
    1: { w: 8, h: 10, hd: 0.10, k: 1 },
    2: { w: 8, h: 10, hd: 0.10, k: 3 },
    3: { w: 6, h: 6, hd: 0, k: 4 }
  },
  medium: {
    1: { w: 10, h: 12, hd: 0.15, k: 1 },
    2: { w: 10, h: 12, hd: 0.15, k: 4 },
    3: { w: 7, h: 7, hd: 0, k: 5 }
  },
  hard: {
    1: { w: 12, h: 14, hd: 0.18, k: 1 },
    2: { w: 12, h: 14, hd: 0.18, k: 6 },
    3: { w: 8, h: 8, hd: 0, k: 7 }
  }
};

export function getDefaultParams(mode: Mode = 1, difficulty: DifficultyTier = 'medium'): GameParams {
  return {
    v: 1,
    m: mode,
    diff: difficulty,
    seed: generateSeed(),
    ...DEFAULT_PARAMS[difficulty][mode]
  };
}