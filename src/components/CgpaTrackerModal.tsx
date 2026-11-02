import React, { useState } from 'react';
import { X, TrendingUp, Award, Sparkles, CheckCircle2, Calculator } from 'lucide-react';

interface CgpaTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCgpa: number;
  setCurrentCgpa: (val: number) => void;
  targetCgpa: number;
  setTargetCgpa: (val: number) => void;
}

export const CgpaTrackerModal: React.FC<CgpaTrackerModalProps> = ({
  isOpen,
  onClose,
  currentCgpa,
  setCurrentCgpa,
  targetCgpa,
  setTargetCgpa,
}) => {
  const [completedCredits, setCompletedCredits] = useState<number>(45);
  const [thisCourseCredits, setThisCourseCredits] = useState<number>(3);
  const [anticipatedGradePoints, setAnticipatedGradePoints] = useState<number>(4.0); // A / 4.0

  if (!isOpen) return null;

  // Calculate new CGPA:
  // Total previous quality points = currentCgpa * completedCredits
  // New points = anticipatedGradePoints * thisCourseCredits
  // New CGPA = (Total previous quality points + New points) / (completedCredits + thisCourseCredits)
  const currentQualityPoints = currentCgpa * completedCredits;
  const newQualityPoints = anticipatedGradePoints * thisCourseCredits;
  const newCgpa = (currentQualityPoints + newQualityPoints) / (completedCredits + thisCourseCredits);
  const cgpaDelta = newCgpa - currentCgpa;

  // Full Semester projection: 15 credits of straight A's (4.0)
  const semesterCredits = 15;
  const perfectSemesterCgpa = (currentQualityPoints + 4.0 * semesterCredits) / (completedCredits + semesterCredits);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">CGPA Goal & Trajectory Calculator</h3>
              <p className="text-xs text-slate-400">Aiming for First Class Honours (4.0)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          <div className="grid grid-cols-2 gap-3">
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
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
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Completed Credits
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="200"
                value={completedCredits}
                onChange={(e) => setCompletedCredits(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                This Course Units
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="6"
                value={thisCourseCredits}
                onChange={(e) => setThisCourseCredits(parseInt(e.target.value, 10) || 3)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Anticipated Grade Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Expected Grade in This Course (with 40-Q Practice Kit)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'A+ / A (4.0)', val: 4.0 },
                { label: 'A- (3.7)', val: 3.7 },
                { label: 'B+ (3.3)', val: 3.3 },
                { label: 'B (3.0)', val: 3.0 },
              ].map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => setAnticipatedGradePoints(g.val)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    anticipatedGradePoints === g.val
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result Calculation Callout */}
          <div className="p-4 bg-gradient-to-br from-indigo-950/60 via-slate-950 to-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  New Cumulative GPA
                </span>
                <p className="text-2xl font-black font-mono text-emerald-400">
                  {newCgpa.toFixed(3)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Net Increase
                </span>
                <p className="text-lg font-bold font-mono text-amber-300">
                  +{cgpaDelta.toFixed(3)} pts
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg text-xs text-slate-300 border border-slate-800">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Semester Goal Projection:</span>
              </div>
              Acing all 15 credits this semester with this high-yield kit methodology will lift your CGPA to{' '}
              <strong className="text-white font-mono">{perfectSemesterCgpa.toFixed(3)}</strong>!
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
