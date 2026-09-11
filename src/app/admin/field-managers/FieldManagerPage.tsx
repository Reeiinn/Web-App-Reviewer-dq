"use client";

import { AppNav } from "@/components/ui/app-nav";
import { ManagerGridSkeleton } from "./ManagerSkeleton";
import { Avatar } from "@/components/ui/avatar";
import { FilterSelect, type SelectOption } from "@/components/ui/select";
import {
  SummaryTile,
  SummaryTilesSkeleton,
} from "@/components/ui/summary-tile";
import { InviteFieldManager } from "@/components/ui/invite-field-manager";
import {
  RECRUIT_TARGET,
  lastSeenLabel,
  rankFieldManagers,
  recruitProgress,
} from "@/lib/helper/field-manager";
import { presenceLabels, type PresenceStatus } from "@/lib/helper/presence";
import {
  filterSearch,
  indexForSearch,
  searchNeedle,
} from "@/lib/helper/search";
import { staffTitleFor } from "@/lib/helper/roles";
import {
  AlertTriangle,
  Clock,
  Search,
  Sparkles,
  Target,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type FieldManager = {
  id: string;
  name: string;
  email: string;
  /** Profile photo as a data URL, null until the account uploads one. */
  image: string | null;
  /** Null for an account that has never opened the app. */
  lastSeenAt: string | null;
  status: PresenceStatus;
  /** Reviewees who signed up through this manager's invite. */
  reviewees: number;
  newThisMonth: number;
};

/** Cards are large, so a page holds six rows of the two-up grid. */
const PAGE_SIZE = 12;

const sorts = {
  recruits_desc: "Recruits (Most to Fewest)",
  new_desc: "New Recruits This Month",
  recent_active: "Recently Active",
  name_asc: "Name (A-Z)",
} as const;

type SortKey = keyof typeof sorts;

const sortOptions: readonly SelectOption<SortKey>[] = Object.entries(sorts).map(
  ([value, label]) => ({ value: value as SortKey, label }),
);

const activityOptions: readonly SelectOption<PresenceStatus | "ALL">[] = [
  { value: "ALL", label: "All Activity" },
  { value: "ACTIVE", label: presenceLabels.ACTIVE },
  { value: "IDLE", label: presenceLabels.IDLE },
  { value: "INACTIVE", label: presenceLabels.INACTIVE },
];

/**
 * The cards sit on navy rather than the page's cream, so the light-theme
 * presence pills from the roster would be unreadable on them. Same three
 * states, same labels — only the surface differs.
 */
const pillStyles: Record<PresenceStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  IDLE: "border-amber-300/35 bg-amber-500/15 text-amber-200",
  INACTIVE: "border-slate-300/25 bg-slate-400/15 text-slate-300",
};

/** The avatar's ring carries the same three states as the pill beside it. */
const ringStyles: Record<PresenceStatus, string> = {
  ACTIVE: "border-emerald-400",
  IDLE: "border-amber-400",
  INACTIVE: "border-slate-500",
};

/**
 * Gold, silver and bronze for the podium; a plain chip for everyone else.
 *
 * The rank is the manager's place in the whole roster, not their position in
 * whatever the admin has just sorted or filtered to — sorting by name must
 * reorder the cards without renumbering them.
 */
const rankStyles = (rank: number) => {
  if (rank === 1)
    return "bg-gradient-to-b from-[#FFE27A] to-[#C9A227] text-[#33270A]";
  if (rank === 2)
    return "bg-gradient-to-b from-[#EEF2F6] to-[#B9C4CF] text-[#22303F]";
  if (rank === 3)
    return "bg-gradient-to-b from-[#F0D0AC] to-[#C08444] text-[#33200A]";
  return "border border-white/15 bg-white/10 text-slate-200";
};

/** One figure in the card's centre column. */
function CardStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-extrabold leading-tight">
          {value}
          {hint && (
            <span className="ml-1 text-[11px] font-bold text-slate-400">
              {hint}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * How full the recruit ring is drawn.
 *
 * The number inside it is the plain count; the circle only shows that count
 * against RECRUIT_TARGET, so a manager past the target reads as full rather
 * than as a figure that means nothing without knowing the best peer's.
 */
function RecruitRing({
  recruits,
  tone,
}: {
  recruits: number;
  /** Stroke colour, red once a manager has gone dormant. */
  tone: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (recruitProgress(recruits) / 100) * circumference;

  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 96 96" className="size-full -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="7"
        />
        {recruits > 0 && (
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span
          className={`block text-[28px] font-extrabold leading-none tracking-tight ${
            recruits > 0 ? "" : "text-slate-500"
          }`}
        >
          {recruits}
        </span>
        <span className="mt-1 block text-[8.5px] font-bold uppercase tracking-[0.09em] text-slate-400">
          Recruits
        </span>
      </div>
    </div>
  );
}

function ManagerCard({
  manager,
  rank,
}: {
  manager: FieldManager;
  rank: number;
}) {
  const dormant = manager.status === "INACTIVE";
  const leader = rank === 1 && manager.reviewees > 0;
  const short = RECRUIT_TARGET - manager.reviewees;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0F2841] to-[#0B1C31] text-white shadow-lg ${
        leader
          ? "border-[#C9A227]/60"
          : dormant
            ? "border-rose-500/40"
            : "border-[#1D3A5C]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <p
          className={`flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] ${
            leader
              ? "text-[#FFD77A]"
              : dormant
                ? "text-rose-300"
                : "text-slate-400"
          }`}
        >
          {dormant && <AlertTriangle className="size-3" />}
          {leader
            ? "Top unit manager"
            : dormant
              ? "Dormant unit manager"
              : staffTitleFor("MANAGER")}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${rankStyles(rank)}`}
          >
            Rank {rank}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pillStyles[manager.status]}`}
          >
            {manager.status === "INACTIVE" && manager.lastSeenAt
              ? `Inactive ${lastSeenLabel(manager.lastSeenAt)}`
              : manager.lastSeenAt
                ? presenceLabels[manager.status]
                : "Never opened"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 pb-4 pt-3 sm:flex-nowrap">
        <Avatar
          name={manager.name}
          image={manager.image}
          size="size-[68px]"
          className={`border-2 bg-[#16324F] text-base text-slate-200 ${ringStyles[manager.status]}`}
        />

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-lg font-extrabold leading-tight ${leader ? "text-[#FFD400]" : ""}`}
          >
            {manager.name}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            {staffTitleFor("MANAGER")} · {manager.email}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5">
          <CardStat
            icon={UserPlus}
            label="Recruits"
            value={manager.reviewees}
            hint={manager.reviewees === 1 ? "reviewee" : "reviewees"}
          />
          <CardStat
            icon={Sparkles}
            label="New This Month"
            value={manager.newThisMonth}
          />
          <CardStat
            icon={Clock}
            label="Last Opened"
            value={lastSeenLabel(manager.lastSeenAt)}
          />
        </div>

        <RecruitRing
          recruits={manager.reviewees}
          tone={dormant ? "#E11D48" : "#FFD400"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-white/[0.025] px-4 py-2.5">
        <p className="text-[11px] font-bold text-slate-400">
          {manager.reviewees === 0
            ? "No recruits yet"
            : short > 0
              ? `${short} short of the ${RECRUIT_TARGET} target`
              : `Target met — ${manager.reviewees} of ${RECRUIT_TARGET}`}
        </p>

        {manager.reviewees > 0 ? (
          <Link
            href={`/admin?manager=${encodeURIComponent(manager.email)}`}
            className="rounded-lg bg-[#FFD400] px-3.5 py-1.5 text-[11.5px] font-extrabold text-[#0B2340] transition hover:bg-[#FFE04D]"
          >
            View recruits →
          </Link>
        ) : (
          // Nothing to open: the roster would come back empty, and a link that
          // leads to an empty screen reads as a fault rather than as an answer.
          <span className="rounded-lg bg-white/10 px-3.5 py-1.5 text-[11.5px] font-extrabold text-slate-400">
            No recruits
          </span>
        )}
      </div>
    </article>
  );
}

export function FieldManagerPage() {
  const [managers, setManagers] = useState<FieldManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("recruits_desc");
  const [activity, setActivity] = useState<PresenceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/managers")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load");
        return data as FieldManager[];
      })
      .then((data) => active && setManagers(data))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      total: managers.length,
      active: managers.filter((row) => row.status === "ACTIVE").length,
      inactive: managers.filter((row) => row.status === "INACTIVE").length,
      recruits: managers.reduce((running, row) => running + row.reviewees, 0),
    }),
    [managers],
  );

  // Ranked once, over everybody. Filtering to the dormant managers must not
  // promote the first of them to rank 1.
  const ranked = useMemo(
    () =>
      rankFieldManagers(
        managers.map((manager) => ({
          ...manager,
          recruits: manager.reviewees,
        })),
      ),
    [managers],
  );

  // Folded once per ranking rather than once per letter typed.
  const index = useMemo(
    () => indexForSearch(ranked, (row) => [row.name, row.email]),
    [ranked],
  );

  // The box holds what was typed; the cards follow a beat behind, so typing
  // never waits on a page of them re-rendering.
  const deferredSearch = useDeferredValue(search);

  const visible = useMemo(() => {
    const filtered = filterSearch(
      index,
      searchNeedle(deferredSearch),
      (row) => activity === "ALL" || row.status === activity,
    );

    return filtered.sort((a, b) => {
      if (sort === "name_asc") return a.name.localeCompare(b.name);
      if (sort === "new_desc") return b.newThisMonth - a.newThisMonth;
      if (sort === "recent_active") {
        const time = (value: string | null) =>
          value ? new Date(value).getTime() : 0;
        return time(b.lastSeenAt) - time(a.lastSeenAt);
      }
      // The default order is the ranking itself, ties already settled.
      return a.rank - b.rank;
    });
  }, [index, activity, deferredSearch, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const share = (part: number) =>
    counts.total ? `(${((part / counts.total) * 100).toFixed(1)}%)` : "(0%)";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="mx-auto w-full max-w-[1500px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold">Unit Manager Console</h1>
            <span className="rounded-full bg-[#0B2340] px-3 py-1 text-xs font-bold text-[#FFD400]">
              {counts.total} Unit Managers
            </span>
          </div>

          {/* Only the Sales Manager reaches this page, and the API refuses the
              role to anyone else regardless. */}
          <InviteFieldManager />
        </div>
        <p className="mt-1.5 max-w-[72ch] text-sm text-muted-foreground">
          Every unit manager ranked by how many reviewees they have recruited,
          with their activity alongside so a quiet week is visible next to the
          count.
        </p>

        {loading ? (
          <SummaryTilesSkeleton
            tiles={[
              { label: "Unit Managers", tone: "bg-muted" },
              { label: "Active Today", tone: "bg-emerald-50" },
              { label: "Total Recruits", tone: "bg-[#FFF8D6]" },
              { label: "Inactive", tone: "bg-rose-50" },
            ]}
          />
        ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="Unit Managers"
            value={counts.total}
            icon={Users}
            tone="bg-muted text-[#0B2340]"
          />
          <SummaryTile
            label="Active Today"
            value={counts.active}
            hint={share(counts.active)}
            icon={Zap}
            tone="bg-emerald-50 text-emerald-700"
          />
          <SummaryTile
            label="Total Recruits"
            value={counts.recruits}
            icon={Target}
            tone="bg-[#FFF8D6] text-[#8A6D0B]"
          />
          <SummaryTile
            label="Inactive"
            value={counts.inactive}
            hint={share(counts.inactive)}
            icon={AlertTriangle}
            tone="bg-rose-50 text-rose-700"
          />
        </div>
        )}

        <div className="rv-card mt-6 flex flex-wrap items-end gap-6 p-5">
          <FilterSelect
            label="Rank By"
            value={sort}
            onValueChange={(next) => {
              setSort(next);
              setPage(1);
            }}
            options={sortOptions}
            triggerClassName="w-64"
          />

          <FilterSelect
            label="Activity"
            value={activity}
            onValueChange={(next) => {
              setActivity(next);
              setPage(1);
            }}
            options={activityOptions}
            triggerClassName="w-52"
          />

          <label className="ml-auto text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Search Unit Manager
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Name or email"
                className="w-72 rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none focus:border-[#0B2340]"
              />
            </div>
          </label>
        </div>

        {loading ? (
          <ManagerGridSkeleton />
        ) : error ? (
          <p className="mt-8 text-sm font-semibold text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <div className="rv-card mt-6 p-10 text-center">
            <p className="font-bold">No unit managers match these filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {managers.length === 0
                ? "No unit manager accounts have been created yet."
                : deferredSearch.trim()
                  ? `Nothing matches "${deferredSearch.trim()}". Try a different name or email.`
                  : "Try clearing the activity filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {rows.map((manager) => (
                <ManagerCard
                  key={manager.id}
                  manager={manager}
                  rank={manager.rank}
                />
              ))}
            </div>

            <div className="rv-card mt-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
              <p className="text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, visible.length)} of{" "}
                {visible.length} unit managers
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold">
                  {currentPage} / {pageCount}
                </span>
                <button
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  disabled={currentPage === pageCount}
                  className="rounded-lg border border-border px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
