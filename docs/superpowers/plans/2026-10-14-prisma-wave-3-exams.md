# Prisma Wave 3 (Exams) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every practice-exam and certificate query off the `pg` pool and onto two Prisma data modules: dealing and resuming a sitting, saving answers, scoring, issuing certificates, and the two certificate pages and the certificate image. Delete `GET /api/attempts`, which nothing calls, and `_lib/certificates.ts`, which has no callers once its one function moves.

**Architecture:** `src/server/data/attempts.ts` owns `exam_attempts` and `exam_attempt_answers`, plus the `question_progress` and `user_progress` writes a sitting makes. `src/server/data/certificates.ts` owns `certificates`. Both return camelCase records. A pure helper, `src/lib/helper/exam-json.ts`, maps them back to today's snake_case JSON in table-column order, because four routes share those shapes. The certificate number, built in SQL until now, becomes a pure, unit-tested `certificateNumber`. A one-off parity script compares the old SQL with the new reads on the local production restore.

**Tech Stack:** Next.js 16 route handlers and server components, Prisma 7.10 (`@/generated/prisma/client`, `@prisma/adapter-pg`), PostgreSQL, Vitest 4 (`unit` and `db` projects).

**Spec:** `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`. Read the Wave 0, 1 and 2 outcomes first.

## Global Constraints

- **Existing data is never affected.** This wave adds no migration and changes no schema. If a task seems to need one, stop and ask.
- **Never touch the Railway database.** No `prisma db push`, `migrate dev`, `migrate deploy`, `migrate resolve` or `migrate reset` against it. Don't read `.env`. Every DB command uses `.env.local` (local `insure_dev` through `MIGRATE_DATABASE_URL`, test DB `insure` through `TEST_DATABASE_URL`).
- **Response shapes stay byte-for-byte compatible,** key order included. Nelson approved these intended changes, and nothing else may change:
  1. `GET /api/attempts` (the list) is deleted. Nothing in the frontend calls it. `POST /api/attempts` in the same file stays.
  2. A sitting's two answer writes (the answer row and `question_progress`) happen in one transaction. So do scoring, the `pass_count` increment and the pass count. Before, each was a separate statement, so a failure could leave one written without the other. The JSON does not change.
- **Raw SQL stays only in `src/server/data/mastery.ts`.** `attempts.ts` and `certificates.ts` use the Prisma query API only: no `$queryRaw` or `$executeRaw`. The old `ORDER BY random()` deal becomes a Fisher–Yates shuffle in TypeScript. The old SQL-built certificate number becomes `certificateNumber`.
- **`updated_at` triggers exist only on `users` and `user_progress`.** The old pass increment also set `updated_at = now()`; the trigger already does that, so the Prisma update leaves it alone. Do not add `@updatedAt` to the schema.
- **Clock:** `now()` in the old SQL becomes `new Date()` (the Wave 1 ruling; sessions are pinned to UTC). The certificate year is `issuedAt.getUTCFullYear()`, from the same `Date` written to `issued_at`, so the number and the date can't disagree.
- **Question mastery follows the latest answer.** In `question_progress`, `mastered` is set to the latest `is_correct`, so a wrong answer un-masters a question. This is the opposite of flashcards and memorization, and it is today's behaviour. Keep it.
- **Legacy `IIAP` rows:** the database enum still has `IIAP`, but the app's `ExamType` has only the four live tracks. Rows are passed through as they always were, with `examType: row.examType as ExamType` and a comment saying why.
- **Connection budget stays 2 (`pg`) + 3 (Prisma).** After this wave only the staff routes (Wave 4) use `pg`. Don't change either pool.
- **Commits:** plain messages, sole author Nelson Lago III, **no `Co-Authored-By` or any other trailer.**
- **PR:** `gh pr create --base dev`, never `main`.
- **Next.js 16:** this plan edits route handler bodies and the data reads at the top of two server-component pages. It touches no other Next API. Before touching any, read `node_modules/next/dist/docs/`.
- **pnpm only.** Unit tests: `pnpm test`. DB tests: `pnpm test:db` (rebuilds the local `insure` test DB from migrations; Nelson has consented to that wipe).

## Review Focus

1. **The fifth pass, asked twice at once** (a double-tapped submit, or two tabs finishing). Expected: both responses carry the same certificate; one row exists; no 500. Pinned in Task 3 (concurrent `issueCertificate` test).
2. **An answer changed mid-sitting, or posted twice at once.** Expected: one `exam_attempt_answers` row per question, so the score counts it once. `question_progress.times_seen` goes up once per post, and `mastered` follows the latest answer, so a wrong answer after a right one un-masters. Pinned in Task 3 (replace, un-master and concurrent `recordExamAnswer` tests).
3. **A sitting started before stored order existed** (`question_order` is NULL). Expected: reopening it fills in a full deal of the track's questions and keeps the same attempt; a later reopen returns that same order. Pinned in Task 2.
4. **JSON after the move.** Attempts keep `id, user_id, exam_type, score, total_items, passed, started_at, completed_at, question_order`. Answers keep `id, attempt_id, question_id, selected_choice_id, is_correct`. Certificates keep `id, user_id, exam_type, issued_at, certificate_no`. All in that order, with timestamps as ISO strings and `question_order` as a JSON array, not a string. Pinned by `exam-json` unit tests (Task 1), route tests (Tasks 2–3) and the parity script (Task 5).
5. **Someone else's certificate or attempt.** Expected: the certificate pages and image answer exactly as for one that does not exist (404 / `notFound()`). An attempt answers 403 unless the caller owns it, is an admin, or is the active manager of its owner. A soft-deleted recruit's attempts are 403 to their former manager. Pinned in Task 2 (route test and `isActiveRecruit` DB test) and Task 4 (image route test and `findHeldCertificate` DB test).

Also noted, not changed: answers can still be posted to a completed attempt, and completing an attempt twice re-scores it and counts its pass twice. Both are today's behaviour, and the frontend never does either. A malformed (non-UUID) id still raises a database error and a 500, as it did through `pg`. The old answers query had no `ORDER BY`, and neither does the new one. The frontend turns the answers into a map, so the parity script compares them by id.

---

## File Map

| Path | Responsibility |
| ---- | -------------- |
| `src/lib/helper/exam-json.ts` (+ `.test.ts`) | **Create.** Pure: camelCase records → today's snake_case JSON |
| `src/lib/helper/certificate-number.ts` (+ `.test.ts`) | **Create.** Pure: `INS-<year>-<track>-<6 hex>` |
| `src/server/data/attempts.ts` (+ `.db.test.ts`) | **Create.** Deal, resume, read, answer and score sittings |
| `src/server/data/certificates.ts` (+ `.db.test.ts`) | **Create.** Issue and read certificates |
| `src/server/data/users.ts`, `users.db.test.ts` | Modify: add `isActiveRecruit` |
| `src/app/api/attempts/route.ts` (+ `route.test.ts`) | Modify: POST calls `openAttempt`; **delete GET** |
| `src/app/api/attempts/[id]/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `src/app/api/attempts/[id]/answers/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `src/app/api/attempts/[id]/complete/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `src/app/api/_lib/certificates.ts` | **Delete** (no callers left) |
| `src/app/api/certificates/[id]/image/route.tsx`, `route.test.ts` | Modify: read through `certificates.ts`; the test mocks the module, not `@/lib/db` |
| `src/app/certificates/page.tsx`, `src/app/certificates/[id]/page.tsx` | Modify: read through the data modules |
| `scripts/parity/exams-parity.ts`, `package.json` | **Create** / Modify: `pnpm parity:exams` |
| `docs/superpowers/specs/2026-10-14-prisma-migration-design.md` | Add "Wave 3 outcome" |

---

### Task 1: Pure helpers: the exam JSON shapes and the certificate number

**Files:**
- Create: `src/lib/helper/exam-json.ts`, `src/lib/helper/exam-json.test.ts`
- Create: `src/lib/helper/certificate-number.ts`, `src/lib/helper/certificate-number.test.ts`

**Interfaces:**
- Produces:
  - `type AttemptFields = { id: string; userId: string; examType: string; score: number; totalItems: number; passed: boolean; startedAt: Date; completedAt: Date | null; questionOrder: unknown }`
  - `attemptJson(a: AttemptFields)` → `{ id, user_id, exam_type, score, total_items, passed, started_at, completed_at, question_order }`
  - `type ExamAnswerFields = { id: string; attemptId: string; questionId: string; selectedChoiceId: string | null; isCorrect: boolean }`
  - `examAnswerJson(a: ExamAnswerFields)` → `{ id, attempt_id, question_id, selected_choice_id, is_correct }`
  - `type ReviewedAnswerFields = { id: string; questionId: string; selectedChoiceId: string | null; isCorrect: boolean; questionText: string }`
  - `reviewedAnswerJson(a: ReviewedAnswerFields)` → `{ id, question_id, selected_choice_id, is_correct, question_text }`
  - `type CertificateFields = { id: string; userId: string; examType: string; issuedAt: Date; certificateNo: string }`
  - `certificateJson(c: CertificateFields)` → `{ id, user_id, exam_type, issued_at, certificate_no }`
  - `certificateNumber(examType: string, issuedAt: Date, uuid: string): string`

Dates stay `Date` objects in these shapes. `NextResponse.json` turns them into ISO strings, exactly as it did with the `Date`s `pg` returned.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/helper/exam-json.test.ts`:

```ts
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
      '{"id":"x1","attempt_id":"a1","question_id":"q1","selected_choice_id":"c1","is_correct":false}',
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
```

Create `src/lib/helper/certificate-number.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { certificateNumber } from "./certificate-number";

describe("certificateNumber", () => {
  it("is INS, the issue year, the track and six hex digits of the uuid", () => {
    expect(
      certificateNumber(
        "VUL",
        new Date("2026-10-14T09:00:00.000Z"),
        "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      ),
    ).toBe("INS-2026-VUL-1A2B3C");
  });

  it("skips the uuid's hyphens, as the old SQL's replace() did", () => {
    expect(
      certificateNumber(
        "TRADITIONAL_LIFE",
        new Date("2026-10-14T09:00:00.000Z"),
        "abcd-ef01-2345-6789-abcdef012345",
      ),
    ).toBe("INS-2026-TRADITIONAL_LIFE-ABCDEF");
  });

  it("takes the year in UTC, the zone the old SQL ran in", () => {
    // 07:30 on 1 January in Manila is still 31 December in UTC.
    expect(
      certificateNumber(
        "VUL",
        new Date("2026-12-31T23:30:00.000Z"),
        "00000000-0000-4000-8000-000000000000",
      ),
    ).toBe("INS-2026-VUL-000000");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test src/lib/helper/exam-json.test.ts src/lib/helper/certificate-number.test.ts`
Expected: FAIL. The modules don't exist yet.

- [ ] **Step 3: Write the helpers**

Create `src/lib/helper/exam-json.ts`:

```ts
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
```

Create `src/lib/helper/certificate-number.ts`:

```ts
/**
 * A certificate's number: INS-<year issued>-<track>-<six hex digits>.
 *
 * The same format the SQL built before Prisma, `to_char(now(), 'YYYY')` and
 * the first six hex digits of `gen_random_uuid()`, upper-cased. The year is
 * read in UTC, the zone the database session ran in. The caller passes the
 * same Date it stores as issued_at, so the two always agree. Uniqueness is
 * the database's job (certificate_no is unique); this only formats.
 */
export function certificateNumber(
  examType: string,
  issuedAt: Date,
  uuid: string,
): string {
  const suffix = uuid.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `INS-${issuedAt.getUTCFullYear()}-${examType}-${suffix}`;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm test src/lib/helper/exam-json.test.ts src/lib/helper/certificate-number.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/helper/exam-json.ts src/lib/helper/exam-json.test.ts src/lib/helper/certificate-number.ts src/lib/helper/certificate-number.test.ts
git commit -m "feat: add the exam JSON shapes and the certificate number as pure helpers"
```

---

### Task 2: Start, resume and read a sitting through `attempts.ts`

**Files:**
- Create: `src/server/data/attempts.ts`, `src/server/data/attempts.db.test.ts`
- Modify: `src/server/data/users.ts`, `src/server/data/users.db.test.ts`
- Modify: `src/app/api/attempts/route.ts`, `src/app/api/attempts/[id]/route.ts`
- Create: `src/app/api/attempts/route.test.ts`, `src/app/api/attempts/[id]/route.test.ts`

**Interfaces:**
- Consumes: `attemptJson`, `reviewedAnswerJson` (Task 1); `fetchEligibility` from `@/app/api/_lib/mastery` (unchanged); fixtures `createUser`, `deleteUsers`, `createQuestion`, `deleteContent`.
- Produces (in `attempts.ts`):
  - `type AttemptRecord = { id: string; userId: string; examType: ExamType; score: number; totalItems: number; passed: boolean; startedAt: Date; completedAt: Date | null; questionOrder: unknown }`
  - `findOpenAttempt(userId: string, examType: ExamType): Promise<AttemptRecord | null>`
  - `openAttempt(userId: string, examType: ExamType): Promise<{ attempt: AttemptRecord; created: boolean }>`
  - `findAttempt(id: string): Promise<AttemptRecord | null>`
  - `type ReviewedAnswer = { id: string; questionId: string; selectedChoiceId: string | null; isCorrect: boolean; questionText: string }`
  - `listAttemptAnswers(attemptId: string): Promise<ReviewedAnswer[]>`
  - `type CompletedSitting = { examType: ExamType; passed: boolean; score: number; totalItems: number; completedAt: Date }`
  - `listCompletedSittings(userId: string): Promise<CompletedSitting[]>`
  - The module-private `attemptSelect`, `asAttempt` and `TRANSACTION_OPTIONS` are reused by Task 3, which adds to this file.
- Produces (in `users.ts`): `isActiveRecruit(userId: string, managerId: string): Promise<boolean>`

- [ ] **Step 1: Write the failing DB tests**

Create `src/server/data/attempts.db.test.ts`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import {
  createQuestion,
  createUser,
  deleteContent,
  deleteUsers,
} from "@/test/db-fixtures";
import {
  findAttempt,
  findOpenAttempt,
  listAttemptAnswers,
  listCompletedSittings,
  openAttempt,
} from "./attempts";

// Users go first: their attempts' answers point at the questions with no
// delete rule, so the questions can only go once the attempts have.
const made: string[] = [];
const questions: string[] = [];
afterAll(async () => {
  await deleteUsers(...made);
  await deleteContent({ questions });
});

async function user() {
  const created = await createUser();
  made.push(created.id);
  return created;
}

async function question(examType: "VUL" | "IIAP_B" = "IIAP_B", text?: string) {
  const created = await createQuestion({
    examType,
    text,
    choices: [
      { text: "Right", isCorrect: true, sortOrder: 1 },
      { text: "Wrong", sortOrder: 2 },
    ],
  });
  questions.push(created.id);
  return created.id;
}

const trackQuestionIds = async (examType: "IIAP_B") =>
  (await prisma.question.findMany({ where: { examType }, select: { id: true } }))
    .map((q) => q.id)
    .sort();

describe("openAttempt", () => {
  it("deals every question on the track once and keeps the order with the attempt", async () => {
    const me = await user();
    await question();
    await question();
    await question();

    const { attempt, created } = await openAttempt(me.id, "IIAP_B");

    expect(created).toBe(true);
    expect(attempt).toMatchObject({
      userId: me.id,
      examType: "IIAP_B",
      score: 0,
      totalItems: 0,
      passed: false,
      completedAt: null,
    });
    expect(Array.isArray(attempt.questionOrder)).toBe(true);
    expect([...(attempt.questionOrder as string[])].sort()).toEqual(
      await trackQuestionIds("IIAP_B"),
    );
  });

  it("resumes the open sitting with the same paper instead of starting another", async () => {
    const me = await user();
    await question();

    const first = await openAttempt(me.id, "IIAP_B");
    const again = await openAttempt(me.id, "IIAP_B");

    expect(again.created).toBe(false);
    expect(again.attempt.id).toBe(first.attempt.id);
    expect(again.attempt.questionOrder).toEqual(first.attempt.questionOrder);
    expect(await prisma.examAttempt.count({ where: { userId: me.id } })).toBe(1);
  });

  it("deals a sitting from before stored order exists, once, and keeps it", async () => {
    const me = await user();
    await question();
    const old = await prisma.examAttempt.create({
      data: { userId: me.id, examType: "IIAP_B", score: 0, totalItems: 0, passed: false },
      select: { id: true },
    });

    const filled = await openAttempt(me.id, "IIAP_B");
    const again = await openAttempt(me.id, "IIAP_B");

    expect(filled.created).toBe(false);
    expect(filled.attempt.id).toBe(old.id);
    expect([...(filled.attempt.questionOrder as string[])].sort()).toEqual(
      await trackQuestionIds("IIAP_B"),
    );
    expect(again.attempt.questionOrder).toEqual(filled.attempt.questionOrder);
  });

  it("starts a new sitting once the last one is completed", async () => {
    const me = await user();
    await question();
    const first = await openAttempt(me.id, "IIAP_B");
    await prisma.examAttempt.update({
      where: { id: first.attempt.id },
      data: { completedAt: new Date() },
    });

    const next = await openAttempt(me.id, "IIAP_B");

    expect(next.created).toBe(true);
    expect(next.attempt.id).not.toBe(first.attempt.id);
  });

  it("keeps tracks apart", async () => {
    const me = await user();
    await question("VUL");
    const vul = await openAttempt(me.id, "VUL");

    expect(await findOpenAttempt(me.id, "IIAP_B")).toBeNull();
    expect((await findOpenAttempt(me.id, "VUL"))?.id).toBe(vul.attempt.id);
  });
});

describe("reading a sitting", () => {
  it("finds an attempt by id, and null for one that does not exist", async () => {
    const me = await user();
    await question();
    const { attempt } = await openAttempt(me.id, "IIAP_B");

    expect(await findAttempt(attempt.id)).toEqual(attempt);
    expect(await findAttempt("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("lists the attempt's answers with each question's text", async () => {
    const me = await user();
    const q = await question("IIAP_B", "Which is right?");
    const { attempt } = await openAttempt(me.id, "IIAP_B");
    const choice = await prisma.choice.findFirstOrThrow({
      where: { questionId: q, isCorrect: true },
      select: { id: true },
    });
    const saved = await prisma.examAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: q, selectedChoiceId: choice.id, isCorrect: true },
      select: { id: true },
    });

    expect(await listAttemptAnswers(attempt.id)).toEqual([
      {
        id: saved.id,
        questionId: q,
        selectedChoiceId: choice.id,
        isCorrect: true,
        questionText: "Which is right?",
      },
    ]);
  });

  it("lists only completed sittings, oldest first", async () => {
    const me = await user();
    const at = (iso: string) => new Date(iso);
    for (const [completedAt, passed] of [
      ["2026-10-02T00:00:00.000Z", true],
      ["2026-10-01T00:00:00.000Z", false],
    ] as const) {
      await prisma.examAttempt.create({
        data: { userId: me.id, examType: "VUL", score: 3, totalItems: 4, passed, completedAt: at(completedAt) },
      });
    }
    await prisma.examAttempt.create({
      data: { userId: me.id, examType: "VUL", score: 0, totalItems: 0, passed: false },
    });

    expect(await listCompletedSittings(me.id)).toEqual([
      { examType: "VUL", passed: false, score: 3, totalItems: 4, completedAt: at("2026-10-01T00:00:00.000Z") },
      { examType: "VUL", passed: true, score: 3, totalItems: 4, completedAt: at("2026-10-02T00:00:00.000Z") },
    ]);
  });
});
```

In `src/server/data/users.db.test.ts`, add `isActiveRecruit` to the import list from `./users` (keep it alphabetical) and append:

```ts
describe("isActiveRecruit", () => {
  it("is true only for an active recruit of that manager", async () => {
    const manager = await user({ role: "MANAGER" });
    const otherManager = await user({ role: "MANAGER" });
    const recruit = await user({ managerId: manager.id });
    const leaver = await user({ managerId: manager.id });
    await softDelete(leaver.id);

    expect(await isActiveRecruit(recruit.id, manager.id)).toBe(true);
    expect(await isActiveRecruit(recruit.id, otherManager.id)).toBe(false);
    expect(await isActiveRecruit(leaver.id, manager.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:db src/server/data/attempts.db.test.ts src/server/data/users.db.test.ts`
Expected: FAIL. `./attempts` doesn't exist, and `isActiveRecruit` isn't exported.

- [ ] **Step 3: Write `attempts.ts` (reads and starting)**

Create `src/server/data/attempts.ts`:

```ts
import "server-only";
import prisma from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ExamType } from "@/lib/types/common";

/**
 * Practice-exam sittings: dealing a paper, resuming it, the answers saved
 * against it and its score. Every query on exam_attempts and
 * exam_attempt_answers goes through here, as do the question_progress and
 * user_progress writes a sitting makes.
 *
 * Rows on the legacy IIAP track still exist, so exam_type is cast rather
 * than filtered, as content.ts does.
 */

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

export type AttemptRecord = {
  id: string;
  userId: string;
  examType: ExamType;
  score: number;
  totalItems: number;
  passed: boolean;
  startedAt: Date;
  completedAt: Date | null;
  questionOrder: unknown;
};

const attemptSelect = {
  id: true,
  userId: true,
  examType: true,
  score: true,
  totalItems: true,
  passed: true,
  startedAt: true,
  completedAt: true,
  questionOrder: true,
} as const;

type AttemptRow = Prisma.ExamAttemptGetPayload<{ select: typeof attemptSelect }>;

const asAttempt = (row: AttemptRow): AttemptRecord => ({
  ...row,
  examType: row.examType as ExamType,
});

/**
 * One sitting's question ids, in the order the learner will see them. A
 * Fisher–Yates shuffle, uniform like the ORDER BY random() it replaces.
 */
async function dealPaper(examType: ExamType): Promise<string[]> {
  const rows = await prisma.question.findMany({
    where: { examType },
    select: { id: true },
  });
  const ids = rows.map((row) => row.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** The learner's unfinished sitting on a track, the latest if there are several. */
export async function findOpenAttempt(
  userId: string,
  examType: ExamType,
): Promise<AttemptRecord | null> {
  const row = await prisma.examAttempt.findFirst({
    where: { userId, examType, completedAt: null },
    orderBy: { startedAt: "desc" },
    select: attemptSelect,
  });
  return row ? asAttempt(row) : null;
}

/**
 * The sitting a learner opens the practice exam into.
 *
 * Reopening the exam picks the unfinished sitting back up rather than
 * starting a second one. Every page load used to insert a row, so a refresh
 * abandoned the answers already saved against the old attempt. The paper is
 * dealt once, when the sitting starts, and kept with it. Sittings that
 * predate the stored order get one the first time they are reopened.
 */
export async function openAttempt(
  userId: string,
  examType: ExamType,
): Promise<{ attempt: AttemptRecord; created: boolean }> {
  const open = await findOpenAttempt(userId, examType);

  if (open) {
    if (open.questionOrder) return { attempt: open, created: false };

    const filled = await prisma.examAttempt.update({
      where: { id: open.id },
      data: { questionOrder: await dealPaper(examType) },
      select: attemptSelect,
    });
    return { attempt: asAttempt(filled), created: false };
  }

  const started = await prisma.examAttempt.create({
    data: {
      userId,
      examType,
      score: 0,
      totalItems: 0,
      passed: false,
      questionOrder: await dealPaper(examType),
    },
    select: attemptSelect,
  });
  return { attempt: asAttempt(started), created: true };
}

export async function findAttempt(id: string): Promise<AttemptRecord | null> {
  const row = await prisma.examAttempt.findUnique({
    where: { id },
    select: attemptSelect,
  });
  return row ? asAttempt(row) : null;
}

export type ReviewedAnswer = {
  id: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
  questionText: string;
};

/** The answers saved against a sitting. Unordered, as the old query was. */
export async function listAttemptAnswers(attemptId: string): Promise<ReviewedAnswer[]> {
  const rows = await prisma.examAttemptAnswer.findMany({
    where: { attemptId },
    select: {
      id: true,
      questionId: true,
      selectedChoiceId: true,
      isCorrect: true,
      question: { select: { text: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    questionId: row.questionId,
    selectedChoiceId: row.selectedChoiceId,
    isCorrect: row.isCorrect,
    questionText: row.question.text,
  }));
}

export type CompletedSitting = {
  examType: ExamType;
  passed: boolean;
  score: number;
  totalItems: number;
  completedAt: Date;
};

/** Every finished sitting a learner has taken, oldest first. */
export async function listCompletedSittings(userId: string): Promise<CompletedSitting[]> {
  const rows = await prisma.examAttempt.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
    select: { examType: true, passed: true, score: true, totalItems: true, completedAt: true },
  });

  return rows.map((row) => ({
    examType: row.examType as ExamType,
    passed: row.passed,
    score: row.score,
    totalItems: row.totalItems,
    completedAt: row.completedAt as Date,
  }));
}
```

`TRANSACTION_OPTIONS` is unused until Task 3. If `pnpm lint` flags it, leave it out here and add it in Task 3.

- [ ] **Step 4: Add `isActiveRecruit` to `users.ts`**

Append to `src/server/data/users.ts`:

```ts
/** Whether userId is an active (not removed) recruit of managerId. */
export async function isActiveRecruit(
  userId: string,
  managerId: string,
): Promise<boolean> {
  return (
    (await prisma.user.count({
      where: { id: userId, managerId, deletedAt: null },
    })) > 0
  );
}
```

- [ ] **Step 5: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/attempts.db.test.ts src/server/data/users.db.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing route tests**

Create `src/app/api/attempts/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, fetchEligibility, openAttempt } = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchEligibility: vi.fn(),
  openAttempt: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/app/api/_lib/mastery", () => ({ fetchEligibility }));
vi.mock("@/server/data/attempts", () => ({ openAttempt }));

import * as route from "./route";

const attempt = {
  id: "a1",
  userId: "u1",
  examType: "VUL",
  score: 0,
  totalItems: 0,
  passed: false,
  startedAt: new Date("2026-10-14T01:00:00.000Z"),
  completedAt: null,
  questionOrder: ["q2", "q1"],
};
const ATTEMPT_JSON =
  '{"id":"a1","user_id":"u1","exam_type":"VUL","score":0,"total_items":0,"passed":false,' +
  '"started_at":"2026-10-14T01:00:00.000Z","completed_at":null,"question_order":["q2","q1"]}';

const eligible = {
  eligible: true,
  flashcards: { mastered: 10, total: 10 },
  memorization: { mastered: 10, total: 10 },
};

const post = (body: unknown) =>
  route.POST(
    new Request("http://internal.local/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  fetchEligibility.mockResolvedValue(eligible);
  openAttempt.mockResolvedValue({ attempt, created: true });
});

describe("POST /api/attempts", () => {
  it("answers 201 with a new sitting in exam_attempts' shape", async () => {
    const response = await post({ exam_type: "VUL" });

    expect(response.status).toBe(201);
    expect(await response.text()).toBe(ATTEMPT_JSON);
    expect(openAttempt).toHaveBeenCalledWith("u1", "VUL");
  });

  it("answers 200 when the open sitting is resumed", async () => {
    openAttempt.mockResolvedValue({ attempt, created: false });

    const response = await post({ exam_type: "VUL" });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(ATTEMPT_JSON);
  });

  it("answers 403 with the reason and the counts when the track is locked", async () => {
    const locked = {
      eligible: false,
      flashcards: { mastered: 1, total: 58 },
      memorization: { mastered: 0, total: 58 },
    };
    fetchEligibility.mockResolvedValue(locked);

    const response = await post({ exam_type: "VUL" });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.eligibility).toEqual(locked);
    expect(typeof body.error).toBe("string");
    expect(openAttempt).not.toHaveBeenCalled();
  });

  it("answers 400 without an exam_type, and for one that is not a track", async () => {
    expect((await post({})).status).toBe(400);
    const invalid = await post({ exam_type: "IIAP" });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "exam_type is invalid" });
    expect(openAttempt).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await post({ exam_type: "VUL" })).status).toBe(401);
  });
});

describe("GET /api/attempts", () => {
  it("is gone: nothing called it", () => {
    expect(route).not.toHaveProperty("GET");
  });
});
```

Create `src/app/api/attempts/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findAttempt, listAttemptAnswers, isActiveRecruit } = vi.hoisted(() => ({
  auth: vi.fn(),
  findAttempt: vi.fn(),
  listAttemptAnswers: vi.fn(),
  isActiveRecruit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/attempts", () => ({ findAttempt, listAttemptAnswers }));
vi.mock("@/server/data/users", () => ({ isActiveRecruit }));

import { GET } from "./route";

const attempt = {
  id: "a1",
  userId: "owner",
  examType: "VUL",
  score: 0,
  totalItems: 0,
  passed: false,
  startedAt: new Date("2026-10-14T01:00:00.000Z"),
  completedAt: null,
  questionOrder: ["q1"],
};

const get = () =>
  GET(new Request("http://internal.local/api/attempts/a1"), {
    params: Promise.resolve({ id: "a1" }),
  });
const as = (id: string, role: "USER" | "MANAGER" | "ADMIN") =>
  auth.mockResolvedValue({ user: { id, role } });

beforeEach(() => {
  vi.clearAllMocks();
  as("owner", "USER");
  findAttempt.mockResolvedValue(attempt);
  listAttemptAnswers.mockResolvedValue([
    { id: "x1", questionId: "q1", selectedChoiceId: "c1", isCorrect: true, questionText: "Q?" },
  ]);
  isActiveRecruit.mockResolvedValue(false);
});

describe("GET /api/attempts/[id]", () => {
  it("answers the owner with the attempt and its answers", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      '{"id":"a1","user_id":"owner","exam_type":"VUL","score":0,"total_items":0,"passed":false,' +
        '"started_at":"2026-10-14T01:00:00.000Z","completed_at":null,"question_order":["q1"],' +
        '"answers":[{"id":"x1","question_id":"q1","selected_choice_id":"c1","is_correct":true,"question_text":"Q?"}]}',
    );
  });

  it("answers 404 for an attempt that does not exist", async () => {
    findAttempt.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Attempt not found" });
  });

  it("answers 403 to another learner", async () => {
    as("someone-else", "USER");
    expect((await get()).status).toBe(403);
    expect(listAttemptAnswers).not.toHaveBeenCalled();
  });

  it("lets the owner's active manager in, and no other manager", async () => {
    as("manager", "MANAGER");
    isActiveRecruit.mockResolvedValue(true);
    expect((await get()).status).toBe(200);
    expect(isActiveRecruit).toHaveBeenCalledWith("owner", "manager");

    isActiveRecruit.mockResolvedValue(false);
    expect((await get()).status).toBe(403);
  });

  it("lets a manager read their own attempt", async () => {
    as("owner", "MANAGER");
    expect((await get()).status).toBe(200);
  });

  it("lets an admin read any attempt", async () => {
    as("admin", "ADMIN");
    expect((await get()).status).toBe(200);
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });
});
```

- [ ] **Step 7: Run them to verify they fail**

Run: `pnpm test src/app/api/attempts/route.test.ts "src/app/api/attempts/[id]/route.test.ts"`
Expected: FAIL. The routes still import `@/lib/db`, and `GET` still exists on `/api/attempts`.

- [ ] **Step 8: Move the two routes**

Replace `src/app/api/attempts/route.ts` with:

```ts
import { auth } from "@/lib/auth";
import { lockReason } from "@/lib/helper/eligibility";
import { attemptJson } from "@/lib/helper/exam-json";
import { fetchEligibility } from "@/app/api/_lib/mastery";
import { isExamType } from "@/lib/types/common";
import { openAttempt } from "@/server/data/attempts";
import { NextResponse } from "next/server";

/**
 * Opens the practice exam on a track: the unfinished sitting if there is one
 * (200), otherwise a new one with its paper dealt (201). There is no GET:
 * the list it served had no callers and was removed in the Prisma move.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { exam_type } = body;

    if (!exam_type) {
      return NextResponse.json(
        { error: "exam_type is required" },
        { status: 400 },
      );
    }
    if (!isExamType(exam_type)) {
      return NextResponse.json(
        { error: "exam_type is invalid" },
        { status: 400 },
      );
    }

    // The UI locks the entry point, but the gate has to live here too — the
    // lock is presentation, this is the rule.
    const eligibility = await fetchEligibility(session.user.id, exam_type);

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error:
            lockReason(eligibility.flashcards, eligibility.memorization) ??
            "You are not eligible for this practice exam yet.",
          eligibility,
        },
        { status: 403 },
      );
    }

    const { attempt, created } = await openAttempt(session.user.id, exam_type);
    return NextResponse.json(
      attemptJson(attempt),
      created ? { status: 201 } : undefined,
    );
  } catch (error) {
    console.error("Error starting attempt:", error);
    return NextResponse.json(
      { error: "Failed to start attempt" },
      { status: 500 },
    );
  }
}
```

Replace `src/app/api/attempts/[id]/route.ts` with:

```ts
import { auth } from "@/lib/auth";
import { attemptJson, reviewedAnswerJson } from "@/lib/helper/exam-json";
import { findAttempt, listAttemptAnswers } from "@/server/data/attempts";
import { isActiveRecruit } from "@/server/data/users";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { role, id: currentUserId } = session.user;

  try {
    const attempt = await findAttempt(id);

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // ownership / access check
    if (role === "ADMIN") {
      // no restriction
    } else if (role === "MANAGER") {
      const isOwnAttempt = attempt.userId === currentUserId;
      if (!isOwnAttempt && !(await isActiveRecruit(attempt.userId, currentUserId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (attempt.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answers = await listAttemptAnswers(id);

    return NextResponse.json({
      ...attemptJson(attempt),
      answers: answers.map(reviewedAnswerJson),
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 },
    );
  }
}
```

The old code asked the database about a manager's recruit even when the attempt was the manager's own. The new code checks ownership first. The answer is the same in every case.

- [ ] **Step 9: Run the tests and typecheck**

Run: `pnpm test src/app/api/attempts` then `pnpm typecheck`
Expected: PASS; typecheck exit 0.

- [ ] **Step 10: Commit**

```bash
git add src/server/data/attempts.ts src/server/data/attempts.db.test.ts src/server/data/users.ts src/server/data/users.db.test.ts src/app/api/attempts/route.ts src/app/api/attempts/route.test.ts "src/app/api/attempts/[id]/route.ts" "src/app/api/attempts/[id]/route.test.ts"
git commit -m "refactor: start, resume and read practice exam sittings through the attempts module"
```

---

### Task 3: Save answers, score sittings and issue certificates

**Files:**
- Modify: `src/server/data/attempts.ts`, `src/server/data/attempts.db.test.ts`
- Create: `src/server/data/certificates.ts`, `src/server/data/certificates.db.test.ts`
- Modify: `src/app/api/attempts/[id]/answers/route.ts`, `src/app/api/attempts/[id]/complete/route.ts`
- Create: `src/app/api/attempts/[id]/answers/route.test.ts`, `src/app/api/attempts/[id]/complete/route.test.ts`
- Delete: `src/app/api/_lib/certificates.ts`

**Interfaces:**
- Consumes: `attemptSelect`, `asAttempt`, `TRANSACTION_OPTIONS`, `AttemptRecord`, `openAttempt` (Task 2); `attemptJson`, `examAnswerJson`, `certificateJson`, `certificateNumber` (Task 1); `sittingPassed`, `cappedPasses`, `PASSES_REQUIRED` from `@/lib/helper/practice-exam`.
- Produces (in `attempts.ts`):
  - `findAttemptOwner(attemptId: string): Promise<string | null>`
  - `choiceCorrectness(choiceId: string, questionId: string): Promise<boolean | null>` (null: the choice is not one of that question's options)
  - `type ExamAnswerRecord = { id: string; attemptId: string; questionId: string; selectedChoiceId: string | null; isCorrect: boolean }`
  - `recordExamAnswer(input: { attemptId: string; userId: string; questionId: string; selectedChoiceId: string; isCorrect: boolean }): Promise<ExamAnswerRecord>`
  - `completeAttempt(attemptId: string): Promise<{ attempt: AttemptRecord; passes: number }>`. `passes` is the raw count of completed passing sittings on the track; the route caps it.
- Produces (in `certificates.ts`):
  - `type CertificateRecord = { id: string; userId: string; examType: ExamType; issuedAt: Date; certificateNo: string }`
  - `issueCertificate(userId: string, examType: ExamType): Promise<CertificateRecord | null>`
  - The module-private `certificateSelect` and `asCertificate` are reused by Task 4.

- [ ] **Step 1: Write the failing DB tests for answers and scoring**

In `src/server/data/attempts.db.test.ts`, add `choiceCorrectness`, `completeAttempt`, `findAttemptOwner` and `recordExamAnswer` to the import from `./attempts`, then append:

```ts
/** A sitting on a fresh track of `n` questions, with each question's right and wrong choice. */
async function sitting(n: number) {
  const me = await user();
  const qs: { id: string; right: string; wrong: string }[] = [];
  for (let i = 0; i < n; i++) {
    const id = await question("VUL");
    const choices = await prisma.choice.findMany({
      where: { questionId: id },
      select: { id: true, isCorrect: true },
    });
    qs.push({
      id,
      right: choices.find((c) => c.isCorrect)!.id,
      wrong: choices.find((c) => !c.isCorrect)!.id,
    });
  }
  const { attempt } = await openAttempt(me.id, "VUL");
  return { me, qs, attempt };
}

const answer = (
  s: Awaited<ReturnType<typeof sitting>>,
  i: number,
  right: boolean,
) =>
  recordExamAnswer({
    attemptId: s.attempt.id,
    userId: s.me.id,
    questionId: s.qs[i].id,
    selectedChoiceId: right ? s.qs[i].right : s.qs[i].wrong,
    isCorrect: right,
  });

const progressOf = (userId: string, questionId: string) =>
  prisma.questionProgress.findUniqueOrThrow({
    where: { userId_questionId: { userId, questionId } },
    select: { isCorrect: true, timesSeen: true, timesCorrect: true, mastered: true },
  });

describe("answers", () => {
  it("knows an attempt's owner, and null for no attempt", async () => {
    const s = await sitting(1);
    expect(await findAttemptOwner(s.attempt.id)).toBe(s.me.id);
    expect(await findAttemptOwner("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("says whether a choice is right, and null for another question's choice", async () => {
    const s = await sitting(2);
    expect(await choiceCorrectness(s.qs[0].right, s.qs[0].id)).toBe(true);
    expect(await choiceCorrectness(s.qs[0].wrong, s.qs[0].id)).toBe(false);
    expect(await choiceCorrectness(s.qs[1].right, s.qs[0].id)).toBeNull();
  });

  it("saves an answer and the learner's question progress", async () => {
    const s = await sitting(1);

    const saved = await answer(s, 0, true);

    expect(saved).toEqual({
      id: expect.any(String),
      attemptId: s.attempt.id,
      questionId: s.qs[0].id,
      selectedChoiceId: s.qs[0].right,
      isCorrect: true,
    });
    expect(await progressOf(s.me.id, s.qs[0].id)).toEqual({
      isCorrect: true,
      timesSeen: 1,
      timesCorrect: 1,
      mastered: true,
    });
  });

  it("replaces a changed answer, and a wrong one un-masters the question", async () => {
    const s = await sitting(1);
    const first = await answer(s, 0, true);

    const second = await answer(s, 0, false);

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ selectedChoiceId: s.qs[0].wrong, isCorrect: false });
    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: s.attempt.id } })).toBe(1);
    expect(await progressOf(s.me.id, s.qs[0].id)).toEqual({
      isCorrect: false,
      timesSeen: 2,
      timesCorrect: 1,
      mastered: false,
    });
  });

  it("keeps one answer row when the same answer arrives twice at once", async () => {
    const s = await sitting(1);

    await Promise.all([answer(s, 0, true), answer(s, 0, true)]);

    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: s.attempt.id } })).toBe(1);
    expect(await progressOf(s.me.id, s.qs[0].id)).toMatchObject({ timesSeen: 2, timesCorrect: 2 });
  });
});

describe("completeAttempt", () => {
  const passCount = (userId: string) =>
    prisma.userProgress.findUnique({
      where: { userId_examType: { userId, examType: "VUL" } },
      select: { passCount: true },
    });

  it("scores the saved answers and counts a pass at 75%", async () => {
    const s = await sitting(4);
    await answer(s, 0, true);
    await answer(s, 1, true);
    await answer(s, 2, true);
    await answer(s, 3, false);

    const { attempt, passes } = await completeAttempt(s.attempt.id);

    expect(attempt).toMatchObject({ id: s.attempt.id, score: 3, totalItems: 4, passed: true });
    expect(attempt.completedAt).toBeInstanceOf(Date);
    expect(passes).toBe(1);
    expect(await passCount(s.me.id)).toEqual({ passCount: 1 });
  });

  it("records a fail without touching the pass count", async () => {
    const s = await sitting(4);
    await answer(s, 0, true);
    await answer(s, 1, true);
    await answer(s, 2, false);
    await answer(s, 3, false);

    const { attempt, passes } = await completeAttempt(s.attempt.id);

    expect(attempt).toMatchObject({ score: 2, totalItems: 4, passed: false });
    expect(passes).toBe(0);
    expect(await passCount(s.me.id)).toBeNull();
  });

  it("counts passes off the completed sittings, not the open one", async () => {
    const s = await sitting(1);
    await answer(s, 0, true);
    await completeAttempt(s.attempt.id);

    const next = await openAttempt(s.me.id, "VUL");
    await recordExamAnswer({
      attemptId: next.attempt.id,
      userId: s.me.id,
      questionId: s.qs[0].id,
      selectedChoiceId: s.qs[0].right,
      isCorrect: true,
    });
    const { passes } = await completeAttempt(next.attempt.id);

    expect(passes).toBe(2);
    expect(await passCount(s.me.id)).toEqual({ passCount: 2 });
  });
});
```

`sitting(n)` opens a VUL attempt whose paper is every VUL question in the test DB, not just these `n`. Scoring counts saved answers only, so the extra questions don't change the results.

- [ ] **Step 2: Write the failing DB tests for certificates**

Create `src/server/data/certificates.db.test.ts`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { issueCertificate } from "./certificates";

const made: string[] = [];
afterAll(async () => {
  await deleteUsers(...made);
});

async function user() {
  const created = await createUser();
  made.push(created.id);
  return created;
}

describe("issueCertificate", () => {
  it("issues a numbered certificate dated now", async () => {
    const me = await user();

    const certificate = await issueCertificate(me.id, "VUL");

    expect(certificate).toMatchObject({ userId: me.id, examType: "VUL" });
    expect(certificate!.certificateNo).toMatch(
      new RegExp(`^INS-${certificate!.issuedAt.getUTCFullYear()}-VUL-[0-9A-F]{6}$`),
    );
    expect(Math.abs(certificate!.issuedAt.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("returns the certificate already held instead of minting a second", async () => {
    const me = await user();
    const first = await issueCertificate(me.id, "TRADITIONAL_LIFE");

    expect(await issueCertificate(me.id, "TRADITIONAL_LIFE")).toEqual(first);
    expect(await prisma.certificate.count({ where: { userId: me.id } })).toBe(1);
  });

  it("hands both of two simultaneous requests the same certificate", async () => {
    const me = await user();

    const [a, b] = await Promise.all([
      issueCertificate(me.id, "IIAP_A"),
      issueCertificate(me.id, "IIAP_A"),
    ]);

    expect(a).not.toBeNull();
    expect(b).toEqual(a);
    expect(await prisma.certificate.count({ where: { userId: me.id } })).toBe(1);
  });

  it("issues one per track", async () => {
    const me = await user();
    const vul = await issueCertificate(me.id, "VUL");
    const iiap = await issueCertificate(me.id, "IIAP_B");
    expect(vul!.id).not.toBe(iiap!.id);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm test:db src/server/data/attempts.db.test.ts src/server/data/certificates.db.test.ts`
Expected: FAIL. The new functions and `./certificates` don't exist.

- [ ] **Step 4: Add the writes to `attempts.ts`**

Add this import at the top of `src/server/data/attempts.ts`, after the `ExamType` import:

```ts
import { sittingPassed } from "@/lib/helper/practice-exam";
```

Append:

```ts
/** Who an attempt belongs to; null if there is no such attempt. */
export async function findAttemptOwner(attemptId: string): Promise<string | null> {
  const row = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

/** Whether a choice is right; null if it is not one of that question's options. */
export async function choiceCorrectness(
  choiceId: string,
  questionId: string,
): Promise<boolean | null> {
  const choice = await prisma.choice.findFirst({
    where: { id: choiceId, questionId },
    select: { isCorrect: true },
  });
  return choice?.isCorrect ?? null;
}

export type ExamAnswerRecord = {
  id: string;
  attemptId: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
};

/**
 * Saves one answer against a sitting, and the learner's progress on that
 * question, together.
 *
 * Answers are saved as they are picked, so the same question arrives again
 * whenever the learner changes their mind. The row is replaced rather than
 * added to: two rows for one question would both count toward the score.
 * Question progress counts every answer, and `mastered` follows the latest
 * one, so a question answered wrong after being right is no longer mastered.
 */
export async function recordExamAnswer(input: {
  attemptId: string;
  userId: string;
  questionId: string;
  selectedChoiceId: string;
  isCorrect: boolean;
}): Promise<ExamAnswerRecord> {
  const { attemptId, userId, questionId, selectedChoiceId, isCorrect } = input;

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const saved = await tx.examAttemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, selectedChoiceId, isCorrect },
      update: { selectedChoiceId, isCorrect },
      select: {
        id: true,
        attemptId: true,
        questionId: true,
        selectedChoiceId: true,
        isCorrect: true,
      },
    });

    await tx.questionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: {
        userId,
        questionId,
        selectedChoiceId,
        isCorrect,
        timesSeen: 1,
        timesCorrect: isCorrect ? 1 : 0,
        mastered: isCorrect,
        lastReviewedAt: now,
      },
      update: {
        selectedChoiceId,
        isCorrect,
        timesSeen: { increment: 1 },
        timesCorrect: { increment: isCorrect ? 1 : 0 },
        mastered: isCorrect,
        lastReviewedAt: now,
      },
    });

    return saved;
  }, TRANSACTION_OPTIONS);
}

/**
 * Scores a sitting from the answers saved against it and closes it. A pass
 * adds to user_progress.pass_count; the set_updated_at trigger stamps it.
 *
 * The passes returned are counted off the attempts themselves rather than
 * the running total, so a result screen can never disagree with the roster
 * that reads the same rows.
 */
export async function completeAttempt(
  attemptId: string,
): Promise<{ attempt: AttemptRecord; passes: number }> {
  return prisma.$transaction(async (tx) => {
    const answers = await tx.examAttemptAnswer.findMany({
      where: { attemptId },
      select: { isCorrect: true },
    });
    const totalItems = answers.length;
    const score = answers.filter((a) => a.isCorrect).length;
    const passed = sittingPassed(score, totalItems);

    const row = await tx.examAttempt.update({
      where: { id: attemptId },
      data: { score, totalItems, passed, completedAt: new Date() },
      select: attemptSelect,
    });

    const track = { userId: row.userId, examType: row.examType };
    if (passed) {
      await tx.userProgress.upsert({
        where: { userId_examType: track },
        create: { ...track, passCount: 1 },
        update: { passCount: { increment: 1 } },
      });
    }

    const passes = await tx.examAttempt.count({
      where: { ...track, passed: true, completedAt: { not: null } },
    });

    return { attempt: asAttempt(row), passes };
  }, TRANSACTION_OPTIONS);
}
```

- [ ] **Step 5: Write `certificates.ts`**

Create `src/server/data/certificates.ts`:

```ts
import "server-only";
import { randomUUID } from "node:crypto";
import prisma from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { certificateNumber } from "@/lib/helper/certificate-number";
import type { ExamType } from "@/lib/types/common";

/**
 * Certificates: one per learner per cleared track. Every query on the
 * certificates table goes through here.
 */

export type CertificateRecord = {
  id: string;
  userId: string;
  examType: ExamType;
  issuedAt: Date;
  certificateNo: string;
};

const certificateSelect = {
  id: true,
  userId: true,
  examType: true,
  issuedAt: true,
  certificateNo: true,
} as const;

type CertificateRow = Prisma.CertificateGetPayload<{ select: typeof certificateSelect }>;

// Legacy IIAP rows are passed through, as everywhere else.
const asCertificate = (row: CertificateRow): CertificateRecord => ({
  ...row,
  examType: row.examType as ExamType,
});

/**
 * The certificate a user holds for a track, issuing it if the track has just
 * been cleared.
 *
 * Called on the sitting that takes a learner to the fifth pass, and on every
 * sitting after it, so it has to be idempotent. The unique key on
 * (user_id, exam_type) is what makes it safe: of two requests racing, one
 * inserts and the other hits the key (P2002) and reads the row that won.
 */
export async function issueCertificate(
  userId: string,
  examType: ExamType,
): Promise<CertificateRecord | null> {
  const issuedAt = new Date();
  try {
    const created = await prisma.certificate.create({
      data: {
        userId,
        examType,
        issuedAt,
        certificateNo: certificateNumber(examType, issuedAt, randomUUID()),
      },
      select: certificateSelect,
    });
    return asCertificate(created);
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_examType: { userId, examType } },
    select: certificateSelect,
  });
  return existing ? asCertificate(existing) : null;
}
```

- [ ] **Step 6: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/attempts.db.test.ts src/server/data/certificates.db.test.ts`
Expected: PASS. The concurrent-answer test proves Prisma ran the compound upserts as native `INSERT ... ON CONFLICT`, as Wave 2 found. If it fails with P2002, stop and report it rather than adding a retry.

- [ ] **Step 7: Write the failing route tests**

Create `src/app/api/attempts/[id]/answers/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findAttemptOwner, choiceCorrectness, recordExamAnswer } = vi.hoisted(() => ({
  auth: vi.fn(),
  findAttemptOwner: vi.fn(),
  choiceCorrectness: vi.fn(),
  recordExamAnswer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/attempts", () => ({
  findAttemptOwner,
  choiceCorrectness,
  recordExamAnswer,
}));

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

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await post(body)).status).toBe(401);
  });
});
```

Create `src/app/api/attempts/[id]/complete/route.test.ts`:

```ts
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
```

- [ ] **Step 8: Run them to verify they fail**

Run: `pnpm test "src/app/api/attempts/[id]"`
Expected: the `answers` and `complete` tests FAIL; the `[id]` route tests from Task 2 still pass.

- [ ] **Step 9: Move the two routes and delete `_lib/certificates.ts`**

Replace `src/app/api/attempts/[id]/answers/route.ts` with:

```ts
import { auth } from "@/lib/auth";
import { examAnswerJson } from "@/lib/helper/exam-json";
import {
  choiceCorrectness,
  findAttemptOwner,
  recordExamAnswer,
} from "@/server/data/attempts";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    // check ownership before writing anything
    const userId = await findAttemptOwner(attemptId);

    if (!userId) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { question_id, selected_choice_id } = body;

    if (!question_id || !selected_choice_id) {
      return NextResponse.json(
        { error: "question_id and selected_choice_id are required" },
        { status: 400 },
      );
    }

    const isCorrect = await choiceCorrectness(selected_choice_id, question_id);

    if (isCorrect === null) {
      return NextResponse.json(
        { error: "Choice not found for this question" },
        { status: 404 },
      );
    }

    const saved = await recordExamAnswer({
      attemptId,
      userId,
      questionId: question_id,
      selectedChoiceId: selected_choice_id,
      isCorrect,
    });

    return NextResponse.json(examAnswerJson(saved), { status: 201 });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 },
    );
  }
}
```

Replace `src/app/api/attempts/[id]/complete/route.ts` with:

```ts
import { auth } from "@/lib/auth";
import { attemptJson, certificateJson } from "@/lib/helper/exam-json";
import { PASSES_REQUIRED, cappedPasses } from "@/lib/helper/practice-exam";
import { completeAttempt, findAttemptOwner } from "@/server/data/attempts";
import { issueCertificate } from "@/server/data/certificates";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    // fetch the attempt first to check ownership before mutating anything
    const owner = await findAttemptOwner(attemptId);

    if (!owner) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (owner !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { attempt, passes: counted } = await completeAttempt(attemptId);
    const passes = cappedPasses(counted);

    // The fifth pass is what earns the certificate, and every sitting after
    // it asks again — so this returns the certificate already held rather
    // than minting a second one.
    const certificate =
      passes >= PASSES_REQUIRED
        ? await issueCertificate(attempt.userId, attempt.examType)
        : null;

    return NextResponse.json({
      ...attemptJson(attempt),
      passes,
      passes_required: PASSES_REQUIRED,
      track_passed: passes >= PASSES_REQUIRED,
      certificate: certificate ? certificateJson(certificate) : null,
    });
  } catch (error) {
    console.error("Error completing attempt:", error);
    return NextResponse.json(
      { error: "Failed to complete attempt" },
      { status: 500 },
    );
  }
}
```

Then delete the old helper, which now has no callers:

```bash
git grep -n "_lib/certificates" -- src scripts
```
Expected: no output. If anything else imports it, stop and report.

```bash
git rm src/app/api/_lib/certificates.ts
```

- [ ] **Step 10: Run the tests and typecheck**

Run: `pnpm test src/app/api/attempts` then `pnpm typecheck`
Expected: PASS; typecheck exit 0.

- [ ] **Step 11: Commit**

```bash
git add -A src/server/data/attempts.ts src/server/data/attempts.db.test.ts src/server/data/certificates.ts src/server/data/certificates.db.test.ts "src/app/api/attempts/[id]/answers" "src/app/api/attempts/[id]/complete" src/app/api/_lib/certificates.ts
git commit -m "refactor: save exam answers, score sittings and issue certificates through Prisma"
```

---

### Task 4: Certificate pages and image read through `certificates.ts`

**Files:**
- Modify: `src/server/data/certificates.ts`, `src/server/data/certificates.db.test.ts`
- Modify: `src/app/api/certificates/[id]/image/route.tsx`, `src/app/api/certificates/[id]/image/route.test.ts`
- Modify: `src/app/certificates/page.tsx`, `src/app/certificates/[id]/page.tsx`

**Interfaces:**
- Consumes: `certificateSelect`, `asCertificate`, `CertificateRecord`, `issueCertificate` (Task 3); `listCompletedSittings` (Task 2).
- Produces (in `certificates.ts`):
  - `listCertificates(userId: string): Promise<CertificateRecord[]>`, newest first
  - `type HeldCertificate = { id: string; examType: ExamType; issuedAt: Date; certificateNo: string; recipient: string }`
  - `findHeldCertificate(id: string, userId: string): Promise<HeldCertificate | null>`

- [ ] **Step 1: Write the failing DB tests**

In `src/server/data/certificates.db.test.ts`, change the module import to `import { findHeldCertificate, issueCertificate, listCertificates } from "./certificates";` and append:

```ts
describe("reading certificates", () => {
  it("lists a holder's certificates newest first", async () => {
    const me = await user();
    const older = await prisma.certificate.create({
      data: { userId: me.id, examType: "VUL", certificateNo: `T-${me.id}-1`, issuedAt: new Date("2026-01-01T00:00:00.000Z") },
      select: { id: true },
    });
    const newer = await prisma.certificate.create({
      data: { userId: me.id, examType: "IIAP_A", certificateNo: `T-${me.id}-2`, issuedAt: new Date("2026-02-01T00:00:00.000Z") },
      select: { id: true },
    });

    expect((await listCertificates(me.id)).map((c) => c.id)).toEqual([newer.id, older.id]);
  });

  it("finds a certificate for its holder, named off the holder's own row", async () => {
    const me = await user();
    const issued = await issueCertificate(me.id, "VUL");
    const { name } = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true } });

    expect(await findHeldCertificate(issued!.id, me.id)).toEqual({
      id: issued!.id,
      examType: "VUL",
      issuedAt: issued!.issuedAt,
      certificateNo: issued!.certificateNo,
      recipient: name,
    });
  });

  it("treats someone else's certificate as one that does not exist", async () => {
    const holder = await user();
    const stranger = await user();
    const issued = await issueCertificate(holder.id, "VUL");

    expect(await findHeldCertificate(issued!.id, stranger.id)).toBeNull();
    expect(await findHeldCertificate("00000000-0000-4000-8000-000000000000", holder.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:db src/server/data/certificates.db.test.ts`
Expected: FAIL. `listCertificates` and `findHeldCertificate` aren't exported.

- [ ] **Step 3: Add the reads to `certificates.ts`**

Append to `src/server/data/certificates.ts`:

```ts
/** Every certificate a learner holds, newest first. */
export async function listCertificates(userId: string): Promise<CertificateRecord[]> {
  const rows = await prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    select: certificateSelect,
  });
  return rows.map(asCertificate);
}

export type HeldCertificate = {
  id: string;
  examType: ExamType;
  issuedAt: Date;
  certificateNo: string;
  recipient: string;
};

/**
 * One certificate, only if userId holds it. Scoped to the holder in the
 * query itself: someone else's certificate should be indistinguishable from
 * one that does not exist. The name is the holder's own, off their user row.
 */
export async function findHeldCertificate(
  id: string,
  userId: string,
): Promise<HeldCertificate | null> {
  const row = await prisma.certificate.findFirst({
    where: { id, userId },
    select: {
      id: true,
      examType: true,
      issuedAt: true,
      certificateNo: true,
      user: { select: { name: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    examType: row.examType as ExamType,
    issuedAt: row.issuedAt,
    certificateNo: row.certificateNo,
    recipient: row.user.name,
  };
}
```

- [ ] **Step 4: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/certificates.db.test.ts`
Expected: PASS.

- [ ] **Step 5: Switch the image route test to the data module**

In `src/app/api/certificates/[id]/image/route.test.ts`, make these changes:

Replace the hoisted block and the `@/lib/db` mock:

```ts
const { auth, query, ImageResponse } = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  ImageResponse: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ default: { query } }));
```

with:

```ts
const { auth, findHeldCertificate, ImageResponse } = vi.hoisted(() => ({
  auth: vi.fn(),
  findHeldCertificate: vi.fn(),
  ImageResponse: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/certificates", () => ({ findHeldCertificate }));
```

Replace the `row` helper:

```ts
/** What the join returns for a certificate that belongs to the caller. */
const row = (name: string) => ({
  id: CERTIFICATE,
  exam_type: "VUL",
  issued_at: new Date("2026-03-01T00:00:00Z"),
  certificate_no: "INS-2026-0042",
  recipient: name,
});
```

with:

```ts
/** What the data module returns for a certificate that belongs to the caller. */
const held = (name: string) => ({
  id: CERTIFICATE,
  examType: "VUL",
  issuedAt: new Date("2026-03-01T00:00:00Z"),
  certificateNo: "INS-2026-0042",
  recipient: name,
});
```

In `beforeEach`, replace `query.mockResolvedValue({ rowCount: 1, rows: [row("Maria Clara Santos")] });` with `findHeldCertificate.mockResolvedValue(held("Maria Clara Santos"));`.

In "puts each holder's own name on their sheet", replace `query.mockResolvedValue({ rowCount: 1, rows: [row("Jose Rizal Mercado")] });` with `findHeldCertificate.mockResolvedValue(held("Jose Rizal Mercado"));`.

Replace the body of "scopes the lookup to the signed-in user" with:

```ts
    await GET(request(), params());

    expect(findHeldCertificate).toHaveBeenCalledWith(CERTIFICATE, HOLDER);
```

In "404s a certificate that is not the caller's", replace `query.mockResolvedValue({ rowCount: 0, rows: [] });` with `findHeldCertificate.mockResolvedValue(null);`.

In "401s a caller with no session", replace `expect(query).not.toHaveBeenCalled();` with `expect(findHeldCertificate).not.toHaveBeenCalled();`.

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm test "src/app/api/certificates/[id]/image/route.test.ts"`
Expected: FAIL. The route still queries `@/lib/db`, which is no longer mocked.

- [ ] **Step 7: Move the image route**

In `src/app/api/certificates/[id]/image/route.tsx`:

Replace `import pool from "@/lib/db";` with `import { findHeldCertificate } from "@/server/data/certificates";`, and delete the `import type { ExamType } from "@/lib/types/common";` line and the whole `type CertificateRow = { ... };` block.

Replace:

```ts
  const result = await pool.query(
    `SELECT c.id, c.exam_type, c.issued_at, c.certificate_no, u.name AS recipient
       FROM certificates c
       JOIN users u ON u.id = c.user_id
      WHERE c.id = $1 AND c.user_id = $2`,
    [id, session.user.id],
  );

  const certificate = result.rows[0] as CertificateRow | undefined;
  if (!certificate) {
```

with:

```ts
  const certificate = await findHeldCertificate(id, session.user.id);
  if (!certificate) {
```

Then rename the field reads below it: `certificate.exam_type` → `certificate.examType`, and `certificate.certificate_no` → `certificate.certificateNo`. Keep the comment above the lookup ("Scoped to the holder in the query itself…").

- [ ] **Step 8: Run it to verify it passes**

Run: `pnpm test "src/app/api/certificates/[id]/image/route.test.ts"`
Expected: PASS, 8 tests.

- [ ] **Step 9: Move the two certificate pages**

In `src/app/certificates/page.tsx`:

Replace the imports

```ts
import pool from "@/lib/db";
import { trackRecord, type Sitting } from "@/lib/helper/certificate-record";
import { isStaff } from "@/lib/helper/roles";
import type { Certificate as CertificateRow } from "@/lib/types/attempt";
import { examTypes, type ExamType } from "@/lib/types/common";
```

with:

```ts
import { trackRecord, type Sitting } from "@/lib/helper/certificate-record";
import { isStaff } from "@/lib/helper/roles";
import { examTypes, type ExamType } from "@/lib/types/common";
import { listCompletedSittings } from "@/server/data/attempts";
import { listCertificates } from "@/server/data/certificates";
```

Delete `type SittingRow = Sitting & { exam_type: ExamType };`.

Replace everything from `const [certificateResult, sittingResult] = await Promise.all([` through the end of the `for (const row of sittingResult.rows as SittingRow[]) { ... }` loop with:

```ts
  const [held, completed] = await Promise.all([
    listCertificates(session.user.id),
    listCompletedSittings(session.user.id),
  ]);

  const certificates = held.map((row) => ({
    id: row.id,
    exam_type: row.examType,
    certificate_no: row.certificateNo,
    issued_at: row.issuedAt.toISOString(),
  }));

  const sittings = new Map<ExamType, Sitting[]>();
  for (const row of completed) {
    const track = sittings.get(row.examType) ?? [];
    track.push({
      passed: row.passed,
      score: row.score,
      total_items: row.totalItems,
      completed_at: row.completedAt.toISOString(),
    });
    sittings.set(row.examType, track);
  }
```

Keep the comment above it ("The certificates say which tracks were cleared…") and everything from `const standings` down unchanged.

In `src/app/certificates/[id]/page.tsx`:

Replace the imports `import pool from "@/lib/db";` and `import type { Certificate as CertificateRow } from "@/lib/types/attempt";` with `import { findHeldCertificate } from "@/server/data/certificates";`.

Replace:

```ts
  const result = await pool.query(
    `SELECT c.id, c.exam_type, c.issued_at, c.certificate_no, u.name AS recipient
       FROM certificates c
       JOIN users u ON u.id = c.user_id
      WHERE c.id = $1 AND c.user_id = $2`,
    [id, session.user.id],
  );

  const certificate = result.rows[0] as
    | (CertificateRow & { recipient: string })
    | undefined;
  if (!certificate) {
```

with:

```ts
  const certificate = await findHeldCertificate(id, session.user.id);
  if (!certificate) {
```

Then rename the reads below: `new Date(certificate.issued_at).toLocaleDateString(` → `certificate.issuedAt.toLocaleDateString(`, every `certificate.exam_type` → `certificate.examType`, and `certificate.certificate_no` → `certificate.certificateNo`.

- [ ] **Step 10: Confirm Wave 3 no longer touches `pg`, then typecheck, lint and test**

Run: `git grep -l "@/lib/db" -- src/app/api/attempts src/app/api/certificates src/app/certificates src/app/api/_lib`
Expected: only `src/app/api/_lib/audit-store.ts` and `src/app/api/_lib/presence-store.ts` (Wave 4).

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test`
Expected: exit 0, 0 errors, all pass.

- [ ] **Step 11: Commit**

```bash
git add src/server/data/certificates.ts src/server/data/certificates.db.test.ts "src/app/api/certificates/[id]/image" src/app/certificates/page.tsx "src/app/certificates/[id]/page.tsx"
git commit -m "refactor: read certificates and their pages through the certificates module"
```

---

### Task 5: Exam parity against the production restore

**Files:**
- Create: `scripts/parity/exams-parity.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `findAttempt`, `findOpenAttempt`, `listAttemptAnswers`, `listCompletedSittings` (Task 2); `listCertificates`, `findHeldCertificate` (Tasks 3–4); `attemptJson`, `reviewedAnswerJson`, `certificateJson` (Task 1); `trackRecord` from `src/lib/helper/certificate-record`.
- Produces: `pnpm parity:exams`. It exits 1 on any difference.

The parity script only reads. It never calls `openAttempt`, `recordExamAnswer`, `completeAttempt` or `issueCertificate`, because those write; the DB tests cover them.

- [ ] **Step 1: Add the script entry**

In `package.json` `scripts`, after `"parity:content"`, add:

```json
"parity:exams": "tsx --conditions=react-server scripts/parity/exams-parity.ts",
```

- [ ] **Step 2: Write the script**

Create `scripts/parity/exams-parity.ts`:

```ts
// Compares the pre-Prisma exam and certificate SQL with
// src/server/data/attempts.ts and certificates.ts on the local dev copy.
// Exit code 1 on any difference. Run: pnpm parity:exams
//
// The old queries are copied from the routes and pages as they stood before
// Wave 3 (commit bdcca51), so this stays a fixed reference after they change.
// Read-only: nothing here writes.
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";
import { examTypes } from "../../src/lib/types/common";
import { trackRecord, type Sitting } from "../../src/lib/helper/certificate-record";
import {
  attemptJson,
  certificateJson,
  reviewedAnswerJson,
} from "../../src/lib/helper/exam-json";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];

// JSON round trip: Dates become the ISO strings the API sends.
const json = (value: unknown) => JSON.stringify(JSON.parse(JSON.stringify(value ?? null)));

function same(label: string, oldValue: unknown, newValue: unknown) {
  const a = json(oldValue);
  const b = json(newValue);
  if (a !== b) diffs.push(`${label}\n  old: ${a}\n  new: ${b}`);
}

/** Unordered lists (the old answers query had no ORDER BY): compare by id. */
function sameById(label: string, oldRows: { id: string }[], newRows: { id: string }[]) {
  const byId = new Map(newRows.map((r) => [r.id, r]));
  for (const row of oldRows) same(`${label} ${row.id}`, row, byId.get(row.id));
  if (oldRows.length !== newRows.length) {
    diffs.push(`${label}: ${oldRows.length} rows vs ${newRows.length}`);
  }
}

const OLD_ATTEMPT = `SELECT * FROM exam_attempts WHERE id = $1`;

const OLD_OPEN = `
  SELECT * FROM exam_attempts
   WHERE user_id = $1 AND exam_type = $2 AND completed_at IS NULL
   ORDER BY started_at DESC
   LIMIT 1`;

const OLD_ANSWERS = `
  SELECT a.id, a.question_id, a.selected_choice_id, a.is_correct, q.text AS question_text
    FROM exam_attempt_answers a
    JOIN questions q ON q.id = a.question_id
   WHERE a.attempt_id = $1`;

const OLD_CERTIFICATES = `
  SELECT id, exam_type, issued_at, certificate_no
    FROM certificates
   WHERE user_id = $1
   ORDER BY issued_at DESC`;

const OLD_SITTINGS = `
  SELECT exam_type, passed, score, total_items, completed_at
    FROM exam_attempts
   WHERE user_id = $1 AND completed_at IS NOT NULL
   ORDER BY completed_at ASC`;

const OLD_HELD = `
  SELECT c.id, c.exam_type, c.issued_at, c.certificate_no, u.name AS recipient
    FROM certificates c
    JOIN users u ON u.id = c.user_id
   WHERE c.id = $1 AND c.user_id = $2`;

// The old complete route returned certificates' RETURNING * row.
const OLD_CERTIFICATE_ROW = `SELECT * FROM certificates WHERE id = $1`;

async function main() {
  const attempts = await import("../../src/server/data/attempts");
  const certificates = await import("../../src/server/data/certificates");

  const attemptIds = (await pool.query(`SELECT id::text FROM exam_attempts`)).rows.map(
    (r) => r.id as string,
  );
  console.log(`Comparing ${attemptIds.length} attempts and their answers…`);
  for (const id of attemptIds) {
    const found = await attempts.findAttempt(id);
    same(`attempt ${id}`, (await pool.query(OLD_ATTEMPT, [id])).rows[0], found && attemptJson(found));
    sameById(
      `answers ${id}`,
      (await pool.query(OLD_ANSWERS, [id])).rows,
      (await attempts.listAttemptAnswers(id)).map(reviewedAnswerJson),
    );
  }

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map((r) => r.id as string);
  console.log(`Comparing open sittings, sittings, records and certificates for ${users.length} users…`);
  for (const userId of users) {
    for (const examType of examTypes) {
      const open = await attempts.findOpenAttempt(userId, examType);
      same(
        `open ${userId} ${examType}`,
        (await pool.query(OLD_OPEN, [userId, examType])).rows[0],
        open && attemptJson(open),
      );
    }

    // The page's sittings, and the record it computes per track from them.
    const oldSittings = (await pool.query(OLD_SITTINGS, [userId])).rows.map((r) => ({
      exam_type: r.exam_type,
      passed: r.passed,
      score: r.score,
      total_items: r.total_items,
      completed_at: new Date(r.completed_at).toISOString(),
    }));
    const newSittings = (await attempts.listCompletedSittings(userId)).map((r) => ({
      exam_type: r.examType,
      passed: r.passed,
      score: r.score,
      total_items: r.totalItems,
      completed_at: r.completedAt.toISOString(),
    }));
    same(`sittings ${userId}`, oldSittings, newSittings);
    for (const examType of examTypes) {
      const of = (rows: typeof oldSittings): Sitting[] =>
        rows
          .filter((r) => r.exam_type === examType)
          .map(({ passed, score, total_items, completed_at }) => ({ passed, score, total_items, completed_at }));
      same(`record ${userId} ${examType}`, trackRecord(of(oldSittings)), trackRecord(of(newSittings)));
    }

    const oldCertificates = (await pool.query(OLD_CERTIFICATES, [userId])).rows;
    const newCertificates = await certificates.listCertificates(userId);
    same(
      `certificates ${userId}`,
      oldCertificates,
      newCertificates.map((c) => ({
        id: c.id,
        exam_type: c.examType,
        issued_at: c.issuedAt,
        certificate_no: c.certificateNo,
      })),
    );

    for (const c of newCertificates) {
      same(`certificate row ${c.id}`, (await pool.query(OLD_CERTIFICATE_ROW, [c.id])).rows[0], certificateJson(c));
      const held = await certificates.findHeldCertificate(c.id, userId);
      same(
        `held ${c.id}`,
        (await pool.query(OLD_HELD, [c.id, userId])).rows[0],
        held && {
          id: held.id,
          exam_type: held.examType,
          issued_at: held.issuedAt,
          certificate_no: held.certificateNo,
          recipient: held.recipient,
        },
      );
    }
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended differences, not compared: GET /api/attempts deleted; answer and scoring writes are now transactional.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    const { default: prisma } = await import("../../src/server/db/prisma");
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Run it against the local restore**

Run: `pnpm parity:exams`
Expected: `parity: 0 differences`. Record in the ledger how many attempts and users it compared.

If it reports differences, don't edit the script to hide them. Ties on `issued_at`, `completed_at` or `started_at` would show up as an order difference: check the rows. If they really do tie, note it the same way Wave 2 did for its single-key sorts, then compare that list by id. Anything else is a bug in the new module: fix it there.

- [ ] **Step 4: Commit**

```bash
git add scripts/parity/exams-parity.ts package.json
git commit -m "test: compare the old exam and certificate SQL with the new modules"
```

---

### Task 6: Verify, manual pass, record the outcome

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`

**Interfaces:**
- Produces: nothing in Wave 3's scope imports `@/lib/db`.

- [ ] **Step 1: Confirm what still uses `pg`**

Run: `git grep -l "@/lib/db" -- src`
Expected exactly: `src/app/api/_lib/audit-store.ts`, `src/app/api/_lib/presence-store.ts`, `src/app/api/admin/managers/route.ts`, `src/app/api/admin/reviewees/[id]/nudge/route.ts`, `src/app/api/admin/reviewees/[id]/route.ts`, `src/app/api/admin/reviewees/route.test.ts`, `src/app/api/admin/reviewees/route.ts`, `src/app/api/nudges/route.ts`. All of these are Wave 4. Anything else means a Wave 3 file was missed.

- [ ] **Step 2: Full verification**

Run each command and record its result line in the ledger:
- `pnpm typecheck` → exit 0
- `pnpm lint` → 0 errors
- `pnpm test` → all pass
- `pnpm test:db` → all pass (the user-delete cascade test still covers `exam_attempts` and `certificates`)
- `pnpm parity` → 0 differences (Wave 0's mastery check)
- `pnpm parity:content` → 0 differences
- `pnpm parity:exams` → 0 differences
- `pnpm build` → exit 0

If `pnpm typecheck` fails on stale `.next/types` or `.next/dev/types`, delete them; the Wave 1 and 2 outcomes record the same thing.

- [ ] **Step 3: Manual pass in `pnpm dev`. Ask Nelson first.**

The local `insure_dev` holds real people's accounts from the production restore, so don't sign in as any of them. Wave 2 used a throwaway account made through the app's own invite and signup flow. A new account is locked out of the practice exam until its flashcards and memorization are mastered, though. So ask Nelson how to unlock it. The options are to master the decks by hand in the app, or for him to approve writing that account's progress rows into the **local** `insure_dev` only.

The screens and checks for this wave:
- Practice exam: opening it deals a paper; a reload keeps the order and the picked answers; changing an answer keeps one answer; submitting shows the score and passes.
- The fifth pass shows a certificate. `/certificates` lists it with its record. `/certificates/[id]` shows the sheet with the account's name, and download names the file after the certificate number.
- Another account's certificate URL answers 404.
- `GET /api/attempts` answers 405 (the file still exports `POST`).

Delete the throwaway accounts afterwards; everything they wrote cascades.

- [ ] **Step 4: Commit any fixes the pass turned up**

Each fix gets its own commit with a plain message. If there were none, skip this step.

- [ ] **Step 5: Record the outcome in the spec**

In `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`:

1. Change the status line to `**Status:** approved; Waves 0–3 implemented (see Wave 0, 1, 2 and 3 outcomes)`.
2. In "Out of scope", after the sentence ending `puts the glossary's \`details\` back (see Wave 2 outcome).`, add: `Wave 3 deletes \`GET /api/attempts\`, which nothing called (see Wave 3 outcome).`
3. Append this section after "Wave 2 outcome" and before "After the waves", adjusted to match what actually happened (rulings from the ledger, counts from the parity run, anything that surprised you):

```markdown
## Wave 3 outcome (2026-10-14)

- **`src/server/data/attempts.ts`** deals, resumes, reads, answers and
  scores practice-exam sittings, including the `question_progress` and
  `user_progress` writes a sitting makes. **`certificates.ts`** issues and
  reads certificates. Routes and pages map their camelCase records back to
  the old JSON through the pure `exam-json.ts`. `_lib/certificates.ts` had
  no callers left and was deleted.
- **Deal and number in TypeScript.** `ORDER BY random()` became a
  Fisher–Yates shuffle, and the SQL-built certificate number became
  `certificateNumber`. Its year is the UTC year of the same instant stored
  as `issued_at`. A race to issue is settled by the `(user_id, exam_type)`
  key: the loser catches P2002 and returns the winner's row. A test fires
  two at once.
- **Transactions.** Saving an answer and its question progress, and scoring
  a sitting with its pass count, are each one transaction now; before, they
  were separate statements.
- **Deleted, unused:** `GET /api/attempts` (the list).
- **Parity:** `pnpm parity:exams` compares every attempt, its answers,
  every user's open sitting per track, completed sittings, per-track
  record and certificates with the old SQL on the production restore:
  0 differences.
- **Not changed, recorded:** answers can still be posted to a completed
  attempt, and completing one twice counts its pass twice; the frontend
  does neither. Question mastery still follows the latest answer.
- **Connection budget** unchanged at 2 (`pg`) + 3 (Prisma); only the staff
  routes (Wave 4) still use `pg`.
- **Production needs nothing for this wave:** no migration, no schema change.
```

- [ ] **Step 6: Commit the spec**

```bash
git add docs/superpowers/specs/2026-10-14-prisma-migration-design.md
git commit -m "docs: record what Wave 3 found"
```

- [ ] **Step 7: Final review, then the PR**

Dispatch a fresh reviewer on the whole branch since `bdcca51`. Record its findings in the spec's Wave 3 outcome, as Wave 2 did. Then ask Nelson before opening the PR, and open it with `gh pr create --base dev` (check that the base reads `dev` before submitting).
