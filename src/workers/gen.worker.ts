import { WorkerMessage, WorkerResponse, Level } from '@/types';
import { PRNG } from '@/lib/prng';
import { generateIRRegion, normalizeRegion, getCellList } from '@/lib/irRegion';
import { generateHamiltonianPath, pathToSolution } from '@/lib/hamiltonian';

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
  
  // For Classic mode, generate irregular region
  if (mode === 1) {
    // Generate irregular connected region
    const fillRatio = 1 - holeDensity;
    const region = generateIRRegion(w, h, prng, fillRatio);
    const normalized = normalizeRegion(region);
    
    // Generate Hamiltonian path through the region
    const hamPath = generateHamiltonianPath(normalized, prng);
    
    if (!hamPath.success || hamPath.path.length === 0) {
      // Fallback to simple generation if Hamiltonian path fails
      return generateSimpleLevel(params, prng);
    }
    
    // Convert region to open cells array
    const open = new Uint8Array(w * h);
    for (const cell of normalized.cells) {
      const [x, y] = cell.split(',').map(Number);
      const index = y * w + x;
      open[index] = 1;
    }
    
    // Set start position (first cell in Hamiltonian path)
    const [startX, startY] = hamPath.path[0];
    const startIndex = startY * w + startX;
    const starts = [{ color: 0, i: startIndex }];
    
    // Convert Hamiltonian path to solution (direction sequence)
    const solution = pathToSolution(hamPath.path);
    
    // Calculate metrics
    const metrics = calculateMetrics(normalized, hamPath.path, w, h);
    
    const level: Level = {
      v: 1,
      mode,
      w,
      h,
      open,
      starts,
      solution,
      metrics,
      seed,
      params: params as Record<string, number | string>
    };
    
    return level;
  }
  
  // For other modes, use simple generation for now
  return generateSimpleLevel(params, prng);
}

function generateSimpleLevel(params: NonNullable<WorkerMessage['params']>, prng: PRNG): Level {
  const w = params.w || 10;
  const h = params.h || 10;
  const holeDensity = params.hd || 0.1;
  const mode = params.m || 1;
  const seed = params.seed || 'default';
  
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
  
  const solution = shuffled.slice(0, targetOpenCells).map(() => 
    Math.floor(prng.random() * 4) // Random directions
  );
  
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

function calculateMetrics(
  region: { cells: Set<string> },
  path: [number, number][],
  w: number,
  h: number
): Level['metrics'] {
  const size = region.cells.size;
  const holeDensity = 1 - (size / (w * h));
  
  // Calculate branching factor (average number of valid moves per cell)
  let totalBranches = 0;
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    let branches = 0;
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      if (region.cells.has(`${x + dx},${y + dy}`)) {
        branches++;
      }
    }
    totalBranches += branches;
  }
  const branchingFactor = totalBranches / size;
  
  // Calculate forced move ratio (cells with only one valid move)
  let forcedMoves = 0;
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    let validMoves = 0;
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      if (region.cells.has(`${x + dx},${y + dy}`)) {
        validMoves++;
      }
    }
    if (validMoves === 1) forcedMoves++;
  }
  const forcedMoveRatio = forcedMoves / size;
  
  // Calculate corridors (cells with exactly 2 neighbors in opposite directions)
  let corridors = 0;
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    const hasUp = region.cells.has(`${x},${y - 1}`);
    const hasDown = region.cells.has(`${x},${y + 1}`);
    const hasLeft = region.cells.has(`${x - 1},${y}`);
    const hasRight = region.cells.has(`${x + 1},${y}`);
    
    if ((hasUp && hasDown && !hasLeft && !hasRight) || 
        (!hasUp && !hasDown && hasLeft && hasRight)) {
      corridors++;
    }
  }
  const corridorsPercent = corridors / size;
  
  // Calculate turn rate from the path
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const [x1, y1] = path[i - 2];
    const [x2, y2] = path[i - 1];
    const [x3, y3] = path[i];
    
    const dir1 = [x2 - x1, y2 - y1];
    const dir2 = [x3 - x2, y3 - y2];
    
    if (dir1[0] !== dir2[0] || dir1[1] !== dir2[1]) {
      turns++;
    }
  }
  const turnRate = path.length > 2 ? turns / (path.length - 2) : 0;
  
  return {
    size,
    holeDensity,
    branchingFactor,
    forcedMoveRatio,
    corridorsPercent,
    turnRate
  };
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