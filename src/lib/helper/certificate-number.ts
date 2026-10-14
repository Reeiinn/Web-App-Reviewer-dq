/**
 * A certificate's number: INS-<year issued>-<track>-<six hex digits>.
 *
 * The same format the SQL built before Prisma, `to_char(now(), 'YYYY')` and
 * the first six hex digits of `gen_random_uuid()`, upper-cased. The year is
 * read in UTC, the zone the database session ran in. The caller passes the
 * same Date it stores as issued_at, so the two always agree. Uniqueness is
 * the database's job (certificate_no is unique); this only formats.
 */
export function certificateNumber(
  examType: string,
  issuedAt: Date,
  uuid: string,
): string {
  const suffix = uuid.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `INS-${issuedAt.getUTCFullYear()}-${examType}-${suffix}`;
}
