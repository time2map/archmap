# ArchMap

Maps of architecture worth a trip, for travellers who care about beauty and good buildings.

Site: https://archmap.time2map.com

## TOP

Hand-picked places in each city: must-sees, and also housing, parks and new buildings that
most guidebooks leave out. Cities so far: **Madrid** and **Barcelona**.

- **Five groups:** City core (the must-sees), Housing (contemporary housing and quarters),
  Buildings (notable buildings), Unusual (unusual architecture) and Parks (parks and public spaces).
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
