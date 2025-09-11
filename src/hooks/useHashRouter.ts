import { useEffect, useCallback } from 'react';
import { parseShareCode, serializeShareCode } from '@/lib/seed';
import { GameParams } from '@/types';
import { useGameStore } from '@/store/gameStore';

export function useHashRouter() {
  const { params, setParams } = useGameStore();

  const updateHash = useCallback((newParams: GameParams) => {
    const hash = serializeShareCode(newParams);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, []);

  const loadFromHash = useCallback(() => {
    const hash = window.location.hash;
    if (hash) {
      const parsedParams = parseShareCode(hash);
      setParams(parsedParams);
      return parsedParams;
    }
    return null;
  }, [setParams]);

  useEffect(() => {
    const handleHashChange = () => {
      loadFromHash();
    };

    loadFromHash();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadFromHash]);

  useEffect(() => {
    if (params.seed) {
      updateHash(params);
    }
  }, [params, updateHash]);

  return {
    updateHash,
    loadFromHash,
    currentParams: params
  };
}