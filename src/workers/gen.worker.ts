import { WorkerMessage, WorkerResponse, Level } from '@/types';
import { PRNG } from '@/lib/prng';

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, params, level, paths } = event.data;

  try {
    switch (type) {
      case 'generate':
        if (!params) {
          throw new Error('Missing params for generation');
        }
        
        const generatedLevel = await generateLevel(params);
        const response: WorkerResponse = {
          type: 'generated',
          level: generatedLevel
        };
        self.postMessage(response);
        break;

      case 'validate':
        if (!level || !paths) {
          throw new Error('Missing level or paths for validation');
        }
        
        const isValid = validatePaths(level, paths);
        const validResponse: WorkerResponse = {
          type: 'validated',
          valid: isValid
        };
        self.postMessage(validResponse);
        break;

      case 'solve':
        if (!level) {
          throw new Error('Missing level for solving');
        }
        
        const solution = solveLevel(level);
        const solveResponse: WorkerResponse = {
          type: 'solved',
          solution
        };
        self.postMessage(solveResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const errorResponse: WorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(errorResponse);
  }
};

async function generateLevel(params: NonNullable<WorkerMessage['params']>): Promise<Level> {
  const seed = params.seed || 'default';
  const prng = new PRNG(seed);
  
  const w = params.w || 10;
  const h = params.h || 10;
  const holeDensity = params.hd || 0.1;
  const mode = params.m || 1;
  
  const totalCells = w * h;
  const targetOpenCells = Math.floor(totalCells * (1 - holeDensity));
  
  const open = new Uint8Array(totalCells);
  const openIndices: number[] = [];
  
  for (let i = 0; i < totalCells; i++) {
    openIndices.push(i);
  }
  
  const shuffled = prng.shuffle(openIndices);
  for (let i = 0; i < targetOpenCells; i++) {
    open[shuffled[i]] = 1;
  }
  
  const startIndex = shuffled[0];
  const starts = [{ color: 0, i: startIndex }];
  
  const solution = shuffled.slice(0, targetOpenCells);
  
  const level: Level = {
    v: 1,
    mode,
    w,
    h,
    open,
    starts,
    solution,
    metrics: {
      size: targetOpenCells,
      holeDensity,
      branchingFactor: 2,
      forcedMoveRatio: 0.3,
      corridorsPercent: 0.2,
      turnRate: 0.4
    },
    seed,
    params: params as Record<string, number | string>
  };
  
  return level;
}

function validatePaths(level: Level, paths: Map<number, number[]>): boolean {
  const usedCells = new Set<number>();
  
  for (const [, path] of paths) {
    for (const cell of path) {
      if (usedCells.has(cell)) return false;
      if (level.open[cell] !== 1) return false;
      usedCells.add(cell);
    }
  }
  
  return true;
}

function solveLevel(level: Level): number[] {
  return level.solution;
}