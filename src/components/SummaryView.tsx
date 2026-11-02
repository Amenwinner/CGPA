import React, { useState } from 'react';
import { 
  StructuredSummary 
} from '../types';
import { 
  FileText, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  Search, 
  Sparkles, 
  Zap, 
  Bookmark, 
  Flame, 
  BookMarked
} from 'lucide-react';

interface SummaryViewProps {
  summary: StructuredSummary;
  courseTitle: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ summary, courseTitle }) => {
  const [completedObjectives, setCompletedObjectives] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleObjective = (index: number) => {
    setCompletedObjectives((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopy = () => {
    const fullMarkdown = `
# ${courseTitle} - High-Yield Topic Summary
**Core Theme:** ${summary.coreTheme}

## Learning Objectives
${summary.learningObjectives.map((obj) => `- [ ] ${obj}`).join('\n')}

## Critical Exam Takeaways
${summary.highYieldTakeaways.map((tip) => `- **High Yield:** ${tip}`).join('\n')}

${summary.criticalFormulasOrFrameworks && summary.criticalFormulasOrFrameworks.length > 0 ? `
## Key Formulas & Frameworks
${summary.criticalFormulasOrFrameworks
  .map(
    (f) => `### ${f.title}\n${f.description}\n\`\`\`\n${f.formulaOrCode || ''}\n\`\`\``
  )
  .join('\n\n')}
` : ''}

## Detailed Lecture Summary
${summary.markdownContent}
    `.trim();

    navigator.clipboard.writeText(fullMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render markdown lines cleanly
  const renderFormattedMarkdown = (content: string) => {
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl sm:text-2xl font-extrabold text-white mt-8 mb-4 border-b border-slate-700/80 pb-2 flex items-center gap-2">
            <span className="w-2.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
            {trimmed.replace('# ', '')}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg sm:text-xl font-bold text-amber-300 mt-6 mb-3 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm sm:text-base font-semibold text-indigo-300 mt-4 mb-2">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2);
        // Highlight bold text
        const parts = text.split(/(\*\*.*?\*\*)/g);

        return (
          <li key={idx} className="text-xs sm:text-sm text-slate-300 leading-relaxed ml-4 list-disc mb-1.5 marker:text-indigo-400">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-bold text-white bg-indigo-950/50 px-1 py-0.5 rounded border border-indigo-500/20">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </li>
        );
      }
      if (trimmed.startsWith('```')) {
        return null; // Handle code blocks or display clean
      }
      if (trimmed === '---') {
        return <hr key={idx} className="my-6 border-slate-800" />;
      }
      if (!trimmed) {
        return <div key={idx} className="h-2"></div>;
      }

      // Regular paragraph
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-white bg-indigo-950/50 px-1 py-0.5 rounded border border-indigo-500/20">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  const completedCount = Object.values(completedObjectives).filter(Boolean).length;
  const totalObjectives = summary.learningObjectives.length;
  const progressPercent = totalObjectives > 0 ? Math.round((completedCount / totalObjectives) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Top Banner: Core Theme & Actions */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              Section 1 • High-Yield Topic Summary
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {courseTitle}
            </h1>
          </div>

          <button
            onClick={handleCopy}
            className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Markdown Notes</span>
              </>
            )}
          </button>
        </div>

        {/* Core Theme Callout */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Core Theme & Lecture Thesis
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
            {summary.coreTheme}
          </p>
        </div>
      </div>

      {/* Grid: Learning Objectives & Critical High-Yield Takeaways */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Learning Objectives Checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">Learning Objectives</h3>
                <p className="text-[11px] text-slate-400">Mark off concepts as you master them</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {completedCount} / {totalObjectives} ({progressPercent}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="space-y-2 pt-1">
            {summary.learningObjectives.map((obj, idx) => {
              const isChecked = !!completedObjectives[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleObjective(idx)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors border ${
                    isChecked
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <button type="button" className="mt-0.5 shrink-0 text-emerald-400">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-slate-400' : ''}`}>
                    {obj}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* High-Yield Exam Takeaways */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Critical Exam Takeaways</h3>
              <p className="text-[11px] text-amber-400 font-medium">High-frequency questions & exam traps</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {summary.highYieldTakeaways.map((tip, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Critical Formulas & Frameworks Cards */}
      {summary.criticalFormulasOrFrameworks && summary.criticalFormulasOrFrameworks.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Essential Formulas & Frameworks</h3>
              <p className="text-[11px] text-slate-400">Master these for quantitative and analytical questions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {summary.criticalFormulasOrFrameworks.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-indigo-500/40 transition-colors space-y-2"
              >
                <h4 className="font-bold text-xs sm:text-sm text-indigo-300">{item.title}</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">{item.description}</p>
                {item.formulaOrCode && (
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-indigo-500/20 font-mono text-xs text-amber-300 break-words font-semibold">
                    {item.formulaOrCode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Lecture Notes Body */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Comprehensive Slide Breakdown</h3>
          </div>
          <span className="text-[11px] text-slate-400">Dense, high-yield exam notes</span>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300">
          {renderFormattedMarkdown(summary.markdownContent)}
        </div>
      </div>

    </div>
  );
};
