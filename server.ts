import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint to analyze Nonogram screenshots
app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please use presets or manual input.',
      });
    }

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `Analyze this mobile screenshot of a Nonogram / Picross / Pixel Art puzzle game.
Extract the exact puzzle board details:
1. "level": level number if visible (e.g. 124)
2. "difficulty": e.g. "Hard", "Medium", "Easy"
3. "rows": number of rows in the playing grid (e.g. 10, 15)
4. "cols": number of columns in the playing grid (e.g. 10, 15)
5. "rowClues": array of arrays of numbers for each row from top (row 0) to bottom (row N-1). Important: multi-digit numbers like 11, 12, 13, 14, 15 must be parsed as a single number (e.g. [11] or [13], NOT [1, 1] or [1, 3] when digits are part of the same number).
6. "colClues": array of arrays of numbers for each column from left (col 0) to right (col M-1).
7. "currentlyFilled": array of [row, col] coordinates of cells that are currently filled in (blue/colored squares).
8. "currentlyCrossed": array of [row, col] coordinates of cells with 'X' marks.

Be extremely precise with the number clues on the top and left sides of the grid.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            rows: { type: Type.INTEGER },
            cols: { type: Type.INTEGER },
            rowClues: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
            colClues: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
            currentlyFilled: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
            currentlyCrossed: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
          },
          required: ['rows', 'cols', 'rowClues', 'colClues'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error analyzing screenshot:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze screenshot with Gemini Vision',
    });
  }
});

// Setup Vite in Dev or Static files in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
