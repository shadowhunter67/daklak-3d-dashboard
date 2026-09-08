# Bundled webfonts

All three families are licensed under the **SIL Open Font License 1.1**, which permits
bundling, redistribution and commercial use provided the licence travels with the files.

| Family         | Copyright                                         | Upstream                                        |
| -------------- | ------------------------------------------------- | ----------------------------------------------- |
| Be Vietnam Pro | Copyright 2019 The Be Vietnam Pro Project Authors | https://github.com/bettergui/BeVietnamPro       |
| JetBrains Mono | Copyright 2020 The JetBrains Mono Project Authors | https://github.com/JetBrains/JetBrainsMono      |
| Space Grotesk  | Copyright 2020 The Space Grotesk Project Authors  | https://github.com/floriankarsten/space-grotesk |

Full licence text: https://openfontlicense.org/open-font-license-official-text/

## Why these files are committed

`index.html` sets `default-src 'self'` with no `font-src` directive, so `font-src` falls back
to `'self'`: a Google Fonts `<link>` would be blocked twice over — the stylesheet by
`style-src 'self'`, the font files by the `default-src` fallback. Serving the faces from our own
origin is therefore the only option, and it also removes a third-party request from a public
sector site.

## What is shipped

Only the `latin`, `latin-ext` and `vietnamese` subsets, and only the weights the stylesheet
actually uses (400/600/700 for Be Vietnam Pro, 400 for JetBrains Mono, 700 for Space Grotesk).
Cyrillic and Greek are dropped. `unicode-range` is preserved in `../fonts.css` so a browser
fetches the Vietnamese file only when it needs those glyphs.

To change the weight set, re-run the download against Google Fonts' `css2` endpoint with a
woff2-capable user agent and keep the `unicode-range` values intact.
