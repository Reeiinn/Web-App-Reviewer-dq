import { examLabels } from "@/lib/types/common";
import type { GlossaryDetails, GlossaryTerm } from "@/lib/types/glossary";

/**
 * One glossary term, in parts.
 *
 * The parts are told apart by surface as well as by label, so an example is
 * recognisable before a word of it is read. Only the example carries a fill:
 * spending one on every part would flatten the hierarchy back into the wall of
 * text this card replaced.
 *
 * Every part below the definition is optional, and most terms have none of
 * them. A term that is only a definition renders as only a definition.
 */

/** A part's heading: a small label, then a rule running out to the card edge. */
function BlockLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // min-w-0: without it this flex item refuses to shrink below the width of
    // its widest content, and a comparison table's min-width would push the
    // whole card past the edge of a phone.
    <section className="flex min-w-0 flex-col gap-2.5">
      <BlockLabel>{label}</BlockLabel>
      {children}
    </section>
  );
}

/** Marker list, no fill — structure without another box inside the card. */
function Points({ items }: { items: GlossaryDetails["keyPoints"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {(items ?? []).map((point) => (
        <li key={point.text} className="relative pl-[1.1rem] text-[15px] leading-relaxed">
          <span
            className="absolute left-0 top-[0.55em] size-1.5 rounded-[1px] bg-[#0B2340]"
            aria-hidden="true"
          />
          {point.text}
          {point.children ? (
            <ul className="mt-2 flex flex-col gap-1">
              {point.children.map((child) => (
                <li
                  key={child}
                  className="relative pl-4 text-sm text-muted-foreground"
                >
                  <span
                    className="absolute left-0 top-[0.55em] size-1.5 rounded-full border-[1.5px] border-[#B6BCC6]"
                    aria-hidden="true"
                  />
                  {child}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The contrast the definition describes, as a table it can be read across. */
function Comparison({ table }: { table: NonNullable<GlossaryDetails["comparison"]> }) {
  return (
    // The table keeps its own scroller, so a narrow phone scrolls the table
    // rather than the page. No negative margin here: it would make the scroller
    // wider than the card and reintroduce the overflow it exists to contain.
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="bg-[#0B2340] px-3 py-2.5 text-left text-xs font-bold tracking-wide text-white first:rounded-tl-md last:rounded-tr-md"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.feature} className="even:bg-[#FAF7F0]">
              <th
                scope="row"
                className="whitespace-nowrap border-t border-border px-3 py-2.5 text-left align-top font-bold text-[#0B2340]"
              >
                {row.feature}
              </th>
              {row.values.map((value, column) => (
                <td
                  key={table.columns[column + 1]}
                  className="border-t border-border px-3 py-2.5 align-top"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The part a reader is usually hunting for, and the only one with a fill. */
function Examples({ items }: { items: NonNullable<GlossaryDetails["examples"]> }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((example) => (
        <div
          key={example.text}
          className="min-w-0 rounded-md bg-accent px-3.5 py-3.5 text-[15px] leading-relaxed text-[#3A3320] sm:px-4"
        >
          {example.label ? (
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#C98A00]">
              Example — {example.label}
            </span>
          ) : null}
          {example.text}

          {example.roles ? (
            // Role and who sit on one line where there is room for two
            // columns, and stack on a narrow phone rather than squeezing.
            <dl className="mt-2.5 grid gap-1.5 text-sm sm:gap-1">
              {example.roles.map((role) => (
                <div key={role.role} className="flex flex-wrap gap-x-2">
                  <dt className="font-bold sm:min-w-[9.5rem]">{role.role}</dt>
                  <dd className="min-w-0">{role.who}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {example.note ? (
            <span className="mt-2 block italic text-[#6B6244]">{example.note}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** What is inside, before you scroll it — the card's own table of contents. */
function Contains({ details }: { details: GlossaryDetails }) {
  const chips: { key: string; text: string; example?: boolean }[] = [];

  if (details.keyPoints) {
    chips.push({
      key: "points",
      text: `${details.keyPoints.length} key points`,
    });
  }
  if (details.comparison) {
    chips.push({ key: "table", text: "Comparison table" });
  }
  if (details.examples) {
    chips.push({
      key: "examples",
      text: `${details.examples.length} example${details.examples.length > 1 ? "s" : ""}`,
      example: true,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
            chip.example
              ? "bg-accent text-[#C98A00]"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {chip.text}
        </span>
      ))}
    </div>
  );
}

export function TermCard({
  term,
  anchor,
}: {
  term: GlossaryTerm;
  anchor: string;
}) {
  const { details } = term;

  return (
    <article
      id={anchor}
      // AppNav is sticky, so a card jumped to from the index has to stop below
      // it rather than under it. The bar is taller on phones, where it carries
      // the link row too.
      className="rv-card flex min-w-0 scroll-mt-28 flex-col gap-4 p-5 sm:p-6 md:p-7 lg:scroll-mt-20"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-xl font-extrabold leading-tight tracking-tight text-balance sm:text-2xl">
          {term.term}
        </h2>
        <span className="shrink-0 rounded-full bg-[#0B2340] px-2.5 py-1 text-[10px] font-bold text-[#FFD400]">
          {examLabels[term.exam_type]}
        </span>
      </div>

      <p className="max-w-[68ch] text-[15px] leading-relaxed text-[#2C3442]">
        {term.definition}
      </p>

      {details ? (
        <>
          <Contains details={details} />

          {details.keyPoints ? (
            <Block label={details.keyPointsLabel ?? "Key points"}>
              <Points items={details.keyPoints} />
            </Block>
          ) : null}

          {details.similarities ? (
            <Block label="Similarities">
              <Points items={details.similarities.map((text) => ({ text }))} />
            </Block>
          ) : null}

          {details.comparison ? (
            <Block label="At a glance">
              <Comparison table={details.comparison} />
            </Block>
          ) : null}

          {details.examples ? (
            <Block
              label={
                details.examples.length > 1 && !details.examples[0].label
                  ? "Examples"
                  : "Example"
              }
            >
              <Examples items={details.examples} />
            </Block>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
