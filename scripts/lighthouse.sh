#!/usr/bin/env bash
# Lighthouse driver: enumerates pages from dist/sitemap.xml (if present) or
# falls back to discovering dist/**/*.html paths, then runs the median runner
# against each page rooted at BASE_URL (default http://localhost:8080).
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

if [ -f dist/sitemap.xml ]; then
  PAGES=$(grep -oE '<loc>[^<]+</loc>' dist/sitemap.xml \
    | sed -E 's|<loc>(.*)</loc>|\1|' \
    | sed -E 's|^https?://[^/]*||')
elif [ -d dist ]; then
  PAGES=$(find dist -name '*.html' \
    | sed 's|^dist||' \
    | sed -E 's|/index\.html$|/|')
else
  PAGES="/"
fi

mkdir -p lighthouse-reports

for path in $PAGES; do
  url="${BASE_URL}${path}"
  echo ""
  echo "─── Lighthouse: ${url} ───"
  node scripts/lighthouse-median.js "$url"
done
