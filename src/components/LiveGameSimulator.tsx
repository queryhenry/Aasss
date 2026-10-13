import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Heart,
  Settings,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  ChevronDown,
  Wifi,
  Battery,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  X,
  BookOpen,
  Lightbulb,
  ArrowLeft,
  Eye,
  Check
} from 'lucide-react';
import { CellState, NonogramPuzzle, SolveStep } from '../types/nonogram';
import { solveNonogram, isLineSatisfied } from '../utils/solver';
import { sound } from '../utils/sound';

interface Props {
  puzzle: NonogramPuzzle;
  onSelectAnother: () => void;
  onOpenScreenshotScanner: () => void;
  onOpenAndroidGuide: () => void;
}

export const LiveGameSimulator: React.FC<Props> = ({
  puzzle,
  onSelectAnother,
  onOpenScreenshotScanner,
  onOpenAndroidGuide,
}) => {
  // Screen state: 'booster-modal' (Screenshot 2) or 'live-game' (Screenshot 1)
  const [screen, setScreen] = useState<'booster-modal' | 'live-game'>('booster-modal');

  // Grid state
  const [grid, setGrid] = useState<CellState[][]>(() => {
    return Array.from({ length: puzzle.rows }, () => Array(puzzle.cols).fill(0));
  });

  // Tool: 1 for Fill (Square), 2 for Cross (X)
  const [activeTool, setActiveTool] = useState<1 | 2>(1);

  // Auto-solver states
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [autoSolveSpeed, setAutoSolveSpeed] = useState<'normal' | 'turbo' | 'instant'>('normal');
  const [soundOn, setSoundOn] = useState(true);
  const [scanAnimation, setScanAnimation] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [activeTapCoord, setActiveTapCoord] = useState<[number, number] | null>(null);
  const [highlightLine, setHighlightLine] = useState<{ type: 'row' | 'col'; index: number } | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [solvedArtRevealed, setSolvedArtRevealed] = useState(false);

  // Pre-calculated solution and step queue
  const solutionRef = useRef<CellState[][] | null>(null);
  const stepsQueueRef = useRef<SolveStep[]>([]);
  const autoSolveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset board when puzzle changes
  useEffect(() => {
    resetBoard();
  }, [puzzle]);

  // Sync sound settings
  useEffect(() => {
    sound.enabled = soundOn;
  }, [soundOn]);

  const resetBoard = () => {
    if (autoSolveTimerRef.current) {
      clearTimeout(autoSolveTimerRef.current);
      autoSolveTimerRef.current = null;
    }
    setIsAutoSolving(false);
    setIsCompleted(false);
    setSolvedArtRevealed(false);
    setCurrentStepIndex(0);
    setActiveTapCoord(null);
    setHighlightLine(null);

    // Initial grid state (prefilled from screenshot if available)
    const newGrid: CellState[][] = Array.from({ length: puzzle.rows }, () =>
      Array(puzzle.cols).fill(0)
    );

    if (puzzle.initialFilled) {
      puzzle.initialFilled.forEach(([r, c]) => {
        if (r < puzzle.rows && c < puzzle.cols) newGrid[r][c] = 1;
      });
    }
    if (puzzle.initialCrossed) {
      puzzle.initialCrossed.forEach(([r, c]) => {
        if (r < puzzle.rows && c < puzzle.cols) newGrid[r][c] = 2;
      });
    }

    setGrid(newGrid);

    // Compute full solution
    const solveRes = solveNonogram(puzzle.rowClues, puzzle.colClues);
    if (solveRes.success && solveRes.isComplete) {
      solutionRef.current = solveRes.grid;
      stepsQueueRef.current = solveRes.steps;
      setTotalSteps(solveRes.steps.length);
    }
  };

  // Check if grid is solved
  const checkCompletion = (curGrid: CellState[][]) => {
    if (!solutionRef.current) return false;
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const solVal = solutionRef.current[r][c];
        const curVal = curGrid[r][c];
        // If solution is 1 (filled), cell must be 1. If solution is 2 (empty/cross), cell must be 2 or not 1
        if (solVal === 1 && curVal !== 1) return false;
        if (solVal === 2 && curVal === 1) return false;
      }
    }
    return true;
  };

  // Trigger win effects
  const triggerWin = () => {
    setIsAutoSolving(false);
    setIsCompleted(true);
    setSolvedArtRevealed(true);
    sound.playWin();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Cell manual click
  const handleCellClick = (r: number, c: number) => {
    if (isAutoSolving || isCompleted) return;
    const current = grid[r][c];
    let next: CellState = 0;
    if (current === 0) {
      next = activeTool;
    } else if (current === activeTool) {
      next = 0;
    } else {
      next = activeTool;
    }

    if (next === 1) sound.playFill();
    else if (next === 2) sound.playCross();
    else sound.playClick();

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = next;
    setGrid(newGrid);

    if (checkCompletion(newGrid)) {
      triggerWin();
    }
  };

  // Execute Auto Solver
  const startAutoSolve = () => {
    setIsNotificationOpen(false);
    setScanAnimation(true);
    sound.playScan();

    setTimeout(() => {
      setScanAnimation(false);
      setIsAutoSolving(true);
      runSolverLoop(grid, 0);
    }, 900);
  };

  const pauseAutoSolve = () => {
    if (autoSolveTimerRef.current) {
      clearTimeout(autoSolveTimerRef.current);
      autoSolveTimerRef.current = null;
    }
    setIsAutoSolving(false);
  };

  // Step-by-step or fast auto-solver execution
  const runSolverLoop = (currentWorkingGrid: CellState[][], stepIdx: number) => {
    if (!solutionRef.current) return;

    // Instant mode: immediately apply solution
    if (autoSolveSpeed === 'instant') {
      const fullSol = solutionRef.current.map(row => [...row]);
      setGrid(fullSol);
      sound.playFill();
      triggerWin();
      return;
    }

    // Step by step cell filling
    // Find next un-filled or un-crossed cell that doesn't match solution
    const targetCells: { r: number; c: number; target: CellState }[] = [];
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const correct = solutionRef.current[r][c];
        if (currentWorkingGrid[r][c] !== correct) {
          targetCells.push({ r, c, target: correct });
        }
      }
    }

    if (targetCells.length === 0) {
      // Puzzle is complete! Automatically stop!
      triggerWin();
      return;
    }

    // Pick next cell to fill
    const nextCell = targetCells[0];
    const newGrid = currentWorkingGrid.map(row => [...row]);
    newGrid[nextCell.r][nextCell.c] = nextCell.target;

    // Switch tool icon to match the action
    setActiveTool(nextCell.target === 1 ? 1 : 2);
    setActiveTapCoord([nextCell.r, nextCell.c]);
    setHighlightLine({ type: 'row', index: nextCell.r });

    if (nextCell.target === 1) sound.playFill();
    else sound.playCross();

    setGrid(newGrid);
    setCurrentStepIndex(prev => prev + 1);

    const delay = autoSolveSpeed === 'turbo' ? 25 : 120;

    autoSolveTimerRef.current = setTimeout(() => {
      runSolverLoop(newGrid, stepIdx + 1);
    }, delay);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-2 sm:p-4 select-none">
      {/* Mobile Frame Container */}
      <div className="relative w-full max-w-[420px] aspect-[9/19.5] max-h-[880px] bg-sky-100 rounded-[44px] shadow-2xl border-[10px] border-slate-900 overflow-hidden flex flex-col font-sans transition-all duration-300">
        
        {/* Android Top Notch / Dynamic Island & Status Bar */}
        <div
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative z-30 w-full h-8 bg-sky-200/90 backdrop-blur-sm px-5 flex items-center justify-between text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-sky-300/80 transition-colors"
          title="Click or drag to open Android Notification Bar"
        >
          <div className="flex items-center gap-1.5">
            <span>15:50</span>
            {/* Auto Solver Status Icon */}
            <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold animate-pulse">
              <Zap className="w-2.5 h-2.5 fill-white" />
              AUTO
            </span>
          </div>

          {/* Notch Speaker */}
          <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto" />

          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" />
            <span>5G</span>
            <div className="flex items-center">
              <Battery className="w-3.5 h-3.5" />
              <span className="text-[10px]">85%</span>
            </div>
          </div>

          {/* Pull-down indicator tab */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-700/60 hover:bg-slate-800 text-white rounded-full px-2 py-0.5 text-[8px] flex items-center gap-0.5 shadow-sm">
            <ChevronDown className="w-2.5 h-2.5" />
            <span>Pull Down</span>
          </div>
        </div>

        {/* ----------------- ANDROID NOTIFICATION SHADE DRAWER ----------------- */}
        {isNotificationOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col p-4 animate-in fade-in slide-in-from-top-6 duration-200">
            {/* Shade Header */}
            <div className="flex items-center justify-between text-slate-300 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">15:50</span>
                <span className="text-xs text-slate-400">Tuesday, Oct 13</span>
              </div>
              <button
                onClick={() => setIsNotificationOpen(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Android Quick Settings Tiles */}
            <div className="grid grid-cols-4 gap-2 my-3">
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-600 text-white text-[10px] font-medium">
                <Wifi className="w-4 h-4" />
                <span>Wi-Fi</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-600 text-white text-[10px] font-medium">
                <Volume2 className="w-4 h-4" />
                <span>Sound</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-emerald-600 text-white text-[10px] font-medium shadow-lg shadow-emerald-500/20">
                <Zap className="w-4 h-4 fill-white" />
                <span>Auto-Bot</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-medium">
                <Sliders className="w-4 h-4" />
                <span>Overlay</span>
              </div>
            </div>

            {/* PRIMARY NOTIFICATION CARD: PIXEL ART AUTO-SOLVER */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Pixel Art Auto-Solver
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px]">
                        RUNNING
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Live detected: <strong className="text-cyan-400">Level {puzzle.level || 124} ({puzzle.rows}x{puzzle.cols})</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Details */}
              <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Logic engine:</span>
                  <span className="text-emerald-400 font-semibold">Line Deduction + Constraint SAT</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="text-cyan-400 font-semibold">100% (0 Heart Loss)</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-stop:</span>
                  <span className="text-slate-200 font-semibold">Enabled on puzzle completion</span>
                </div>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span>Speed:</span>
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={() => setAutoSolveSpeed('normal')}
                    className={`px-2 py-1 rounded-md transition ${autoSolveSpeed === 'normal' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Normal (1x)
                  </button>
                  <button
                    onClick={() => setAutoSolveSpeed('turbo')}
                    className={`px-2 py-1 rounded-md transition ${autoSolveSpeed === 'turbo' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Turbo (5x)
                  </button>
                  <button
                    onClick={() => setAutoSolveSpeed('instant')}
                    className={`px-2 py-1 rounded-md transition ${autoSolveSpeed === 'instant' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Instant ⚡
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {!isAutoSolving ? (
                  <button
                    onClick={startAutoSolve}
                    disabled={isCompleted}
                    className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-98 transition disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    START AUTO SOLVER NOW
                  </button>
                ) : (
                  <button
                    onClick={pauseAutoSolve}
                    className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg active:scale-98 transition"
                  >
                    <span>⏸ PAUSE AUTO SOLVER</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification Drawer Bottom Dismiss */}
            <div className="mt-auto pt-3 text-center">
              <button
                onClick={() => setIsNotificationOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Notification Shade ▲
              </button>
            </div>
          </div>
        )}

        {/* ----------------- SCREEN 2: BOOSTER MODAL (Screenshot 2) ----------------- */}
        {screen === 'booster-modal' && (
          <div className="relative flex-1 bg-gradient-to-b from-emerald-600/40 via-amber-600/20 to-sky-200 flex flex-col items-center justify-center p-4">
            {/* Background elements simulating map */}
            <div className="absolute inset-0 opacity-30 pointer-events-none flex flex-col justify-between p-6">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                <div className="bg-white/80 px-2 py-1 rounded-full shadow">⚡ 8</div>
                <div className="bg-white/80 px-2 py-1 rounded-full shadow">⭐ 108</div>
                <div className="bg-white/80 px-2 py-1 rounded-full shadow">⏩ 1</div>
              </div>
              <div className="text-center font-bold text-slate-600 text-sm">
                Pixel Art Adventure World
              </div>
            </div>

            {/* THE LEVEL MODAL POPUP (Matching Screenshot 2 exactly!) */}
            <div className="relative z-10 w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border-4 border-slate-900 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              {/* Close X */}
              <button
                onClick={onSelectAnother}
                className="absolute top-4 right-4 p-1 text-slate-800 hover:text-red-500"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 mb-3">
                Level {puzzle.level || 124}
              </h2>

              {/* Pixel's Gift Progress bar */}
              <div className="w-full bg-slate-200/90 rounded-2xl p-2.5 border-2 border-slate-800 flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-xl shadow">
                  🎁
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-1">
                    <span>Pixel's Gift</span>
                    <span className="text-[10px] text-slate-500">ⓘ</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-300 rounded-full overflow-hidden flex">
                    <div className="w-1/3 bg-slate-400 border-r border-slate-300" />
                    <div className="w-1/3 bg-slate-400 border-r border-slate-300" />
                    <div className="w-1/3 bg-slate-300" />
                  </div>
                  <div className="text-[9px] text-slate-600 text-center mt-0.5 font-bold">0/3</div>
                </div>
              </div>

              {/* Select Boosters */}
              <h3 className="text-sm font-black text-slate-800 mb-3">Select Boosters</h3>
              <div className="flex justify-center items-center gap-3.5 mb-5">
                {/* Radar Booster */}
                <div className="relative w-13 h-13 rounded-full bg-blue-100 border-2 border-blue-600 shadow flex items-center justify-center cursor-pointer hover:scale-105 transition">
                  <span className="text-xl">📡</span>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border border-slate-900 text-[10px] font-bold flex items-center justify-center">
                    1
                  </div>
                </div>
                {/* Rocket Cross Booster */}
                <div className="relative w-13 h-13 rounded-full bg-sky-100 border-2 border-sky-600 shadow flex items-center justify-center cursor-pointer hover:scale-105 transition">
                  <span className="text-xl">🚀</span>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border border-slate-900 text-[10px] font-bold flex items-center justify-center">
                    1
                  </div>
                </div>
                {/* +1 Heart Booster */}
                <div className="relative w-13 h-13 rounded-full bg-pink-100 border-2 border-pink-600 shadow flex items-center justify-center cursor-pointer hover:scale-105 transition">
                  <span className="text-xl">💖</span>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border border-slate-900 text-[10px] font-bold flex items-center justify-center">
                    1
                  </div>
                </div>
              </div>

              {/* Big Blue Play Button */}
              <button
                onClick={() => setScreen('live-game')}
                className="relative w-full py-3.5 rounded-full bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white font-black text-xl tracking-wide shadow-[0_5px_0_#0369a1] active:translate-y-1 active:shadow-none border-2 border-slate-900 transition flex items-center justify-center cursor-pointer mb-2"
              >
                <span>Play</span>
                <div className="absolute -top-2 right-4 bg-amber-300 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-900 shadow">
                  -1 ⚡
                </div>
              </button>

              {/* Difficulty and Dimensions */}
              <p className="text-xs font-bold text-slate-700">
                {puzzle.difficulty || 'Hard'} - {puzzle.rows}x{puzzle.cols}
              </p>
            </div>
          </div>
        )}

        {/* ----------------- SCREEN 1: LIVE GAME 124 (Screenshot 1) ----------------- */}
        {screen === 'live-game' && (
          <div className="relative flex-1 bg-gradient-to-b from-sky-100 via-blue-50 to-sky-200 flex flex-col justify-between overflow-hidden">
            
            {/* Top Bar matching Screenshot 1 */}
            <div className="pt-2 px-4 pb-1 flex items-center justify-between">
              {/* Back Arrow */}
              <button
                onClick={() => setScreen('booster-modal')}
                className="w-8 h-8 rounded-full bg-white/80 shadow border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Title & Difficulty */}
              <div className="text-center">
                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                  Level {puzzle.level || 124}
                </h1>
                <span className="text-[11px] font-bold text-slate-500">
                  {puzzle.difficulty || 'Hard'}
                </span>
              </div>

              {/* Ads & Settings */}
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full border-2 border-red-500 bg-white flex items-center justify-center text-[8px] font-black text-red-600 shadow-sm">
                  ADS
                </div>
                <div className="w-7 h-7 rounded-full bg-white/80 border border-slate-300 flex items-center justify-center text-slate-700 shadow-sm cursor-pointer hover:bg-white">
                  <Settings className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 4 Pink Hearts */}
            <div className="flex justify-center items-center gap-1.5 py-1">
              {[0, 1, 2, 3].map(i => (
                <Heart
                  key={i}
                  className="w-5 h-5 fill-pink-500 text-slate-900 stroke-[1.5] filter drop-shadow-sm"
                />
              ))}
            </div>

            {/* Laser scanning visual banner when auto-solving starts */}
            {scanAnimation && (
              <div className="absolute inset-x-4 top-24 z-40 bg-slate-900/90 text-cyan-400 p-2.5 rounded-xl border border-cyan-400 shadow-xl flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
                <Zap className="w-4 h-4 fill-cyan-400" />
                <span>AI Scanning {puzzle.rows}x{puzzle.cols} Grid & Clues... Solving!</span>
              </div>
            )}

            {/* Scanning line sweep effect */}
            {scanAnimation && (
              <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] z-30 animate-bounce top-1/2" />
            )}

            {/* ===================== THE NONOGRAM GRID CONTAINER ===================== */}
            <div className="flex-1 flex items-center justify-center px-1 py-1 overflow-auto">
              <div className="inline-block bg-white p-1 rounded-xl shadow-lg border-2 border-slate-800">
                
                {/* Board Layout: Clues + Grid Table */}
                <table className="border-collapse select-none">
                  <thead>
                    <tr>
                      {/* Top-Left Empty Junction Cell */}
                      <th className="bg-slate-100/60 p-0.5 border border-slate-300" />

                      {/* Column Clues (Header Row) */}
                      {puzzle.colClues.map((clueList, colIdx) => {
                        const colValues = clueList.filter(c => c > 0);
                        const isColSatisfied = isLineSatisfied(
                          clueList,
                          grid.map(row => row[colIdx])
                        );
                        const isMiddleBlock = (colIdx + 1) % 5 === 0 && colIdx + 1 < puzzle.cols;

                        return (
                          <th
                            key={colIdx}
                            className={`align-bottom px-0.5 py-1 text-center font-bold text-[9px] leading-tight select-none ${
                              isColSatisfied
                                ? 'bg-slate-200/90 text-slate-400 line-through'
                                : 'bg-slate-50 text-slate-800'
                            } ${isMiddleBlock ? 'border-r-2 border-r-slate-800' : 'border-r border-slate-300'}`}
                            style={{ minWidth: puzzle.cols === 15 ? '16px' : '22px' }}
                          >
                            <div className="flex flex-col items-center justify-end h-full gap-0.5">
                              {colValues.length > 0 ? (
                                colValues.map((n, idx) => (
                                  <span key={idx} className="block">
                                    {n}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 font-normal">0</span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {/* Rows */}
                    {grid.map((row, rowIdx) => {
                      const rowClues = puzzle.rowClues[rowIdx].filter(c => c > 0);
                      const isRowSatisfied = isLineSatisfied(puzzle.rowClues[rowIdx], row);
                      const isBottomBlock = (rowIdx + 1) % 5 === 0 && rowIdx + 1 < puzzle.rows;

                      return (
                        <tr
                          key={rowIdx}
                          className={`${
                            isBottomBlock ? 'border-b-2 border-b-slate-800' : 'border-b border-slate-300'
                          }`}
                        >
                          {/* Row Clues (Left Header) */}
                          <td
                            className={`px-1 py-0.5 text-right font-bold text-[9px] select-none whitespace-nowrap ${
                              isRowSatisfied
                                ? 'bg-slate-200/90 text-slate-400 line-through'
                                : 'bg-slate-50 text-slate-800'
                            } border-r-2 border-r-slate-800`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {rowClues.length > 0 ? (
                                rowClues.map((n, idx) => (
                                  <span key={idx} className="inline-block">
                                    {n}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 font-normal">0</span>
                              )}
                            </div>
                          </td>

                          {/* Row Cells */}
                          {row.map((cellValue, colIdx) => {
                            const isMiddleBlockCol =
                              (colIdx + 1) % 5 === 0 && colIdx + 1 < puzzle.cols;
                            const isTapActive =
                              activeTapCoord &&
                              activeTapCoord[0] === rowIdx &&
                              activeTapCoord[1] === colIdx;

                            return (
                              <td
                                key={colIdx}
                                onClick={() => handleCellClick(rowIdx, colIdx)}
                                className={`p-0 text-center align-middle cursor-pointer transition-all duration-75 relative ${
                                  isMiddleBlockCol
                                    ? 'border-r-2 border-r-slate-800'
                                    : 'border-r border-slate-300'
                                }`}
                                style={{
                                  width: puzzle.cols === 15 ? '16px' : '22px',
                                  height: puzzle.rows === 15 ? '16px' : '22px',
                                }}
                              >
                                {cellValue === 1 && (
                                  <div className="w-full h-full bg-cyan-600 border border-cyan-700 flex items-center justify-center animate-in zoom-in-75 duration-75" />
                                )}
                                {cellValue === 2 && (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold select-none leading-none">
                                    ✕
                                  </div>
                                )}
                                {cellValue === 0 && (
                                  <div className="w-full h-full bg-white hover:bg-sky-50 transition" />
                                )}

                                {/* Auto-Tap Ripple Animation */}
                                {isTapActive && (
                                  <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FLOATING BOT WIDGET (Overlay button on the right edge) */}
            <div className="absolute right-2 top-20 z-20 flex flex-col items-end gap-1.5">
              <button
                onClick={() => {
                  if (isAutoSolving) pauseAutoSolve();
                  else startAutoSolve();
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black shadow-lg border-2 border-slate-900 transition active:scale-95 ${
                  isAutoSolving
                    ? 'bg-amber-400 text-slate-900 animate-pulse'
                    : 'bg-emerald-500 text-white hover:bg-emerald-400'
                }`}
                title="Tap to Auto-Solve"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isAutoSolving ? 'PAUSE BOT' : 'AUTO SOLVE'}</span>
              </button>

              <button
                onClick={resetBoard}
                className="w-7 h-7 rounded-full bg-white text-slate-700 border border-slate-300 shadow flex items-center justify-center hover:bg-slate-100"
                title="Reset Board"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Controls Bar (Matching Screenshot 1) */}
            <div className="px-4 py-2 flex items-center justify-between bg-sky-200/80 backdrop-blur-sm border-t border-sky-300/80">
              {/* Left: Book / Collection Icon */}
              <div
                onClick={onSelectAnother}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-sky-300 border-2 border-slate-900 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition"
                title="Select another Level"
              >
                <BookOpen className="w-6 h-6 text-slate-900" />
              </div>

              {/* Center: Tool Switcher Pill (Toggle between ✕ Cross and ■ Fill) */}
              <div className="flex items-center bg-white rounded-full p-1 border-2 border-slate-900 shadow-md">
                {/* Cross Tool */}
                <button
                  onClick={() => {
                    setActiveTool(2);
                    sound.playClick();
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black transition ${
                    activeTool === 2
                      ? 'bg-slate-800 text-white shadow-inner'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  ✕
                </button>

                {/* Fill Tool (Square) */}
                <button
                  onClick={() => {
                    setActiveTool(1);
                    sound.playClick();
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                    activeTool === 1
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <div className="w-4.5 h-4.5 bg-current rounded-sm shadow-sm" />
                </button>
              </div>

              {/* Right: Hint Lightbulb (Ad) */}
              <div
                onClick={() => {
                  // Hint: solve next 1 step
                  sound.playClick();
                  if (solutionRef.current) {
                    for (let r = 0; r < puzzle.rows; r++) {
                      for (let c = 0; c < puzzle.cols; c++) {
                        if (grid[r][c] !== solutionRef.current[r][c]) {
                          const n = grid.map(row => [...row]);
                          n[r][c] = solutionRef.current[r][c];
                          setGrid(n);
                          if (solutionRef.current[r][c] === 1) sound.playFill();
                          else sound.playCross();
                          return;
                        }
                      }
                    }
                  }
                }}
                className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-300 border-2 border-slate-900 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition"
                title="Free Hint (Reveals next cell)"
              >
                <Lightbulb className="w-6 h-6 text-amber-300 fill-amber-300 stroke-slate-900" />
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[8px] font-black px-1 rounded-full border border-slate-900">
                  Ad
                </span>
              </div>
            </div>

            {/* ===================== VICTORY MODAL (WHEN PUZZLE IS SOLVED) ===================== */}
            {isCompleted && (
              <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                <div className="w-full max-w-[320px] bg-white rounded-3xl p-5 border-4 border-slate-900 shadow-2xl flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-3xl shadow-md mb-2">
                    {puzzle.artEmoji || '🏆'}
                  </div>

                  <h3 className="text-xl font-black text-slate-900 leading-tight">
                    Level {puzzle.level || 124} Solved!
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 mb-3 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Auto-Solver completed with 0 mistakes
                  </p>

                  {/* Pixel Art Name */}
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 w-full mb-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Pixel Art Revealed
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {puzzle.artName || 'Shield & Sword Crest'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={resetBoard}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition"
                    >
                      Replay Auto-Solve
                    </button>
                    <button
                      onClick={onSelectAnother}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs shadow-md border-2 border-slate-900 transition"
                    >
                      Choose Next Level →
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Helpful bottom helper instructions & Real Phone Setup CTA */}
      <div className="mt-3 flex flex-col items-center gap-2 max-w-md text-center">
        <button
          onClick={onOpenAndroidGuide}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md active:scale-95 transition"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>📱 Real Phone Par Kaise Chalayein? (Auto-Clicker & Floating Mode)</span>
        </button>

        <p className="text-xs text-slate-500 font-medium">
          💡 <strong className="text-slate-700">Notification Shade Trick:</strong> Tap or drag the top status bar downwards to open the simulated Android notification drawer, or tap the green <strong className="text-emerald-600">AUTO SOLVE</strong> floating button!
        </p>
      </div>
    </div>
  );
};
