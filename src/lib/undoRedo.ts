export class UndoRedoStack<T> {
  private stack: T[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  push(state: T): void {
    this.stack = this.stack.slice(0, this.currentIndex + 1);
    this.stack.push(state);
    
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo(): T | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.stack[this.currentIndex];
    }
    return null;
  }

  redo(): T | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.stack[this.currentIndex];
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.currentIndex = -1;
  }

  getCurrent(): T | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.stack.length) {
      return this.stack[this.currentIndex];
    }
    return null;
  }

  getSize(): number {
    return this.stack.length;
  }
}