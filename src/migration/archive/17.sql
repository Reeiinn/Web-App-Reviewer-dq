-- A track is certified once, however many extra sittings follow the fifth
-- pass. The issue on completion is written as an upsert, so it needs a
-- constraint to be idempotent against.
--
-- Any duplicates from before the constraint are folded down to the earliest
-- row, which is the one whose issue date tells the truth.
DELETE FROM certificates a
      USING certificates b
      WHERE a.user_id = b.user_id
        AND a.exam_type = b.exam_type
        AND (a.issued_at, a.id) > (b.issued_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_exam_key
    ON certificates (user_id, exam_type);
