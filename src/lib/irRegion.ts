import { PRNG } from './prng';

export interface IRRegion {
  cells: Set<string>; // Set of "x,y" strings for cells in region
  width: number;
  height: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Generates an irregular connected region within the given bounds
 * @param width Target width
 * @param height Target height
 * @param prng Random number generator
 * @param fillRatio Target fill ratio (0.5-0.9 recommended)
 * @returns IRRegion with connected cells
 */
export function generateIRRegion(
  width: number,
  height: number,
  prng: PRNG,
  fillRatio: number = 0.7
): IRRegion {
  const targetCells = Math.floor(width * height * fillRatio);
  const cells = new Set<string>();
  
  // Start from center
  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  cells.add(`${startX},${startY}`);
  
  // Frontier-based growth
  const frontier = new Set<string>();
  addNeighborsToFrontier(startX, startY, width, height, cells, frontier);
  
  // Grow region until target size reached
  while (cells.size < targetCells && frontier.size > 0) {
    // Convert frontier to array for random selection
    const frontierArray = Array.from(frontier);
    const idx = Math.floor(prng.random() * frontierArray.length);
    const cell = frontierArray[idx];
    
    frontier.delete(cell);
    cells.add(cell);
    
    const [x, y] = cell.split(',').map(Number);
    addNeighborsToFrontier(x, y, width, height, cells, frontier);
  }
  
  // Calculate actual bounds
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
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    bounds: { minX, maxX, minY, maxY }
  };
}

function addNeighborsToFrontier(
  x: number,
  y: number,
  width: number,
  height: number,
  cells: Set<string>,
  frontier: Set<string>
): void {
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1]
  ];
  
  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const key = `${nx},${ny}`;
      if (!cells.has(key) && !frontier.has(key)) {
        frontier.add(key);
      }
    }
  }
}

/**
 * Normalizes an IR region to start at (0,0)
 */
export function normalizeRegion(region: IRRegion): IRRegion {
  const normalized = new Set<string>();
  const { minX, minY } = region.bounds;
  
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    normalized.add(`${x - minX},${y - minY}`);
  }
  
  return {
    cells: normalized,
    width: region.width,
    height: region.height,
    bounds: {
      minX: 0,
      maxX: region.width - 1,
      minY: 0,
      maxY: region.height - 1
    }
  };
}

/**
 * Converts IR region to 2D boolean grid
 */
export function regionToGrid(region: IRRegion): boolean[][] {
  const grid: boolean[][] = Array(region.height)
    .fill(null)
    .map(() => Array(region.width).fill(false));
  
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    const nx = x - region.bounds.minX;
    const ny = y - region.bounds.minY;
    if (ny >= 0 && ny < region.height && nx >= 0 && nx < region.width) {
      grid[ny][nx] = true;
    }
  }
  
  return grid;
}

/**
 * Gets list of cells as coordinate pairs
 */
export function getCellList(region: IRRegion): [number, number][] {
  const cells: [number, number][] = [];
  for (const cell of region.cells) {
    const [x, y] = cell.split(',').map(Number);
    cells.push([x - region.bounds.minX, y - region.bounds.minY]);
  }
  return cells;
}