import React, { useState, useRef, useEffect } from 'react';
import { extractTextFromPPTX, extractTextFromDOCX, ExtractedSlideData } from '../utils/slideParser';
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  GraduationCap,
  FileCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  Zap,
  StopCircle
} from 'lucide-react';
import { StudyKit } from '../types';
import { TARGET_COURSES } from '../App';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKitGenerated: (kit: StudyKit) => void;
  targetCgpa: number;
  setTargetCgpa: (val: number) => void;
  currentCgpa: number;
  setCurrentCgpa: (val: number) => void;
  initialCourse?: { code: string; name: string } | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onKitGenerated,
  targetCgpa,
  setTargetCgpa,
  currentCgpa,
  setCurrentCgpa,
  initialCourse,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [slideContent, setSlideContent] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
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
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('Cancelled by user');
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLoadingStep('');
  };

  // Sync initialCourse if provided
  useEffect(() => {
    if (initialCourse) {
      setCourseCode(initialCourse.code);
      setSlideTitle(`${initialCourse.name} - Lecture Deck`);
    }
  }, [initialCourse, isOpen]);

  if (!isOpen) return null;

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
        'PowerPoint .ppt format is an older binary file. Please open it in PowerPoint or Google Slides and Save As .pptx or .pdf, or copy and paste the slide text directly.'
      );
      return;
    }

    // PPTX extraction via JSZip
    if (fileNameLower.endsWith('.pptx')) {
      setIsExtractingFile(true);
      try {
        const extracted: ExtractedSlideData = await extractTextFromPPTX(file);
        setSlideContent(extracted.text);
        setExtractedInfo({
          slideCount: extracted.slideCount,
          wordCount: extracted.wordCount,
          hasNotes: extracted.hasNotes,
          format: 'PPTX Presentation',
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

    // Text / markdown reading
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

    // PDF or Image
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
        format: mime === 'application/pdf' ? 'PDF Presentation Document' : 'Slide Image',
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
    if (!slideContent.trim() && !selectedFile) {
      setErrorMessage('Please upload presentation slides (PDF/PPTX/Image) or paste your lecture notes.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setElapsedSeconds(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strict 115-second client-side timeout to guarantee completion under 2 minutes
    const timeoutId = setTimeout(() => {
      controller.abort('timeout');
    }, 115000);

    const steps = [
      'Scanning slide contents & extracting learning objectives...',
      'Synthesizing dense topic summary & formulas...',
      'Formulating 15 to 25 core flashcards...',
      'Composing 40-question practice assessment (MCQs, Recall, Application)...',
      'Verifying detailed answer key with slide citations...',
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

      if (selectedFile && selectedFile.base64) {
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
        throw new Error(data.error || 'Failed to process slides. Please verify your file or notes.');
      }

      clearInterval(stepInterval);
      clearInterval(timerInterval);
      onKitGenerated(data.kit);
      onClose();
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearInterval(stepInterval);
      clearInterval(timerInterval);

      if (err.name === 'AbortError' || err === 'timeout' || err.message?.includes('timeout')) {
        setErrorMessage(
          'Analysis reached the 2-minute limit. To speed up analysis to under 30 seconds, you can copy & paste the key slide text directly or select a single lecture deck.'
        );
      } else {
        setErrorMessage(err.message || 'An error occurred while generating your study kit.');
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Upload Slides / Notes</h2>
              <p className="text-xs text-slate-400">
                Generate high-yield summary, 15-25 flashcards & 40 practice questions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Select for 6 University Courses */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Pick Course Deck:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TARGET_COURSES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCourseCode(c.code);
                    setSlideTitle(`${c.name} - Lecture Deck`);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-left border text-xs font-medium transition-all ${
                    courseCode === c.code
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono text-[10px] text-amber-300 mr-1.5 font-bold">[{c.code}]</span>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CGPA & Academic Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Course Code
              </label>
              <input
                type="text"
                placeholder="e.g. MKT 310"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Target CGPA</span>
                <span className="text-[10px] text-amber-300">Goal</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.0"
                max="4.0"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(parseFloat(e.target.value) || 4.0)}
                disabled={isLoading}
                className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-mono font-semibold"
              />
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('file')}
              className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'file'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Presentation File (PPTX / PDF / DOCX)
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Slide Notes / Text
            </button>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Topic / Slide Deck Title (e.g. Chapter 6: Market Segmentation)"
                value={slideTitle}
                onChange={(e) => setSlideTitle(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

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
                className={`border-2 border-dashed p-7 rounded-2xl text-center cursor-pointer transition-all group ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                    : 'border-slate-700 hover:border-indigo-500/80 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  {isExtractingFile ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <h4 className="font-semibold text-sm text-slate-200 mb-1">
                  {isExtractingFile ? 'Parsing slides from file...' : isDragging ? 'Drop your lecture slides here' : 'Click to select slides or drop presentation file here'}
                </h4>
                <p className="text-xs text-slate-400 mb-2">
                  Supports PowerPoint (<span className="text-indigo-300 font-mono">.pptx</span>), PDF (<span className="text-indigo-300 font-mono">.pdf</span>), Word (<span className="text-indigo-300 font-mono">.docx</span>), or images (up to 25MB)
                </p>
                <span className="text-[11px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  Strictly grounded slide analysis
                </span>
              </div>

              {selectedFile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-indigo-500/40">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white flex items-center gap-2">
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

                  {showExtractedPreview && slideContent && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span>Extracted Slide Text ({slideContent.length} chars)</span>
                        <span className="text-emerald-400">Successfully Parsed</span>
                      </div>
                      <textarea
                        rows={5}
                        value={slideContent}
                        onChange={(e) => setSlideContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Paste Notes */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Topic / Slide Deck Title (e.g. Module 3: Consumer Behavior)"
                value={slideTitle}
                onChange={(e) => setSlideTitle(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="relative">
                <textarea
                  rows={8}
                  placeholder={`Paste your presentation slides, lecture notes, transcripts, or handouts here...

Example:
Slide 1: Topic Overview & Learning Objectives
- Core concepts and definitions
- Key formulas or mechanisms
- Practical applications and case studies...`}
                  value={slideContent}
                  onChange={(e) => setSlideContent(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                  <span>{slideContent.length} characters</span>
                  <span>Direct analysis grounded strictly in your notes</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message with Recovery */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Processing Failed</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1 pl-6">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Generation
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

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Rely strictly on provided slides without external hallucinations.</span>
            <span className="sm:hidden">Strict slide adherence.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleGenerate}
              disabled={isLoading || (!slideContent.trim() && !selectedFile)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Slides ({elapsedSeconds}s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Complete Study Kit</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
