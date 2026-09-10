# Certificate fonts

The certificate sheet is rendered to a PNG on the server by
`src/app/api/certificates/[id]/image/route.tsx`, using satori through Next's
`ImageResponse`. Satori is not a browser: it cannot load a webfont from a CSS
`@import`, so every face the sheet is set in has to be handed to it as bytes.
These are those bytes.

| Family           | Weights            | Where it is used on the sheet          |
| ---------------- | ------------------ | -------------------------------------- |
| Playfair Display | 400, 700, 900      | headings, the track title, DRACAENA    |
| Great Vibes      | 400                | the recipient's name                   |
| Hanken Grotesk   | 300, 400, 700, 800 | everything else, as in the rest of app |

## Why they are subsets

`ImageResponse` allows 500KB for the whole render — JSX, images and fonts
together. The eight full families come to about 780KB on their own. Each file
here is cut to Latin: ASCII plus the accented letters of Latin-1 and a few
typographic marks, which brings all eight to roughly 237KB.

**A character outside that subset renders as blank rather than as itself.** The
names on these certificates come from `users.name`, so a learner who signs up in
a non-Latin script would get a sheet with a gap where their name should be. If
that becomes real, widen the character set below and re-run the command.

## Regenerating them

Google Fonts serves a subset of any family for a given set of characters. From
this directory:

```bash
CHARS=$(printf '%s' "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !\"#\$%&'()*+,-./:;<=>?@[\\]^_\`{|}~ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿŒœŠšŸŽž‘’“”–—…")

fetch() {
  url=$(curl -sS -G -A "Mozilla/4.0" \
    --data-urlencode "family=$1" --data-urlencode "text=$CHARS" \
    "https://fonts.googleapis.com/css2" | grep -o "https://fonts.gstatic.com/[^)]*")
  curl -sS -o "$2" "$url"
}

fetch "Great Vibes"                   GreatVibes-Regular.ttf
fetch "Playfair Display:wght@400"     PlayfairDisplay-Regular.ttf
fetch "Playfair Display:wght@700"     PlayfairDisplay-Bold.ttf
fetch "Playfair Display:wght@900"     PlayfairDisplay-Black.ttf
fetch "Hanken Grotesk:wght@300"       HankenGrotesk-Light.ttf
fetch "Hanken Grotesk:wght@400"       HankenGrotesk-Regular.ttf
fetch "Hanken Grotesk:wght@700"       HankenGrotesk-Bold.ttf
fetch "Hanken Grotesk:wght@800"       HankenGrotesk-ExtraBold.ttf
```

The old user agent is what makes Google serve `ttf`. Satori reads `ttf`, `otf`
and `woff`, but not `woff2`, which is what a modern browser is offered.

Check the total afterwards — it has to stay well inside the 500KB budget, since
the sheet's own markup and the signature artwork count against it too:

```bash
cat *.ttf | wc -c
```

All three families are licensed under the SIL Open Font License.
