import { useEffect, useRef, useCallback } from 'react';
import { WorkerMessage, WorkerResponse, GameParams, Level } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { createGenerationWorker, terminateWorker } from '@/lib/worker-factory';

export function useWorker() {
  const workerRef = useRef<Worker | null>(null);
  const { setLevel, setIsGenerating, setError, playerPaths } = useGameStore();

  useEffect(() => {
    console.log('useWorker: Creating worker...');
    
    try {
      // Create worker using our factory
      workerRef.current = createGenerationWorker();
      console.log('useWorker: Worker created successfully');
    } catch (error) {
      console.error('useWorker: Failed to create worker:', error);
      setError('Failed to initialize worker');
      return;
    }

    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      console.log('Worker message received:', event.data);
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
          console.error('Worker error:', response.error);
          setError(response.error || 'Unknown error');
          setIsGenerating(false);
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setError('Worker failed to load');
      setIsGenerating(false);
    };

    return () => {
      if (workerRef.current) {
        terminateWorker(workerRef.current);
        workerRef.current = null;
      }
    };
  }, [setLevel, setIsGenerating, setError]);

  const generateLevel = useCallback((params: GameParams) => {
    console.log('generateLevel called with params:', params);
    
    if (!workerRef.current) {
      console.error('Worker not initialized!');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    const message: WorkerMessage = {
      type: 'generate',
      params
    };
    
    console.log('Posting message to worker:', message);
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