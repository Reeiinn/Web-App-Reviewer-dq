"use client";

import { ONBOARDING_TOURS } from "@/lib/helper/onboarding-tour";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type Rect = { top: number; left: number; width: number; height: number };

const TIP_WIDTH = 260;
const TIP_MARGIN = 12;

/** The first element tagged for `target` that is actually on screen. Mobile
 * and desktop navs both carry the same `data-tour` attributes, and only one
 * of the two is ever visible at once. */
function findTarget(target: string): HTMLElement | null {
  const matches = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`),
  );
  // No fallback to a hidden match: a mobile layout can tag one node that is
  // currently display:none (a collapsed tab, say), and measuring that gives a
  // zero-size spotlight rather than the retry-then-skip this is meant to get.
  return matches.find((el) => el.offsetParent !== null) ?? null;
}

function tooltipStyle(rect: Rect): CSSProperties {
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const top =
    spaceBelow > 200
      ? rect.top + rect.height + TIP_MARGIN
      : Math.max(TIP_MARGIN, rect.top - 190);
  const left = Math.max(
    TIP_MARGIN,
    Math.min(
      rect.left + rect.width / 2 - TIP_WIDTH / 2,
      window.innerWidth - TIP_WIDTH - TIP_MARGIN,
    ),
  );
  return { position: "fixed", top, left, width: TIP_WIDTH, zIndex: 56 };
}

/**
 * The three-stop tour a role sees the first time they land on their home
 * screen, read from `ONBOARDING_TOURS`. Nothing here is a modal: the page
 * underneath stays interactive, and the spotlight is just a ring drawn around
 * whichever real nav item or section the current step names.
 *
 * Mount one of these on each role's landing screen (dashboard, admin) rather
 * than globally — that keeps it from ever running on a page that has none of
 * its targets.
 */
export function OnboardingTour() {
  const { data: session, status, update } = useSession();
  const role = session?.user?.role;
  const seen = session?.user?.onboardingToursSeen ?? [];
  const steps = role ? ONBOARDING_TOURS[role] : undefined;

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Reactive rather than a one-off read of window.location: "Replay tour" is
  // a same-page Link to `?tour=1`, which never remounts this component, so a
  // plain `useEffect(() => {}, [])` read would miss it entirely.
  const forced = searchParams.get("tour") === "1";

  const eligible =
    status === "authenticated" &&
    !!steps &&
    steps.length > 0 &&
    (forced || !seen.includes(role!));

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [active, setActive] = useState(false);
  const cancelledRef = useRef(false);

  // Only flips active on a genuine settled false→true transition, comparing
  // against the last *settled* (non-"loading") read rather than every
  // render. The session's own `update()` — called when the tour finishes, to
  // record that this role has been seen — briefly flips `status` back to
  // "loading" and then to "authenticated" again before the URL's `?tour=1`
  // has been stripped yet, so a naive `[eligible]` dependency sees a
  // false→true blip on the way back up and reopens the tour it had just
  // closed. Ignoring "loading" renders entirely removes that blip instead of
  // racing to close the window it opens in.
  const settledEligibleRef = useRef(false);
  useEffect(() => {
    if (status === "loading") return;
    const wasEligible = settledEligibleRef.current;
    settledEligibleRef.current = eligible;
    if (eligible && !wasEligible) {
      setStepIndex(0);
      setActive(true);
    }
  }, [status, eligible]);

  const measure = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  const finish = useCallback(async () => {
    setActive(false);
    setRect(null);

    // The session has to say this role is seen *before* ?tour=1 is stripped
    // from the URL, not after: dropping the query re-renders this component,
    // and if `seen` had not caught up yet at that render, `forced` going
    // false while `seen` still excluded the role would read as eligible all
    // over again and restart the tour it had just finished.
    try {
      await fetch("/api/user/tour", { method: "POST" });
      await update();
    } catch {
      // Worst case the tour runs once more next time — harmless.
    }

    if (forced) {
      const params = new URLSearchParams(searchParams);
      params.delete("tour");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [forced, pathname, router, searchParams, update]);

  // Finds the current step's target, waiting out data that is still loading
  // (a fresh roster, a dashboard still fetching progress) rather than giving
  // up on the first frame. A step with nothing to point at — an empty roster,
  // say — is skipped instead of stalling the tour on it.
  useEffect(() => {
    if (!active || !steps) return;
    cancelledRef.current = false;

    let attempts = 0;
    const tryFind = () => {
      if (cancelledRef.current) return;
      const el = findTarget(steps[stepIndex].target);
      if (el) {
        el.scrollIntoView({ block: "center", inline: "nearest" });
        requestAnimationFrame(() => {
          if (!cancelledRef.current) measure(el);
        });
        return;
      }
      attempts += 1;
      if (attempts > 30) {
        if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
        else void finish();
        return;
      }
      setTimeout(tryFind, 150);
    };
    tryFind();

    return () => {
      cancelledRef.current = true;
    };
  }, [active, stepIndex, steps, measure, finish]);

  // Keeps the ring on the target through a scroll or a viewport resize.
  useEffect(() => {
    if (!active || !rect || !steps) return;
    const target = findTarget(steps[stepIndex].target);
    if (!target) return;

    const reposition = () => measure(target);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [active, rect, stepIndex, steps, measure]);

  if (!active || !rect || !steps) return null;

  const step = steps[stepIndex];
  const last = stepIndex === steps.length - 1;

  return (
    <>
      <div
        aria-hidden
        className="rv-tour-scrim"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        role="dialog"
        aria-label={step.title}
        className="rv-pop-in rounded-2xl border border-border bg-card p-4 shadow-xl"
        style={tooltipStyle(rect)}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#C98A00]">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h4 className="mt-1.5 text-sm font-extrabold text-[#0B2340]">
          {step.title}
        </h4>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full ${
                  i === stepIndex ? "bg-[#C98A00]" : "bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="text-xs font-semibold text-[#33517A]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => void finish()}
              className="text-xs font-semibold text-muted-foreground"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() =>
                last ? void finish() : setStepIndex((i) => i + 1)
              }
              className="rounded-lg bg-[#FFD400] px-3 py-1.5 text-xs font-bold text-[#0B2340] transition hover:bg-[#E8C200]"
            >
              {last ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
