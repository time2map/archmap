---
name: city-top
description: Research and build the TOP list of places for a city — city-core must-sees, contemporary housing and quarters, notable buildings, unusual architecture, parks and public spaces, including districts and promenades shown as areas and lines — with verified locations and free-licensed photos, into public/top/<city>.json for the archmap TOP tab. Use when asked to build/collect a top list ("собрать топ", "топ мест") for a city.
---

# City TOP

Audience: travellers who value aesthetics, beauty and architecture. Everything the
user sees is in English.

## Hard rules
- Do NOT read the local data.json / public/data.json. For Arquitectura Viva use the live
  map dataset https://arquitecturaviva.com/assets/uploads/obras/all-en.json (and
  all-es.json — the data behind https://arquitecturaviva.com/mapa) or the work page
  (coords are in its map link).
- No quotes from people in card text. Write in your own words; the sources are linked.
- No temporary content: exhibitions, event programmes, guided-visit schedules, opening days.
- Never recommend tours or tour operators (bus, walking, guided).
- Exclude interior-only projects (shops, restaurants, flat refurbishments, fair stands),
  ephemeral installations, and unbuilt or competition projects.
- A point or a shape goes on the map only when verified (§4). Otherwise the card stays,
  without it.
- Areas and lines come only from OpenStreetMap objects. Never draw or trace geometry by hand.
- Photos only from Wikimedia Commons under CC0 / PD / CC BY / CC BY-SA, with author,
  license and link to the file.

## 1. Collect recommendations
Search each source type in English, the local language(s) and Russian:

| Type | Examples |
|---|---|
| Architecture media city guides | ArchDaily "Architecture City Guide: <City>", Metalocus, Dezeen, Wallpaper*, Divisare |
| Travel guides | top sights of Lonely Planet, Rough Guides, Time Out, Guardian / NYT city guides |
| Architects, architect-bloggers, architecture photographers | Virginia Duran city guides; photo series such as Roberto Conte's |
| Registries | Docomomo, SOS Brutalism; heritage at the highest level: UNESCO, national and regional lists (Spain: BIC; Catalonia: BCIN) |
| Awards | EUmies (winners, shortlist, nominees), national and regional awards, local college of architects, city awards |
| Official tourism | the city tourism portal: its top sights and architecture pages |
| Urbanists and bloggers | local and Russian-language (e.g. Varlamov) |
| Open House | editorial articles only, not the event programme |
| Landscape and public space | Landezine, European Prize for Urban Public Space, the city's curated list of historic or featured gardens (not the full park register), local press on parks |
| Arquitectura Viva | the place is in the AV works map dataset, or AV has an article or book about it |

Not counted as votes: SEO/AI listicles, aggregators (TripAdvisor, travel-app lists), tour
operators and their itineraries, event programmes (architecture weeks, Open House
schedules, guided-visit lists).
Arquitectura Viva counts as one vote per place (map entry, article or book — at most one AV
vote per place). The entry must be about the place itself: an interior refurbishment inside
a building (e.g. a flat in Torres Blancas) does not count as a vote for that building. For
an ensemble card, one AV entry for any of its buildings is enough.
AV is also a coordinate source (§4).

Vote rule: one vote = one independent author or outlet. The same author in several outlets
is one vote. For every source record: publisher, author, title, url, publication date
(ISO `YYYY-MM-DD`, `YYYY-MM` or `YYYY`; null if the page does not state one).

## 2. Select places
- Up to 100 places per city. 100 is a ceiling, not a target: stop when the sources run
  out of places worth a trip, and never pad the list. The reader filters and chooses.
  Take every place with ≥2 votes first, then 1-vote places, preferring award winners,
  registry entries and Arquitectura Viva.
- Order (the UI applies it): has a location on the map, has a photo, votes, number of
  photos, title.
- Scope: the city and its metro area, if the place is reachable by public transport;
  put the municipality in `area` (e.g. "Sant Just Desvern").
- group — one per place:
  - `city-core` — the places that define the city: what a first-time visitor must see to
    understand it. Historic centre and districts, cathedral, main landmarks and icons of
    any era, main promenades, boulevards and viewpoints (Barcelona: Sagrada Família, Park
    Güell, Gothic Quarter, the seafront, Tibidabo). Criterion: in the top sights of ≥2
    independent general sources (official tourism portal, travel guides), or listed at the
    highest heritage level (UNESCO, BIC/BCIN) and recommended by at least one other source.
    Usually 15–25 per city. A city-core place goes here, not to the group of its architecture.
    When more places qualify, keep the ones that shape the city's image and public life —
    districts, squares, boulevards, promenades, parks, viewpoints, the main icons (UNESCO) —
    and leave other museums and single houses in their groups.
  - `housing` — residential buildings and quarters;
  - `buildings` — notable individual buildings;
  - `unusual` — brutalist, organic, experimental;
  - `parks` — parks, gardens and public spaces where locals walk and sit. Prefer the
    non-touristy ones; a good park is worth a card even with few architecture votes.
    Ticketed tourist landmarks are not `parks`: they go to `city-core` if they qualify,
    otherwise to the group that fits their architecture.
- An ensemble (colonia, tower cluster, campus) is one card with one point per building.
  A district, quarter, square, park or promenade gets a shape (§4), plus points for its key
  buildings if they matter (Gothic Quarter: the area and the cathedral).
- why: 1–2 sentences in your own words: what makes it worth seeing (form, material,
  space, urban idea). Facts only, no marketing.

## 3. Coverage check
Before writing the file, compare the list with:
1. the top sights of the official tourism portal;
2. the top sights of two travel guides;
3. the places in the city at the highest heritage level (UNESCO, BIC/BCIN);
4. the city's curated list of historic or featured gardens.
Every place that appears in ≥2 of these and is missing from the list: add it, or give the
reason for leaving it out in the report. (Barcelona's first run missed Teatre Grec,
Arc de Triomf, Tibidabo and the seafront because this check was not there.)

## 4. Locations
### Points
For each point collect candidates: Wikidata P625; OSM (Nominatim or Overpass, ≤1 request/s,
custom User-Agent); AV map dataset or work page; Docomomo page (its Google Maps link);
official site.
Accept when two independent sources agree within 150 m. A single source is allowed only
for a landmark whose Wikidata item has a Commons category; it is flagged `singleSource`.
Otherwise: no point, and the card shows "No confirmed location".

### Areas and lines
- `area` — the OSM relation or way of the place itself: a neighbourhood or district
  boundary (Barcelona: `relation/4127655`, el Gòtic), `leisure=park`, `place=square`.
  Any size — a whole district is fine; the map shades areas lightly.
- `line` — the OSM ways of a street or promenade. Find the ids with Overpass, e.g.
  `way(area.city)["name"="Passeig Marítim de la Barceloneta"]["highway"]`; mirrors:
  maps.mail.ru/osm/tools/overpass, overpass.private.coffee, overpass-api.de (often down).
  Take the main walking axis; leave out parallel sidewalks and service roads. A promenade
  whose name changes along the way (a seafront) is one line built from several streets.
- A shape is accepted when a second source's point (Wikidata P625, AV, other) lies inside
  the area or within 150 m of its outline or of the line. Otherwise the shape stays off the map.

### Known pitfalls
- Wikidata can be wrong (Madrid: Fundación Giner de los Ríos placed in Texas).
- AV puts unbuilt and competition entries at the city centroid, and some pins are simply off
  (La Ricarda 2.8 km away; Caleido pinned on the neighbouring tower).
- Wikidata search returns homonyms: check the description (MareNostrum is a supercomputer,
  not Torre Mare Nostrum; "La Fàbrica" found first is a building in another comarca).
- The name is not the street (Edificio Princesa stands on Glorieta de Ruiz Jiménez).
- Large ensembles (parks, superblocks, trade fairs) fail the 150 m point check because each
  source pins a different part: give them an area instead.
- Never type a QID or an OSM id from memory: take it from a search result and check its
  description (a remembered QID for the Palacio de Cristal was a house in Quedlinburg).
  OSM ids stored in Wikidata (P402, P10689) can be outdated.
- An OSM street is dozens of ways, most of them sidewalks and crossings: keep the
  carriageway or the pedestrian axis and plot the ways before storing them.
- Administrative boundaries follow the city's districts, not the historic area
  (Barcelona's el Gòtic includes a pier of the port). Say so in `note` or pick a park or
  square object instead.
- Overpass mirrors come and go; when one times out, try the next.
- Check who publishes a site: meet.barcelona belongs to the City Council, while
  thisisbarcelona.com belongs to Turisme de Barcelona; two sites of one publisher are one vote.

Store the refs (wikidata / osm / av / other) in the city file.
`node scripts/verifyTop.js <city>` fetches them, cross-checks them and writes lat/lng for
points, and geometry plus a pin position for shapes. Check every shape on a screenshot:
the right outline, no stray pieces.

## 5. Photos
Commons only. Prefer current, recognisable exterior views. Open every thumbnail and check
that it shows the right building. Reject scans of old publications, neighbouring
buildings and watermarked images.
Up to 5 photos per card: different views of a building, or different buildings of an
ensemble; exterior first, then a public interior if there is one. The first photo is also
the map pin, so make it the most recognisable one. Fewer is fine; no photo is better than
a wrong or non-free one. The script fills in author, license, the 960 px image and the
120 px pin thumbnail, and rejects non-free licenses.

## 6. Write and verify
1. Write public/top/<city>.json (schema below) and add the city to public/top/index.json.
2. Run `node scripts/verifyTop.js <city>`: no errors; review every warning.
3. Run the app, open `#top/<city>`, screenshot desktop 1440×900 and mobile 390×844,
   click one card, one marker and one shape.
4. Report to the user: number of places, sources with dates, places without a location or
   photo, places left out at the coverage check and why, open doubts.

## Schema (public/top/<city>.json)
```json
{
  "id": "barcelona", "name": "Barcelona", "updated": "YYYY-MM-DD",
  "sources": {
    "<source-id>": { "publisher": "ArchDaily", "author": "Miguel Picado",
      "title": "…", "url": "…", "date": "2017-09-20",
      "type": "media|architect|registry|award|tourism|blogger" }
  },
  "places": [{
    "id": "…", "title": "local name", "architect": "…", "year": "…", "area": "…",
    "group": "city-core|housing|buildings|unusual|parks",
    "sources": ["<source-id>"], "why": "…", "note": null,
    "points": [{ "name": "building name inside an ensemble, else null",
      "lat": 0, "lng": 0,
      "refs": { "wikidata": "Q…", "osm": "way/…", "av": "<slug>",
        "other": [{ "source": "docomomo", "url": "…", "lat": 0, "lng": 0 }] },
      "verifiedBy": ["wikidata", "osm"] }],
    "shapes": [{ "name": "Gothic Quarter", "kind": "area|line",
      "refs": { "osm": ["relation/…", "way/…"], "wikidata": "Q…", "av": "<slug>", "other": [] },
      "lat": 0, "lng": 0, "geometry": { "type": "MultiPolygon|MultiLineString", "coordinates": [] },
      "verifiedBy": ["osm", "wikidata"] }],
    "photos": [{ "file": "Commons file name", "src": "…", "thumb": "…", "page": "…",
      "author": "…", "license": "…", "licenseUrl": "…" }]
  }]
}
```
Only `file` is needed for a photo, and only `refs` for a point or a shape: the script fills
in the rest. `date` may be null. `points` and `shapes` may be empty.
