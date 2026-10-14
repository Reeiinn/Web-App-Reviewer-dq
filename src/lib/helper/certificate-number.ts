/**
 * A certificate's number: INS-<year issued>-<track>-<six hex digits>.
 *
 * The same format the SQL built before Prisma, `to_char(now(), 'YYYY')` and
 * the first six hex digits of `gen_random_uuid()`, upper-cased. The year is
 * read in UTC. The old SQL read it in the database server's own zone, which
 * the pg pool never set; UTC matches it only if that zone was UTC, and in the
 * first hours of 1 January Manila time it is still the previous year. The
 * caller passes the same Date it stores as issued_at, so the two always
 * agree. Uniqueness is the database's job (certificate_no is unique); this
 * only formats.
 */
export function certificateNumber(
  examType: string,
  issuedAt: Date,
  uuid: string,
): string {
  const suffix = uuid.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `INS-${issuedAt.getUTCFullYear()}-${examType}-${suffix}`;
}
