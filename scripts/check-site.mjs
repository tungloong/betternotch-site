#!/usr/bin/env node

import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicFiles, referencedFiles } from "./build-site.mjs";

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoDir, "_site");
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
const approvedShareImage = "assets/og-betternotch-2.0.png";
const supportEmail = "longbuild@icloud.com";
const privateFiles = [
  "README.md",
  "scripts/check-site.mjs",
  "scripts/check-public-links.mjs",
  "scripts/build-site.mjs",
  "scripts/prepare-2.0-captures.swift",
  "scripts/prepare-promo-captures.swift",
  "scripts/generate-image-derivatives.sh",
  "assets/og-betternotch-1.0-en.png",
];
const retiredPublicPatterns = [
  /liquid-glass\.js/,
  /menubar-original/,
  /menubar-solid-black/,
  /og-betternotch-1\.0/,
  /app-controls-/,
  /effect-canvas/,
  /notch-control/,
  /Next update preview/,
];
const bilingualPairs = [
  ["data-en", "data-zh"],
  ["data-aria-en", "data-aria-zh"],
  ["data-alt-en", "data-alt-zh"],
  ["data-src-en", "data-src-zh"],
  ["data-srcset-en", "data-srcset-zh"],
  ["data-href-en", "data-href-zh"],
  ["data-full-height-en", "data-full-height-zh"],
];
const imageBudgets = new Map([
  ["assets/menubar-gradient-696.avif", 20_000],
  ["assets/menubar-gradient-928.avif", 32_000],
  ["assets/menubar-gradient-1392.avif", 50_000],
  ["assets/menubar-glass-ink-464.avif", 60_000],
  ["assets/menubar-glass-ink-928.avif", 180_000],
  ["assets/menubar-glass-ink-1392.avif", 320_000],
  ["assets/menubar-ink-464.avif", 15_000],
  ["assets/menubar-ink-928.avif", 32_000],
  ["assets/menubar-ink-1392.avif", 50_000],
  [approvedShareImage, 650_000],
  ["assets/menubar-gradient.png", 2_200_000],
  ["assets/menubar-glass-ink.png", 2_000_000],
  ["assets/menubar-ink.png", 1_200_000],
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

function forbidMatch(text, pattern, message) {
  if (pattern.test(text)) fail(message);
}

async function assertFile(relativePath) {
  try {
    await access(path.join(repoDir, relativePath));
  } catch {
    fail(`Missing file: ${relativePath}`);
  }
}

function cacheKey(source, fileName) {
  const match = source.match(new RegExp(`${fileName.replace(".", "\\.")}\\?v=([^"']+)`));
  return match?.[1] ?? null;
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const allowlist = new Set(publicFiles);

for (const page of pages) {
  const source = await readFile(path.join(repoDir, page.file), "utf8");

  requireMatch(source, /^<!DOCTYPE html>/, `${page.file}: missing canonical HTML doctype`);
  requireMatch(source, /<meta charset="utf-8">/, `${page.file}: missing UTF-8 declaration`);
  requireMatch(source, /<meta name="viewport" content="width=device-width, initial-scale=1">/, `${page.file}: invalid viewport metadata`);
  requireMatch(source, /<meta name="description" content="[^"]+">/, `${page.file}: missing meta description`);
  requireMatch(source, /<a class="skip-link" href="#main"/, `${page.file}: missing skip link`);
  requireMatch(source, /<main id="main"/, `${page.file}: missing main landmark`);
  requireMatch(source, /<html class="no-js"/, `${page.file}: missing no-JavaScript baseline class`);
  requireMatch(source, /document\.documentElement\.className = "js"/, `${page.file}: missing early JavaScript-ready class switch`);
  requireMatch(source, /<aside class="no-js-notice"[^>]*hidden[\s\S]*?JavaScript is off\.[\s\S]*?JavaScript 已关闭。[\s\S]*?<\/aside>/, `${page.file}: incomplete bilingual no-JavaScript notice`);
  requireMatch(source, /data-locale-button="en"[^>]*disabled/, `${page.file}: language control must be inert before JavaScript initializes`);
  requireMatch(source, /styles\.css\?v=/, `${page.file}: stylesheet cache key is missing`);
  requireMatch(source, /language\.js\?v=/, `${page.file}: language script cache key is missing`);
  requireMatch(source, new RegExp(`<link rel="canonical" href="${page.canonical.replaceAll("/", "\\/")}">`), `${page.file}: canonical URL mismatch`);
  requireMatch(source, /og:image" content="https:\/\/tungloong\.github\.io\/betternotch-site\/assets\/og-betternotch-2\.0\.png"/, `${page.file}: OG image URL mismatch`);
  requireMatch(source, /twitter:image" content="https:\/\/tungloong\.github\.io\/betternotch-site\/assets\/og-betternotch-2\.0\.png"/, `${page.file}: Twitter image URL mismatch`);
  requireMatch(source, /og:image:width" content="1200"/, `${page.file}: OG width must be 1200`);
  requireMatch(source, /og:image:height" content="630"/, `${page.file}: OG height must be 630`);
  requireMatch(source, /og:site_name" content="BetterNotch"/, `${page.file}: OG site name must stay BetterNotch`);

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

  for (const pair of bilingualPairs) {
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

  for (const pattern of retiredPublicPatterns) {
    forbidMatch(source, pattern, `${page.file}: retired 1.0/Studio/simulated-glass reference ${pattern}`);
  }
}

const home = await readFile(path.join(repoDir, "index.html"), "utf8");
const support = await readFile(path.join(repoDir, "support/index.html"), "utf8");
const privacy = await readFile(path.join(repoDir, "privacy/index.html"), "utf8");
const styleKey = cacheKey(home, "styles.css");
const languageKey = cacheKey(home, "language.js");
const siteKey = cacheKey(home, "site.js");
if (!styleKey || !languageKey || !siteKey) fail("index.html: shared asset cache keys are incomplete");
for (const page of pages) {
  const source = page.file === "index.html" ? home : page.file.startsWith("support") ? support : privacy;
  if (cacheKey(source, "styles.css") !== styleKey) fail(`${page.file}: stylesheet cache key must match the homepage`);
  if (cacheKey(source, "language.js") !== languageKey) fail(`${page.file}: language script cache key must match the homepage`);
}

requireMatch(home, new RegExp(appStoreUrl.replace(/[?]/g, "\\?")), "index.html: official App Store URL is missing");
requireMatch(home, /View on Mac App Store/, "index.html: store button must stay a neutral App Store link");
requireMatch(home, /macOS 26/, "index.html: macOS 26 requirement is missing");
requireMatch(home, /class="page-notch"/, "index.html: homepage scroll-driven notch demonstration is missing");
requireMatch(home, /data-page-notch/, "index.html: homepage demonstration root is missing");
requireMatch(home, /--notch-p:\s*0/, "index.html: demonstration must start as untreated Default (p=0) without JavaScript");
forbidMatch(home, /does not change your Mac|不会改动你的 Mac/, "index.html: internal Mac disclaimer must stay removed");
forbidMatch(home, /betternotch-icon-128\.avif/, "index.html: brand mark must stay the alpha PNG, not an AVIF that drops alpha");
forbidMatch(home, /data-notch-cycle|data-notch-button|notch-compare|notch-hint/, "index.html: Original/Gradient controls and timed demo UI must stay removed");
forbidMatch(home, /data-effect-cycle|data-backdrop|class="notch-control"/, "index.html: 1.0 four-state/Studio notch controls must stay removed");
requireMatch(home, /site\.js\?v=/, "index.html: site script cache key is missing");
requireMatch(home, /data-src-zh="assets\/window-zh-web\.png"/, "index.html: Chinese main-window source is missing");
requireMatch(home, /data-href-zh="assets\/window-zh\.png"/, "index.html: Chinese full-size window link is missing");
forbidMatch(home, /window-zh-\d+\.avif|details-(?:blend|glass)-[a-z]+-\d+\.avif/, "index.html: window and detail panels must stay alpha PNG, not AVIF");


requireMatch(home, /class="promo-stack"/, "index.html: three-look composition is missing");
requireMatch(home, /class="promo-displays"/, "index.html: three-display composition is missing");
if (count(home, /class="stack-device /g) !== 3) fail("index.html: all three looks must be visible together");
for (const asset of ["original", "gradient", "glass-ink", "external", "builtin", "sidecar"]) {
  requireMatch(home, new RegExp(`assets/promo-${asset}\\.jpg`), `index.html: missing approved ${asset} capture`);
}

const languageScript = await readFile(path.join(repoDir, "assets/language.js"), "utf8");
requireMatch(languageScript, /classList\.remove\("no-js"\)/, "assets/language.js: no-JavaScript class is not removed on initialization");
requireMatch(languageScript, /classList\.add\("js"\)/, "assets/language.js: JavaScript-ready class is not added on initialization");
requireMatch(languageScript, /button\.disabled = false/, "assets/language.js: language controls are not enabled after initialization");
requireMatch(languageScript, /summary\?\.addEventListener\("keydown"[\s\S]*?\["ArrowDown", "ArrowUp"\]/, "assets/language.js: language menu trigger is missing arrow-key access");
requireMatch(languageScript, /\["ArrowDown", "ArrowRight"\][\s\S]*?\["ArrowUp", "ArrowLeft"\][\s\S]*?event\.key === "Home"[\s\S]*?event\.key === "End"/, "assets/language.js: language options are missing directional keyboard navigation");
requireMatch(languageScript, /menu\.addEventListener\("focusout"[\s\S]*?!menu\.contains\(event\.relatedTarget\)[\s\S]*?removeAttribute\("open"\)/, "assets/language.js: language menu must close when keyboard focus leaves");
requireMatch(languageScript, /menu\?\.querySelector\("summary"\)\?\.focus\(\);/, "assets/language.js: language selection must restore focus to its trigger");
requireMatch(languageScript, /const shouldRestoreFocus = menu\.contains\(document\.activeElement\);[\s\S]*?if \(shouldRestoreFocus\) menu\.querySelector\("summary"\)\?\.focus\(\);/, "assets/language.js: outside clicks must not leave focus inside a closed menu");
requireMatch(languageScript, /if \(menu\.contains\(document\.activeElement\)\)[\s\S]*?menu\.querySelector\("summary"\)\?\.focus\(\);/, "assets/language.js: Escape must not leave focus inside a closed menu");
requireMatch(languageScript, /data-href-en\]\[data-href-zh/, "assets/language.js: locale-specific full-size hrefs are not applied");

const siteScript = await readFile(path.join(repoDir, "assets/site.js"), "utf8");
requireMatch(siteScript, /dialog\.showModal/, "assets/site.js: full-size viewer is missing");
requireMatch(siteScript, /addEventListener\("close"/, "assets/site.js: full-size viewer must restore focus on close");
requireMatch(siteScript, /function resetZoomScroller[\s\S]*scrollLeft = 0[\s\S]*scrollTop = 0/, "assets/site.js: full-size viewer must reset scroller origin when opening a capture");
requireMatch(siteScript, /prefers-reduced-motion/, "assets/site.js: page-top demonstration must honor reduced motion");
requireMatch(siteScript, /scrollHeight/, "assets/site.js: homepage demonstration must follow document scroll progress");
requireMatch(siteScript, /--notch-p/, "assets/site.js: homepage demonstration must publish --notch-p");
requireMatch(siteScript, /Math\.min\(1, Math\.max\(0, scrolling\.scrollTop \/ max\)\)/, "assets/site.js: notch progress must be a continuous clamp of scrollTop / max");
forbidMatch(siteScript, /0\.98|\* 1000/, "assets/site.js: notch progress must not snap at 0.98 or use a p*1000 gate");
forbidMatch(siteScript, /clearTimeout|data-notch-button|data-notch-cycle/, "assets/site.js: timed Original/Gradient demo and compare controls must stay removed");
forbidMatch(siteScript, /liquid-glass/, "assets/site.js: simulated glass enhancer must stay removed");
forbidMatch(siteScript, /data-effect-cycle|effect-canvas|four-state/, "assets/site.js: 1.0 four-state notch cycle must stay removed");

const styles = await readFile(path.join(repoDir, "assets/styles.css"), "utf8");
for (const requirement of [
  [/@media \(max-width: 360px\)/, "320px resilience breakpoint"],
  [/@media \(prefers-reduced-motion: reduce\)/, "reduced-motion support"],
  [/@media \(prefers-contrast: more\)/, "higher-contrast support"],
  [/@media \(forced-colors: active\)/, "forced-colors support"],
  [/\.no-js \.js-only/, "no-JavaScript inert control styling"],
  [/\.button:hover,[\s\S]*?transform: none;/, "reduced-motion transform removal"],
]) requireMatch(styles, requirement[0], `assets/styles.css: missing ${requirement[1]}`);
requireMatch(styles, /@media print[\s\S]*?\.document-nav[\s\S]*?display: none !important;/, "assets/styles.css: print layout is missing");
requireMatch(styles, /\.site-nav a \{[\s\S]*?min-height: 44px;/, "assets/styles.css: main navigation touch targets are too small");
requireMatch(styles, /\.document-nav a \{[\s\S]*?min-height: 44px;/, "assets/styles.css: document navigation touch targets are too small");
requireMatch(styles, /@media \(max-width: 760px\)[\s\S]*?\.view-large \{[\s\S]*?min-height: 44px;/, "assets/styles.css: mobile full-size control is below 44px");
requireMatch(styles, /--notch-p/, "assets/styles.css: homepage scroll-driven notch progress token is missing");
requireMatch(styles, /var\(--notch-w\) \+ \(100vw - var\(--notch-w\)\) \* var\(--notch-p\)/, "assets/styles.css: notch fill must expand continuously from the original notch width");
requireMatch(styles, /\.page-notch__fill \{[\s\S]*?linear-gradient\(\s*90deg/, "assets/styles.css: notch fill must use a real horizontal gradient, not a solid black rectangle");
requireMatch(styles, /--notch-wing/, "assets/styles.css: notch fill must expose a continuous fade-wing length");
requireMatch(styles, /#f4f3ec/, "assets/styles.css: page fill must use the approved App Store artboard color");
forbidMatch(styles, /notch-p\) \* 1000/, "assets/styles.css: notch fill must not use a p*1000 opacity gate");
forbidMatch(styles, /--notch-gradient-profile|\.page-notch\[data-notch/, "assets/styles.css: two-state Original/Gradient page-top demonstration must stay removed");
forbidMatch(styles, /liquid-glass\.js|\.effect-canvas__rim|--liquid-glass-ink-profile/, "assets/styles.css: simulated Liquid Glass study must stay removed");
forbidMatch(styles, /--display:|--note:/, "assets/styles.css: magazine display/handwritten fonts must stay removed");

const jsonLdMatch = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) {
  fail("index.html: missing SoftwareApplication JSON-LD");
} else {
  try {
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    if (jsonLd["@type"] !== "SoftwareApplication") fail("index.html: JSON-LD type mismatch");
    if (jsonLd.name !== "BetterNotch") fail("index.html: JSON-LD name must stay BetterNotch");
    if (jsonLd.alternateName !== "BetterNotch: Seamless Menu Bar") fail("index.html: approved App Store name mismatch");
    if (jsonLd.offers?.price !== "0" || jsonLd.offers?.priceCurrency !== "USD") fail("index.html: US App Store price mismatch");
    if (jsonLd.softwareVersion !== "2.1") fail("index.html: JSON-LD softwareVersion must be 2.1");
    if (jsonLd.downloadUrl !== appStoreUrl) fail("index.html: JSON-LD download URL mismatch");
    if (jsonLd.offers?.url !== appStoreUrl) fail("index.html: JSON-LD offer URL mismatch");
    if (!String(jsonLd.image || "").endsWith("/assets/og-betternotch-2.0.png")) fail("index.html: JSON-LD image must be the shared 2.0 OG file");
  } catch (error) {
    fail(`index.html: invalid JSON-LD (${error.message})`);
  }
}

requireMatch(support, /macOS 26/, "support/index.html: macOS 26 requirement is missing");
requireMatch(support, /Turn on Launch at Login\.|打开“登录时启动”开关。/, "support/index.html: Launch at Login must tell people to turn the Settings switch on");
requireMatch(support, /Click Settings at the top right of the main window/, "support/index.html: Launch at Login must start from the in-window Settings control");
requireMatch(support, new RegExp(`href="mailto:${supportEmail}"`), "support/index.html: support email link mismatch");
requireMatch(support, /class="document-nav"[\s\S]*?href="#before-starting"[\s\S]*?href="#contact-support"/, "support/index.html: support task navigation is incomplete");
forbidMatch(support, /Studio|available-version|Next update preview/, "support/index.html: retired 1.0/Studio support copy must stay removed");
forbidMatch(support, /betternotch-icon-128\.avif/, "support/index.html: brand mark must stay the alpha PNG");

requireMatch(privacy, /BetterNotch Mac app does not collect/, "privacy/index.html: collection sentence must name the Mac app");
requireMatch(privacy, /BetterNotch Mac App 不收集/, "privacy/index.html: Chinese collection sentence must name the Mac App");
requireMatch(privacy, /github-general-privacy-statement/, "privacy/index.html: GitHub Pages disclosure link is missing");
requireMatch(privacy, /This site does not add analytics, advertising, tracking pixels, or third-party scripts\./, "privacy/index.html: website tracking disclosure is missing");
requireMatch(privacy, new RegExp(`href="mailto:${supportEmail}"`), "privacy/index.html: privacy email link mismatch");
requireMatch(privacy, /class="document-nav"[\s\S]*?href="#collection"[\s\S]*?href="#contact"/, "privacy/index.html: policy navigation is incomplete");
forbidMatch(privacy, /Studio|welcome storage|preview backdrop/i, "privacy/index.html: retired Studio/welcome storage copy must stay removed");
forbidMatch(privacy, /betternotch-icon-128\.avif/, "privacy/index.html: brand mark must stay the alpha PNG");

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
const generateScript = await readFile(path.join(repoDir, "scripts/generate-image-derivatives.sh"), "utf8");
forbidMatch(generateScript, /betternotch-icon-128\.avif|window-(?:en|zh)-web\.png|details-(?:blend|glass)-/, "scripts/generate-image-derivatives.sh: AVIF must not be generated for alpha icon, window, or detail panels");
const gitignore = await readFile(path.join(repoDir, ".gitignore"), "utf8");
requireMatch(gitignore, /^_site\/$/m, ".gitignore: generated Pages artifact must remain untracked");
requireMatch(gitignore, /^\.preview\/$/m, ".gitignore: local preview artifacts must remain untracked");

for (const relativePath of privateFiles) {
  if (allowlist.has(relativePath)) fail(`Private file is on the deployment allowlist: ${relativePath}`);
}

const references = await referencedFiles();
for (const reference of references) {
  if (reference.endsWith(".html") || reference === "robots.txt" || reference === "sitemap.xml") continue;
  await assertFile(reference);
  if (!allowlist.has(reference)) fail(`Page or script displays ${reference}, but it is missing from the deployment allowlist`);
}

for (const relativePath of publicFiles) await assertFile(relativePath);

try {
  await access(outputDir);
  for (const reference of references) {
    if (!allowlist.has(reference)) continue;
    try {
      await access(path.join(outputDir, reference));
    } catch {
      fail(`_site is missing referenced public file: ${reference}`);
    }
  }
  for (const relativePath of privateFiles) {
    try {
      await access(path.join(outputDir, relativePath));
      fail(`_site must not publish ${relativePath}`);
    } catch {
      // Expected: private paths stay out of the Pages artifact.
    }
  }
} catch {
  // CI runs the contract before packaging; absence of _site is not a failure.
}

try {
  const og = await readFile(path.join(repoDir, approvedShareImage));
  const size = pngSize(og);
  if (!size || size.width !== 1200 || size.height !== 630) {
    fail(`${approvedShareImage}: expected 1200×630 PNG, found ${size ? `${size.width}×${size.height}` : "an invalid file"}`);
  }
} catch {
  fail(`Missing file: ${approvedShareImage}`);
}

for (const [relativePath, maximumBytes] of imageBudgets) {
  try {
    const fileStats = await stat(path.join(repoDir, relativePath));
    if (fileStats.size > maximumBytes) fail(`${relativePath}: ${fileStats.size} bytes exceeds ${maximumBytes}-byte budget`);
  } catch {
    fail(`Missing file: ${relativePath}`);
  }
}

if (failures.length > 0) {
  console.error(`Site checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site checks passed: ${pages.length} pages, bilingual parity, 2.0 metadata, locale assets, allowlist, and image budgets.`);
