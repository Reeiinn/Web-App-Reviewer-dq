/**
 * The JSON the practice-exam routes have always answered with.
 *
 * Before Prisma these were `SELECT *` / `RETURNING *` rows, so the keys are
 * the tables' snake_case columns in table order. The data modules return
 * camelCase records, and these put them back exactly, key order included.
 * Dates stay Date objects: NextResponse.json writes them as ISO strings, as
 * it did with the Dates pg returned.
 */

export type AttemptFields = {
  id: string;
  userId: string;
  examType: string;
  score: number;
  totalItems: number;
  passed: boolean;
  startedAt: Date;
  completedAt: Date | null;
  questionOrder: unknown;
};

export const attemptJson = (a: AttemptFields) => ({
  id: a.id,
  user_id: a.userId,
  exam_type: a.examType,
  score: a.score,
  total_items: a.totalItems,
  passed: a.passed,
  started_at: a.startedAt,
  completed_at: a.completedAt,
  question_order: a.questionOrder,
});

export type ExamAnswerFields = {
  id: string;
  attemptId: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
};

export const examAnswerJson = (a: ExamAnswerFields) => ({
  id: a.id,
  attempt_id: a.attemptId,
  question_id: a.questionId,
  selected_choice_id: a.selectedChoiceId,
  is_correct: a.isCorrect,
});

/** An answer as GET /api/attempts/[id] lists it, with its question's text. */
export type ReviewedAnswerFields = {
  id: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
  questionText: string;
};

export const reviewedAnswerJson = (a: ReviewedAnswerFields) => ({
  id: a.id,
  question_id: a.questionId,
  selected_choice_id: a.selectedChoiceId,
  is_correct: a.isCorrect,
  question_text: a.questionText,
});

export type CertificateFields = {
  id: string;
  userId: string;
  examType: string;
  issuedAt: Date;
  certificateNo: string;
};

export const certificateJson = (c: CertificateFields) => ({
  id: c.id,
  user_id: c.userId,
  exam_type: c.examType,
  issued_at: c.issuedAt,
  certificate_no: c.certificateNo,
});
