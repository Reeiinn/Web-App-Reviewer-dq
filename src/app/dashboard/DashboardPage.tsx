"use client";

import { AppNav } from "@/components/ui/app-nav";
import type { Eligibility } from "@/lib/types/eligibility";
import { lockReason } from "@/lib/helper/eligibility";
import { pickActiveTrack, type TrackActivity } from "@/lib/helper/active-track";
import { examLabels, examTypes, type ExamType } from "@/lib/types/common";
import type { StudyMode } from "@/lib/types/study";
import {
  ArrowRight,
  BrainCircuit,
  ChevronDown,
  ClipboardCheck,
  Layers,
  LineChart,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ProgressSummaryRow = {
  exam_type: ExamType;
  last_activity_at: string | null;
  flashcard_pct: number;
  memorize_pct: number;
  practice_exam_pct: number;
  overall_pct: number;
};

type RecentItem = {
  exam_type: ExamType;
  mode: StudyMode;
  visited_at: string;
};

const modeMeta: Record<
  StudyMode,
  { title: string; icon: typeof Layers; href: (type: ExamType) => string }
> = {
  flashcard: {
    title: "Flashcards",
    icon: Layers,
    href: (type) => `/learningMethods/flashCard?exam_type=${type}`,
  },
  memorize: {
    title: "Memorize",
    icon: BrainCircuit,
    href: (type) => `/learningMethods/memorization?exam_type=${type}`,
  },
  practice: {
    title: "Practice Exam",
    icon: ClipboardCheck,
    href: (type) => `/learningMethods/practiceExam?exam_type=${type}`,
  },
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
      className="flex flex-col rounded-lg border border-border bg-background p-3 transition hover:border-[#C9A227] hover:bg-[#FFF8D6]"
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-[#0B2340]" />
        <span className="font-extrabold">{title}</span>
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{blurb}</span>
      <span className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#8A6D0B]">
          {remaining === null
            ? "Open"
            : remaining > 0
              ? `${remaining} left to master`
              : "All mastered"}
        </span>
        <ArrowRight className="size-3.5 shrink-0 text-[#0B2340]" />
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
  onClose,
}: {
  type: ExamType;
  overall: number;
  eligibility: Eligibility | null;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
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

  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  // The mode picker is pinned to the viewport in a portal rather than placed
  // inside the card: an in-flow panel grows the card, and even an absolute one
  // stretches the page's scroll area when it hangs past the last row. Fixed to
  // the body it can do neither, so the screen stays put whichever track opens.
  useEffect(() => {
    if (!expanded) {
      setCoords(null);
      return;
    }

    function place() {
      const button = trigger.current;
      const panel = menu.current;
      if (!button || !panel) return;

      const rect = button.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const gap = 8;
      const edge = 8;

      // Drop below the button when there's room, otherwise flip above it.
      const below = rect.bottom + gap;
      const above = rect.top - gap - height;
      const fitsBelow = below + height + edge <= window.innerHeight;
      const top = fitsBelow || above < edge ? below : above;

      setCoords({
        top: Math.min(
          Math.max(edge, top),
          Math.max(edge, window.innerHeight - height - edge),
        ),
        left: Math.min(
          Math.max(edge, rect.left),
          Math.max(edge, window.innerWidth - width - edge),
        ),
      });
    }

    place();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      // The trigger owns its own toggle - closing here too would reopen it.
      if (!menu.current?.contains(target) && !trigger.current?.contains(target))
        onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
    };
  }, [expanded, onClose]);

  return (
    <section className="rv-card flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {active && (
            <span className="rounded bg-[#FFD400] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0B2340]">
              Active
            </span>
          )}
          {/* A phone card is too narrow for the full name without wrapping to
              a second line, and that line is height the screen can't spare. */}
          <h3 className="text-base font-extrabold">
            <span className="sm:hidden">{examLabels[type]}</span>
            <span className="hidden sm:inline">{title}</span>
          </h3>
        </div>
        {active ? (
          <LineChart className="size-4 shrink-0 text-[#C98A00]" />
        ) : (
          <ShieldCheck className="size-4 shrink-0 text-[#0B2340]" />
        )}
      </div>

      {/* sm:line-clamp-1 rather than hidden + sm:block + line-clamp-1: the
          clamp sets its own display, so the two would fight over it. */}
      <p className="mt-1 hidden text-xs text-muted-foreground sm:line-clamp-1">
        {blurb}
      </p>

      <div className="mt-2 sm:mt-3">
        <div className="flex items-baseline justify-between text-xs font-bold">
          <span>Overall Progress</span>
          <span>{overall}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              active ? "bg-[#8A6D0B]" : "bg-[#0B2340]"
            }`}
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      {/* Side by side from sm up, where a wrapped row would cost ~44px of
          height the screen can't spare; stacked full-width on a phone, where
          the two-up card is too narrow to sit them next to each other. */}
      <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3 sm:flex-nowrap">
        <button
          ref={trigger}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-haspopup="menu"
          className={`flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition sm:w-auto sm:justify-start ${
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
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-muted px-3 py-2 text-sm font-bold text-muted-foreground sm:w-auto"
          >
            <Lock className="size-3.5 shrink-0" />
            Practice Exam
          </span>
        ) : (
          <Link
            href={`/learningMethods/practiceExam?exam_type=${type}`}
            className="w-full whitespace-nowrap rounded-lg border-2 border-[#FFD400] px-3 py-2 text-center text-sm font-bold text-[#0B2340] transition hover:bg-[#FFF8D6] sm:w-auto"
          >
            Practice Exam
          </Link>
        )}

        {expanded &&
          createPortal(
            <div
              ref={menu}
              role="menu"
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0 }}
              className={`rv-pop-in fixed z-50 w-64 rounded-xl border border-border bg-popover p-3 shadow-lg ${
                coords ? "" : "invisible"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Choose a study mode for {examLabels[type]}
              </p>
              <div className="mt-2 flex flex-col gap-2">
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
            </div>,
            document.body,
          )}
      </div>

      {/* Hidden on a phone, where the four cards need every pixel: the locked
          Practice Exam button still reads as locked on its own. */}
      {locked && reason && (
        <p className="mt-2 hidden items-start gap-1.5 text-xs text-muted-foreground sm:flex">
          <Lock className="mt-0.5 size-3 shrink-0" />
          {reason}
        </p>
      )}
    </section>
  );
}

function RecentCard({ exam_type, mode }: RecentItem) {
  const { title, icon: Icon, href } = modeMeta[mode];
  return (
    <Link
      href={href(exam_type)}
      className="block rounded-xl bg-[#0B2340] p-3 text-white transition hover:bg-[#0F2E4D] sm:p-5"
    >
      {/* One condensed row below sm, the original stacked card at sm and up. */}
      <div className="flex items-center justify-between gap-2.5 sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-[#FFD400]" />
          <span className="truncate font-extrabold">{title}</span>
          <span className="shrink-0 text-xs text-white/75">
            {examLabels[exam_type]}
          </span>
        </div>
        <ArrowRight className="size-4 shrink-0 text-[#FFD400]" />
      </div>

      <div className="hidden sm:block">
        <div className="flex items-center gap-2.5">
          <Icon className="size-5 text-[#FFD400]" />
          <h3 className="text-lg font-extrabold">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-white/75">{examLabels[exam_type]}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-bold text-[#FFD400]">Continue</span>
          <ArrowRight className="size-4 text-[#FFD400]" />
        </div>
      </div>
    </Link>
  );
}

function QuickAccess({ recent }: { recent: RecentItem[] }) {
  return (
    <aside>
      {/* Below lg the tab above already names the section. */}
      <h2 className="hidden text-xl font-extrabold lg:block">Quick Access</h2>

      {recent.length > 0 ? (
        <div className="flex flex-col gap-2 sm:gap-3 lg:mt-3">
          {recent.map((item) => (
            <RecentCard
              key={`${item.exam_type}-${item.mode}`}
              exam_type={item.exam_type}
              mode={item.mode}
              visited_at={item.visited_at}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground lg:mt-3">
          Study a track and it will show up here for quick return.
        </p>
      )}
    </aside>
  );
}

function ExamTracks({
  progress,
  eligibility,
  activeTrack,
  expanded,
  onToggle,
  onClose,
}: {
  progress: Record<ExamType, number>;
  eligibility: Partial<Record<ExamType, Eligibility>>;
  activeTrack: ExamType | undefined;
  expanded: ExamType | null;
  onToggle: (type: ExamType) => void;
  onClose: () => void;
}) {
  return (
    <div>
      {/* Below lg the tab above already names the section. */}
      <h2 className="hidden text-xl font-extrabold lg:block">Exam Tracks</h2>
      <div className="grid grid-cols-2 gap-3 lg:mt-3">
        {examTypes.map((type) => (
          <TrackCard
            key={type}
            type={type}
            overall={progress[type]}
            eligibility={eligibility[type] ?? null}
            active={type === activeTrack}
            expanded={expanded === type}
            onToggle={() => onToggle(type)}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
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
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"tracks" | "quick">("tracks");

  useEffect(() => {
    let active = true;

    fetch("/api/recent-activity")
      .then((response) => response.json())
      .then((rows: RecentItem[]) => {
        if (active && Array.isArray(rows)) setRecent(rows);
      })
      .catch((error) => console.error("Failed to load recent activity:", error));

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

  // A visit is the truer "current": opening a track counts straight away,
  // where last_activity_at only moves once an answer is saved, so a track
  // opened but not answered yet still left the badge on the previous one.
  // Progress timestamps stay the fallback for accounts recorded before the
  // visit feed existed.
  const activeTrack =
    recent[0]?.exam_type ?? pickActiveTrack(examTypes, activity);

  return (
    // The dashboard is a fixed screen: the shell owns the viewport height and
    // clips, so nothing here - a dropdown included - can start a page scroll.
    // `clip` rather than `hidden` on purpose: a hidden box is still a scroll
    // container, so focusing a button in the bottom row would quietly scroll
    // the heading out of a screen that has no scrollbar to bring it back.
    <div className="flex h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="shrink-0">
        <AppNav />
      </div>

      <main className="rv-shell min-h-0 flex-1 overflow-clip py-4 sm:py-6">
        <h1 className="text-xl font-extrabold sm:text-2xl md:text-3xl">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
          Your review journey is looking bright today.
        </p>

        {/* Below lg there isn't room for tracks and quick access side by
            side without a scroll, so they become two tabs instead - each
            one fits a single screen on its own. */}
        <div className="mt-3 lg:hidden">
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="flex gap-1 rounded-lg border border-border bg-muted p-1"
          >
            <button
              role="tab"
              aria-selected={activeTab === "tracks"}
              onClick={() => setActiveTab("tracks")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition ${
                activeTab === "tracks"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Exam Tracks
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "quick"}
              onClick={() => setActiveTab("quick")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition ${
                activeTab === "quick"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Quick Access
            </button>
          </div>
        </div>

        {/* Each section is rendered once and only hidden by the tab below lg -
            rendering a second copy for desktop would open two mode popovers at
            once, since a portal lands in the body where the copy's own
            `lg:hidden` no longer reaches it. */}
        <div className="mt-4 lg:grid lg:grid-cols-[1.8fr_1fr] lg:gap-6">
          <div className={activeTab === "tracks" ? undefined : "hidden lg:block"}>
            <ExamTracks
              progress={progress}
              eligibility={eligibility}
              activeTrack={activeTrack}
              expanded={expanded}
              onToggle={(type) =>
                setExpanded((current) => (current === type ? null : type))
              }
              onClose={() => setExpanded(null)}
            />
          </div>

          <div className={activeTab === "quick" ? undefined : "hidden lg:block"}>
            <QuickAccess recent={recent} />
          </div>
        </div>
      </main>
    </div>
  );
}
