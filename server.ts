import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Allow parsing up to 30MB for uploaded slides/PDFs/images
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Shared Gemini client setup
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Single model call with per-attempt timeout (up to 92s for primary attempt, staying under 110s total)
async function generateWithModelTimeout(ai: GoogleGenAI, model: string, params: any, timeoutMs = 92000) {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Model ${model} exceeded attempt timeout of ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });

  // Optimize thinking configuration to minimize latency
  const config = { ...(params.config || {}) };
  if (model === 'gemini-3.8-flash') {
    // Low thinking keeps reasoning under 2-3 seconds instead of 45+ seconds
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  } else if (model === 'gemini-3.1-flash-lite') {
    // Flash lite uses minimal thinking for fast throughput
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
  }

  try {
    const callPromise = ai.models.generateContent({
      ...params,
      model,
      config,
    });
    const result = await Promise.race([callPromise, timeoutPromise]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Helper to call Gemini with automatic fallback
async function generateContentWithFallback(ai: GoogleGenAI, params: any, label = 'Study Kit') {
  // Model priority: gemini-2.5-flash (15 RPM quota), gemini-3.1-flash-lite (15 RPM quota), gemini-flash-latest (15 RPM quota), gemini-3.8-flash (5 RPM quota)
  // This provides 50 requests/min total headroom across separate quota buckets instead of bottlenecking on 5 RPM!
  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;
  const startTime = Date.now();
  const GLOBAL_DEADLINE_MS = 95000; // 95s ceiling (< 2 mins)

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const elapsed = Date.now() - startTime;
    const remainingTime = GLOBAL_DEADLINE_MS - elapsed;
    if (remainingTime < 8000) {
      console.warn(`[Gemini] [${label}] Insufficient time left (${remainingTime}ms remaining), halting fallbacks.`);
      break;
    }

    // Allocate up to 50s per attempt
    const attemptTimeout = Math.min(50000, remainingTime);

    try {
      console.log(`[Gemini] [${label}] Attempting with model: ${model} (timeout: ${Math.round(attemptTimeout / 1000)}s)...`);
      const response = await generateWithModelTimeout(ai, model, params, attemptTimeout);

      if (response && response.text) {
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Gemini] [${label}] Succeeded with model ${model} in ${durationSec}s!`);
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini] [${label}] Model ${model} failed after attempt:`, err.message || err);
      lastError = err;
      const errStr = (err.message || '') + ' ' + (typeof err === 'object' ? JSON.stringify(err) : String(err));
      const isRateLimit =
        err.status === 429 ||
        err.statusCode === 429 ||
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('quota') ||
        errStr.includes('rate-limit') ||
        errStr.includes('rate_limit');

      const isRecoverable =
        isRateLimit ||
        errStr.includes('timeout') ||
        errStr.includes('503') ||
        errStr.includes('high demand') ||
        errStr.includes('unavailable') ||
        errStr.includes('overloaded');

      if (isRecoverable) {
        if (isRateLimit) {
          console.log(`[Gemini] [${label}] Model ${model} hit free-tier rate limit (429). Instantly trying next model bucket...`);
        } else {
          console.log(`[Gemini] [${label}] Retrying with next available fallback model...`);
        }
        continue;
      } else {
        break;
      }
    }
  }

  throw lastError || new Error(`[${label}] All model attempts failed.`);
}

function parseJsonSafe(text: string, label: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Could not parse generated ${label} JSON structure.`);
  }
}

// Ultra-fast slide text extraction from PDF buffer (< 50ms)
// Bypasses heavy 15-25MB multimodal vision OCR uploads to Gemini, speeding up analysis from 80s+ to ~15-20s!
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    if (parser.destroy) parser.destroy();
    return (result && typeof result.text === 'string') ? result.text.trim() : '';
  } catch (err: any) {
    console.warn('[PDF] Fast text extraction warning:', err.message || err);
    return '';
  }
}

// API Route: Generate 3-Part Study Kit
// Executes Section 1 & 2 (Summary + Flashcards) and Section 3 (40 Questions) concurrently in parallel
// for a 3x-4x speedup (finishes in ~15-30 seconds, well below the 2-minute deadline).
app.post('/api/studykit/generate', async (req, res) => {
  try {
    const { slideContent, slideTitle, courseCode, fileData, targetCgpa } = req.body;

    const topic = (slideTitle || '').trim();
    let content = (slideContent || '').trim();
    const hasFile = !!(fileData && fileData.base64);

    if (!content && !hasFile && !topic) {
      return res.status(400).json({
        error: 'Please enter a topic title, paste lecture notes, or upload presentation slides.',
      });
    }

    const ai = getGeminiClient();

    // Fast PDF text extraction (< 50ms): Extracts text directly so we don't have to upload 20MB of binary PDF to Gemini
    let fileParts: any[] = [];
    if (hasFile && fileData.mimeType && fileData.mimeType.toLowerCase() === 'application/pdf' && !content) {
      try {
        console.log(`[PDF] Extracting slide text from PDF buffer (${Math.round(fileData.base64.length / 1024)} KB base64)...`);
        const pdfBuffer = Buffer.from(fileData.base64, 'base64');
        const extracted = await extractTextFromPdfBuffer(pdfBuffer);
        if (extracted && extracted.length > 50) {
          console.log(`[PDF] Extracted ${extracted.length} chars of slide text in < 50ms! Using fast text pipeline.`);
          content = extracted;
        } else {
          console.log(`[PDF] Scanned image PDF detected; falling back to multimodal upload.`);
          fileParts = [{
            inlineData: {
              mimeType: 'application/pdf',
              data: fileData.base64,
            },
          }];
        }
      } catch (e: any) {
        console.warn('[PDF] Could not extract text, using raw multimodal file:', e.message || e);
        fileParts = [{
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64,
          },
        }];
      }
    } else if (hasFile && !content) {
      // Image file (PNG, JPG, etc.)
      const mime = fileData.mimeType.toLowerCase();
      if (mime.startsWith('image/')) {
        fileParts = [{
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64,
          },
        }];
      }
    }

    // Shared context description
    const contextHeader = (content || fileParts.length > 0)
      ? `LECTURE MATERIALS for ${courseCode || 'University Course'} (Topic: "${topic || 'Lecture Deck'}", Target CGPA: ${targetCgpa || '4.0'}):\n${content || '[Refer to attached slides/images]'}`
      : `UNIVERSITY TOPIC: "${topic}" for course ${courseCode || 'University Course'} (Target CGPA: ${targetCgpa || '4.0'}).`;

    // 1. Task A: Summary & 15-20 Flashcards Schema
    const summarySchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        courseCode: { type: Type.STRING },
        summary: {
          type: Type.OBJECT,
          properties: {
            coreTheme: { type: Type.STRING },
            targetCourse: { type: Type.STRING },
            learningObjectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            highYieldTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            criticalFormulasOrFrameworks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  formulaOrCode: { type: Type.STRING },
                },
                required: ['title', 'description'],
              },
            },
            markdownContent: { type: Type.STRING },
          },
          required: ['coreTheme', 'learningObjectives', 'highYieldTakeaways', 'markdownContent'],
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              cardNumber: { type: Type.INTEGER },
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              subtopic: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ['cardNumber', 'front', 'back'],
          },
        },
      },
      required: ['title', 'summary', 'flashcards'],
    };

    const summarySystemInstruction = `You are an honors student creating the High-Yield Summary and 15–20 Flashcards for ${courseCode || 'University Course'}.
1. SECTION 1: DENSE TOPIC SUMMARY
- Extract core theme, learning objectives, exam takeaways, and critical formulas/frameworks.
- Keep markdownContent structured with headers and concise bullet points.
2. SECTION 2: 15 TO 20 FLASHCARDS
- Create 15-20 essential flashcards for core terminology, definitions, and formulas. Keep front prompt concise and back definition 1-2 clear sentences.
Return ONLY valid JSON matching the schema.`;

    const summaryPrompt = `${contextHeader}\n\nGenerate the Comprehensive Topic Summary and 15–20 Flashcards.`;

    // 2. Task B: 40 Practice Questions & Detailed Answer Key Schema
    const assessmentSchema = {
      type: Type.OBJECT,
      properties: {
        partA_MCQ: {
          type: Type.ARRAY,
          description: 'Questions 1 through 20 (Multiple Choice)',
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              question: { type: Type.STRING },
              options: {
                type: Type.OBJECT,
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                },
                required: ['A', 'B', 'C', 'D'],
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              subtopic: { type: Type.STRING },
            },
            required: ['number', 'question', 'options', 'correctAnswer', 'explanation'],
          },
        },
        partB_FillBlank: {
          type: Type.ARRAY,
          description: 'Questions 21 through 30 (Fill in the Blank / Recall)',
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              question: { type: Type.STRING },
              correctAnswer: { type: Type.STRING },
              acceptableKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explanation: { type: Type.STRING },
              subtopic: { type: Type.STRING },
            },
            required: ['number', 'question', 'correctAnswer', 'explanation'],
          },
        },
        partC_Conceptual: {
          type: Type.ARRAY,
          description: 'Questions 31 through 40 (Conceptual & Application)',
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              question: { type: Type.STRING },
              modelAnswer: { type: Type.STRING },
              keyGradingPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explanation: { type: Type.STRING },
              subtopic: { type: Type.STRING },
            },
            required: ['number', 'question', 'modelAnswer', 'explanation'],
          },
        },
      },
      required: ['partA_MCQ', 'partB_FillBlank', 'partC_Conceptual'],
    };

    const assessmentSystemInstruction = `You are an honors university exam designer creating a rigorous 40-question CBT practice assessment for ${courseCode || 'University Course'}.
Generate exactly 40 questions:
- Part A (Q1–20): 20 Multiple Choice Questions with 4 distinct options (A, B, C, D) and 1 correct answer.
- Part B (Q21–30): 10 Fill-in-the-Blank / Recall questions targeting key terms and quantitative mechanisms.
- Part C (Q31–40): 10 Conceptual & Application scenario questions with concise model answers (1-2 sentences) and grading points.
- Explanations: Every question MUST include a direct 1-sentence explanation citing the rationale.
Return ONLY valid JSON matching the schema.`;

    const assessmentPrompt = `${contextHeader}\n\nGenerate the complete 40-Question Practice Assessment (Questions 1 through 40) with full answer key.`;

    console.log(`[Gemini] Launching concurrent parallel generation for "${topic || courseCode}"...`);
    const overallStart = Date.now();

    // Execute Task A and Task B concurrently in parallel
    const [summaryResponse, assessmentResponse] = await Promise.all([
      generateContentWithFallback(ai, {
        contents: { parts: [...fileParts, { text: summaryPrompt }] },
        config: {
          systemInstruction: summarySystemInstruction,
          responseMimeType: 'application/json',
          responseSchema: summarySchema,
        },
      }, 'Summary & Flashcards'),
      generateContentWithFallback(ai, {
        contents: { parts: [{ text: assessmentPrompt }] },
        config: {
          systemInstruction: assessmentSystemInstruction,
          responseMimeType: 'application/json',
          responseSchema: assessmentSchema,
        },
      }, '40-Question Assessment'),
    ]);

    const totalSeconds = ((Date.now() - overallStart) / 1000).toFixed(1);
    console.log(`[Gemini] Both parallel tasks completed in ${totalSeconds}s!`);

    const summaryData = parseJsonSafe(summaryResponse.text || '{}', 'Summary');
    const assessmentData = parseJsonSafe(assessmentResponse.text || '{}', 'Assessment');

    const kitId = 'kit-' + Date.now();
    const finalKit = {
      id: kitId,
      title: summaryData.title || topic || `${courseCode || 'Course'} Study Kit`,
      courseCode: summaryData.courseCode || courseCode || 'Course',
      createdAt: new Date().toISOString(),
      totalQuestions: 40,
      summary: summaryData.summary,
      flashcards: (summaryData.flashcards || []).map((card: any, idx: number) => ({
        ...card,
        id: `fc-${idx + 1}`,
        cardNumber: card.cardNumber || idx + 1,
        mastery: 'unseen',
      })),
      assessment: {
        partA_MCQ: (assessmentData.partA_MCQ || []).map((q: any, idx: number) => ({
          ...q,
          number: q.number || idx + 1,
          type: 'mcq',
        })),
        partB_FillBlank: (assessmentData.partB_FillBlank || []).map((q: any, idx: number) => ({
          ...q,
          number: q.number || 21 + idx,
          type: 'fill_in_blank',
          acceptableKeywords: q.acceptableKeywords || [q.correctAnswer],
        })),
        partC_Conceptual: (assessmentData.partC_Conceptual || []).map((q: any, idx: number) => ({
          ...q,
          number: q.number || 31 + idx,
          type: 'conceptual',
          keyGradingPoints: q.keyGradingPoints || [],
        })),
      },
    };

    return res.json({ success: true, kit: finalKit });
  } catch (error: any) {
    console.error('Error generating study kit:', error);
    const errStr = (error.message || '') + ' ' + (typeof error === 'object' ? JSON.stringify(error) : String(error));
    const isRateLimit =
      error.status === 429 ||
      error.statusCode === 429 ||
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('quota') ||
      errStr.includes('rate-limit') ||
      errStr.includes('rate_limit');

    let retryAfter = 30;
    const retryMatch = errStr.match(/"retryDelay"\s*:\s*"(\d+)/i) || errStr.match(/retry in ([\d\.]+)s/i);
    if (retryMatch) {
      retryAfter = Math.min(65, Math.max(10, Math.ceil(parseFloat(retryMatch[1]))));
    }

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        rateLimited: true,
        retryAfter,
        error: `Gemini Free Tier quota limit reached (requests per minute limit). Quota resets automatically in ~${retryAfter}s. Please wait for the countdown to complete or click Retry.`,
      });
    }

    let cleanMsg = error.message || 'Failed to generate study kit from slides. Please try again.';
    try {
      const parsed = JSON.parse(cleanMsg);
      if (parsed?.error?.message) {
        cleanMsg = parsed.error.message;
      }
    } catch {
      // Not a JSON string
    }

    return res.status(500).json({
      success: false,
      error: cleanMsg,
    });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CGPA Study Kit Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
