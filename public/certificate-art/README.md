# Certificate marks

The certificate sheet is drawn as HTML — every rule, sweep and line of type is
markup, so it prints at the printer's resolution and the text can be selected
and read aloud. See `src/components/ui/certificate.tsx`.

These two are the exception. A handwritten signature and a drawn phoenix are not
things markup reproduces, so they are served as images and placed into the
drawn sheet.

| File            | What it is                          | Status                     |
| --------------- | ----------------------------------- | -------------------------- |
| `signature.png` | The Sales Manager's signature, keyed | in place, cut from the artwork |
| `dracaena.png`  | The DRACAENA phoenix                | **missing** — drawn stand-in is used |

## Not `public/certificates`

That path belongs to the certificate pages, and the middleware guards
`/certificates/:path*`. Anything served from under it came back as a 307 to the
sign-in screen rather than a file.

## Adding the phoenix

Drop it here as `dracaena.png` — transparent background, and cropped tight to
the mark including the DRACAENA wordmark beneath it, since the sheet positions
it by its own box. `webp`, `svg`, `jpg` and `jpeg` work too;
`src/lib/helper/certificate-artwork.ts` takes the first it finds. No code
change: the stand-in disappears the moment the file exists.

The originals these were cut from are in `design/certificate-artwork/`.
