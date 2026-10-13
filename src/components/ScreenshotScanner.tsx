import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Scan,
  CheckCircle,
  AlertCircle,
  Play,
  Sparkles,
  ArrowRight,
  Layers,
  Edit2
} from 'lucide-react';
import { NonogramPuzzle } from '../types/nonogram';
import { PRESET_PUZZLES } from '../utils/presets';
import { solveNonogram } from '../utils/solver';

interface Props {
  onLoadPuzzle: (puzzle: NonogramPuzzle) => void;
}

export const ScreenshotScanner: React.FC<Props> = ({ onLoadPuzzle }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [detectedPuzzle, setDetectedPuzzle] = useState<NonogramPuzzle | null>(null);
  const [editableRows, setEditableRows] = useState<number>(15);
  const [editableCols, setEditableCols] = useState<number>(15);
  const [rowCluesText, setRowCluesText] = useState<string>('');
  const [colCluesText, setColCluesText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load a quick sample
  const handleLoadSample = (sampleId: string) => {
    const found = PRESET_PUZZLES.find(p => p.id === sampleId);
    if (!found) return;
    setDetectedPuzzle(found);
    setEditableRows(found.rows);
    setEditableCols(found.cols);
    setRowCluesText(found.rowClues.map(c => c.join(' ')).join('\n'));
    setColCluesText(found.colClues.map(c => c.join(' ')).join('\n'));
    setAnalysisError(null);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      analyzeImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Send screenshot to server Gemini Vision API
  const analyzeImage = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setDetectedPuzzle(null);

    try {
      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to detect puzzle grid');
      }

      const d = resData.data;
      const puzzle: NonogramPuzzle = {
        id: `custom-scanned-${Date.now()}`,
        name: `Level ${d.level || 'Custom'} (${d.rows}x${d.cols})`,
        level: d.level || 'Scanned',
        difficulty: d.difficulty || 'Hard',
        rows: d.rows || 15,
        cols: d.cols || 15,
        rowClues: d.rowClues || [],
        colClues: d.colClues || [],
        initialFilled: d.currentlyFilled || [],
        initialCrossed: d.currentlyCrossed || [],
        artName: 'Scanned Nonogram Level',
      };

      setDetectedPuzzle(puzzle);
      setEditableRows(puzzle.rows);
      setEditableCols(puzzle.cols);
      setRowCluesText(puzzle.rowClues.map(c => c.join(' ')).join('\n'));
      setColCluesText(puzzle.colClues.map(c => c.join(' ')).join('\n'));
    } catch (err: any) {
      console.warn('API Vision analysis error, falling back to Level 124 preset:', err);
      setAnalysisError(
        `${err.message || 'Error communicating with AI Vision'}. You can fine-tune clues or pick the Level 124 preset below!`
      );
      // Auto-fallback to Level 124 preset
      handleLoadSample('level-124');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Convert edited texts back to puzzle
  const handleApplyEditsAndPlay = () => {
    try {
      const parsedRows: number[][] = rowCluesText
        .trim()
        .split('\n')
        .map(line =>
          line
            .trim()
            .split(/[\s,]+/)
            .map(n => parseInt(n, 10))
            .filter(n => !isNaN(n) && n > 0)
        );

      const parsedCols: number[][] = colCluesText
        .trim()
        .split('\n')
        .map(line =>
          line
            .trim()
            .split(/[\s,]+/)
            .map(n => parseInt(n, 10))
            .filter(n => !isNaN(n) && n > 0)
        );

      // Validate counts
      if (parsedRows.length !== editableRows) {
        alert(`Row count mismatch: expected ${editableRows} rows, found ${parsedRows.length} lines.`);
        return;
      }
      if (parsedCols.length !== editableCols) {
        alert(`Col count mismatch: expected ${editableCols} cols, found ${parsedCols.length} lines.`);
        return;
      }

      const finalPuzzle: NonogramPuzzle = {
        id: `puzzle-${Date.now()}`,
        name: `Level ${detectedPuzzle?.level || 124} (${editableRows}x${editableCols})`,
        level: detectedPuzzle?.level || 124,
        difficulty: detectedPuzzle?.difficulty || 'Hard',
        rows: editableRows,
        cols: editableCols,
        rowClues: parsedRows,
        colClues: parsedCols,
        initialFilled: detectedPuzzle?.initialFilled || [],
        initialCrossed: detectedPuzzle?.initialCrossed || [],
        artName: 'Custom Analyzed Art',
      };

      // Test solve
      const test = solveNonogram(finalPuzzle.rowClues, finalPuzzle.colClues);
      if (!test.success) {
        const confirmGo = confirm(
          `Warning: Solver found a contradiction: ${test.reason}. Do you still want to load it into the simulator?`
        );
        if (!confirmGo) return;
      }

      onLoadPuzzle(finalPuzzle);
    } catch (e: any) {
      alert(`Invalid clues format: ${e.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              AI Screenshot Scanner & Grid Auto-Detector
            </h2>
            <p className="text-xs text-slate-500">
              Upload any phone screenshot (10x10, 10x15, 15x15, 20x20). AI detects the grid size & clues automatically!
            </p>
          </div>
        </div>

        {/* Preset Quick Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Quick Test Presets:</span>
          <button
            onClick={() => handleLoadSample('level-124')}
            className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            Screenshot 1 (Level 124 - 15x15 Hard)
          </button>
          <button
            onClick={() => handleLoadSample('level-10x10-duck')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Level 14 (10x10 Easy)
          </button>
          <button
            onClick={() => handleLoadSample('level-10x15-butterfly')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Level 65 (10x15 Medium)
          </button>
          <button
            onClick={() => handleLoadSample('level-15x15-castle')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Level 98 (15x15 Hard)
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white rounded-3xl p-6 border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50/20 cursor-pointer transition flex flex-col items-center justify-center text-center min-h-[260px] shadow-sm relative overflow-hidden"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedImage ? (
            <div className="relative w-full h-full flex flex-col items-center">
              <img
                src={selectedImage}
                alt="Selected screenshot"
                className="max-h-[220px] object-contain rounded-xl shadow-md border border-slate-200"
              />
              <span className="mt-2 text-xs text-cyan-700 font-bold">
                Tap to change image
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Upload Mobile Game Screenshot
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PNG, JPG, WebP from your phone's gallery
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                Auto-detects 10x10, 10x15, 15x15
              </span>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
              <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-bold text-cyan-300">
                AI Vision Scanning Grid & Clues...
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Detecting row numbers, column numbers, and grid dimensions
              </p>
            </div>
          )}
        </div>

        {/* Detection Details & Editor */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Detected Grid Configuration
              </h3>
              {detectedPuzzle && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">
                  {editableRows} x {editableCols}
                </span>
              )}
            </div>

            {analysisError && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Grid dimensions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Rows:
                </label>
                <input
                  type="number"
                  min="5"
                  max="25"
                  value={editableRows}
                  onChange={e => setEditableRows(parseInt(e.target.value, 10) || 15)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Columns:
                </label>
                <input
                  type="number"
                  min="5"
                  max="25"
                  value={editableCols}
                  onChange={e => setEditableCols(parseInt(e.target.value, 10) || 15)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-cyan-500"
                />
              </div>
            </div>

            {/* Clues Preview Textareas */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Row Clues ({editableRows} lines):
                </label>
                <textarea
                  rows={6}
                  value={rowCluesText}
                  onChange={e => setRowCluesText(e.target.value)}
                  placeholder="e.g.&#10;1 1 3 1 1&#10;1 5 1&#10;1 7 1"
                  className="w-full p-2 rounded-xl border border-slate-300 font-mono text-[11px] leading-tight focus:outline-cyan-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Column Clues ({editableCols} lines):
                </label>
                <textarea
                  rows={6}
                  value={colCluesText}
                  onChange={e => setColCluesText(e.target.value)}
                  placeholder="e.g.&#10;2&#10;2 1&#10;1 1 2 2"
                  className="w-full p-2 rounded-xl border border-slate-300 font-mono text-[11px] leading-tight focus:outline-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={handleApplyEditsAndPlay}
              disabled={!rowCluesText.trim() || !colCluesText.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              Load into Live Game Simulator & Auto-Solve →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
