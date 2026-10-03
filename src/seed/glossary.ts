import type { SeedGlossaryTerm } from './types';

/**
 * Glossary for /learn. Real-world fragrance vocabulary, written in our own words.
 * Follows src/seed/VOICE.md. `related` points at other glossary slugs, `seeAlsoNotes` at notes.ts.
 */
export const GLOSSARY: SeedGlossaryTerm[] = [
  // ------------------------------------------------------- how it performs
  {
    slug: 'sillage',
    term: 'Sillage',
    short: 'The scent trail you leave in the air as you move through a room.',
    long:
      'Sillage (roughly "see-yahzh") is French for the wake a boat leaves in water. In fragrance, it is the trail that hangs in the air after you walk past. It is related to projection but not the same thing: projection is how far the scent radiates from your skin while you stand still, sillage is what is left in the hallway after you have gone. Rich ambers and big white florals tend to leave more of it than a light citrus.',
    related: ['projection', 'longevity', 'skin-scent'],
  },
  {
    slug: 'projection',
    term: 'Projection',
    short: 'How far a fragrance radiates from your skin while you are standing still.',
    long:
      'Projection is the bubble of scent around you. A skin scent might only be noticed during a hug, while a loud fragrance can be smelled from across a table. Most fragrances project hardest in the first hour and settle closer as they dry down. Skin, temperature and how many sprays you use all change it, so other people\'s reports are a guide, not a promise.',
    related: ['sillage', 'longevity', 'skin-scent', 'nose-blindness'],
  },
  {
    slug: 'longevity',
    term: 'Longevity',
    short: 'How long a fragrance stays noticeable on your skin or clothes.',
    long:
      'Longevity is usually counted in hours, from the first spray to the point where you can no longer smell it without pressing your nose to your wrist. Fragrances heavy in woods, ambers and musks tend to outlast citrus colognes. Dry skin often holds scent less well than moisturized skin, and fabric holds it longer than either. Your nose also adapts, so a fragrance can still be there when you are sure it has gone.',
    related: ['nose-blindness', 'concentration', 'base-notes', 'projection'],
    seeAlsoNotes: ['musk', 'ambroxan', 'vanilla', 'patchouli'],
  },

  // ---------------------------------------------------- how it is built
  {
    slug: 'accord',
    term: 'Accord',
    short: 'Several materials blended so they read as one new, recognizable smell.',
    long:
      'An accord is to perfume what a chord is to music: several notes that land as a single impression. Some imitate things that cannot be extracted, like peach, lily of the valley or leather. Others are pure invention, like amber, which smells of nothing that exists in nature. When a note list says "leather", you are almost always smelling an accord rather than one ingredient.',
    related: ['note-pyramid', 'perfumer', 'oriental-amber'],
    seeAlsoNotes: ['amber', 'leather', 'lily-of-the-valley', 'peach'],
  },
  {
    slug: 'note-pyramid',
    term: 'Note pyramid',
    short: "The usual way of listing a fragrance's notes: top, heart and base.",
    long:
      'The pyramid sorts notes by how quickly they evaporate, from fast top notes through heart notes to slow base notes. It is a handy map, but a simplified one. Plenty of modern fragrances are built to smell much the same from start to finish, and published notes are often closer to a mood board than a recipe. Treat the pyramid as a hint about where things are headed.',
    related: ['top-notes', 'heart-notes', 'base-notes', 'drydown', 'accord'],
  },
  {
    slug: 'top-notes',
    term: 'Top notes',
    short: 'The first impression: light, fast-evaporating notes you smell right after spraying.',
    long:
      'Top notes are made of small, volatile molecules, so they rise quickly and mostly fade within 5 to 30 minutes. Citrus, light herbs and bright spices are typical. They are also what you smell on a paper strip in a shop, which is why buying on the opening alone so often ends in regret. Give anything at least an hour on skin before you decide.',
    related: ['heart-notes', 'base-notes', 'note-pyramid', 'blind-buy'],
    seeAlsoNotes: ['bergamot', 'lemon', 'pink-pepper', 'grapefruit'],
  },
  {
    slug: 'heart-notes',
    term: 'Heart notes',
    short: 'The core of a fragrance, appearing as the top notes fade and lasting a few hours.',
    long:
      'Heart notes, also called middle notes, show up after the first few minutes and carry the main character of the fragrance. Florals, spices and many aromatic herbs live here. Once the excitement of the opening wears off, this is what most people think of as "the scent".',
    related: ['top-notes', 'base-notes', 'note-pyramid'],
    seeAlsoNotes: ['rose', 'jasmine', 'lavender', 'cardamom'],
  },
  {
    slug: 'base-notes',
    term: 'Base notes',
    short: 'The heavy, slow-evaporating notes that anchor a fragrance and linger the longest.',
    long:
      'Base notes are built from larger molecules that evaporate slowly, often lasting many hours and sometimes into the next day on a scarf. Woods, resins, musks, vanilla and amber are the usual suspects. They also work as fixatives, slowing down the lighter notes above them. The base is where every fragrance ends up, so make sure you actually like it.',
    related: ['heart-notes', 'drydown', 'longevity', 'note-pyramid'],
    seeAlsoNotes: ['vanilla', 'sandalwood', 'musk', 'patchouli'],
  },
  {
    slug: 'drydown',
    term: 'Drydown',
    short: 'How a fragrance smells once it has settled on skin, usually from about an hour in.',
    long:
      'The drydown is the later, quieter stage, when the top notes are long gone and the base has taken over. It is the part you live with longest, and it can be very different from the opening: something sharp at first may turn soft and creamy, or the reverse. If you only ever smell paper strips in shops, the drydown is exactly what you are missing.',
    related: ['base-notes', 'note-pyramid', 'sample'],
  },

  // ------------------------------------------------------ the industry
  {
    slug: 'flanker',
    term: 'Flanker',
    short: 'A spin-off of an existing fragrance that shares its name and often some of its character.',
    long:
      'Flankers reuse a successful fragrance\'s name with a twist, usually a word like Intense, Sport, Summer or Night tacked on. Some stay close to the original, while others share little more than the bottle shape. Concentration versions, such as an EDP of a popular EDT, are often counted as flankers too, and they can smell noticeably different.',
    related: ['edt', 'edp', 'reformulation', 'designer'],
  },
  {
    slug: 'reformulation',
    term: 'Reformulation',
    short: "A change to a fragrance's formula after release, often driven by new rules, cost or supply.",
    long:
      'Fragrances get reformulated for plenty of reasons: a safety rule restricts an ingredient, a natural material becomes too scarce or expensive, or a supplier changes. The aim is usually to stay close to the original, but longtime fans often notice, especially with older styles built on oakmoss or certain musks. Some changes are barely detectable; others shift the whole character. When a glowing review is ten years old, keep in mind the bottle on the shelf today may not match it.',
    related: ['batch-code', 'flanker', 'chypre'],
    seeAlsoNotes: ['oakmoss', 'musk', 'lily-of-the-valley'],
  },
  {
    slug: 'batch-code',
    term: 'Batch code',
    short: 'A short code on a bottle or box that identifies when and where it was produced.',
    long:
      'Batch codes let manufacturers trace production runs. Fragrance fans use them to estimate a bottle\'s age, spot fakes, or compare batches that seem to perform differently. Formats vary by maker and are rarely explained publicly, so online batch-code checkers are educated guesses. Natural materials change from harvest to harvest, so small differences between batches are normal.',
    related: ['reformulation', 'tester'],
  },

  // ---------------------------------------------------- concentrations
  {
    slug: 'concentration',
    term: 'Concentration',
    short: 'How much perfume oil a product contains, which shapes its strength, longevity and price.',
    long:
      'From lightest to strongest, labels usually run eau de cologne, eau de toilette, eau de parfum, parfum and extrait. The percentages quoted for each are typical ranges, not legal definitions, and brands rarely disclose real numbers. Concentration is also only half the story, because the materials matter as much as the dose. A light EDT built on tenacious musks and woods can easily outlast a heavy EDP made mostly of citrus and florals.',
    related: ['eau-de-cologne', 'edt', 'edp', 'parfum', 'extrait', 'body-mist', 'longevity'],
  },
  {
    slug: 'eau-de-cologne',
    term: 'Eau de cologne',
    short: 'The lightest classic concentration, usually citrus-led and short-lived.',
    long:
      'Eau de cologne (EDC) typically contains around 2 to 5 percent perfume oil. The style traces back to bright citrus and herbal tonics from the eighteenth century, and it is still refreshing and fleeting. In some countries "cologne" has turned into slang for any men\'s fragrance, which causes endless confusion. If a bottle actually says eau de cologne, expect an hour or two and plan to reapply.',
    related: ['concentration', 'edt', 'body-mist'],
    seeAlsoNotes: ['bergamot', 'neroli', 'petitgrain', 'lemon'],
  },
  {
    slug: 'edt',
    term: 'Eau de toilette (EDT)',
    short: 'A lighter concentration, typically around 5 to 15 percent perfume oil.',
    long:
      'EDTs usually feel brighter and airier than EDPs, with more emphasis on the opening. The percentage is a typical range, not a rule. More importantly, an EDT and an EDP that share a name are often different formulas, not the same scent at two strengths. Every so often the EDT even lasts longer than the EDP, which is confusing but true.',
    related: ['edp', 'concentration', 'flanker'],
  },
  {
    slug: 'edp',
    term: 'Eau de parfum (EDP)',
    short: 'A mid-to-strong concentration, typically around 15 to 20 percent perfume oil.',
    long:
      'EDPs usually feel fuller and rounder than EDTs and tend to last longer, though that is a tendency rather than a guarantee. Brands often rework the formula for the EDP, adding warmth or sweetness, so it can smell clearly different from the EDT of the same name. Try both before assuming the stronger one is the better one.',
    related: ['edt', 'parfum', 'concentration', 'flanker'],
  },
  {
    slug: 'parfum',
    term: 'Parfum',
    short: 'A high concentration, typically 20 percent or more perfume oil, worn in small amounts.',
    long:
      'Parfum (sometimes sold as "perfume" or "pure perfume") is usually the richest, most intimate version of a fragrance. More oil often means more longevity but not necessarily more projection, and many parfums sit closer to the skin than their EDP siblings. Some brands now use "parfum" for spray versions that land somewhere between an EDP and an extrait, so read the description, not just the label.',
    related: ['extrait', 'edp', 'concentration', 'projection'],
  },
  {
    slug: 'extrait',
    term: 'Extrait de parfum',
    short: 'Usually the most concentrated version of a fragrance, often around 20 to 40 percent oil.',
    long:
      'Extrait de parfum is the label many niche houses use for their strongest versions. It generally means a high oil percentage, a dense texture and long wear, but there is no fixed legal definition. A couple of dabs or one spray is often plenty. The price usually climbs with the concentration.',
    related: ['parfum', 'concentration', 'niche'],
  },
  {
    slug: 'body-mist',
    term: 'Body mist',
    short: 'A very light, low-concentration spray for quick, casual scenting.',
    long:
      'Body mists typically contain around 1 to 3 percent fragrance oil in a lot of water and alcohol. They are cheap, cheerful and short-lived, usually gone within an hour or two. Good for a refresh after the gym, less so for a long evening out.',
    related: ['concentration', 'eau-de-cologne', 'layering'],
  },

  // ------------------------------------------------------- families
  {
    slug: 'chypre',
    term: 'Chypre',
    short: 'A classic structure of bright citrus over a mossy, ambery base: bergamot, oakmoss, labdanum.',
    long:
      'Chypre (said "sheep-ruh", French for Cyprus) is one of the oldest fragrance families. The skeleton is a bright citrus opening, usually bergamot, over a dark, mossy base of oakmoss and labdanum, often with patchouli. Restrictions on oakmoss have made the traditional version rarer, and many modern chypres lean on patchouli and woody synthetics instead. They tend to feel dry, polished and a little aloof.',
    related: ['fougere', 'reformulation', 'accord'],
    seeAlsoNotes: ['bergamot', 'oakmoss', 'labdanum', 'patchouli'],
  },
  {
    slug: 'fougere',
    term: 'Fougère',
    short: 'A classic aromatic structure built on lavender, coumarin (tonka) and oakmoss.',
    long:
      'Fougère means "fern" in French, although ferns barely smell of anything. The name describes an imagined green, mossy, herbal impression built from lavender, tonka bean or synthetic coumarin, oakmoss and often geranium. It became the template for the classic barbershop smell, and a surprising number of modern fresh masculine fragrances are fougères underneath.',
    related: ['chypre', 'accord'],
    seeAlsoNotes: ['lavender', 'tonka-bean', 'oakmoss', 'geranium'],
  },
  {
    slug: 'gourmand',
    term: 'Gourmand',
    short: 'A style built around edible-smelling notes such as vanilla, caramel, coffee or chocolate.',
    long:
      'Gourmands smell like dessert, or at least the idea of it: vanilla, caramel, praline, cocoa, coffee, honey, milk. The style took off in the 1990s and is now one of the most popular around. The good ones balance the sugar with woods, spice or something bitter. The rest smell like a bakery display case, which, to be fair, is exactly what some people want.',
    related: ['oriental-amber', 'layering'],
    seeAlsoNotes: ['vanilla', 'caramel', 'praline', 'tonka-bean', 'coffee'],
  },
  {
    slug: 'aldehydic',
    term: 'Aldehydic',
    short: 'Describes fragrances with a sparkling, soapy, waxy lift from aldehydes.',
    long:
      'Aldehydes are synthetic molecules that, in small doses, make a fragrance feel bright, effervescent and soapy-clean. Aldehydic florals were especially fashionable in the first half of the twentieth century, so many people now link the effect with old-school glamour. Modern perfumers tend to use aldehydes more quietly, for lift rather than as the main event.',
    related: ['accord', 'reformulation'],
    seeAlsoNotes: ['aldehydes', 'soapy', 'waxy', 'iris'],
  },
  {
    slug: 'oriental-amber',
    term: "Amber (formerly 'oriental')",
    short: 'A warm, sweet, resinous family built around vanilla, resins and often spice.',
    long:
      'This family used to be called "oriental", a term the industry has largely dropped because it lumped many different cultures into one vague, exotic label. "Amber" is the usual replacement. These fragrances are warm and sweet, built on accords of labdanum, benzoin, vanilla and tonka, sometimes with incense or spice. The amber here is a perfume accord, not the fossil resin in jewelry and not ambergris.',
    related: ['gourmand', 'accord'],
    seeAlsoNotes: ['amber', 'labdanum', 'benzoin', 'vanilla', 'tonka-bean'],
  },
  {
    slug: 'aquatic',
    term: 'Aquatic',
    short: 'A fresh style that suggests water, sea air or rain.',
    long:
      'Aquatic (or marine) fragrances boomed in the 1990s, built around calone and other synthetic watery molecules. They tend to be clean, breezy and cool, with a slightly salty or melon-like edge. Newer versions lean more on mineral, salty, skin-like notes such as ambroxan. Great in hot weather, though after the twelfth one they can start to blur together.',
    related: ['skin-scent', 'designer'],
    seeAlsoNotes: ['calone', 'marine-notes', 'sea-salt', 'ambroxan'],
  },
  {
    slug: 'skin-scent',
    term: 'Skin scent',
    short: 'A soft, close-wearing fragrance that smells like a slightly better version of your skin.',
    long:
      'Skin scents sit close to the body and are usually built on musks, ambroxan, iris or soft woods. They are meant to be noticed by people who lean in, not by the whole room. Because they are so quiet, wearers often assume they have vanished when other people can still smell them perfectly well.',
    related: ['projection', 'nose-blindness', 'sillage'],
    seeAlsoNotes: ['musk', 'ambroxan', 'iso-e-super', 'cashmeran'],
  },

  // -------------------------------------------------- buying and wearing
  {
    slug: 'blind-buy',
    term: 'Blind buy',
    short: "Buying a full bottle of a fragrance you have never smelled.",
    long:
      'Blind buys usually happen because of a glowing review, a great discount or a beautiful bottle. They can work out, especially if you already know which notes you love. They are also how many people end up with a shelf of half-full regrets. A sample or decant first is cheaper in the long run.',
    related: ['sample', 'decant', 'top-notes', 'clone-dupe'],
  },
  {
    slug: 'decant',
    term: 'Decant',
    short: 'Fragrance transferred from a full bottle into a smaller spray vial.',
    long:
      'Decants let you try, or simply own, a fragrance without buying a full bottle. Fans commonly sell or swap them in sizes from about 2 to 10 milliliters. Buy from people you trust, because there is no way to check what is really in the vial.',
    related: ['sample', 'blind-buy'],
  },
  {
    slug: 'sample',
    term: 'Sample',
    short: 'A tiny vial of fragrance, usually 1 to 2 milliliters, meant for testing.',
    long:
      'Samples are the best way to try a fragrance on your own skin over a full day. Shops and brands often hand them out with purchases or sell them in discovery sets. Wear one for a whole day before deciding, because the opening is only the first chapter.',
    related: ['decant', 'blind-buy', 'tester', 'drydown'],
  },
  {
    slug: 'tester',
    term: 'Tester',
    short: 'A bottle meant for in-store testing, sometimes resold cheaply without a box or cap.',
    long:
      'Testers usually contain the same fragrance as retail bottles, just in plainer packaging. They can be a good deal, though some have spent months under warm shop lights. Buying a "tester" online is no guarantee of authenticity, so the seller matters as much as the price.',
    related: ['batch-code', 'sample'],
  },
  {
    slug: 'nose-blindness',
    term: 'Nose blindness',
    short: "When your brain tunes out a smell you are constantly around, including your own fragrance.",
    long:
      'Officially it is called olfactory adaptation: your brain filters out a steady smell so it can notice new ones. It is why you stop smelling your fragrance after twenty minutes while a colleague still can, and why people overspray a scent they wear every day. To check whether it is still there, ask someone else or sniff a scarf you sprayed earlier.',
    related: ['longevity', 'projection', 'skin-scent'],
    seeAlsoNotes: ['iso-e-super', 'ambroxan', 'musk'],
  },
  {
    slug: 'layering',
    term: 'Layering',
    short: 'Wearing two or more fragrances at once to create a new combination.',
    long:
      'Layering can be as simple as a vanilla under a citrus or as fussy as a planned trio. Simple, linear fragrances layer more easily than complex ones, and some brands design whole ranges to be mixed. Start light, because two loud fragrances usually add up to one muddy one.',
    related: ['body-mist', 'skin-scent', 'gourmand'],
    seeAlsoNotes: ['vanilla', 'musk', 'sandalwood', 'bergamot'],
  },

  // ---------------------------------------------------- people and brands
  {
    slug: 'perfumer',
    term: 'Perfumer',
    short: 'The person who composes a fragrance, sometimes called a nose.',
    long:
      'Perfumers train for years to recognize and remember hundreds, often thousands, of materials. Many work for large fragrance manufacturers and create scents for several brands, frequently without public credit. Others work independently or for a single house. The name on the bottle and the person who wrote the formula are often not the same.',
    related: ['accord', 'niche', 'designer'],
  },
  {
    slug: 'niche',
    term: 'Niche',
    short: 'Houses focused mainly on fragrance, usually with smaller distribution and higher prices.',
    long:
      'Niche brands make fragrance their main business rather than a sideline to fashion. They tend to take more risks with unusual notes, release fewer flankers and sell through boutiques or their own shops. Prices are often higher, but niche does not automatically mean better. It describes a business model, not a quality score.',
    related: ['designer', 'perfumer', 'extrait'],
  },
  {
    slug: 'designer',
    term: 'Designer',
    short: 'Fragrances released by fashion or lifestyle brands, usually sold widely.',
    long:
      'Designer fragrances come from fashion houses and lifestyle or celebrity brands, and are mostly sold in department stores and big retailers. Many are built to please a broad audience, though some are genuinely excellent and have shaped whole genres. They are usually cheaper than niche and easy to find on sale.',
    related: ['niche', 'flanker', 'clone-dupe'],
  },
  {
    slug: 'clone-dupe',
    term: 'Clones and dupes',
    short: 'Fragrances made to smell like popular, usually pricier, fragrances.',
    long:
      'Clones and dupes copy the smell of well-known fragrances for less money. Some are close enough that only a side-by-side test gives them away; others are rough sketches. Copying a smell is generally legal, while copying names or packaging is not. They are a cheap way to find out if you like a style, though quality and longevity vary a lot.',
    related: ['designer', 'niche', 'blind-buy'],
  },
];
