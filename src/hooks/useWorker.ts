import { useEffect, useRef, useCallback } from 'react';
import { WorkerMessage, WorkerResponse, GameParams, Level } from '@/types';
import { useGameStore } from '@/store/gameStore';

export function useWorker() {
  const workerRef = useRef<Worker | null>(null);
  const { setLevel, setIsGenerating, setError, playerPaths } = useGameStore();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/gen.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      
      switch (response.type) {
        case 'generated':
          if (response.level) {
            setLevel(response.level);
            setIsGenerating(false);
          }
          break;
          
        case 'validated':
          console.log('Validation result:', response.valid);
          break;
          
        case 'solved':
          console.log('Solution:', response.solution);
          break;
          
        case 'error':
          setError(response.error || 'Unknown error');
          setIsGenerating(false);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setLevel, setIsGenerating, setError]);

  const generateLevel = useCallback((params: GameParams) => {
    if (!workerRef.current) return;
    
    setIsGenerating(true);
    setError(null);
    
    const message: WorkerMessage = {
      type: 'generate',
      params
    };
    
    workerRef.current.postMessage(message);
  }, [setIsGenerating, setError]);

  const validateLevel = useCallback((level: Level) => {
    if (!workerRef.current) return;
    
    const message: WorkerMessage = {
      type: 'validate',
      level,
      paths: playerPaths
    };
    
    workerRef.current.postMessage(message);
  }, [playerPaths]);

  const solveLevel = useCallback((level: Level) => {
    if (!workerRef.current) return;
    
    const message: WorkerMessage = {
      type: 'solve',
      level
    };
    
    workerRef.current.postMessage(message);
  }, []);

  return {
    generateLevel,
    validateLevel,
    solveLevel
  };
}