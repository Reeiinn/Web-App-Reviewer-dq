/**
 * Statements a migration may not contain, because they change or remove
 * something that already exists (ground rule 1: existing data is never
 * affected). `0_init` is exempt: it describes what already exists and is
 * only ever marked applied on a populated database.
 *
 * A reviewed exception carries `-- additive-check: allow` on the same line.
 */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bDROP\b/i, reason: "DROP" },
  { pattern: /\bRENAME\b/i, reason: "RENAME" },
  { pattern: /\bTRUNCATE\b/i, reason: "TRUNCATE" },
  { pattern: /^\s*(UPDATE|DELETE)\b/i, reason: "rewrites existing rows" },
  {
    pattern: /\bALTER\b.*\b(TYPE|SET NOT NULL|SET DATA TYPE)\b/i,
    reason: "changes an existing column",
  },
];

const ALLOW = /--\s*additive-check:\s*allow/i;

/** Lines of one migration that break the additive rule, with the reason. */
export function nonAdditiveStatements(sql: string): string[] {
  const problems: string[] = [];
  sql.split(/\r?\n/).forEach((line, index) => {
    if (ALLOW.test(line)) return;
    const code = line.replace(/--.*$/, "");
    const broken = FORBIDDEN.find(({ pattern }) => pattern.test(code));
    if (broken) {
      problems.push(`line ${index + 1}: ${broken.reason}: ${line.trim()}`);
    }
  });
  return problems;
}
