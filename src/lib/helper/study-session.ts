/**
 * Resume logic for a study deck.
 *
 * A session stores the shuffled order the learner saw plus how far they got, so
 * reopening a track continues at "Card 5 of 20" instead of dealing a new deck
 * from the top. The saved order can be stale — cards get edited away or moved to
 * another track between sittings — so restoring drops what the server no longer
 * returns. It never adds to the order: the deck a sitting was dealt, whether the
 * whole track or a redo pass over the missed cards, stays that deck until it is
 * finished or restarted.
 */

export type SavedSession = {
  card_order: string[];
  card_index: number;
  ratings: Record<string, boolean>;
};

export type RestoredSession = {
  order: string[];
  index: number;
  ratings: Record<string, boolean>;
  /** False when the learner starts over: a fresh shuffle, card 1. */
  resumed: boolean;
};

const shuffle = (ids: string[]) => [...ids].sort(() => Math.random() - 0.5);

const fresh = (deck: string[]): RestoredSession => ({
  order: shuffle(deck),
  index: 0,
  ratings: {},
  resumed: false,
});

export function restoreSession(
  deck: string[],
  saved: SavedSession | null,
): RestoredSession {
  if (!saved || deck.length === 0) return fresh(deck);

  const available = new Set(deck);
  const savedOrder = saved.card_order.filter((id) => available.has(id));

  // Nothing recognisable left to resume into.
  if (savedOrder.length === 0) return fresh(deck);

  // The card the learner stopped on, before any reconciliation moves it.
  const stoppedOn = saved.card_order[saved.card_index];

  // The saved order IS the deck for this sitting. Restoring used to append
  // every track item the order did not mention, on the grounds that they were
  // new material. That also swallowed a deliberately shorter deck: a redo pass
  // over the missed cards was dealt back the whole track on the next load, so
  // "Question 3 / 20" came back as "Question 3 / 49" and the pass that would
  // have cleared those cards could never be finished. Material added mid-sitting
  // now waits for the next deal instead.
  const order = savedOrder;

  // Prefer the exact card; fall back to the saved position clamped into range
  // when that card is gone.
  const index =
    stoppedOn !== undefined && order.includes(stoppedOn)
      ? order.indexOf(stoppedOn)
      : Math.min(Math.max(saved.card_index, 0), order.length - 1);

  // A session that ran off the end of its deck has nothing to resume into.
  const finished = saved.card_index >= saved.card_order.length;
  const ratings = Object.fromEntries(
    Object.entries(saved.ratings).filter(([id]) => available.has(id)),
  );

  // Card 1, nothing rated: no position to keep.
  const untouched = index === 0 && Object.keys(ratings).length === 0;

  // The deck itself can still be worth keeping, though. A redo pass over the
  // missed cards is a shorter deck the learner chose, so reopening it before
  // answering anything has to come back as "Question 1 of 32", not as a fresh
  // deal of all 49. Only a deck that is already the whole track has nothing to
  // lose by being reshuffled.
  if (finished || (untouched && order.length === deck.length)) {
    return fresh(deck);
  }

  return { order, index, ratings, resumed: !untouched };
}
