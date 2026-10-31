"use client";

import { AppNav } from "@/components/ui/app-nav";
import { Avatar } from "@/components/ui/avatar";
import { FilterSelect, type SelectOption } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SummaryTile,
  SummaryTilesSkeleton,
} from "@/components/ui/summary-tile";
import { staffTitleFor } from "@/lib/helper/roles";
import { examLabels, examTypes, type ExamType } from "@/lib/types/common";
import type { LicensingOutcome } from "@/lib/types/exam-results";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

type ResultRow = {
  revieweeId: string;
  name: string;
  email: string;
  image: string | null;
  examType: ExamType;
  outcome: LicensingOutcome;
  markedBy: string | null;
  markedByRole: "ADMIN" | "MANAGER" | null;
  markedAt: string;
};

type Totals = { passed: number; failed: number; unmarked: number };

const outcomeFilters: { value: LicensingOutcome | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PASSED", label: "Passed" },
  { value: "FAILED", label: "Failed" },
];

const examOptions: readonly SelectOption<ExamType | "ALL">[] = [
  { value: "ALL", label: "All Exams" },
  ...examTypes.map((value) => ({ value, label: examLabels[value] })),
];

/**
 * How reviewees did on the real licensing exam, as staff have recorded it.
 *
 * Read only: marks are set from the roster, beside everything else known
 * about the reviewee, so there is one place a mark is changed. Someone who
 * failed reads as retaking rather than finished, because they are still
 * studying for it.
 */
export function ResultsPage() {
  const [outcome, setOutcome] = useState<LicensingOutcome | "ALL">("ALL");
  const [examType, setExamType] = useState<ExamType | "ALL">("ALL");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // The table keeps the previous answer on screen until the new one lands,
    // so switching a filter never blanks it.
    let active = true;

    const query = new URLSearchParams();
    if (outcome !== "ALL") query.set("outcome", outcome);
    if (examType !== "ALL") query.set("exam_type", examType);

    fetch(`/api/admin/results?${query}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load");
        return data as { rows: ResultRow[]; totals: Totals };
      })
      .then((data) => {
        if (!active) return;
        setRows(data.rows);
        setTotals(data.totals);
        setError("");
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [outcome, examType]);

  const nothingRecorded = totals && totals.passed + totals.failed === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-8">
        <h1 className="text-3xl font-extrabold">Licensing Exam Results</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Real exam outcomes recorded by staff. Reviewees who failed can keep
          reviewing for their retake.
        </p>

        {totals ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <SummaryTile
              label="Passed"
              value={totals.passed}
              icon={CheckCircle2}
              tone="bg-emerald-50 text-emerald-700"
            />
            <SummaryTile
              label="Failed (retaking)"
              value={totals.failed}
              icon={RotateCcw}
              tone="bg-rose-50 text-rose-700"
            />
            <SummaryTile
              label="Not yet marked"
              value={totals.unmarked}
              icon={Clock}
              tone="bg-muted text-muted-foreground"
            />
          </div>
        ) : (
          <SummaryTilesSkeleton
            className="sm:grid-cols-3 xl:grid-cols-3"
            tiles={[
              { label: "Passed", tone: "bg-emerald-50" },
              { label: "Failed (retaking)", tone: "bg-rose-50" },
              { label: "Not yet marked", tone: "bg-muted" },
            ]}
          />
        )}

        <div className="mt-7 flex flex-wrap items-end gap-4">
          <div className="flex gap-2" role="group" aria-label="Filter by result">
            {outcomeFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={outcome === filter.value}
                onClick={() => setOutcome(filter.value)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  outcome === filter.value
                    ? "border-[#0B2340] bg-[#0B2340] text-white"
                    : "border-border bg-card hover:border-[#0B2340]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <FilterSelect
            label="Exam"
            value={examType}
            onValueChange={setExamType}
            options={examOptions}
            className="ml-auto"
          />
        </div>

        {error ? (
          <p className="mt-8 text-sm font-semibold text-destructive">{error}</p>
        ) : loading && rows.length === 0 ? (
          <div className="rv-card mt-6 space-y-3 p-5">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rv-card mt-6 p-10 text-center">
            <p className="font-bold">
              {nothingRecorded
                ? "No results recorded yet."
                : "No results match these filters."}
            </p>
          </div>
        ) : (
          <div className="rv-card mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#0B2340] text-white">
                  <tr>
                    {["Reviewee", "Exam", "Result", "Marked By", "Date"].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="whitespace-nowrap px-5 py-4 text-[11px] font-bold uppercase tracking-wide"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.revieweeId} ${row.examType}`}
                      className="border-t border-border"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={row.name} image={row.image} />
                          <div className="min-w-0">
                            <p className="font-bold">{row.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold">
                        {examLabels[row.examType]}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${
                            row.outcome === "PASSED"
                              ? "border-[#B8DFCA] bg-[#E7F4EE] text-[#0F7B52]"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {row.outcome === "PASSED"
                            ? "Passed"
                            : "Failed · can retake"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {row.markedBy ?? "Former staff"}
                        </p>
                        {row.markedByRole && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {staffTitleFor(row.markedByRole)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {new Date(row.markedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
