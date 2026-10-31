"use client";

import { AppNav } from "@/components/ui/app-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { trackCopy } from "@/app/dashboard/track-copy";
import { examTypes, type ExamType } from "@/lib/types/common";
import { initialPicks } from "@/lib/helper/exam-choice";
import type { FocusTracks } from "@/lib/helper/focus-tracks";
import type { ExamResults } from "@/lib/types/exam-results";
import { Check, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Where a reviewee says which exams they are taking.
 *
 * Shown once on the way into the app, and again from "Edit exams" on the
 * dashboard. An exam that already carries a licensing result stays ticked and
 * locked: dropping it would leave the result pointing at nothing.
 */
export function ChooseExamsPage() {
  const router = useRouter();
  const { status, update } = useSession();

  const [picked, setPicked] = useState<Set<ExamType>>(new Set());
  const [results, setResults] = useState<ExamResults>({});
  /** True once a choice has been saved before, so the button says Save. */
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const read = async <T,>(url: string) => {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load");
      return data as T;
    };

    // The pick and the results are separate reads: the pick is the reviewee's
    // own setting, the results are staff's record of the real exam.
    Promise.all([
      read<FocusTracks>("/api/user/focus-tracks"),
      read<{ results: ExamResults }>("/api/user/exam-results"),
    ])
      .then(([focus, marks]) => {
        if (!active) return;
        const results = marks.results ?? {};
        setPicked(initialPicks(focus.chosen ? focus.tracks : null, results));
        setResults(results);
        setEditing(focus.chosen);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const toggle = (track: ExamType) => {
    if (results[track]) return;
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(track)) next.delete(track);
      else next.add(track);
      return next;
    });
  };

  async function save() {
    if (picked.size === 0 || saving) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/user/focus-tracks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: [...picked] }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save your exams.");
        setSaving(false);
        return;
      }

      // The middleware reads the choice off the token. Navigating before the
      // token carries it would send the reviewee straight back here.
      await update();
      router.replace("/dashboard");
    } catch {
      setError("Could not save your exams.");
      setSaving(false);
    }
  }

  const count = picked.size;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-8 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Which exams are you taking?
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick every licensing exam you&apos;re preparing for. You can change
            this later from your dashboard.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {loading
              ? examTypes.map((track) => (
                  <Skeleton key={track} className="h-[92px] rounded-xl" />
                ))
              : examTypes.map((track) => {
                  const selected = picked.has(track);
                  const outcome = results[track];
                  return (
                    <div
                      key={track}
                      role="checkbox"
                      aria-checked={selected}
                      aria-disabled={Boolean(outcome)}
                      tabIndex={0}
                      onClick={() => toggle(track)}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          toggle(track);
                        }
                      }}
                      className={`flex gap-3 rounded-xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2340] ${
                        selected
                          ? "border-[#0B2340] bg-[#F6F8FB]"
                          : "border-border bg-card hover:border-[#D8CFB8]"
                      } ${outcome ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-md border-2 ${
                          selected
                            ? "border-[#0B2340] bg-[#FFD400] text-[#0B2340]"
                            : "border-[#C9C1AD]"
                        }`}
                      >
                        {selected && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold">
                          {trackCopy[track].title}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {trackCopy[track].blurb}
                        </span>
                        {outcome && (
                          <span
                            className={`mt-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                              outcome === "PASSED"
                                ? "bg-[#E7F4EE] text-[#0F7B52]"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            <Lock className="size-3" />
                            {outcome === "PASSED" ? "Passed" : "Failed"}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-bold">
              {count
                ? `${count} exam${count === 1 ? "" : "s"} selected`
                : "Select at least one exam"}
            </span>
            <button
              type="button"
              onClick={save}
              // update() does nothing while the session is still loading, and
              // navigating then would bounce straight back here.
              disabled={
                count === 0 || saving || loading || status === "loading"
              }
              className="rounded-lg bg-[#FFD400] px-5 py-2.5 text-sm font-extrabold text-[#0B2340] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Save" : "Continue to dashboard"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
