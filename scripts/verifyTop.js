import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

// Verifies public/top/<city>.json for the TOP tab:
// - cross-checks every point between Wikidata, OpenStreetMap, the Arquitectura Viva map
//   and manually collected sources, and writes lat/lng only when two of them agree
//   (AV only confirms: its coordinates are never stored);
// - fetches the OSM geometry of every area and line and keeps it only when another source's
//   point lies inside the area or near the line;
// - fills in Commons photo metadata (author, license, thumbnails) and rejects non-free files
//   and files Commons tags as having no freedom of panorama;
// - validates the schema and prints a report in the order the UI shows the places.
// Usage: node scripts/verifyTop.js <city> [--offline]
// --offline only validates the file and prints the report, without network access.

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USER_AGENT = 'archmap-verify-top/1.0 (https://github.com/time2map/archmap)'
const AGREE_METERS = 150
const MAX_PHOTOS = 5
const THUMB_WIDTH = 960
// Small thumbnail shown inside the map pin
const PIN_WIDTH = 120
const GROUPS = ['city-core', 'housing', 'buildings', 'unusual', 'parks']
const SHAPE_KINDS = ['area', 'line']
const MAX_CITY_CORE = 30
const SOURCE_TYPES = ['media', 'architect', 'registry', 'award', 'tourism', 'blogger']
// When several sources agree, the point is taken from the first one in this list
const COORD_PRIORITY = ['osm', 'wikidata']
// The AV map is Arquitectura Viva's own database: it confirms a point, but its coordinates
// are never stored in the city file
const CONFIRM_ONLY = ['av']
const AV_DATASETS = ['en', 'es'].map(lang => `https://arquitecturaviva.com/assets/uploads/obras/all-${lang}.json`)
const AV_PUBLISHER = 'Arquitectura Viva'
const FREE_LICENSE = /^(CC0( 1\.0)?|Public domain|CC BY(-SA)? \d\.\d( [a-z]{2,})?)$/i
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/
const CYRILLIC = /[Ѐ-ӿ]/
const QUOTES = /[«»“”"]/

const city = process.argv[2]
const offline = process.argv.includes('--offline')
if (!city || city.startsWith('--')) {
  console.error('Usage: node scripts/verifyTop.js <city> [--offline]')
  process.exit(1)
}

const cityPath = path.join(__dirname, '..', 'public', 'top', `${city}.json`)
const data = JSON.parse(fs.readFileSync(cityPath, 'utf8'))

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function chunks(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function request(url, { method = 'GET', attempts = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { method, headers: { 'User-Agent': USER_AGENT } })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status} for ${url}`)
      return res
    } catch (err) {
      if (attempt >= attempts) throw err
      await sleep(1500 * attempt)
    }
  }
}

async function fetchJson(url) {
  const res = await request(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

function distanceMeters(a, b) {
  const rad = (deg) => deg * Math.PI / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

const round6 = (n) => Math.round(n * 1e6) / 1e6
// About a metre: enough for outlines and keeps the city file small
const round5 = (n) => Math.round(n * 1e5) / 1e5

// Local flat projection in metres around `origin`; fine at city scale
function projector(origin) {
  const kx = 111320 * Math.cos(origin.lat * Math.PI / 180)
  const ky = 110540
  return ([lng, lat]) => [(lng - origin.lng) * kx, (lat - origin.lat) * ky]
}

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// polygon: [outer ring, ...holes] in [lng, lat]
function pointInPolygon(point, polygon) {
  const xy = [point.lng, point.lat]
  return pointInRing(xy, polygon[0]) && !polygon.slice(1).some(hole => pointInRing(xy, hole))
}

// Shortest distance in metres from a point to any segment of the given lines
function distanceToLines(point, lines) {
  const project = projector(point)
  let best = Infinity
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = project(line[i - 1])
      const [bx, by] = project(line[i])
      const dx = bx - ax
      const dy = by - ay
      const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
    }
  }
  return best
}

// Signed area (m²) and centroid of a ring
function ringStats(ring) {
  const project = projector({ lng: ring[0][0], lat: ring[0][1] })
  const xy = ring.map(project)
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) {
    const cross = xy[j][0] * xy[i][1] - xy[i][0] * xy[j][1]
    area += cross
    cx += (xy[j][0] + xy[i][0]) * cross
    cy += (xy[j][1] + xy[i][1]) * cross
  }
  area /= 2
  if (!area) return { area: 0, centroid: null }
  const [x, y] = [cx / (6 * area), cy / (6 * area)]
  const kx = 111320 * Math.cos(ring[0][1] * Math.PI / 180)
  return { area: Math.abs(area), centroid: { lng: ring[0][0] + x / kx, lat: ring[0][1] + y / 110540 } }
}

function lineLengthMeters(line) {
  let length = 0
  for (let i = 1; i < line.length; i++) {
    length += distanceMeters({ lng: line[i - 1][0], lat: line[i - 1][1] }, { lng: line[i][0], lat: line[i][1] })
  }
  return length
}

function cleanText(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Lookups -------------------------------------------------------------------------

// The public datasets behind https://arquitecturaviva.com/mapa, cached for a day
async function loadAvIndex() {
  const index = new Map()
  for (const url of AV_DATASETS) {
    const cacheFile = path.join(os.tmpdir(), `archmap-av-${path.basename(url)}`)
    const fresh = fs.existsSync(cacheFile) && Date.now() - fs.statSync(cacheFile).mtimeMs < 24 * 3600 * 1000
    let items
    if (fresh) {
      items = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    } else {
      items = await fetchJson(url)
      fs.writeFileSync(cacheFile, JSON.stringify(items))
    }
    for (const item of items) {
      const [lat, lng] = String(item.coords || '').split(',').map(Number)
      if (Number.isFinite(lat) && Number.isFinite(lng)) index.set(item.slug, { lat, lng, title: item.title })
    }
  }
  return index
}

async function loadWikidata(ids) {
  const result = new Map()
  for (const batch of chunks([...new Set(ids)], 50)) {
    const params = new URLSearchParams({ action: 'wbgetentities', ids: batch.join('|'), props: 'claims', format: 'json' })
    const json = await fetchJson(`https://www.wikidata.org/w/api.php?${params}`)
    for (const [id, entity] of Object.entries(json.entities || {})) {
      const coord = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value
      result.set(id, {
        coord: coord ? { lat: coord.latitude, lng: coord.longitude } : null,
        commonsCategory: entity.claims?.P373?.[0]?.mainsnak?.datavalue?.value || null
      })
    }
  }
  return result
}

async function loadOsm(refs) {
  const result = new Map()
  const prefix = { node: 'N', way: 'W', relation: 'R' }
  for (const batch of chunks([...new Set(refs)], 50)) {
    const ids = batch.map(ref => { const [type, id] = ref.split('/'); return prefix[type] + id })
    const params = new URLSearchParams({ osm_ids: ids.join(','), format: 'json' })
    const json = await fetchJson(`https://nominatim.openstreetmap.org/lookup?${params}`)
    for (const item of json) result.set(`${item.osm_type}/${item.osm_id}`, { lat: Number(item.lat), lng: Number(item.lon) })
    // Nominatim usage policy: at most one request per second
    await sleep(1100)
  }
  return result
}

// Geometry of areas and lines, simplified by Nominatim to about 3 m
async function loadOsmShapes(refs) {
  const result = new Map()
  const prefix = { way: 'W', relation: 'R' }
  for (const batch of chunks([...new Set(refs)], 50)) {
    const ids = batch.map(ref => { const [type, id] = ref.split('/'); return prefix[type] + id })
    const params = new URLSearchParams({ osm_ids: ids.join(','), format: 'jsonv2', polygon_geojson: '1', polygon_threshold: '0.00003' })
    const json = await fetchJson(`https://nominatim.openstreetmap.org/lookup?${params}`)
    for (const item of json) result.set(`${item.osm_type}/${item.osm_id}`, { name: item.name || null, geojson: item.geojson })
    await sleep(1100)
  }
  return result
}

async function commonsImageInfo(files, width, props) {
  const result = new Map()
  for (const batch of chunks([...new Set(files)], 50)) {
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.map(file => `File:${file}`).join('|'),
      prop: 'imageinfo',
      iiprop: props,
      iiurlwidth: String(width),
      format: 'json'
    })
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`)
    const requestedTitle = new Map((json.query?.normalized || []).map(n => [n.to, n.from]))
    for (const page of Object.values(json.query?.pages || {})) {
      const file = (requestedTitle.get(page.title) || page.title).replace(/^File:/, '')
      result.set(file, page.imageinfo?.[0] || null)
    }
  }
  return result
}

async function loadPhotos(files) {
  const result = new Map()
  const infos = await commonsImageInfo(files, THUMB_WIDTH, 'url|extmetadata')
  const pins = await commonsImageInfo(files, PIN_WIDTH, 'url')
  for (const [file, info] of infos) {
    if (!info) {
      result.set(file, null)
      continue
    }
    const meta = info.extmetadata || {}
    const licenseUrl = meta.LicenseUrl?.value
    const pin = pins.get(file)
    result.set(file, {
      src: (info.thumburl || info.url).split('?')[0],
      thumb: (pin?.thumburl || pin?.url || info.url).split('?')[0],
      page: info.descriptionurl,
      author: cleanText(meta.Artist?.value) || null,
      license: cleanText(meta.LicenseShortName?.value) || null,
      licenseUrl: licenseUrl ? licenseUrl.replace(/^http:/, 'https:').replace(/deed\.[a-z-]+$/i, '') : null
    })
  }
  return result
}

// {{NoFoP-<country>}}: the photo shows a work under copyright in a country whose freedom of
// panorama does not cover commercial use
async function loadNoFop(files) {
  const result = new Map()
  for (const batch of chunks([...new Set(files)], 50)) {
    let next = {}
    while (next) {
      const params = new URLSearchParams({
        action: 'query',
        titles: batch.map(file => `File:${file}`).join('|'),
        prop: 'templates',
        tlnamespace: '10',
        tllimit: 'max',
        format: 'json',
        ...next
      })
      const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`)
      const requestedTitle = new Map((json.query?.normalized || []).map(n => [n.to, n.from]))
      for (const page of Object.values(json.query?.pages || {})) {
        const file = (requestedTitle.get(page.title) || page.title).replace(/^File:/, '')
        const tags = (page.templates || []).map(t => t.title.replace(/^Template:/, '')).filter(t => /^NoFoP-[^/]+$/.test(t))
        if (tags.length) result.set(file, [...new Set([...(result.get(file) || []), ...tags])])
      }
      next = json.continue || null
    }
  }
  return result
}

async function checkImages(urls) {
  const failed = new Set()
  const queue = [...new Set(urls)]
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()
      // Commons renders a thumbnail size on first request, which can fail once; retry before reporting
      let ok = false
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        if (attempt > 0) await sleep(2000)
        try {
          ok = (await request(url, { method: 'HEAD' })).status === 200
        } catch {
          ok = false
        }
      }
      if (!ok) failed.add(url)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return failed
}

// --- Verification --------------------------------------------------------------------

// Point candidates from Wikidata, the AV map and manually collected sources
function referenceCandidates(refs, lookups, issues, label) {
  const candidates = []
  if (refs.wikidata) {
    const found = lookups.wikidata.get(refs.wikidata)
    if (found?.coord) candidates.push({ source: 'wikidata', ...found.coord })
    else issues.warnings.push(`${label}: Wikidata ${refs.wikidata} has no coordinates`)
  }
  if (refs.av) {
    const found = lookups.av.get(refs.av)
    if (found) candidates.push({ source: 'av', lat: found.lat, lng: found.lng })
    else issues.warnings.push(`${label}: AV slug "${refs.av}" is not on the AV map`)
  }
  for (const other of refs.other || []) {
    candidates.push({ source: other.source, lat: other.lat, lng: other.lng })
  }
  return candidates
}

function verifyPoint(point, lookups, issues) {
  const refs = point.refs || {}
  const label = point.name ? `point "${point.name}"` : 'point'
  const candidates = []

  if (refs.osm) {
    const found = lookups.osm.get(refs.osm)
    if (found) candidates.push({ source: 'osm', ...found })
    else issues.warnings.push(`${label}: OSM ${refs.osm} not found`)
  }
  candidates.push(...referenceCandidates(refs, lookups, issues, label))

  const rank = (c) => {
    const i = COORD_PRIORITY.indexOf(c.source)
    return i === -1 ? COORD_PRIORITY.length : i
  }
  const storable = candidates.filter(c => !CONFIRM_ONLY.includes(c.source))
  for (const candidate of storable.sort((a, b) => rank(a) - rank(b))) {
    const agreeing = candidates.filter(o => o.source !== candidate.source && distanceMeters(candidate, o) <= AGREE_METERS)
    if (agreeing.length > 0) {
      point.lat = round6(candidate.lat)
      point.lng = round6(candidate.lng)
      point.verifiedBy = [...new Set([candidate.source, ...agreeing.map(o => o.source)])]
      delete point.singleSource
      return
    }
  }

  if (candidates.length > 1) {
    const pairs = []
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        pairs.push(`${candidates[i].source}↔${candidates[j].source} ${Math.round(distanceMeters(candidates[i], candidates[j]))} m`)
      }
    }
    issues.warnings.push(`${label}: sources disagree (${pairs.join(', ')})`)
  }

  // A single source is accepted only for a Wikidata landmark with a Commons category
  const wikidata = refs.wikidata && lookups.wikidata.get(refs.wikidata)
  if (wikidata?.coord && wikidata.commonsCategory && !candidates.some(c => c.source !== 'wikidata')) {
    point.lat = round6(wikidata.coord.lat)
    point.lng = round6(wikidata.coord.lng)
    point.verifiedBy = ['wikidata']
    point.singleSource = true
    issues.warnings.push(`${label}: single source (Wikidata landmark)`)
    return
  }

  point.lat = null
  point.lng = null
  point.verifiedBy = []
  delete point.singleSource
  issues.warnings.push(`${label}: no confirmed location — left off the map`)
}

// An area or a line is kept when another source's point lies inside the area or near the line
function verifyShape(shape, lookups, issues) {
  const refs = shape.refs || {}
  const label = `${shape.kind} "${shape.name}"`
  const polygons = []
  const lines = []
  const names = new Set()
  for (const ref of refs.osm || []) {
    const found = lookups.shapes.get(ref)
    if (!found?.geojson) {
      issues.errors.push(`${label}: OSM ${ref} not found`)
      continue
    }
    if (found.name) names.add(found.name)
    const { type, coordinates } = found.geojson
    if (shape.kind === 'area' && type === 'Polygon') polygons.push(coordinates)
    else if (shape.kind === 'area' && type === 'MultiPolygon') polygons.push(...coordinates)
    else if (shape.kind === 'line' && type === 'LineString') lines.push(coordinates)
    else if (shape.kind === 'line' && type === 'MultiLineString') lines.push(...coordinates)
    else issues.errors.push(`${label}: OSM ${ref} is a ${type}, not an ${shape.kind === 'area' ? 'area' : 'line'}`)
  }
  const roundRing = (ring) => ring.map(([lng, lat]) => [round5(lng), round5(lat)])
  const roundedPolygons = polygons.map(polygon => polygon.map(roundRing))
  const roundedLines = lines.map(roundRing)
  const outlines = shape.kind === 'area' ? roundedPolygons.flat() : roundedLines

  const size = shape.kind === 'area'
    ? `${(roundedPolygons.reduce((sum, polygon) => sum + ringStats(polygon[0]).area, 0) / 1e6).toFixed(2)} km²`
    : `${(roundedLines.reduce((sum, line) => sum + lineLengthMeters(line), 0) / 1000).toFixed(2)} km`
  issues.info.push(`${label}: OSM ${[...names].join(' / ') || '—'}, ${size}`)

  const candidates = referenceCandidates(refs, lookups, issues, label)
  const confirming = outlines.length === 0 ? null : candidates.find(c =>
    (shape.kind === 'area' && roundedPolygons.some(polygon => pointInPolygon(c, polygon))) ||
    distanceToLines(c, outlines) <= AGREE_METERS
  )
  if (!confirming) {
    if (candidates.length === 0) issues.warnings.push(`${label}: no second source to confirm the OSM geometry`)
    else if (outlines.length > 0) {
      const gaps = candidates.map(c => `${c.source} ${Math.round(distanceToLines(c, outlines))} m away`)
      issues.warnings.push(`${label}: no source agrees with the OSM geometry (${gaps.join(', ')})`)
    }
    shape.lat = null
    shape.lng = null
    shape.geometry = null
    shape.verifiedBy = []
    issues.warnings.push(`${label}: no confirmed location — left off the map`)
    return
  }

  // Pin position: the centroid of the largest polygon when it falls inside it, the line vertex
  // nearest to the middle of the line's extent, otherwise the confirming point
  let pin = confirming
  if (shape.kind === 'area') {
    const largest = roundedPolygons
      .map(polygon => ({ polygon, ...ringStats(polygon[0]) }))
      .sort((a, b) => b.area - a.area)[0]
    if (largest.centroid && pointInPolygon(largest.centroid, largest.polygon)) pin = largest.centroid
  } else {
    const vertices = roundedLines.flat()
    const lngs = vertices.map(v => v[0])
    const lats = vertices.map(v => v[1])
    const middle = { lng: (Math.min(...lngs) + Math.max(...lngs)) / 2, lat: (Math.min(...lats) + Math.max(...lats)) / 2 }
    const [lng, lat] = vertices.reduce((best, v) =>
      distanceMeters(middle, { lng: v[0], lat: v[1] }) < distanceMeters(middle, { lng: best[0], lat: best[1] }) ? v : best)
    pin = { lng, lat }
  }
  shape.lat = round6(pin.lat)
  shape.lng = round6(pin.lng)
  shape.geometry = shape.kind === 'area'
    ? { type: 'MultiPolygon', coordinates: roundedPolygons }
    : { type: 'MultiLineString', coordinates: roundedLines }
  shape.verifiedBy = ['osm', confirming.source]
}

function validate(data, issuesByPlace, topErrors) {
  if (data.id !== city) topErrors.push(`id "${data.id}" does not match the file name "${city}"`)
  if (!data.name) topErrors.push('name is missing')
  if (!DATE.test(data.updated || '')) topErrors.push('updated must be a date')

  const sources = data.sources || {}
  for (const [id, source] of Object.entries(sources)) {
    if (!source.publisher) topErrors.push(`source ${id}: publisher is missing`)
    if (!/^https:\/\//.test(source.url || '')) topErrors.push(`source ${id}: url must be https`)
    if (source.date !== null && !DATE.test(source.date || '')) topErrors.push(`source ${id}: date must be YYYY[-MM[-DD]] or null`)
    if (!SOURCE_TYPES.includes(source.type)) topErrors.push(`source ${id}: type must be one of ${SOURCE_TYPES.join(', ')}`)
    if (CYRILLIC.test(`${source.publisher} ${source.author || ''}`)) topErrors.push(`source ${id}: publisher/author must be in Latin script`)
  }

  const ids = new Set()
  const usedSources = new Set()
  for (const place of data.places || []) {
    const issues = issuesByPlace.get(place)
    if (ids.has(place.id)) issues.errors.push(`duplicate id "${place.id}"`)
    ids.add(place.id)
    if (!place.title) issues.errors.push('title is missing')
    if (!GROUPS.includes(place.group)) issues.errors.push(`group must be one of ${GROUPS.join(', ')}`)
    if (place.tags) issues.errors.push('tags are no longer used — city-core is a group')
    if (!place.sources?.length) issues.errors.push('no sources')
    for (const id of place.sources || []) {
      if (!sources[id]) issues.errors.push(`unknown source "${id}"`)
      usedSources.add(id)
    }
    if (new Set(place.sources).size !== (place.sources || []).length) issues.errors.push('a source is listed twice')
    // One vote per independent author or outlet
    const voters = (place.sources || []).filter(id => sources[id]).map(id => `${sources[id].publisher}|${sources[id].author || ''}`)
    if (new Set(voters).size !== voters.length) issues.errors.push('two votes from the same author and outlet')
    const avVotes = (place.sources || []).filter(id => sources[id]?.publisher === AV_PUBLISHER).length
    if (avVotes > 1) issues.errors.push('more than one Arquitectura Viva vote')
    if (!place.why) issues.errors.push('why is missing')
    if (QUOTES.test(place.why || '')) issues.warnings.push('why contains quotation marks — no quotes in card text')
    const visibleText = [place.title, place.architect, place.year, place.area, place.why, place.note,
      ...(place.points || []).map(p => p.name), ...(place.shapes || []).map(s => s.name)].join(' ')
    if (CYRILLIC.test(visibleText)) issues.errors.push('card text must be in English (Cyrillic found)')
    if ((place.photos || []).length > MAX_PHOTOS) issues.errors.push(`more than ${MAX_PHOTOS} photos`)
    for (const photo of place.photos || []) if (!photo.file) issues.errors.push('photo without "file"')
    if (!Array.isArray(place.points)) issues.errors.push('points must be an array')
    for (const point of place.points || []) {
      const refs = point.refs || {}
      if (!refs.wikidata && !refs.osm && !refs.av && !refs.other?.length) issues.errors.push('point without refs')
      if (refs.osm && !/^(node|way|relation)\/\d+$/.test(refs.osm)) issues.errors.push(`bad OSM ref "${refs.osm}"`)
      if (refs.wikidata && !/^Q\d+$/.test(refs.wikidata)) issues.errors.push(`bad Wikidata ref "${refs.wikidata}"`)
    }
    if (place.shapes !== undefined && !Array.isArray(place.shapes)) issues.errors.push('shapes must be an array')
    for (const shape of place.shapes || []) {
      const refs = shape.refs || {}
      if (!shape.name) issues.errors.push('shape without a name')
      if (!SHAPE_KINDS.includes(shape.kind)) issues.errors.push(`shape kind must be one of ${SHAPE_KINDS.join(', ')}`)
      if (!Array.isArray(refs.osm) || refs.osm.length === 0) issues.errors.push(`shape "${shape.name}": refs.osm must list OSM ways or relations`)
      for (const ref of refs.osm || []) if (!/^(way|relation)\/\d+$/.test(ref)) issues.errors.push(`shape "${shape.name}": bad OSM ref "${ref}"`)
      if (refs.wikidata && !/^Q\d+$/.test(refs.wikidata)) issues.errors.push(`bad Wikidata ref "${refs.wikidata}"`)
    }
  }
  for (const id of Object.keys(sources)) if (!usedSources.has(id)) topErrors.push(`source ${id} is not used by any place`)

  return (data.places || []).filter(p => p.group === 'city-core').length
}

const hasLocation = (place) =>
  (place.points || []).some(p => Number.isFinite(p.lat)) || (place.shapes || []).some(s => s.geometry)

// Same order as the TOP tab: votes, with a photo, on the map, number of photos, title
function uiOrder(places) {
  return [...places].sort((a, b) =>
    b.sources.length - a.sources.length ||
    Number((b.photos || []).length > 0) - Number((a.photos || []).length > 0) ||
    Number(hasLocation(b)) - Number(hasLocation(a)) ||
    (b.photos || []).length - (a.photos || []).length ||
    a.title.localeCompare(b.title)
  )
}

async function main() {
  const places = data.places || []
  const issuesByPlace = new Map(places.map(p => [p, { errors: [], warnings: [], info: [] }]))
  const topErrors = []
  const topWarnings = []
  const cityCore = validate(data, issuesByPlace, topErrors)
  if (cityCore > MAX_CITY_CORE) topWarnings.push(`${cityCore} city-core places — usually 15–25`)

  let avIndex = null
  if (!offline) {
    const points = places.flatMap(p => p.points || [])
    const shapes = places.flatMap(p => p.shapes || [])
    avIndex = await loadAvIndex()
    const lookups = {
      av: avIndex,
      wikidata: await loadWikidata([...points, ...shapes].map(p => p.refs?.wikidata).filter(Boolean)),
      osm: await loadOsm(points.map(p => p.refs?.osm).filter(ref => /^(node|way|relation)\/\d+$/.test(ref || ''))),
      shapes: await loadOsmShapes(shapes.flatMap(s => s.refs?.osm || []).filter(ref => /^(way|relation)\/\d+$/.test(ref)))
    }
    for (const place of places) {
      for (const point of place.points || []) verifyPoint(point, lookups, issuesByPlace.get(place))
      for (const shape of place.shapes || []) verifyShape(shape, lookups, issuesByPlace.get(place))
    }

    const photoFiles = places.flatMap(p => (p.photos || []).map(photo => photo.file)).filter(Boolean)
    const photoMeta = await loadPhotos(photoFiles)
    const noFop = await loadNoFop(photoFiles)
    for (const place of places) {
      const issues = issuesByPlace.get(place)
      for (const photo of place.photos || []) {
        const meta = photoMeta.get(photo.file)
        if (!meta) {
          issues.errors.push(`photo "${photo.file}" not found on Commons`)
          continue
        }
        Object.assign(photo, meta)
        if (!FREE_LICENSE.test(meta.license || '')) issues.errors.push(`photo "${photo.file}": license "${meta.license}" is not free`)
        if (!meta.author) issues.errors.push(`photo "${photo.file}": no author for attribution`)
        for (const tag of noFop.get(photo.file) || []) {
          issues.errors.push(`photo "${photo.file}": Commons tags it {{${tag}}} — a work under copyright, no freedom of panorama for commercial use`)
        }
      }
    }
    const failed = await checkImages(places.flatMap(p => (p.photos || []).flatMap(photo => [photo.src, photo.thumb])).filter(Boolean))
    for (const place of places) {
      for (const photo of place.photos || []) {
        if (failed.has(photo.src)) issuesByPlace.get(place).errors.push(`photo "${photo.file}": thumbnail does not load`)
        if (failed.has(photo.thumb)) issuesByPlace.get(place).errors.push(`photo "${photo.file}": pin thumbnail does not load`)
      }
    }

    // Coordinate pairs of the geometry stay on one line, or they take most of the file
    const json = JSON.stringify(data, null, 2).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]')
    fs.writeFileSync(cityPath, json + '\n', 'utf8')
  }

  // AV hint: the place is on the AV map but has no Arquitectura Viva vote
  if (avIndex) {
    for (const place of places) {
      const onAvMap = [...(place.points || []), ...(place.shapes || [])].some(p => p.refs?.av && avIndex.has(p.refs.av))
      const hasAvVote = (place.sources || []).some(id => data.sources[id]?.publisher === AV_PUBLISHER)
      if (onAvMap && !hasAvVote) issuesByPlace.get(place).warnings.push('on the AV map but has no Arquitectura Viva vote')
    }
  }

  let errorCount = topErrors.length
  let warningCount = 0
  console.log(`${data.name}: ${places.length} places, ${Object.keys(data.sources || {}).length} sources${offline ? ' (offline check)' : ''}\n`)
  for (const error of topErrors) console.log(`ERROR ${error}`)
  for (const warning of topWarnings) console.log(`warn  ${warning}`)
  warningCount += topWarnings.length
  uiOrder(places).forEach((place, index) => {
    const issues = issuesByPlace.get(place)
    const points = place.points || []
    const shapes = place.shapes || []
    const located = points.filter(p => Number.isFinite(p.lat)).length
    const shapeInfo = shapes.length ? `, ${shapes.filter(s => s.geometry).length}/${shapes.length} shapes` : ''
    console.log(`${String(index + 1).padStart(3)}. ${place.title} — ${place.sources.length} votes, ${located}/${points.length} points${shapeInfo}, ${(place.photos || []).length} photos (${place.group})`)
    for (const error of issues.errors) console.log(`       ERROR ${error}`)
    for (const warning of issues.warnings) console.log(`       warn  ${warning}`)
    for (const line of issues.info) console.log(`       info  ${line}`)
    errorCount += issues.errors.length
    warningCount += issues.warnings.length
  })
  console.log(`\n${errorCount} errors, ${warningCount} warnings`)
  if (errorCount > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
