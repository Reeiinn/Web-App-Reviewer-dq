# Certificate marks

The certificate sheet is drawn — every rule, sweep and line of type is an
element satori lays out — and rendered to a PNG on the server. See
`src/components/ui/certificate-image.tsx` and the route that serves it,
`src/app/api/certificates/[id]/image/route.tsx`.

These two are the exception. A handwritten signature and a drawn phoenix are not
things markup reproduces, so they are read from here and placed into the drawn
sheet.

| File            | What it is                           | Status                                |
| --------------- | ------------------------------------ | ------------------------------------- |
| `signature.png` | The Sales Manager's signature, keyed | in place, but **cut short** — see below |
| `dracaena.png`  | The DRACAENA phoenix                 | **missing** — drawn stand-in is used  |

## Formats

`png` is preferred, then `svg`, `jpg`, `jpeg` — the first one found wins.

**Not `webp`.** Satori renders the sheet and has no webp decoder, so a webp mark
does not fall back to the stand-in; it throws mid-render and the certificate
comes back a 500. A file whose header declares no size is ignored with a logged
error, for the same reason: the sheet has to tell satori both dimensions.

## They are read, not served

`src/lib/helper/certificate-artwork.ts` reads these files, measures them, and
hands the renderer a data URI with the size it found. Satori has no page to
resolve `/certificate-art/...` against and does not fetch relative URLs, so the
bytes have to travel with the markup. They are read once per process, not once
per request — a new file needs a restart, not just a page reload.

The sheet scales each mark to a width and keeps the proportions the file
declares, so **a replacement of any size or shape drops straight in** without a
code change and without being squashed.

That also means the directory name no longer decides whether a mark is
reachable. It stays `certificate-art` because `/certificates/:path*` belongs to
the certificate pages and the middleware guards it — anything served from under
that path came back as a 307 to the sign-in screen rather than a file.

## Replacing the signature

The file here is a crop of the signed artwork, and the signature did not fit
inside it: in the artwork the tail runs down across the printed name, so the cut
had to stop where the name starts. Ink runs off all four edges of the file, and
the top of the loop and the whole tail are missing. It reads as a signature, but
a cut one.

To show it whole, export the signature **on its own**: transparent background,
every stroke inside the frame, nothing else in the picture. Drop it here as
`signature.png` and restart. The sheet anchors the signature by its top and
draws it at the artwork's width, so a taller export extends downward over the
printed name — which is where the signature sits in the artwork anyway.

## Adding the phoenix

Drop it here as `dracaena.png` — transparent background, and cropped tight to
the mark including the DRACAENA wordmark beneath it, since the sheet positions
it by its own box. No code change: the stand-in disappears the moment the file
exists and the app is restarted.

The originals these were cut from are in `design/certificate-artwork/`.
