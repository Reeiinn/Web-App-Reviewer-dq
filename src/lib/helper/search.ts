/**
 * Text search over a list already in the browser.
 *
 * Every search box in the app filters rows it has fetched: the glossary, the
 * reviewee roster, the field manager console. The naive version lowercases
 * every field of every row on every keystroke, so the cost of typing grows with
 * the list and with how much text each row carries — glossary definitions are
 * paragraphs, and they were being folded to lowercase again for each letter.
 *
 * The folding happens once per list here instead, and a keystroke only looks
 * for a substring.
 */

/** One row with the text it can be found by, folded once. */
export type Searchable<T> = { item: T; haystack: string };

/** What a typed box means as a search: trimmed, folded, possibly nothing. */
export const searchNeedle = (value: string) => value.trim().toLowerCase();

/**
 * Folds the searchable text of each row.
 *
 * Rebuilt when the list changes, not when the box does — call it inside a memo
 * keyed on the rows and on anything that changes which fields are searchable.
 */
export function indexForSearch<T>(
  items: T[],
  fields: (item: T) => (string | null | undefined)[],
): Searchable<T>[] {
  return items.map((item) => ({
    item,
    haystack: fields(item)
      .filter((field): field is string => Boolean(field))
      .join("\n")
      .toLowerCase(),
  }));
}

/**
 * The rows a search leaves, in their original order.
 *
 * `keep` carries the filters that are not the search box — a status chip, a
 * track — so a row is tested against them before its text is searched.
 */
export function filterSearch<T>(
  index: Searchable<T>[],
  needle: string,
  keep: (item: T) => boolean = () => true,
): T[] {
  const found: T[] = [];

  for (const entry of index) {
    if (!keep(entry.item)) continue;
    if (needle && !entry.haystack.includes(needle)) continue;
    found.push(entry.item);
  }

  return found;
}
