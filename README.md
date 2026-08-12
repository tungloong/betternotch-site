# BetterNotch Website

This repository is the single source of truth for the public BetterNotch website at <https://tungloong.github.io/betternotch-site/>.

The app repository must not carry a second deployable copy of the website. Product definitions and release evidence belong in `tungloong/BetterNotch`; public pages, support content, privacy content, and website assets belong here.

## Structure

- `index.html`: product landing page
- `support/index.html`: setup and troubleshooting
- `privacy/index.html`: privacy policy
- `assets/`: shared styles, behavior, and site media
- `scripts/check-site.mjs`: zero-dependency release contract checks
- `scripts/generate-image-derivatives.sh`: deterministic AVIF regeneration

## Visual asset status

Store screenshots, promotional graphics, and previews remain unapproved until the product owner explicitly accepts a replacement set. Existing site imagery must not be treated as approval evidence for App Store assets.

`assets/og-betternotch-1.0-en.png` is a deterministic 1200×630 derivative of
the product-owner-approved `BetterNotchAssets/Design/AppStore/en-US/01.png`
listed in `approved-screenshots.txt`. Its use as website social metadata does
not approve any new or replacement App Store screenshot.

The `menubar-*-330.avif`, `menubar-*-396.avif`, and
`menubar-*-528.avif` files are deterministic, modern-format derivatives of the
committed real menu bar captures. They change encoding and dimensions only;
the PNG files remain the compatibility fallback and pixel-source record.
Regenerate them with:

```sh
./scripts/generate-image-derivatives.sh
```

Run the zero-dependency release checks before each deploy:

```sh
node scripts/check-site.mjs
```
