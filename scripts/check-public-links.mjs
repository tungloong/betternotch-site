#!/usr/bin/env node

const siteBase = "https://tungloong.github.io/betternotch-site/";
const appId = "6791836457";
const checks = [
  {
    label: "homepage",
    url: siteBase,
    contentType: "text/html",
    bodyIncludes: 'class="promo-stack"',
  },
  {
    label: "Support URL",
    url: new URL("support/", siteBase).href,
    contentType: "text/html",
    bodyIncludes: "<title>Support — BetterNotch</title>",
  },
  {
    label: "Privacy URL",
    url: new URL("privacy/", siteBase).href,
    contentType: "text/html",
    bodyIncludes: "Privacy Policy",
  },
  {
    label: "social preview image",
    url: new URL("assets/og-betternotch-2.0.png", siteBase).href,
    contentType: "image/png",
  },
  {
    label: "responsive AVIF capture",
    url: new URL("assets/menubar-gradient-1392.avif", siteBase).href,
    contentType: "image/avif",
  },
  {
    label: "full-size gradient PNG",
    url: new URL("assets/menubar-gradient.png", siteBase).href,
    contentType: "image/png",
  },
  {
    label: "three-look promo capture",
    url: new URL("assets/promo-glass-ink.jpg", siteBase).href,
    contentType: "image/jpeg",
  },
  {
    label: "multi-display promo capture",
    url: new URL("assets/promo-external.jpg", siteBase).href,
    contentType: "image/jpeg",
  },
  {
    label: "sitemap",
    url: new URL("sitemap.xml", siteBase).href,
    contentType: "application/xml",
    bodyIncludes: "https://tungloong.github.io/betternotch-site/privacy/",
  },
  {
    label: "robots policy",
    url: new URL("robots.txt", siteBase).href,
    contentType: "text/plain",
    bodyIncludes: "Sitemap: https://tungloong.github.io/betternotch-site/sitemap.xml",
  },
  {
    label: "neutral App Store URL",
    url: `https://apps.apple.com/app/id${appId}?mt=12`,
    contentType: "text/html",
    finalUrl: (url) => url.hostname === "apps.apple.com" && url.pathname.includes(appId),
  },
  {
    label: "China App Store localization",
    url: `https://apps.apple.com/cn/app/id${appId}?mt=12`,
    contentType: "text/html",
    finalUrl: (url) => url.hostname === "apps.apple.com" && url.pathname.startsWith("/cn/") && url.pathname.includes(appId),
  },
  {
    label: "GitHub privacy statement",
    url: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
    contentType: "text/html",
  },
  {
    label: "source-only release checker stays private",
    url: new URL("scripts/check-site.mjs", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
  {
    label: "capture preparation script stays private",
    url: new URL("scripts/prepare-2.0-captures.swift", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
  {
    label: "repository documentation stays private",
    url: new URL("README.md", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
  {
    label: "local preview artifacts stay private",
    url: new URL(".preview/step4-qa.md", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
  {
    label: "historical 1.0 OG stays unpublished",
    url: new URL("assets/og-betternotch-1.0-en.png", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
  {
    label: "superseded app control capture stays private",
    url: new URL("assets/app-controls-en.png", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
  {
    label: "removed simulated glass script stays private",
    url: new URL("assets/liquid-glass.js", siteBase).href,
    expectedStatus: 404,
    contentType: "text/html",
  },
];

const attempts = 4;
const timeoutMilliseconds = 20_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function lintChecks() {
  const failures = [];
  const labels = new Set();

  for (const check of checks) {
    if (!check.label) failures.push("a check is missing a label");
    if (labels.has(check.label)) failures.push(`duplicate check label: ${check.label}`);
    labels.add(check.label);
    try {
      const url = new URL(check.url);
      if (check.label === "social preview image" && !url.pathname.endsWith("/assets/og-betternotch-2.0.png")) {
        failures.push("social preview image must point at og-betternotch-2.0.png");
      }
      if (check.label === "responsive AVIF capture" && !url.pathname.endsWith(".avif")) {
        failures.push("responsive AVIF capture must use an .avif URL");
      }
      if (check.expectedStatus === 404 && /og-betternotch-2\.0|menubar-gradient-1392/.test(url.pathname)) {
        failures.push(`${check.label}: a current public 2.0 asset is marked private`);
      }
    } catch (error) {
      failures.push(`${check.label}: invalid URL (${error.message})`);
    }
    if (!check.contentType) failures.push(`${check.label}: missing expected content type`);
  }

  if (!checks.some((check) => check.label === "historical 1.0 OG stays unpublished")) {
    failures.push("production 404 list must keep the unpublished 1.0 OG");
  }
  if (!checks.some((check) => check.url.includes("README.md") && check.expectedStatus === 404)) {
    failures.push("production 404 list must keep README unpublished");
  }

  if (failures.length > 0) {
    console.error(`Public link check list failed (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Public link check list is well-formed: ${checks.length} endpoints. Production fetch skipped.`);
}

if (process.argv.includes("--lint")) {
  lintChecks();
  process.exit(0);
}

async function fetchWithRetry(check) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(check.url, {
        headers: {
          "user-agent": "BetterNotch-site-link-check/1.0",
          accept: check.contentType.startsWith("image/") ? check.contentType : "text/html,application/xhtml+xml,application/xml,text/plain",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMilliseconds),
      });

      const expectedStatus = check.expectedStatus ?? 200;
      if (response.status !== expectedStatus) throw new Error(`expected HTTP ${expectedStatus}, received ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes(check.contentType)) {
        throw new Error(`expected ${check.contentType}, received ${contentType || "no content type"}`);
      }

      if (check.finalUrl && !check.finalUrl(new URL(response.url))) {
        throw new Error(`unexpected final URL ${response.url}`);
      }

      if (check.bodyIncludes) {
        const body = await response.text();
        if (!body.includes(check.bodyIncludes)) throw new Error(`response body does not contain ${JSON.stringify(check.bodyIncludes)}`);
      } else {
        await response.body?.cancel();
      }

      return { label: check.label, status: response.status, finalUrl: response.url };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(500 * (2 ** (attempt - 1)));
    }
  }

  throw new Error(`${check.label}: ${lastError?.message ?? lastError}`);
}

const results = [];
const failures = [];

for (const check of checks) {
  try {
    results.push(await fetchWithRetry(check));
  } catch (error) {
    failures.push(error.message);
  }
}

if (failures.length > 0) {
  console.error(`Public link checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const result of results) {
  const redirect = result.finalUrl === checks.find((check) => check.label === result.label)?.url ? "" : ` → ${result.finalUrl}`;
  console.log(`✓ ${result.label}: ${result.status}${redirect}`);
}

console.log(`Public link checks passed: ${results.length} endpoints.`);
