// Marks every VUL flashcard and memorization item as mastered for one account,
// so the VUL practice exam unlocks without sitting through both decks.
//
// Run with: node scripts/seed-vul-mastery.cjs <email>
require("dotenv").config({ path: ".env.local" });

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const EMAIL = process.argv[2] ?? "djustinjan@gmail.com";
const EXAM_TYPE = process.argv[3] ?? "VUL";

(async () => {
  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `SELECT id, name FROM users WHERE lower(email) = lower($1)`,
      [EMAIL],
    );

    const user = userResult.rows[0];
    if (!user) {
      console.error(`No account found for ${EMAIL}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Seeding ${EXAM_TYPE} mastery for ${user.name} <${EMAIL}>`);

    await client.query("BEGIN");

    const flashcards = await client.query(
      `INSERT INTO flashcard_progress (user_id, flashcard_id, reviewed_at, mastered)
       SELECT $1, f.id, now(), true
         FROM flashcards f
        WHERE f.exam_type = $2
       ON CONFLICT (user_id, flashcard_id)
       DO UPDATE SET mastered = true, reviewed_at = now()`,
      [user.id, EXAM_TYPE],
    );

    // The saved answer is the correct choice, so a resumed sitting redraws
    // these as answered correctly rather than as a blank it cannot explain.
    const memorization = await client.query(
      `INSERT INTO memorization_progress
         (user_id, memorization_id, selected_choice_id, is_correct, reviewed_at, mastered)
       SELECT $1,
              m.id,
              (SELECT c.id FROM memorization_choices c
                WHERE c.memorization_id = m.id AND c.is_correct
                LIMIT 1),
              true,
              now(),
              true
         FROM memorization m
        WHERE m.exam_type = $2
       ON CONFLICT (user_id, memorization_id)
       DO UPDATE SET
         mastered = true,
         is_correct = true,
         selected_choice_id = EXCLUDED.selected_choice_id,
         reviewed_at = now()`,
      [user.id, EXAM_TYPE],
    );

    await client.query("COMMIT");

    console.log(`ok  flashcards mastered:    ${flashcards.rowCount}`);
    console.log(`ok  memorization mastered:  ${memorization.rowCount}`);

    const check = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM flashcards WHERE exam_type = $2)         AS flashcards_total,
         (SELECT COUNT(*) FROM flashcard_progress fp
            JOIN flashcards f ON f.id = fp.flashcard_id
           WHERE fp.user_id = $1 AND f.exam_type = $2 AND fp.mastered)  AS flashcards_mastered,
         (SELECT COUNT(*) FROM memorization WHERE exam_type = $2)       AS memorize_total,
         (SELECT COUNT(*) FROM memorization_progress mp
            JOIN memorization m ON m.id = mp.memorization_id
           WHERE mp.user_id = $1 AND m.exam_type = $2 AND mp.mastered)  AS memorize_mastered`,
      [user.id, EXAM_TYPE],
    );

    const row = check.rows[0];
    console.log(
      `\n${EXAM_TYPE}: flashcards ${row.flashcards_mastered}/${row.flashcards_total}, ` +
        `memorization ${row.memorize_mastered}/${row.memorize_total}`,
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
