-- Baseline of the database as it stood on 2026-10-14. On a database that
-- already has these tables it is marked applied
-- (`prisma migrate resolve --applied 0_init`), never run.
--
-- Objects Prisma's schema cannot express are copied from the live database
-- so a fresh database built from these migrations matches it exactly.
-- pg_stat_statements is left out: it is the host's monitoring extension,
-- not part of the app's schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "exam_type" AS ENUM ('VUL', 'TRADITIONAL_LIFE', 'IIAP', 'IIAP_A', 'IIAP_B');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'ADMIN', 'MANAGER');

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_email" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" UUID,
    "target_email" TEXT,
    "target_name" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "certificate_no" VARCHAR(100) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempt_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_choice_id" UUID,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "exam_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "score" INTEGER NOT NULL,
    "total_items" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "completed_at" TIMESTAMPTZ,
    "question_order" JSONB,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "flashcard_id" UUID NOT NULL,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "mastered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "flashcard_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_type" "exam_type" NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_type" "exam_type" NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "memorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorization_choices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memorization_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "memorization_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorization_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "memorization_id" UUID NOT NULL,
    "selected_choice_id" UUID,
    "is_correct" BOOLEAN,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "mastered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "memorization_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "sender_id" UUID,
    "sender_name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "nudges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_choice_id" UUID,
    "is_correct" BOOLEAN NOT NULL,
    "times_seen" INTEGER NOT NULL DEFAULT 1,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "last_reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "question_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_type" "exam_type" NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" SMALLINT DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "mode" TEXT NOT NULL,
    "visited_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "recent_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "created_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "used_at" TIMESTAMPTZ,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "email" TEXT,

    CONSTRAINT "registration_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "mode" TEXT NOT NULL,
    "card_order" JSONB NOT NULL DEFAULT '[]',
    "card_index" INTEGER NOT NULL DEFAULT 0,
    "ratings" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_streaks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "last_answer_at" TIMESTAMPTZ,

    CONSTRAINT "study_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_type" "exam_type" NOT NULL,
    "flashcards_done" INTEGER NOT NULL DEFAULT 0,
    "vocab_done" INTEGER NOT NULL DEFAULT 0,
    "pass_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "manager_id" UUID,
    "image" TEXT,
    "last_seen_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "onboarding_tours_seen" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_type" "exam_type" NOT NULL,
    "term" VARCHAR(255) NOT NULL,
    "definition" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "vocabulary_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_actions_target_idx" ON "admin_actions"("target_id");

-- CreateIndex
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_certificate_no_key" UNIQUE ("certificate_no");

-- CreateIndex
CREATE INDEX "idx_certificates_user_id" ON "certificates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_exam_key" ON "certificates"("user_id", "exam_type");

-- CreateIndex
CREATE INDEX "idx_choices_question_id" ON "choices"("question_id");

-- CreateIndex
CREATE INDEX "idx_attempt_answers_attempt_id" ON "exam_attempt_answers"("attempt_id");

-- CreateIndex
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_attempt_question_key" UNIQUE ("attempt_id", "question_id");

-- CreateIndex
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_attempt_question_unique" UNIQUE ("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_attempts_exam_type" ON "exam_attempts"("exam_type");

-- CreateIndex
CREATE INDEX "idx_attempts_user_id" ON "exam_attempts"("user_id");

-- CreateIndex
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_user_id_flashcard_id_key" UNIQUE ("user_id", "flashcard_id");

-- CreateIndex
CREATE INDEX "idx_flashcards_exam_type" ON "flashcards"("exam_type");

-- CreateIndex
CREATE INDEX "idx_memorization_exam_type" ON "memorization"("exam_type");

-- CreateIndex
CREATE INDEX "idx_memorization_choices_memorization_id" ON "memorization_choices"("memorization_id");

-- CreateIndex
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_user_id_memorization_id_key" UNIQUE ("user_id", "memorization_id");

-- CreateIndex
CREATE INDEX "nudges_user_id_idx" ON "nudges"("user_id", "created_at" DESC);

-- CreateIndex
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_token_hash_key" UNIQUE ("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_question_progress_user_id" ON "question_progress"("user_id");

-- CreateIndex
ALTER TABLE "question_progress" ADD CONSTRAINT "question_progress_user_id_question_id_key" UNIQUE ("user_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_questions_category" ON "questions"("category");

-- CreateIndex
CREATE INDEX "idx_questions_exam_type" ON "questions"("exam_type");

-- CreateIndex
CREATE INDEX "recent_activity_user_id_idx" ON "recent_activity"("user_id");

-- CreateIndex
ALTER TABLE "recent_activity" ADD CONSTRAINT "recent_activity_user_id_exam_type_mode_key" UNIQUE ("user_id", "exam_type", "mode");

-- CreateIndex
ALTER TABLE "registration_invites" ADD CONSTRAINT "registration_invites_code_key" UNIQUE ("code");

-- CreateIndex
CREATE INDEX "idx_registration_invites_created_by" ON "registration_invites"("created_by");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_idx" ON "study_sessions"("user_id");

-- CreateIndex
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_exam_type_mode_key" UNIQUE ("user_id", "exam_type", "mode");

-- CreateIndex
ALTER TABLE "study_streaks" ADD CONSTRAINT "study_streaks_user_id_exam_type_key" UNIQUE ("user_id", "exam_type");

-- CreateIndex
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_exam_type_key" UNIQUE ("user_id", "exam_type");

-- CreateIndex
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- CreateIndex
CREATE INDEX "idx_users_manager_id" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "users_active_idx" ON "users"("id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_terms_exam_term_key" ON "vocabulary_terms"("exam_type", "term");

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "choices" ADD CONSTRAINT "choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "choices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memorization_choices" ADD CONSTRAINT "memorization_choices_memorization_id_fkey" FOREIGN KEY ("memorization_id") REFERENCES "memorization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_memorization_id_fkey" FOREIGN KEY ("memorization_id") REFERENCES "memorization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "memorization_choices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_progress" ADD CONSTRAINT "question_progress_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_progress" ADD CONSTRAINT "question_progress_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "choices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_progress" ADD CONSTRAINT "question_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recent_activity" ADD CONSTRAINT "recent_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registration_invites" ADD CONSTRAINT "registration_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_streaks" ADD CONSTRAINT "study_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- Keeps updated_at current on the two tables that have it. The only writer
-- of that column; the Prisma schema does not use @updatedAt.
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
