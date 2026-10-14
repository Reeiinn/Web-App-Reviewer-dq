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
