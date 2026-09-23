export type ScannexTheoryOption = {
  id: string;
  label: string;
};

export type ScannexTheoryQuestion = {
  id: string;
  section: string;
  prompt: string;
  instruction: string;
  marks: number;
  responseType: "single" | "multiple";
  options: ScannexTheoryOption[];
};

export type ScannexTheoryAnswerState = Record<string, string[]>;
