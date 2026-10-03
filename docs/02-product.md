# Product definition

## The one sentence

Make fragrance easier to understand without making it less deep: a beginner reads a fragrance in ten seconds, an
enthusiast spends twenty minutes on the same page, and both can see where every fact came from.

## Who it is for, and what each gets first

| Person | First screen answers | Where they go next |
|---|---|---|
| Buying a first bottle | What does it smell like, how strong, how long, when, roughly what it costs, what it is comparable to | the Trail, "When to wear it", similar fragrances, the glossary popovers |
| Enthusiast with a shelf | the same, plus listed vs smelled, performance distributions with sample sizes | votes, reviews, compare, the shelf and the wear diary |
| Collector | format, size, fill, batch and price per bottle; what the shelf is weighted toward | shelf insights, CSV export, lists |
| Reviewer | quick take or full review, focus tags, ownership and gifted disclosure | helpful votes, replies, their profile |
| Someone researching a note | what it smells like, where it comes from, what it contributes, where it is listed and where people smell it | the fragrances where it is prominent |

Progressive disclosure, not two sites: every page opens with the plain-language read and keeps the data underneath;
terms explain themselves on tap; nothing is hidden behind a "beginner mode".

## Information architecture

```
/                       editorial home: intelligent search, feature, feelings, trending, seasonal, note of the week, newest, lists, glossary
/discover               search and filters (notes include/exclude, listed vs perceived, character, season, weather, occasion, longevity, projection, price, house, concentration, decade, rating, availability); natural-language queries parsed into the same filters
/fragrance/[slug]       the detail page (below)
/fragrance/[slug]/review  the review composer
/compare?f=a,b,c        2 to 4 side by side
/notes, /notes/[slug]   the note encyclopaedia
/house/[slug], /perfumer/[slug]
/learn, /learn/[slug]   the glossary
/shelf                  your collection (own, owned before, want, want to sample, sampled, testing, favourites) with insights and export
/diary                  wear diary: log a wear (sprays, weather, occasion, note, layering), calendar, patterns
/u/[handle], /u/[handle]/shelf   public profile and shelf; private profiles stay private
/lists, /lists/[handle]/[slug]   user lists
/sign-in, /sign-up, /contribute, /admin
/about/data, /about/moderation, /about/ads
```

### The fragrance page, top to bottom

1. **Bottle stage**: the object, large, with cap-lift and spray on "Explore the scent"; 3D where a model exists.
2. **Identity**: house, name, concentration, year, perfumer, status; score with its sample size; collection controls.
3. **Ten-second read**: what it smells like in one sentence, the Trail, lasts / projection / best for / when / price /
   comparable to.
4. **How it moves**: the Trail chart (time × projection × character) and the journey (opening, heart, drydown) with
   listed notes and what people notice in each phase.
5. **Listed vs smelled**: the house's note list with its source beside what people actually smell, with votes.
6. **How it wears**: longevity distribution, projection over time, seasons, day/night, weather, occasions, all with
   sample sizes.
7. **Ratings**: overall plus scent, performance, value, originality, kept apart; divisiveness only when it is real.
8. **Reviews**: quick takes and full reviews, sort and filters, helpful votes, replies, gifted disclosure.
9. **If you like this**: similar, cheaper, rated higher, fresher, sweeter, darker, stronger, quieter; never "clones".
10. **Details and sources**: the facts and where each one came from.

On phones the same order holds, the bottle shares the first screen with the name and the read, and a contextual
bottom bar carries shelf, wear, rate, "I smell…" and the section list.

## Feature hierarchy (what was built first, and why)

1. The database, provenance and the read model: everything else depends on sourced data.
2. The fragrance page and the Trail: the page people land on from search, and the product's signature.
3. Search and discovery: the brief's "major advantage"; natural-language queries parse into shareable URL filters.
4. Collections and the diary: the retention loops.
5. Community votes (perceived notes, performance, wearability, character, similarity) and reviews.
6. Compare, lists, profiles, following.
7. Contribution and moderation: the queue, duplicate detection, change history, reports.

## What the prototype deliberately does not do yet

- No monetisation (room is left: affiliate offers table, disclosed partner labels, an ads policy page).
- No external search service; Postgres full-text search and trigrams are enough for the catalogue size.
- No invented reviews; the review surfaces are designed empty, single and many, and filled by real people.
- No scraped data anywhere; the catalogue is editorial with provenance and awaits verification against house pages.
