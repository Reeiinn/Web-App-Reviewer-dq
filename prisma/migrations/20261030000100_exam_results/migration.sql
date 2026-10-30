-- How a reviewee did on the real licensing exam, which is sat outside the app
-- and recorded by staff. Additive: a new, empty table; no existing table or
-- row changes. One current mark per reviewee per exam; the history of who
-- changed it lives in admin_actions.
-- Rollback: DROP TABLE exam_results;

CREATE TABLE "exam_results" (
    "user_id"   UUID        NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "outcome"   TEXT        NOT NULL,
    "marked_by" UUID,
    "marked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("user_id", "exam_type"),
    CONSTRAINT "exam_results_outcome_check" CHECK ("outcome" IN ('PASSED', 'FAILED'))
);

ALTER TABLE "exam_results"
  ADD CONSTRAINT "exam_results_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- The marker is kept as a name on the results page; their account leaving
-- clears the link rather than taking the result with it.
ALTER TABLE "exam_results"
  ADD CONSTRAINT "exam_results_marked_by_fkey"
  FOREIGN KEY ("marked_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
