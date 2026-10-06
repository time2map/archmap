---
name: firm-works
description: Collect the built works of one top architecture firm (the TOP_TIER_FIRMS list in src/Map.jsx) worldwide — candidates from Wikidata, confirmed and completed on the firm's own website — with links to read about each work, verified locations and free-licensed photos, into the city files public/top/<city>.json (works inside a city) and public/top/world.json (works beyond the cities). Use when asked to collect the works of a firm ("собери постройки BIG", "collect works of MVRDV").
---

# Firm works

One run covers one firm. The firms are those of `TOP_TIER_FIRMS` in `src/Map.jsx`; do not add
or drop firms. Every rule of the `city-top` skill (`.claude/skills/city-top/SKILL.md`) applies
unless this file says otherwise: its Hard rules, §1 sources and votes, §4 locations and
pitfalls, §5 photos and freedom of panorama. Read it first.

What differs from city-top:
- No `why`. The card shows the links to read about the work; that is enough.
- Every completed work of the firm is taken: there is no vote threshold and no 100-place
  ceiling, and a work may have no source at all.
- Every place gets `firms`, and `firmPage` when the firm has a page for the work (§3). The firm's page is never a source: a firm does
  not recommend its own work.

## The firms
`firms` holds the name in the first column, exactly (`scripts/verifyTop.js` checks it). The
QIDs come from a Wikidata search made on 2026-10-02: check each description before use, and
look up the missing ones (never type a QID from memory).

| `firms` | Wikidata: office, founder | Notes |
|---|---|---|
| Alvar Aalto | Q82840 | ~130 works in Wikidata, most in Finland |
| BIG | Q2481701, Q429817 (Bjarke Ingels) | PLOT (BIG + JDS, 2001–2006) counts; done 2026-10 |
| Foster + Partners | look up the office; Q104898 (Norman Foster) | Foster Associates counts; Norman Foster in TOP_TIER_FIRMS is the same firm |
| Frank Gehry | Q180374 | |
| Kengo Kuma | Q725462 | |
| MVRDV | Q932801 | |
| OMA | Q2015762, Q232364 (Rem Koolhaas) | |
| Renzo Piano Building Workshop | Q100604548, Q190148 (Renzo Piano) | Piano & Rogers (Centre Pompidou) counts |
| Santiago Calatrava | Q168482 | |
| Snøhetta | Q511335, Q1813434 (Kjetil Trædal Thorsen), Q5180916 (Craig Dykers) | done 2026-10 |
| Tadao Ando | Q208220 | |
| Zaha Hadid Architects | Q8064602, Q47780 (Zaha Hadid) | |

A big firm is a long run: work in batches of about 20 works, each written and verified
(§7) before the next.

## 1. Candidates from Wikidata
Query the works whose architect (P84) is the office or its founder: many are credited to the
person, not the office (Renzo Piano has 79, his Building Workshop 3).

```sparql
SELECT ?b ?bLabel ?bDescription ?coord ?img ?countryLabel ?placeLabel ?inception ?opening
  (GROUP_CONCAT(DISTINCT ?typeLabel; separator="|") AS ?types) WHERE {
  VALUES ?architect { wd:Q… wd:Q… }   # the office and its founder
  ?b wdt:P84 ?architect .
  FILTER NOT EXISTS { ?b wdt:P576 [] }  # demolished or dissolved
  OPTIONAL { ?b wdt:P625 ?coord } OPTIONAL { ?b wdt:P18 ?img }
  OPTIONAL { ?b wdt:P17 ?country } OPTIONAL { ?b wdt:P131 ?place }
  OPTIONAL { ?b wdt:P571 ?inception } OPTIONAL { ?b wdt:P1619 ?opening }
  OPTIONAL { ?b wdt:P31 ?type . ?type rdfs:label ?typeLabel FILTER(LANG(?typeLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?b ?bLabel ?bDescription ?coord ?img ?countryLabel ?placeLabel ?inception ?opening
```
Endpoint: https://query.wikidata.org/sparql, with a custom User-Agent. The types give away
what is not built: "proposal", "proposed tower", "unfinished building", "destroyed building"
(BIG's list had five such items).

Most works found later (on the firm's site, §2) have a Wikidata item that does not name the firm as
architect: search Wikidata for each one by its local name too, not only the English one (Snøhetta's
Tungestølen and Prøysenhuset were found only in Norwegian), and store the QID. It is worth it for the
photos as much as for the point: the item's image, category and "depicts" files come only with it.

## 2. Confirm on the firm's website
For every candidate, find its project page on the firm's own site: it confirms that the firm
designed it and that it is built. Then go through the site's list of projects and add the
completed works that Wikidata lacks (the recent ones usually: Wikidata had 30 BIG works, the
site 60 built ones).

Look at the page source before reading pages one by one: many sites carry their data as
JSON (JSON-LD, or the data of a Next.js page) with the status, the location, the year and
often coordinates. big.dk had, for each project, `"status":"Completed"`, `"location"`,
`"year"`, `"latitude"`, `"longitude"`. Fetch at most one page a second, and keep what you
fetched in a file in the scratchpad, so a long run can resume.

Use the site's own filters and its list pages, and count what they give. snohetta.com filters by
status (completed, under construction, proposal) and by discipline (architecture, landscape, interior,
product, brand): architecture and landscape gave the candidates, interior, product and brand alone what
to leave out. Its map view lists only the projects that have coordinates (232 of the 294 completed ones);
the paginated list has them all. A "completed" status can still hide a proposal or a masterplan (the
project's name or its text says so): read the page of each candidate.

Leave out, as city-top does: interiors (shops, restaurants, offices, flats, fair stands; BIG's
Galeries Lafayette and its own offices), products and furniture, exhibitions, ephemeral and
expo pavilions and installations (Serpentine, Expo), masterplans, unbuilt and competition
projects, and works still under construction (the site's status says so; a news article
"X unveils…" is a proposal). Leave out a work the firm only renovated in a small way, or where
it was only a consultant. Leave out private homes (a family's house or cabin, Villa Gug): they
are not places to visit, and a pin on them points at private people. A work that is not on
the firm's site and has no other source that credits the firm stays out; name it in the report.

Decisions from the Snøhetta run, to keep the firms consistent:
- out: homes for vulnerable residents (Karmøy Pilot Homes) and amenities for residents only
  (Pavilia Farm clubhouses); an observation deck or interior inside another architect's tower (SUMMIT
  One Vanderbilt); a renovation where the firm did the museography or the interior of a historic
  building (Musée Carnavalet, Musée de la Marine); festival stages and pavilions put up for an event;
  small objects (a birdhouse);
- in: permanent public installations and landscapes (Arch for Archbishop Tutu, Lech Mountain Mirror,
  Trælvikosen), a major rehabilitation the firm led (Théâtre Nanterre-Amandiers), care buildings that
  are not homes (Outdoor Care Retreats, Maggie's Centre), and a work missing from the firm's site but
  credited to it by ArchDaily (Haier, Hussein bin Talal Park: no `firmPage`).

Some firms have no full list of their works online: Alvar Aalto (died 1976; his works are kept
by the Alvar Aalto Foundation), and sites that show only a selection (check Tadao Ando's and
Frank Gehry's). There the official list is the foundation's or the archive's when one exists;
otherwise a work is confirmed by a registry (Docomomo, heritage lists) or by two independent
sources that credit the architect and describe the building as built. Say in the report which
list served as the firm's.

## 3. Links
`firmPage`: the url of the work's page on the firm's site (or the foundation's, §2), the page of
this project, not the list of projects or the home page. The card links to it as "Read more on
official website". No such page, no `firmPage`.

Sources, as in city-top §1: architecture media (ArchDaily, Dezeen, Divisare, Metalocus,
Wallpaper*), awards, registries, Arquitectura Viva (one vote, never its coordinates). Each
source needs publisher, title, url and date.
- ArchDaily has a search API: `https://www.archdaily.com/search/api/v1/us/projects?q=<firm>&page=<n>`;
  each result has `url`, `title`, `offices`, `location`, `year`, `publication_date`. Keep the
  results whose `offices` include the firm, and only project pages (a built work with a year),
  not news of a design.
- AV: the works map dataset (city-top Hard rules) lists the firm in `author`. A work there gets
  an AV vote, and `refs.av` on its point when the AV pin is not a copy of the firm's (§4). AV also
  lists works that were never built (Snøhetta's Houston transit station): the firm's status decides.

## 4. Location
As city-top §4. In short: a point is confirmed when two independent sources agree within 150 m,
or when the OSM object's own tags name the work (`wikidata`, `architect`). It is stored as
approximate (a dashed pin, "Approximate location" on the card) when another source is near the
work's OSM building (2 km when the names match, 500 m otherwise), or when an OSM building of the
work's name lies alone inside its town. Geotagged Commons photos of the card and AV only confirm.

Work through the sources in this order, and stop when the point is confirmed:
1. Wikidata P625, and OSM by name: the English name, then the local ones (the Wikidata labels in
   all languages, the local Wikipedia). Nominatim first, at most one request a second.
2. The firm's own coordinates, in `refs.other` with `"source": "firm"`. They often mark the
   town or the entrance of the grounds (BIG put Shenzhen Energy Mansion 35 km off), so they
   confirm rather than place; the near rule exists for them. Leave out a firm point that several
   projects share or that is the town's centre (Snøhetta's site gives 43 projects the same point in
   Oslo): it says nothing about the work, and it would agree with another geocoded source.
3. ArchDaily: a project page carries the work's coordinates (`"latitude"`, `"longitude"` in its
   source). Put them in `refs.other` with `"source": "archdaily"`. They are often as rough as the
   firm's (Under 11 km off, Tungestølen 24 km, Lascaux IV 37 km) and sometimes copied from the firm's
   (the same point within a few metres: keep one of the two).
4. Where the texts say the work is: an address, a street, a campus (the firm's page, the
   sources, city sites). Search OSM for the address and take the building itself (or the OSM
   address point), not the campus or the institution the text names.
5. Registries with coordinates: Docomomo; for Spain the Catastro by address; for Catalonia
   the Arquitectura Catalana catalogue; the official address registries of Norway, the Netherlands
   and France for an address the texts give (city-top §4).
6. A geotagged Commons photo of the work: search Commons, not only the Wikidata image, and
   add it to the card if it is a good photo (§5).

If Nominatim does not find a building, Geoapify (`GEOAPIFY_API_KEY` in `.env`) matches names
more loosely; it is OSM too: store the OSM id it leads to (place details), never its result.
Overpass is often down or slow (504s, timeouts): send small queries (`around:` a node or a
small bbox, never a whole city's area) and switch mirrors. Run a long lookup in the background,
with its results in a file, so it can resume.

When OSM knows the work by another name, a former or a local one, and Wikidata has no item to
carry it, add that name to the title in parentheses ("Google Gradient Canopy (Charleston
East)"): the name check (city-top §4) reads the title.

Every place still says where it is in `area`:
- in a city file: the district or municipality, as city-top does;
- in world.json: `"City, Country"` in English (`"Billund, Denmark"`). The card shows it when
  there is no point, so it must be right even when the coordinates are not. Add the state when
  the town's name is not unique (`"Bowling Green, Ohio, United States"`: Nominatim finds the one
  in Kentucky first). For such a place
  the script stores `areaBounds`, the bounds of that town: the card is listed while the map
  shows it.

## 5. Photos
As city-top §5: Wikimedia Commons, Flickr and Unsplash, free licenses, freedom of panorama checked.
Never the firm's photos or press kits, on Flickr or Unsplash either: they belong to the photographers and are
licensed for press about the firm, not for this map. No photo is better than a non-free one.

Search with `node scripts/photoCandidates.js world --only <ids>` (city-top §5): the geosearch around
the work's point, Flickr and Unsplash find most photos of new works, which Commons rarely categorises. Look at
every candidate on the contact sheets, then `--pick` the chosen ones.
Reject: photos of the construction site, renderings, signs, interiors as the first photo, and
the building that stood there before or the institution's older building (the Wikidata image
of Noma shows its old warehouse, that of Gammel Hellerup Gymnasium the old school).

## 6. Where each work goes
- **Inside a city.** The work is in a city of `public/top/index.json` or its metro area
  (reachable by public transport, as city-top §2 scopes a city; Copenhagen's list reaches
  Humlebæk, so Helsingør is in): write it to that city's file. If the city already has the
  place (same Wikidata QID or OSM id, or plainly the same building), add `firms` and
  `firmPage` to it and keep its sources. A card of works by several firms gets no `firmPage`:
  one link would not cover it.
- **Beyond the cities:** write it to `public/top/world.json`.

Group: `architecture`, or `unusual` / `parks` when that fits better; never `city-core` for a
new card. Before adding, search every file in `public/top/` for the QID, the OSM id and the
title: a work is stored once.

## 7. Write and verify
1. Write the places (schema below), keeping the existing places and sources of each file.
2. Run `node scripts/verifyTop.js world --only <ids>` and `node scripts/verifyTop.js <city> --only <ids>`
   with the ids you added or changed: only they are checked online, and the rest of the file
   stays as it is. No errors; review every warning. `git diff` shows only your places.
3. For each place left without a point, do the steps of §4 that have not been tried, and run
   the script again.
4. Run the app: on the home page check a pin of world.json opens its card; in a city check a
   new work and its "Top architecture firm" label; look at each approximate point (`approximate`
   in the file: `near`, `osmOnly`, `singleSource`) on the map, on a satellite view when the base map
   shows no building.
5. Report to the user: works found in Wikidata, on the firm's site, and kept; what was left
   out and why; places without a location or a photo, and those left without a photo by freedom of
   panorama; the approximate points; the cities whose files changed.

## Schema (public/top/world.json)
The same as a city file (city-top), without `cover`:
```json
{
  "id": "world", "name": "Beyond cities", "updated": "YYYY-MM-DD",
  "sources": { "<source-id>": { "publisher": "ArchDaily", "author": null, "title": "…",
    "url": "…", "date": "2017-10-03", "type": "media" } },
  "places": [{
    "id": "lego-house", "title": "LEGO House", "architect": "BIG", "year": "2017",
    "area": "Billund, Denmark", "group": "architecture", "firms": ["BIG"],
    "firmPage": "https://big.dk/projects/lego-brand-house-2740",
    "sources": ["<source-id>"], "why": null, "note": null,
    "points": [{ "name": null, "refs": { "wikidata": "Q…", "osm": "way/…",
      "other": [{ "source": "firm", "url": "<firmPage>", "lat": 0, "lng": 0 }] } }],
    "shapes": [],
    "photos": [{ "file": "Commons file name" }, { "flickr": "https://www.flickr.com/photos/<user>/<id>/" },
      { "unsplash": "https://unsplash.com/photos/<slug>-<id>" }]
  }]
}
```
In a city file a firm work has the same fields: `firms`, `firmPage`, and `why` may be null.
The script adds `lat`, `lng`, `verifiedBy` (and `approximate` with `near`, `osmOnly` or `singleSource`)
to a point, and `areaBounds` to a work beyond the cities without a location.
