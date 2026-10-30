"use client";

import { AppNav } from "@/components/ui/app-nav";
import { AnalyticsBodySkeleton } from "./AnalyticsSkeleton";
import { examTypes, type ExamType } from "@/lib/types/common";
import { hasPassedTrack, passesLabel } from "@/lib/helper/practice-exam";
import { useEffect, useState } from "react";

type ProgressSummaryRow = {
  exam_type: ExamType;
  flashcard_pct: number;
  memorize_pct: number;
  practice_exam_pct: number;
  overall_pct: number;
  /** Passing practice exams on this track, out of PASSES_REQUIRED. */
  exam_passes: number;
};

const emptyRow = (exam_type: ExamType): ProgressSummaryRow => ({
  exam_type,
  flashcard_pct: 0,
  memorize_pct: 0,
  practice_exam_pct: 0,
  overall_pct: 0,
  exam_passes: 0,
});

const trackTitles: Record<ExamType, string> = {
  VUL: "VUL Track Mastery",
  TRADITIONAL_LIFE: "Traditional Life Mastery",
  IIAP_A: "IIAP (Set A) Mastery",
  IIAP_B: "IIAP (Set B) Mastery",
};

/**
 * One ring colour per track, so two cards side by side are never the same
 * dial twice. Every value is from the palette; the two IIAP sets take the
 * furthest-apart hues left once gold and navy are spoken for.
 */
const trackAccents: Record<ExamType, string> = {
  VUL: "#8A6D0B",
  TRADITIONAL_LIFE: "#0B2340",
  IIAP_A: "#0F7B52",
  IIAP_B: "#527087",
};

function Donut({ value, accent }: { value: number; accent: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#EFEAE0"
          strokeWidth="12"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold">
        {value}%
      </span>
    </div>
  );
}

function Bar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EFEAE0]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [rows, setRows] = useState<Record<ExamType, ProgressSummaryRow>>({
    VUL: emptyRow("VUL"),
    TRADITIONAL_LIFE: emptyRow("TRADITIONAL_LIFE"),
    IIAP_A: emptyRow("IIAP_A"),
    IIAP_B: emptyRow("IIAP_B"),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/progress")
      .then((response) => response.json())
      .then((data: ProgressSummaryRow[]) => {
        if (!active || !Array.isArray(data)) return;
        setRows((current) => {
          const next = { ...current };
          for (const row of data) next[row.exam_type] = row;
          return next;
        });
      })
      .catch((error) => console.error("Failed to load analytics:", error))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-10">
        <h1 className="text-4xl font-extrabold md:text-5xl">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Track your mastery and study performance.
        </p>

        {loading ? (
          <AnalyticsBodySkeleton />
        ) : (
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            {examTypes.map((type) => {
              const row = rows[type];
              // The badge used to call VUL "Active" and everything else
              // "Foundation", which was a two-track assumption rather than
              // anything the data said. It now reports whether this learner
              // has actually started the track.
              const started = row.overall_pct > 0;
              // Studying is progress; five passed practice exams is the proof.
              // Only that clears the track, so only that changes the badge.
              const passed = hasPassedTrack(row.exam_passes);
              const accent = trackAccents[type];

              return (
                <section key={type} className="rv-card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold">
                      {trackTitles[type]}
                    </h2>
                    <span
                      className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                        passed
                          ? "bg-[#0F7B52] text-white"
                          : started
                            ? "bg-[#0B2340] text-white"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {passed
                        ? "Passed"
                        : started
                          ? "In Progress"
                          : "Not Started"}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-7">
                    <Donut value={row.overall_pct} accent={accent} />

                    <div className="flex-1 space-y-4">
                      <Bar
                        label="Flashcards"
                        value={row.flashcard_pct}
                        color="#FFD400"
                      />
                      <Bar
                        label="Memorize"
                        value={row.memorize_pct}
                        color="#0B2340"
                      />
                      <Bar
                        label="Practice Questions"
                        value={row.practice_exam_pct}
                        color="#0F7B52"
                      />

                      {/* The badge says whether the track is cleared; this
                          says how far off it is. */}
                      <div className="flex items-baseline justify-between text-xs font-bold">
                        <span className="text-muted-foreground">
                          Practice Exams Passed
                        </span>
                        <span
                          className={`tabular-nums ${passed ? "text-[#0F7B52]" : ""}`}
                        >
                          {passesLabel(row.exam_passes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
