import { useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

export function useInput() {
  const isDraggingRef = useRef(false);
  const {
    startDrag,
    updateDrag,
    endDrag,
    currentColor
  } = useGameStore();

  const handleCellMouseDown = useCallback((cellIndex: number) => {
    isDraggingRef.current = true;
    startDrag(cellIndex);
  }, [startDrag]);

  const handleCellMouseEnter = useCallback((cellIndex: number) => {
    if (isDraggingRef.current) {
      updateDrag(cellIndex);
    }
  }, [updateDrag]);

  const handleCellMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      endDrag();
    }
  }, [endDrag]);

  const handleTouchStart = useCallback((cellIndex: number) => {
    isDraggingRef.current = true;
    startDrag(cellIndex);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: TouchEvent, getCellFromPoint: (x: number, y: number) => number | null) => {
    if (!isDraggingRef.current) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const cellIndex = getCellFromPoint(touch.clientX, touch.clientY);
    
    if (cellIndex !== null) {
      updateDrag(cellIndex);
    }
  }, [updateDrag]);

  const handleTouchEnd = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      endDrag();
    }
  }, [endDrag]);

  return {
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging: isDraggingRef.current,
    currentColor
  };
}