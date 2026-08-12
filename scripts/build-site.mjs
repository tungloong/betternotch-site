#!/usr/bin/env node

import { cp, lstat, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoDir, "_site");
const publicFiles = [
  "index.html",
  "privacy/index.html",
  "robots.txt",
  "sitemap.xml",
  "support/index.html",
  "assets/betternotch-icon-128.avif",
  "assets/betternotch-icon-128.png",
  "assets/language.js",
  "assets/menubar-gradient-330.avif",
  "assets/menubar-gradient-396.avif",
  "assets/menubar-gradient-528.avif",
  "assets/menubar-gradient-web.png",
  "assets/menubar-original-330.avif",
  "assets/menubar-original-396.avif",
  "assets/menubar-original-528.avif",
  "assets/menubar-original-web.png",
  "assets/menubar-solid-black-330.avif",
  "assets/menubar-solid-black-396.avif",
  "assets/menubar-solid-black-528.avif",
  "assets/menubar-solid-black-web.png",
  "assets/og-betternotch-1.0-en.png",
  "assets/site.js",
  "assets/styles.css",
];

function normalize(reference, pageFile) {
  const cleanReference = reference.split(/[?#]/)[0];
  if (!cleanReference || /^(?:https?:|mailto:|#|data:)/.test(reference)) return null;
  const normalized = path
    .relative(repoDir, path.resolve(path.dirname(path.join(repoDir, pageFile)), cleanReference))
    .split(path.sep)
    .join("/");
  return cleanReference.endsWith("/") ? `${normalized ? `${normalized}/` : ""}index.html` : normalized;
}

async function referencedFiles() {
  const references = new Set();
  for (const pageFile of ["index.html", "support/index.html", "privacy/index.html"]) {
    const source = await readFile(path.join(repoDir, pageFile), "utf8");
    for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const normalized = normalize(match[1], pageFile);
      if (normalized && !normalized.endsWith("/")) references.add(normalized);
    }
    for (const match of source.matchAll(/\bsrcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(",")) {
        const normalized = normalize(candidate.trim().split(/\s+/)[0], pageFile);
        if (normalized) references.add(normalized);
      }
    }
  }
  return references;
}

if (process.argv.includes("--list")) {
  console.log(publicFiles.join("\n"));
  process.exit(0);
}

const allowlist = new Set(publicFiles);
for (const reference of await referencedFiles()) {
  if (!allowlist.has(reference)) throw new Error(`Referenced public file is missing from the deployment allowlist: ${reference}`);
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
