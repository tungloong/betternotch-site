#!/usr/bin/env node

import { cp, lstat, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoDir, "_site");
export const publicFiles = [
  "index.html",
  "privacy/index.html",
  "robots.txt",
  "sitemap.xml",
  "support/index.html",
  "assets/betternotch-icon-128.png",
  "assets/details-blend-en-web.png",
  "assets/details-blend-en.png",
  "assets/details-blend-zh-web.png",
  "assets/details-blend-zh.png",
  "assets/details-glass-en-web.png",
  "assets/details-glass-en.png",
  "assets/details-glass-zh-web.png",
  "assets/details-glass-zh.png",
  "assets/language.js",
  "assets/menubar-glass-ink-1392.avif",
  "assets/menubar-glass-ink-464.avif",
  "assets/menubar-glass-ink-928.avif",
  "assets/menubar-glass-ink-web.png",
  "assets/menubar-glass-ink.png",
  "assets/menubar-gradient-1392.avif",
  "assets/menubar-gradient-696.avif",
  "assets/menubar-gradient-928.avif",
  "assets/menubar-gradient-web.png",
  "assets/menubar-gradient.png",
  "assets/menubar-ink-1392.avif",
  "assets/menubar-ink-464.avif",
  "assets/menubar-ink-928.avif",
  "assets/menubar-ink-web.png",
  "assets/menubar-ink.png",
  "assets/og-betternotch-2.0.png",
  "assets/site.js",
  "assets/promo-scenes.css",
  "assets/promo-original.jpg",
  "assets/promo-gradient.jpg",
  "assets/promo-glass-ink.jpg",
  "assets/promo-external.jpg",
  "assets/promo-builtin.jpg",
  "assets/promo-sidecar.jpg",

  "assets/styles.css",
  "assets/window-en-web.png",
  "assets/window-en.png",
  "assets/window-zh-web.png",
  "assets/window-zh.png",
];

const pageFiles = ["index.html", "support/index.html", "privacy/index.html"];
const assetAttributePattern =
  /\b(?:href|src|srcset|data-src-en|data-src-zh|data-srcset-en|data-srcset-zh|data-href-en|data-href-zh)="([^"]+)"/g;
const scriptAssetPattern = /assets\/[A-Za-z0-9._-]+\.(?:png|avif|jpe?g|webp|svg|css|js)/g;

export function normalize(reference, pageFile) {
  const cleanReference = reference.split(/[?#]/)[0];
  if (!cleanReference || /^(?:https?:|mailto:|#|data:)/.test(reference)) return null;
  const normalized = path
    .relative(repoDir, path.resolve(path.dirname(path.join(repoDir, pageFile)), cleanReference))
    .split(path.sep)
    .join("/");
  return cleanReference.endsWith("/") ? `${normalized ? `${normalized}/` : ""}index.html` : normalized;
}

function collectFromValue(value, pageFile, references) {
  if (!value) return;
  for (const candidate of value.split(",")) {
    const normalized = normalize(candidate.trim().split(/\s+/)[0], pageFile);
    if (normalized) references.add(normalized);
  }
}

export async function referencedFiles() {
  const references = new Set();
  for (const pageFile of pageFiles) {
    const source = await readFile(path.join(repoDir, pageFile), "utf8");
    for (const match of source.matchAll(assetAttributePattern)) {
      collectFromValue(match[1], pageFile, references);
    }
  }
  const siteScript = await readFile(path.join(repoDir, "assets/site.js"), "utf8");
  for (const match of siteScript.matchAll(scriptAssetPattern)) {
    references.add(match[0]);
  }
  return references;
}

export async function buildSite() {
  const allowlist = new Set(publicFiles);
  for (const reference of await referencedFiles()) {
    if (!allowlist.has(reference)) {
      throw new Error(`Referenced public file is missing from the deployment allowlist: ${reference}`);
    }
  }

  await rm(outputDir, { recursive: true, force: true });
  for (const relativePath of publicFiles) {
    const sourcePath = path.join(repoDir, relativePath);
    const destinationPath = path.join(outputDir, relativePath);
    const sourceLinkStats = await lstat(sourcePath);
    const sourceStats = await stat(sourcePath);
    if (sourceLinkStats.isSymbolicLink()) throw new Error(`Deployment entry must not be a symbolic link: ${relativePath}`);
    if (!sourceStats.isFile()) throw new Error(`Deployment entry is not a regular file: ${relativePath}`);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath);
  }

  console.log(`Built _site with ${publicFiles.length} allowlisted public files.`);
}

const isDirectRun = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  if (process.argv.includes("--list")) {
    console.log(publicFiles.join("\n"));
    process.exit(0);
  }
  await buildSite();
}
