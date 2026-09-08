"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AppNav } from "@/components/ui/app-nav";
import { Avatar } from "@/components/ui/avatar";
import {
  ButtonHoldAndRelease,
  type HoldHandle,
} from "@/components/ui/hold-and-release-button";
import { Invite } from "@/components/ui/invite";
import { FilterSelect, type SelectOption } from "@/components/ui/select";
import { SummaryTile } from "@/components/ui/summary-tile";
import { staffTitleFor } from "@/lib/helper/roles";
import { NUDGE_MAX_LENGTH, nudgeAge, nudgePresets } from "@/lib/helper/nudges";
import { PASSES_REQUIRED, passesLabel } from "@/lib/helper/practice-exam";
import { examLabels, examTypes, type ExamType } from "@/lib/types/common";
import {
  readinessStatus,
  statusLabels,
  statusStyles,
  type ReadinessStatus,
} from "@/lib/helper/readiness";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Search,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Recruiter = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  /** Profile photo as a data URL, null until the account uploads one. */
  image: string | null;
};

/** Where one reviewee stands on one track's practice exam. */
type ExamTrackResult = {
  examType: ExamType;
  /** Sittings completed, passed or not. */
  taken: number;
  passes: number;
  required: number;
  passed: boolean;
};

type Reviewee = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** Whoever's invite link this reviewee signed up with. */
  manager: Recruiter | null;
  readiness: number;
  status: ReadinessStatus;
  flashcards: { mastered: number; total: number };
  memorize: { mastered: number; total: number; accuracy: number };
  practice: { mastered: number; total: number };
  practiceExam: {
    taken: number;
    /** Tracks cleared: five passing sittings each. */
    passedTracks: number;
    tracks: ExamTrackResult[];
  };
  activity: { lastActivity: string | null };
};

/** One reminder already sitting in a reviewee's bell. */
type SentNudge = {
  id: string;
  senderId: string | null;
  sender: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const PAGE_SIZE = 15;

const sorts = {
  readiness_desc: "Overall Readiness (High to Low)",
  readiness_asc: "Overall Readiness (Low to High)",
  name_asc: "Name (A-Z)",
} as const;

type SortKey = keyof typeof sorts;

const sortOptions: readonly SelectOption<SortKey>[] = Object.entries(sorts).map(
  ([value, label]) => ({ value: value as SortKey, label }),
);

/**
 * "All Exams" is not a track the API knows — it means send no exam_type, which
 * scores every track and averages them.
 */
const examOptions: readonly SelectOption<ExamType | "ALL">[] = [
  { value: "ALL", label: "All Exams" },
  ...examTypes.map((value) => ({ value, label: examLabels[value] })),
];

const statusOptions: readonly SelectOption<ReadinessStatus | "ALL">[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "EXAM_READY", label: "Exam Ready" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "AT_RISK", label: "At Risk" },
];

function relativeTime(value: string | null) {
  if (!value) return "No activity yet";

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `Active ${Math.max(1, minutes)}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.round(hours / 24);
  return `Inactive ${days}d`;
}

/**
 * Per-track practice exam results for one reviewee.
 *
 * An average hid the thing a manager actually asks — which tracks has this
 * person passed — because a 78% mean says nothing about whether any single
 * track is finished. The dialog answers it one track at a time, with the
 * counter showing how far along the unfinished ones are.
 */
function ExamResults({ reviewee }: { reviewee: Reviewee }) {
  const { passedTracks, tracks } = reviewee.practiceExam;

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-[#0B2340] transition hover:border-[#C9A227] hover:bg-[#FFF8D6]">
        View
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-[#0B2340]/50 backdrop-blur-[2px]" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-left shadow-xl">
          <AlertDialog.Title className="text-lg font-extrabold">
            Practice exams — {reviewee.name}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
            {passedTracks} of {tracks.length} tracks passed. A track is passed
            after {PASSES_REQUIRED} passing sittings.
          </AlertDialog.Description>

          <ul className="mt-4 flex flex-col gap-2">
            {tracks.map((track) => (
              <li
                key={track.examType}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-bold">{examLabels[track.examType]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {track.taken === 0
                      ? "No exams taken yet"
                      : `${track.taken} sitting${track.taken === 1 ? "" : "s"} · ${passesLabel(track.passes)} passed`}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    track.passed
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {track.passed ? "Passed" : "Not passed"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-end">
            <AlertDialog.Close className="rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:border-[#C9A227]">
              Close
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function Meter({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#EFEAE0]">
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, background: tone }}
      />
    </div>
  );
}

/**
 * What the admin has to type before the delete button turns on. Naming the
 * person rather than a fixed word means a phrase copied from one dialog cannot
 * confirm the removal of somebody else.
 */
const deletePhrase = (name: string) => `Delete ${name}`;

/**
 * Spacing, case and the quotes the label puts around the phrase should not
 * stand between an admin and a deliberate delete.
 */
const tidy = (value: string) =>
  value
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const samePhrase = (a: string, b: string) => tidy(a) === tidy(b);

/**
 * Sends a reviewee a reminder without leaving the roster.
 *
 * The presets are the point: a manager reading a row that says "Inactive 6d"
 * wants one press, not a blank box and a wording decision. The custom field is
 * folded away behind them for the case a preset does not fit.
 *
 * Both staff roles get this control on the same terms — the API decides who a
 * given manager may reach, since the roster being filtered is not a guarantee.
 */
function NudgeReviewee({
  reviewee,
  onSent,
}: {
  reviewee: Reviewee;
  onSent: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<SentNudge[]>([]);
  const [viewer, setViewer] = useState<{ id: string; role: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  const trimmed = custom.trim();
  const tooLong = trimmed.length > NUDGE_MAX_LENGTH;

  function close(next: boolean) {
    if (sending) return; // never yank the dialog out from under a request
    setOpen(next);
    if (next) {
      loadSent();
    } else {
      setCustom("");
      setError("");
    }
  }

  async function loadSent() {
    try {
      const response = await fetch(`/api/admin/reviewees/${reviewee.id}/nudge`);
      if (!response.ok) return;
      const data = await response.json();
      setSent(data.nudges ?? []);
      setViewer(data.viewer ?? null);
    } catch {
      // The dialog still sends; only the history is missing.
    }
  }

  async function remove(id: string) {
    if (deleting) return;

    setDeleting(id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/reviewees/${reviewee.id}/nudge?nudge=${id}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not delete this reminder.");
        setDeleting(null);
        return;
      }

      setSent((current) => current.filter((item) => item.id !== id));
      setDeleting(null);
    } catch {
      setError("Could not reach the server.");
      setDeleting(null);
    }
  }

  async function send(body: { preset?: string; message?: string }) {
    if (sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/reviewees/${reviewee.id}/nudge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not send this reminder.");
        setSending(false);
        return;
      }

      setSending(false);
      setOpen(false);
      setCustom("");
      onSent(data.message ?? `Reminder sent to ${reviewee.name}.`);
    } catch {
      setError("Could not reach the server.");
      setSending(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={close}>
      <AlertDialog.Trigger
        aria-label={`Send ${reviewee.name} a reminder`}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-[#C9A227] hover:bg-[#FFF8D6] hover:text-[#0B2340]"
      >
        <Bell className="size-3.5" />
        Nudge
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-[#0B2340]/50 backdrop-blur-[2px]" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-left shadow-xl">
          <AlertDialog.Title className="text-lg font-extrabold">
            Remind {reviewee.name}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
            They see it in their notifications the next time they open the app.
          </AlertDialog.Description>

          <div className="mt-4 flex flex-col gap-2">
            {nudgePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={sending}
                onClick={() => send({ preset: preset.id })}
                className="rounded-xl border border-border px-4 py-3 text-left transition hover:border-[#C9A227] hover:bg-[#FFF8D6] disabled:opacity-60"
              >
                <span className="block text-sm font-bold">{preset.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {preset.message}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <label
              htmlFor={`nudge-custom-${reviewee.id}`}
              className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              Write your own
            </label>
            <textarea
              id={`nudge-custom-${reviewee.id}`}
              value={custom}
              rows={3}
              disabled={sending}
              onChange={(event) => setCustom(event.target.value)}
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
            />
            <p
              className={`mt-1 text-xs ${tooLong ? "font-bold text-rose-700" : "text-muted-foreground"}`}
            >
              {trimmed.length} / {NUDGE_MAX_LENGTH}
            </p>
          </div>

          {sent.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Already sent
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {sent.map((nudge) => {
                  // A field manager unsends their own only; the Sales Manager
                  // owns the console and can clear any of them.
                  const mine =
                    viewer?.role === "ADMIN" || nudge.senderId === viewer?.id;

                  return (
                    <li
                      key={nudge.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm">{nudge.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {nudge.sender} · {nudgeAge(nudge.createdAt)} ·{" "}
                          {nudge.read ? "Read" : "Unread"}
                        </p>
                      </div>

                      {mine && (
                        <button
                          type="button"
                          aria-label="Delete this reminder"
                          disabled={deleting === nudge.id}
                          onClick={() => remove(nudge.id)}
                          className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={sending}
              className="rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:border-[#C9A227] disabled:opacity-60"
            >
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              disabled={sending || !trimmed || tooLong}
              onClick={() => send({ message: trimmed })}
              className="rounded-lg bg-[#0B2340] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#0F2E4D] disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/**
 * Removing a reviewee destroys their history, and the delete cascades from
 * users.id through progress, attempts, streaks and sessions. A trash icon is
 * too cheap for that, so the row only opens a dialog that names the person,
 * unlocks once the phrase is typed, and sends the request on a held press.
 * Opening the dialog stays a plain click: the weight belongs on the action,
 * not on reading who is about to be removed.
 *
 * Managers see this control on the same terms admins do: the roster is filtered
 * to their own reviewees, but the row itself is not role-gated.
 */
function RemoveReviewee({
  reviewee,
  onRemoved,
}: {
  reviewee: Reviewee;
  onRemoved: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  /** Lets a held Enter in the confirm field drive the hold button's fill. */
  const hold = useRef<HoldHandle>(null);

  const phrase = deletePhrase(reviewee.name);
  const confirmed = samePhrase(typed, phrase);

  function close(next: boolean) {
    if (removing) return; // never yank the dialog out from under a request
    setOpen(next);
    if (!next) {
      setTyped("");
      setError("");
    }
  }

  async function remove() {
    if (!confirmed || removing) return;

    setRemoving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/reviewees/${reviewee.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not remove this reviewee.");
        setRemoving(false);
        return;
      }

      setRemoving(false);
      setOpen(false);
      setTyped("");
      onRemoved(reviewee.id);
    } catch {
      setError("Could not reach the server.");
      setRemoving(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={close}>
      <AlertDialog.Trigger
        aria-label={`Remove ${reviewee.name}`}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 className="size-3.5" />
        Remove
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-[#0B2340]/50 backdrop-blur-[2px]" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-left shadow-xl">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <AlertDialog.Title className="text-lg font-extrabold">
                Remove {reviewee.name}?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                {reviewee.email}
              </AlertDialog.Description>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6">
            This deletes the account together with every flashcard and
            memorization rating, practice exam attempt, streak and saved study
            session. It cannot be undone.
          </p>

          <label
            htmlFor={`confirm-${reviewee.id}`}
            className="mt-5 block text-sm font-semibold"
          >
            Type <span className="font-mono">&quot;{phrase}&quot;</span> to
            confirm
          </label>
          <input
            id={`confirm-${reviewee.id}`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            // Enter is a hold here too: tapping it does nothing, holding it
            // fills the button's bar and only then removes the account.
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (event.repeat || !confirmed || removing) return;
              hold.current?.startHold();
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter") hold.current?.endHold();
            }}
            onBlur={() => hold.current?.endHold()}
            disabled={removing}
            autoComplete="off"
            placeholder={phrase}
            className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />

          {error && (
            <p className="mt-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={removing}
              className="rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:border-[#C9A227] disabled:opacity-60"
            >
              Cancel
            </AlertDialog.Close>
            {/* The phrase says who is being removed; the hold says the admin
                meant it. A stray click cannot reach the request. */}
            <ButtonHoldAndRelease
              ref={hold}
              holdDuration={2000}
              onHoldComplete={remove}
              disabled={!confirmed || removing}
              idleLabel={removing ? "Removing…" : "Hold to remove"}
              holdingLabel="Keep holding…"
              className="h-9 px-3 text-sm"
            />
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function AdminPage() {
  const { data: session } = useSession();
  // Only an admin sees more than one recruiter's reviewees, so only an admin
  // needs the column saying whose they are.
  const isAdmin = session?.user?.role === "ADMIN";

  // "View recruits" on a field manager's card lands here carrying that
  // manager's email. The roster already searches the recruiter's address for an
  // admin, so the link only has to seed the box the admin could have typed into
  // themselves — which leaves the filter visible, and clearable, rather than
  // hiding rows behind a mode the screen does not explain.
  const managerFilter = useSearchParams().get("manager") ?? "";

  const [roster, setRoster] = useState<Reviewee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReadinessStatus | "ALL">(
    "ALL",
  );
  const [sort, setSort] = useState<SortKey>("readiness_desc");
  const [search, setSearch] = useState(managerFilter);
  const [page, setPage] = useState(1);
  const [examType, setExamType] = useState<ExamType | "ALL">("ALL");

  useEffect(() => {
    let active = true;
    setLoading(true);

    // The track scopes what every number means, so it is the server that
    // recomputes the roster rather than the table filtering rows it already has.
    const query =
      examType === "ALL" ? "" : `?exam_type=${encodeURIComponent(examType)}`;

    fetch(`/api/admin/reviewees${query}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load");
        return data as Reviewee[];
      })
      .then((data) => active && setRoster(data))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [examType]);

  const counts = useMemo(
    () => ({
      total: roster.length,
      ready: roster.filter((row) => row.status === "EXAM_READY").length,
      onTrack: roster.filter((row) => row.status === "ON_TRACK").length,
      atRisk: roster.filter((row) => row.status === "AT_RISK").length,
    }),
    [roster],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const filtered = roster.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!needle) return true;

      // An admin looking at everyone should be able to pull up a manager's
      // whole intake by typing that manager's name.
      const haystack = [
        row.name,
        row.email,
        ...(isAdmin && row.manager
          ? [row.manager.name, row.manager.email]
          : []),
      ];

      return haystack.some((field) => field.toLowerCase().includes(needle));
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name_asc") return a.name.localeCompare(b.name);
      if (sort === "readiness_asc") return a.readiness - b.readiness;
      return b.readiness - a.readiness;
    });
  }, [roster, statusFilter, sort, search, isAdmin]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const share = (part: number) =>
    counts.total ? `${((part / counts.total) * 100).toFixed(1)}%` : "0%";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="mx-auto w-full max-w-[1500px] px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold">Reviewee Directory</h1>
              <span className="rounded-full bg-[#0B2340] px-3 py-1 text-xs font-bold text-[#FFD400]">
                {counts.total} Candidates
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {examType === "ALL"
                ? "Live performance tracking of every candidate, scored across all licensing tracks."
                : `Live performance tracking of every candidate, scored on ${examLabels[examType]} only.`}
            </p>
          </div>

          <Invite />
        </div>

        {notice && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            {notice}
          </p>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="Total Reviewees"
            value={counts.total}
            icon={Users}
            tone="bg-muted text-[#0B2340]"
          />
          <SummaryTile
            label="Exam Ready"
            value={counts.ready}
            hint={`(${share(counts.ready)})`}
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-700"
          />
          <SummaryTile
            label="On Track"
            value={counts.onTrack}
            hint={`(${share(counts.onTrack)})`}
            icon={Zap}
            tone="bg-amber-50 text-amber-700"
          />
          <SummaryTile
            label="At Risk"
            value={counts.atRisk}
            hint={`(${share(counts.atRisk)})`}
            icon={AlertTriangle}
            tone="bg-rose-50 text-rose-700"
          />
        </div>

        <div className="rv-card mt-6 flex flex-wrap items-end gap-6 p-5">
          <FilterSelect
            label="Exam Type"
            value={examType}
            onValueChange={(next) => {
              setExamType(next);
              setPage(1);
            }}
            options={examOptions}
            triggerClassName="w-60"
          />

          <FilterSelect
            label="Readiness Status"
            value={statusFilter}
            onValueChange={(next) => {
              setStatusFilter(next);
              setPage(1);
            }}
            options={statusOptions}
          />

          <FilterSelect
            label="Sort Candidates By"
            value={sort}
            onValueChange={setSort}
            options={sortOptions}
            triggerClassName="w-64"
          />

          <div className="flex gap-2">
            {(["AT_RISK", "ON_TRACK", "EXAM_READY"] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(statusFilter === status ? "ALL" : status);
                  setPage(1);
                }}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  statusFilter === status
                    ? "border-[#0B2340] bg-[#0B2340] text-white"
                    : statusStyles[status]
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>

          <label className="ml-auto text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {isAdmin ? "Search Reviewee or Field Manager" : "Search Reviewee"}
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={
                  isAdmin ? "Name, email or field manager" : "Name or email"
                }
                className="w-72 rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none focus:border-[#0B2340]"
              />
            </div>
          </label>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading roster…</p>
        ) : error ? (
          <p className="mt-8 text-sm font-semibold text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <div className="rv-card mt-6 p-10 text-center">
            <p className="font-bold">No candidates match these filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {roster.length === 0
                ? "No reviewees have been registered yet."
                : search.trim()
                  ? `Nothing matches "${search.trim()}". Try a different name or email.`
                  : "Try clearing the status filter."}
            </p>
          </div>
        ) : (
          <div className="rv-card mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              {/* The Sales Manager's table carries an extra Recruited By
                  column, so it needs the wider floor before the cells start
                  wrapping mid-phrase. */}
              <table
                className={`w-full text-left text-sm ${isAdmin ? "min-w-[1320px]" : "min-w-[1100px]"}`}
              >
                <thead className="bg-[#0B2340] text-white">
                  <tr>
                    {[
                      "Reviewee / Candidate",
                      ...(isAdmin ? ["Recruited By"] : []),
                      "Overall Readiness",
                      "Flashcards Mastery",
                      "Memorize Acc.",
                      "Practice Exams",
                      "Activity",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="whitespace-nowrap px-5 py-4 text-[11px] font-bold uppercase tracking-wide"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border align-top"
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

                      {isAdmin && (
                        <td className="px-5 py-4">
                          {row.manager ? (
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={row.manager.name}
                                image={row.manager.image}
                                size="size-8"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold">
                                  {row.manager.name}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {staffTitleFor(row.manager.role)} ·{" "}
                                  {row.manager.email}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No recruiter on record
                            </p>
                          )}
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold">{row.readiness}%</span>
                          <span className="text-xs text-muted-foreground">
                            {statusLabels[readinessStatus(row.readiness)]}
                          </span>
                        </div>
                        <Meter
                          value={row.readiness}
                          tone={
                            row.status === "AT_RISK" ? "#E11D48" : "#FFD400"
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {row.flashcards.mastered} / {row.flashcards.total}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.flashcards.total
                            ? Math.round(
                                (row.flashcards.mastered /
                                  row.flashcards.total) *
                                  100,
                              )
                            : 0}
                          % completed
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {row.memorize.accuracy}%
                      </td>

                      <td className="px-5 py-4">
                        <ExamResults reviewee={row} />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {row.practiceExam.passedTracks} of{" "}
                          {row.practiceExam.tracks.length} passed
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold">
                        {relativeTime(row.activity.lastActivity)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[row.status]}`}
                        >
                          {statusLabels[row.status]}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <NudgeReviewee
                            reviewee={row}
                            onSent={(message) => setNotice(message)}
                          />
                          <RemoveReviewee
                            reviewee={row}
                            onRemoved={(id) => {
                              setRoster((current) =>
                                current.filter((item) => item.id !== id),
                              );
                              setNotice(`${row.name} has been removed.`);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm">
              <p className="text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, visible.length)} of{" "}
                {visible.length} reviewees
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
          </div>
        )}
      </main>
    </div>
  );
}
