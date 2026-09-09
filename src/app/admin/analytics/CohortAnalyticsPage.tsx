"use client";

import { AppNav } from "@/components/ui/app-nav";
import { SummaryTile } from "@/components/ui/summary-tile";
import { staffTitleFor } from "@/lib/helper/roles";
import { examLabels, type ExamType } from "@/lib/types/common";
import {
  Award,
  ClipboardCheck,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type TrackRow = {
  examType: ExamType;
  active: number;
  flashcardPct: number;
  memorizePct: number;
  practicePct: number;
  sittings: number;
  passes: number;
  cleared: number;
};

type ManagerRow = {
  id: string;
  name: string;
  email: string;
  recruits: number;
  started: number;
  averagePct: number;
};

type Cohort = {
  scope: "all" | "own";
  reviewees: number;
  passesRequired: number;
  tracks: TrackRow[];
  weekly: { week: string; sittings: number; passes: number }[];
  managers: ManagerRow[];
};

/** A percentage as a bar, so a row of tracks compares at a glance. */
function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EFEAE0]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, value)}%`, background: tone }}
        />
      </div>
      <span className="w-9 shrink-0 text-right tabular-nums">{value}%</span>
    </div>
  );
}

const weekLabel = (week: string) =>
  new Date(`${week}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export function CohortAnalyticsPage() {
  const { data: session } = useSession();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;

    fetch("/api/admin/analytics")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load");
        return data as Cohort;
      })
      .then((data) => live && setCohort(data))
      .catch((loadError) => live && setError(loadError.message));

    return () => {
      live = false;
    };
  }, []);

  const title = staffTitleFor(session?.user?.role) ?? "Staff";

  const cleared =
    cohort?.tracks.reduce((sum, row) => sum + row.cleared, 0) ?? 0;
  const sittings =
    cohort?.tracks.reduce((sum, row) => sum + row.sittings, 0) ?? 0;
  const passes = cohort?.tracks.reduce((sum, row) => sum + row.passes, 0) ?? 0;
  const busiestWeek = Math.max(
    1,
    ...(cohort?.weekly.map((week) => week.sittings) ?? [1]),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="mx-auto w-full max-w-[1500px] px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">Cohort Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {cohort?.scope === "own"
                ? "The reviewees you recruited, across every track."
                : "Every reviewee, across every track."}{" "}
              Read as {title}.
            </p>
          </div>

          {/* The same figures the table shows, for whoever wants them in a
              spreadsheet rather than on a screen. */}
          <a
            href="/api/admin/analytics?format=csv"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:border-[#C9A227] hover:bg-[#FFF8D6]"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        </div>

        {error ? (
          <p className="mt-8 text-sm font-semibold text-destructive">{error}</p>
        ) : !cohort ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Loading cohort figures…
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryTile
                label="Reviewees"
                value={cohort.reviewees}
                icon={Users}
                tone="bg-[#E8EEF6] text-[#0B2340]"
              />
              <SummaryTile
                label="Exams sat"
                value={sittings}
                hint={`${passes} passed`}
                icon={ClipboardCheck}
                tone="bg-[#FFF3C4] text-[#8A6D0B]"
              />
              <SummaryTile
                label="Pass rate"
                value={`${sittings ? Math.round((passes / sittings) * 100) : 0}%`}
                icon={TrendingUp}
                tone="bg-[#DCFCE7] text-[#166534]"
              />
              <SummaryTile
                label="Tracks cleared"
                value={cleared}
                hint={`${cohort.passesRequired} passes each`}
                icon={Award}
                tone="bg-[#F3E8FF] text-[#6B21A8]"
              />
            </div>

            <section className="rv-card mt-6 overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-extrabold">Where the cohort stands</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mastery is what the whole cohort has mastered against what it
                  could — a track nobody has opened reads nought.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold">Track</th>
                      <th className="px-5 py-3 text-left font-bold">
                        Studying
                      </th>
                      <th className="px-5 py-3 text-left font-bold">
                        Flashcards
                      </th>
                      <th className="px-5 py-3 text-left font-bold">
                        Memorize
                      </th>
                      <th className="px-5 py-3 text-left font-bold">
                        Practice
                      </th>
                      <th className="px-5 py-3 text-left font-bold">
                        Sittings
                      </th>
                      <th className="px-5 py-3 text-left font-bold">Cleared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohort.tracks.map((track) => (
                      <tr
                        key={track.examType}
                        className="border-t border-border"
                      >
                        <td className="px-5 py-3 font-bold">
                          {examLabels[track.examType]}
                        </td>
                        <td className="px-5 py-3 tabular-nums">
                          {track.active} of {cohort.reviewees}
                        </td>
                        <td className="px-5 py-3">
                          <Bar value={track.flashcardPct} tone="#0B2340" />
                        </td>
                        <td className="px-5 py-3">
                          <Bar value={track.memorizePct} tone="#8A6D0B" />
                        </td>
                        <td className="px-5 py-3">
                          <Bar value={track.practicePct} tone="#166534" />
                        </td>
                        <td className="px-5 py-3 tabular-nums">
                          {track.sittings}
                          <span className="text-muted-foreground">
                            {" "}
                            · {track.passes} passed
                          </span>
                        </td>
                        <td className="px-5 py-3 font-bold tabular-nums">
                          {track.cleared}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rv-card mt-6 p-5">
              <h2 className="font-extrabold">Exams sat, last eight weeks</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A cohort going quiet is the one thing a page of current numbers
                cannot show.
              </p>

              {cohort.weekly.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  No exams have been sat in that time.
                </p>
              ) : (
                <div className="mt-5 flex items-end gap-3 overflow-x-auto">
                  {cohort.weekly.map((week) => (
                    <div
                      key={week.week}
                      className="flex min-w-14 flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-xs font-bold tabular-nums">
                        {week.sittings}
                      </span>
                      <div className="flex h-28 w-full items-end justify-center">
                        <div
                          className="w-8 rounded-t-md bg-[#0B2340]"
                          style={{
                            height: `${(week.sittings / busiestWeek) * 100}%`,
                          }}
                          title={`${week.passes} of ${week.sittings} passed`}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {weekLabel(week.week)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {cohort.managers.length > 0 && (
              <section className="rv-card mt-6 overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-extrabold">Intake by Field Manager</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Recruiting is only half of it: how many of those recruits
                    have started, and how far they have got.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold">
                          Field Manager
                        </th>
                        <th className="px-5 py-3 text-left font-bold">
                          Recruits
                        </th>
                        <th className="px-5 py-3 text-left font-bold">
                          Started
                        </th>
                        <th className="px-5 py-3 text-left font-bold">
                          Towards clearing
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohort.managers.map((manager) => (
                        <tr key={manager.id} className="border-t border-border">
                          <td className="px-5 py-3">
                            <p className="font-bold">{manager.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {manager.email}
                            </p>
                          </td>
                          <td className="px-5 py-3 tabular-nums">
                            {manager.recruits}
                          </td>
                          <td className="px-5 py-3 tabular-nums">
                            {manager.started}
                            {manager.recruits > 0 && (
                              <span className="text-muted-foreground">
                                {" "}
                                of {manager.recruits}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <Bar value={manager.averagePct} tone="#C9A227" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
