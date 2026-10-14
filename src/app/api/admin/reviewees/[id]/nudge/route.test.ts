import { beforeEach, describe, expect, it, vi } from "vitest";

const staff = vi.hoisted(() => ({
  touchLastSeen: vi.fn(),
  findActiveAccount: vi.fn(),
  lastNudgeSentAt: vi.fn(),
  sendNudge: vi.fn(),
  listNudges: vi.fn(),
  findNudge: vi.fn(),
  deleteNudge: vi.fn(),
}));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => staff);

import { nudgePresets } from "@/lib/helper/nudges";
import { DELETE, GET, POST } from "./route";

const reviewee = { id: "r1", name: "Rae", email: "r@example.test", role: "USER", managerId: "m1" };
const params = { params: Promise.resolve({ id: "r1" }) };
const url = "http://internal.local/api/admin/reviewees/r1/nudge";
const created = new Date("2026-10-14T09:00:00.000Z");

const record = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "n1", senderId: "m1", senderName: "Mae", message: "Keep going",
  createdAt: created, readAt: null, ...over,
});

const read = async (response: Response) => ({ status: response.status, body: await response.json() });
const post = (body: unknown) =>
  POST(new Request(url, { method: "POST", body: JSON.stringify(body) }), params).then(read);

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", name: "Mae" } });
  staff.findActiveAccount.mockResolvedValue(reviewee);
  staff.lastNudgeSentAt.mockResolvedValue(null);
  staff.sendNudge.mockResolvedValue(record());
  staff.listNudges.mockResolvedValue([record(), record({ id: "n0", readAt: created })]);
  staff.findNudge.mockResolvedValue({ id: "n1", senderId: "m1" });
});

describe("POST /api/admin/reviewees/[id]/nudge", () => {
  it("sends a preset and answers in today's shape", async () => {
    const preset = nudgePresets[0];
    staff.sendNudge.mockResolvedValue(record({ message: preset.message }));

    const { status, body } = await post({ preset: preset.id });

    expect(status).toBe(200);
    expect(staff.sendNudge).toHaveBeenCalledWith({
      userId: "r1", senderId: "m1", senderName: "Mae", message: preset.message,
    });
    expect(JSON.stringify(body)).toBe(JSON.stringify({
      message: "Reminder sent to Rae.",
      nudge: { id: "n1", senderId: "m1", sender: "Mae", message: preset.message, createdAt: created.toISOString(), read: false },
    }));
  });

  it("signs as 'Your manager' when the session has no name", async () => {
    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", name: null } });
    await post({ message: "Hello" });
    expect(staff.sendNudge).toHaveBeenCalledWith(expect.objectContaining({ senderName: "Your manager" }));
  });

  it("refuses a second reminder inside the cooldown", async () => {
    staff.lastNudgeSentAt.mockResolvedValue(new Date(Date.now() - 60_000));
    const { status, body } = await post({ message: "Hello" });
    expect(status).toBe(429);
    expect(body.error).toMatch(/^You have already reminded Rae\./);
    expect(staff.sendNudge).not.toHaveBeenCalled();
  });

  it("asks the cooldown of this sender for this reviewee", async () => {
    await post({ message: "Hello" });
    expect(staff.lastNudgeSentAt).toHaveBeenCalledWith("r1", "m1");
  });

  it("answers 400 for an empty body", async () => {
    const { status } = await post({});
    expect(status).toBe(400);
    expect(staff.sendNudge).not.toHaveBeenCalled();
  });

  it("refuses another manager's reviewee and a gone one", async () => {
    staff.findActiveAccount.mockResolvedValue({ ...reviewee, managerId: "m2" });
    const refused = await post({ message: "Hello" });
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You can only remind reviewees you manage." });

    staff.findActiveAccount.mockResolvedValue(null);
    const gone = await post({ message: "Hello" });
    expect(gone.status).toBe(404);
    expect(gone.body).toEqual({ error: "That reviewee no longer exists." });
    expect(staff.sendNudge).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/reviewees/[id]/nudge", () => {
  it("lists the last twenty sent, with the viewer", async () => {
    const { status, body } = await read(await GET(new Request(url), params));

    expect(status).toBe(200);
    expect(staff.listNudges).toHaveBeenCalledWith("r1", 20);
    expect(JSON.stringify(body)).toBe(JSON.stringify({
      nudges: [
        { id: "n1", senderId: "m1", sender: "Mae", message: "Keep going", createdAt: created.toISOString(), read: false },
        { id: "n0", senderId: "m1", sender: "Mae", message: "Keep going", createdAt: created.toISOString(), read: true },
      ],
      viewer: { id: "m1", role: "MANAGER" },
    }));
  });

  it("refuses another manager's reviewee", async () => {
    staff.findActiveAccount.mockResolvedValue({ ...reviewee, managerId: "m2" });
    expect((await GET(new Request(url), params)).status).toBe(403);
    expect(staff.listNudges).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/reviewees/[id]/nudge", () => {
  const remove = (query = "?nudge=n1") =>
    DELETE(new Request(`${url}${query}`, { method: "DELETE" }), params).then(read);

  it("takes back the sender's own reminder", async () => {
    const { status, body } = await remove();
    expect(status).toBe(200);
    expect(JSON.stringify(body)).toBe(JSON.stringify({ message: "Reminder deleted.", id: "n1" }));
    expect(staff.findNudge).toHaveBeenCalledWith("n1", "r1");
    expect(staff.deleteNudge).toHaveBeenCalledWith("n1");
  });

  it("needs a reminder named", async () => {
    expect(await remove("")).toEqual({ status: 400, body: { error: "Name the reminder to delete." } });
  });

  it("answers 404 for a reminder that is gone", async () => {
    staff.findNudge.mockResolvedValue(null);
    expect(await remove()).toEqual({ status: 404, body: { error: "That reminder is already gone." } });
  });

  it("refuses a unit manager deleting someone else's, and lets an admin", async () => {
    staff.findNudge.mockResolvedValue({ id: "n1", senderId: "m9" });
    const refused = await remove();
    expect(refused).toEqual({ status: 403, body: { error: "You can only delete reminders you sent." } });
    expect(staff.deleteNudge).not.toHaveBeenCalled();

    auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN", name: "Ada" } });
    expect((await remove()).status).toBe(200);
  });
});
