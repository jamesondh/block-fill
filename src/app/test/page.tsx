'use client';

import { useEffect, useState } from 'react';
import { createGenerationWorker } from '@/lib/worker-factory';

export default function TestPage() {
  const [status, setStatus] = useState('Initializing...');
  const [levelData, setLevelData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Test page mounted, creating worker...');
    setStatus('Creating worker...');
    
    try {
      const worker = createGenerationWorker();
      console.log('Worker created successfully:', worker);
      setStatus('Worker created, sending test message...');

      worker.onmessage = (event) => {
        console.log('Worker response received:', event.data);
        
        if (event.data.type === 'generated' && event.data.level) {
          setStatus('Level generated successfully!');
          setLevelData(event.data.level);
        } else if (event.data.type === 'error') {
          setStatus('Worker returned error');
          setError(event.data.error || 'Unknown error');
        } else {
          setStatus(`Worker response: ${event.data.type}`);
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setStatus('Worker error occurred');
        setError(String(error));
      };

      // Test generation with a small delay to ensure worker is ready
      setTimeout(() => {
        console.log('Sending test generation message...');
        setStatus('Sending generation request...');
        
        worker.postMessage({
          type: 'generate',
          params: {
            w: 10,
            h: 10,
            hd: 0.1,
            m: 1,
            seed: 'test123'
          }
        });
      }, 100);

      // Cleanup
      return () => {
        console.log('Cleaning up worker...');
        worker.terminate();
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
      setStatus('Failed to create worker');
      setError(String(error));
    }
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Worker Test Page</h1>
      
      <div className="mb-4">
        <strong>Status:</strong> <span className={error ? 'text-red-600' : 'text-green-600'}>{status}</span>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {levelData && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
          <strong>Level Generated!</strong>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(levelData, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="text-sm text-gray-600">
        Check the browser console for detailed logs
      </div>
    </div>
  );
}
