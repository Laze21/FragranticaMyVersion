You are acting simultaneously as a senior product designer, UX researcher, visual identity designer, frontend engineer, backend architect, motion designer, 3D-web engineer, community-platform designer, and product strategist.
I want you to DESIGN AND BUILD the foundation of a completely new fragrance discovery, review, collection, and community platform that can eventually compete directly with Fragrantica, Parfumo, Basenotes, and similar fragrance databases.
This should NOT feel like “Fragrantica with a modern theme.”
The goal is to rethink what a fragrance website should feel like in 2026 and beyond.
The platform should be genuinely useful to:

* someone buying their first fragrance;
* an enthusiast with 100+ bottles;
* collectors;
* reviewers;
* people researching notes;
* people comparing fragrances before buying;
* people trying to understand what fragrance terminology actually means;
* users keeping track of their collection and wears;
* users casually browsing fragrances the way someone might browse Letterboxd, Discogs, Goodreads, or a great music-discovery platform.

The central product philosophy is:
Make fragrance easier to understand without making it less deep.
A beginner should be able to understand a fragrance within approximately 10 seconds.
An enthusiast should be able to spend 20 minutes on that exact same page digging into detailed data.
Those two experiences should coexist through progressive disclosure.
Do not immediately throw together a generic landing page.
First think through the product, information architecture, data structure, visual language, interaction model, responsive behavior, and technical architecture. Then implement it.
1. PRODUCT VISION
Fragrance is an unusually emotional and sensory product being represented on existing websites through mostly static images, colored bars, note icons, numbers, and enormous walls of reviews.
I want this platform to make fragrances feel like physical objects and experiences.
The website should sit somewhere conceptually between:
luxury editorial design,
an enthusiast database,
a collection tracker,
a sensory visualization tool,
a social review platform,
and an interactive digital fragrance counter.
It should feel elegant without becoming sterile.
It should feel playful without becoming childish.
It should feel premium without looking like a generic luxury ecommerce template.
It should feel information-dense when necessary without becoming visually overwhelming.
Browsing fragrances should itself be enjoyable.
The EXPERIENCE is part of the product.
2. RESEARCH THE EXISTING MARKET FIRST
Before finalizing UX decisions, investigate the current state of:
Fragrantica,
Parfumo,
Basenotes,
Wikiparfum/Wikiperfume,
popular fragrance communities on Reddit,
and any meaningful newer fragrance discovery products.
Research both enthusiast and beginner opinions.
Identify:
what people repeatedly use Fragrantica for,
what information users consider indispensable,
why users continue returning despite complaints,
what people dislike about its UI,
what people dislike about its mobile experience,
what people dislike about its advertising,
which discovery/search tools users depend on,
what people prefer about Parfumo,
what collectors need,
what beginners find confusing,
what existing sites do poorly,
and what features users routinely wish existed.
Do not blindly copy community opinions. Use them as product evidence.
Create a concise internal research summary and use it to justify design decisions.
The platform should preserve useful concepts such as:
deep fragrance databases,
note searching,
note exclusion,
accord information,
review communities,
performance voting,
similar fragrances,
collections,
brand/perfumer information,
and community discussion,
while fundamentally improving how this information is structured and understood.
3. IMPORTANT DATA AND LEGAL CONSTRAINT
DO NOT scrape Fragrantica or build the production database using an unofficial Fragrantica scraper/API.
Its current terms restrict automated scraping and reuse of its content to power competing services.
Do not create a technical dependency on Fragrantica, Parfumo, or another competitor through scraping unless explicit legal permission/licensing exists.
Instead, design a legitimate long-term data strategy.
Investigate options such as:
public/open datasets,
Open Beauty Facts,
Wikidata/Wikimedia,
official manufacturer information,
licensed fragrance datasets,
FragDB or comparable licensed datasets,
brand-provided feeds,
manual editorial entry,
community submissions,
and our own growing proprietary database.
Every important piece of fragrance information should eventually support provenance.
For example:
source_type:
official_brand
licensed_database
editorial
community
public_dataset
source_url
verified_at
confidence
submitted_by
A major strategic advantage should be that users can understand where information came from.
Never hotlink competitor images.
Design the system so assets are either owned, licensed, contributed under appropriate terms, or legitimately referenced.
For the prototype, if comprehensive licensed data is unavailable, use clearly marked seed/demo data rather than quietly scraping another platform.
4. ONE OF OUR BIGGEST DIFFERENTIATORS: “OFFICIAL” VS “PERCEIVED”
Fragrance note pyramids are often misunderstood.
Marketing notes are not necessarily a literal ingredient list, and users may perceive completely different notes.
Our platform should explicitly distinguish:
Official / Published Notes
What the fragrance house or legitimate source says.
from:
What People Actually Smell
Aggregated community perception.
For example:
Official:
bergamot
lavender
pepper
ambroxan
cedar
Community perception:
68% fresh citrus
61% peppery
54% clean/soapy
47% woody
39% ambroxan-heavy
21% metallic
This distinction should be extremely easy to understand.
Allow users to vote on perceived notes and accords.
Over time this becomes proprietary community data and potentially one of the site's strongest assets.
Consider displaying a confidence indicator based on number of community votes.
5. REIMAGINE THE FRAGRANCE DETAIL PAGE
This is the most important interface in the entire product.
Do not simply reproduce Fragrantica's page layout.
Design something genuinely better.
A. Bottle Stage
The fragrance bottle should be treated almost like an object in a digital museum.
Large bottle presentation.
Beautiful typography.
Brand.
Fragrance.
Concentration.
Release year.
Perfumer.
Current community rating.
Collection controls.
If an interactive 3D model exists, use it.
The user should be able to subtly rotate the bottle with mouse/touch.
Keep this tasteful.
It should NOT constantly spin.
B. Interactive Bottle Animation
I want to explore a system where selected fragrances can use actual interactive 3D bottle models.
Possible animations:
idle;
rotate;
remove cap;
press atomizer;
spray;
open/explode the bottle composition;
transition from bottle into fragrance notes.
One particularly interesting transition:
User selects Explore the scent.
The bottle subtly rotates.
Cap lifts.
Atomizer sprays.
The mist becomes particles or shapes representing the fragrance's opening notes.
The interface transitions into the scent breakdown.
Or:
the bottle visually separates into layers and the top/heart/base notes emerge from within it.
This should feel premium and intentional rather than like a WebGL demo.
For implementation, investigate:
glTF/GLB,
`<model-viewer>`,
Three.js,
React Three Fiber if justified,
compressed textures,
Draco/meshopt compression,
and lazy loading.
A basic animated GLB can use `<model-viewer>`.
Use Three.js/R3F only where greater control materially improves the experience.
Create the architecture now even if only ONE original/demo bottle receives a full 3D experience initially.
Support fields such as:
model_url
poster_image
animation_idle
animation_spray
animation_open
animation_notes
model_version
IMPORTANT:
3D is progressive enhancement.
The page MUST still look excellent with only a normal product image.
Never make users wait for a 3D model before showing useful information.
On slow devices, low-power devices, disabled WebGL, reduced-motion preferences, or slow networks, gracefully use the static version.
Lazy-load the 3D model after important above-the-fold information.
Respect `prefers-reduced-motion`.
C. “10 Second Read”
Immediately communicate:
What does this smell like?
How strong is it?
How long does it last?
When would I wear it?
How expensive does it generally feel / what price segment is it?
What fragrances is it comparable to?
Example concept:
SMELLS LIKE
Bright bergamot and pepper at first,
then clean woods and ambroxan.
Fresh • Spicy • Woody
8–10 hr typical longevity
Moderate → Strong projection
Best:
Cool evenings / nights out
This should be written in plain language.
No pretentious perfume jargon unless the user wants deeper information.
D. Scent Journey
Replace a boring note pyramid with an interactive scent timeline.
Example:
SPRAY
0–15 min
OPENING
bergamot
pepper
mandarin
15–90 min
HEART
lavender
geranium
spices
2–8 hr
DRYDOWN
amber woods
cedar
musk
Let community members also vote on which notes appear strongest during each phase.
Eventually the visualization could evolve as community data grows.
E. Scent Fingerprint
Develop a recognizable visual language unique to our product.
Instead of copying Fragrantica's accord bars, create a Scent Fingerprint.
Possible dimensions:
Fresh
Sweet
Dark
Dry
Creamy
Green
Woody
Spicy
Floral
Smoky
Do not automatically use a generic radar chart.
Experiment with a better bespoke visualization.
The visualization should become recognizable enough that someone seeing it elsewhere knows which platform produced it.
F. Performance
Make performance understandable.
Avoid only:
Longevity: 4/5
Sillage: 3/5.
Consider:
TYPICAL LONGEVITY
7–10 HOURS
community distribution:
<4h
4–6h
6–8h
8–10h
10h+
PROJECTION
Skin
Close
Conversational
Arm's length
Room-filling
Visualize how projection generally changes over time.
Example:
0h ━━━━━━━
2h ━━━━━
4h ━━━
8h ━
Do not imply scientific precision where community data is subjective.
Communicate sample size.
G. Wearability
Show community consensus about:
season,
weather,
temperature,
day/night,
office,
school,
date,
formal,
casual,
nightlife,
special occasions.
Avoid reducing everything to arbitrary scores.
Use understandable distributions.
H. Reviews
Reviews are a major reason people use fragrance communities.
Make them substantially easier to browse.
Support:
helpful votes,
sorting,
recent,
highest rated,
lowest rated,
most helpful,
short reviews,
long-form reviews,
verified ownership if we can legitimately support it,
reviewer's fragrance experience level if voluntarily supplied,
wear count,
and disclosure for gifted/promotional bottles.
Let someone post:
Quick Take
2–4 sentences
or
Full Review
long-form
Allow filters such as:
performance-focused
scent-focused
value-focused
beginner perspective
long-term owner
first impression
Do not bury useful reviews under enormous unstructured comment streams.
I. Similar Fragrances
Build a highly useful similarity system.
Display:
Smells similar to
If you like this, try
Cheaper alternatives
More refined alternatives
Sweeter
Fresher
Darker
Stronger
More subtle
Similarity should eventually combine:
note overlap,
accord fingerprint,
community similarity votes,
performance,
style,
and user behavior.
Do NOT automatically label products “clones.”
J. Compare
Allow 2–4 fragrances side by side.
Compare:
notes,
perceived notes,
accords,
longevity,
projection,
price segment,
season,
occasion,
rating,
release year,
perfumer,
and community overlap.
Make comparisons excellent on mobile.
This should be a core feature rather than an afterthought.
6. BEGINNER MODE WITHOUT A SEPARATE “DUMB” WEBSITE
Do not create an entirely separate beginner experience.
Use progressive explanation.
Terms such as:
sillage,
projection,
accord,
drydown,
flanker,
EDT,
EDP,
Parfum,
Extrait,
chypre,
fougère,
gourmand,
aldehydic,
ambroxan
should have subtle explanations accessible through tooltips/taps.
A beginner could tap:
“What does ambroxan smell like?”
and receive:
a short explanation,
common characteristics,
related notes,
and fragrances where it is prominent.
Create note pages as actual educational destinations.
Example:
/notes/bergamot
What it smells like.
Where it comes from.
What it commonly contributes.
Often paired with.
Fragrances where it appears prominently.
Fragrances where users strongly perceive it.
7. SEARCH AND DISCOVERY SHOULD BE A MAJOR ADVANTAGE
Search cannot just mean typing a fragrance name.
Support eventual discovery such as:
fragrance name,
brand,
perfumer,
note,
accord,
year,
concentration.
Advanced filtering:
includes note,
excludes note,
strongly perceived note,
officially listed note,
season,
weather,
occasion,
longevity,
projection,
style,
release decade,
rating,
review count,
price band,
designer/niche,
availability.
Example natural discovery queries:
“Vanilla fragrance without tobacco”
“Fresh fragrance that lasts 8+ hours”
“Something similar to Bleu de Chanel but less common”
“Summer fragrance that isn't citrus-heavy”
“Woody date-night fragrance under $100”
Architecture should allow this later even if MVP uses structured filters rather than AI.
Search should feel instantaneous.
For early-stage infrastructure consider PostgreSQL full-text search + `pg_trgm`.
Only add an external search service if it meaningfully improves UX.
Algolia can be considered later or during prototype experimentation.
8. COLLECTION / DIGITAL FRAGRANCE SHELF
Accounts should let users maintain:
Own
Owned before
Want
Want to sample
Sampled
Currently testing
Favorite
The collection should look visually enjoyable.
Not a spreadsheet.
Potential presentation:
clean virtual shelf,
poster-style grid,
compact data view.
Allow switching views.
Provide collection intelligence:
most common notes,
most common accords,
favorite houses,
favorite perfumers,
collection scent profile,
season balance,
average longevity,
most worn,
least worn,
recent additions.
Eventually:
“You own 12 fragrances featuring vanilla.”
“You consistently rate iris fragrances highly.”
“Your collection is heavily weighted toward cold-weather fragrances.”
Avoid creepy or overconfident personalization.
9. WEAR DIARY
Allow:
Wear today
Select fragrance.
Optional:
number of sprays,
weather,
occasion,
short note.
Generate:
wear history,
most worn this month,
seasonal patterns,
personal performance observations.
This can become one of the site's retention loops.
10. SOCIAL FEATURES
Community matters, but do not create social-media clutter.
Potential features:
follow reviewers,
follow collections,
review comments,
helpful votes,
lists,
shared shelves,
fragrance discussions,
user-created lists.
Examples:
“5 Summer Fragrances That Don't Smell Like Everyone Else”
“Best Vanilla Fragrances I've Tested”
“My 2026 Rotation”
Profiles should emphasize fragrance identity rather than follower counts.
11. HOME PAGE
Do NOT create the AI-template layout:
centered giant headline,
gradient word,
one CTA,
three feature cards,
testimonials,
pricing,
footer.
This is not SaaS.
The homepage itself should feel like opening a fragrance publication/database.
Consider an editorial composition.
Potential modules:
prominent intelligent search;
recently discussed fragrances;
trending among the community;
new releases;
one beautifully featured fragrance;
“Explore by feeling”;
seasonal discovery;
popular note;
community review excerpts;
new perfume-house additions;
personalized modules when signed in.
Example discovery themes:
Clean
Dark
Warm
Rainy Day
Vacation
Date Night
Office
Cold Weather
Quiet Luxury
Sweet but not sugary
Fresh but not aquatic
Make the homepage change naturally as content changes.
12. VISUAL DIRECTION
The brand should feel:
editorial,
tactile,
sensory,
cultured,
premium,
curious,
slightly playful.
NOT:
corporate SaaS,
cyberpunk,
generic startup,
sterile luxury,
crypto,
AI dashboard,
gaming website,
Apple clone,
Fragrantica reskin.
Imagine:
a beautifully designed fragrance journal,
a modern object catalog,
a record collection,
a boutique perfume counter,
a design magazine.
Use asymmetry when appropriate.
Allow negative space.
But do not waste half the viewport for decorative whitespace.
Let photography and fragrance objects breathe.
13. COLOR SYSTEM
Avoid the generic AI palette.
ABSOLUTELY DO NOT default to:
purple → blue gradients,
violet glows,
indigo CTA buttons,
neon cyan on black,
huge aurora backgrounds.
Explore a sophisticated warm palette around something like:
Ink
#1C1A17
Porcelain
#F4EFE6
Stone
#A79F93
Oxblood
#7A302C
Bergamot
#C5A63C
Juniper
#607165
These are starting directions, not immutable rules.
The neutral interface should remain stable.
Each fragrance can then introduce a controlled scent accent based on its identity.
Example:
a citrus fragrance may introduce pale bergamot yellow;
a marine fragrance muted mineral blue;
a rose fragrance dusty crimson;
an earthy vetiver scent olive/soil tones.
Do not let dynamic fragrance colors destroy brand consistency.
The UI should remain recognizably ours.
Check WCAG contrast.
Do not sacrifice readability for aesthetic subtlety.
14. TYPOGRAPHY
Do not automatically use:
Inter,
Geist,
Roboto,
Arial,
or another untouched AI-builder default.
Select typography intentionally.
Consider an editorial display face paired with an extremely readable UI sans.
Avoid stereotypical “luxury” clichés such as making everything Didot with enormous tracking.
Typography should create character while remaining practical for dense database pages.
Establish:
display scale,
headline scale,
body,
caption,
data labels,
numeric style.
Numbers matter heavily in this product, so test tabular figures.
15. SPECIFICALLY AVOID “AI / VIBE-CODED” DESIGN TELLS
I do NOT want people looking at this website and instantly thinking:
“Claude made this.”
Research contemporary complaints about AI-generated/vibe-coded interfaces before finalizing the visual language.
Explicitly avoid clustering these common patterns:
purple/blue gradient branding;
gradient text headlines;
glassmorphism everywhere;
blurred floating translucent cards;
20–24px rounded corners on every object;
everything existing inside cards;
excessive pill-shaped controls;
default shadcn appearance;
default Tailwind slate palette;
centered hero + three equal feature cards;
generic bento-grid-for-everything layouts;
random glowing orbs;
dark background + neon glow;
huge “modern SaaS” headings;
emoji used as interface icons;
generic rocket/lightning/sparkle icons;
unnecessary hover movement;
scroll animations on every element;
excessive fade-up-on-scroll;
fake testimonials;
fake statistics;
stock “trusted by” sections;
meaningless abstract blobs;
overly symmetrical layouts;
giant unused whitespace;
every section having identical vertical padding.
Component libraries are allowed for engineering quality.
Their DEFAULT APPEARANCE is not.
If using Radix, shadcn, Tailwind, etc., develop our own token system and visual treatment.
Cards should only exist where a card is semantically appropriate.
Pills should primarily represent things that make sense as tags/filters/statuses.
Rounded corners should have hierarchy.
Some surfaces can be square.
Some may use 2–6px radii.
Not everything needs 16px+ rounding.
16. AVOID AI-WRITTEN COPY
The copy should sound like knowledgeable humans who genuinely like fragrance.
Avoid:
“Elevate your fragrance journey.”
“Discover scents that define you.”
“Reimagine the way you experience fragrance.”
“Where fragrance meets community.”
“Curated just for you.”
“Unlock your signature scent.”
“Seamless discovery.”
“Experience fragrance like never before.”
Avoid constant:
“Whether you're a beginner or seasoned enthusiast…”
Do not overuse em dashes.
Do not over-explain obvious UI elements.
Use confident, concise writing.
Examples:
“What's in your rotation?”
“Find something different.”
“Worn this?”
“What do you actually smell?”
“7,812 people say vanilla.”
Human.
Specific.
Occasionally playful.
17. CUSTOM MICROINTERACTIONS
Instead of generic animations, give the product interactions connected specifically to fragrance.
Examples:
atomizer depresses when marking something “worn today”;
extremely subtle spray mist;
cap clicks into place;
note transitions drift upward like volatile scent;
accord visualization gently rebalances when community filters change;
bottle reflections respond subtly to pointer movement;
collection addition gives a subtle shelf-placement motion.
Do not overdo these.
The motion system should be mostly quiet so meaningful animations feel special.
18. MOBILE IS NOT A SHRUNK DESKTOP
This product MUST feel excellent on phones.
Design mobile intentionally.
Prioritize:
thumb reach,
44px+ touch targets,
short search paths,
comfortable review reading,
excellent comparison UI,
fast collection controls,
horizontal scent timelines when appropriate,
bottom sheets for filters,
sticky contextual actions where useful.
Fragrance detail mobile structure might begin:
Bottle / identity
Quick summary
Primary accords
Scent journey
Performance
When to wear
Ratings
Reviews
Similar scents
Details
Desktop can take advantage of:
sticky information rail,
larger bottle stage,
split layouts,
side-by-side data,
richer comparison.
Avoid sideways scrolling unless it is intentional for a specific visualization.
Test at minimum:
390px mobile,
768px tablet,
1440px desktop,
large desktop.
19. ACCESSIBILITY
Treat accessibility as product quality.
Implement:
keyboard navigation,
visible focus states,
semantic markup,
screen-reader labels,
sufficient contrast,
44px touch targets,
reduced-motion behavior,
static alternatives to interactive 3D,
alt text,
accessible charts/data representations,
no information communicated solely through color.
Users who cannot use the 3D view must lose no important information.
20. PERFORMANCE
This is a content/database platform first.
Do not let fancy visuals make it slow.
Optimize for:
fast first paint,
minimal layout shift,
responsive search,
optimized images,
code splitting,
lazy-loaded community content,
lazy-loaded 3D,
compressed GLB assets,
compressed textures,
progressive enhancement.
Poster image FIRST.
3D SECOND.
Do not load Three.js on pages that do not need it.
Target excellent Core Web Vitals.
21. PROPOSED TECHNICAL ARCHITECTURE
Unless there is a materially better reason based on the existing project environment, consider:
Frontend:
current stable Next.js
React
TypeScript
Styling:
Tailwind OR custom CSS architecture,
but with a completely custom design token system.
Backend:
Supabase
Database:
PostgreSQL
Authentication:
Supabase Auth
Media:
Supabase Storage initially,
with ability to move large media/3D assets to object storage/CDN later.
Search:
Postgres FTS + pg_trgm initially.
Potential later:
Algolia / Meilisearch / Typesense if scale requires it.
3D:
`<model-viewer>` for simple GLB experiences.
Three.js or React Three Fiber for advanced interactions.
Deployment:
Vercel or equivalent.
Do not blindly install dependencies.
Check current stable versions and project compatibility first.
22. DATABASE DESIGN
Create a thoughtful relational schema.
At minimum consider tables/entities for:
users
profiles
fragrances
fragrance_variants
brands
perfumers
notes
accords
fragrance_notes
fragrance_accords
perceived_note_votes
performance_votes
wearability_votes
ratings
reviews
review_votes
collections
collection_items
wear_logs
similarity_votes
lists
list_items
fragrance_assets
data_sources
fragrance_source_records
Fragrance record should support fields such as:
id
slug
name
brand_id
concentration
release_year
marketed_for
description
official_description
perfumer
country
status
image
poster_image
model_3d_url
Be careful with “gender.”
Keep manufacturer positioning separate from user wearability.
For example:
marketed_for = Men
should not imply:
only wearable by men.
23. DATA PROVENANCE
Design provenance into the schema NOW rather than adding it later.
Example:
fragrance:
Dior Example
note:
bergamot
source:
Official Dior product page
source_type:
official_brand
verified:
2026-10-02
And independently:
community perception:
bergamot
63%
1,418 votes
This improves transparency and differentiates the product.
24. RATING SYSTEM
Avoid making a single 1–5 score carry everything.
Consider:
Overall
Scent
Performance
Value
Originality
Then separate factual-ish community observations:
typical longevity,
projection,
season,
occasion.
Do not mix subjective enjoyment and performance into one number.
Always show sample size.
25. ADMIN / CONTRIBUTION SYSTEM
Eventually users should be able to suggest:
new fragrance,
correction,
new concentration,
new perfumer attribution,
new official note,
missing image.
Create an admin/moderation workflow.
We will need:
pending submissions,
duplicate detection,
source URLs,
change history,
approve/reject,
merge duplicate fragrances,
asset moderation,
review moderation,
user reports.
Design for community growth from the beginning.
26. BUSINESS MODEL WITHOUT DESTROYING UX
Do not build monetization yet unless needed for architecture, but leave room for:
affiliate retailer links,
sample sellers,
premium collection analytics,
optional enthusiast features,
taste profiling,
non-invasive advertising,
brand partnerships clearly labeled.
ABSOLUTELY avoid the ad experience users commonly complain about on legacy fragrance websites:
popovers,
layout-shifting ads,
ads between every useful section,
full-screen interstitials,
autoplay video,
ads disguised as community content.
Trust matters.
27. SEO AND SHAREABILITY
Fragrance pages will be search-heavy content.
Implement excellent technical SEO.
Consider:
server rendering,
descriptive metadata,
canonical URLs,
OpenGraph,
structured data where appropriate,
brand pages,
perfumer pages,
note pages,
accord pages,
review pages,
list pages.
A shared fragrance URL should generate a beautiful card containing:
bottle,
name,
brand,
top accord,
community rating.
User-created lists should also be shareable.
28. NAMING / BRAND STRATEGY
We need a name capable of competing culturally with names like:
Fragrantica
Parfumo
Basenotes
Do NOT choose the final name immediately.
Perform a naming sprint.
Generate at least 30 serious candidates across several naming directions.
The ideal name should be:
memorable,
pronounceable,
short enough,
distinctive,
not painfully obvious,
not fake-luxury,
not startup-generic,
usable internationally,
capable of becoming a noun people use naturally.
Avoid formulaic AI names like:
Scently
Scentify
AromaAI
Scentora
Fragrantly
NoseHub
ScentVerse
ScentSphere
Aromatica
PerfumeFlow
Avoid random Latin/French words merely because fragrance feels “luxury.”
I would rather have a culturally memorable name than a literal one.
Explore naming territories such as:
scent vocabulary,
memory,
air,
chemistry,
ritual,
objects,
collecting,
olfaction,
culture,
signal,
trace,
impression.
For finalists, research:
web search conflicts,
existing fragrance businesses,
software/product conflicts,
social handle conflicts,
basic trademark risk indicators,
and likely domain possibilities.
This is preliminary research, NOT legal trademark clearance.
Present:
Top candidates
Why each works
Potential downside
Pronunciation
Brand personality
Possible URL variations
Do not permanently bake a brand name into architecture until a final decision is made.
Use a replaceable `APP_NAME` token during development.
29. CREATE A REAL DESIGN SYSTEM
Before creating dozens of pages, establish:
color roles,
typography,
spacing,
grid,
border hierarchy,
radii,
shadows,
icons,
illustration treatment,
photography treatment,
3D treatment,
motion timing,
chart style,
hover behavior,
focus behavior,
empty states,
loading behavior,
error behavior.
Document WHY each decision fits fragrance.
Do not create arbitrary tokens because a design system tutorial says so.
30. IMPORTANT ORIGINAL VISUAL FEATURE
Develop one highly recognizable visual metaphor that belongs to this product.
Possible starting points:
Scent Fingerprint
Scent Journey
Scent Aura
Wear Curve
Accord Composition
Fragrance DNA
But invent the final visual system yourself.
It must be:
beautiful,
understandable,
responsive,
accessible,
useful rather than decorative.
I want something that could eventually become as recognizable to fragrance enthusiasts as Letterboxd's film ratings or Spotify's audio visualizations.
31. MVP PAGE SET
Build or prototype:
Home
Search / Discover
Fragrance Detail
Brand Page
Perfumer Page
Note Page
Compare
User Collection
User Profile
Wear Diary
Review Composer
Sign In / Sign Up
Admin/add-fragrance structure if practical.
The FRAGRANCE DETAIL PAGE should receive the highest level of polish.
32. SEED EXPERIENCE
Create enough high-quality seed content to make the prototype feel like a real application.
Do not fill it with:
Lorem ipsum,
“Product Name 1,”
emoji bottles,
random meaningless metrics,
fake review counts pretending to be genuine production data.
If data is demonstrative, label it internally/appropriately as seed/demo data.
Use believable product structures without misrepresenting provenance.
33. STATES MOST AI BUILDS FORGET
Design:
loading,
empty,
error,
offline/poor connection,
zero reviews,
one review,
thousands of reviews,
no 3D model,
missing note pyramid,
discontinued fragrance,
new release with little community data,
deleted review,
private profile,
empty collection,
no search results.
A polished application is defined as much by edge cases as by ideal screenshots.
34. TESTING
Before calling the design finished, test:
keyboard navigation;
mobile navigation;
search;
filtering;
compare;
auth;
add to collection;
remove from collection;
rate;
review;
wear log;
3D fallback;
reduced motion;
long fragrance names;
long brand names;
large review counts;
missing images;
slow image loading.
No console errors.
No broken responsive states.
No horizontal overflow.
35. VISUAL QA AGAINST AI TELLS
After implementing the initial UI, perform a deliberate “vibe-code audit.”
Look at the entire application as if you were a skeptical designer trying to identify whether Claude generated it.
Specifically inspect:
palette,
font choice,
card shapes,
corner radii,
spacing repetition,
component repetition,
icon choices,
gradient use,
shadow use,
grid symmetry,
section order,
animations,
copywriting,
empty states,
navigation,
buttons.
Ask:
“Could this screenshot plausibly come from a generic AI SaaS template?”
If yes, redesign it.
Do not solve this by making everything bizarre.
The goal is intentionality, not novelty for novelty's sake.
36. DELIVERABLE / WORK ORDER
Work in roughly this sequence:
PHASE 1 — RESEARCH
Competitor analysis.
User complaints/praise.
Data/API investigation.
Legal/data constraints.
Naming research.
PHASE 2 — PRODUCT DEFINITION
Information architecture.
Feature hierarchy.
Beginner vs enthusiast strategy.
Database model.
Data provenance system.
PHASE 3 — VISUAL IDENTITY
Naming candidates.
Design direction.
Color system.
Typography.
Icon direction.
Scent visualization concept.
Motion system.
PHASE 4 — WIREFRAMES
Home.
Search.
Fragrance page.
Compare.
Collection.
Mobile variations.
PHASE 5 — HIGH-FIDELITY DESIGN
Apply the visual identity.
Create desktop and mobile views.
Design 3D fallback state.
PHASE 6 — IMPLEMENTATION
Build the actual frontend and required backend foundations.
PHASE 7 — 3D PROTOTYPE
Create or integrate one ORIGINAL demonstration fragrance bottle.
Allow rotate.
Add one meaningful animation such as cap removal/spray.
Prototype transition into Scent Journey.
Do not illegally copy proprietary bottle CAD assets.
PHASE 8 — POLISH
Responsive QA.
Accessibility.
Performance.
Motion.
Edge states.
AI-design-tell audit.
PHASE 9 — HANDOFF
Document architecture.
Document database.
Document design tokens.
Document data sourcing strategy.
Document what remains for production launch.
37. DO NOT STOP AT A STATIC MOCKUP
The end result should feel like the beginning of a genuine production application.
Buttons should work.
Navigation should work.
Search should work with seed data.
Filtering should work.
Fragrance pages should be data-driven.
Collections should persist for authenticated users if backend setup is available.
Reviews should have a real database model.
Responsive design should actually function.
3D should have fallback logic.
Do not spend the entire effort creating a beautiful hero image while leaving the application underneath empty.
38. USE GOOD JUDGMENT
You have permission to improve the concept.
If you identify a feature that would make this significantly more compelling, add it.
If one of my ideas would hurt performance or usability, preserve the spirit while finding a better implementation.
Do not remove depth merely to make things minimalist.
Do not add complexity merely because competitors contain it.
The final question guiding every decision should be:
“Would both a person buying their first fragrance and someone with 200 bottles genuinely prefer using this?”
I want the result to feel as though a strong product team, experienced fragrance enthusiasts, a professional editorial designer, and excellent engineers spent months thinking through it.
Not like an AI generated a fragrance website in one afternoon.
Begin by researching and establishing the product/design foundation, then proceed into the actual implementation rather than stopping after presenting ideas.