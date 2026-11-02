import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  Volume2, 
  VolumeX, 
  Grid, 
  Maximize2, 
  Minimize2, 
  CheckCircle, 
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight
} from 'lucide-react';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ flashcards: initialFlashcards }) => {
  const [cards, setCards] = useState<Flashcard[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Sync when initial cards change
  useEffect(() => {
    setCards(initialFlashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialFlashcards]);

  const currentCard = cards[currentIndex] || cards[0];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'single') return;

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, viewMode]);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleRateMastery = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    setCards((prev) =>
      prev.map((c, idx) => (idx === currentIndex ? { ...c, mastery: rating } : c))
    );

    // Automatically transition to next card after a brief flip
    setTimeout(() => {
      handleNext();
    }, 250);
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const masteredCount = cards.filter((c) => c.mastery === 'good' || c.mastery === 'easy').length;
  const learningCount = cards.filter((c) => c.mastery === 'again' || c.mastery === 'hard').length;
  const unseenCount = cards.filter((c) => !c.mastery || c.mastery === 'unseen').length;
  const masteryPercentage = Math.round((masteredCount / (cards.length || 1)) * 100);

  const categories = ['all', ...Array.from(new Set(cards.map((c) => c.category || 'Concept')))];

  const filteredCards = selectedCategory === 'all'
    ? cards
    : cards.filter((c) => (c.category || 'Concept') === selectedCategory);

  return (
    <div className={`max-w-4xl mx-auto space-y-6 pb-16 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto max-w-none' : ''}`}>
      
      {/* Deck Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Section 2 • Interactive Flashcard Deck
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({cards.length} High-Yield Cards)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
            Core Definitions, Concepts & Frameworks
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleShuffle}
            title="Shuffle deck"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
            title="Switch View"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Grid className="w-3.5 h-3.5 text-indigo-400" />
            <span>{viewMode === 'single' ? 'Grid View' : 'Focus Mode'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Spaced Repetition Mastery Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Mastered: {masteredCount}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Learning: {learningCount}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Unseen: {unseenCount}
            </span>
          </div>
          <span className="font-mono font-bold text-amber-300">{masteryPercentage}% Exam Ready</span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(masteredCount / (cards.length || 1)) * 100}%` }}
          ></div>
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${(learningCount / (cards.length || 1)) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* SINGLE CARD FOCUS MODE */}
      {viewMode === 'single' && currentCard && (
        <div className="space-y-6">
          
          {/* Card Counter & Speech Trigger */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="font-mono font-semibold text-slate-300">
              Card {currentIndex + 1} of {cards.length}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  speakText(isFlipped ? currentCard.back : currentCard.front)
                }
                title="Read aloud with text-to-speech"
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Listen</span>
                  </>
                )}
              </button>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Space to flip • &larr; / &rarr; to navigate
              </span>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 sm:h-96 perspective-1000 cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full rounded-3xl transition-transform duration-500 transform-style-3d shadow-2xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT OF CARD */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-700/80 hover:border-indigo-500/60 flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Card [{currentCard.cardNumber}] | Front
                  </span>
                  {currentCard.category && (
                    <span className="text-xs text-slate-400 font-medium">
                      {currentCard.category}
                    </span>
                  )}
                </div>

                <div className="text-center my-auto space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold">
                    Concept / Term / Prompt
                  </p>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug px-4">
                    {currentCard.front}
                  </h3>
                  {currentCard.subtopic && (
                    <p className="text-xs text-slate-400">{currentCard.subtopic}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                    Click or press Space to reveal answer
                  </span>
                  {currentCard.mastery && currentCard.mastery !== 'unseen' && (
                    <span className="capitalize text-amber-400 font-semibold">
                      Status: {currentCard.mastery}
                    </span>
                  )}
                </div>
              </div>

              {/* BACK OF CARD */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-amber-500/50 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Card [{currentCard.cardNumber}] | Back: Definition / Solution
                  </span>
                  <span className="text-xs text-amber-300 font-semibold">
                    {currentCard.front}
                  </span>
                </div>

                <div className="my-auto space-y-3 px-2 sm:px-6">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                    Slide-Derived Explanation:
                  </p>
                  <p className="text-sm sm:text-base md:text-lg text-slate-100 font-medium leading-relaxed">
                    {currentCard.back}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800">
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <RotateCw className="w-3.5 h-3.5" />
                    Click to flip back
                  </span>
                  <span className="text-[11px] text-slate-400">Rely strictly on lecture slides</span>
                </div>
              </div>

            </div>
          </div>

          {/* Navigation & Spaced Repetition Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            
            {/* Prev / Next controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors"
                title="Previous Card (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors"
                title="Next Card (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* SRS Rating Buttons */}
            <div className="grid grid-cols-4 gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleRateMastery('again')}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <span>Again</span>
                <span className="text-[10px] text-rose-400/80">&lt; 1m</span>
              </button>

              <button
                onClick={() => handleRateMastery('hard')}
                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <span>Hard</span>
                <span className="text-[10px] text-amber-400/80">10m</span>
              </button>

              <button
                onClick={() => handleRateMastery('good')}
                className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <span>Good</span>
                <span className="text-[10px] text-indigo-400/80">1d</span>
              </button>

              <button
                onClick={() => handleRateMastery('easy')}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex flex-col items-center"
              >
                <span>Easy</span>
                <span className="text-[10px] text-emerald-400/80">4d</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GRID OVERVIEW MODE */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCards.map((card, idx) => (
              <div
                key={card.id || idx}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-md space-y-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400">
                    Card [{card.cardNumber}] | Front & Back
                  </span>
                  {card.category && (
                    <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                      {card.category}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white mb-1">{card.front}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{card.back}</p>
                </div>

                {card.subtopic && (
                  <p className="text-[11px] text-indigo-400 font-medium pt-1 border-t border-slate-800/80">
                    Topic: {card.subtopic}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
