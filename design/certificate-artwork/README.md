# Signed certificate artwork (reference)

The three approved designs as delivered, 2000 x 1414. **The app does not serve
these.** The certificate is drawn as HTML — see
`src/components/ui/certificate.tsx` — so that it prints at the printer's
resolution rather than the ~170dpi these work out to across A4 landscape.

They are kept because they are the source of truth for the layout, and the
source the two embedded marks in `public/certificate-art/` were cut from:

| Mark                                   | Cut from                    | Region (of 2000 x 1414) |
| -------------------------------------- | --------------------------- | ----------------------- |
| `public/certificate-art/signature.png` | `traditional-life.webp`     | x 887-1149, y 1044-1167 |
| `public/certificate-art/dracaena.png`  | not yet supplied            | x 87-306, y 1151-1359    |

The phoenix could not be cut cleanly: the gold wave that sweeps across the base
of the sheet runs tangent to the wingtips, so colour cannot separate them and
they label as one blob. Eroding enough to break the wave also eats the wing
feathers. It needs the original logo file instead.
