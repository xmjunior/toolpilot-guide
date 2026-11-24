# ToolPilot money-page engine

Purpose: scale commercial SEO pages from verified structured data without hand-copying HTML.

## Workflow
1. Verify pricing, limits, official URLs and affiliate conditions from primary sources.
2. Update `data/newsletter-platforms-2026.json`.
3. Run `node scripts/generate-money-pages.mjs`.
4. Review every generated page before publishing.
5. Update sitemap and submit changed URLs to IndexNow/Search Console.

## Scaling rule
Adding N platforms creates N×(N−1)/2 direct pairwise comparisons plus one pricing and one alternatives page per platform. Do not publish a generated page when it lacks a distinct user decision, verified data, or meaningful value.

This generator is intentionally NOT wired to automatic deployment. Human/agent review remains the quality gate.
