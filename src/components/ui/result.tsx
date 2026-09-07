import { ResultProps } from "@/lib/types/attempt";

/** Half-ring geometry: one arc drawn twice, once as track and once as score. */
const RADIUS = 95;
const ARC_LENGTH = Math.PI * RADIUS;
const ARC_PATH = `M 25 120 A ${RADIUS} ${RADIUS} 0 0 1 215 120`;

export function Result({
  correct = 0,
  wrong = 0,
  onTryAgain,
  onRedoMistakes,
  accent = "study",
}: ResultProps) {
  const total = correct + wrong;
  const score = total ? Math.round((correct / total) * 100) : 0;

  const headline =
    score === 100
      ? "Perfect run!"
      : score >= 80
        ? "Excellent performance!"
        : score >= 50
          ? "Good progress!"
          : "Keep going!";

  const closing =
    score === 100
      ? "A perfect run. That material is yours."
      : score >= 80
        ? "Strong session — you're close to mastery."
        : score >= 50
          ? "Solid progress. Another pass will lock it in."
          : "Every miss is a card you now know to review.";

  return (
    <section className="rv-card mx-auto flex w-full max-w-xl flex-col items-center justify-center p-[clamp(1.25rem,5vw,2.5rem)] text-center [@media(max-height:520px)]:p-4">
      <h1 className="text-[clamp(1.5rem,5.5vw,2.5rem)] font-extrabold leading-tight text-[#0F7B52] [@media(max-height:520px)]:text-2xl">
        {headline}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-[clamp(0.875rem,2.6vw,1rem)] text-muted-foreground [@media(max-height:520px)]:hidden">
        {closing}
      </p>

      {/* The gauge is the score: the green sweep is the share answered right,
          and whatever red is left is the share missed. It is sized off the
          viewport's short side too, so a landscape phone gets a gauge that
          still fits above the buttons. */}
      <div
        className="relative mt-[clamp(1rem,4vw,2rem)] [container-type:inline-size]"
        style={{ width: "clamp(200px, min(78vw, 42vh), 420px)" }}
      >
        <svg
          viewBox="0 0 240 130"
          className="w-full"
          role="img"
          aria-label={`${score} percent correct`}
        >
          <path
            d={ARC_PATH}
            fill="none"
            stroke={wrong ? "#C91D1D" : "#EAE3D2"}
            strokeWidth={20}
            strokeLinecap="round"
          />
          {correct > 0 && (
            <path
              d={ARC_PATH}
              fill="none"
              stroke="#0F7B52"
              strokeWidth={20}
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * ARC_LENGTH} ${ARC_LENGTH}`}
            />
          )}
        </svg>

        {/* Sits inside the ring at every size: the number is a share of the
            gauge's own width, not a fixed point size. */}
        <div className="absolute inset-x-0 bottom-[2%] font-extrabold leading-none text-[#0F7B52] [font-size:18cqw]">
          {score}
          <span className="text-[0.5em]">%</span>
        </div>
      </div>

      {/* Legend and tallies read as two columns under the gauge, the same two
          colours the arc uses. */}
      <div className="mt-[clamp(0.75rem,3vw,1.5rem)] grid w-full max-w-sm grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-center gap-2">
            <span className="h-1 w-4 rounded-full bg-[#0F7B52]" />
            <span className="text-[clamp(0.8rem,2.4vw,0.95rem)] text-muted-foreground">
              Correct
            </span>
          </div>
          <p className="mt-1 text-[clamp(0.95rem,3vw,1.15rem)] font-extrabold">
            {correct} {correct === 1 ? "question" : "questions"}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <span className="h-1 w-4 rounded-full bg-[#C91D1D]" />
            <span className="text-[clamp(0.8rem,2.4vw,0.95rem)] text-muted-foreground">
              Mistakes
            </span>
          </div>
          <p className="mt-1 text-[clamp(0.95rem,3vw,1.15rem)] font-extrabold">
            {wrong} {wrong === 1 ? "question" : "questions"}
          </p>
        </div>
      </div>

      {(onTryAgain || onRedoMistakes) && (
        <div className="mt-[clamp(1.25rem,4vw,2rem)] flex w-full max-w-sm flex-col gap-3 [@media(max-height:520px)]:mt-3 [@media(max-height:520px)]:gap-2">
          {onTryAgain && (
            <button
              onClick={onTryAgain}
              className={`rounded-lg px-5 py-3 text-[clamp(0.95rem,3vw,1.05rem)] font-bold transition [@media(max-height:520px)]:py-2 ${
                accent === "exam"
                  ? "bg-[var(--exam)] text-white hover:bg-[var(--exam-strong)]"
                  : "bg-[#FFD400] text-[#0B2340] hover:bg-[#E8C200]"
              }`}
            >
              Try again
            </button>
          )}
          {onRedoMistakes && (
            <button
              onClick={onRedoMistakes}
              disabled={!wrong}
              className="rounded-lg border border-border px-5 py-3 text-[clamp(0.95rem,3vw,1.05rem)] [@media(max-height:520px)]:py-2 font-bold transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Redo mistakes ({wrong})
            </button>
          )}
        </div>
      )}
    </section>
  );
}
