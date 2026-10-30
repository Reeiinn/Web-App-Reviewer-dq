import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findAttemptOwner, choiceCorrectness, recordExamAnswer, licensedOnAttempt } = vi.hoisted(() => ({
  auth: vi.fn(),
  findAttemptOwner: vi.fn(),
  choiceCorrectness: vi.fn(),
  recordExamAnswer: vi.fn(),
  licensedOnAttempt: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/attempts", () => ({
  findAttemptOwner,
  choiceCorrectness,
  recordExamAnswer,
}));
vi.mock("@/server/data/exam-results", () => ({ licensedOnAttempt }));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://internal.local/api/attempts/a1/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "a1" }) },
  );
const body = { question_id: "q1", selected_choice_id: "c1" };

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  findAttemptOwner.mockResolvedValue("u1");
  licensedOnAttempt.mockResolvedValue(false);
  choiceCorrectness.mockResolvedValue(true);
  recordExamAnswer.mockResolvedValue({
    id: "x1",
    attemptId: "a1",
    questionId: "q1",
    selectedChoiceId: "c1",
    isCorrect: true,
  });
});

describe("POST /api/attempts/[id]/answers", () => {
  it("answers 201 with the saved row in exam_attempt_answers' shape", async () => {
    const response = await post(body);

    expect(response.status).toBe(201);
    expect(await response.text()).toBe(
      '{"id":"x1","attempt_id":"a1","question_id":"q1","selected_choice_id":"c1","is_correct":true}',
    );
    expect(choiceCorrectness).toHaveBeenCalledWith("c1", "q1");
    expect(recordExamAnswer).toHaveBeenCalledWith({
      attemptId: "a1",
      userId: "u1",
      questionId: "q1",
      selectedChoiceId: "c1",
      isCorrect: true,
    });
  });

  it("records a wrong answer as wrong, whatever the client claims", async () => {
    choiceCorrectness.mockResolvedValue(false);
    await post({ ...body, is_correct: true });
    expect(recordExamAnswer).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: false }));
  });

  it("answers 404 for an attempt that does not exist", async () => {
    findAttemptOwner.mockResolvedValue(null);
    const response = await post(body);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Attempt not found" });
  });

  it("answers 403 on someone else's attempt, before reading the body", async () => {
    findAttemptOwner.mockResolvedValue("someone-else");
    expect((await post(body)).status).toBe(403);
    expect(choiceCorrectness).not.toHaveBeenCalled();
  });

  it("answers 400 without both ids", async () => {
    const response = await post({ question_id: "q1" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "question_id and selected_choice_id are required",
    });
  });

  it("answers 404 for a choice that is not one of the question's", async () => {
    choiceCorrectness.mockResolvedValue(null);
    const response = await post(body);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Choice not found for this question" });
    expect(recordExamAnswer).not.toHaveBeenCalled();
  });

  it("refuses an answer once the real exam is passed", async () => {
    licensedOnAttempt.mockResolvedValue(true);
    const response = await post(body);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ licensed: true });
    expect(choiceCorrectness).not.toHaveBeenCalled();
    expect(recordExamAnswer).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await post(body)).status).toBe(401);
  });
});
