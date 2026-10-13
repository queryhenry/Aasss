import React, { useState } from 'react';
import {
  Zap,
  Smartphone,
  Scan,
  Wand2,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  HelpCircle,
  Play
} from 'lucide-react';
import { NonogramPuzzle } from './types/nonogram';
import { PRESET_PUZZLES } from './utils/presets';
import { LiveGameSimulator } from './components/LiveGameSimulator';
import { ScreenshotScanner } from './components/ScreenshotScanner';
import { AndroidCompanionGuide } from './components/AndroidCompanionGuide';
import { CustomPuzzleEditor } from './components/CustomPuzzleEditor';
import { sound } from './utils/sound';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'scanner' | 'guide' | 'editor'>('simulator');
  const [currentPuzzle, setCurrentPuzzle] = useState<NonogramPuzzle>(PRESET_PUZZLES[0]); // Level 124
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  const handleSelectPuzzle = (p: NonogramPuzzle) => {
    setCurrentPuzzle(p);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
                Pixel Art Nonogram Auto-Solver
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                  v2.5 AI
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Auto-detect 10x10, 10x15, 15x15 & Solve Pixel Art Logic Puzzles
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                activeTab === 'simulator'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Live Simulator</span>
              <span className="md:hidden">Game</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                activeTab === 'scanner'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Scan Screenshot</span>
              <span className="md:hidden">Scan</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                activeTab === 'guide'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Android Guide</span>
              <span className="md:hidden">Guide</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                activeTab === 'editor'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Custom Grid</span>
              <span className="md:hidden">Create</span>
            </button>
          </nav>

          {/* Quick Level Selector & Sound Toggle */}
          <div className="flex items-center gap-2">
            <select
              value={currentPuzzle.id}
              onChange={e => {
                const found = PRESET_PUZZLES.find(p => p.id === e.target.value);
                if (found) handleSelectPuzzle(found);
              }}
              className="hidden lg:block bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-cyan-500"
            >
              {PRESET_PUZZLES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4">
        {activeTab === 'simulator' && (
          <LiveGameSimulator
            puzzle={currentPuzzle}
            onSelectAnother={() => setActiveTab('scanner')}
            onOpenScreenshotScanner={() => setActiveTab('scanner')}
            onOpenAndroidGuide={() => setActiveTab('guide')}
          />
        )}

        {activeTab === 'scanner' && (
          <ScreenshotScanner onLoadPuzzle={handleSelectPuzzle} />
        )}

        {activeTab === 'guide' && (
          <AndroidCompanionGuide currentPuzzle={currentPuzzle} />
        )}

        {activeTab === 'editor' && (
          <CustomPuzzleEditor onLoadIntoSimulator={handleSelectPuzzle} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-3 text-center text-xs text-slate-500">
        Pixel Art Nonogram Logic Auto-Solver • Constraint Satisfaction Engine • Supports 10x10, 10x15, 15x15, 20x20
      </footer>
    </div>
  );
}
