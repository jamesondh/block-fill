import { Level } from '@/types';

export class PaintModel {
  private width: number;
  private height: number;
  private openCells: Set<number>;
  private startCells: Map<number, number>;
  private endCells: Map<number, number>;

  constructor(level: Level) {
    this.width = level.w;
    this.height = level.h;
    this.openCells = new Set();
    this.startCells = new Map();
    this.endCells = new Map();

    for (let i = 0; i < level.open.length; i++) {
      if (level.open[i] === 1) {
        this.openCells.add(i);
      }
    }

    for (const start of level.starts) {
      this.startCells.set(start.i, start.color);
    }

    if (level.pairs) {
      for (const pair of level.pairs) {
        this.endCells.set(pair.a, pair.color);
        this.endCells.set(pair.b, pair.color);
      }
    }
  }

  isValidCell(index: number): boolean {
    return this.openCells.has(index);
  }

  isStartCell(index: number): boolean {
    return this.startCells.has(index);
  }

  isEndCell(index: number): boolean {
    return this.endCells.has(index);
  }

  getStartColor(index: number): number | undefined {
    return this.startCells.get(index);
  }

  getEndColor(index: number): number | undefined {
    return this.endCells.get(index);
  }

  areNeighbors(index1: number, index2: number): boolean {
    const x1 = index1 % this.width;
    const y1 = Math.floor(index1 / this.width);
    const x2 = index2 % this.width;
    const y2 = Math.floor(index2 / this.width);

    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);

    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  getNeighbors(index: number): number[] {
    const x = index % this.width;
    const y = Math.floor(index / this.width);
    const neighbors: number[] = [];

    if (x > 0) neighbors.push(index - 1);
    if (x < this.width - 1) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - this.width);
    if (y < this.height - 1) neighbors.push(index + this.width);

    return neighbors.filter(n => this.isValidCell(n));
  }

  validatePath(path: number[]): boolean {
    if (path.length === 0) return true;

    for (let i = 0; i < path.length; i++) {
      if (!this.isValidCell(path[i])) return false;
      
      if (i > 0 && !this.areNeighbors(path[i - 1], path[i])) {
        return false;
      }
    }

    return true;
  }

  checkOverlap(paths: Map<number, number[]>): boolean {
    const usedCells = new Set<number>();
    
    for (const [, path] of paths) {
      for (const cell of path) {
        if (usedCells.has(cell)) return true;
        usedCells.add(cell);
      }
    }
    
    return false;
  }

  checkCoverage(paths: Map<number, number[]>): boolean {
    const coveredCells = new Set<number>();
    
    for (const [, path] of paths) {
      for (const cell of path) {
        coveredCells.add(cell);
      }
    }
    
    return coveredCells.size === this.openCells.size;
  }

  checkWin(paths: Map<number, number[]>, mode: number): boolean {
    if (this.checkOverlap(paths)) return false;
    
    if (!this.checkCoverage(paths)) return false;
    
    if (mode === 1) {
      return paths.size === 1 && this.checkCoverage(paths);
    } else if (mode === 2) {
      for (const [color, path] of paths) {
        const startIndex = Array.from(this.startCells.entries())
          .find(([, c]) => c === color)?.[0];
        if (startIndex !== undefined && !path.includes(startIndex)) {
          return false;
        }
      }
      return true;
    } else if (mode === 3) {
      for (const [color, path] of paths) {
        const endpoints = Array.from(this.endCells.entries())
          .filter(([, c]) => c === color)
          .map(([i]) => i);
        
        if (endpoints.length !== 2) continue;
        
        const hasFirstEnd = path[0] === endpoints[0] || path[0] === endpoints[1];
        const hasLastEnd = path[path.length - 1] === endpoints[0] || 
                           path[path.length - 1] === endpoints[1];
        
        if (!hasFirstEnd || !hasLastEnd) return false;
      }
      return true;
    }
    
    return false;
  }
}