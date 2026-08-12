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
const appStoreUrl = "https://apps.apple.com/app/id6791836457?mt=12";
const approvedShareImage = "assets/og-betternotch-1.0-en.png";
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
  requireMatch(source, /styles\.css\?v=20260812-4/, `${page.file}: stale stylesheet cache key`);
  requireMatch(source, /language\.js\?v=20260812-2/, `${page.file}: stale language script cache key`);
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
    "og:image:width",
    "og:image:height",
    "og:image:alt",
  ]) {
    requireMatch(source, new RegExp(`<meta property="${property.replace(":", "\\:")}"`), `${page.file}: missing ${property}`);
  }

  for (const property of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
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

const languageScript = await readFile(path.join(repoDir, "assets/language.js"), "utf8");
requireMatch(languageScript, /classList\.remove\("no-js"\)/, "assets/language.js: no-JavaScript class is not removed on initialization");
requireMatch(languageScript, /classList\.add\("js"\)/, "assets/language.js: JavaScript-ready class is not added on initialization");
requireMatch(languageScript, /button\.disabled = false/, "assets/language.js: language controls are not enabled after initialization");

const siteScript = await readFile(path.join(repoDir, "assets/site.js"), "utf8");
requireMatch(siteScript, /cycleButton\.disabled = false/, "assets/site.js: notch control is not enabled after initialization");
requireMatch(siteScript, /effectStage\?\.setAttribute\("role", "tabpanel"\)/, "assets/site.js: interactive tabpanel semantics are not enabled after initialization");

const styles = await readFile(path.join(repoDir, "assets/styles.css"), "utf8");
for (const requirement of [
  [/@media \(max-width: 360px\)/, "320px resilience breakpoint"],
  [/@media \(prefers-reduced-motion: reduce\)/, "reduced-motion support"],
  [/@media \(prefers-contrast: more\)/, "higher-contrast support"],
  [/@media \(forced-colors: active\)/, "forced-colors support"],
  [/\.no-js \.notch-control/, "no-JavaScript inert control styling"],
  [/\.button:hover,[\s\S]*?transform: none;/, "reduced-motion transform removal"],
]) requireMatch(styles, requirement[0], `assets/styles.css: missing ${requirement[1]}`);

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

const privacy = await readFile(path.join(repoDir, "privacy/index.html"), "utf8");
requireMatch(privacy, /Effective August 12, 2026/, "privacy/index.html: effective date mismatch");
requireMatch(privacy, /github-general-privacy-statement/, "privacy/index.html: GitHub Pages disclosure link is missing");
requireMatch(privacy, /BetterNotch does not add analytics, advertising, tracking pixels, or third-party scripts to the site\./, "privacy/index.html: website tracking disclosure is missing");

const robots = await readFile(path.join(repoDir, "robots.txt"), "utf8");
requireMatch(robots, /User-agent: \*\nAllow: \/\n/, "robots.txt: crawl policy mismatch");
requireMatch(robots, /Sitemap: https:\/\/tungloong\.github\.io\/betternotch-site\/sitemap\.xml/, "robots.txt: sitemap URL mismatch");

const sitemap = await readFile(path.join(repoDir, "sitemap.xml"), "utf8");
for (const page of pages) requireMatch(sitemap, new RegExp(`<loc>${page.canonical.replaceAll("/", "\\/")}<\\/loc>`), `sitemap.xml: missing ${page.canonical}`);

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
