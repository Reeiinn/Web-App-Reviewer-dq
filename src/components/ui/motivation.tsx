"use client";

import type { MotivationMessage } from "@/lib/helper/motivation";
import { CheckCircle2, Flame, Sparkles, XCircle } from "lucide-react";
import { useMemo } from "react";

const confettiColors = [
  "#FFD400",
  "#0B2340",
  "#C98A00",
  "#0F7B52",
  "#527087",
  "#FF9F1C",
];

/**
 * A CSS-only burst. Pieces are positioned from the centre of the nearest
 * positioned ancestor, so wrap this in a `relative` container.
 */
export function Confetti({
  active,
  pieces = 22,
  runId,
}: {
  active: boolean;
  pieces?: number;
  /** Changing this restarts the animation for a new celebration. */
  runId: number;
}) {
  const shards = useMemo(
    () =>
      Array.from({ length: pieces }, (_, index) => {
        // Deterministic spread so the burst looks even rather than clumped.
        const angle = (index / pieces) * Math.PI * 2;
        const distance = 90 + ((index * 37) % 70);
        return {
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance + 60}px`,
          spin: `${((index * 97) % 720) - 360}deg`,
          delay: `${(index % 6) * 35}ms`,
          duration: `${950 + ((index * 53) % 400)}ms`,
          color: confettiColors[index % confettiColors.length],
        };
      }),
    [pieces],
  );

  if (!active) return null;

  return (
    <div
      key={runId}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
    >
      {shards.map((shard, index) => (
        <span
          key={index}
          className="rv-confetti-piece"
          style={
            {
              background: shard.color,
              "--rv-dx": shard.dx,
              "--rv-dy": shard.dy,
              "--rv-spin": shard.spin,
              "--rv-delay": shard.delay,
              "--rv-duration": shard.duration,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function StreakBadge({
  current,
  best,
  pulse,
}: {
  current: number;
  best: number;
  pulse: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Flame
        className={`size-5 ${current > 0 ? "text-[#C98A00]" : "text-muted-foreground"} ${pulse ? "rv-streak-pulse" : ""}`}
      />
      <div>
        <p className="text-2xl font-extrabold leading-none">{current}</p>
        {best > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">Best {best}</p>
        )}
      </div>
    </div>
  );
}

export function AnswerFeedback({
  message,
  correctAnswer,
}: {
  message: MotivationMessage;
  /** Shown only when the answer was wrong, so the user leaves knowing it. */
  correctAnswer?: string;
}) {
  const correct = message.mood === "correct";

  return (
    <div
      role="status"
      className={`rv-pop-in flex items-start gap-3 rounded-xl border p-4 ${
        correct
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-rose-300 bg-rose-50 text-rose-900"
      }`}
    >
      {correct ? (
        message.milestone ? (
          <Sparkles className="mt-0.5 size-5 shrink-0 text-[#C98A00]" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        )
      ) : (
        <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />
      )}

      <div>
        <p className="font-bold">{message.headline}</p>
        {!correct && correctAnswer && (
          <p className="mt-1 text-sm">
            <span className="font-semibold">Correct answer:</span>{" "}
            {correctAnswer}
          </p>
        )}
      </div>
    </div>
  );
}

export function SessionMastery({
  accuracy,
  averageSeconds,
}: {
  accuracy: number;
  averageSeconds: number;
}) {
  return (
    <section className="rv-card p-5">
      <h2 className="text-lg font-extrabold">Session Mastery</h2>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Accuracy</span>
          <strong>{accuracy}%</strong>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#0B2340] transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Time per Card (Avg)</span>
        <strong>{averageSeconds}s</strong>
      </div>
    </section>
  );
}
