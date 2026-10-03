# Real catalogue roster (prototype)

Real fragrances. Facts must be researched from primary sources (the house's own product page or
press release) or, failing that, an authorised retailer's product page. NEVER use Fragrantica,
Parfumo, Basenotes, FragDB, Kaggle dumps or any site/dataset derived from them, not even to
"check". Record every source in `sources`. If a fact can't be confirmed, lower `confidence` and say
so in `note`. Do not copy brand marketing copy (leave `officialDescription` undefined).

## Houses (slug → name, kind)
dior → Dior (designer) · chanel → Chanel (designer) · giorgio-armani → Giorgio Armani (designer) ·
yves-saint-laurent → Yves Saint Laurent (designer) · hermes → Hermès (designer) · versace → Versace (designer) ·
jean-paul-gaultier → Jean Paul Gaultier (designer) · rabanne → Rabanne (designer; formerly Paco Rabanne) ·
prada → Prada (designer) · davidoff → Davidoff (mass) · nautica → Nautica (mass) · lancome → Lancôme (designer) ·
mugler → Mugler (designer) · carolina-herrera → Carolina Herrera (designer) · viktor-rolf → Viktor&Rolf (designer) ·
marc-jacobs → Marc Jacobs (designer) · victorias-secret → Victoria's Secret (mass) · guerlain → Guerlain (heritage) ·
creed → Creed (niche) · maison-francis-kurkdjian → Maison Francis Kurkdjian (niche) · le-labo → Le Labo (niche) ·
byredo → Byredo (niche) · diptyque → Diptyque (niche) · tom-ford → Tom Ford (designer; Private Blend is its niche line) ·
maison-margiela → Maison Margiela (designer) · parfums-de-marly → Parfums de Marly (niche) ·
frederic-malle → Frédéric Malle (niche; "Editions de Parfums Frédéric Malle") · serge-lutens → Serge Lutens (niche) ·
escentric-molecules → Escentric Molecules (niche) · juliette-has-a-gun → Juliette Has a Gun (niche) ·
xerjoff → Xerjoff (niche) · kilian → Kilian Paris (niche) · lattafa → Lattafa (regional) · armaf → Armaf (regional) ·
rasasi → Rasasi (regional) · sol-de-janeiro → Sol de Janeiro (mass) · bvlgari → Bvlgari (designer) · jo-malone → Jo Malone London (designer)

## Fragrances (slug | name | house | concentration | expected year | notes)
Group A
1. dior-sauvage | Sauvage | dior | edt | 2015 | FLAGSHIP: has3d: true
2. bleu-de-chanel-edp | Bleu de Chanel | chanel | edp | 2014 |
3. acqua-di-gio | Acqua di Giò | giorgio-armani | edt | 1996 | name the men's EDT
4. ysl-y-edp | Y | yves-saint-laurent | edp | 2018 |
5. terre-d-hermes | Terre d'Hermès | hermes | edt | 2006 |
6. versace-eros | Eros | versace | edt | 2012 |
7. le-male | Le Male | jean-paul-gaultier | edt | 1995 |
8. one-million | 1 Million | rabanne | edt | 2008 |
9. dior-homme-intense | Dior Homme Intense | dior | edp | 2011 |
10. prada-l-homme | Prada L'Homme | prada | edt | 2016 |
11. cool-water | Cool Water | davidoff | edt | 1988 | mass-market classic
12. nautica-voyage | Nautica Voyage | nautica | edt | 2006 | budget
13. eau-sauvage | Eau Sauvage | dior | edt | 1966 | status reformulated (research reformulation history; cite)
14. chanel-no-5 | N°5 | chanel | parfum | 1921 | perfumer Ernest Beaux; mention modern EDP in editorial only
15. coco-mademoiselle | Coco Mademoiselle | chanel | edp | 2001 |
16. black-opium | Black Opium | yves-saint-laurent | edp | 2014 |
17. la-vie-est-belle | La Vie Est Belle | lancome | edp | 2012 |
Group B
18. jadore | J'adore | dior | edp | 1999 |
19. angel | Angel | mugler | edp | 1992 |
20. good-girl | Good Girl | carolina-herrera | edp | 2016 |
21. flowerbomb | Flowerbomb | viktor-rolf | edp | 2005 |
22. daisy | Daisy | marc-jacobs | edt | 2007 |
23. bombshell | Bombshell | victorias-secret | edp | 2010 |
24. mitsouko | Mitsouko | guerlain | edp | 1919 | status reformulated (oakmoss restrictions; cite)
25. shalimar | Shalimar | guerlain | edp | 1925 |
26. aventus | Aventus | creed | edp | 2010 |
27. baccarat-rouge-540 | Baccarat Rouge 540 | maison-francis-kurkdjian | edp | 2015 |
28. santal-33 | Santal 33 | le-labo | edp | 2011 | Le Labo lists notes without a pyramid (use flat if so)
29. gypsy-water | Gypsy Water | byredo | edp | 2008 |
30. philosykos | Philosykos | diptyque | edt | 1996 |
31. tobacco-vanille | Tobacco Vanille | tom-ford | edp | 2007 |
32. oud-wood | Oud Wood | tom-ford | edp | 2007 |
33. jazz-club | Replica Jazz Club | maison-margiela | edt | 2013 |
34. lazy-sunday-morning | Replica Lazy Sunday Morning | maison-margiela | edt | 2013 |
Group C
35. layton | Layton | parfums-de-marly | edp | 2016 |
36. portrait-of-a-lady | Portrait of a Lady | frederic-malle | edp | 2010 |
37. chergui | Chergui | serge-lutens | edp | 2001 |
38. un-jardin-sur-le-nil | Un Jardin sur le Nil | hermes | edt | 2005 |
39. molecule-01 | Molecule 01 | escentric-molecules | edt | 2006 | single molecule (flat: iso-e-super)
40. not-a-perfume | Not a Perfume | juliette-has-a-gun | edp | 2010 | single-note ambroxan (flat)
41. naxos | Naxos | xerjoff | edp | 2015 |
42. love-dont-be-shy | Love, Don't Be Shy | kilian | edp | 2007 | use the house's exact capitalisation
43. khamrah | Khamrah | lattafa | edp | 2022 |
44. club-de-nuit-intense-man | Club de Nuit Intense Man | armaf | edt | 2015 |
45. hawas | Hawas for Him | rasasi | edp | 2015 |
46. cheirosa-62 | Cheirosa '62 | sol-de-janeiro | body_mist | 2015? | the "Brazilian Crush" mist; verify year
47. bvlgari-black | Black | bvlgari | edt | 1998 | verify whether discontinued (status + discontinuedYear) and cite
48. grey-vetiver | Grey Vetiver | tom-ford | edp | 2009 | verify concentration/year
49. wood-sage-sea-salt | Wood Sage & Sea Salt | jo-malone | cologne | 2014 |
50. (agent C picks) a REAL, VERIFIED major-house launch from 2025 or 2026, slug kebab-case of its name; tier 'new'.
