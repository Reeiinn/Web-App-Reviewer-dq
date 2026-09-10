# Certificate marks

The certificate sheet is drawn — every rule, sweep and line of type is an
element satori lays out — and rendered to a PNG on the server. See
`src/components/ui/certificate-image.tsx` and the route that serves it,
`src/app/api/certificates/[id]/image/route.tsx`.

These two are the exception. A handwritten signature and a drawn phoenix are not
things markup reproduces, so they are read from here and placed into the drawn
sheet.

| File            | What it is                           | Status                               |
| --------------- | ------------------------------------ | ------------------------------------ |
| `signature.png` | The Sales Manager's signature, keyed | in place, cut from the artwork       |
| `dracaena.png`  | The DRACAENA phoenix                 | **missing** — drawn stand-in is used |

## They are read, not served

`src/lib/helper/certificate-artwork.ts` reads these files and hands them to the
renderer as data URIs. Satori has no page to resolve `/certificate-art/...`
against and does not fetch relative URLs, so the bytes have to travel with the
markup. They are read once per process, not once per request.

That also means the directory name no longer decides whether the mark is
reachable. It stays `certificate-art` because `/certificates/:path*` belongs to
the certificate pages and the middleware guards it — anything served from under
that path came back as a 307 to the sign-in screen rather than a file.

## Adding the phoenix

Drop it here as `dracaena.png` — transparent background, and cropped tight to
the mark including the DRACAENA wordmark beneath it, since the sheet positions
it by its own box. `webp`, `svg`, `jpg` and `jpeg` work too;
`certificate-artwork.ts` takes the first it finds. No code change: the stand-in
disappears the moment the file exists and the app is restarted.

The originals these were cut from are in `design/certificate-artwork/`.
