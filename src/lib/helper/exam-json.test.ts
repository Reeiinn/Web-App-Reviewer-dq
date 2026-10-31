import { describe, expect, it } from "vitest";
import {
  attemptJson,
  certificateJson,
  examAnswerJson,
  reviewedAnswerJson,
} from "./exam-json";

// JSON.stringify is what NextResponse.json runs, so these strings are the
// response bodies, key order included.
describe("exam JSON shapes", () => {
  it("writes an attempt in exam_attempts' column order", () => {
    expect(
      JSON.stringify(
        attemptJson({
          id: "a1",
          userId: "u1",
          examType: "VUL",
          score: 3,
          totalItems: 4,
          passed: true,
          startedAt: new Date("2026-10-14T01:00:00.000Z"),
          completedAt: new Date("2026-10-14T01:30:00.000Z"),
          questionOrder: ["q2", "q1"],
        }),
      ),
    ).toBe(
      '{"id":"a1","user_id":"u1","exam_type":"VUL","score":3,"total_items":4,"passed":true,' +
        '"started_at":"2026-10-14T01:00:00.000Z","completed_at":"2026-10-14T01:30:00.000Z",' +
        '"question_order":["q2","q1"]}',
    );
  });

  it("keeps an open attempt's completed_at and a missing order as null", () => {
    const json = attemptJson({
      id: "a1",
      userId: "u1",
      examType: "VUL",
      score: 0,
      totalItems: 0,
      passed: false,
      startedAt: new Date("2026-10-14T01:00:00.000Z"),
      completedAt: null,
      questionOrder: null,
    });
    expect(json.completed_at).toBeNull();
    expect(json.question_order).toBeNull();
  });

  it("writes a saved answer in exam_attempt_answers' column order", () => {
    expect(
      JSON.stringify(
        examAnswerJson({
          id: "x1",
          attemptId: "a1",
          questionId: "q1",
          selectedChoiceId: "c1",
          isCorrect: false,
        }),
      ),
    ).toBe(
      '{"id":"x1","attempt_id":"a1","question_id":"q1","selected_choice_id":"c1"}',
    );
  });

  it("writes a reviewed answer with its question text last", () => {
    expect(
      JSON.stringify(
        reviewedAnswerJson({
          id: "x1",
          questionId: "q1",
          selectedChoiceId: null,
          isCorrect: false,
          questionText: "What is VUL?",
        }),
      ),
    ).toBe(
      '{"id":"x1","question_id":"q1","selected_choice_id":null,"is_correct":false,"question_text":"What is VUL?"}',
    );
  });

  it("writes a certificate in certificates' column order", () => {
    expect(
      JSON.stringify(
        certificateJson({
          id: "c1",
          userId: "u1",
          examType: "IIAP_A",
          issuedAt: new Date("2026-10-14T02:00:00.000Z"),
          certificateNo: "INS-2026-IIAP_A-1A2B3C",
        }),
      ),
    ).toBe(
      '{"id":"c1","user_id":"u1","exam_type":"IIAP_A","issued_at":"2026-10-14T02:00:00.000Z","certificate_no":"INS-2026-IIAP_A-1A2B3C"}',
    );
  });
});
