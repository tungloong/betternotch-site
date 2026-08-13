#!/usr/bin/env node

import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  { file: "index.html", canonical: "https://tungloong.github.io/betternotch-site/" },
  { file: "support/index.html", canonical: "https://tungloong.github.io/betternotch-site/support/" },
  { file: "privacy/index.html", canonical: "https://tungloong.github.io/betternotch-site/privacy/" },
];
const approvedActionPins = {
  checkout: "3d3c42e5aac5ba805825da76410c181273ba90b1", // v7.0.1
  setupNode: "820762786026740c76f36085b0efc47a31fe5020", // v7.0.0
  configurePages: "45bfe0192ca1faeb007ade9deae92b16b8254a0d", // v6.0.0
  uploadPagesArtifact: "fc324d3547104276b827a68afc52ff2a11cc49c9", // v5.0.0
  deployPages: "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128", // v5.0.0
};
const appStoreUrl = "https://apps.apple.com/app/id6791836457?mt=12";
const approvedShareImage = "assets/og-betternotch-1.0-en.png";
const supportEmail = "longbuild@icloud.com";
const publicImageNames = new Set([
  "assets/betternotch-icon-128.png",
  "assets/betternotch-icon-128.avif",
  "assets/menubar-original-web.png",
  "assets/menubar-original-330.avif",
  "assets/menubar-original-396.avif",
  "assets/menubar-original-528.avif",
  "assets/menubar-gradient-web.png",
  "assets/menubar-gradient-330.avif",
  "assets/menubar-gradient-396.avif",
  "assets/menubar-gradient-528.avif",
  "assets/menubar-solid-black-web.png",
  "assets/menubar-solid-black-330.avif",
  "assets/menubar-solid-black-396.avif",
  "assets/menubar-solid-black-528.avif",
  approvedShareImage,
]);
const failures = [];

function fail(message) {
  failures.push(message);
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) fail(message);
}

async function assertFile(relativePath) {
  try {
    await access(path.join(repoDir, relativePath));
  } catch {
    fail(`Missing file: ${relativePath}`);
  }
}

for (const page of pages) {
  const source = await readFile(path.join(repoDir, page.file), "utf8");

  requireMatch(source, /^<!DOCTYPE html>/, `${page.file}: missing canonical HTML doctype`);
  requireMatch(source, /<meta charset="utf-8">/, `${page.file}: missing UTF-8 declaration`);
  requireMatch(source, /<meta name="viewport" content="width=device-width, initial-scale=1">/, `${page.file}: invalid viewport metadata`);
  requireMatch(source, /<meta name="description" content="[^"]+">/, `${page.file}: missing meta description`);
  requireMatch(source, /<a class="skip-link" href="#main"/, `${page.file}: missing skip link`);
  requireMatch(source, /<main id="main"/, `${page.file}: missing main landmark`);
  requireMatch(source, /<html class="no-js"/, `${page.file}: missing no-JavaScript baseline class`);
  requireMatch(source, /<script>document\.documentElement\.className="js"<\/script>/, `${page.file}: missing early JavaScript-ready class switch`);
  requireMatch(source, /<aside class="no-js-notice"[^>]*hidden[\s\S]*?JavaScript is off\.[\s\S]*?JavaScript 已关闭。[\s\S]*?<\/aside>/, `${page.file}: incomplete bilingual no-JavaScript notice`);
  requireMatch(source, /data-locale-button="en"[^>]*disabled/, `${page.file}: language control must be inert before JavaScript initializes`);
  requireMatch(source, /styles\.css\?v=20260813-3/, `${page.file}: stale stylesheet cache key`);
  requireMatch(source, /language\.js\?v=20260812-3/, `${page.file}: stale language script cache key`);
  requireMatch(source, new RegExp(`<link rel="canonical" href="${page.canonical.replaceAll("/", "\\/")}">`), `${page.file}: canonical URL mismatch`);

  for (const property of [
    "og:type",
    "og:site_name",
    "og:locale",
    "og:locale:alternate",
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:type",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
  ]) {
    requireMatch(source, new RegExp(`<meta property="${property.replace(":", "\\:")}"`), `${page.file}: missing ${property}`);
  }

  for (const property of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
    requireMatch(source, new RegExp(`<meta name="${property.replace(":", "\\:")}"`), `${page.file}: missing ${property}`);
  }

  for (const pair of [
    ["data-en", "data-zh"],
    ["data-aria-en", "data-aria-zh"],
    ["data-alt-en", "data-alt-zh"],
    ["data-src-en", "data-src-zh"],
  ]) {
    const left = count(source, new RegExp(`\\b${pair[0]}=`, "g"));
    const right = count(source, new RegExp(`\\b${pair[1]}=`, "g"));
    if (left !== right) fail(`${page.file}: unpaired ${pair[0]}/${pair[1]} attributes (${left}/${right})`);
  }

  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) fail(`${page.file}: duplicate HTML id`);
  for (const match of source.matchAll(/\bhref="#([^"]+)"/g)) {
    if (!uniqueIds.has(match[1])) fail(`${page.file}: broken same-page anchor #${match[1]}`);
  }

  for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|#)/.test(reference)) continue;
    const cleanReference = reference.split(/[?#]/)[0];
    if (!cleanReference) continue;
    let targetPath = path.resolve(path.dirname(path.join(repoDir, page.file)), cleanReference);
    try {
      const targetStats = await stat(targetPath);
      if (targetStats.isDirectory()) targetPath = path.join(targetPath, "index.html");
    } catch {
      if (cleanReference.endsWith("/")) targetPath = path.join(targetPath, "index.html");
    }
    try {
      await access(targetPath);
    } catch {
      fail(`${page.file}: broken internal reference ${reference}`);
    }
  }

  for (const match of source.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)="([^"]+)"[^>]*>/g)) {
    for (const candidate of match[1].split(",")) {
      const rawUrl = candidate.trim().split(/\s+/)[0];
      if (!rawUrl || /^(?:https?:|data:)/.test(rawUrl)) continue;
      const normalized = path
        .relative(repoDir, path.resolve(path.dirname(path.join(repoDir, page.file)), rawUrl))
        .split(path.sep)
        .join("/");
      if (!publicImageNames.has(normalized)) fail(`${page.file}: unapproved public image reference ${normalized}`);
    }
  }
}

const home = await readFile(path.join(repoDir, "index.html"), "utf8");
requireMatch(home, new RegExp(appStoreUrl.replace(/[?]/g, "\\?")), "index.html: official App Store URL is missing");
requireMatch(home, /Next update preview/, "index.html: release boundary marker is missing");
requireMatch(home, /<picture>[\s\S]*?type="image\/avif"[\s\S]*?srcset="assets\/menubar-gradient-330\.avif 330w, assets\/menubar-gradient-396\.avif 396w, assets\/menubar-gradient-528\.avif 528w"/, "index.html: responsive AVIF hero source is missing");
requireMatch(home, /class="notch-control"[^>]*data-effect-cycle[^>]*disabled/, "index.html: notch control must be inert before JavaScript initializes");
requireMatch(home, /class="no-js-only static-preview-copy"/, "index.html: no-JavaScript static preview explanation is missing");
requireMatch(home, /data-backdrop-button="warm"[^>]*disabled/, "index.html: backdrop controls must be inert before JavaScript initializes");
requireMatch(home, /data-effect-button="gradient"[^>]*disabled/, "index.html: effect controls must be inert before JavaScript initializes");
requireMatch(home, /site\.js\?v=20260812-3/, "index.html: stale site script cache key");
requireMatch(home, /liquid-glass\.js\?v=20260813-1/, "index.html: Liquid Glass optics enhancer is missing");
requireMatch(home, /class="effect-canvas__effect"[\s\S]*?class="effect-canvas__bar"[\s\S]*?class="effect-canvas__rim"[\s\S]*?class="effect-canvas__notch"/, "index.html: effect preview layers must separate the visual band from the hardware notch");
requireMatch(home, /lets you choose a style for the built-in display and each external display/, "index.html: precise per-display style wording is missing");
requireMatch(home, /data-en="Per-display styles" data-zh="逐屏样式"/, "index.html: precise per-display feature heading is missing");
if (/independent controls for (?:every|each) display/.test(home)) fail("index.html: per-display controls wording overstates the released configuration model");
if (/class="effect-tabs"[^>]*role="tablist"/.test(home) || /data-effect-button="[^"]+"[^>]*role="tab"/.test(home)) {
  fail("index.html: interactive tab semantics must not be present before JavaScript initializes");
}

const languageScript = await readFile(path.join(repoDir, "assets/language.js"), "utf8");
requireMatch(languageScript, /classList\.remove\("no-js"\)/, "assets/language.js: no-JavaScript class is not removed on initialization");
requireMatch(languageScript, /classList\.add\("js"\)/, "assets/language.js: JavaScript-ready class is not added on initialization");
requireMatch(languageScript, /button\.disabled = false/, "assets/language.js: language controls are not enabled after initialization");
requireMatch(languageScript, /summary\?\.addEventListener\("keydown"[\s\S]*?\["ArrowDown", "ArrowUp"\]/, "assets/language.js: language menu trigger is missing arrow-key access");
requireMatch(languageScript, /\["ArrowDown", "ArrowRight"\][\s\S]*?\["ArrowUp", "ArrowLeft"\][\s\S]*?event\.key === "Home"[\s\S]*?event\.key === "End"/, "assets/language.js: language options are missing directional keyboard navigation");
requireMatch(languageScript, /menu\.addEventListener\("focusout"[\s\S]*?!menu\.contains\(event\.relatedTarget\)[\s\S]*?removeAttribute\("open"\)/, "assets/language.js: language menu must close when keyboard focus leaves");

const siteScript = await readFile(path.join(repoDir, "assets/site.js"), "utf8");
requireMatch(siteScript, /cycleButton\.disabled = false/, "assets/site.js: notch control is not enabled after initialization");
requireMatch(siteScript, /effectStage\?\.setAttribute\("role", "tabpanel"\)/, "assets/site.js: interactive tabpanel semantics are not enabled after initialization");
requireMatch(siteScript, /effectTabs\?\.setAttribute\("role", "tablist"\)/, "assets/site.js: interactive tablist semantics are not enabled after initialization");
requireMatch(siteScript, /button\.setAttribute\("role", "tab"\)/, "assets/site.js: interactive tab semantics are not enabled after initialization");
requireMatch(siteScript, /button\.setAttribute\("aria-controls", "effect-stage"\)/, "assets/site.js: effect tabs do not reference the interactive panel");

const styles = await readFile(path.join(repoDir, "assets/styles.css"), "utf8");
for (const requirement of [
  [/@media \(max-width: 360px\)/, "320px resilience breakpoint"],
  [/@media \(prefers-reduced-motion: reduce\)/, "reduced-motion support"],
  [/@media \(prefers-contrast: more\)/, "higher-contrast support"],
  [/@media \(forced-colors: active\)/, "forced-colors support"],
  [/\.no-js \.notch-control/, "no-JavaScript inert control styling"],
  [/\.button:hover,[\s\S]*?transform: none;/, "reduced-motion transform removal"],
]) requireMatch(styles, requirement[0], `assets/styles.css: missing ${requirement[1]}`);
requireMatch(styles, /@media print[\s\S]*?\.document-nav[\s\S]*?display: none !important;/, "assets/styles.css: print layout is missing");
requireMatch(styles, /\.site-nav a \{[\s\S]*?min-height: 44px;/, "assets/styles.css: main navigation touch targets are too small");
requireMatch(styles, /\.backdrop-swatch \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/, "assets/styles.css: backdrop touch targets are too small");
requireMatch(styles, /\.document-nav a \{[\s\S]*?min-height: 44px;/, "assets/styles.css: document navigation touch targets are too small");
requireMatch(styles, /\.effect-canvas \{[\s\S]*?--effect-band-height: 66px;/, "assets/styles.css: desktop effect geometry token is missing");
requireMatch(styles, /\.effect-canvas \{[\s\S]*?--effect-notch-width: clamp\(72px, 20%, 236px\);/, "assets/styles.css: measured notch width token is missing");
requireMatch(styles, /\.notch-control \{[\s\S]*?width: min\(calc\(100% - 48px\), var\(--max-width\)\);/, "assets/styles.css: fixed effect study must align to the page width");
requireMatch(styles, /body\[data-effect="liquid-glass"\] \.notch-control__wings \{[\s\S]*?border-radius: 16px;/, "assets/styles.css: fixed Liquid Glass study must round all four corners");
requireMatch(styles, /body\[data-effect="solid-black"\] \.notch-control__wings \{[\s\S]*?width: 100%;/, "assets/styles.css: fixed Solid Black study must align to the page width");
requireMatch(styles, /\.effect-canvas__notch \{[\s\S]*?width: var\(--effect-notch-width\);[\s\S]*?height: var\(--effect-band-height\);/, "assets/styles.css: hardware notch must use the shared visual geometry tokens");
requireMatch(styles, /body\[data-effect="gradient"\] \.effect-canvas__bar \{[\s\S]*?#020203 40%,[\s\S]*?#020203 60%,/, "assets/styles.css: Gradient plateau must stay aligned with the physical notch");
requireMatch(styles, /body\[data-effect="liquid-glass"\] \.effect-canvas__rim \{[\s\S]*?bottom: 0;[\s\S]*?height: 2px;/, "assets/styles.css: Liquid Glass must keep one continuous bottom rim");
if (/body\[data-effect="liquid-glass"\] \.effect-canvas__rim \{[\s\S]*?mask-image:/.test(styles)) fail("assets/styles.css: Liquid Glass rim must not break around the centre ink profile");
requireMatch(styles, /body\[data-effect="liquid-glass"\] \.effect-canvas__bar \{[\s\S]*?inset: 1px;[\s\S]*?border-radius: 14px;/, "assets/styles.css: Liquid Glass ink must stay inside the continuous glass rim");
requireMatch(styles, /body\[data-effect="liquid-glass"\] \.effect-canvas__effect \{[\s\S]*?border-radius: 16px;[\s\S]*?corner-shape: squircle;/, "assets/styles.css: Liquid Glass must use a continuous Apple-style corner shape");
requireMatch(styles, /body\[data-effect="liquid-glass"\] \.effect-canvas__effect \{[\s\S]*?height: calc\(var\(--effect-band-height\) - 6px\);/, "assets/styles.css: inset glass and hardware notch must share a bottom edge");
requireMatch(styles, /body\[data-effect="gradient"\] \.effect-canvas__notch,\s*body\[data-effect="liquid-glass"\] \.effect-canvas__notch \{[\s\S]*?opacity: 0;[\s\S]*?box-shadow: none;/, "assets/styles.css: composited effects must not redraw the hardware silhouette");
requireMatch(styles, /body\[data-effect="gradient"\] \.notch-control__wings::before,\s*body\[data-effect="liquid-glass"\] \.notch-control__wings::before \{[\s\S]*?width: calc\(var\(--notch-shape-half-width\) \+ var\(--notch-shape-half-width\) \+ 16px\);[\s\S]*?background: #050506;/, "assets/styles.css: fixed effect study must fill the centre seam behind the hardware silhouette");
requireMatch(styles, /body\[data-effect="gradient"\] \.notch-control__shape,\s*body\[data-effect="liquid-glass"\] \.notch-control__shape \{[\s\S]*?opacity: 0;[\s\S]*?box-shadow: none;/, "assets/styles.css: fixed composited effects must not redraw the hardware silhouette");
requireMatch(styles, /@media \(max-width: 760px\)[\s\S]*?\.effect-canvas \{[\s\S]*?--effect-band-height: 50px;/, "assets/styles.css: mobile effect geometry must scale as one continuous band");
if (/\.effect-canvas__bar,\s*\n\s*\.effect-canvas__notch\s*\{\s*\n\s*height:/.test(styles)) fail("assets/styles.css: visual band and hardware notch heights must not diverge");

requireMatch(languageScript, /menu\?\.querySelector\("summary"\)\?\.focus\(\);/, "assets/language.js: language selection must restore focus to its trigger");
requireMatch(languageScript, /const shouldRestoreFocus = menu\.contains\(document\.activeElement\);[\s\S]*?if \(shouldRestoreFocus\) menu\.querySelector\("summary"\)\?\.focus\(\);/, "assets/language.js: outside clicks must not leave focus inside a closed menu");
requireMatch(languageScript, /if \(menu\.contains\(document\.activeElement\)\)[\s\S]*?menu\.querySelector\("summary"\)\?\.focus\(\);/, "assets/language.js: Escape must not leave focus inside a closed menu");

const jsonLdMatch = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) {
  fail("index.html: missing SoftwareApplication JSON-LD");
} else {
  try {
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    if (jsonLd["@type"] !== "SoftwareApplication") fail("index.html: JSON-LD type mismatch");
    if (jsonLd.softwareVersion !== "1.0") fail("index.html: JSON-LD release version mismatch");
    if (jsonLd.downloadUrl !== appStoreUrl) fail("index.html: JSON-LD download URL mismatch");
    if (jsonLd.offers?.url !== appStoreUrl) fail("index.html: JSON-LD offer URL mismatch");
  } catch (error) {
    fail(`index.html: invalid JSON-LD (${error.message})`);
  }
}

const support = await readFile(path.join(repoDir, "support/index.html"), "utf8");
requireMatch(support, /id="available-version"/, "support/index.html: released-version section is missing");
requireMatch(support, new RegExp(appStoreUrl.replace(/[?]/g, "\\?")), "support/index.html: official App Store URL is missing");
requireMatch(support, /Liquid Glass and the new Studio interface are shown on the homepage as a preview of the next update\./, "support/index.html: current/future release boundary is missing");
requireMatch(support, new RegExp(`href="mailto:${supportEmail}"`), "support/index.html: support email link mismatch");
requireMatch(support, /class="document-nav"[\s\S]*?href="#available-version"[\s\S]*?href="#contact-support"/, "support/index.html: support task navigation is incomplete");
requireMatch(support, /style selection for the built-in display and each external display/, "support/index.html: precise per-display style wording is missing");
if (/independent controls for (?:every|each) display/.test(support)) fail("support/index.html: per-display controls wording overstates the released configuration model");

const privacy = await readFile(path.join(repoDir, "privacy/index.html"), "utf8");
requireMatch(privacy, /Effective August 12, 2026/, "privacy/index.html: effective date mismatch");
requireMatch(privacy, /github-general-privacy-statement/, "privacy/index.html: GitHub Pages disclosure link is missing");
requireMatch(privacy, /BetterNotch does not add analytics, advertising, tracking pixels, or third-party scripts to the site\./, "privacy/index.html: website tracking disclosure is missing");
requireMatch(privacy, new RegExp(`href="mailto:${supportEmail}"`), "privacy/index.html: privacy email link mismatch");
requireMatch(privacy, /class="document-nav"[\s\S]*?href="#collection"[\s\S]*?href="#contact"/, "privacy/index.html: policy navigation is incomplete");
requireMatch(privacy, /The selected style and effect parameters/, "privacy/index.html: cross-version effect parameter disclosure is missing");
requireMatch(privacy, /Style selection for the built-in display and each external display/, "privacy/index.html: precise local per-display disclosure is missing");

const robots = await readFile(path.join(repoDir, "robots.txt"), "utf8");
requireMatch(robots, /User-agent: \*\nAllow: \/\n/, "robots.txt: crawl policy mismatch");
requireMatch(robots, /Sitemap: https:\/\/tungloong\.github\.io\/betternotch-site\/sitemap\.xml/, "robots.txt: sitemap URL mismatch");

const sitemap = await readFile(path.join(repoDir, "sitemap.xml"), "utf8");
for (const page of pages) requireMatch(sitemap, new RegExp(`<loc>${page.canonical.replaceAll("/", "\\/")}<\\/loc>`), `sitemap.xml: missing ${page.canonical}`);

const workflow = await readFile(path.join(repoDir, ".github/workflows/site-checks.yml"), "utf8");
requireMatch(workflow, new RegExp(`actions/checkout@${approvedActionPins.checkout} # v7\\.0\\.1`), ".github/workflows/site-checks.yml: checkout must be pinned to reviewed v7.0.1 commit");
requireMatch(workflow, new RegExp(`actions/setup-node@${approvedActionPins.setupNode} # v7\\.0\\.0`), ".github/workflows/site-checks.yml: setup-node must be pinned to reviewed v7.0.0 commit");
requireMatch(workflow, /node-version: 24/, ".github/workflows/site-checks.yml: Node 24 runtime is missing");
requireMatch(workflow, /package-manager-cache: false/, ".github/workflows/site-checks.yml: dependency-free workflow must disable package-manager caching");
requireMatch(workflow, /run: node scripts\/build-site\.mjs/, ".github/workflows/site-checks.yml: allowlisted site build must be validated in CI");

const deployWorkflow = await readFile(path.join(repoDir, ".github/workflows/deploy-pages.yml"), "utf8");
for (const [action, pin, version] of [
  ["actions/checkout", approvedActionPins.checkout, "v7.0.1"],
  ["actions/setup-node", approvedActionPins.setupNode, "v7.0.0"],
  ["actions/configure-pages", approvedActionPins.configurePages, "v6.0.0"],
  ["actions/upload-pages-artifact", approvedActionPins.uploadPagesArtifact, "v5.0.0"],
  ["actions/deploy-pages", approvedActionPins.deployPages, "v5.0.0"],
]) {
  requireMatch(deployWorkflow, new RegExp(`${action}@${pin} # ${version.replaceAll(".", "\\.")}`), `.github/workflows/deploy-pages.yml: ${action} pin mismatch`);
}
requireMatch(deployWorkflow, /run: node scripts\/check-site\.mjs/, ".github/workflows/deploy-pages.yml: release contract must run before packaging");
requireMatch(deployWorkflow, /run: node scripts\/build-site\.mjs/, ".github/workflows/deploy-pages.yml: allowlisted site build is missing");
requireMatch(deployWorkflow, /path: _site/, ".github/workflows/deploy-pages.yml: Pages artifact path mismatch");
requireMatch(deployWorkflow, /build:[\s\S]*?permissions:[\s\S]*?contents: read[\s\S]*?pages: read/, ".github/workflows/deploy-pages.yml: build job must use read-only repository and Pages permissions");
requireMatch(deployWorkflow, /pages: write/, ".github/workflows/deploy-pages.yml: Pages write permission is missing");
requireMatch(deployWorkflow, /id-token: write/, ".github/workflows/deploy-pages.yml: OIDC permission is missing");

await assertFile("scripts/build-site.mjs");
await assertFile("assets/liquid-glass.js");
const liquidGlassScript = await readFile(path.join(repoDir, "assets/liquid-glass.js"), "utf8");
requireMatch(liquidGlassScript, /function continuousRectDistance\(/, "assets/liquid-glass.js: continuous-corner distance field is missing");
requireMatch(liquidGlassScript, /feDisplacementMap/, "assets/liquid-glass.js: optical displacement stage is missing");
requireMatch(liquidGlassScript, /ResizeObserver/, "assets/liquid-glass.js: responsive optical map regeneration is missing");
const gitignore = await readFile(path.join(repoDir, ".gitignore"), "utf8");
requireMatch(gitignore, /^_site\/$/m, ".gitignore: generated Pages artifact must remain untracked");

for (const relativePath of publicImageNames) await assertFile(relativePath);

const imageBudgets = new Map([
  ["assets/betternotch-icon-128.avif", 5_000],
  ["assets/menubar-original-330.avif", 15_000],
  ["assets/menubar-original-396.avif", 20_000],
  ["assets/menubar-original-528.avif", 30_000],
  ["assets/menubar-gradient-330.avif", 15_000],
  ["assets/menubar-gradient-396.avif", 20_000],
  ["assets/menubar-gradient-528.avif", 30_000],
  ["assets/menubar-solid-black-330.avif", 15_000],
  ["assets/menubar-solid-black-396.avif", 20_000],
  ["assets/menubar-solid-black-528.avif", 30_000],
  [approvedShareImage, 650_000],
]);

for (const [relativePath, maximumBytes] of imageBudgets) {
  try {
    const fileStats = await stat(path.join(repoDir, relativePath));
    if (fileStats.size > maximumBytes) fail(`${relativePath}: ${fileStats.size} bytes exceeds ${maximumBytes}-byte budget`);
  } catch {
    // Missing files are reported by assertFile above.
  }
}

if (failures.length > 0) {
  console.error(`Site checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site checks passed: ${pages.length} pages, bilingual parity, metadata, links, release boundaries, approved public imagery, and image budgets.`);
