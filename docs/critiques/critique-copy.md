# Copy and voice critique

Lens: copy. Judged against brief section 16 (human, specific, confident, occasionally playful; no AI phrases; no over-explaining UI; few em dashes), with sections 10, 11, 23, 32 and 33 where they bear on wording.

Sources read: every `src/app/**/page.tsx`, the shell, fragrance, search, shelf, diary, review, vote-sheet and auth components, `lib/scent/read.ts`, `lib/search/interpret.ts`, `lib/search/feelings.ts`, `lib/data/shelf.ts`, `lib/data/similar.ts`, a sample of seed summaries, and the desktop screenshots for home, home-in, discover, discover-empty, frag-sauvage, note, house, perfumer, compare, learn, lists, signin, shelf, diary, profile, review, about-data (plus frag-sauvage-m).

## Overall verdict

The copy is the strongest layer of this prototype. It is already far from the AI register: zero em dashes in UI strings, no "elevate/seamless/journey", concrete sensory lines ("Pleasant at a desk, gone by the elevator"), and the vote questions are exactly the brief's examples made real. What is left is second-pass editing: one factual inversion on the trust page, build-process notes leaking into user-facing source names, a tagline in boilerplate form, a few verbal tics ("actually" nine times, "Thanks." on four toasts, "helps the next person" three times on one page), label inconsistencies between nav/filters/chips and the sections they point at, and a handful of generated strings that come out ungrammatical ("checked not yet", "1 different fragrance").

## Keep (must survive the redesign)

- Home H1 "What do you want to smell like?" with placeholder "Describe it, or type a name" and the five example queries.
- The "Explore by feeling" lines: "Fresh shirt, warm skin, a little soap." / "Pleasant at a desk, gone by the elevator." / "Dense things that bloom in a scarf." / "Expensive-smelling, never loud." / "Close enough to notice, not enough to announce."
- Fragrance section titles "How it moves", "Listed vs. smelled", "How long, how loud", "When to wear it", "If you like this", and the ledes "Ranges, not promises. Skin, climate and how many sprays you use all move these numbers." and "Enjoyment only. How long it lasts lives in its own section so a quiet beauty isn't punished twice."
- The vote questions: "What do you smell?", "How did it perform on you?", "How long could you smell it?", "In the first hour, who could smell it?", "And three hours later?", "When would you wear it?", "How does it read to you?", and the sheet lede "Pick what you notice, not what the box says."
- Projection scale with hints: Skin "only you, nose to wrist", Close "a hug away", Conversational, Arm's length, Room-filling "people know you arrived".
- Editorial voice in summaries and "Our take" (Sauvage: "it smells good and it smells everywhere"; Bleu: "It is not daring. It is very, very good at being liked.").
- Note page: "If you know Earl Grey tea, you already know bergamot." and "That's the gap between a marketing pyramid and a nose."
- Details: "Marketed to men. That's the house's positioning. Anyone can wear anything." and "The facts, and exactly where each one came from."
- Empty and error states: "Nothing matches all of that. Our catalogue is still small. Try loosening one thing:"; "A single score says more about the person than the perfume."; "3D view unavailable. The photo has everything."; 404 "The page evaporated, or it was never bottled."; error "It's us, not you. Your shelf and votes are safe."; offline notice.
- Shelf: "Your shelf, read back", "Due a wear", "Notes you keep coming back to", and the signed-out pitch "the stuff people keep in spreadsheets, without the spreadsheet."
- Diary: note placeholder "Lasted through dinner. Someone asked.", "On rainy days you reach for Sauvage most.", "Logged. Layering noted."
- Sign-up lede "Free. No ads in your face, no newsletter you didn't ask for." Ads page lede "How this place will pay for itself without becoming the thing everyone complains about."
- Mobile action bar "I smell…". Similar footnote "Close matches are not copies; skin decides."
- Footer blurb "A fragrance database you can read in ten seconds or study for an hour. Official notes and what people actually smell, kept apart and sourced." (this is the one place "actually" should live).
- Confidence labels "Too few votes to say / Early read / Taking shape / Settled" and divisiveness copy "People love it or really don't. Sample before buying a bottle."

## Findings (severity-ranked)

### 1. about/data: the headline number says the opposite of the truth (severity 3)
- Area: "The state of this prototype" paragraph, `src/app/about/data/page.tsx` line 51-53.
- Finding: the template is `${withUrl} of ${total} factual claims don't have a source link yet`, but `withUrl` counts claims that DO have a link. The screenshot renders "0 of 195 factual claims don't have a source link yet", i.e. "every claim is sourced", on the page whose whole purpose is to say they are not. The same paragraph also says "During this build the research environment could not open house websites", which is agent-process language, not something a product team writes to readers.
- Brief: §23 provenance, §32 "label demo data appropriately", §16 confident writing.
- Direction: compute `total - withUrl` and write it plainly. Replacement paragraph: "The fragrances are real. Launch years, perfumers, official notes and typical prices were compiled by our editors from widely published house information. None of the 195 factual claims has a source link yet. Each is marked 'editorial, not yet verified' with a confidence level, and each will be checked against the house's own page before launch." If the number is nonzero: "{n} of the {total} factual claims still have no source link."
- Effort: S

### 2. Source names carry internal QA notes (severity 2)
- Area: fragrance Details "Where this page's facts come from" and the about/data source table; seed `sources` entries such as "Dior (dior.com product page, to verify)", "Chanel (house site, not reachable)", "Our editorial research (unverified)", "Discount retailers (not reachable)", "press coverage (to verify)".
- Finding: the verification state is already a structured field (rendered as "not yet verified" / "checked Oct 2026" and a confidence word), so the parenthetical repeats it, and "not reachable" describes the build environment, not the source. A reader sees "Editorial · Dior (dior.com product page, to verify) · Medium confidence · not yet verified": three hedges for one fact.
- Brief: §23, §32, §16 "do not over-explain".
- Direction: source name is the source only: "Dior product page", "Chanel press coverage", "US retail price", "Editorial research". Keep the status in the status column. Where a note is needed, keep it in the existing `notes` aside ("Dior headlines Calabrian bergamot, Sichuan pepper and Ambroxan; the fuller pyramid is the retail breakdown.") and strip "to verify" from it, since the status already says so.
- Effort: S (seed find/replace plus the demo source names)

### 3. SourceBadge renders "· checked not yet" (severity 2)
- Area: `src/components/fragrance/SourceBadge.tsx` line 28, shown next to "Listed by the house" on every fragrance page.
- Finding: `· checked {fmtDate(claim.verifiedAt)}` with `fmtDate(null) = 'not yet'` produces "Editorial · checked not yet".
- Brief: §16 human writing.
- Direction: branch on null: "· not yet checked" when null, "· checked Oct 2026" otherwise. Inside the popover, "Last verified: not yet" → "Not verified yet".
- Effort: S

### 4. The prototype disclaimer is said three times per page (severity 2)
- Area: global. Demo banner (top), footer base line (bottom), DemoFlag chips inline.
- Finding: banner: "Prototype: real fragrances, but community figures are demo data and bottle images are illustrations." Footer: "Prototype. Fragrance facts are editorial research still being verified against house sources. Ratings, votes and member accounts are demo data. Bottle images are original illustrations, not product photos; brand names belong to their owners." Nearly the same sentence opens and closes every page, and the inline "Demo figures" chips already carry the point where it matters. Hedging first and last is the opposite of confident.
- Brief: §16 confident, concise; §32 label demo data (once is enough).
- Direction: banner to one clause: "Prototype: real fragrances, demo votes, illustrated bottles. How the data works". Footer base to the legal-only line: "Prototype. Facts are editorial and still being checked against house pages. Brand names belong to their owners." Keep DemoFlag as is.
- Effort: S

### 5. Tagline "Fragrance, understood." is boilerplate (severity 2)
- Area: `APP_TAGLINE` in `src/lib/config.ts`, used in the default `<title>` ("Wake: Fragrance, understood.") and OpenGraph.
- Finding: "Noun, past participle." is the agency/AI tagline template ("Design, simplified." "Banking, reimagined."). It is the only line on the site that sounds like a pitch deck, and it is the first thing search results show.
- Brief: §16 avoid "Reimagine the way you experience fragrance" and kin; §28 brand should be culturally memorable, not fake-luxury.
- Direction: use the product's own thesis, in its own voice: `APP_TAGLINE = 'What it actually smells like.'` (title becomes "Wake: What it actually smells like."). Alternative if "actually" is reserved for the footer: "Read a fragrance in ten seconds."
- Effort: S

### 6. Verbal tics: "actually" ×9, "Thanks." ×4, "helps the next person" ×3 (severity 2)
- Area: footer, discover lede, compare lede, lists lede, YourTake, Similar footnote, WhenToWear lede, ListedVsSmelled lede, layout description; toasts in VoteProvider; empty states on the fragrance page.
- Finding: "what people actually smell" is the thesis and earns the word once. "made by people who actually wear the things on them", "this is what wearers actually do" (an overclaim: these are "fits" votes, not behaviour), "say what you actually smell", "notes people actually smell" turn it into a reflex a reader starts to notice by the third page. On one fragrance page the sign-in panel says "It takes seconds and shapes what the next person reads", the notes empty state says "Early votes shape what newcomers expect", the reviews empty state says "helps the next person more than you'd think". Four toasts open with "Thanks." ("Thanks. Counted.", "Thanks. Your performance notes are counted.", "Thanks. Your 12 notes are counted.", "Thanks. The Trail will shift as votes come in."), which reads as grateful rather than confident.
- Brief: §16 "confident, concise", "Avoid constant …".
- Direction: keep "actually" in the footer blurb and the ListedVsSmelled lede only. Lists lede: "Shortlists, starter kits and rotations from people who wear what's on them." WhenToWear lede: "Marketing says 'for men'; this is where people say they'd wear it." YourTake (signed out): "Sign in to log a wear, rate it, or say what you smell." (drop the second sentence). Similar footnote: "Matched on character, the notes people smell, 'smells similar' votes and shared shelves." Toasts: drop "Thanks.": "Counted.", "12 notes counted.", "Performance counted.", "Counted. The Trail shifts as votes come in." Keep the reviews empty line; cut the newcomers line (see finding 12).
- Effort: S

### 7. Profile header leads with "0 followers · following 0" (severity 2)
- Area: `src/app/u/[handle]/page.tsx` identity block, directly under the bio.
- Finding: the brief says profiles should emphasise fragrance identity over follower counts; here the counts sit in the header, the zero state is a sad double zero, and the two halves use different word orders. The "Scent identity" line one block lower ("3 on the shelf, with a soft spot for ambroxan. Lately it's mostly Sauvage.") is the real identity and should be the first thing read.
- Brief: §10 "Profiles should emphasise fragrance identity rather than follower counts"; §33 empty states.
- Direction: hide the line when both are zero. When present, move it to the end of the identity block as "Followed by 12 · follows 30", and promote the scent-identity sentence into the header under the handle line so the header reads: name, "@demo · Learning · Leeds", bio, then "3 bottles, a soft spot for ambroxan, lately mostly Sauvage."
- Effort: S

### 8. Fragrance cards label any under-rated fragrance "New" (severity 2)
- Area: `src/components/cards/FragranceCard.tsx` line 113, the `<small>New</small>` fallback when `ratingCount < 5`.
- Finding: "New" is a claim about release date, but the condition is vote count. A 1966 release with three ratings shows "New". On Discover and the house page this reads as wrong data.
- Brief: §32 no random meaningless metrics; §24 always show sample size.
- Direction: replace with "Unrated" (or "{n} ratings" when 1-4, "No ratings" when 0). Reserve "New" for `status === 'upcoming'` or release year within 12 months, and put it in the status corner where "Coming soon" already lives.
- Effort: S

### 9. In-page nav labels don't match the sections they jump to (severity 1)
- Area: `src/components/fragrance/SectionNav.tsx` vs the `SectionHead` titles.
- Finding: nav says "Performance", "When to wear", "Similar", "Sources"; the sections are titled "How long, how loud", "When to wear it", "If you like this", "Details and sources". The scroll-spy highlights a word that isn't on screen.
- Brief: §16 consistency; §35 navigation audit.
- Direction: either rename the nav items to the section titles (the short ones fit: "How it moves · Listed vs. smelled · How long, how loud · When to wear it · Ratings · Reviews · If you like this · Sources") or, if width on phones forbids, shorten the H2s to match the nav. Do not keep two vocabularies.
- Effort: S

### 10. Lines that explain the UI to the reader (severity 1)
- Area: Reviews lede, Learn lede, review composer legend.
- Finding: "Quick takes and full reviews from people who wore it. Filter by what you care about." (the filter row is right there); Learn: "Every term on the site links back here when you tap it." (describes a feature instead of inviting use); composer: "What's it mostly about? (Helps people filter.)".
- Brief: §16 "Do not over-explain obvious UI elements."
- Direction: Reviews lede: "Quick takes and full reviews from people who wore it." Learn lede: "Fragrance talk is full of borrowed French and chemistry. Here it is in plain language." Composer legend: "What's it mostly about?" with the chips doing the rest.
- Effort: S

### 11. Discover filter vocabulary disagrees with itself (severity 1)
- Area: `DiscoverControls.tsx`: note-match radio, active-filter chips, "Community" group.
- Finding: radio options are "Listed or smelled / Officially listed / People smell it", but the chip for the same state says "Listed notes only / Strongly smelled only". The group titled "Community" contains a rating floor ("Any rating / 7+ / 7.5+ / 8+") and a checkbox "Hide discontinued and unreleased", neither of which is about community.
- Brief: §16 specific labels; §7 filters should read instantly.
- Direction: radio legend "Count a note when it is" with options "Listed or smelled / Listed by the house / Noticed by people"; chips reuse the same two phrases. Rename the group "Rated at least" and move the availability checkbox under "Released" as "In production only".
- Effort: S

### 12. "Be the first to say what you smell." is the stock social empty state (severity 1)
- Area: `ListedVsSmelled.tsx` line 130-131, "What people smell" column with no votes.
- Finding: "Be the first to…" is the default empty-state line of every social product, and the button directly beneath already asks "What do you smell?", so the body repeats the CTA.
- Brief: §16, §33 empty states.
- Direction: "No one has said what they smell yet." as the strong line, with no second sentence; the button carries the ask.
- Effort: S

### 13. One action, five confirmations (severity 1)
- Area: toasts across `TodayPanel`, `ShelfActions`, `DiaryView`, `VoteProvider`.
- Finding: logging a wear says "Logged Sauvage for today." on the home panel, "Logged: wearing Sauvage today." from the hero, "Logged Khamrah." from the diary sheet, "Logged. Layering noted." when layered. Shelf says "Sauvage: on your shelf." Votes say "Rated 8/10." and "Thanks. Counted." The forms are all fine alone; together they feel like four writers.
- Brief: §16 consistency.
- Direction: one pattern, object first: "Sauvage logged for today." / "Sauvage and Khamrah logged for today." / "Sauvage: on your shelf." / "Rated 8/10." / "12 notes counted." Keep the Undo action on the hero toast.
- Effort: S

### 14. Similar-tab reason "Projects or lasts more" (severity 1)
- Area: `src/lib/data/similar.ts` `stronger` group `why`.
- Finding: the line is a hedge written by the code, not a reason; the data knows which one is true.
- Brief: §16 specific; §5I similarity labels.
- Direction: compute the branch: "Louder in the first hour" when projection delta > 0.35, "Lasts about {n}h longer" when longevity delta > 2, both when both. Also humanise the shared-notes line: "Both have bergamot and ambroxan" instead of "Shares bergamot, ambroxan".
- Effort: S

### 15. Compare table labels and values (severity 1)
- Area: `src/app/compare/page.tsx` rows "People smell", "Seasons", "Released".
- Finding: "People smell" is a sentence fragment and does not match "What people smell" on the fragrance page. Season cells read "spr 86 / sum 71 / aut 66 / win 45": three-letter abbreviations with no % and no legend. "Released: 2015 · reformulated" prints the raw status value.
- Brief: §5J compare must be excellent, §19 charts need text equivalents.
- Direction: row label "What people smell"; season cells "Spring 86%" (full word, unit) with the bar; status via the same `STATUS_NOTE` map as the hero ("Reformulated", "Discontinued 2019").
- Effort: S

### 16. Generated sentences that come out stiff (severity 1)
- Area: diary header, shelf insights, shelf stats.
- Finding: "2 wears this month · 1 different fragrance"; "Dior is the house you own most from (3)."; "Spent (recorded)".
- Brief: §16; §8 collection intelligence should read like a person wrote it.
- Direction: diary: when distinct is 1, "2 wears this month, all Khamrah"; otherwise "2 wears this month across 3 fragrances". Insight: "Mostly Dior: 3 of your bottles." Stat label: "Paid, where you told us".
- Effort: S

### 17. Header search dropdown is labelled "Try asking" (severity 1)
- Area: `SearchBox.tsx` examples label.
- Finding: "asking" frames the box as a chatbot. The product deliberately parses sentences into visible filters with "We read that as"; the label should match that honesty.
- Brief: §7 (structured discovery, AI later), §15 no AI theatre.
- Direction: "Try one of these" (matches the home page's aria label).
- Effort: S

### 18. Home section sublines (severity 1)
- Area: "Trending" and "Made for autumn" on `src/app/page.tsx`.
- Finding: the Trending list starts at 2 because number one is the feature on the right, but nothing says so; a reader sees a ranked list missing its first row. "Highest rated among fragrances most people say suit this season." stacks three qualifiers.
- Brief: §11 editorial home; §16 specific.
- Direction: Trending sub: "Most logged in wear diaries over the last 30 days. Number one is up top." Seasonal sub: "Best rated of the ones people say suit autumn."
- Effort: S

### 19. Today panel ends on a bare "Diary" link (severity 1)
- Area: `TodayPanel.tsx` line 34-35.
- Finding: "Today you're wearing Khamrah. 12 days logged this month. Diary" ends on a one-word link that reads like a leftover.
- Brief: §16.
- Direction: "Today you're wearing Khamrah. 12 days logged this month. Open the diary →"
- Effort: S

### 20. Experience labels differ between sign-up and display (severity 1)
- Area: `AuthForms.tsx` radio labels vs `EXPERIENCE_LABEL` in `vocab.ts`.
- Finding: you pick "Just starting" and are shown as "New to fragrance"; you pick "Work in the industry" and are shown as "Industry".
- Brief: §16 consistency.
- Direction: use one set in both places: "New to fragrance / Learning / Enthusiast / Collector / Works in the industry".
- Effort: S

### 21. Contribute form asks for a slug (severity 1)
- Area: `ContributeForm.tsx` field label "Which fragrance? (its address, e.g. dior-sauvage)".
- Finding: "its address" asks a reader to know URL internals; everywhere else the site lets you type a name.
- Brief: §25 contribution should be easy; §16.
- Direction: label "Which fragrance?" with the same name-suggest input used by Compare, storing the slug hidden. Until then: "Which fragrance? Paste its page link or type the name."
- Effort: M (picker) / S (label only)

### 22. Hero "Compare with" is a verb on a list of links (severity 1)
- Area: `Hero.tsx` quick-read `<dt>Compare with</dt>`.
- Finding: the label promises an action but the names link to fragrance pages, not to Compare. The brief's question is "What fragrances is it comparable to?"
- Brief: §5C ten-second read.
- Direction: either label "Comparable to" (names link to their pages) or keep "Compare with" and make each name link to `/compare?f={this},{that}`. The second is the more useful page.
- Effort: S
