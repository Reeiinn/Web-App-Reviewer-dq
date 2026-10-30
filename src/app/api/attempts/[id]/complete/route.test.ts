import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findAttemptOwner, completeAttempt, issueCertificate } = vi.hoisted(() => ({
  auth: vi.fn(),
  findAttemptOwner: vi.fn(),
  completeAttempt: vi.fn(),
  issueCertificate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/attempts", () => ({ findAttemptOwner, completeAttempt }));
vi.mock("@/server/data/certificates", () => ({ issueCertificate }));

import { POST } from "./route";

const attempt = {
  id: "a1",
  userId: "u1",
  examType: "VUL",
  score: 3,
  totalItems: 4,
  passed: true,
  startedAt: new Date("2026-10-14T01:00:00.000Z"),
  completedAt: new Date("2026-10-14T01:30:00.000Z"),
  questionOrder: ["q1"],
};
const ATTEMPT_JSON =
  '"id":"a1","user_id":"u1","exam_type":"VUL","score":3,"total_items":4,"passed":true,' +
  '"started_at":"2026-10-14T01:00:00.000Z","completed_at":"2026-10-14T01:30:00.000Z","question_order":["q1"]';

const post = () =>
  POST(new Request("http://internal.local/api/attempts/a1/complete", { method: "POST" }), {
    params: Promise.resolve({ id: "a1" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  findAttemptOwner.mockResolvedValue("u1");
  completeAttempt.mockResolvedValue({ attempt, passes: 2 });
});

describe("POST /api/attempts/[id]/complete", () => {
  it("answers with the scored attempt and the track's passes, no certificate before five", async () => {
    const response = await post();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      `{${ATTEMPT_JSON},"passes":2,"passes_required":5,"track_passed":false,"certificate":null}`,
    );
    expect(issueCertificate).not.toHaveBeenCalled();
  });

  it("issues the certificate on the fifth pass and returns it in certificates' shape", async () => {
    completeAttempt.mockResolvedValue({ attempt, passes: 5 });
    issueCertificate.mockResolvedValue({
      id: "c1",
      userId: "u1",
      examType: "VUL",
      issuedAt: new Date("2026-10-14T01:30:00.000Z"),
      certificateNo: "INS-2026-VUL-1A2B3C",
    });

    const response = await post();

    expect(await response.text()).toBe(
      `{${ATTEMPT_JSON},"passes":5,"passes_required":5,"track_passed":true,` +
        '"certificate":{"id":"c1","user_id":"u1","exam_type":"VUL",' +
        '"issued_at":"2026-10-14T01:30:00.000Z","certificate_no":"INS-2026-VUL-1A2B3C"}}',
    );
    expect(issueCertificate).toHaveBeenCalledWith("u1", "VUL");
  });

  it("caps passes at five on revision sittings and asks for the certificate again", async () => {
    completeAttempt.mockResolvedValue({ attempt, passes: 7 });
    issueCertificate.mockResolvedValue(null);

    const body = await (await post()).json();

    expect(body.passes).toBe(5);
    expect(body.track_passed).toBe(true);
    expect(issueCertificate).toHaveBeenCalledTimes(1);
  });

  it("answers 404 for no attempt and 403 for someone else's, without scoring", async () => {
    findAttemptOwner.mockResolvedValue(null);
    expect((await post()).status).toBe(404);

    findAttemptOwner.mockResolvedValue("someone-else");
    expect((await post()).status).toBe(403);

    expect(completeAttempt).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
  });
});
