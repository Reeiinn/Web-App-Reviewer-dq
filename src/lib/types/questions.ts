import { ExamType } from "./common";

export interface Choice {
  id: string;
  text: string;
  /** Only on the answer key: a paper being sat does not carry it. */
  is_correct?: boolean;
}

export interface Question {
  id: string;
  exam_type: ExamType;
  category: string;
  text: string;
  explanation: string | null;
  difficulty: number;
  created_at: string;
  choices: Choice[];
}
