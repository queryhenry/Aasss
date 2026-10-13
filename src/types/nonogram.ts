export type CellState = 0 | 1 | 2; // 0: Empty, 1: Filled, 2: Crossed

export interface NonogramPuzzle {
  id: string;
  name: string;
  level?: number | string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  rows: number;
  cols: number;
  rowClues: number[][];
  colClues: number[][];
  initialFilled?: [number, number][];
  initialCrossed?: [number, number][];
  solution?: CellState[][];
  artName?: string;
  artEmoji?: string;
}

export interface SolveStep {
  stepNumber: number;
  lineType: 'row' | 'col';
  lineIndex: number;
  action: 'fill' | 'cross';
  coordinates: [number, number][];
  reason: string;
}

export interface SolveResult {
  success: boolean;
  isComplete: boolean;
  iterations: number;
  grid: CellState[][];
  steps: SolveStep[];
  timeMs: number;
  reason?: string;
}

export interface AutoSolveConfig {
  speed: 'normal' | 'turbo' | 'instant';
  soundEnabled: boolean;
  highlightActiveLine: boolean;
  showTapRipples: boolean;
  stopOnComplete: boolean;
}
