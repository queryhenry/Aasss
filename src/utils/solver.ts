import { CellState, SolveResult, SolveStep } from '../types/nonogram';

/**
 * Solves a single line (row or column) of nonogram constraints.
 * Returns an array of CellState where:
 * 0 = unknown
 * 1 = definitively filled
 * 2 = definitively crossed
 * null = contradiction / invalid state
 */
export function solveLine(clues: number[], currentLine: CellState[]): CellState[] | null {
  const length = currentLine.length;
  // Clean up clues: filter out 0s
  const validClues = clues.filter(c => c > 0);
  const numClues = validClues.length;

  if (numClues === 0) {
    // If no clues, every cell must be empty/crossed
    for (let i = 0; i < length; i++) {
      if (currentLine[i] === 1) return null; // Conflict: cell is marked filled
    }
    return Array(length).fill(2);
  }

  const validPlacements: number[][] = [];

  // Recursive generator for all valid configurations matching clues and currentLine
  function generatePlacements(clueIdx: number, startPos: number, lineSoFar: number[]) {
    // Prune if we have too many placements (safety limit)
    if (validPlacements.length > 5000) return;

    if (clueIdx === numClues) {
      // Check remaining cells can be empty
      for (let i = startPos; i < length; i++) {
        if (currentLine[i] === 1) return; // cell must be filled, conflict
      }
      const full = [...lineSoFar];
      while (full.length < length) full.push(2);
      validPlacements.push(full);
      return;
    }

    const blockLen = validClues[clueIdx];
    // Minimum remaining space needed for subsequent blocks
    let minRemain = 0;
    for (let i = clueIdx + 1; i < numClues; i++) {
      minRemain += validClues[i] + 1;
    }

    const maxStart = length - minRemain - blockLen;
    for (let pos = startPos; pos <= maxStart; pos++) {
      // Check if we can place empty cells before pos
      let ok = true;
      for (let p = startPos; p < pos; p++) {
        if (currentLine[p] === 1) {
          ok = false;
          break;
        }
      }
      if (!ok) break; // if currentLine[startPos] is 1, pos cannot advance further

      // Check if block can fit at pos
      for (let p = pos; p < pos + blockLen; p++) {
        if (currentLine[p] === 2) {
          ok = false;
          break;
        }
      }
      // Check if cell immediately after block is not 1 (must be empty/gap)
      if (ok && pos + blockLen < length && currentLine[pos + blockLen] === 1) {
        ok = false;
      }

      if (ok) {
        const nextLine = [...lineSoFar];
        while (nextLine.length < pos) nextLine.push(2);
        for (let p = 0; p < blockLen; p++) nextLine.push(1);
        if (pos + blockLen < length) nextLine.push(2);

        generatePlacements(clueIdx + 1, pos + blockLen + 1, nextLine);
      }
    }
  }

  generatePlacements(0, 0, []);

  if (validPlacements.length === 0) return null; // Contradiction!

  const result: CellState[] = Array(length).fill(0);
  for (let c = 0; c < length; c++) {
    const allFilled = validPlacements.every(p => p[c] === 1);
    const allEmpty = validPlacements.every(p => p[c] === 2);
    if (allFilled) result[c] = 1;
    else if (allEmpty) result[c] = 2;
    else result[c] = 0; // uncertain
  }

  return result;
}

/**
 * Solves the full 2D nonogram grid using line deduction iterations.
 * Also records step-by-step logical traces for the auto-solver playback.
 */
export function solveNonogram(
  rowClues: number[][],
  colClues: number[][],
  initialGrid?: CellState[][]
): SolveResult {
  const startTime = performance.now();
  const numRows = rowClues.length;
  const numCols = colClues.length;

  // Initialize working grid
  const grid: CellState[][] = Array.from({ length: numRows }, (_, r) =>
    Array.from({ length: numCols }, (_, c) => (initialGrid ? initialGrid[r][c] : 0))
  );

  const steps: SolveStep[] = [];
  let changed = true;
  let iterations = 0;
  let stepCounter = 1;

  while (changed && iterations < 100) {
    changed = false;
    iterations++;

    // 1. Solve Rows
    for (let r = 0; r < numRows; r++) {
      const line = grid[r];
      const solved = solveLine(rowClues[r], line);
      if (!solved) {
        return {
          success: false,
          isComplete: false,
          iterations,
          grid,
          steps,
          timeMs: Math.round(performance.now() - startTime),
          reason: `Contradiction detected at Row ${r + 1}`,
        };
      }

      const filledNow: [number, number][] = [];
      const crossedNow: [number, number][] = [];

      for (let c = 0; c < numCols; c++) {
        if (line[c] === 0 && solved[c] !== 0) {
          grid[r][c] = solved[c];
          changed = true;
          if (solved[c] === 1) filledNow.push([r, c]);
          else if (solved[c] === 2) crossedNow.push([r, c]);
        }
      }

      if (filledNow.length > 0) {
        steps.push({
          stepNumber: stepCounter++,
          lineType: 'row',
          lineIndex: r,
          action: 'fill',
          coordinates: filledNow,
          reason: `Row ${r + 1} clues [${rowClues[r].join(', ')}]: placed ${filledNow.length} filled squares`,
        });
      }
      if (crossedNow.length > 0) {
        steps.push({
          stepNumber: stepCounter++,
          lineType: 'row',
          lineIndex: r,
          action: 'cross',
          coordinates: crossedNow,
          reason: `Row ${r + 1} clues [${rowClues[r].join(', ')}]: placed ${crossedNow.length} crosses (✕)`,
        });
      }
    }

    // 2. Solve Columns
    for (let c = 0; c < numCols; c++) {
      const line = grid.map(row => row[c]);
      const solved = solveLine(colClues[c], line);
      if (!solved) {
        return {
          success: false,
          isComplete: false,
          iterations,
          grid,
          steps,
          timeMs: Math.round(performance.now() - startTime),
          reason: `Contradiction detected at Column ${c + 1}`,
        };
      }

      const filledNow: [number, number][] = [];
      const crossedNow: [number, number][] = [];

      for (let r = 0; r < numRows; r++) {
        if (grid[r][c] === 0 && solved[r] !== 0) {
          grid[r][c] = solved[r];
          changed = true;
          if (solved[r] === 1) filledNow.push([r, c]);
          else if (solved[r] === 2) crossedNow.push([r, c]);
        }
      }

      if (filledNow.length > 0) {
        steps.push({
          stepNumber: stepCounter++,
          lineType: 'col',
          lineIndex: c,
          action: 'fill',
          coordinates: filledNow,
          reason: `Col ${c + 1} clues [${colClues[c].join(', ')}]: placed ${filledNow.length} filled squares`,
        });
      }
      if (crossedNow.length > 0) {
        steps.push({
          stepNumber: stepCounter++,
          lineType: 'col',
          lineIndex: c,
          action: 'cross',
          coordinates: crossedNow,
          reason: `Col ${c + 1} clues [${colClues[c].join(', ')}]: placed ${crossedNow.length} crosses (✕)`,
        });
      }
    }
  }

  // Check if fully solved
  const isComplete = grid.every(row => row.every(cell => cell !== 0));

  // If not fully solved with pure line deduction, run a fast hypothesis search
  if (!isComplete) {
    const backtrackingResult = solveWithBacktracking(rowClues, colClues, grid);
    if (backtrackingResult) {
      // Find differences and add final steps
      const finalFills: [number, number][] = [];
      const finalCrosses: [number, number][] = [];
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (grid[r][c] === 0) {
            grid[r][c] = backtrackingResult[r][c];
            if (grid[r][c] === 1) finalFills.push([r, c]);
            else if (grid[r][c] === 2) finalCrosses.push([r, c]);
          }
        }
      }
      if (finalFills.length > 0) {
        steps.push({
          stepNumber: stepCounter++,
          lineType: 'row',
          lineIndex: 0,
          action: 'fill',
          coordinates: finalFills,
          reason: `Resolved remaining cells via logic branch: filled ${finalFills.length} squares`,
        });
      }
      if (finalCrosses.length > 0) {
        steps.push({
          stepNumber: stepCounter++,
          lineType: 'row',
          lineIndex: 0,
          action: 'cross',
          coordinates: finalCrosses,
          reason: `Resolved remaining cells via logic branch: crossed ${finalCrosses.length} squares`,
        });
      }
      return {
        success: true,
        isComplete: true,
        iterations,
        grid,
        steps,
        timeMs: Math.round(performance.now() - startTime),
      };
    }
  }

  return {
    success: true,
    isComplete,
    iterations,
    grid,
    steps,
    timeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Backtracking helper for harder nonograms requiring trial and hypothesis
 */
function solveWithBacktracking(
  rowClues: number[][],
  colClues: number[][],
  currentGrid: CellState[][]
): CellState[][] | null {
  const numRows = rowClues.length;
  const numCols = colClues.length;

  // Find first unassigned cell
  let targetR = -1;
  let targetC = -1;
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (currentGrid[r][c] === 0) {
        targetR = r;
        targetC = c;
        break;
      }
    }
    if (targetR !== -1) break;
  }

  if (targetR === -1) {
    // Check validity of complete grid
    if (isGridValid(rowClues, colClues, currentGrid)) {
      return currentGrid;
    }
    return null;
  }

  // Try 1 (Fill), then 2 (Cross)
  for (const guess of [1 as CellState, 2 as CellState]) {
    const clone = currentGrid.map(row => [...row]);
    clone[targetR][targetC] = guess;

    // Run quick line propagation
    let valid = true;
    for (let iter = 0; iter < 10; iter++) {
      let ch = false;
      for (let r = 0; r < numRows; r++) {
        const solved = solveLine(rowClues[r], clone[r]);
        if (!solved) {
          valid = false;
          break;
        }
        for (let c = 0; c < numCols; c++) {
          if (clone[r][c] === 0 && solved[c] !== 0) {
            clone[r][c] = solved[c];
            ch = true;
          }
        }
      }
      if (!valid) break;

      for (let c = 0; c < numCols; c++) {
        const line = clone.map(row => row[c]);
        const solved = solveLine(colClues[c], line);
        if (!solved) {
          valid = false;
          break;
        }
        for (let r = 0; r < numRows; r++) {
          if (clone[r][c] === 0 && solved[r] !== 0) {
            clone[r][c] = solved[r];
            ch = true;
          }
        }
      }
      if (!valid || !ch) break;
    }

    if (valid) {
      const deepRes = solveWithBacktracking(rowClues, colClues, clone);
      if (deepRes) return deepRes;
    }
  }

  return null;
}

/**
 * Checks if a fully filled grid meets all line constraints
 */
export function isGridValid(
  rowClues: number[][],
  colClues: number[][],
  grid: CellState[][]
): boolean {
  const numRows = rowClues.length;
  const numCols = colClues.length;

  // Check rows
  for (let r = 0; r < numRows; r++) {
    const runs: number[] = [];
    let cur = 0;
    for (let c = 0; c < numCols; c++) {
      if (grid[r][c] === 1) {
        cur++;
      } else {
        if (cur > 0) runs.push(cur);
        cur = 0;
      }
    }
    if (cur > 0) runs.push(cur);

    const expected = rowClues[r].filter(c => c > 0);
    if (runs.length !== expected.length) return false;
    for (let i = 0; i < runs.length; i++) {
      if (runs[i] !== expected[i]) return false;
    }
  }

  // Check cols
  for (let c = 0; c < numCols; c++) {
    const runs: number[] = [];
    let cur = 0;
    for (let r = 0; r < numRows; r++) {
      if (grid[r][c] === 1) {
        cur++;
      } else {
        if (cur > 0) runs.push(cur);
        cur = 0;
      }
    }
    if (cur > 0) runs.push(cur);

    const expected = colClues[c].filter(n => n > 0);
    if (runs.length !== expected.length) return false;
    for (let i = 0; i < runs.length; i++) {
      if (runs[i] !== expected[i]) return false;
    }
  }

  return true;
}

/**
 * Helper to check if a specific row or col clue is fully satisfied currently
 */
export function isLineSatisfied(clues: number[], line: CellState[]): boolean {
  const runs: number[] = [];
  let cur = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) {
      cur++;
    } else {
      if (cur > 0) runs.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) runs.push(cur);

  const expected = clues.filter(c => c > 0);
  if (runs.length !== expected.length) return false;
  for (let i = 0; i < runs.length; i++) {
    if (runs[i] !== expected[i]) return false;
  }
  return true;
}
