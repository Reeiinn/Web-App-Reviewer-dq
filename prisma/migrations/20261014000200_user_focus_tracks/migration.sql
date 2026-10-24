-- Which tracks a reviewee is focused on. Additive: a new, empty table; no
-- existing table or row changes. No rows for a user means all four tracks.
-- Rollback: DROP TABLE user_focus_tracks;

CREATE TABLE "user_focus_tracks" (
    "user_id"    UUID        NOT NULL,
    "exam_type"  "exam_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_focus_tracks_pkey" PRIMARY KEY ("user_id", "exam_type")
);

ALTER TABLE "user_focus_tracks"
  ADD CONSTRAINT "user_focus_tracks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
