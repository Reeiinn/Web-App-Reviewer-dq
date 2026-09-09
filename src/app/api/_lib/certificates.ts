import pool from "@/lib/db";
import type { Certificate } from "@/lib/types/attempt";

/**
 * The certificate a user holds for a track, issuing it if the track has just
 * been cleared.
 *
 * Called on the sitting that takes a learner to the fifth pass, and on every
 * sitting after it, so it has to be idempotent: the unique index on
 * (user_id, exam_type) added in migration 17 is what makes the upsert safe,
 * and the follow-up SELECT is what returns the existing row when the insert
 * was the one that lost.
 *
 * The number is built in SQL rather than in JS so that two requests racing
 * each other cannot mint the same one outside a transaction.
 */
export async function issueCertificate(
  userId: string,
  examType: string,
): Promise<Certificate | null> {
  const inserted = await pool.query(
    `INSERT INTO certificates (user_id, exam_type, certificate_no)
     VALUES (
       $1,
       $2::exam_type,
       'INS-' || to_char(now(), 'YYYY') || '-' || $2::text || '-' ||
       upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
     )
     ON CONFLICT (user_id, exam_type) DO NOTHING
     RETURNING *`,
    [userId, examType],
  );

  if (inserted.rows[0]) return inserted.rows[0] as Certificate;

  const existing = await pool.query(
    `SELECT * FROM certificates WHERE user_id = $1 AND exam_type = $2::exam_type`,
    [userId, examType],
  );

  return (existing.rows[0] as Certificate) ?? null;
}
