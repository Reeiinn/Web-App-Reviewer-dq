/**
 * The roster's ticked rows.
 *
 * The roster pages at fifteen, so the header box ticks the page in view while
 * ticks on other pages stand. What a filter or search hides is dropped from
 * the selection, so a removal only ever covers rows that still match what is
 * on screen, and the confirmation names every one of them.
 */

/** Keeps only ticks still in the filtered list; the same set if none went. */
export function pruneSelection(
  selected: ReadonlySet<string>,
  matchingIds: readonly string[],
): Set<string> {
  const matching = new Set(matchingIds);
  const kept = [...selected].filter((id) => matching.has(id));
  return kept.length === selected.size
    ? (selected as Set<string>)
    : new Set(kept);
}

export function togglePage(
  selected: ReadonlySet<string>,
  pageIds: readonly string[],
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const id of pageIds) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** What the header checkbox shows for the page in view. */
export function pageCheckState(
  selected: ReadonlySet<string>,
  pageIds: readonly string[],
): "none" | "some" | "all" {
  const ticked = pageIds.filter((id) => selected.has(id)).length;
  if (ticked === 0) return "none";
  return ticked === pageIds.length ? "all" : "some";
}
