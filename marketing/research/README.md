# 2GIS market research — methodology and status

Produced 2026-08-13/14 in a separate Claude session working out of the `yera47/DUKENIM` repository. Added here to satisfy the evidence rule in `marketing/CONTEXT.md` ("2GIS market-count claims are not considered verified until the source CSVs and methodology are present in this repository and audited").

## What this is

Counts of unique organizations (`org_count`, computed server-side by 2GIS via `/2.0/catalog/rubric/*`, not client-side deduplication) across 15 Kazakhstan cities × 14 retail categories relevant to Dukenim's target sellers (clothing, footwear, cosmetics, jewelry, children's goods, sportswear, home textiles, gifts/souvenirs, flowers, custom cakes, furniture, pet goods, auto parts, building materials).

## Files

- `dukenim_2gis_raw_counts.csv` — full city × category table.
- `dukenim_2gis_city_ranking.csv` — cities ranked by total organizations across all categories, with per-category breakdown.
- `dukenim_main_cities.csv` — top-5 cities (Almaty, Astana, Shymkent, Karaganda, Aktau) detailed.

## Headline numbers

- Top-5 cities: 57,899 organizations. All 15 cities: 91,200.
- Leading category: clothing (24,854, 27% of the total). Then children's goods (12,787), furniture (8,433).
- Top-3 cities (Almaty/Astana/Shymkent) = 52% of the total market.

## What is NOT yet done — audit before relying on this for sizing decisions

- **No chain exclusion.** Known chains (H&M, Zara, Sportmaster, etc.) are still counted — these are not real Dukenim prospects.
- **No "already has a website" exclusion.** A business with its own site is a weaker prospect; not filtered out.
- Both exclusions require the 2GIS `/3.0/items` endpoint with a `has_site` filter and per-org name matching against a chain list. As of this write-up, that endpoint returns `apiKeyIsBlocked` on the key used (the `/2.0/catalog/*` reference endpoints still work — the block is endpoint-specific, not account-wide). Contact api@2gis.ru referencing this specific error before re-running.
- For multi-rubric categories (e.g. "clothing" = sum of women's + men's + children's clothing rubrics), the raw count may include a small amount of double-counting where one business is tagged under more than one sub-rubric. Flagged, not corrected.

## Recommendation

Treat these as directionally correct city/category size ordering (useful for prioritizing which cities to launch in first), not as an exact addressable-market count, until the chain/website exclusion pass is completed.
