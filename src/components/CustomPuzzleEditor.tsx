import React, { useState } from 'react';
import {
  Grid,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import { CellState, NonogramPuzzle } from '../types/nonogram';
import { solveNonogram } from '../utils/solver';

interface Props {
  onLoadIntoSimulator: (puzzle: NonogramPuzzle) => void;
}

export const CustomPuzzleEditor: React.FC<Props> = ({ onLoadIntoSimulator }) => {
  const [rows, setRows] = useState<number>(10);
  const [cols, setCols] = useState<number>(10);
  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array.from({ length: 10 }, () => Array(10).fill(0))
  );
  const [levelName, setLevelName] = useState('My Custom Level');

  const handleResize = (newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
    setGrid(Array.from({ length: newRows }, () => Array(newCols).fill(0)));
  };

  const toggleCell = (r: number, c: number) => {
    const next = grid.map(row => [...row]);
    next[r][c] = next[r][c] === 1 ? 0 : 1;
    setGrid(next);
  };

  // Compute nonogram clues from current drawing
  const generateClues = () => {
    const rowClues: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const runs: number[] = [];
      let count = 0;
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) {
          count++;
        } else {
          if (count > 0) runs.push(count);
          count = 0;
        }
      }
      if (count > 0) runs.push(count);
      rowClues.push(runs.length > 0 ? runs : [0]);
    }

    const colClues: number[][] = [];
    for (let c = 0; c < cols; c++) {
      const runs: number[] = [];
      let count = 0;
      for (let r = 0; r < rows; r++) {
        if (grid[r][c] === 1) {
          count++;
        } else {
          if (count > 0) runs.push(count);
          count = 0;
        }
      }
      if (count > 0) runs.push(count);
      colClues.push(runs.length > 0 ? runs : [0]);
    }

    return { rowClues, colClues };
  };

  const handleSendToSimulator = () => {
    const { rowClues, colClues } = generateClues();
    const puzzle: NonogramPuzzle = {
      id: `custom-created-${Date.now()}`,
      name: levelName || `${rows}x${cols} Custom`,
      level: 'Custom',
      difficulty: rows > 12 ? 'Hard' : rows > 8 ? 'Medium' : 'Easy',
      rows,
      cols,
      rowClues,
      colClues,
      artName: levelName,
      artEmoji: '🎨',
    };
    onLoadIntoSimulator(puzzle);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-cyan-600" />
              Custom Pixel Art & Nonogram Creator
            </h2>
            <p className="text-xs text-slate-500">
              Draw any pixel art! Clues are generated instantly and tested against the solver.
            </p>
          </div>

          {/* Preset size buttons */}
          <div className="flex items-center gap-2">
            {[
              { r: 10, c: 10, label: '10x10' },
              { r: 10, c: 15, label: '10x15' },
              { r: 15, c: 15, label: '15x15' },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => handleResize(preset.r, preset.c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rows === preset.r && cols === preset.c
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level Name Input */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-700 block mb-1">Puzzle Name:</label>
          <input
            type="text"
            value={levelName}
            onChange={e => setLevelName(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-cyan-500"
          />
        </div>

        {/* Canvas Grid */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 overflow-auto">
          <div
            className="inline-grid gap-1 bg-white p-2 rounded-xl border border-slate-300 shadow-sm"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  className={`w-6 h-6 rounded-sm border transition ${
                    cell === 1
                      ? 'bg-cyan-600 border-cyan-700'
                      : 'bg-white border-slate-200 hover:bg-cyan-50'
                  }`}
                />
              ))
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setGrid(Array.from({ length: rows }, () => Array(cols).fill(0)))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Canvas
          </button>

          <button
            onClick={handleSendToSimulator}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black shadow-md active:scale-98 transition"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch in Auto-Solver Simulator →
          </button>
        </div>
      </div>
    </div>
  );
};
