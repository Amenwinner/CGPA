import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  StudyKit, 
  MCQQuestion, 
  FillInBlankQuestion, 
  ConceptualQuestion, 
  UserAssessmentState 
} from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  AlertCircle, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  Check, 
  Play, 
  RotateCcw, 
  Eye, 
  ChevronRight, 
  Flag, 
  Printer, 
  Layers,
  GraduationCap
} from 'lucide-react';

interface AssessmentViewProps {
  kit: StudyKit;
  targetCgpa: number;
  currentCgpa: number;
  examModeActive: boolean;
  setExamModeActive: (val: boolean) => void;
  examTimeRemaining: number;
  setExamTimeRemaining: React.Dispatch<React.SetStateAction<number>>;
}

export const AssessmentView: React.FC<AssessmentViewProps> = ({
  kit,
  targetCgpa,
  currentCgpa,
  examModeActive,
  setExamModeActive,
  examTimeRemaining,
  setExamTimeRemaining,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'partA' | 'partB' | 'partC' | 'answerKey'>('all');
  
  // Assessment state
  const [userState, setUserState] = useState<UserAssessmentState>({
    answers: {},
    conceptualSelfScores: {},
    flaggedQuestions: [],
    isSubmitted: false,
    scorePartA: 0,
    scorePartB: 0,
    scorePartC: 0,
    totalScore: 0,
    timeSpentSeconds: 0,
  });

  // Track revealed answers in practice mode
  const [revealedPartB, setRevealedPartB] = useState<Record<number, boolean>>({});
  const [revealedPartC, setRevealedPartC] = useState<Record<number, boolean>>({});

  const { partA_MCQ, partB_FillBlank, partC_Conceptual } = kit.assessment;

  // Timer interval when exam mode is active
  useEffect(() => {
    if (!examModeActive || userState.isSubmitted) return;

    const timer = setInterval(() => {
      setExamTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
      setUserState((prev) => ({
        ...prev,
        timeSpentSeconds: prev.timeSpentSeconds + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [examModeActive, userState.isSubmitted]);

  const handleStartExam = () => {
    setUserState({
      answers: {},
      conceptualSelfScores: {},
      flaggedQuestions: [],
      isSubmitted: false,
      scorePartA: 0,
      scorePartB: 0,
      scorePartC: 0,
      totalScore: 0,
      timeSpentSeconds: 0,
    });
    setExamTimeRemaining(45 * 60); // 45 minutes for 40 questions
    setExamModeActive(true);
    setRevealedPartB({});
    setRevealedPartC({});
  };

  const handleSelectMCQ = (questionNumber: number, option: 'A' | 'B' | 'C' | 'D') => {
    if (userState.isSubmitted) return;
    setUserState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionNumber]: option,
      },
    }));
  };

  const handleFillBlankChange = (questionNumber: number, text: string) => {
    if (userState.isSubmitted) return;
    setUserState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionNumber]: text,
      },
    }));
  };

  const handleConceptualAnswerChange = (questionNumber: number, text: string) => {
    if (userState.isSubmitted) return;
    setUserState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionNumber]: text,
      },
    }));
  };

  const handleScoreConceptual = (questionNumber: number, rating: 'full' | 'partial' | 'review') => {
    setUserState((prev) => {
      const nextScores = {
        ...prev.conceptualSelfScores,
        [questionNumber]: rating,
      };

      // Recalculate scorePartC
      let scoreC = 0;
      Object.values(nextScores).forEach((r) => {
        if (r === 'full') scoreC += 1;
        if (r === 'partial') scoreC += 0.5;
      });

      return {
        ...prev,
        conceptualSelfScores: nextScores,
        scorePartC: scoreC,
        totalScore: prev.scorePartA + prev.scorePartB + scoreC,
      };
    });
  };

  const toggleFlagQuestion = (num: number) => {
    setUserState((prev) => ({
      ...prev,
      flaggedQuestions: prev.flaggedQuestions.includes(num)
        ? prev.flaggedQuestions.filter((q) => q !== num)
        : [...prev.flaggedQuestions, num],
    }));
  };

  const checkFillBlankCorrect = (q: FillInBlankQuestion, userAns?: string) => {
    if (!userAns) return false;
    const cleanUser = userAns.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
    const cleanCorrect = q.correctAnswer.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
    if (cleanUser === cleanCorrect) return true;

    return (q.acceptableKeywords || []).some((keyword) => {
      const cleanKey = keyword.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
      return cleanUser.includes(cleanKey) || cleanKey.includes(cleanUser);
    });
  };

  const handleSubmitExam = () => {
    // Grade Part A (MCQ 1-20)
    let scoreA = 0;
    partA_MCQ.forEach((q) => {
      if (userState.answers[q.number] === q.correctAnswer) {
        scoreA += 1;
      }
    });

    // Grade Part B (Fill 21-30)
    let scoreB = 0;
    partB_FillBlank.forEach((q) => {
      if (checkFillBlankCorrect(q, userState.answers[q.number])) {
        scoreB += 1;
      }
    });

    // Part C is self-scored or default 0
    let scoreC = 0;
    Object.values(userState.conceptualSelfScores).forEach((r) => {
      if (r === 'full') scoreC += 1;
      if (r === 'partial') scoreC += 0.5;
    });

    const total = scoreA + scoreB + scoreC;

    setUserState((prev) => ({
      ...prev,
      isSubmitted: true,
      scorePartA: scoreA,
      scorePartB: scoreB,
      scorePartC: scoreC,
      totalScore: total,
      completedAt: new Date().toISOString(),
    }));

    setExamModeActive(false);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  // Grade determination
  const percentScore = Math.round((userState.totalScore / 40) * 100);
  let letterGrade = 'A+';
  let gradeColor = 'text-emerald-400';
  let projectedGpa = targetCgpa;

  if (percentScore >= 90) {
    letterGrade = 'A+ (4.0)';
    gradeColor = 'text-emerald-400';
    projectedGpa = Math.min(4.0, currentCgpa + 0.35);
  } else if (percentScore >= 80) {
    letterGrade = 'A (3.75)';
    gradeColor = 'text-emerald-400';
    projectedGpa = Math.min(4.0, currentCgpa + 0.25);
  } else if (percentScore >= 70) {
    letterGrade = 'B+ (3.3)';
    gradeColor = 'text-amber-400';
    projectedGpa = currentCgpa + 0.1;
  } else {
    letterGrade = 'Review Needed';
    gradeColor = 'text-rose-400';
    projectedGpa = currentCgpa;
  }

  const totalAnsweredCount = Object.keys(userState.answers).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Top Section Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Section 3 • 40 Practice Questions & Detailed Answer Key
              </span>
              <span className="text-xs text-slate-400 font-mono">
                [Q1 – Q40]
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Comprehensive Course Assessment Simulator
            </h2>
          </div>

          {/* Mode Switcher / Timer Action */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!examModeActive && !userState.isSubmitted ? (
              <button
                onClick={handleStartExam}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Start Timed CBT Exam (45m)</span>
              </button>
            ) : examModeActive ? (
              <button
                onClick={handleSubmitExam}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Submit Assessment Now</span>
              </button>
            ) : (
              <button
                onClick={handleStartExam}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Retake Assessment</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('answerKey')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                activeSubTab === 'answerKey'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Answer Key (Q1–40)</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs: All 40, Part A (1-20), Part B (21-30), Part C (31-40), Answer Key */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-4 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSubTab === 'all'
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All 40 Questions
          </button>
          <button
            onClick={() => setActiveSubTab('partA')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSubTab === 'partA'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Part A: MCQs (Q1–20)
          </button>
          <button
            onClick={() => setActiveSubTab('partB')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSubTab === 'partB'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Part B: Fill-in-Blank (Q21–30)
          </button>
          <button
            onClick={() => setActiveSubTab('partC')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSubTab === 'partC'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Part C: Conceptual (Q31–40)
          </button>
          <button
            onClick={() => setActiveSubTab('answerKey')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ml-auto ${
              activeSubTab === 'answerKey'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            Complete Answer Key
          </button>
        </div>
      </div>

      {/* Exam Result Scorecard Banner if Submitted */}
      {userState.isSubmitted && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Assessment Completed • CGPA Impact Verified
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Exam Score: {userState.totalScore.toFixed(1)} / 40 ({percentScore}%)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Grade Projection: <span className={`font-bold ${gradeColor}`}>{letterGrade}</span>
                {' • '}
                Projected Course Grade on track to boost CGPA to{' '}
                <span className="text-amber-300 font-bold font-mono">
                  {projectedGpa.toFixed(2)}
                </span>
              </p>
            </div>

            {/* Score Pill Breakdown */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Part A (MCQ)</p>
                <p className="text-base font-bold font-mono text-indigo-300">
                  {userState.scorePartA} / 20
                </p>
              </div>
              <div className="border-x border-slate-800 px-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Part B (Recall)</p>
                <p className="text-base font-bold font-mono text-amber-300">
                  {userState.scorePartB} / 10
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Part C (Apply)</p>
                <p className="text-base font-bold font-mono text-teal-300">
                  {userState.scorePartC.toFixed(1)} / 10
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CBT Question Navigator Palette (Numbered 1-40) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Question Palette (1–40):</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Answered ({totalAnsweredCount})
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Flagged ({userState.flaggedQuestions.length})
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              Pending ({40 - totalAnsweredCount})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5 pt-1">
          {Array.from({ length: 40 }).map((_, i) => {
            const num = i + 1;
            const isAnswered = !!userState.answers[num];
            const isFlagged = userState.flaggedQuestions.includes(num);

            return (
              <a
                key={num}
                href={`#question-${num}`}
                className={`h-7 rounded flex items-center justify-center text-xs font-mono font-bold transition-all relative ${
                  isAnswered
                    ? 'bg-emerald-600 text-white'
                    : isFlagged
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {num}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-slate-950"></span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* COMPLETE ANSWER KEY VIEW (Immediately viewable or at bottom) */}
      {activeSubTab === 'answerKey' && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Official Answer Key
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Complete Answer Key & Slide Rationale (Questions 1–40)
              </h3>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print Key</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Part A Keys 1-20 */}
            <div>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                Part A: Multiple Choice (Questions 1–20)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {partA_MCQ.map((q) => (
                  <div key={q.number} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Question {q.number}</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Answer: {q.correctAnswer}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{q.question}</p>
                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-900">
                      Rationale: {q.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Part B Keys 21-30 */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                Part B: Fill-in-the-Blank (Questions 21–30)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {partB_FillBlank.map((q) => (
                  <div key={q.number} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Question {q.number}</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {q.correctAnswer}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{q.question}</p>
                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-900">
                      Rationale: {q.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Part C Keys 31-40 */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                Part C: Conceptual & Application (Questions 31–40)
              </h4>
              <div className="space-y-3">
                {partC_Conceptual.map((q) => (
                  <div key={q.number} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Question {q.number} • {q.subtopic}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{q.question}</p>
                    <div className="p-3 bg-slate-900 rounded-lg border border-teal-500/20 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        Model Solution Based on Slides:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">{q.modelAnswer}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      Slide Rationale: {q.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PART A: MULTIPLE CHOICE (QUESTIONS 1–20) */}
      {(activeSubTab === 'all' || activeSubTab === 'partA') && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Part A • Recall & Understanding
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Questions 1–20: Multiple Choice
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">1 point each (20 pts total)</span>
          </div>

          {partA_MCQ.map((q) => {
            const userChoice = userState.answers[q.number];
            const isFlagged = userState.flaggedQuestions.includes(q.number);
            const isSubmitted = userState.isSubmitted;
            const isCorrect = userChoice === q.correctAnswer;

            return (
              <div
                id={`question-${q.number}`}
                key={q.number}
                className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-md space-y-4 transition-colors ${
                  isSubmitted
                    ? isCorrect
                      ? 'border-emerald-500/40 bg-slate-900/90'
                      : 'border-rose-500/40 bg-slate-900/90'
                    : userChoice
                    ? 'border-indigo-500/40'
                    : 'border-slate-800'
                }`}
              >
                {/* Question Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold font-mono">
                      {q.number}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                      {q.subtopic}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleFlagQuestion(q.number)}
                    title="Flag question for review"
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      isFlagged
                        ? 'text-amber-400 bg-amber-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>

                {/* Question Prompt */}
                <h4 className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  {q.question}
                </h4>

                {/* 4 Options (A, B, C, D) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const optionText = q.options[opt];
                    const isSelected = userChoice === opt;
                    const isRightOption = q.correctAnswer === opt;

                    let btnClass = 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700';

                    if (isSubmitted) {
                      if (isRightOption) {
                        btnClass = 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-bold';
                      } else if (isSelected && !isRightOption) {
                        btnClass = 'bg-rose-950/50 border-rose-500 text-rose-200';
                      } else {
                        btnClass = 'bg-slate-950/40 border-slate-900 text-slate-500';
                      }
                    } else if (isSelected) {
                      btnClass = 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold shadow-sm';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectMCQ(q.number, opt)}
                        disabled={isSubmitted}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${btnClass}`}
                      >
                        <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 font-mono font-bold text-[11px]">
                          {opt}
                        </span>
                        <span className="leading-snug">{optionText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback & Rationale after submission or in practice mode */}
                {(isSubmitted || (!examModeActive && userChoice)) && (
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                    userChoice === q.correctAnswer
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {userChoice === q.correctAnswer ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Correct! Option {q.correctAnswer}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>Incorrect. Correct answer is Option {q.correctAnswer}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">{q.explanation}</p>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* PART B: FILL-IN-THE-BLANK / SHORT RECALL (QUESTIONS 21–30) */}
      {(activeSubTab === 'all' || activeSubTab === 'partB') && (
        <div className="space-y-5 pt-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Part B • High-Yield Retrieval
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Questions 21–30: Fill-in-the-Blank & Exact Terminology
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">1 point each (10 pts total)</span>
          </div>

          {partB_FillBlank.map((q) => {
            const userText = userState.answers[q.number] || '';
            const isFlagged = userState.flaggedQuestions.includes(q.number);
            const isSubmitted = userState.isSubmitted;
            const isCorrect = checkFillBlankCorrect(q, userText);
            const isRevealed = revealedPartB[q.number] || isSubmitted;

            return (
              <div
                id={`question-${q.number}`}
                key={q.number}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
                      {q.number}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                      {q.subtopic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!examModeActive && !isSubmitted && (
                      <button
                        onClick={() =>
                          setRevealedPartB((prev) => ({
                            ...prev,
                            [q.number]: !prev[q.number],
                          }))
                        }
                        className="text-xs text-slate-400 hover:text-amber-300 underline"
                      >
                        {isRevealed ? 'Hide Answer' : 'Reveal Answer'}
                      </button>
                    )}

                    <button
                      onClick={() => toggleFlagQuestion(q.number)}
                      title="Flag question"
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        isFlagged
                          ? 'text-amber-400 bg-amber-500/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  {q.question}
                </h4>

                {/* Input box */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type the exact term, value, or mechanism here..."
                    value={userText}
                    onChange={(e) => handleFillBlankChange(q.number, e.target.value)}
                    disabled={isSubmitted}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  {userText && !isSubmitted && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedPartB((prev) => ({ ...prev, [q.number]: true }))
                      }
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                    >
                      Check
                    </button>
                  )}
                </div>

                {/* Revealed Answer & Slide Citation */}
                {isRevealed && (
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        Correct Answer: <span className="font-mono underline">{q.correctAnswer}</span>
                      </span>
                      {userText && (
                        <span className="text-[11px] font-semibold">
                          {isCorrect ? '✅ Verified Match' : '⚠️ Compare Spelling / Synonyms'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 italic">
                      Slide Rationale: {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PART C: CONCEPTUAL & APPLICATION (QUESTIONS 31–40) */}
      {(activeSubTab === 'all' || activeSubTab === 'partC') && (
        <div className="space-y-5 pt-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                Part C • Higher-Order Synthesis & Scenarios
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Questions 31–40: Conceptual & Application Problems
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">1 point each (10 pts total)</span>
          </div>

          {partC_Conceptual.map((q) => {
            const userResponse = userState.answers[q.number] || '';
            const isFlagged = userState.flaggedQuestions.includes(q.number);
            const isSubmitted = userState.isSubmitted;
            const isRevealed = revealedPartC[q.number] || isSubmitted;
            const selfScore = userState.conceptualSelfScores[q.number];

            return (
              <div
                id={`question-${q.number}`}
                key={q.number}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold font-mono">
                      {q.number}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                      {q.subtopic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setRevealedPartC((prev) => ({
                          ...prev,
                          [q.number]: !prev[q.number],
                        }))
                      }
                      className="text-xs text-slate-400 hover:text-teal-300 underline"
                    >
                      {isRevealed ? 'Hide Model Answer' : 'View Model Answer & Rubric'}
                    </button>

                    <button
                      onClick={() => toggleFlagQuestion(q.number)}
                      title="Flag question"
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        isFlagged
                          ? 'text-amber-400 bg-amber-500/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  {q.question}
                </h4>

                {/* Student response notebook */}
                <div>
                  <textarea
                    rows={4}
                    placeholder="Draft your analytical response, applying slide principles and citing relevant mechanisms..."
                    value={userResponse}
                    onChange={(e) => handleConceptualAnswerChange(q.number, e.target.value)}
                    disabled={isSubmitted}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 leading-relaxed font-sans"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                    <span>{userResponse.length} characters</span>
                    <span>Self-evaluated against slide rubric</span>
                  </div>
                </div>

                {/* Model Solution & Rubric Callout */}
                {isRevealed && (
                  <div className="p-4 bg-slate-950/90 rounded-xl border border-teal-500/30 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        Slide-Derived Model Answer:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {q.modelAnswer}
                      </p>
                    </div>

                    {q.keyGradingPoints && q.keyGradingPoints.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-900">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Essential Grading Points for Full Marks:
                        </span>
                        <ul className="list-disc ml-4 space-y-0.5 text-[11px] text-slate-300">
                          {q.keyGradingPoints.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-900">
                      Slide Rationale: {q.explanation}
                    </p>

                    {/* Self-Rating Selector */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs text-slate-300 font-semibold">
                        Self-Grade Your Answer:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleScoreConceptual(q.number, 'full')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            selfScore === 'full'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                          }`}
                        >
                          Full Mark (1.0 pt)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScoreConceptual(q.number, 'partial')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            selfScore === 'partial'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                          }`}
                        >
                          Partial (0.5 pt)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScoreConceptual(q.number, 'review')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            selfScore === 'review'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                          }`}
                        >
                          Review (0 pt)
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Submit Exam Sticky Bar */}
      {!userState.isSubmitted && (
        <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-white">
                {totalAnsweredCount} of 40 Questions Completed
              </p>
              <p className="text-[11px] text-slate-400">
                Submit when ready to calculate your projected exam grade and CGPA trajectory.
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmitExam}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            Submit & Calculate CGPA Boost
          </button>
        </div>
      )}

    </div>
  );
};
