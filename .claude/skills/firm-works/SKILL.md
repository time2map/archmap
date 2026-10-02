---
name: firm-works
description: Collect the built works of one top architecture firm (the TOP_TIER_FIRMS list in src/Map.jsx) worldwide — candidates from Wikidata, confirmed and completed on the firm's own website — with links to read about each work, verified locations and free-licensed photos, into the city files public/top/<city>.json (works inside a city) and public/top/world.json (works beyond the cities). Use when asked to collect the works of a firm ("собери постройки BIG", "collect works of MVRDV").
---

# Firm works

One run covers one firm. The firms are the `TOP_TIER_FIRMS` list in `src/Map.jsx`; do not
add or drop firms. Norman Foster and Foster + Partners are one firm: write "Foster + Partners".

Every rule of the `city-top` skill (`.claude/skills/city-top/SKILL.md`) applies unless this
file says otherwise: its Hard rules, §1 sources and votes, §4 locations and pitfalls,
§5 photos and freedom of panorama. Read it first.

What differs from city-top:
- No `why`. The card shows the links to read about the work; that is enough.
- Every completed work of the firm is taken: there is no vote threshold and no 100-place
  ceiling. One source is enough, and the firm's own project page is a source.
- Every place gets `"firms": ["<firm name as in TOP_TIER_FIRMS>"]`.

## 1. Candidates from Wikidata
Query works whose architect (P84) is the firm or its founder. Many works are credited to a
person, not the office (Renzo Piano, Norman Foster, Zaha Hadid, Bjarke Ingels, Rem Koolhaas),
so query both. Take every QID from a search result and check its description; never type
one from memory.

```sparql
SELECT ?b ?bLabel ?coord ?img ?countryLabel ?placeLabel ?inception ?opening WHERE {
  VALUES ?architect { wd:Q… wd:Q… }   # the firm and its founder
  ?b wdt:P84 ?architect .
  FILTER NOT EXISTS { ?b wdt:P576 [] }  # demolished or dissolved
  OPTIONAL { ?b wdt:P625 ?coord } OPTIONAL { ?b wdt:P18 ?img }
  OPTIONAL { ?b wdt:P17 ?country } OPTIONAL { ?b wdt:P131 ?place }
  OPTIONAL { ?b wdt:P571 ?inception } OPTIONAL { ?b wdt:P1619 ?opening }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```
Endpoint: https://query.wikidata.org/sparql, with a custom User-Agent.

## 2. Confirm on the firm's website
For every candidate, find its project page on the firm's own site. It confirms that the firm
designed it and that it is built. Then go through the site's list of projects and add the
completed works that Wikidata lacks (recent ones usually).

Leave out, as city-top does: interiors (shops, restaurants, flats, fair stands), ephemeral
pavilions and installations, unbuilt and competition projects, and works still under
construction. Leave out a work the firm only renovated in a small way, or where it was only
a consultant. A work that is not on the firm's site and has no other source that credits the
firm stays out; name it in the report.

## 3. Links
Collect the sources as in city-top §1: the firm's project page (`type: architect`),
architecture media (ArchDaily, Dezeen, Divisare, Metalocus, Wallpaper*), awards, registries,
Arquitectura Viva (one vote, never its coordinates). Each source needs publisher, title, url
and date. The firm's page and other pages of the same firm are one source.

## 4. Location
As city-top §4: a point is stored when two independent sources agree within 150 m, or when
another source is near the work's OSM building: within 2 km when the names match, within
500 m otherwise. The firm's own
coordinates often mark the town or the entrance of the grounds: put them in `refs.other`, they
confirm the OSM building. If Nominatim does not find the building, try Geoapify geocoding
(`GEOAPIFY_API_KEY` in `.env`): it matches names more loosely, but it is OSM too, so store the
OSM id it leads to (place details), never the Geoapify result itself. Without that, the place
has no point.

Every place still says where it is in `area`:
- in a city file: the district or municipality, as city-top does;
- in world.json: `"City, Country"` in English (`"Billund, Denmark"`). The card shows it when
  there is no point, so it must be right even when the coordinates are not.

## 5. Photos
As city-top §5: Wikimedia Commons only, free licenses, freedom of panorama checked. Never
the firm's photos or press kits: they belong to the photographers and are licensed for
press about the firm, not for this map. No photo is better than a non-free one.

## 6. Where each work goes
- **Inside a city.** The work is in a city of `public/top/index.json` or its metro area
  (reachable by public transport, as city-top §2 scopes a city): write it to that city's file,
  group `architecture`. If the city already has the place (same Wikidata QID or OSM id, or
  plainly the same building), only add `firms` to it: its sources are recommendations, and
  the firm's own page is not one, so it would inflate the count.
- **Beyond the cities:** write it to `public/top/world.json`, group `architecture` (or
  `unusual` / `parks` when that fits better; never `city-core`).

Before adding, search every file in `public/top/` for the QID and the OSM id: a work is
stored once.

## 7. Write and verify
1. Write the places (schema below), keeping the existing places and sources of each file.
2. Run `node scripts/verifyTop.js world` and `node scripts/verifyTop.js <city>` for every city
   file you changed: no errors; review every warning.
3. Run the app: on the home page check a pin of world.json opens its card; in a city check a
   new work and its "Top architecture firm" label.
4. Report to the user: works found in Wikidata, on the firm's site, and kept; what was left
   out and why; places without a location or a photo; the cities whose files changed.

## Schema (public/top/world.json)
The same as a city file (city-top), without `cover`:
```json
{
  "id": "world", "name": "Beyond cities", "updated": "YYYY-MM-DD",
  "sources": { "<source-id>": { "publisher": "BIG", "author": null, "title": "…",
    "url": "…", "date": null, "type": "architect" } },
  "places": [{
    "id": "lego-house", "title": "LEGO House", "architect": "BIG", "year": "2017",
    "area": "Billund, Denmark", "group": "architecture", "firms": ["BIG"],
    "sources": ["<source-id>"], "why": null, "note": null,
    "points": [{ "name": null, "refs": { "wikidata": "Q…", "osm": "way/…" } }],
    "shapes": [],
    "photos": [{ "file": "Commons file name" }]
  }]
}
```
In a city file a firm work has the same fields: `firms`, and `why` may be null.
