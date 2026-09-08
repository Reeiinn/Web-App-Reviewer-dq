// Fills in the five passing practice-exam sittings a track needs, so the
// certificate can be looked at without sitting the exam five times.
//
// The sittings are written the way the app writes them — a dealt paper, an
// answer row per question, a score that clears the 75% bar — so the result
// screen, the attempt history and the admin roster all read the same story
// the certificate does.
//
// Run with: node scripts/seed-practice-passes.cjs <email> [EXAM_TYPE] [--fresh]
//   EXAM_TYPE  VUL (default) | TRADITIONAL_LIFE | IIAP_A | IIAP_B
//   --fresh    clear this track's existing sittings first, instead of
//              topping the count up to five
require("dotenv").config({ path: ".env.local" });

const { Pool } = require("pg");

// Kept in step with src/lib/helper/practice-exam.ts. This script writes rows
// the app later reads back through those rules, so if the bar moves there it
// has to move here too.
const PASSES_REQUIRED = 5;
const PASSING_PERCENTAGE = 75;

const EXAM_TYPES = ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"];

const args = process.argv.slice(2);
const FRESH = args.includes("--fresh");
const positional = args.filter((a) => !a.startsWith("--"));

const EMAIL = positional[0] ?? "djustinjan@gmail.com";
const EXAM_TYPE = positional[1] ?? "VUL";

// A row of identical 100% sittings looks seeded. These are the shares of the
// paper each sitting gets right — all clear of the bar, none of them perfect.
const SITTING_ACCURACY = [0.8, 0.86, 0.84, 0.92, 0.96];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** The passing count the app would read for this user and track. */
async function countPasses(client, userId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS passes
       FROM exam_attempts
      WHERE user_id = $1 AND exam_type = $2::exam_type
        AND passed = true AND completed_at IS NOT NULL`,
    [userId, EXAM_TYPE],
  );
  return result.rows[0].passes;
}

/** One sitting: a dealt paper, an answer per question, and a completed row. */
async function seedSitting(client, userId, questions, accuracy, daysAgo) {
  const deck = shuffle(questions);
  const total = deck.length;

  // The pass mark is the floor whatever the target accuracy rounds to, so a
  // short paper can never round a sitting below the bar it is meant to clear.
  const correctCount = Math.max(
    Math.ceil((total * PASSING_PERCENTAGE) / 100),
    Math.floor(total * accuracy),
  );

  const questionIds = [];
  const choiceIds = [];
  const correctFlags = [];

  deck.forEach((question, index) => {
    // A question with no wrong choice on file can only be answered correctly,
    // so it is never one of the misses.
    const missed = index >= correctCount && question.wrong_id !== null;
    questionIds.push(question.question_id);
    choiceIds.push(missed ? question.wrong_id : question.correct_id);
    correctFlags.push(!missed);
  });

  const score = correctFlags.filter(Boolean).length;

  const attempt = await client.query(
    `INSERT INTO exam_attempts
       (user_id, exam_type, score, total_items, passed, question_order,
        started_at, completed_at)
     VALUES ($1, $2::exam_type, $3, $4, true, $5,
             now() - make_interval(days => $6),
             now() - make_interval(days => $6) + interval '38 minutes')
     RETURNING id, score, total_items`,
    [userId, EXAM_TYPE, score, total, JSON.stringify(questionIds), daysAgo],
  );

  const attemptId = attempt.rows[0].id;

  await client.query(
    `INSERT INTO exam_attempt_answers
       (attempt_id, question_id, selected_choice_id, is_correct)
     SELECT $1, t.question_id, t.choice_id, t.is_correct
       FROM unnest($2::uuid[], $3::uuid[], $4::boolean[])
            AS t(question_id, choice_id, is_correct)
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET
       selected_choice_id = EXCLUDED.selected_choice_id,
       is_correct = EXCLUDED.is_correct`,
    [attemptId, questionIds, choiceIds, correctFlags],
  );

  return attempt.rows[0];
}

(async () => {
  if (!EXAM_TYPES.includes(EXAM_TYPE)) {
    console.error(
      `Unknown exam type "${EXAM_TYPE}". Pick one of: ${EXAM_TYPES.join(", ")}`,
    );
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `SELECT id, name, role FROM users WHERE lower(email) = lower($1)`,
      [EMAIL],
    );

    const user = userResult.rows[0];
    if (!user) {
      console.error(`No account found for ${EMAIL}`);
      process.exitCode = 1;
      return;
    }

    // Staff are redirected off /certificates, so seeding one for an admin or a
    // manager would produce a certificate nobody can open.
    if (user.role === "ADMIN" || user.role === "MANAGER") {
      console.error(
        `${EMAIL} is a ${user.role}. Staff are redirected away from ` +
          `/certificates, so seed a learner account instead.`,
      );
      process.exitCode = 1;
      return;
    }

    const questionResult = await client.query(
      `SELECT q.id AS question_id,
              (SELECT c.id FROM choices c
                WHERE c.question_id = q.id AND c.is_correct
                LIMIT 1) AS correct_id,
              (SELECT c.id FROM choices c
                WHERE c.question_id = q.id AND NOT c.is_correct
                LIMIT 1) AS wrong_id
         FROM questions q
        WHERE q.exam_type = $1::exam_type`,
      [EXAM_TYPE],
    );

    const questions = questionResult.rows.filter((q) => q.correct_id !== null);

    if (questions.length === 0) {
      console.error(
        `No answerable ${EXAM_TYPE} questions in the database — nothing to ` +
          `build a sitting out of.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Seeding ${EXAM_TYPE} passes for ${user.name} <${EMAIL}>`);
    console.log(`    paper: ${questions.length} questions\n`);

    await client.query("BEGIN");

    if (FRESH) {
      const cleared = await client.query(
        `DELETE FROM exam_attempts
          WHERE user_id = $1 AND exam_type = $2::exam_type`,
        [user.id, EXAM_TYPE],
      );
      console.log(`--fresh  cleared ${cleared.rowCount} existing sittings`);
    }

    const before = await countPasses(client, user.id);
    const needed = Math.max(0, PASSES_REQUIRED - before);

    if (needed === 0) {
      console.log(`Already ${before} passes on file — no sittings added.`);
    }

    for (let i = 0; i < needed; i++) {
      const accuracy = SITTING_ACCURACY[(before + i) % SITTING_ACCURACY.length];
      // Newest sitting last, so the history reads as a run of study days
      // rather than five sittings stacked on one timestamp.
      const daysAgo = needed - i;
      const sitting = await seedSitting(
        client,
        user.id,
        questions,
        accuracy,
        daysAgo,
      );
      const pct = Math.round((sitting.score / sitting.total_items) * 100);
      console.log(
        `ok  sitting ${before + i + 1}: ` +
          `${sitting.score}/${sitting.total_items} (${pct}%)`,
      );
    }

    const passes = await countPasses(client, user.id);

    // The running total is kept in step with the attempts it summarises, so
    // the dashboard cannot disagree with the roster.
    await client.query(
      `INSERT INTO user_progress (user_id, exam_type, pass_count)
       VALUES ($1, $2::exam_type, $3)
       ON CONFLICT (user_id, exam_type)
       DO UPDATE SET pass_count = EXCLUDED.pass_count, updated_at = now()`,
      [user.id, EXAM_TYPE, passes],
    );

    // The same upsert the app runs on the fifth pass, so a seeded certificate
    // is indistinguishable from an earned one.
    await client.query(
      `INSERT INTO certificates (user_id, exam_type, certificate_no)
       VALUES (
         $1,
         $2::exam_type,
         'INS-' || to_char(now(), 'YYYY') || '-' || $2::text || '-' ||
         upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
       )
       ON CONFLICT (user_id, exam_type) DO NOTHING`,
      [user.id, EXAM_TYPE],
    );

    await client.query("COMMIT");

    const certificate = await client.query(
      `SELECT id, certificate_no
         FROM certificates
        WHERE user_id = $1 AND exam_type = $2::exam_type`,
      [user.id, EXAM_TYPE],
    );

    const row = certificate.rows[0];

    console.log(`\n${EXAM_TYPE}: passes ${passes}/${PASSES_REQUIRED}`);

    if (row) {
      console.log(`ok  certificate ${row.certificate_no}`);
      console.log(`    open /certificates`);
      console.log(`    or   /certificates/${row.id}`);
    } else {
      console.log("No certificate issued — the track is not cleared yet.");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
