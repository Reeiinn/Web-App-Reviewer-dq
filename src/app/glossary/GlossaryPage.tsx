"use client";

import { AppNav } from "@/components/ui/app-nav";
import { examLabels, examTypes, type ExamType } from "@/lib/types/common";
import type { GlossaryTerm } from "@/lib/types/glossary";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fresh } from "@/lib/helper/fetch-fresh";
import {
  filterSearch,
  indexForSearch,
  searchNeedle,
} from "@/lib/helper/search";
import {
  anchorsFor,
  detailsSearchText,
  normalizeDetails,
} from "@/lib/helper/glossary";
import { TermCard } from "./term-card";

type TrackFilter = ExamType | "ALL";

export function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackFilter>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/glossary", fresh)
      .then((response) => response.json())
      .then((data: unknown) => {
        if (!active) return;
        if (!Array.isArray(data)) {
          setTerms([]);
          return;
        }
        // `details` is a jsonb column: it is checked here, once, so no card
        // has to defend itself against a malformed row.
        setTerms(
          data.map((row) => ({
            ...row,
            details: normalizeDetails(row?.details),
          })),
        );
      })
      .catch(() => active && setTerms([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  // Terms and their definitions are folded once, when the glossary arrives.
  // A definition is a paragraph, and refolding every one of them per letter was
  // the whole cost of typing here. Examples and key points fold in alongside
  // them, so "trust" finds Absolute Assignee by its example.
  const index = useMemo(
    () =>
      indexForSearch(terms, (item) => [
        item.term,
        item.definition,
        detailsSearchText(item.details),
      ]),
    [terms],
  );

  // The box holds what was typed; the list follows a beat behind under load.
  // React keeps the input painting at typing speed rather than making each
  // keystroke wait for the filtered list to render.
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(
    () =>
      filterSearch(
        index,
        searchNeedle(deferredQuery),
        (item) => track === "ALL" || item.exam_type === track,
      ),
    [index, deferredQuery, track],
  );

  // Anchors come from the whole glossary, not the filtered view, so a term
  // keeps the same link whatever is typed in the box.
  const anchors = useMemo(() => anchorsFor(terms), [terms]);

  const countFor = (filter: TrackFilter) =>
    filter === "ALL"
      ? terms.length
      : terms.filter((item) => item.exam_type === filter).length;

  const filters: { value: TrackFilter; label: string }[] = [
    { value: "ALL", label: "All Tracks" },
    ...examTypes.map((type) => ({ value: type, label: examLabels[type] })),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-8">
        <section className="rounded-xl bg-[#0B2340] p-9 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <h1 className="text-4xl font-extrabold md:text-5xl">
                Insurance Glossary
              </h1>
              <p className="mt-3 text-sm text-white/75">
                Master the terminology required for your licensing exams. Search
                or browse key terms below.
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search
                className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-[#0B2340]/50"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search glossary terms"
                placeholder="Search terms..."
                className="w-full rounded-lg bg-white py-3 pl-10 pr-3 text-sm text-[#10151F] outline-none placeholder:text-[#A9A092] focus:ring-2 focus:ring-[#FFD400]"
              />
            </div>
          </div>
        </section>

        <div
          role="group"
          aria-label="Filter terms by track"
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          {filters.map((filter) => {
            const selected = track === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setTrack(filter.value)}
                aria-pressed={selected}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  selected
                    ? "border-[#0B2340] bg-[#0B2340] text-white"
                    : "border-border bg-card text-muted-foreground hover:border-[#C9A227] hover:text-foreground"
                }`}
              >
                {filter.label}
                <span
                  className={`ml-2 ${selected ? "text-[#FFD400]" : "text-muted-foreground"}`}
                >
                  {countFor(filter.value)}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading terms…</p>
        ) : visible.length === 0 ? (
          <div className="rv-card mt-6 p-8 text-center">
            <p className="font-bold">
              {terms.length === 0
                ? "No glossary terms have been added yet."
                : "No terms match these filters."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {terms.length === 0
                ? "Terms added to the vocabulary library will appear here."
                : "Try a shorter search, or switch to All Tracks."}
            </p>
          </div>
        ) : (
          // Cards vary enormously in height once they carry their examples and
          // tables, so they run down one column with an index beside them
          // rather than across a grid that leaves ragged gaps.
          //
          // Both layouts size that column with minmax(0,…). An auto-sized track
          // grows to fit its widest content, so the one card carrying a
          // comparison table set the width of the whole page — and every other
          // card with it — on anything narrower than the table.
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <nav
              aria-label="Glossary terms"
              // Parks below the sticky AppNav, not under it.
              className="rv-card sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto p-4 lg:block"
            >
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {visible.length} {visible.length === 1 ? "term" : "terms"}
              </h2>
              <ol className="flex flex-col gap-0.5">
                {visible.map((item, position) => (
                  <li key={item.id}>
                    <a
                      href={`#${anchors.get(item.id)}`}
                      className="flex gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug text-[#2C3442] hover:bg-accent hover:text-[#0B2340]"
                    >
                      <span className="font-bold tabular-nums text-[#A9A092]">
                        {String(position + 1).padStart(2, "0")}
                      </span>
                      <span>{item.term}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* min-w-0: a grid item will not shrink past its widest content
                otherwise, and one card's comparison table would set the width
                of every card in the column. */}
            <div className="flex min-w-0 flex-col gap-4">
              {visible.map((item) => (
                <TermCard
                  key={item.id}
                  term={item}
                  anchor={anchors.get(item.id) ?? item.id}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
