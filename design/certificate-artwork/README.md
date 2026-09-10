# Signed certificate artwork (reference)

The three approved designs as delivered, 2000 x 1414. **The app does not serve
these.** The certificate is drawn — see `src/components/ui/certificate-image.tsx`
and the route that renders it to a PNG,
`src/app/api/certificates/[id]/image/route.tsx` — so that the type stays type
rather than the ~170dpi these work out to across A4 landscape.

They are kept because they are the source of truth for the layout, and the
source the two embedded marks in `public/certificate-art/` were cut from:

| Mark                                   | Cut from                | Region (of 2000 x 1414) |
| -------------------------------------- | ----------------------- | ----------------------- |
| `public/certificate-art/signature.png` | `traditional-life.webp` | x 887-1149, y 1044-1167 |
| `public/certificate-art/dracaena.png`  | not yet supplied        | x 87-306, y 1151-1359   |

## Neither mark could be cut whole

**The signature.** In the artwork it is large, and its tail runs straight down
through the printed `MARK ALEXIS TUBURAN` and past `Sales Manager` — it was
signed over them. The recorded region stops at y 1167 because the printed name
begins at y 1165, so the cut had to end there or bring the name with it. What
`signature.png` holds is the middle band: ink runs off all four of its edges,
and both the top of the loop and the whole descending tail are missing.

It cannot be re-cut any larger from this artwork without also taking the printed
name, which the sheet draws itself. Showing the signature whole needs it
exported on its own — see `public/certificate-art/README.md`.

**The phoenix.** The gold wave that sweeps across the base of the sheet runs
tangent to the wingtips, so colour cannot separate them and they label as one
blob. Eroding enough to break the wave also eats the wing feathers. It needs
the original logo file instead.

## Not webp, for a mark

These reference files are webp, which is fine — nothing renders them. A mark
under `public/certificate-art/` must not be: satori decodes the marks, and it
has no webp decoder. One there does not degrade, it throws mid-render and the
certificate comes back a 500.
