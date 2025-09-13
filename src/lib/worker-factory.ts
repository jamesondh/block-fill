import { WorkerResponse } from '@/types';

// This module creates a Web Worker from an inline string to work with Turbopack
// The worker code is defined as a string and converted to a Blob URL at runtime

const workerCode = `
// Debug: Ensure worker script starts executing
console.log('Worker: Starting script execution');

// Import types (defined inline since worker is isolated)
${getTypeDefinitions()}

// PRNG Implementation
${getPRNGImplementation()}

// Irregular Region Generation
${getIRRegionImplementation()}

// Hamiltonian Path Generation
${getHamiltonianImplementation()}

// Level Generation Functions
${getLevelGenerationImplementation()}

// Main Worker Message Handler
self.onmessage = async function(event) {
  console.log('Worker: Message received', event.data);
  const { type, params, level, paths } = event.data;

  try {
    console.log('Worker: Processing message type:', type);
    switch (type) {
      case 'generate':
        console.log('Worker: Generate case, params:', params);
        if (!params) {
          throw new Error('Missing params for generation');
        }
        
        console.log('Worker: Calling generateLevel...');
        const generatedLevel = await generateLevel(params);
        console.log('Worker: Level generated:', generatedLevel);
        self.postMessage({
          type: 'generated',
          level: generatedLevel
        });
        break;

      case 'validate':
        if (!level || !paths) {
          throw new Error('Missing level or paths for validation');
        }
        
        const usedCells = new Set();
        let isValid = true;
        
        // Convert Map to array entries for validation
        const pathEntries = Array.from(paths || []);
        for (const [_, path] of pathEntries) {
          for (const cell of path) {
            if (usedCells.has(cell)) {
              isValid = false;
              break;
            }
            if (level.open[cell] !== 1) {
              isValid = false;
              break;
            }
            usedCells.add(cell);
          }
          if (!isValid) break;
        }
        
        self.postMessage({
          type: 'validated',
          valid: isValid
        });
        break;

      case 'solve':
        if (!level) {
          throw new Error('Missing level for solving');
        }
        
        self.postMessage({
          type: 'solved',
          solution: level.solution
        });
        break;

      default:
        throw new Error('Unknown message type: ' + type);
    }
  } catch (error) {
    console.error('Worker: Error occurred:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add a test to ensure worker is alive
console.log('Worker: Script loaded and ready');
`;

function getTypeDefinitions(): string {
  return `
// Type definitions for the worker
// These are comments since workers execute pure JavaScript

// Level object structure:
// {
//   v: number,
//   mode: number,
//   w: number,
//   h: number,
//   open: Uint8Array,
//   starts: Array<{ color: number; i: number }>,
//   solution: number[],
//   metrics: {
//     size: number,
//     holeDensity: number,
//     branchingFactor: number,
//     forcedMoveRatio: number,
//     corridorsPercent: number,
//     turnRate: number
//   },
//   seed: string,
//   params: object
// }

// WorkerMessage structure:
// {
//   type: 'generate' | 'validate' | 'solve',
//   params?: { v, m, w, h, k, seed, diff, hd },
//   level?: Level,
//   paths?: Map<number, number[]>
// }

// WorkerResponse structure:
// {
//   type: 'generated' | 'validated' | 'solved' | 'error',
//   level?: Level,
//   valid?: boolean,
//   solution?: number[],
//   error?: string
// }

// IRRegion structure:
// {
//   cells: Set<string>,
//   bounds: { minX, maxX, minY, maxY }
// }

// HamiltonianPath structure:
// {
//   path: Array<[x, y]>,
//   success: boolean
// }
`;
}

function getPRNGImplementation(): string {
  return `
class PRNG {
  constructor(seed) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
    this.state = this.seed;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  random() {
    // Mulberry32 PRNG
    this.state += 0x6D2B79F5;
    let t = this.state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  randInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  choice(array) {
    return array[this.randInt(0, array.length - 1)];
  }

  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
`;
}

function getIRRegionImplementation(): string {
  return `
function generateIRRegion(width, height, prng, fillRatio = 0.7) {
  console.log('generateIRRegion: Starting with width:', width, 'height:', height, 'fillRatio:', fillRatio);
  const targetCells = Math.floor(width * height * fillRatio);
  console.log('generateIRRegion: Target cells:', targetCells);
  const cells = new Set();
  
  // Start from center
  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  cells.add(startX + ',' + startY);
  
  // Grow region using frontier expansion
  const frontier = [];
  const addToFrontier = (x, y) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const key = x + ',' + y;
      if (!cells.has(key)) {
        // Check if not already in frontier
        const exists = frontier.some(f => f[0] === x && f[1] === y);
        if (!exists) {
          frontier.push([x, y]);
        }
      }
    }
  };
  
  // Add initial neighbors
  addToFrontier(startX + 1, startY);
  addToFrontier(startX - 1, startY);
  addToFrontier(startX, startY + 1);
  addToFrontier(startX, startY - 1);
  
  // Grow until we reach target size
  while (cells.size < targetCells && frontier.length > 0) {
    // Pick random cell from frontier
    const idx = prng.randInt(0, frontier.length - 1);
    const [x, y] = frontier[idx];
    frontier.splice(idx, 1);
    
    const key = x + ',' + y;
    if (cells.has(key)) continue;
    
    // Add cell to region
    cells.add(key);
    
    // Add new neighbors to frontier
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
      addToFrontier(x + dx, y + dy);
    }
  }
  
  // Calculate bounds
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (const cell of cells) {
    const [x, y] = cell.split(',').map(Number);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  
  return {
    cells,
    bounds: { minX, maxX, minY, maxY }
  };
}

function normalizeRegion(region) {
  const normalized = new Set();
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    normalized.add((x - region.bounds.minX) + ',' + (y - region.bounds.minY));
  }
  
  return {
    cells: normalized,
    bounds: {
      minX: 0,
      maxX: region.bounds.maxX - region.bounds.minX,
      minY: 0,
      maxY: region.bounds.maxY - region.bounds.minY
    }
  };
}
`;
}

function getHamiltonianImplementation(): string {
  return `
function generateHamiltonianPath(region, prng, maxAttempts = 3) {
  console.log('generateHamiltonianPath: Starting with', region.cells.size, 'cells');
  // Try DFS-based approach
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log('generateHamiltonianPath: Attempt', attempt + 1);
    const result = dfsHamiltonianPath(region, prng);
    console.log('generateHamiltonianPath: Attempt result:', result.success);
    if (result.success) {
      return result;
    }
  }
  
  console.log('generateHamiltonianPath: All attempts failed');
  return { path: [], success: false };
}

function dfsHamiltonianPath(region, prng) {
  console.log('dfsHamiltonianPath: Starting');
  const cells = Array.from(region.cells).map(c => {
    const [x, y] = c.split(',').map(Number);
    return [x, y];
  });
  console.log('dfsHamiltonianPath: Total cells:', cells.length);
  
  if (cells.length === 0) {
    return { path: [], success: false };
  }
  
  // Shuffle starting points
  const shuffledCells = prng.shuffle([...cells]);
  const startingPoints = shuffledCells.slice(0, Math.min(5, shuffledCells.length));
  console.log('dfsHamiltonianPath: Trying', startingPoints.length, 'starting points');
  
  // Try DFS from different starting points
  for (let i = 0; i < startingPoints.length; i++) {
    const start = startingPoints[i];
    console.log('dfsHamiltonianPath: Trying start point', i + 1, 'at', start);
    
    // Reset DFS call counter for each attempt
    dfsCallCount = 0;
    
    const visited = new Set();
    const path = [];
    
    if (dfs(start, cells, visited, path, region, prng)) {
      console.log('dfsHamiltonianPath: Found path with', dfsCallCount, 'calls!');
      return { path, success: true };
    }
    console.log('dfsHamiltonianPath: Start point', i + 1, 'failed after', dfsCallCount, 'calls');
  }
  
  console.log('dfsHamiltonianPath: All starting points failed');
  return { path: [], success: false };
}

// Add a global counter to prevent infinite recursion
let dfsCallCount = 0;
const MAX_DFS_CALLS = 10000;

function dfs(current, cells, visited, path, region, prng) {
  dfsCallCount++;
  if (dfsCallCount > MAX_DFS_CALLS) {
    console.log('dfs: Max calls exceeded, aborting');
    return false;
  }
  
  const key = current[0] + ',' + current[1];
  visited.add(key);
  path.push(current);
  
  // Check if we've visited all cells
  if (path.length === cells.length) {
    return true;
  }
  
  // Get neighbors and shuffle
  const neighbors = [];
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  for (const [dx, dy] of directions) {
    const nx = current[0] + dx;
    const ny = current[1] + dy;
    const nKey = nx + ',' + ny;
    
    if (region.cells.has(nKey) && !visited.has(nKey)) {
      neighbors.push([nx, ny]);
    }
  }
  
  // Shuffle neighbors
  const shuffledNeighbors = prng.shuffle(neighbors);
  
  // Try each neighbor
  for (const neighbor of shuffledNeighbors) {
    if (dfs(neighbor, cells, visited, path, region, prng)) {
      return true;
    }
  }
  
  // Backtrack
  visited.delete(key);
  path.pop();
  return false;
}

function pathToSolution(path) {
  if (path.length === 0) return [];
  
  const solution = [];
  
  for (let i = 1; i < path.length; i++) {
    const [x1, y1] = path[i - 1];
    const [x2, y2] = path[i];
    
    // Determine direction: 0=up, 1=right, 2=down, 3=left
    if (x2 > x1) solution.push(1); // right
    else if (x2 < x1) solution.push(3); // left
    else if (y2 > y1) solution.push(2); // down
    else solution.push(0); // up
  }
  
  return solution;
}
`;
}

function getLevelGenerationImplementation(): string {
  return `
function calculateMetrics(region, path, w, h) {
  const size = region.cells.size;
  const holeDensity = 1 - (size / (w * h));
  
  // Calculate branching factor
  let totalBranches = 0;
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    let branches = 0;
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
      if (region.cells.has((x + dx) + ',' + (y + dy))) {
        branches++;
      }
    }
    totalBranches += branches;
  }
  const branchingFactor = totalBranches / size;
  
  // Calculate forced moves
  let forcedMoves = 0;
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    let validMoves = 0;
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
      if (region.cells.has((x + dx) + ',' + (y + dy))) {
        validMoves++;
      }
    }
    if (validMoves === 1) forcedMoves++;
  }
  const forcedMoveRatio = forcedMoves / size;
  
  // Calculate corridors
  let corridors = 0;
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    const hasUp = region.cells.has(x + ',' + (y - 1));
    const hasDown = region.cells.has(x + ',' + (y + 1));
    const hasLeft = region.cells.has((x - 1) + ',' + y);
    const hasRight = region.cells.has((x + 1) + ',' + y);
    
    if ((hasUp && hasDown && !hasLeft && !hasRight) || 
        (!hasUp && !hasDown && hasLeft && hasRight)) {
      corridors++;
    }
  }
  const corridorsPercent = corridors / size;
  
  // Calculate turn rate
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

async function generateLevel(params) {
  console.log('generateLevel: Starting with params:', params);
  const seed = params.seed || 'default';
  console.log('generateLevel: Creating PRNG with seed:', seed);
  const prng = new PRNG(seed);
  console.log('generateLevel: PRNG created');
  
  const w = params.w || 10;
  const h = params.h || 10;
  const holeDensity = params.hd || 0.1;
  const mode = params.m || 1;
  console.log('generateLevel: Params processed - w:', w, 'h:', h, 'hd:', holeDensity, 'mode:', mode);
  
  // For Classic mode, generate irregular region
  if (mode === 1) {
    console.log('generateLevel: Mode 1 - generating irregular region');
    // Generate irregular connected region
    const fillRatio = 1 - holeDensity;
    console.log('generateLevel: Calling generateIRRegion with fillRatio:', fillRatio);
    const region = generateIRRegion(w, h, prng, fillRatio);
    console.log('generateLevel: Region generated, cells:', region.cells.size);
    console.log('generateLevel: Normalizing region');
    const normalized = normalizeRegion(region);
    console.log('generateLevel: Region normalized');
    
    // Generate Hamiltonian path
    console.log('generateLevel: Generating Hamiltonian path');
    const hamPath = generateHamiltonianPath(normalized, prng);
    console.log('generateLevel: Hamiltonian path result:', hamPath.success, 'path length:', hamPath.path?.length);
    
    if (!hamPath.success || hamPath.path.length === 0) {
      // Fallback to simple generation
      return generateSimpleLevel(params, prng);
    }
    
    // Convert normalized path back to original coordinates
    const originalPath = hamPath.path.map(([x, y]) => 
      [x + region.bounds.minX, y + region.bounds.minY]
    );
    
    // Convert region to open cells array
    const open = new Uint8Array(w * h);
    for (const cell of region.cells) {
      const [x, y] = cell.split(',').map(Number);
      const index = y * w + x;
      open[index] = 1;
    }
    
    // Set start position (first cell in path)
    const [startX, startY] = originalPath[0];
    const startIndex = startY * w + startX;
    const starts = [{ color: 0, i: startIndex }];
    
    // Convert path to solution
    const solution = pathToSolution(originalPath);
    
    // Calculate metrics using normalized region
    const metrics = calculateMetrics(normalized, hamPath.path, w, h);
    
    return {
      v: 1,
      mode,
      w,
      h,
      open,
      starts,
      solution,
      metrics,
      seed,
      params: params
    };
  }
  
  // For other modes, use simple generation
  return generateSimpleLevel(params, prng);
}

function generateSimpleLevel(params, prng) {
  const w = params.w || 10;
  const h = params.h || 10;
  const holeDensity = params.hd || 0.1;
  const mode = params.m || 1;
  const seed = params.seed || 'default';
  
  const totalCells = w * h;
  const targetOpenCells = Math.floor(totalCells * (1 - holeDensity));
  
  const open = new Uint8Array(totalCells);
  const openIndices = [];
  
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
    Math.floor(prng.random() * 4)
  );
  
  return {
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
    params: params
  };
}
`;
}

export function createGenerationWorker(): Worker {
  // Debug: Check if worker code is properly assembled
  console.log('Creating worker, code length:', workerCode.length);
  console.log('Code includes onmessage?:', workerCode.includes('self.onmessage'));
  console.log('Code includes generateLevel?:', workerCode.includes('generateLevel'));
  
  // Create a blob from the worker code string
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  
  // Create and return the worker
  const worker = new Worker(workerUrl);
  
  // Store the URL so it can be revoked later
  (worker as Worker & { __blobUrl?: string }).__blobUrl = workerUrl;
  
  return worker;
}

export function terminateWorker(worker: Worker): void {
  // Revoke the blob URL if it exists
  const blobUrl = (worker as Worker & { __blobUrl?: string }).__blobUrl;
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }
  
  // Terminate the worker
  worker.terminate();
}

// Export the worker message handler type for use in hooks
export type WorkerMessageHandler = (event: MessageEvent<WorkerResponse>) => void;