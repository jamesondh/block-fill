'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { Level } from '@/types';
import { PaintModel } from '@/lib/paint';

interface BoardSVGProps {
  level: Level;
  playerPaths: Map<number, number[]>;
  currentColor?: number;
  onCellMouseDown: (index: number) => void;
  onCellMouseEnter: (index: number) => void;
  onCellMouseUp: () => void;
}

export function BoardSVG({
  level,
  playerPaths,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp
}: BoardSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const paintModel = useMemo(() => new PaintModel(level), [level]);
  
  const cellSize = 40;
  const gap = 2;
  const pathWidth = 12;
  const svgWidth = level.w * (cellSize + gap) + gap;
  const svgHeight = level.h * (cellSize + gap) + gap;

  const getCellPosition = useCallback((index: number) => {
    const x = index % level.w;
    const y = Math.floor(index / level.w);
    return {
      x: x * (cellSize + gap) + gap,
      y: y * (cellSize + gap) + gap
    };
  }, [level.w, cellSize, gap]);

  const getCellCenter = useCallback((index: number) => {
    const pos = getCellPosition(index);
    return {
      x: pos.x + cellSize / 2,
      y: pos.y + cellSize / 2
    };
  }, [getCellPosition, cellSize]);

  const renderCell = useCallback((index: number) => {
    if (!paintModel.isValidCell(index)) return null;
    
    const pos = getCellPosition(index);
    const isStart = paintModel.isStartCell(index);
    const isEnd = paintModel.isEndCell(index);
    const startColor = paintModel.getStartColor(index);
    const endColor = paintModel.getEndColor(index);
    
    let fillColor = 'var(--grid-bg)';
    let strokeWidth = 1;
    let strokeColor = 'var(--border-color)';
    
    for (const [color, path] of playerPaths) {
      if (path.includes(index)) {
        fillColor = `var(--color-${color})`;
        fillColor = fillColor.replace(')', ', 0.3)').replace('rgb', 'rgba');
        break;
      }
    }
    
    if (isStart || isEnd) {
      strokeWidth = 2;
      strokeColor = `var(--color-${startColor ?? endColor})`;
    }

    return (
      <g key={`cell-${index}`}>
        <rect
          x={pos.x}
          y={pos.y}
          width={cellSize}
          height={cellSize}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx={4}
          ry={4}
          style={{ cursor: 'pointer' }}
          onMouseDown={() => onCellMouseDown(index)}
          onMouseEnter={() => onCellMouseEnter(index)}
        />
        {isStart && (
          <circle
            cx={pos.x + cellSize / 2}
            cy={pos.y + cellSize / 2}
            r={8}
            fill={`var(--color-${startColor})`}
            pointerEvents="none"
          />
        )}
        {isEnd && (
          <rect
            x={pos.x + cellSize / 2 - 6}
            y={pos.y + cellSize / 2 - 6}
            width={12}
            height={12}
            fill={`var(--color-${endColor})`}
            pointerEvents="none"
          />
        )}
      </g>
    );
  }, [paintModel, getCellPosition, cellSize, playerPaths, onCellMouseDown, onCellMouseEnter]);

  const renderPath = useCallback((color: number, path: number[]) => {
    if (path.length < 2) return null;
    
    const points: string[] = [];
    for (let i = 0; i < path.length; i++) {
      const center = getCellCenter(path[i]);
      if (i === 0) {
        points.push(`M ${center.x} ${center.y}`);
      } else {
        points.push(`L ${center.x} ${center.y}`);
      }
    }
    
    return (
      <path
        key={`path-${color}`}
        d={points.join(' ')}
        fill="none"
        stroke={`var(--color-${color})`}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
        pointerEvents="none"
      />
    );
  }, [getCellCenter, pathWidth]);

  const cells = useMemo(() => {
    const result = [];
    for (let i = 0; i < level.w * level.h; i++) {
      const cell = renderCell(i);
      if (cell) result.push(cell);
    }
    return result;
  }, [level, renderCell]);

  const paths = useMemo(() => {
    const result = [];
    for (const [color, path] of playerPaths) {
      const pathElement = renderPath(color, path);
      if (pathElement) result.push(pathElement);
    }
    return result;
  }, [playerPaths, renderPath]);

  return (
    <svg
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{
        backgroundColor: 'var(--grid-bg)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      onMouseUp={onCellMouseUp}
      onMouseLeave={onCellMouseUp}
    >
      <g>{cells}</g>
      <g>{paths}</g>
    </svg>
  );
}