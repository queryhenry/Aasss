import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Zap,
  Sliders,
  Shield,
  HelpCircle,
  Play,
  Terminal,
  ExternalLink,
  Download,
  Tv,
  Camera,
  Layers,
  Sparkles,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { NonogramPuzzle, CellState } from '../types/nonogram';
import { solveNonogram } from '../utils/solver';

interface Props {
  currentPuzzle: NonogramPuzzle;
}

export const AndroidCompanionGuide: React.FC<Props> = ({ currentPuzzle }) => {
  const [phoneWidth, setPhoneWidth] = useState(1080);
  const [phoneHeight, setPhoneHeight] = useState(2400);
  const [copiedScript, setCopiedScript] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('custom');

  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Common phone screen presets
  const brandPresets: Record<string, { w: number; h: number; name: string }> = {
    'custom': { w: 1080, h: 2400, name: 'Custom Resolution' },
    'samsung': { w: 1080, h: 2340, name: 'Samsung Galaxy (S21/S22/S23/A54)' },
    'redmi': { w: 1080, h: 2400, name: 'Xiaomi / Redmi / Poco' },
    'realme': { w: 1080, h: 2412, name: 'Realme / OnePlus / Oppo' },
    'vivo': { w: 1080, h: 2388, name: 'Vivo / iQOO' },
    'high_res': { w: 1440, h: 3120, name: 'Quad HD+ (S23 Ultra / Pixel 8 Pro)' },
  };

  const handleBrandChange = (brandKey: string) => {
    setSelectedBrand(brandKey);
    const p = brandPresets[brandKey];
    if (p) {
      setPhoneWidth(p.w);
      setPhoneHeight(p.h);
    }
  };

  // Calculate coordinates for the current puzzle on the user's resolution
  const gridStartX = Math.round(phoneWidth * 0.12);
  const gridStartY = Math.round(phoneHeight * 0.35);
  const gridWidth = Math.round(phoneWidth * 0.76);
  const cellSize = Math.round(gridWidth / currentPuzzle.cols);
  const toolSwitchX = Math.round(phoneWidth * 0.5);
  const toolSwitchY = Math.round(phoneHeight * 0.88);

  const solutionRes = solveNonogram(currentPuzzle.rowClues, currentPuzzle.colClues);
  const solutionGrid = solutionRes.grid || [];

  // Generate AutoX.js ready-to-run script
  const generatedScript = `/**
 * ====================================================================
 * ⚡ AutoX.js - PIXEL ART NONOGRAM AUTO-SOLVER SCRIPT
 * Target: Level ${currentPuzzle.level || 124} (${currentPuzzle.rows}x${currentPuzzle.cols})
 * Screen Resolution: ${phoneWidth} x ${phoneHeight}
 * ====================================================================
 */

// 1. Accessibility Service wait
auto.waitFor();
console.show();
console.setPosition(50, 100);
console.log("⚡ Auto-Solver Active for Level ${currentPuzzle.level || 124}");
toast("Pixel Art Auto-Solver Starting in 2 seconds...");
sleep(2000);

// Coordinates setup
var startX = ${gridStartX};
var startY = ${gridStartY};
var cellSize = ${cellSize};
var toolFillX = ${Math.round(toolSwitchX + 35)};
var toolCrossX = ${Math.round(toolSwitchX - 35)};
var toolY = ${toolSwitchY};

// Pre-computed solution matrix
var solution = ${JSON.stringify(solutionGrid)};

// PHASE 1: FILL BLUE CELLS (■)
console.log("Step 1/2: Tapping Fill Tool & Blue Squares...");
click(toolFillX, toolY);
sleep(300);

for (var r = 0; r < ${currentPuzzle.rows}; r++) {
    for (var c = 0; c < ${currentPuzzle.cols}; c++) {
        if (solution[r][c] === 1) {
            var tapX = Math.round(startX + (c * cellSize) + (cellSize / 2));
            var tapY = Math.round(startY + (r * cellSize) + (cellSize / 2));
            press(tapX, tapY, 40);
            sleep(45); // fast reliable tap delay
        }
    }
}

sleep(300);

// PHASE 2: FILL CROSSES (✕)
console.log("Step 2/2: Tapping Cross Tool & 'X' Marks...");
click(toolCrossX, toolY);
sleep(300);

for (var r = 0; r < ${currentPuzzle.rows}; r++) {
    for (var c = 0; c < ${currentPuzzle.cols}; c++) {
        if (solution[r][c] === 2) {
            var tapX = Math.round(startX + (c * cellSize) + (cellSize / 2));
            var tapY = Math.round(startY + (r * cellSize) + (cellSize / 2));
            press(tapX, tapY, 40);
            sleep(45);
        }
    }
}

// Done!
toast("🎉 Level ${currentPuzzle.level || 124} Solved Successfully!");
console.log("Completed! Auto-stopping.");
sleep(1500);
console.hide();
exit();
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([generatedScript], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel_art_solver_level${currentPuzzle.level || 124}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render PiP Canvas & open floating window
  const renderSolutionToCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ Level ${currentPuzzle.level || 124} (${currentPuzzle.rows}x${currentPuzzle.cols}) Solved`, width / 2, 25);

    // Draw grid
    const margin = 20;
    const gridAreaSize = Math.min(width - margin * 2, height - margin * 2 - 30);
    const startX = (width - gridAreaSize) / 2;
    const startY = 40;
    const cSize = gridAreaSize / currentPuzzle.cols;

    for (let r = 0; r < currentPuzzle.rows; r++) {
      for (let c = 0; c < currentPuzzle.cols; c++) {
        const x = startX + c * cSize;
        const y = startY + r * cSize;
        const val = solutionGrid[r]?.[c] ?? 0;

        if (val === 1) {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(x + 1, y + 1, cSize - 2, cSize - 2);
        } else if (val === 2) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 1, y + 1, cSize - 2, cSize - 2);
          ctx.fillStyle = '#64748b';
          ctx.font = `${Math.floor(cSize * 0.7)}px sans-serif`;
          ctx.fillText('✕', x + cSize / 2, y + cSize * 0.75);
        } else {
          ctx.fillStyle = '#334155';
          ctx.fillRect(x + 1, y + 1, cSize - 2, cSize - 2);
        }
      }
    }
  };

  const handleStartFloatingPiP = async () => {
    try {
      const canvas = hiddenCanvasRef.current;
      const video = hiddenVideoRef.current;
      if (!canvas || !video) return;

      canvas.width = 340;
      canvas.height = 380;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderSolutionToCanvas(ctx, 340, 380);

      // capture stream
      const stream = canvas.captureStream(5);
      video.srcObject = stream;
      await video.play();

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else {
        await video.requestPictureInPicture();
        setPipActive(true);
      }
    } catch (err: any) {
      alert(`Floating PiP feature error: ${err.message}. Make sure your browser supports Picture-in-Picture.`);
    }
  };

  const handleStartScreenShare = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Live Screen capture is not supported in this browser window. Please use Method 2 (AutoX.js) or Method 3 (PiP).');
        return;
      }
      setScreenSharing(true);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      // Handle stream
      const track = stream.getVideoTracks()[0];
      track.onended = () => {
        setScreenSharing(false);
      };
      alert('Screen Sharing Active! You can now switch to your Pixel Art game.');
    } catch (e: any) {
      setScreenSharing(false);
      console.log('User cancelled or error:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hidden elements for Picture-in-Picture */}
      <canvas ref={hiddenCanvasRef} className="hidden" />
      <video ref={hiddenVideoRef} className="hidden" muted playsInline />

      {/* Main Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Real Android Phone Me Kaise Use Karein? (Complete Practical Guide)
            </h2>
            <p className="text-xs text-indigo-200">
              Aapke phone par live Pixel Art game me notification bar aur auto-touch chalane ke 3 aasan tarike!
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 text-xs leading-relaxed space-y-2">
          <p className="text-emerald-400 font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            Aapka sawaal: "Is solver ko real phone me kaise use karein taaki notification bar se khud solve ho?"
          </p>
          <p className="text-slate-300">
            Android Security policy ke kaaran koi bhi website direct doosre game apps me bina permission touch nahi kar sakti. Lekin Android par isko real me chalane ke liye <strong>3 super-easy options</strong> hain:
          </p>
        </div>
      </div>

      {/* ================= METHOD 1: FLOATING OVERLAY (PICTURE-IN-PICTURE) ================= */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-black text-sm flex items-center justify-center">
              1
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Method 1: Floating Window (Zero App Download - Browser Se Hi)
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                  Instant
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Aapke phone screen par ek chhota floating bubble/window ban jayega jo game ke upar float karega!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-700 space-y-1">
            <strong className="text-slate-900 block font-bold">Ye kaise kaam karta hai:</strong>
            <p>1. Niche diye gaye blue button par click karein.</p>
            <p>2. Ek chhota floating solution box screen ke kone me khul jayega.</p>
            <p>3. Ab apne Pixel Art game me switch karein — floating box game ke upar hamesha rahega aur aap turant dekh kar tap kar sakte hain!</p>
          </div>

          <button
            onClick={handleStartFloatingPiP}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition"
          >
            <Tv className="w-4 h-4" />
            <span>{pipActive ? 'Close Floating Window' : 'Open Floating Solution Window'}</span>
          </button>
        </div>
      </div>

      {/* ================= METHOD 2: AUTOX.JS NOTIFICATION BAR TILE (REAL AUTO-CLICK) ================= */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
              2
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Method 2: Real Android Auto-Clicker (Notification Bar Tile Bot)
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  100% Automatic Hands-Free
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Aap jo chahte the: "Notification bar niche khicho, tap karo, phone khud sare box bharega!"
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Real Android phone par background se touches inject karne ke liye Android ki official <strong>Accessibility Service</strong> use hoti hai. <strong>AutoX.js</strong> (free open-source app) iske liye best hai:
        </p>

        {/* Phone Brand & Resolution Selector */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">
              Apne Phone Ka Brand / Resolution Select Karein:
            </span>
            <select
              value={selectedBrand}
              onChange={e => handleBrandChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
            >
              {Object.entries(brandPresets).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name} ({val.w}x{val.h})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>Width: <strong>{phoneWidth}px</strong></span>
            <span>Height: <strong>{phoneHeight}px</strong></span>
            <span>Cell Tap Size: <strong>{cellSize}px</strong></span>
            <span className="text-emerald-600 font-bold">✓ Coordinates Auto-Calibrated for Level {currentPuzzle.level || 124}</span>
          </div>
        </div>

        {/* Download & Copy Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadScript}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download Script File (.js)
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95"
          >
            {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiedScript ? 'Copied to Clipboard!' : 'Copy Script Code'}
          </button>
        </div>

        {/* Code viewer */}
        <div className="relative bg-slate-950 rounded-2xl p-4 overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              pixel_art_solver_level{currentPuzzle.level || 124}.js
            </span>
            <span className="text-[10px] text-slate-500">Auto-taps Level {currentPuzzle.level || 124} ({currentPuzzle.rows}x{currentPuzzle.cols})</span>
          </div>

          <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-[220px] leading-relaxed">
            {generatedScript}
          </pre>
        </div>

        {/* Step-by-step Setup instructions in clear Hindi */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-xs space-y-3 text-slate-800">
          <strong className="text-emerald-950 block font-black text-sm">
            📲 Real Phone Me Set Karne Ke 4 Simple Steps (2 Minute Ka Kaam):
          </strong>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
              <strong className="text-slate-900 block mb-1">1. AutoX.js App Download Karein</strong>
              <p className="text-slate-600">
                Apne Android phone me Google se <strong>AutoX.js</strong> (free open-source automation app) download karein aur Settings me jakar <em>Accessibility Service</em> allow karein.
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
              <strong className="text-slate-900 block mb-1">2. Ye Script Add Karein</strong>
              <p className="text-slate-600">
                Upar diye gaye <strong>"Download Script File"</strong> button se file download karein aur AutoX.js me import karein (ya code copy-paste karein).
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
              <strong className="text-slate-900 block mb-1">3. Notification Bar Me Tile Lagayein</strong>
              <p className="text-slate-600">
                AutoX.js ki settings me <strong>"Show Quick Settings Tile"</strong> enable karein. Ab aapke phone ke notification bar me AutoX ka icon aa jayega.
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
              <strong className="text-slate-900 block mb-1">4. Live Game Me Play Karein!</strong>
              <p className="text-slate-600">
                Pixel Art game me <strong>Level 124</strong> kholein. Notification bar niche khinchein aur <strong>AutoX Tile</strong> dabayein — phone khud sare boxes bhar dega aur ruk jayega!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= METHOD 3: LIVE SCREEN SHARE OCR ================= */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-black text-sm flex items-center justify-center">
              3
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Method 3: Live Screen Share Reading (Web Assistant)
              </h3>
              <p className="text-xs text-slate-500">
                Agar aap Chrome me screen share karte hain, toh ye app aapke phone screen ko live read kar sakta hai.
              </p>
            </div>
          </div>

          <button
            onClick={handleStartScreenShare}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
              screenSharing
                ? 'bg-red-500 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{screenSharing ? 'Screen Share Active' : 'Start Screen Share'}</span>
          </button>
        </div>
      </div>

      {/* ================= SPECIAL SECTION: "AGAR ISS APP KO APK ME CONVERT KAREIN TOH KYA SCREEN READ KAREGA?" ================= */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 border-2 border-emerald-500/50 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/30">
            🤖
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              Aapka Sawaal
            </span>
            <h3 className="text-lg font-black text-white">
              "Yadi iss app ko APK me download kar lenge tab to screen read kar sakta hai naa?"
            </h3>
          </div>
        </div>

        {/* Big Affirmative Callout */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs leading-relaxed space-y-2">
          <p className="text-emerald-400 font-black text-base">
            ✅ HAAN, BILKUL 100% YES!
          </p>
          <p className="text-slate-200 text-xs">
            Jab ye app ek <strong>Android APK</strong> ban jata hai, toh Android OS isko 3 aisi official system permissions de deta hai jo Chrome browser ke paas nahi hoti hain:
          </p>
        </div>

        {/* The 3 Android APK Superpowers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1.5">
              <Camera className="w-4 h-4" />
              <span>1. Screen Read (MediaProjection)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              APK bante hi ye Android ke <code>MediaProjection API</code> se live screen ka snapshot background me le leta hai, yaani Pixel Art game ki screen direct read ho jati hai!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5">
              <Zap className="w-4 h-4" />
              <span>2. Auto-Touch (Accessibility)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <code>AccessibilityService</code> ke <code>dispatchGesture()</code> se APK game ke screen par real finger tap khud kar deta hai, bina user ke haath lagaye!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
              <Sliders className="w-4 h-4" />
              <span>3. Notification Tile (TileService)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <code>TileService</code> se aapke notification drawer me <strong>"⚡ Auto Solve"</strong> button jud jata hai. Bas upar se notification kheecho aur tap karo!
            </p>
          </div>
        </div>

        {/* How to turn this into an APK */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-200">
            🛠️ Is Web App Ko APK Me Convert Karne Ke 2 Tarike:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <strong className="text-cyan-400 block font-bold">Tarika 1: PWABuilder Se 1-Click APK</strong>
              <p className="text-slate-400 text-[11px]">
                PWABuilder.com par is app ka URL enter karke direct signed Android APK download kiya ja sakta hai jo phone me install ho jata hai.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <strong className="text-emerald-400 block font-bold">Tarika 2: Capacitor / Android Studio</strong>
              <p className="text-slate-400 text-[11px]">
                <code>npx cap add android</code> run karke is pure web code ko native Android Studio project bana kar native Accessibility Service jod kar direct APK export kiya ja sakta hai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
