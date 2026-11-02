import React from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  Upload, 
  Award, 
  TrendingUp, 
  FileText, 
  BookOpen, 
  CheckCircle2,
  Clock,
  Printer
} from 'lucide-react';
import { StudyKit } from '../types';

interface HeaderProps {
  currentKit: StudyKit | null;
  onOpenUpload: () => void;
  onOpenCgpaCalculator: () => void;
  targetCgpa: number;
  currentCgpa: number;
  activeTab: 'summary' | 'flashcards' | 'assessment';
  setActiveTab: (tab: 'summary' | 'flashcards' | 'assessment') => void;
  examModeActive: boolean;
  examTimeRemaining: number; // seconds
}

export const Header: React.FC<HeaderProps> = ({
  currentKit,
  onOpenUpload,
  onOpenCgpaCalculator,
  targetCgpa,
  currentCgpa,
  activeTab,
  setActiveTab,
  examModeActive,
  examTimeRemaining,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo & Student Persona Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-amber-300 via-white to-indigo-200 bg-clip-text text-transparent">
                  CGPA Booster
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Target: {targetCgpa.toFixed(2)} CGPA
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {currentKit ? (
                  <span className="text-slate-300 font-medium">
                    {currentKit.courseCode ? `[${currentKit.courseCode}] ` : ''}
                    {currentKit.title}
                  </span>
                ) : (
                  'Turn lecture slides into First-Class study kits'
                )}
              </p>
            </div>
          </div>

          {/* Center Tabs Navigation */}
          {currentKit && (
            <div className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-inner">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'summary'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                1. Topic Summary
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'flashcards'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                2. Flashcards
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 text-amber-300 border border-amber-500/30">
                  {currentKit.flashcards.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('assessment')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'assessment'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                3. 40-Q Practice Test
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 text-emerald-300 border border-emerald-500/30">
                  40
                </span>
              </button>
            </div>
          )}

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Exam Mode Timer if active */}
            {examModeActive && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>{formatTime(examTimeRemaining)}</span>
              </div>
            )}

            {/* CGPA Goal Pill */}
            <button
              onClick={onOpenCgpaCalculator}
              title="Track CGPA trajectory and grade goals"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700/80 text-xs font-medium transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {currentCgpa.toFixed(2)} &rarr; {targetCgpa.toFixed(2)}
              </span>
            </button>

            {/* Print Study Kit Button */}
            {currentKit && (
              <button
                onClick={() => window.print()}
                title="Print or Save PDF Cheat Sheet"
                className="hidden md:flex items-center gap-1.5 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-300" />
              </button>
            )}

            {/* Upload Slides / Notes CTA */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Slides</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        {currentKit && (
          <div className="flex lg:hidden items-center justify-between pb-3 pt-1 border-t border-slate-800/60 overflow-x-auto gap-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 bg-slate-900/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'flashcards'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 bg-slate-900/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Flashcards ({currentKit.flashcards.length})
            </button>
            <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'assessment'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 bg-slate-900/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              40-Q Test
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
