#!/usr/bin/env node

const siteBase = "https://tungloong.github.io/betternotch-site/";
const appId = "6791836457";
const checks = [
  {
    label: "homepage",
    url: siteBase,
    contentType: "text/html",
    bodyIncludes: "BetterNotch",
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
    url: new URL("assets/og-betternotch-1.0-en.png", siteBase).href,
    contentType: "image/png",
  },
  {
    label: "responsive AVIF capture",
    url: new URL("assets/menubar-gradient-528.avif", siteBase).href,
    contentType: "image/avif",
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
];

const attempts = 4;
const timeoutMilliseconds = 20_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
