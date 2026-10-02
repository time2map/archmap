---
name: city-top
description: Research and build the TOP list of places for a city — city-core must-sees, architecture (contemporary housing and quarters, notable buildings), unusual architecture, parks and public spaces, including districts and promenades shown as areas and lines — with verified locations and free-licensed photos, into public/top/<city>.json for the archmap TOP tab. Use when asked to build/collect a top list ("собрать топ", "топ мест") for a city.
---

# City TOP

Audience: travellers who value aesthetics, beauty and architecture. Everything the
user sees is in English.

## Hard rules
- Do NOT read the local data.json / public/data.json. For Arquitectura Viva use the live
  map dataset https://arquitecturaviva.com/assets/uploads/obras/all-en.json (and
  all-es.json — the data behind https://arquitecturaviva.com/mapa) or the work page
  (coords are in its map link). AV is a vote and a check for a location, never the stored
  coordinate: its map is AV's own database. Do not copy AV coordinates into the city file,
  `other` included.
- No quotes from people in card text. Write in your own words; the sources are linked.
- No temporary content: exhibitions, event programmes, guided-visit schedules, opening days.
- Never recommend tours or tour operators (bus, walking, guided).
- Exclude interior-only projects (shops, restaurants, flat refurbishments, fair stands),
  ephemeral installations, and unbuilt or competition projects.
- A point or a shape goes on the map only when verified (§4). Otherwise the card stays,
  without it.
- Areas and lines come only from OpenStreetMap objects. Never draw or trace geometry by hand.
- Photos only from Wikimedia Commons under CC0 / PD / CC BY / CC BY-SA, with author,
  license and link to the file, and only where freedom of panorama allows commercial use (§5).

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
AV also confirms locations (§4), but its coordinates are never stored.

Vote rule: one vote = one independent author or outlet. The same author in several outlets
is one vote. For every source record: publisher, author, title, url, publication date
(ISO `YYYY-MM-DD`, `YYYY-MM` or `YYYY`; null if the page does not state one).

## 2. Select places
- Up to 100 places per city. 100 is a ceiling, not a target: stop when the sources run
  out of places worth a trip, and never pad the list. The reader filters and chooses.
  Take every place with ≥2 votes first, then 1-vote places, preferring award winners,
  registry entries and Arquitectura Viva.
- Order (the UI applies it): votes, has a photo, has a location on the map, number of
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
  - `architecture` — notable individual buildings, and residential buildings and quarters;
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
official site; for Catalonia the Arquitectura Catalana catalogue of the College of Architects
(arquitecturacatalana.cat: each work page has its coordinates); for Spain the Catastro, which
gives the coordinates of the parcel at an address (OVC services: `Consulta_DNPLOC` for the
address, then `Consulta_CPMRC` with `SRS=EPSG:4326`; check that the parcel it returns is the
number you asked for, a missing number returns a neighbour). Put such a coordinate in
`refs.other` with the catalogue's url. An OSM address point (`place=house`) at the place's
address counts as the OSM object when there is no building with that address.
Two pins that coincide within a few metres in two sources (a firm's site and AV) were copied
from one another: count them as one source. The script adds the Commons coordinates of the card's photos by itself: the
camera location and the object location. They only confirm, like AV, and only on a card with
one point (in an ensemble a photo may show another building).
Accept when two independent sources agree within 150 m. The stored coordinate comes from
OSM, Wikidata or another source; AV can only confirm it.
An OSM building is also accepted when another source puts the place near it: architects, media
and AV often pin the entrance of the grounds or the middle of the town, while OSM has the
building itself. It must be a building or a structure (not a street or an area); a landuse
counts only when it bears the place's name (the plot of a building). Within 2 km when its OSM
name matches the place's name or one of the names of its Wikidata item in any language (all
significant words, or for Chinese and Japanese a part of 4+ characters); within 500 m when the
name differs (the name of the whole institution).
Search OSM by the local name, not only the English one: OSM often has only the name in the
local script (Shenzhen Energy Mansion is 能源大厦). Take the local names from the place's
Wikidata item (labels in all languages) and from its Wikipedia article in the local language.
When the name finds nothing, read where the place is in the texts about it (the architect's
project page, the sources): a street, an address, a campus. Search OSM for that address and
take the building itself, not the campus or the institution named in the text (Google Bay View
is "at the NASA Ames Research Center": the buildings are 100–300 Bay View Drive, a kilometre
from NASA's own point). Unnamed buildings are common for new works; a geotagged Commons photo
of the place (search Commons, not only the Wikidata image) often supplies the second source. The point is stored
with `near` listing the other sources; check a point accepted this way on the map. Geocoders built on OSM (Nominatim, Geoapify)
are OSM, not a second source; use them to find the OSM object, then store its id.
A single source is allowed only for a landmark whose Wikidata item has a Commons category; it
is flagged `singleSource`.
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

### Freedom of panorama
The photo's license covers only the photographer. The building, landscape design,
sculpture or artwork in it has its own author. Before choosing photos, read the country's
page on Commons: `COM:FOP <country>` (https://commons.wikimedia.org/wiki/COM:FOP_France).
- Freedom of panorama covers commercial use (Spain, LPI art. 35.2): any photo taken from a
  public place is fine.
- It does not (France: non-commercial only; Italy: none): do not take a photo whose main
  subject is a work still under copyright, that is, one of its authors is alive or died
  less than 70 years ago (the country's term is on the same page). A protected work that is
  only incidental in a wider view is fine (a modern kiosk on a historic square); a view
  framed or cropped to it is not. Such a place keeps its card with photos of its parts that
  are out of copyright, or with no photo.
Commons tags some of these photos `{{NoFoP-<country>}}`, and the script rejects them. Most
are not tagged, so the check is yours.

### Cover
`cover` is the city's picture in link previews and search results (og:image of `/<city>/`).
Pick it from the photos already in the file: a landscape exterior view of a city-core place
that anyone would recognise as the city (Paris: the Eiffel Tower; Barcelona: the Sagrada
Família). Check on Commons that the file is wider than it is tall.

## 6. Write and verify
1. Write public/top/<city>.json (schema below) and add the city to public/top/index.json.
2. Run `node scripts/verifyTop.js <city>`: no errors; review every warning.
3. Run the app, open `/<city>/`, screenshot desktop 1440×900 and mobile 390×844,
   click one card, one marker and one shape.
4. Report to the user: number of places, sources with dates, places without a location or
   photo, the country's freedom of panorama and the places left without photos because of
   it, places left out at the coverage check and why, open doubts.

## Schema (public/top/<city>.json)
```json
{
  "id": "barcelona", "name": "Barcelona", "updated": "YYYY-MM-DD",
  "cover": "Commons file name of one of the photos below",
  "sources": {
    "<source-id>": { "publisher": "ArchDaily", "author": "Miguel Picado",
      "title": "…", "url": "…", "date": "2017-09-20",
      "type": "media|architect|registry|award|tourism|blogger" }
  },
  "places": [{
    "id": "…", "title": "local name", "architect": "…", "year": "…", "area": "…",
    "group": "city-core|architecture|unusual|parks",
    "firms": ["only for works of top firms, see the firm-works skill"],
    "firmPage": "https://… the work's page on the firm's site, only with firms",
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
