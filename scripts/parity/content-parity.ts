// Compares the pre-Prisma study list SQL with src/server/data/content.ts on
// the local dev copy. Exit code 1 on any difference. Run: pnpm parity:content
//
// The old queries are copied from the routes as they stood before Wave 2
// (commit 513e28d), so this stays a fixed reference after the routes change.
//
// The old queries sort on one key (category, created_at, text, term), and rows
// that tie on it come back in no fixed order, so each list is compared twice:
// the sequence of sort keys, and every row by id.
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";
import { examTypes } from "../../src/lib/types/common";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];
type Row = { id: string } & Record<string, unknown>;

// JSON round trip: Dates become the ISO strings the API sends.
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

function compare(label: string, key: string, oldRows: unknown[], newRows: unknown[]) {
  const a = json(oldRows) as Row[];
  const b = json(newRows) as Row[];
  const keys = (rows: Row[]) => JSON.stringify(rows.map((r) => r[key]));
  if (keys(a) !== keys(b)) diffs.push(`${label}: ${key} order differs`);
  const byId = new Map(b.map((r) => [r.id, r]));
  for (const row of a) {
    const other = byId.get(row.id);
    if (JSON.stringify(row) !== JSON.stringify(other)) {
      diffs.push(`${label} ${row.id}\n  old: ${JSON.stringify(row)}\n  new: ${JSON.stringify(other)}`);
    }
  }
  if (a.length !== b.length) diffs.push(`${label}: ${a.length} rows vs ${b.length}`);
}

const OLD_FLASHCARDS = `
  SELECT f.id, f.exam_type, f.category, f.front, f.back,
    COALESCE((SELECT json_agg(json_build_object('id', c.id, 'text', c.text) ORDER BY c.sort_order)
              FROM choices c WHERE c.question_id = q.id), '[]') AS choices
  FROM flashcards f
  LEFT JOIN LATERAL (
    SELECT q.id FROM questions q
    WHERE q.exam_type = f.exam_type AND q.text = f.front
      AND ((SELECT count(*) FROM questions dup
            WHERE dup.exam_type = f.exam_type AND dup.text = f.front) = 1
           OR EXISTS (SELECT 1 FROM choices c
                      WHERE c.question_id = q.id AND c.is_correct AND c.text = f.back))
    LIMIT 1
  ) q ON true
  WHERE ($1::exam_type IS NULL OR f.exam_type = $1)
  ORDER BY f.category ASC`;

const OLD_QUESTIONS = `
  SELECT q.id, q.exam_type, q.category, q.text, q.explanation, q.difficulty, q.created_at,
    COALESCE(json_agg(json_build_object('id', c.id, 'text', c.text, 'is_correct', c.is_correct)
             ORDER BY c.sort_order) FILTER (WHERE c.id IS NOT NULL), '[]') AS choices
  FROM questions q LEFT JOIN choices c ON c.question_id = q.id
  WHERE ($1::exam_type IS NULL OR q.exam_type = $1)
  GROUP BY q.id ORDER BY q.created_at DESC`;

const OLD_MEMORIZATION = `
  SELECT m.id, m.exam_type, m.category, m.text, mp.selected_choice_id AS answered_choice_id,
    COALESCE(json_agg(json_build_object('id', c.id, 'text', c.text, 'is_correct', c.is_correct)
             ORDER BY c.sort_order) FILTER (WHERE c.id IS NOT NULL), '[]') AS choices
  FROM memorization m
  LEFT JOIN memorization_choices c ON c.memorization_id = m.id
  LEFT JOIN memorization_progress mp ON mp.memorization_id = m.id AND mp.user_id = $1
  WHERE ($2::exam_type IS NULL OR m.exam_type = $2)
  GROUP BY m.id, mp.selected_choice_id ORDER BY m.text ASC`;

// The old route did not select details; Wave 2 adds it back on purpose, so
// it is compared on its own against the column.
const OLD_GLOSSARY = `
  SELECT id, exam_type, term, definition FROM vocabulary_terms
  WHERE ($1::exam_type IS NULL OR exam_type = $1) ORDER BY term ASC`;

async function main() {
  const { listFlashcards, listQuestions, listMemorization, listGlossary } =
    await import("../../src/server/data/content");
  const tracks = [null, ...examTypes];

  for (const examType of tracks) {
    const label = examType ?? "all";
    compare(`flashcards ${label}`, "category",
      (await pool.query(OLD_FLASHCARDS, [examType])).rows,
      await listFlashcards({ examType, category: null }));
    compare(`questions ${label}`, "created_at",
      (await pool.query(OLD_QUESTIONS, [examType])).rows,
      await listQuestions({ examType, category: null }));

    const glossary = await listGlossary(examType);
    compare(`glossary ${label}`, "term",
      (await pool.query(OLD_GLOSSARY, [examType])).rows,
      glossary.map((t) => ({ id: t.id, exam_type: t.exam_type, term: t.term, definition: t.definition })));
    const stored = new Map(
      (await pool.query(`SELECT id, details FROM vocabulary_terms`)).rows.map(
        (r) => [r.id as string, JSON.stringify(r.details)],
      ),
    );
    for (const t of glossary) {
      if (stored.get(t.id) !== JSON.stringify(t.details)) {
        diffs.push(`glossary details ${t.id} differ from the column`);
      }
    }
  }

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map(
    (r) => r.id as string,
  );
  console.log(`Comparing memorization for ${users.length} users…`);
  for (const userId of users) {
    for (const examType of tracks) {
      compare(`memorization ${userId} ${examType ?? "all"}`, "text",
        (await pool.query(OLD_MEMORIZATION, [userId, examType])).rows,
        await listMemorization(userId, { examType, category: null }));
    }
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended differences, not compared: six unused routes deleted; glossary returns details and ignores q; unknown exam_type answers 400.",
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
