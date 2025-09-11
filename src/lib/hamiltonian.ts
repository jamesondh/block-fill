import { PRNG } from './prng';
import { IRRegion } from './irRegion';

export interface HamiltonianPath {
  path: [number, number][];
  success: boolean;
}

/**
 * Generates a Hamiltonian path through the given region using strip-and-stitch algorithm
 * Falls back to DFS if strip-and-stitch fails
 */
export function generateHamiltonianPath(
  region: IRRegion,
  prng: PRNG,
  maxAttempts: number = 3
): HamiltonianPath {
  // Try strip-and-stitch first
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = stripAndStitch(region, prng);
    if (result.success) {
      return result;
    }
  }
  
  // Fall back to DFS
  return dfsHamiltonianPath(region, prng);
}

/**
 * Strip-and-stitch algorithm for Hamiltonian path generation
 */
function stripAndStitch(region: IRRegion, prng: PRNG): HamiltonianPath {
  const cells = Array.from(region.cells).map(c => {
    const [x, y] = c.split(',').map(Number);
    return [x - region.bounds.minX, y - region.bounds.minY] as [number, number];
  });
  
  if (cells.length === 0) {
    return { path: [], success: false };
  }
  
  // Create adjacency map
  const adjacency = new Map<string, [number, number][]>();
  for (const [x, y] of cells) {
    const key = `${x},${y}`;
    const neighbors: [number, number][] = [];
    
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (region.cells.has(`${nx + region.bounds.minX},${ny + region.bounds.minY}`)) {
        neighbors.push([nx, ny]);
      }
    }
    
    adjacency.set(key, neighbors);
  }
  
  // Create horizontal strips
  const strips = new Map<number, [number, number][]>();
  for (const [x, y] of cells) {
    if (!strips.has(y)) {
      strips.set(y, []);
    }
    strips.get(y)!.push([x, y]);
  }
  
  // Sort strips by y-coordinate
  const sortedStrips = Array.from(strips.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([_, strip]) => {
      // Sort cells in each strip by x-coordinate
      return strip.sort((a, b) => a[0] - b[0]);
    });
  
  // Stitch strips together
  const path: [number, number][] = [];
  let reverseNext = false;
  
  for (let i = 0; i < sortedStrips.length; i++) {
    const strip = sortedStrips[i];
    
    if (reverseNext) {
      // Add strip in reverse order
      for (let j = strip.length - 1; j >= 0; j--) {
        path.push(strip[j]);
      }
    } else {
      // Add strip in normal order
      for (const cell of strip) {
        path.push(cell);
      }
    }
    
    // Check if we can connect to next strip
    if (i < sortedStrips.length - 1) {
      const lastCell = path[path.length - 1];
      const nextStrip = sortedStrips[i + 1];
      
      // Find best connection point in next strip
      let canConnect = false;
      for (const nextCell of nextStrip) {
        const key = `${lastCell[0]},${lastCell[1]}`;
        const neighbors = adjacency.get(key) || [];
        if (neighbors.some(n => n[0] === nextCell[0] && n[1] === nextCell[1])) {
          canConnect = true;
          break;
        }
      }
      
      if (!canConnect) {
        // Try to find a bridge through intermediate cells
        // This is simplified - a full implementation would be more sophisticated
        reverseNext = !reverseNext;
      } else {
        reverseNext = !reverseNext;
      }
    }
  }
  
  // Verify path visits all cells exactly once
  if (path.length !== cells.length) {
    return { path: [], success: false };
  }
  
  // Verify path is connected
  for (let i = 1; i < path.length; i++) {
    const [x1, y1] = path[i - 1];
    const [x2, y2] = path[i];
    const dist = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (dist !== 1) {
      return { path: [], success: false };
    }
  }
  
  return { path, success: true };
}

/**
 * DFS-based Hamiltonian path generation (fallback)
 */
function dfsHamiltonianPath(region: IRRegion, prng: PRNG): HamiltonianPath {
  const cells = Array.from(region.cells).map(c => {
    const [x, y] = c.split(',').map(Number);
    return [x - region.bounds.minX, y - region.bounds.minY] as [number, number];
  });
  
  if (cells.length === 0) {
    return { path: [], success: false };
  }
  
  // Shuffle starting points for randomization
  const shuffledCells = [...cells];
  for (let i = shuffledCells.length - 1; i > 0; i--) {
    const j = Math.floor(prng.random() * (i + 1));
    [shuffledCells[i], shuffledCells[j]] = [shuffledCells[j], shuffledCells[i]];
  }
  
  // Try DFS from different starting points
  for (const start of shuffledCells.slice(0, Math.min(5, shuffledCells.length))) {
    const visited = new Set<string>();
    const path: [number, number][] = [];
    
    if (dfs(start, cells, visited, path, region, prng)) {
      return { path, success: true };
    }
  }
  
  return { path: [], success: false };
}

function dfs(
  current: [number, number],
  cells: [number, number][],
  visited: Set<string>,
  path: [number, number][],
  region: IRRegion,
  prng: PRNG
): boolean {
  const key = `${current[0]},${current[1]}`;
  visited.add(key);
  path.push(current);
  
  // Check if we've visited all cells
  if (path.length === cells.length) {
    return true;
  }
  
  // Get neighbors and shuffle for randomization
  const neighbors: [number, number][] = [];
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const nx = current[0] + dx;
    const ny = current[1] + dy;
    const nKey = `${nx},${ny}`;
    
    if (region.cells.has(`${nx + region.bounds.minX},${ny + region.bounds.minY}`) && !visited.has(nKey)) {
      neighbors.push([nx, ny]);
    }
  }
  
  // Shuffle neighbors
  for (let i = neighbors.length - 1; i > 0; i--) {
    const j = Math.floor(prng.random() * (i + 1));
    [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
  }
  
  // Try each neighbor
  for (const neighbor of neighbors) {
    if (dfs(neighbor, cells, visited, path, region, prng)) {
      return true;
    }
  }
  
  // Backtrack
  visited.delete(key);
  path.pop();
  return false;
}

/**
 * Converts a Hamiltonian path to a solution sequence
 */
export function pathToSolution(path: [number, number][]): number[] {
  if (path.length === 0) return [];
  
  const solution: number[] = [];
  
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