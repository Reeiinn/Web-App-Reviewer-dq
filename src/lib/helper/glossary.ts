import type {
  GlossaryComparison,
  GlossaryDetails,
  GlossaryExample,
  GlossaryKeyPoint,
  GlossaryTerm,
} from "@/lib/types/glossary";

/**
 * Reading the structured half of a glossary term.
 *
 * `details` is a jsonb column, so nothing about its shape is guaranteed by the
 * database. The glossary is a page a learner reads on the way into an exam; a
 * malformed row should cost that row's extra detail, never the page. Every
 * value is checked here once, at the edge, and the card renders what survives.
 */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A non-empty string, or nothing. Blank strings are the same as absent. */
function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function textList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const kept = value.filter((entry): entry is string => Boolean(text(entry)));
  return kept.length ? kept : undefined;
}

function keyPoints(value: unknown): GlossaryKeyPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const kept = value.reduce<GlossaryKeyPoint[]>((points, entry) => {
    if (!isObject(entry)) return points;

    const body = text(entry.text);
    if (!body) return points;

    const children = textList(entry.children);
    points.push(children ? { text: body, children } : { text: body });
    return points;
  }, []);

  return kept.length ? kept : undefined;
}

function examples(value: unknown): GlossaryExample[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const kept = value.reduce<GlossaryExample[]>((found, entry) => {
    if (!isObject(entry)) return found;

    const body = text(entry.text);
    if (!body) return found;

    const example: GlossaryExample = { text: body };

    const label = text(entry.label);
    if (label) example.label = label;

    const roles = Array.isArray(entry.roles)
      ? entry.roles.reduce<{ role: string; who: string }[]>((cast, row) => {
          if (!isObject(row)) return cast;
          const role = text(row.role);
          const who = text(row.who);
          if (role && who) cast.push({ role, who });
          return cast;
        }, [])
      : [];
    if (roles.length) example.roles = roles;

    const note = text(entry.note);
    if (note) example.note = note;

    found.push(example);
    return found;
  }, []);

  return kept.length ? kept : undefined;
}

/**
 * A comparison is kept only if it is rectangular.
 *
 * The first column heads the feature column, so a row carries one value per
 * remaining column. A row that is short would render a table with holes in it,
 * which reads as a bug rather than as missing content — the whole table is
 * dropped instead, leaving the definition to carry the term.
 */
function comparison(value: unknown): GlossaryComparison | undefined {
  if (!isObject(value)) return undefined;

  const columns = textList(value.columns);
  if (!columns || columns.length < 2) return undefined;

  const width = columns.length - 1;
  if (!Array.isArray(value.rows) || value.rows.length === 0) return undefined;

  const rows: { feature: string; values: string[] }[] = [];
  for (const row of value.rows) {
    if (!isObject(row)) return undefined;

    const feature = text(row.feature);
    if (!feature) return undefined;

    if (!Array.isArray(row.values) || row.values.length !== width) {
      return undefined;
    }
    const values = row.values.map((cell) => (typeof cell === "string" ? cell : ""));

    rows.push({ feature, values });
  }

  return { columns, rows };
}

/**
 * Reads the `details` column of a term.
 *
 * Returns null when there is nothing to render, so a caller can ask
 * `details && ...` rather than checking each field for emptiness.
 */
export function normalizeDetails(value: unknown): GlossaryDetails | null {
  if (!isObject(value)) return null;

  const details: GlossaryDetails = {};

  const label = text(value.keyPointsLabel);
  if (label) details.keyPointsLabel = label;

  const points = keyPoints(value.keyPoints);
  if (points) details.keyPoints = points;

  const similarities = textList(value.similarities);
  if (similarities) details.similarities = similarities;

  const table = comparison(value.comparison);
  if (table) details.comparison = table;

  const worked = examples(value.examples);
  if (worked) details.examples = worked;

  // A label with nothing to label is not content.
  const hasContent =
    details.keyPoints ||
    details.similarities ||
    details.comparison ||
    details.examples;

  return hasContent ? details : null;
}

/**
 * Every piece of prose in a term's details, for the search index.
 *
 * The glossary's search box folds this in alongside the term and definition,
 * so typing "trust" finds Absolute Assignee — whose example mentions a trust
 * that its definition never does.
 */
export function detailsSearchText(
  details: GlossaryDetails | null | undefined,
): string {
  if (!details) return "";

  const parts: string[] = [];

  if (details.keyPointsLabel) parts.push(details.keyPointsLabel);

  for (const point of details.keyPoints ?? []) {
    parts.push(point.text, ...(point.children ?? []));
  }

  parts.push(...(details.similarities ?? []));

  if (details.comparison) {
    parts.push(...details.comparison.columns);
    for (const row of details.comparison.rows) {
      parts.push(row.feature, ...row.values);
    }
  }

  for (const example of details.examples ?? []) {
    if (example.label) parts.push(example.label);
    parts.push(example.text);
    for (const role of example.roles ?? []) parts.push(role.role, role.who);
    if (example.note) parts.push(example.note);
  }

  return parts.join("\n");
}

/**
 * A link target per term, keyed by row id.
 *
 * The index down the side of the glossary jumps to a card, and a term reads
 * better in the address bar than a UUID does. Terms are unique per track rather
 * than outright, so the same name on two tracks would otherwise claim the same
 * anchor and the second one would be unreachable; the later term takes a
 * numbered suffix.
 */
export function anchorsFor(terms: GlossaryTerm[]): Map<string, string> {
  const anchors = new Map<string, string>();
  const taken = new Map<string, number>();

  for (const term of terms) {
    const base =
      term.term
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "term";

    const seen = taken.get(base) ?? 0;
    taken.set(base, seen + 1);
    anchors.set(term.id, seen === 0 ? base : `${base}-${seen + 1}`);
  }

  return anchors;
}
