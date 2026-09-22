# BetterNotch Website

This repository is the single source of truth for the public BetterNotch website at <https://tungloong.github.io/betternotch-site/>.

The app repository must not carry a second deployable copy of the website. Product definitions and release evidence belong in `tungloong/BetterNotch`; public pages, support content, privacy content, and website assets belong here.

## Structure

- `index.html`: product landing page
- `support/index.html`: setup and troubleshooting
- `privacy/index.html`: privacy policy
- `assets/`: shared styles, behavior, and site media
- `scripts/check-site.mjs`: zero-dependency release contract checks
- `scripts/check-public-links.mjs`: retrying production URL and redirect checks
- `scripts/build-site.mjs`: deterministic deployment allowlist and `_site` builder
- `scripts/prepare-2.0-captures.swift`: deterministic crops from approved captures
- `scripts/prepare-promo-captures.swift`: compressed captures for the two App Store compositions
- `scripts/generate-image-derivatives.sh`: deterministic AVIF regeneration

## Visual assets

Public product pixels come from approved BetterNotch 2.0 captures. They are cropped and compressed only. The site does not redraw the product in CSS or with generated imagery.

Approved sources used on this site:

| Page use | Source (BetterNotchAssets) |
| --- | --- |
| Three overlapping MacBook looks | `Design/AppStore/Candidates/2026-09-19-2.0-hero-r7/source/{original,gradient,glass-ink}.png` |
| External display, MacBook, and Sidecar | `Design/AppStore/Candidates/2026-09-20-2.0-glass-r9/source/{external,builtin,ipad}.png` |
| Main window | `Design/AppStore/Candidates/2026-09-20-2.0-controls-r5/source/main-window-en-US.png` and `main-window-zh-Hans.png` |
| Detail panels | `Design/AppStore/Candidates/2026-09-20-2.0-details-r4/source/blend-window-*.png` and `glass-window-*.png` |
| App icon 128 | `Design/Icon/Releases/2.0/AppIcon.appiconset/icon_128x128.png` |

Full-size PNGs linked from “View full size” are the same deterministic crops as the in-page images, not new artwork. Main-window and detail-panel crops keep interior product pixels and punch only the exterior to transparent (window chrome measured at 32px, detail panels at 24px after the 26px source margin crop). They stay PNG because `generate-image-derivatives.sh` encodes AVIF as `rgb24` then `yuv420p`, which drops alpha. The 2.0 brand mark is the same: pages load `betternotch-icon-128.png` only. Window and detail images preserve their source alpha without an additional CSS corner clip. The page fill is the promo artboard `#f4f3ec`.

The two promo scenes reuse hardware geometry and composition from the approved `hero-r7` and `glass-r9` HTML/CSS. Only the device bodies are CSS; their screens are real captures. Six metadata-free JPEG derivatives supply these scenes. The MacBook capture is cropped to its top 1800 source pixels to exclude the Dock outside the approved composition. The other captures retain their full source bounds. The loupe repeats the same MacBook image and hardware geometry.

Shared Open Graph image `assets/og-betternotch-2.0.png` is a deterministic 1200×630 layout: fill `#f4f3ec`, the approved 2.0 icon, the BetterNotch wordmark (no slogan), and a large crop of the gradient menu-bar capture that starts after the English menu titles so the shared image has no interface language.

Recreate crops from this machine’s BetterNotchAssets checkout, then regenerate AVIF derivatives. The Swift helper currently hard-codes absolute source paths under `/Users/tungloong/Codes/BetterNotchAssets/…` (the files listed in the table above). It is not portable without editing those paths:

```sh
swift scripts/prepare-2.0-captures.swift assets
swift scripts/prepare-promo-captures.swift assets
./scripts/generate-image-derivatives.sh
```

Do not treat those scripts as part of the public site. `scripts/build-site.mjs` copies exactly 44 allowlisted files into `_site` (three HTML pages, `robots.txt`, `sitemap.xml`, shared CSS/JS, promo CSS and JPEGs, the 2.0 OG image, the PNG icon, opaque menu-bar AVIF derivatives, web PNGs, and the full-size PNGs linked from “View full size”). README, scripts, `.preview`, capture-prep metadata, and superseded 1.0 graphics stay out.

The homepage page-top bar is an explanatory CSS demonstration driven by scroll progress `p = clamp(scrollTop / (scrollHeight - clientHeight), 0, 1)` with no 0.98 snap and no `p * 1000` opacity gate. `p = 0` is the untreated centered notch silhouette (called Default here; it is not App appearance Default). As `p` grows, a real horizontal gradient widens from `--notch-w`: the solid black core always covers the original notch, and `--notch-wing` paints continuous translucent gray ramps on both sides. The wings are most open in the middle of the page and collapse as `p → 1`. `p = 1` is a full-bar solid black. It is not the Mac product and not Liquid Glass. Real product pixels remain approved 2.0 captures and must not be redrawn in CSS. The three-look composition reuses hero-r7 geometry (3564px body, 3420px screen, 8px metal / 64px bezel), including all three staggered positions. The hardware extends past the right edge, with no fabricated right corner. Each outer clip follows the source 130px radius at its display scale; window and detail images keep their own alpha without a second CSS corner clip. `liquid-glass.js`, Studio, backdrop pickers, the old four-state cycle, and the STEP 6 Original/Gradient controls stay removed.

`assets/og-betternotch-1.0-en.png` is kept as a historical file and is not linked from current pages.

Store screenshots remain a separate approval track. Website crops are not App Store screenshot approval.

The owner approved the website design on 2026-09-21 and authorized publication on 2026-09-22 after confirming the app had passed review and been released. Apple’s public lookup confirms version 2.0, the approved name `BetterNotch: Seamless Menu Bar`, macOS 26.0 minimum, and US price $2.99. This release replaces the 1.0 website through the existing GitHub Pages workflow. After deployment, verify the production URLs separately; a local preview or `--lint` is not evidence that production has updated.

Run the zero-dependency release checks before each deploy:

```sh
node scripts/check-site.mjs
```

Check the deployed Marketing, Support, Privacy, social-image, App Store, and
GitHub privacy links with retries:

```sh
node scripts/check-public-links.mjs
```

The static contract runs on every push and pull request. Keep the
network-dependent check manual so a transient external outage cannot block a
valid site change. Lint the production link list without fetching:

```sh
node scripts/check-public-links.mjs --lint
```

Do not treat a production fetch as 2.0 proof until this tree is deployed.

CI uses Node 24 and commit-pinned official GitHub Actions. When updating an
action, review the upstream release, replace the full commit SHA and version
comment together, then run the static contract before pushing.

GitHub Pages deploys from the `_site` artifact built by
`scripts/build-site.mjs`, not directly from the repository root. That allowlist
keeps source captures, superseded graphics, documentation, validation
scripts, `.preview` artifacts, and capture-prep metadata out of the public site
while preserving runtime pages, styles, scripts, OG, AVIF derivatives, and the
full-size PNGs linked from “View full size”.
The allowlist rejects symlinks, and CI rebuilds it before every deploy. The
build job is read-only; only the isolated deployment job receives Pages write
and OIDC permissions. The production link check also verifies that representative
source-only and superseded files remain unavailable over HTTP.

The HTML starts in a static `no-js` state. A tiny head script switches to the
interactive state before first paint; if scripting is unavailable, the English
content, full-size capture links, download, Support, and Privacy links remain
usable. Language switching needs JavaScript; both three-device compositions are visible without it.


### Homepage copy and composition

The headline and short supporting copy come from the product-owner-approved App Store render sources: `2026-09-19-2.0-hero-r7/app.js`, `2026-09-20-2.0-glass-r9/app.js`, `2026-09-20-2.0-controls-r5/app.js`, and `2026-09-20-2.0-details-r4/app.js` in BetterNotchAssets. The closing sentence comes from `docs/AppStore/metadata.*.md`. The homepage is promotional; setup steps and appearance/blend compatibility remain on Support. There is no scroll instruction or repeated screenshot disclaimer. The first composition shows all three looks at once, with no appearance tabs. The second uses three angled displays and the source loupe, with its headline moved above the composition on phones for legibility. The main-window image is capped at 560 CSS pixels beside its heading on desktop.
