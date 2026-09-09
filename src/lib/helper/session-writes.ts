/**
 * Session writes, applied in the order the page issued them.
 *
 * A sitting saves its position on every answer and clears it when the deck runs
 * out, and those two writes can be seconds apart yet still overlap: finishing a
 * deck sends the DELETE, and "Redo Mistakes" sends the PUT that stores the
 * shorter deck. Fired independently, a slow DELETE could land after that PUT
 * and take the redo deck with it, so reopening the track dealt the whole thing
 * again — the learner watched "Question 1 of 32" come back as question 19 of 49.
 *
 * Every write goes through one queue instead, and the next one starts only once
 * the previous has answered. A failed write is logged and does not stall the
 * ones behind it: the resume point is worth a retry, never a jammed queue.
 */
export type SessionWrite = () => Promise<unknown>;

export function createWriteQueue(
  onError: (error: unknown) => void = () => {},
) {
  let tail: Promise<unknown> = Promise.resolve();

  return (write: SessionWrite): Promise<unknown> => {
    tail = tail.then(
      () => write().catch(onError),
      () => write().catch(onError),
    );
    return tail;
  };
}
