export function areNeighbors(index1: number, index2: number, width: number): boolean {
  const x1 = index1 % width;
  const y1 = Math.floor(index1 / width);
  const x2 = index2 % width;
  const y2 = Math.floor(index2 / width);

  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);

  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

export function getNeighbors(index: number, width: number, height: number, openCells: Uint8Array): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors: number[] = [];

  if (x > 0) {
    const left = index - 1;
    if (openCells[left] === 1) neighbors.push(left);
  }
  if (x < width - 1) {
    const right = index + 1;
    if (openCells[right] === 1) neighbors.push(right);
  }
  if (y > 0) {
    const up = index - width;
    if (openCells[up] === 1) neighbors.push(up);
  }
  if (y < height - 1) {
    const down = index + width;
    if (openCells[down] === 1) neighbors.push(down);
  }

  return neighbors;
}

export function findPathBetween(
  start: number, 
  end: number, 
  width: number, 
  height: number, 
  openCells: Uint8Array,
  blockedCells: Set<number> = new Set()
): number[] | null {
  if (start === end) return [];
  
  const queue: Array<{ cell: number; path: number[] }> = [{ cell: start, path: [] }];
  const visited = new Set<number>([start]);
  visited.add(start);
  
  // Add all blocked cells to visited to avoid them
  for (const cell of blockedCells) {
    visited.add(cell);
  }
  
  while (queue.length > 0) {
    const { cell, path } = queue.shift()!;
    
    const neighbors = getNeighbors(cell, width, height, openCells);
    
    for (const neighbor of neighbors) {
      if (neighbor === end) {
        return [...path, neighbor];
      }
      
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ cell: neighbor, path: [...path, neighbor] });
      }
    }
  }
  
  return null;
}

export function interpolatePath(
  fromCell: number,
  toCell: number,
  width: number,
  height: number,
  openCells: Uint8Array,
  existingPath: number[]
): number[] | null {
  // If cells are neighbors, no interpolation needed
  if (areNeighbors(fromCell, toCell, width)) {
    return [toCell];
  }
  
  // Create a set of cells already in the path (except the ones we might backtrack through)
  const toIndex = existingPath.indexOf(toCell);
  let blockedCells = new Set<number>();
  
  if (toIndex === -1) {
    // Moving to a new cell - block all existing path cells except the start
    blockedCells = new Set(existingPath.slice(0, -1));
  } else {
    // Backtracking - block cells before the backtrack point
    blockedCells = new Set(existingPath.slice(0, toIndex));
  }
  
  // Find shortest path between the cells
  const path = findPathBetween(fromCell, toCell, width, height, openCells, blockedCells);
  
  return path;
}