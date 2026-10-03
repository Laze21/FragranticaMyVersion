# Data sourcing & legal constraints (research notes, 2026-10-03)

> Preliminary desk research, **not legal advice**. Several competitor pages could not be fetched directly
> from our research environment; quotes marked "excerpt" came from search-engine snippets and must be
> re-checked against the live page before relying on them.

## Competitor terms
- **Fragrantica ToS** (https://www.fragrantica.com/terms-of-service.phtml, excerpt): no access "through Automated Means,
  including scraping, crawling, or harvesting" without written permission; no querying endpoints "to extract Content,
  build datasets, or power another service"; content is "for personal, non-commercial consumer use only".
  A Jan 2026 update (excerpt) adds a ban on using content to train/evaluate AI systems or build embedding indices.
  No public API exists. Moderators have threatened legal action over copying (https://www.fragrantica.com/board/viewtopic.php?id=270376).
- **Basenotes** terms reserve all rights in site content (https://basenotes.com/legal/terms/).
- **Parfumo** terms not retrievable in research; it is a German company, so the **EU sui generis database right** applies regardless.
- Unofficial Fragrantica scrapers/APIs exist (Apify actors, ScrapingBee, Bright Data, PerfumAPI on GitHub). Using them = contract
  breach + EU database-right exposure + an unstable dependency. **Decision: never.**

## Datasets
| Source | What it gives | License | Verdict |
|---|---|---|---|
| Wikidata (Q131746 "perfume", P14539 "perfumer") | brands, perfumers, parent companies, inception dates, stable IDs | CC0 | **Use** for brand/perfumer seed + canonical IDs. Do *not* follow its external-ID properties to copy target sites. |
| Wikimedia Commons | some bottle/house photos | per-file (CC0/BY/BY-SA) | Use per-file with attribution metadata |
| Open Beauty Facts (Perfumes category) | GTIN barcodes, INCI lists, pack photos (mass market) | ODbL (db), DbCL (contents), CC BY-SA (images) | **Use in an isolated table** (share-alike leakage risk). No pyramids/perfumers. |
| PubChem | aroma molecules: structures, CAS, synonyms | largely public domain | Use for ingredient pages; write our own odour descriptions |
| IFRA Transparency List (3,691 ingredients) + IFRA Standards | ingredient vocabulary, restrictions | public; confirm reuse terms | Reference list |
| Good Scents Company | odour descriptions | all rights reserved | **Do not copy** |
| Fragrances of the World (Michael Edwards) | 63k+ curated records, Fragrance Wheel, pyramids, perfumers | commercial B2B license | Most credible licensable editorial source |
| Fragella API | 80k+ records incl. accords, longevity votes | commercial; origin undisclosed | Only with written provenance warranty + indemnity |
| FragDB, Fragrantica-derived Kaggle sets | Fragrantica content | "commercial"/"CC BY-NC-SA" labels can't cure scraping origin | **Treat as tainted. Never import.** |
| Affiliate feeds (Awin, CJ, Rakuten: Sephora, FragranceNet; Notino) | SKU, GTIN, size, price, retailer image & copy | program-scoped | Use for prices / where-to-buy only; feed images are **offer-scoped**, not canonical |

## Law that shapes the design
- **Facts are not copyrightable** (Feist, US) but the **EU database right** protects substantial extraction from a database built with substantial investment (CV-Online; Ryanair C-30/14 lets sites restrict extraction contractually). "Bergamot is a top note of X" is a fact; copying 100k pyramids is extraction.
- **Images:** re-hosting someone else's image infringes (Renckhoff, EU 2018); hotlinking is unstable and risky. Use owned, licensed, brand-granted or contributor-licensed images only.
- **Press images** are typically "editorial use only" → get written brand permission for catalogue display.
- **Community photos:** contributor grants a non-exclusive license (optionally CC BY/BY-SA), attests ownership; notice-and-takedown (DMCA / EU DSA).

## Provenance model (adopted)
Field-level claims, not per-record. Every important claim carries: `source_type` (official_brand, licensed_database,
editorial, community, public_dataset, retailer_feed), `source_url`, `license`, `share_alike`, `display_scope`
(public / internal / offer_only), `verified_at`, `verified_by`, `confidence`, `submitted_by`, `status`, `supersedes_id`, evidence.
Resolution order: official_brand → editorial → licensed_database → community consensus → public_dataset.
Being able to delete everything from one source (takedown) is a requirement, not a nice-to-have.

## Roadmap (summary)
0. Provenance schema, contributor license, takedown process, written "no competitor data" policy. Seed brands/perfumers from Wikidata; molecules from PubChem; write our own note copy.
1. Affiliate feeds for SKU/GTIN/price; OBF barcodes into an isolated ODbL table; editorial team builds pyramids for top 1–2k fragrances **from primary sources only** (brand sites, press releases, packaging photos); community submissions with evidence.
2. "Claim your brand" portal for official notes + licensed press images (indie houses first); evaluate Fragrances of the World / Fragella with warranties. Native community voting becomes the moat.
3. License our community data outward; contribute non-proprietary facts back to Wikidata.

## Risks
Contamination by contributors bulk-pasting competitor pyramids (mitigate: attestation + duplicate/verbatim detection), vendor provenance,
ODbL leakage, image scope, implied brand endorsement in renders, thin coverage for niche houses (editorial cost), UGC liability, fast-moving EU law.
