# ArchMap

Maps of architecture worth a trip, for travellers who care about beauty and good buildings.

Site: https://archmap.time2map.com

## TOP

Hand-picked places in each city: must-sees, and also housing, parks and new buildings that
most guidebooks leave out. Cities so far: **Madrid**, **Barcelona**, **Bordeaux**, **Valencia**
and **Paris**.

- **All cities** on the home page: a map with every city's cover photo and a list of the cities.
  Click a city to fly into it and open its page; "All cities" in the city picker, or Back, flies out again.
  Zoomed in, a city's cover turns into its places; zooming out of an open city folds it back.
- **Top architecture firms:** the works of the firms in `TOP_TIER_FIRMS` (`src/Map.jsx`) are always on
  the map. Inside a city they are among its places; elsewhere they are listed under "Beyond cities",
  as dots while the map is zoomed out and photo pins from zoom 6. Their cards carry a
  "Top architecture firm" label, a "Read more on official website" link to the work's page on the
  firm's site, and links to read about them instead of a note. A work without a
  confirmed location is listed under "Not on the map yet" with its city and country.
- **Four groups:** City core (the must-sees), Architecture (notable buildings, contemporary housing
  and quarters), Unusual (unusual architecture) and Parks (parks and public spaces).
- **Place cards** show photos, the architect and year, a short note on why the place is worth
  a visit, and who recommends it: architecture media, travel guides, architects, heritage
  registries and awards. The number on each card counts independent authors and outlets.
- **Filters** by group and by number of mentions (any, 2+, 3+).
- **Map:** pins carry the place's photo and the colour of its group. Districts, parks and
  promenades appear as areas and lines. Click a card to fly to the place, or a pin to open its card.
- **Checked locations:** a place gets a pin only when its location is confirmed. Otherwise
  the card stays in the list with a "Find in Google Maps" link.
- **Photos** come from Wikimedia Commons under free licences, credited with author and licence.
- **Each city has its own page**, e.g. `archmap.time2map.com/madrid/`, with its own title,
  description and link preview (Open Graph); all cities are listed in `sitemap.xml`.
  Old links like `#top/madrid` still work.

## Adding a city

The TOP lists are built with the `city-top` skill for Claude Code (`.claude/skills/city-top`):
ask it to build the TOP list for a city. Each city is a file in `public/top/` and is listed in
`public/top/index.json`. Its `cover` photo is the picture in link previews.

## Adding the works of a firm

Built with the `firm-works` skill (`.claude/skills/firm-works`): ask it to collect the works of one
firm. Works inside a city go to the city's file; the others go to `public/top/world.json`, which has
the same schema without a cover. Check it with `node scripts/verifyTop.js world`.

The home page's picture in link previews is a collage of the city covers, `public/og-image.jpg`.
It is not rebuilt with the site: run `npm run og-image` when you want new cities in it, and commit the image.

`npm run build` also runs `scripts/buildPages.js`, which writes a page for every city
(`dist/<city>/index.html`) and `sitemap.xml`. The title and description templates are in
`src/meta.js`.

## Running locally

```bash
npm install
npm run dev
```

For the Mapbox base map, put `VITE_MAPBOX_ACCESS_TOKEN` in `.env`. Without it the maps use a
plain Carto base map.
