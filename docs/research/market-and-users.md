# Market & user research (2026-10-03)

> Method: desk research via web search. Direct fetches of fragrantica.com, parfumo.com, basenotes.com, reddit.com and the
> app stores were blocked from our research environment, so evidence comes from indexed excerpts of forum threads, store
> listings and articles. Reddit itself was reached through secondary analyses (e.g. Barefaced's analysis of 5,600+ r/fragrance
> comments) and the same questions recurring on the Fragrantica/Parfumo/Basenotes boards. **E** = evidence, **I** = interpretation.
> Spot-check key quotes before using them publicly.

## Fragrantica — the reference book with ads in it
- **E** ~40M monthly visits; filters by note/season/longevity, crowdsourced sillage & similarity votes; "five ads per page" yet "the most trusted, most engaged-with" site (detaildigest.substack.com/p/fragrantica). Glossy: "the de facto internet perfume archive".
- **E** Basenotes members use Fragrantica "for the directory" and Basenotes for discussion (basenotes.com/threads/other-perfume-sites.544157).
- **Indispensable:** include/exclude note search (board #145105, #160736); accord sliders; Aug-2026 relaunch added saved searches (#352395); main-accords bars ("a better representation of what to expect than the note pyramid", osmetheca.be guide); "reminds me of" lists; Have/Had/Want shelves + SOTD calendar.
- **Data-quality complaints:** pyramids are "a hodgepodge of manufacturer's literature and reader's votes" (basenotes #461055); vote brigading ("oud notes voted into negative", board pid 7658233); **performance votes ignore reformulation** ("beasts in the past… now a 2-hour skin scent"; users asked for last-12-month votes, #264485); note search matches text in reviews (#340418); AI-written articles and AI pros/cons that flatten divided opinion.
- **Ads/mobile:** "15 pop ups" in one thread; "ads set to load before content"; pages "force ads in and reload… scroll around to find the place you were"; video ads; malware-like redirects (Trustpilot ~1.8★); Android app is a web wrapper at 2.6★ ("full screen ads cover content"); 429 rate limits after ~5 pages; redesign churn ("everytime I log on, the website looks different"). Users offer to pay $5–10/mo for no ads.
- **Trust:** opaque bans/deletions; Parfumo's 26-page "EXILED" thread of defectors; TikTok creators urging switches. **I:** neutral, transparent moderation is a competitive opening.

## Parfumo — structure people love, UI people tolerate
- **E** Split ratings (scent / longevity / sillage / bottle / value); "great charts… convenient for at-a-glance browsing"; best visual bottle shelf; notes "more precise"; minis/samples pages; app 4.6★ with wear calendar, most-worn stats, layering, no ads.
- **Weaknesses:** "extremely unwieldy and unnecessarily complex"; wishlist "somewhat hidden"; inconsistent collection categories ("so many samples I lost overview"); German→English split community; "verbose and flowery" reviews; app save failures; **no import from Fragrantica** ("took several days and was exhausting").

## Basenotes — expertise, slow database
- **E** 25 years of forums, beloved SOTD and batch-code threads; reviewers seen as "better informed". Directory ~20k; months-long submission approvals; error reporting still "Planned"; weak indie coverage.

## Wikiparfum (Puig + Fragrances of the World)
- **E** ~22k perfumes, 1,400 ingredients, seven search modes (notes, descriptors, textures, moods, seasons, colours, origin); ingredient-photo "scent visualizer"; EAN scanner. iOS app ~2★ (buggy). **I:** great teaching layer; no community data; brand-group ownership raises neutrality questions.

## Beginners (r/fragrance via secondary sources)
- Blind buying is the #1 topic (Barefaced); standard advice: sample first.
- Notes ≠ what you smell ("notes describe ingredients, not proportions"); climate and skin change everything.
- EDT/EDP/Parfum are often different formulas, not just strengths.
- Sillage vs projection confusion; "performance" used loosely.
- Clones/dupes are a huge market (Lattafa reportedly Fragrantica's most-rated brand).
- Batches/reformulations matter to enthusiasts (separate batch-code apps exist).

## Collectors
- They rebuild these fields in spreadsheets/Notion (paid templates exist): status, house, concentration, **format** (bottle / decant / sample / mini / travel), mL, fill level, batch code & date, price, source, storage, rating, wear log, to-sniff list.
- Samples are a *workflow* ("a week per sample", then a "free to wear" box).

## Newer products
Fraghab (decant mL countdown, spray map, heatmap, cost per wear, CSV), Fragplace (one-click Fragrantica import), Parfumo app, Sniff (lost collections, slow), Perfumist (3.4★, crashes), Fragella (API, tiny base), ScentShelf/Kaori/Aromoshelf/iPerfume (solo trackers, no shared database), Scentbird (billing complaints), Notino finder ("little better than random"), Scent Grail (calculators, editorial).
**I:** the 2025–26 wave proves demand for wear diaries; nobody combines Fragrantica-scale data + community + modern tracker usability.

## Ranked product implications → what we built
| # | Users need | Evidence | Our response |
|---|---|---|---|
| 1 | Fast, layout-stable, ad-light mobile | pop-ups, layout jumps, 2.6★ wrapper | No ads in MVP; reserved, labelled slots only in architecture; CLS budget |
| 2 | Include/exclude note search on *structured* data, saved searches | most praised tool; "broken" today | Discover filters: include / exclude / "strongly perceived" / officially listed; URL-encoded state = shareable saved search |
| 3 | Notes with provenance, official vs perceived separated | "hodgepodge" pyramids | **Listed vs. Smelled** module; source chips; per-claim provenance |
| 4 | Performance votes that respect time / batch | reformulation complaints | Votes timestamped + optional bottle year; "last 12 months" toggle |
| 5 | Anti-manipulation & visible moderation | brigading, opaque bans | account-age weighting hook, public change log, report flow |
| 6 | Collection model with format, mL, batch, price, source | spreadsheets | `collection_items` carries format, size_ml, fill, batch_code, price, source |
| 7 | One-tap wear logging with layering, calendar, cost per wear | Parfumo, Fraghab | Wear diary: multi-fragrance wears, calendar, most/least worn, "not worn in N days" |
| 8 | Import/export | switching cost | CSV export now; import architecture documented |
| 9 | Blind-buy decision support | #1 Reddit topic | **"How divisive?"** rating spread + sample-size honesty + "sample first" nudge |
| 10 | Structured, voted similarity | "reminds me of" is core but noisy | Similarity = notes + fingerprint + votes; directional ("fresher", "cheaper"); never auto-labelled "clone" |
| 11 | Inline term explanations | recurring confusion | `<Term>` popovers everywhere + /learn |
| 12 | Split ratings | Parfumo preference | Overall / Scent / Performance / Value / Originality, separate from factual observations |
| 13 | Fast, open contribution | months-long queues | /contribute with source URL + evidence, moderation queue, duplicate detection |
| 14 | Sample-testing workflow | "lost overview" | statuses: want to sample → testing → sampled → own |
| 15 | Ingredient teaching layer | Wikiparfum concept | Note pages as destinations |
