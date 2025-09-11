import { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PaintModel } from '@/lib/paint';

export function useValidator() {
  const { level, playerPaths } = useGameStore();
  const [isValid, setIsValid] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [coverage, setCoverage] = useState(0);

  const paintModel = useMemo(() => {
    return level ? new PaintModel(level) : null;
  }, [level]);

  useEffect(() => {
    if (!paintModel || !level) {
      setIsValid(false);
      setIsComplete(false);
      setHasWon(false);
      setCoverage(0);
      return;
    }

    const hasOverlap = paintModel.checkOverlap(playerPaths);
    const fullCoverage = paintModel.checkCoverage(playerPaths);
    const win = paintModel.checkWin(playerPaths, level.mode);
    
    let validPaths = true;
    for (const [, path] of playerPaths) {
      if (!paintModel.validatePath(path)) {
        validPaths = false;
        break;
      }
    }

    const coveredCells = new Set<number>();
    for (const [, path] of playerPaths) {
      for (const cell of path) {
        coveredCells.add(cell);
      }
    }
    
    const totalOpenCells = Array.from({ length: level.w * level.h })
      .filter((_, i) => level.open[i] === 1).length;
    
    const coveragePercent = totalOpenCells > 0 
      ? (coveredCells.size / totalOpenCells) * 100 
      : 0;

    setIsValid(validPaths && !hasOverlap);
    setIsComplete(fullCoverage);
    setHasWon(win);
    setCoverage(Math.round(coveragePercent));
  }, [paintModel, level, playerPaths]);

  return {
    isValid,
    isComplete,
    hasWon,
    coverage,
    checkPath: (path: number[]) => paintModel?.validatePath(path) ?? false,
    checkWin: () => paintModel && level ? paintModel.checkWin(playerPaths, level.mode) : false
  };
}