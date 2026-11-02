export interface Flashcard {
  id: string;
  cardNumber: number; // 1 to 25
  front: string; // [Concept, Term, or Prompt]
  back: string; // [Clear, precise definition or explanation based on the slides]
  subtopic?: string;
  category?: string;
  mastery?: 'unseen' | 'again' | 'hard' | 'good' | 'easy';
}

export interface MCQQuestion {
  number: number; // 1 to 20
  type: 'mcq';
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string; // 1-2 sentence rationale citing the slides
  subtopic: string;
}

export interface FillInBlankQuestion {
  number: number; // 21 to 30
  type: 'fill_in_blank';
  question: string; // E.g., "The primary mechanism used in Raft to elect a leader is known as [BLANK]."
  correctAnswer: string; // E.g., "Heartbeat timeouts"
  acceptableKeywords: string[]; // Variations for fuzzy matching
  explanation: string; // 1-2 sentence rationale citing the slides
  subtopic: string;
}

export interface ConceptualQuestion {
  number: number; // 31 to 40
  type: 'conceptual';
  question: string; // Scenario or deep question
  modelAnswer: string; // Ideal high-scoring answer based on slides
  keyGradingPoints: string[]; // Essential points to get full marks
  explanation: string; // 1-2 sentence rationale citing the slides
  subtopic: string;
}

export type AssessmentQuestion = MCQQuestion | FillInBlankQuestion | ConceptualQuestion;

export interface StructuredSummary {
  coreTheme: string;
  targetCourse?: string;
  learningObjectives: string[];
  highYieldTakeaways: string[];
  criticalFormulasOrFrameworks: {
    title: string;
    description: string;
    formulaOrCode?: string;
  }[];
  markdownContent: string;
}

export interface StudyKit {
  id: string;
  title: string;
  courseCode?: string;
  createdAt: string;
  summary: StructuredSummary;
  flashcards: Flashcard[];
  assessment: {
    partA_MCQ: MCQQuestion[]; // 1-20
    partB_FillBlank: FillInBlankQuestion[]; // 21-30
    partC_Conceptual: ConceptualQuestion[]; // 31-40
  };
  totalQuestions: 40;
}

export interface UserAssessmentState {
  answers: Record<number, string>; // question number -> selected option or typed text
  conceptualSelfScores: Record<number, 'full' | 'partial' | 'review'>;
  flaggedQuestions: number[];
  isSubmitted: boolean;
  scorePartA: number; // out of 20
  scorePartB: number; // out of 10
  scorePartC: number; // out of 10 (self-graded)
  totalScore: number; // out of 40
  completedAt?: string;
  timeSpentSeconds: number;
}
