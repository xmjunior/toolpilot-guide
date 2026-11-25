# ToolPilot money-page engine

Purpose: scale commercial SEO pages from verified structured data without hand-copying HTML **without overwriting curated pages or publishing low-value combinations by accident**.

## Workflow
1. Verify pricing, limits, official URLs and affiliate conditions from primary sources.
2. Update `data/newsletter-platforms-2026.json`.
3. Add only explicitly approved page targets under `data.generate`.
4. Run `node scripts/generate-money-pages.mjs`.
5. The generator creates or refreshes only pages marked as generated. Existing curated pages are skipped by default.
6. Run `node scripts/validate-site.mjs` and `node --test tests/*.test.cjs`.
7. Review the diff before publishing.
8. Deploy and let the production smoke verify that Render serves the exact current files.
9. IndexNow then submits the current live sitemap.

## Safety rules
- Existing curated pages are never overwritten unless `--overwrite-curated` is passed deliberately.
- Affiliate URLs are emitted with `rel="sponsored"`, `data-affiliate` and first-party tracking.
- Adding a platform does **not** automatically create every possible comparison.
- Generated pages carry `<!-- generated-by: toolpilot-money-engine -->`.
- The site validator blocks broken internal links, canonical/sitemap regressions, unapproved affiliate hosts and stale Black Friday copy.

## Scaling rule
Page count follows **approved buyer decisions**, not combinatorics. A new comparison is added only when it has a distinct query/decision, verified data and a realistic route to affiliate revenue or distribution.
