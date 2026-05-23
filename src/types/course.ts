export type MediaKind = "video" | "image" | "audio" | "embed";

export type QuizQuestionType =
  | "multipleChoice"
  | "trueFalse"
  | "multipleResponse"
  | "matching"
  | "dragWords";

export interface CourseMedia {
  kind: MediaKind;
  title: string;
  src: string;
  poster?: string;
}

export interface ContentSlide {
  title: string;
  body: string;
  thumbnail?: string;
}

export interface QuizOption {
  id: string;
  label: string;
}

export interface BaseQuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  feedback: string;
}

export interface ChoiceQuestion extends BaseQuizQuestion {
  type: "multipleChoice" | "trueFalse";
  options: QuizOption[];
  answer: string;
}

export interface MultipleResponseQuestion extends BaseQuizQuestion {
  type: "multipleResponse";
  options: QuizOption[];
  answers: string[];
}

export interface MatchingQuestion extends BaseQuizQuestion {
  type: "matching";
  pairs: {
    left: string;
    right: string;
  }[];
}

export interface DragWordsQuestion extends BaseQuizQuestion {
  type: "dragWords";
  sentenceParts: string[];
  words: QuizOption[];
  answer: string[];
}

export type QuizQuestion =
  | ChoiceQuestion
  | MultipleResponseQuestion
  | MatchingQuestion
  | DragWordsQuestion;

export interface SurveyPrompt {
  id: string;
  type: "reflection" | "scenario";
  prompt: string;
  guidance: string;
  options?: QuizOption[];
}

export interface LearningUnit {
  id: string;
  slug: string;
  legacySlug?: string;
  order: number;
  title: string;
  subtitle: string;
  duration: string;
  assetBase: string;
  publishedPath: string;
  objectives: string[];
  media: CourseMedia[];
  slides: ContentSlide[];
  quiz: QuizQuestion[];
  survey: SurveyPrompt[];
  summary: string[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  level: string;
  description: string;
  audience: string;
  duration: string;
  sourceRoot: string;
  integrationNotes: string[];
  units: LearningUnit[];
}
