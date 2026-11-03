import React, { useState, useEffect, useRef } from 'react';
import { StudyKit } from './types';
import { Header } from './components/Header';
import { SummaryView } from './components/SummaryView';
import { FlashcardsView } from './components/FlashcardsView';
import { AssessmentView } from './components/AssessmentView';
import { UploadModal } from './components/UploadModal';
import { CgpaTrackerModal } from './components/CgpaTrackerModal';
import { extractTextFromPPTX, extractTextFromDOCX, ExtractedSlideData } from './utils/slideParser';
import { 
  FileText, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  GraduationCap, 
  TrendingUp, 
  Upload, 
  Award,
  FileCheck,
  Loader2,
  AlertCircle,
  PlusCircle,
  Trash2,
  Megaphone,
  Coins,
  Calculator,
  Lightbulb,
  Layers,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowRight,
  Clock,
  Zap,
  StopCircle
} from 'lucide-react';

// The 6 University Course Decks requested by the student
export interface TargetCourse {
  id: string;
  code: string;
  name: string;
  color: string;
  badgeColor: string;
  icon: 'Megaphone' | 'Coins' | 'TrendingUp' | 'Calculator' | 'Lightbulb' | 'Layers';
  description: string;
}

export const TARGET_COURSES: TargetCourse[] = [
  {
    id: 'b2c-marketing',
    code: 'MKT 310',
    name: 'B2C Marketing',
    color: 'from-pink-500/20 via-pink-600/10 to-transparent border-pink-500/30 text-pink-400',
    badgeColor: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
    icon: 'Megaphone',
    description: 'Consumer behavior, STP strategy, brand equity, buyer decision journeys & promotion mix.',
  },
  {
    id: 'corporate-finance',
    code: 'FIN 320',
    name: 'Corporate Finance',
    color: 'from-emerald-500/20 via-emerald-600/10 to-transparent border-emerald-500/30 text-emerald-400',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    icon: 'Coins',
    description: 'Capital budgeting, WACC, DCF valuation, capital structure & risk-return trade-offs.',
  },
  {
    id: 'macro-economics',
    code: 'ECON 202',
    name: 'Macro Economics',
    color: 'from-blue-500/20 via-blue-600/10 to-transparent border-blue-500/30 text-blue-400',
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    icon: 'TrendingUp',
    description: 'IS-LM equilibrium, monetary & fiscal policy, inflation, unemployment & GDP models.',
  },
  {
    id: 'business-math',
    code: 'MTH 215',
    name: 'Business Mathematics',
    color: 'from-amber-500/20 via-amber-600/10 to-transparent border-amber-500/30 text-amber-400',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    icon: 'Calculator',
    description: 'Linear programming, optimization, matrix algebra, annuity equations & marginal calculus.',
  },
  {
    id: 'entrepreneurship-innovation',
    code: 'ENT 340',
    name: 'Entrepreneurship & Innovation',
    color: 'from-purple-500/20 via-purple-600/10 to-transparent border-purple-500/30 text-purple-400',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    icon: 'Lightbulb',
    description: 'Business model canvas, lean startup, MVP iteration, venture pitch & disruptive innovation.',
  },
  {
    id: 'erp-systems',
    code: 'ERP 410',
    name: 'Enterprise Resource Planning',
    color: 'from-cyan-500/20 via-cyan-600/10 to-transparent border-cyan-500/30 text-cyan-400',
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    icon: 'Layers',
    description: 'SAP/ERP architecture, supply chain integration, master data, procurement & ERP rollouts.',
  },
];

export default function App() {
  // Store user-generated kits in localStorage (zero preloaded exemplar packs)
  const [savedKits, setSavedKits] = useState<StudyKit[]>(() => {
    try {
      const stored = localStorage.getItem('cgpa_booster_user_kits');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [currentKitId, setCurrentKitId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('cgpa_booster_user_kits');
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'assessment'>('summary');

  // Academic CGPA tracking
  const [currentCgpa, setCurrentCgpa] = useState<number>(3.30);
  const [targetCgpa, setTargetCgpa] = useState<number>(3.95);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCgpaModalOpen, setIsCgpaModalOpen] = useState(false);
  const [modalPreselectedCourse, setModalPreselectedCourse] = useState<{ code: string; name: string } | null>(null);

  // CBT Exam Mode timer
  const [examModeActive, setExamModeActive] = useState(false);
  const [examTimeRemaining, setExamTimeRemaining] = useState(45 * 60);

  // Inline upload form states
  const [selectedCourseSlot, setSelectedCourseSlot] = useState<string>('b2c-marketing');
  const [courseCode, setCourseCode] = useState('MKT 310');
  const [slideTitle, setSlideTitle] = useState('Module 1: Consumer Decision Journey & Segmentation');
  const [slideContent, setSlideContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    base64: string;
  } | null>(null);

  const [extractedInfo, setExtractedInfo] = useState<{
    slideCount?: number;
    wordCount?: number;
    hasNotes?: boolean;
    format: string;
  } | null>(null);
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('Cancelled by user');
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLoadingStep('');
  };

  // Sync savedKits to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cgpa_booster_user_kits', JSON.stringify(savedKits));
    } catch (e) {
      console.error('Could not save kits to local storage', e);
    }
  }, [savedKits]);

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitTimer <= 0) {
      if (isRateLimited) {
        setIsRateLimited(false);
      }
      return;
    }
    const timer = setInterval(() => {
      setRateLimitTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitTimer, isRateLimited]);

  // Handle course slot change
  const handleSelectCourse = (course: TargetCourse) => {
    setSelectedCourseSlot(course.id);
    setCourseCode(course.code);
    // Find if user already has a kit for this course
    const existingKit = savedKits.find(
      (k) => k.courseCode?.toLowerCase().includes(course.code.toLowerCase()) || 
             k.title.toLowerCase().includes(course.name.toLowerCase())
    );
    if (existingKit) {
      setCurrentKitId(existingKit.id);
    } else {
      setCurrentKitId(null);
      setSlideTitle(`${course.name} - Core Lecture Topics`);
    }
  };

  const currentKit = savedKits.find((k) => k.id === currentKitId) || null;

  const handleKitGenerated = (newKit: StudyKit) => {
    setSavedKits((prev) => [newKit, ...prev.filter((k) => k.id !== newKit.id)]);
    setCurrentKitId(newKit.id);
    setActiveTab('summary');
    setExamModeActive(false);
    // Reset file selection
    setSelectedFile(null);
    setExtractedInfo(null);
  };

  const handleDeleteKit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = savedKits.filter((k) => k.id !== id);
    setSavedKits(remaining);
    if (currentKitId === id) {
      setCurrentKitId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size must be under 25MB.');
      return;
    }

    setErrorMessage(null);
    setSlideTitle(file.name.replace(/\.[^/.]+$/, ''));
    const fileNameLower = file.name.toLowerCase();

    // Check for legacy .ppt
    if (fileNameLower.endsWith('.ppt') && !fileNameLower.endsWith('.pptx')) {
      setErrorMessage(
        'PowerPoint .ppt format is an older binary file. Please open it in PowerPoint or Google Slides and Save As .pptx or .pdf, or copy and paste the slide text below.'
      );
      return;
    }

    // PPTX Presentation extraction
    if (fileNameLower.endsWith('.pptx')) {
      setIsExtractingFile(true);
      try {
        const extracted: ExtractedSlideData = await extractTextFromPPTX(file);
        setSlideContent(extracted.text);
        setExtractedInfo({
          slideCount: extracted.slideCount,
          wordCount: extracted.wordCount,
          hasNotes: extracted.hasNotes,
          format: 'PPTX Slides',
        });
        setSelectedFile({
          name: file.name,
          size: file.size,
          mimeType: 'text/plain',
          base64: '',
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not parse PPTX. Please paste slide notes or upload as PDF.');
      } finally {
        setIsExtractingFile(false);
      }
      return;
    }

    // DOCX Word Document extraction
    if (fileNameLower.endsWith('.docx')) {
      setIsExtractingFile(true);
      try {
        const extractedText = await extractTextFromDOCX(file);
        setSlideContent(extractedText);
        setExtractedInfo({
          wordCount: extractedText.split(/\s+/).filter(Boolean).length,
          format: 'DOCX Document',
        });
        setSelectedFile({
          name: file.name,
          size: file.size,
          mimeType: 'text/plain',
          base64: '',
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not parse DOCX. Please paste lecture notes directly.');
      } finally {
        setIsExtractingFile(false);
      }
      return;
    }

    // Text / Markdown files
    if (file.type === 'text/plain' || fileNameLower.endsWith('.md') || fileNameLower.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setSlideContent(text);
        setExtractedInfo({
          wordCount: text.split(/\s+/).filter(Boolean).length,
          format: 'Plain Text Notes',
        });
        setSelectedFile({
          name: file.name,
          size: file.size,
          mimeType: 'text/plain',
          base64: '',
        });
      };
      reader.readAsText(file);
      return;
    }

    // PDF or Image files
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      const mime = file.type || (fileNameLower.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      setSelectedFile({
        name: file.name,
        size: file.size,
        mimeType: mime,
        base64,
      });
      setExtractedInfo({
        format: mime === 'application/pdf' ? 'PDF Slides Document' : 'Slide Image',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handleGenerate = async () => {
    const hasTopic = !!slideTitle.trim();
    const hasContent = !!slideContent.trim();
    const hasFile = !!selectedFile;

    if (!hasTopic && !hasContent && !hasFile) {
      setErrorMessage('Please enter a presentation topic title, upload slides, or paste lecture notes.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setElapsedSeconds(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strict 115-second timeout to guarantee processing strictly under 2 minutes
    const timeoutId = setTimeout(() => {
      controller.abort('timeout');
    }, 115000);

    const steps = hasContent || hasFile ? [
      'Scanning slide contents & learning objectives...',
      'Synthesizing dense topic summary & formula cheat sheets...',
      'Formulating 15 to 25 core concept flashcards...',
      'Composing 40-question practice assessment (MCQs, Recall, Application)...',
      'Verifying detailed answer key with slide citations...',
    ] : [
      `Analyzing university topic: "${slideTitle}"...`,
      'Extracting core curriculum themes & high-yield takeaways...',
      'Synthesizing formulas, frameworks & 15-20 flashcards...',
      'Composing 40 practice exam questions (MCQ, Recall, Scenario)...',
      'Finalizing answer key & citations...',
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setLoadingStep(steps[stepIndex]);
    }, 4000);

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    try {
      const payload: any = {
        slideContent: slideContent.trim(),
        slideTitle: slideTitle || 'Lecture Deck',
        courseCode: courseCode || 'Course',
        targetCgpa: targetCgpa.toString(),
      };

      if (selectedFile && selectedFile.base64 && !slideContent.trim()) {
        payload.fileData = {
          mimeType: selectedFile.mimeType,
          base64: selectedFile.base64,
        };
      }

      const res = await fetch('/api/studykit/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (res.status === 404) {
          throw new Error(
            'Backend API route (/api/studykit/generate) was not found (HTTP 404). If you deployed to GitHub Pages, note that GitHub Pages only hosts static files and does not run Node.js servers. To use the AI generation engine, deploy your GitHub repo to a full-stack host (like Render, Railway, Fly.io, or Cloud Run) using "npm start", or run locally with "npm run dev".'
          );
        }
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 150)}`);
      }

      if (!res.ok || !data.success) {
        const rawErrStr = (data.error || '') + ' ' + (typeof data === 'object' ? JSON.stringify(data) : '');
        const isQuota =
          data.rateLimited ||
          res.status === 429 ||
          rawErrStr.includes('429') ||
          rawErrStr.includes('RESOURCE_EXHAUSTED') ||
          rawErrStr.includes('quota') ||
          rawErrStr.includes('rate-limit');

        if (isQuota) {
          setIsRateLimited(true);
          const delay = data.retryAfter || 30;
          setRateLimitTimer(delay);
          let friendlyMsg = data.error || `Gemini Free Tier quota limit reached. Quota resets in ~${delay}s.`;
          try {
            const parsed = JSON.parse(friendlyMsg);
            if (parsed?.error?.message) friendlyMsg = parsed.error.message;
          } catch {}
          setErrorMessage(friendlyMsg);
          setTimeout(() => {
            errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          return;
        }

        let errMsg = data.error || 'Failed to process slides. Please verify your file or paste slide text.';
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch {}
        throw new Error(errMsg);
      }

      clearInterval(stepInterval);
      clearInterval(timerInterval);
      setErrorMessage(null);
      setIsRateLimited(false);
      handleKitGenerated(data.kit);
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearInterval(stepInterval);
      clearInterval(timerInterval);

      const errStr = (err.message || '') + ' ' + String(err);
      const isQuota =
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('quota') ||
        errStr.includes('rate-limit') ||
        errStr.includes('rate_limit');

      if (isQuota) {
        setIsRateLimited(true);
        if (rateLimitTimer === 0) setRateLimitTimer(30);
        let msg = 'Gemini Free Tier quota reached (requests per minute limit). Please wait for the countdown to complete or click Retry.';
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {}
        setErrorMessage(msg);
      } else if (err.name === 'AbortError' || err === 'timeout' || err.message?.includes('timeout')) {
        setErrorMessage(
          'Analysis reached the 2-minute limit. To speed up analysis to under 30 seconds, you can copy & paste the key slide text directly or select a single lecture deck.'
        );
      } else {
        let msg = err.message || 'An error occurred while generating your study kit. Please try again or paste text directly.';
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {}
        setErrorMessage(msg);
      }

      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const renderCourseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className="w-4 h-4" />;
      case 'Coins':
        return <Coins className="w-4 h-4" />;
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4" />;
      case 'Calculator':
        return <Calculator className="w-4 h-4" />;
      case 'Lightbulb':
        return <Lightbulb className="w-4 h-4" />;
      case 'Layers':
        return <Layers className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        currentKit={currentKit}
        onOpenUpload={() => {
          setModalPreselectedCourse(null);
          setIsUploadOpen(true);
        }}
        onOpenCgpaCalculator={() => setIsCgpaModalOpen(true)}
        targetCgpa={targetCgpa}
        currentCgpa={currentCgpa}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        examModeActive={examModeActive}
        examTimeRemaining={examTimeRemaining}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">

        {/* Prominent Global Error / Rate Limit Alert Box */}
        {errorMessage && (
          <div
            ref={errorRef}
            className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl animate-fadeIn ${
              isRateLimited
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-amber-950/30'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-rose-950/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isRateLimited
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isRateLimited ? (
                    <Clock className="w-5 h-5 animate-pulse text-amber-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isRateLimited
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isRateLimited ? 'Quota Limit (Free Tier)' : 'Processing Alert'}
                    </span>
                    {isRateLimited && rateLimitTimer > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        Quota resets in {rateLimitTimer}s
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-white">
                    {errorMessage}
                  </p>

                  {isRateLimited && (
                    <p className="text-[11px] text-amber-300/80">
                      Gemini Free Tier has a requests-per-minute quota limit. We automatically try fallback models, and the quota resets completely every 60 seconds.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    isRateLimited
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isRateLimited && rateLimitTimer > 0 ? `Retry (${rateLimitTimer}s)` : 'Retry Generation'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setIsRateLimited(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar for Rate Limit */}
            {isRateLimited && rateLimitTimer > 0 && (
              <div className="mt-3 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-amber-500/20">
                <div
                  className="h-full bg-amber-400 transition-all duration-1000 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, (rateLimitTimer / 30) * 100))}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* 6 Core University Course Decks Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  6 Target University Course Decks
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  CGPA Goal: {targetCgpa.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload your slides for each course to generate a high-yield summary, flashcards, and 40 practice questions.
              </p>
            </div>

            <button
              onClick={() => {
                setModalPreselectedCourse(null);
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Upload Custom Slide Deck</span>
            </button>
          </div>

          {/* Grid of 6 Course Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {TARGET_COURSES.map((course) => {
              // Check if user has an uploaded kit for this course
              const matchedKit = savedKits.find(
                (k) =>
                  k.courseCode?.toLowerCase().includes(course.code.toLowerCase()) ||
                  k.title.toLowerCase().includes(course.name.toLowerCase())
              );
              const isSelected = currentKit && (currentKit.id === matchedKit?.id);
              const isSlotActive = selectedCourseSlot === course.id;

              return (
                <div
                  key={course.id}
                  onClick={() => {
                    handleSelectCourse(course);
                    if (!matchedKit) {
                      // Switch inline upload to this course
                      setModalPreselectedCourse({ code: course.code, name: course.name });
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-900/40 border-indigo-500 shadow-md shadow-indigo-600/20'
                      : matchedKit
                      ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      : isSlotActive
                      ? 'bg-slate-950/80 border-amber-500/50'
                      : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${course.badgeColor}`}>
                        {course.code}
                      </span>
                      <div className="text-slate-400 group-hover:text-white transition-colors">
                        {renderCourseIcon(course.icon)}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {course.name}
                    </h4>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    {matchedKit ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Deck Ready
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-medium flex items-center gap-0.5">
                        <Upload className="w-2.5 h-2.5" />
                        Upload
                      </span>
                    )}
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* If user has uploaded kits, show the active kit view */}
        {currentKit ? (
          <div className="space-y-6">
            
            {/* Active Study Kit Header Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Study Strategy Active
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      {currentKit.courseCode || 'Course'}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {currentKit.title}
                  </h2>
                </div>
              </div>

              {/* Quick Tab Switcher Pills */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Summary</span>
                </button>

                <button
                  onClick={() => setActiveTab('flashcards')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'flashcards'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Flashcards ({currentKit.flashcards.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('assessment')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'assessment'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>3. 40-Q Test</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentKitId(null);
                    setSlideContent('');
                    setSelectedFile(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/40 font-semibold transition-all flex items-center gap-1.5 cursor-pointer ml-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">+ Analyze New Topic</span>
                  <span className="sm:hidden">+ New</span>
                </button>

                <button
                  onClick={(e) => handleDeleteKit(currentKit.id, e)}
                  title="Delete this study kit"
                  className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* SECTION 1: TOPIC SUMMARY */}
            {activeTab === 'summary' && (
              <SummaryView
                summary={currentKit.summary}
                courseTitle={currentKit.title}
              />
            )}

            {/* SECTION 2: FLASHCARDS */}
            {activeTab === 'flashcards' && (
              <FlashcardsView flashcards={currentKit.flashcards} />
            )}

            {/* SECTION 3: 40 PRACTICE QUESTIONS & ANSWER KEY */}
            {activeTab === 'assessment' && (
              <AssessmentView
                kit={currentKit}
                targetCgpa={targetCgpa}
                currentCgpa={currentCgpa}
                examModeActive={examModeActive}
                setExamModeActive={setExamModeActive}
                examTimeRemaining={examTimeRemaining}
                setExamTimeRemaining={setExamTimeRemaining}
              />
            )}

          </div>
        ) : (
          /* Pure Upload Workspace (zero preloaded packs) */
          <div className="max-w-3xl mx-auto space-y-8 py-4 sm:py-6">
            
            {/* Hero Header */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 p-[2px] mx-auto shadow-xl shadow-indigo-600/20">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-amber-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Targeting 4.0 / First Class Honours
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Upload Lecture Slides to Generate Study Kit
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Upload PowerPoint slides (.pptx), PDF lecture slides, Word notes (.docx), or paste lecture transcripts. The engine builds a high-yield summary, 15–25 interactive flashcards, and a 40-question practice assessment with complete answer key.
                </p>
              </div>
            </div>

            {/* Upload Workspace Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              
              {/* Course Selector Quick Tabs */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Target Course Deck
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TARGET_COURSES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourseSlot(c.id);
                        setCourseCode(c.code);
                        setSlideTitle(`${c.name} - Lecture Deck 1`);
                      }}
                      className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        selectedCourseSlot === c.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-amber-300">{c.code}</span>
                        {renderCourseIcon(c.icon)}
                      </div>
                      <p className="mt-1 font-bold text-slate-200 line-clamp-1">{c.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Code & CGPA Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Course Code / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MKT 310"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Current CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.0"
                    max="4.0"
                    value={currentCgpa}
                    onChange={(e) => setCurrentCgpa(parseFloat(e.target.value) || 0)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Target CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.0"
                    max="4.0"
                    value={targetCgpa}
                    onChange={(e) => setTargetCgpa(parseFloat(e.target.value) || 4.0)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Presentation Topic Title */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Presentation / Slide Topic Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Module 3: Consumer Behavior & Market Segmentation"
                  value={slideTitle}
                  onChange={(e) => setSlideTitle(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Drag & Drop File Zone with real drag-over detection */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pptx,.docx,.pdf,.ppt,.txt,.md,image/png,image/jpeg,image/webp"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all group ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                    : 'border-slate-700 hover:border-indigo-500/80 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  {isExtractingFile ? (
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-200 mb-1">
                  {isExtractingFile ? 'Parsing slides from file...' : isDragging ? 'Drop your lecture file here' : 'Click to select slides or drag & drop lecture file'}
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  Supports PowerPoint slides (<span className="text-indigo-300 font-mono">.pptx</span>), PDF slides (<span className="text-indigo-300 font-mono">.pdf</span>), Word notes (<span className="text-indigo-300 font-mono">.docx</span>), or slide screenshots (<span className="text-indigo-300 font-mono">.png/.jpg</span>) up to 25MB
                </p>
                <span className="text-[11px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  Instant text extraction & slide structure parsing
                </span>
              </div>

              {/* File Ready Card with Extracted Feedback */}
              {selectedFile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-indigo-500/40">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{selectedFile.name}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-normal">
                            Ready
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {extractedInfo?.format || 'Document'}
                          {extractedInfo?.slideCount ? ` • Extracted ${extractedInfo.slideCount} slides` : ''}
                          {extractedInfo?.wordCount ? ` • ${extractedInfo.wordCount.toLocaleString()} words` : ''}
                          {extractedInfo?.hasNotes ? ' • With Speaker Notes' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {slideContent && (
                        <button
                          type="button"
                          onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          {showExtractedPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">{showExtractedPreview ? 'Hide Text' : 'View Text'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setExtractedInfo(null);
                          setSlideContent('');
                        }}
                        className="text-xs text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Extracted Text Preview Drawer */}
                  {showExtractedPreview && slideContent && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span>Extracted Slide Text ({slideContent.length} chars)</span>
                        <span className="text-emerald-400">Successfully Parsed</span>
                      </div>
                      <textarea
                        rows={6}
                        value={slideContent}
                        onChange={(e) => setSlideContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Paste Slide Text Option (Collapsible or visible) */}
              {!selectedFile && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Or Paste Slide Notes / Lecture Transcripts:</span>
                    <span>{slideContent.length} characters</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder={`Paste slide text, bullet points, or lecture transcripts here...

Example:
Slide 1: Porter's Five Forces in B2C Markets
- Threat of new entrants & barriers to entry
- Bargaining power of buyers (price sensitivity)
- Bargaining power of suppliers & substitutes`}
                    value={slideContent}
                    onChange={(e) => setSlideContent(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>
              )}

              {/* Error Callout or Rate Limit Box with Recovery Buttons */}
              {errorMessage && (
                <div
                  className={`p-4 rounded-xl space-y-2.5 text-xs border transition-all ${
                    isRateLimited
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {isRateLimited ? (
                      <Clock className="w-4 h-4 shrink-0 text-amber-400 animate-pulse mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${isRateLimited ? 'text-amber-200' : 'text-rose-200'}`}>
                          {isRateLimited ? 'Free Tier Rate Limit (Quota Exceeded)' : 'Processing Failed'}
                        </p>
                        {isRateLimited && rateLimitTimer > 0 && (
                          <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Resets in {rateLimitTimer}s
                          </span>
                        )}
                      </div>
                      <p>{errorMessage}</p>
                      {isRateLimited && (
                        <p className="text-[11px] text-amber-300/80">
                          Free tier models limit requests to 15 per minute. This quota resets automatically in under a minute.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for rate limit */}
                  {isRateLimited && rateLimitTimer > 0 && (
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-amber-500/20">
                      <div
                        className="h-full bg-amber-400 transition-all duration-1000 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, (rateLimitTimer / 30) * 100))}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        isRateLimited
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200'
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{isRateLimited && rateLimitTimer > 0 ? `Retry (${rateLimitTimer}s)` : 'Retry Generation'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setErrorMessage(null);
                        setIsRateLimited(false);
                      }}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Clear & Try Another File
                    </button>
                  </div>
                </div>
              )}

              {/* Loading status indicator with 2-minute progress bar */}
              {isLoading && (
                <div className="p-4 bg-indigo-950/60 border border-indigo-500/40 rounded-xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-indigo-200 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>{loadingStep || 'Analyzing slide contents...'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-xs bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-500/30">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-amber-300 font-bold">{elapsedSeconds}s</span>
                      <span className="text-slate-400">/ 120s max</span>
                    </div>
                  </div>

                  {/* Visual Progress Bar calibrated for < 2 mins */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.min(96, Math.max(8, Math.round((elapsedSeconds / 105) * 100)))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Zap className="w-3 h-3 text-amber-400" />
                        Ultra-Fast Pipeline (Max 2 Mins Guarantee)
                      </span>
                      <span>{Math.max(0, 120 - elapsedSeconds)}s remaining</span>
                    </div>
                  </div>

                  {/* Milestone checklist */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    <div className={`flex items-center gap-1 ${elapsedSeconds >= 3 ? 'text-emerald-300' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>1. Parse slides & objectives</span>
                    </div>
                    <div className={`flex items-center gap-1 ${elapsedSeconds >= 15 ? 'text-emerald-300' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${elapsedSeconds >= 15 ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>2. Summary & formula sheet</span>
                    </div>
                    <div className={`flex items-center gap-1 ${elapsedSeconds >= 40 ? 'text-emerald-300' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${elapsedSeconds >= 40 ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>3. 15-20 flashcards</span>
                    </div>
                    <div className={`flex items-center gap-1 ${elapsedSeconds >= 75 ? 'text-emerald-300' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${elapsedSeconds >= 75 ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>4. 40-Q exam & answers</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCancelGeneration}
                      className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <StopCircle className="w-3 h-3" />
                      Cancel Analysis
                    </button>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || (!slideContent.trim() && !selectedFile && !slideTitle.trim())}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing &ldquo;{slideTitle || 'Topic'}&rdquo; ({elapsedSeconds}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {slideContent.trim() || selectedFile
                        ? `Analyze Slides & Generate Study Kit`
                        : `Analyze Topic: "${slideTitle || 'Course Deck Topic'}"`}
                    </span>
                  </>
                )}
              </button>

            </div>

            {/* 3 Sections Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">1. Dense Summary</h4>
                <p className="text-[11px] text-slate-400">Core themes, learning objectives, formula cheat sheets & takeaways.</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">2. 15–25 Flashcards</h4>
                <p className="text-[11px] text-slate-400">3D flip cards, audio read aloud & spaced repetition mastery.</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">3. 40-Q Assessment</h4>
                <p className="text-[11px] text-slate-400">Part A (MCQs), Part B (Recall), Part C (Apply) + Detailed Answer Key.</p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Targeting 4.0 / First Class Honours • Slide-to-Knowledge Engine</span>
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Slide-Grounded Analysis</span>
            <span>•</span>
            <span>Zero Preloaded Packs</span>
            <span>•</span>
            <span>40 Questions & Complete Key</span>
          </div>
        </div>
      </footer>

      {/* Slide Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onKitGenerated={handleKitGenerated}
        targetCgpa={targetCgpa}
        setTargetCgpa={setTargetCgpa}
        currentCgpa={currentCgpa}
        setCurrentCgpa={setCurrentCgpa}
        initialCourse={modalPreselectedCourse}
      />

      {/* CGPA Calculator Modal */}
      <CgpaTrackerModal
        isOpen={isCgpaModalOpen}
        onClose={() => setIsCgpaModalOpen(false)}
        currentCgpa={currentCgpa}
        setCurrentCgpa={setCurrentCgpa}
        targetCgpa={targetCgpa}
        setTargetCgpa={setTargetCgpa}
      />
    </div>
  );
}
