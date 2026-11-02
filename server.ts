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

// Helper to call Gemini with automatic fallback, guaranteed under 110s (strictly below 2 minutes)
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  // Use gemini-3.8-flash (with LOW thinking) as primary for fastest multimodal slide processing and high token throughput
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;
  const startTime = Date.now();
  const GLOBAL_DEADLINE_MS = 110000; // 110s max server budget (guaranteed under 120s / 2 mins)

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const elapsed = Date.now() - startTime;
    const remainingTime = GLOBAL_DEADLINE_MS - elapsed;
    if (remainingTime < 12000) {
      console.warn(`[Gemini] Not enough time left in 2-min budget (${remainingTime}ms remaining), halting fallbacks.`);
      break;
    }

    // First model gets up to 92s (enough to complete 40 questions + summary); fallbacks get remaining time
    const attemptTimeout = i === 0 ? Math.min(92000, remainingTime) : Math.min(30000, remainingTime);

    try {
      console.log(`[Gemini] Attempting study kit generation with model: ${model} (timeout: ${Math.round(attemptTimeout / 1000)}s)...`);
      const response = await generateWithModelTimeout(ai, model, params, attemptTimeout);

      if (response && response.text) {
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Gemini] Generation succeeded with model ${model} in ${durationSec}s!`);
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} failed after attempt:`, err.message || err);
      lastError = err;
      const errMsg = (err.message || '').toLowerCase();
      // If error or timeout, continue to next fallback model if budget permits
      if (
        errMsg.includes('timeout') ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('429') ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('overloaded')
      ) {
        console.log(`[Gemini] Retrying with next available model to meet < 2 min requirement...`);
        continue;
      } else {
        // If it's a fatal validation error, break
        break;
      }
    }
  }

  throw lastError || new Error('All model attempts failed within the 2-minute analysis window.');
}

// API Route: Generate 3-Part Study Kit
app.post('/api/studykit/generate', async (req, res) => {
  try {
    const { slideContent, slideTitle, courseCode, fileData, targetCgpa } = req.body;

    if (!slideContent && !fileData) {
      return res.status(400).json({
        error: 'Please provide slide content, lecture notes, or upload a document/slide image.',
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are an ambitious university honors student striving to boost her CGPA to 4.0 / First Class Honours.
Your task is to analyze the provided presentation slides or lecture notes and transform them into a comprehensive, high-yield study kit consisting of exactly three distinct sections:

1. SECTION 1: COMPREHENSIVE TOPIC SUMMARY
- Extract core themes, clear learning objectives, and major subtopics from the slides.
- Organize logically with Markdown headers, bullet points, and bold text for key terms.
- Highlight critical takeaways, formulas, frameworks, and exam pitfalls.
- Make the summary dense with high-yield exam information.

2. SECTION 2: FLASHCARDS (KEY TERMS & CONCEPTS)
- Generate between 15 and 20 essential flashcards focusing on critical terminology, core concepts, formulas, or key figures.
- Each flashcard must follow:
  Card [Number] | Front: [Concept, Term, or Prompt]
  Back: [Clear, precise definition or explanation based on the slides]

3. SECTION 3: EXACTLY 40 PRACTICE QUESTIONS & DETAILED ANSWER KEY
- Part A: Multiple Choice (Questions 1–20): Provide 4 clear options (A, B, C, D) per question with one correct answer.
- Part B: Fill-in-the-Blank / Short Recall (Questions 21–30): Target key terms, dates, mechanisms, or quantitative values. Include the correct answer string and acceptable keyword variations.
- Part C: Conceptual & Application (Questions 31–40): Scenario-based questions testing deeper understanding. Provide concise model answer and key grading points.
- Answer Key for All 40 Questions: Every question MUST have its correct answer and a 1–2 sentence explanation citing the rationale from the slides.

GENERAL GUIDELINES:
- SPEED & CONCISENESS (CRITICAL): Keep all explanations strictly to 1 direct sentence citing the slide rationale. Keep conceptual model answers to 2-3 direct sentences. Flashcards must have concise 1-2 sentence definitions. This ensures generation streams out rapidly within 35–50 seconds.
- Rely strictly on the information presented in the provided slides. If a concept is missing or ambiguous, do not invent external facts.
- Ensure balanced coverage across all slides.
- Maintain an encouraging, academic, and clear tone throughout.
- Return ONLY valid JSON adhering strictly to the schema. Keep explanations concise so the complete JSON fits within limits.`;

    const promptText = `Analyze the following lecture slides / presentation notes for ${courseCode || 'University Course'} (Title: ${slideTitle || 'Lecture Deck'}). Target CGPA is ${targetCgpa || '4.0'}.
Generate the complete 3-part study kit (Summary, 15-20 Flashcards, and exactly 40 Practice Questions with Answer Key). Keep all answers and explanations concise and high-yield.

SLIDE / LECTURE CONTENT:
${slideContent || 'Please extract all slide text and visual concepts directly from the attached presentation document/image.'}
`;

    const parts: any[] = [];
    if (fileData && fileData.base64 && fileData.mimeType) {
      // Only attach supported Gemini multimodal MIME types (PDF, PNG, JPEG, WEBP)
      const mime = fileData.mimeType.toLowerCase();
      if (mime === 'application/pdf' || mime.startsWith('image/')) {
        parts.push({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64,
          },
        });
      }
    }
    parts.push({ text: promptText });

    const response = await generateContentWithFallback(ai, {
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
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
              description: '15 to 20 essential flashcards',
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
            assessment: {
              type: Type.OBJECT,
              properties: {
                partA_MCQ: {
                  type: Type.ARRAY,
                  description: 'Questions 1 through 20 (Multiple Choice)',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      number: { type: Type.INTEGER },
                      type: { type: Type.STRING },
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
                  description: 'Questions 21 through 30 (Fill-in-the-Blank)',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      number: { type: Type.INTEGER },
                      type: { type: Type.STRING },
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
                      type: { type: Type.STRING },
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
            },
          },
          required: ['title', 'summary', 'flashcards', 'assessment'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini returned an empty response. Please verify slide input.');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // Clean potential markdown wrappers or extraneous prefixes
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse generated study kit JSON structure.');
      }
    }

    const kitId = 'kit-' + Date.now();
    const finalKit = {
      id: kitId,
      title: parsedResult.title || slideTitle || 'Lecture Study Kit',
      courseCode: parsedResult.courseCode || courseCode || 'Course',
      createdAt: new Date().toISOString(),
      totalQuestions: 40,
      summary: parsedResult.summary,
      flashcards: (parsedResult.flashcards || []).map((card: any, idx: number) => ({
        ...card,
        id: `fc-${idx + 1}`,
        cardNumber: card.cardNumber || idx + 1,
        mastery: 'unseen',
      })),
      assessment: {
        partA_MCQ: (parsedResult.assessment?.partA_MCQ || []).map((q: any, idx: number) => ({
          ...q,
          number: q.number || idx + 1,
          type: 'mcq',
        })),
        partB_FillBlank: (parsedResult.assessment?.partB_FillBlank || []).map((q: any, idx: number) => ({
          ...q,
          number: q.number || 21 + idx,
          type: 'fill_in_blank',
          acceptableKeywords: q.acceptableKeywords || [q.correctAnswer],
        })),
        partC_Conceptual: (parsedResult.assessment?.partC_Conceptual || []).map((q: any, idx: number) => ({
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
    return res.status(500).json({
      error: error.message || 'Failed to generate study kit from slides. Please try again.',
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
