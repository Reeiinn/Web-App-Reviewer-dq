"use client";

import { AppNav } from "@/components/ui/app-nav";
import type { Eligibility } from "@/lib/types/eligibility";
import { lockReason } from "@/lib/helper/eligibility";
import {
  pickActiveTrack,
  recentTracks,
  type TrackActivity,
} from "@/lib/helper/active-track";
import { examLabels, examTypes, type ExamType } from "@/lib/types/common";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Layers,
  LineChart,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ProgressSummaryRow = {
  exam_type: ExamType;
  last_activity_at: string | null;
  flashcard_pct: number;
  memorize_pct: number;
  practice_exam_pct: number;
  overall_pct: number;
};

const trackCopy: Record<ExamType, { title: string; blurb: string }> = {
  VUL: {
    title: "VUL (Variable Universal Life)",
    blurb: "Master the complexities of investment-linked insurance.",
  },
  TRADITIONAL_LIFE: {
    title: "Traditional Life",
    blurb: "Core fundamentals of whole and term life insurance.",
  },
  IIAP_A: {
    title: "IIAP (Set A)",
    blurb: "The first IIAP question set, with its own deck and exam.",
  },
  IIAP_B: {
    title: "IIAP (Set B)",
    blurb: "The second IIAP question set, tracked separately from Set A.",
  },
};

const emptyProgress: Record<ExamType, number> = {
  VUL: 0,
  TRADITIONAL_LIFE: 0,
  IIAP_A: 0,
  IIAP_B: 0,
};

function ModeOption({
  href,
  icon: Icon,
  title,
  blurb,
  remaining,
}: {
  href: string;
  icon: typeof Layers;
  title: string;
  blurb: string;
  remaining: number | null;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-lg border border-border bg-background p-4 transition hover:border-[#C9A227] hover:bg-[#FFF8D6]"
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-[#0B2340]" />
        <span className="font-extrabold">{title}</span>
      </div>
      <span className="mt-1.5 text-xs text-muted-foreground">{blurb}</span>
      <span className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-[#8A6D0B]">
          {remaining === null
            ? "Open"
            : remaining > 0
              ? `${remaining} left to master`
              : "All mastered"}
        </span>
        <ArrowRight className="size-3.5 text-[#0B2340]" />
      </span>
    </Link>
  );
}

function TrackCard({
  type,
  overall,
  eligibility,
  active,
  expanded,
  onToggle,
}: {
  type: ExamType;
  overall: number;
  eligibility: Eligibility | null;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { title, blurb } = trackCopy[type];
  const started = overall > 0;
  const locked = eligibility ? !eligibility.eligible : true;
  const reason = eligibility
    ? lockReason(eligibility.flashcards, eligibility.memorization)
    : "Checking your progress…";

  const flashcardsLeft = eligibility
    ? eligibility.flashcards.total - eligibility.flashcards.mastered
    : null;
  const memorizeLeft = eligibility
    ? eligibility.memorization.total - eligibility.memorization.mastered
    : null;

  return (
    <section id={`track-${type}`} className="rv-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {active && (
            <span className="rounded bg-[#FFD400] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0B2340]">
              Active
            </span>
          )}
          <h3 className="text-lg font-extrabold">{title}</h3>
        </div>
        {active ? (
          <LineChart className="size-5 shrink-0 text-[#C98A00]" />
        ) : (
          <ShieldCheck className="size-5 shrink-0 text-[#0B2340]" />
        )}
      </div>

      <p className="mt-1.5 text-sm text-muted-foreground">{blurb}</p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-xs font-bold">
          <span>Overall Progress</span>
          <span>{overall}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              active ? "bg-[#8A6D0B]" : "bg-[#0B2340]"
            }`}
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
            active
              ? "bg-[#FFD400] text-[#0B2340] hover:bg-[#E8C200]"
              : "border border-border bg-muted text-foreground hover:bg-[#e9e2d2]"
          }`}
        >
          {started ? "Resume Study" : "Start Track"}
          <ChevronDown
            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {locked ? (
          <span
            aria-disabled="true"
            title={reason ?? undefined}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground"
          >
            <Lock className="size-3.5" />
            Practice Exam
          </span>
        ) : (
          <Link
            href={`/learningMethods/practiceExam?exam_type=${type}`}
            className="rounded-lg border-2 border-[#FFD400] px-4 py-2.5 text-sm font-bold text-[#0B2340] transition hover:bg-[#FFF8D6]"
          >
            Practice Exam
          </Link>
        )}
      </div>

      {expanded && (
        <div className="rv-pop-in mt-4 border-t border-border pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Choose a study mode for {examLabels[type]}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ModeOption
              href={`/learningMethods/flashCard?exam_type=${type}`}
              icon={Layers}
              title="Flashcards"
              blurb="Quick recall and spaced repetition."
              remaining={flashcardsLeft}
            />
            <ModeOption
              href={`/learningMethods/memorization?exam_type=${type}`}
              icon={BrainCircuit}
              title="Memorize"
              blurb="Deep recall on complex concepts."
              remaining={memorizeLeft}
            />
          </div>
        </div>
      )}

      {locked && reason && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3 shrink-0" />
          {reason}
        </p>
      )}
    </section>
  );
}

/** Turns a timestamp into the coarse "when did I last touch this" phrasing. */
function lastStudiedLabel(stamp: string | null | undefined) {
  const time = Date.parse(stamp ?? "");
  if (Number.isNaN(time)) return "Not started yet";

  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "Studied just now";
  if (minutes < 60) return `Studied ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Studied ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "Studied yesterday" : `Studied ${days}d ago`;
}

function QuickAccess({
  tracks,
  activity,
  onSelect,
}: {
  tracks: ExamType[];
  activity: TrackActivity;
  onSelect: (type: ExamType) => void;
}) {
  return (
    <aside>
      <h2 className="text-2xl font-extrabold">Quick Access</h2>

      {/* Study modes are reached through a track above, so this column jumps
          back to the tracks last studied rather than repeating the mode links. */}
      {tracks.length === 0 ? (
        <div className="mt-5 rounded-xl bg-[#0B2340] p-5 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpen className="size-5 text-[#FFD400]" />
            <h3 className="text-lg font-extrabold">No recent tracks</h3>
          </div>
          <p className="mt-2 text-sm text-white/75">
            Start a track and it will show up here for a one-tap return.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {tracks.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className="block w-full rounded-xl bg-[#0B2340] p-5 text-left text-white transition hover:bg-[#0F2E4D]"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="size-5 text-[#FFD400]" />
                <h3 className="text-lg font-extrabold">{examLabels[type]}</h3>
              </div>
              <p className="mt-2 text-sm text-white/75">
                {lastStudiedLabel(activity[type])}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-[#FFD400]">
                  Resume Study
                </span>
                <ArrowRight className="size-4 text-[#FFD400]" />
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

export function DashboardPage() {
  const { data: session } = useSession();
  const [progress, setProgress] = useState(emptyProgress);
  const [activity, setActivity] = useState<TrackActivity>({});
  const [eligibility, setEligibility] = useState<
    Partial<Record<ExamType, Eligibility>>
  >({});
  const [expanded, setExpanded] = useState<ExamType | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/progress")
      .then((response) => response.json())
      .then((rows: ProgressSummaryRow[]) => {
        if (!active || !Array.isArray(rows)) return;
        const next = { ...emptyProgress };
        const stamps: TrackActivity = {};
        for (const row of rows) {
          next[row.exam_type] = row.overall_pct;
          stamps[row.exam_type] = row.last_activity_at;
        }
        setProgress(next);
        setActivity(stamps);
      })
      .catch((error) => console.error("Failed to load progress:", error));

    Promise.all(
      examTypes.map((type) =>
        fetch(`/api/attempts/eligibility?exam_type=${type}`)
          .then((response) => response.json())
          .then((data: Eligibility) => [type, data] as const),
      ),
    )
      .then((entries) => {
        if (active) setEligibility(Object.fromEntries(entries));
      })
      .catch((error) => console.error("Failed to load eligibility:", error));

    return () => {
      active = false;
    };
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "Scholar";

  const activeTrack = pickActiveTrack(examTypes, activity);
  const recent = recentTracks(examTypes, activity);

  // Quick Access reuses the track card's own expand state, so a pick there
  // opens the same study-mode panel the card's button opens.
  const openTrack = (type: ExamType) => {
    setExpanded(type);
    document
      .getElementById(`track-${type}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-10">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your certification journey is looking bright today.
        </p>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-extrabold">Exam Tracks</h2>
            <div className="mt-5 flex flex-col gap-4">
              {examTypes.map((type) => (
                <TrackCard
                  key={type}
                  type={type}
                  overall={progress[type]}
                  eligibility={eligibility[type] ?? null}
                  active={type === activeTrack}
                  expanded={expanded === type}
                  onToggle={() =>
                    setExpanded((current) => (current === type ? null : type))
                  }
                />
              ))}
            </div>
          </div>

          <QuickAccess
            tracks={recent}
            activity={activity}
            onSelect={openTrack}
          />
        </div>
      </main>
    </div>
  );
}
