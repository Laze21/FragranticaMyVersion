# Research

Three research notes were written before design decisions were taken. They are kept verbatim under `docs/research/`:

- `market-and-users.md`: what people use Fragrantica, Parfumo and Basenotes for, what they complain about (ads,
  mobile, note pyramids read as recipes, review walls, no provenance), what beginners find confusing and what
  collectors need, and the fifteen product implications that shaped the feature set.
- `data-and-legal.md`: competitor terms (no scraping, no unofficial APIs), usable open sources (Wikidata, Wikimedia
  Commons, Open Beauty Facts in isolation, PubChem, IFRA), licensable editorial databases, the law that shapes the
  design (EU database right, image re-hosting), the adopted field-level provenance model and the sourcing roadmap.
- `naming-and-ai-tells.md`: two rounds of naming conflict screens and the catalogue of "AI-made" interface tells the
  design system was written against.

How the research became decisions:

| Finding | Decision in the product |
|---|---|
| Users return to competitors for the database and the notes, and leave because of ads, clutter and a mobile site that is a shrunk desktop | Database first; no ads in the layout; phones designed separately (tab bar, sheets, contextual actions) |
| Note pyramids are read as literal recipes; perceived notes differ from listed notes | "Listed by the house" and "What people smell" are separate tables, separately sourced, shown side by side with sample sizes |
| Longevity and sillage as x/5 scores are distrusted | Distributions in hours and plain projection words, with the number of reports |
| Review sections are unstructured walls | Quick takes vs full reviews, focus tags, ownership and gifted disclosure, filters, no invented reviews |
| Nobody shows where a fact came from | Provenance on every claim, visible on the page and on `/about/data` |
| Scraping a competitor is a contract breach and an EU database-right exposure | Real catalogue written from editorial research with per-claim provenance; a photo pipeline that only accepts licensed images; illustrations labelled as such |
| "AI-made" tells: purple gradients, glass cards, identical sections, hover zoom, Inter, triplet copy | The design system in `docs/04-design-system.md` and the vibe-code audit in the plan's "do not do" list |
