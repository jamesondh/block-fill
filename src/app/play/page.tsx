'use client';

import React, { useEffect } from 'react';
import { BoardSVG } from '@/components/BoardSVG';
import { useGameStore } from '@/store/gameStore';
import { useHashRouter } from '@/hooks/useHashRouter';
import { useInput } from '@/hooks/useInput';
import { useValidator } from '@/hooks/useValidator';
import { useWorker } from '@/hooks/useWorker';
import { getDefaultParams, generateSeed } from '@/lib/seed';

export default function PlayPage() {
  const { 
    level, 
    playerPaths, 
    currentColor, 
    isGenerating, 
    error,
    undo,
    redo,
    reset,
    setParams,
    params,
    loadFromStorage
  } = useGameStore();
  
  const { loadFromHash } = useHashRouter();
  const { handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp } = useInput();
  const { isValid, hasWon, coverage } = useValidator();
  const { generateLevel } = useWorker();

  useEffect(() => {
    const hashParams = loadFromHash();
    
    if (!hashParams || !hashParams.seed) {
      // Try to load from storage first
      loadFromStorage();
      
      // If no stored game, generate new one
      if (!level) {
        const defaultParams = getDefaultParams(1, 'medium');
        defaultParams.seed = generateSeed();
        setParams(defaultParams);
        generateLevel(defaultParams);
      }
    } else {
      generateLevel(hashParams);
    }
  }, []);

  const handleNewGame = () => {
    const newParams = getDefaultParams(params.m || 1, params.diff || 'medium');
    newParams.seed = generateSeed();
    setParams(newParams);
    generateLevel(newParams);
  };

  const handleReset = () => {
    reset();
  };

  const canUndo = playerPaths.size > 0;
  const canRedo = false;

  return (
    <div className="container">
      <div className="flex flex-col items-center justify-center min-h-screen py-8">
        <h1 className="text-3xl font-bold mb-6">Block Fill</h1>
        
        <div className="mb-4 flex gap-2">
          <button onClick={handleNewGame} disabled={isGenerating}>
            New Game
          </button>
          <button onClick={handleReset} disabled={!level || playerPaths.size === 0}>
            Reset
          </button>
          <button onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button onClick={redo} disabled={!canRedo}>
            Redo
          </button>
        </div>

        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            Mode: {params.m === 1 ? 'Classic' : params.m === 2 ? 'Multi' : 'Flow'} | 
            Difficulty: {params.diff} | 
            Seed: {params.seed}
          </p>
          <p className="text-sm mt-2">
            Coverage: {coverage}% | Valid: {isValid ? '✓' : '✗'}
            {hasWon && <span className="ml-2 text-green-600 font-bold">You Win!</span>}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {isGenerating ? (
          <div className="p-8">
            <p>Generating level...</p>
          </div>
        ) : level ? (
          <BoardSVG
            level={level}
            playerPaths={playerPaths}
            currentColor={currentColor}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            onCellMouseUp={handleCellMouseUp}
          />
        ) : (
          <div className="p-8">
            <p>No level loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}