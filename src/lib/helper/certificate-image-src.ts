/**
 * Where a certificate's PNG is served from.
 *
 * One place, because the page, the thumbnails on the list and the save button
 * all point at the same endpoint and a certificate that renders in one place
 * but not another is the kind of bug nobody notices until a learner reports it.
 */
export function certificateImageSrc(
  id: string,
  { download = false }: { download?: boolean } = {},
): string {
  const src = `/api/certificates/${encodeURIComponent(id)}/image`;
  return download ? `${src}?download=1` : src;
}
