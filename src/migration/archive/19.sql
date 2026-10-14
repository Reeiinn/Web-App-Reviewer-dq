-- Glossary terms keep their structure.
-- Applied by scripts/migrate.cjs (idempotent), which also reseeds the terms.
--
-- Migration 16 seeded each term as a single paragraph, because a single
-- paragraph is all the table could hold. The source document is not written
-- that way: a term carries worked examples, a feature-by-feature comparison,
-- and question-and-answer pairs hanging off its options. Flattening those into
-- prose is what made the glossary unreadable — an example was findable only by
-- reading the sentence it had been folded into.
--
-- The definition column stays the meaning of the term, on its own. Everything
-- that was being flattened into it moves to `details`.
--
-- jsonb rather than a table per part: nothing queries inside these, there is no
-- admin UI writing them, and the shape differs per term. src/lib/helper/
-- glossary.ts validates a row on the way out, so a malformed value costs that
-- term its extra detail rather than breaking the page.
ALTER TABLE vocabulary_terms
  ADD COLUMN IF NOT EXISTS details jsonb;

-- Terms are reseeded by scripts/migrate.cjs from scripts/glossary-seed.cjs,
-- upserted on (exam_type, term) so re-running the migration is safe and edits
-- to the seed file land on the next run.
CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_terms_exam_term_key
  ON vocabulary_terms (exam_type, term);
