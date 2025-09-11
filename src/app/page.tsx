'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mode, DifficultyTier } from '@/types';
import { generateSeed, serializeShareCode, getDefaultParams } from '@/lib/seed';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(1);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('medium');
  const [customSeed, setCustomSeed] = useState('');

  const handlePlay = () => {
    const params = getDefaultParams(mode, difficulty);
    params.seed = customSeed || generateSeed();
    const hash = serializeShareCode(params);
    router.push(`/play${hash}`);
  };

  return (
    <div className="container">
      <div className="flex flex-col items-center justify-center min-h-screen py-8">
        <h1 className="text-5xl font-bold mb-8">Block Fill</h1>
        <p className="text-lg mb-8 text-center max-w-md">
          An infinite puzzle game with deterministic, seeded levels. 
          Cover all cells with paths following the rules of each mode.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Game Mode</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                className={`p-3 rounded text-left ${mode === 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setMode(1)}
              >
                <div className="font-semibold">Classic Block Fill</div>
                <div className="text-sm opacity-90">Single path covers all cells</div>
              </button>
              <button
                className={`p-3 rounded text-left ${mode === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setMode(2)}
              >
                <div className="font-semibold">Multi Block Fill</div>
                <div className="text-sm opacity-90">Multiple colored paths</div>
              </button>
              <button
                className={`p-3 rounded text-left ${mode === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setMode(3)}
              >
                <div className="font-semibold">Flow Free</div>
                <div className="text-sm opacity-90">Connect colored pairs</div>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`p-2 rounded ${difficulty === 'easy' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setDifficulty('easy')}
              >
                Easy
              </button>
              <button
                className={`p-2 rounded ${difficulty === 'medium' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setDifficulty('medium')}
              >
                Medium
              </button>
              <button
                className={`p-2 rounded ${difficulty === 'hard' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setDifficulty('hard')}
              >
                Hard
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Seed (optional)
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              placeholder="Leave empty for random"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              maxLength={12}
            />
          </div>

          <button
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            onClick={handlePlay}
          >
            Play
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Share your puzzle with the URL!</p>
          <p>Every seed generates the same puzzle for everyone.</p>
        </div>
      </div>
    </div>
  );
}