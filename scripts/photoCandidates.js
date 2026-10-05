import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// Photo candidates for the places of public/top/<city>.json, to look at before choosing (city-top skill §5).
// Commons: the Wikidata image (P18), the place's category and its subcategories, files that depict the item
// (P180), files and categories its OSM objects link to, files taken within 150 m of its point, categories found by
// the place's names, a full-text search.
// Flickr, by tag through its public feed and by text through Openverse: CC BY, CC BY-SA, CC0 and public domain.
// Unsplash, by text (UNSPLASH_API_KEY): the Unsplash License, without Unsplash+.
// Only free licenses; Commons photos taken before the place was completed are dropped (the building that stood
// there before, the construction site). Each place gets a contact sheet, <out>/<place>.jpg, with numbered tiles.
// Usage:
//   node scripts/photoCandidates.js <city|world> (--only <id>,<id> | --missing) [--out <dir>]
//   node scripts/photoCandidates.js <city|world> --pick <id>=<n>,<n> [--pick ...] [--out <dir>]
// --missing takes the places without photos. --pick adds the numbered candidates of a sheet to the place's
// photos (up to five); run verifyTop.js --only on them afterwards to fill in authors and licenses.
// Flickr: its public feed by tag (no key) and Openverse by text. Openverse allows 200 requests a day anonymously
// (OPENVERSE_TOKEN lifts it), and its guard refuses some queries.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// API keys (UNSPLASH_API_KEY, OPENVERSE_TOKEN) from .env, when there is one
try { process.loadEnvFile(path.join(__dirname, '..', '.env')) } catch {}
const unsplashHeaders = () => ({ Authorization: `Client-ID ${process.env.UNSPLASH_API_KEY}`, 'Accept-Version': 'v1' })
const USER_AGENT = 'archmap-photo-candidates/1.0 (https://github.com/time2map/archmap)'
const COMMONS = 'https://commons.wikimedia.org/w/api.php'
const FREE_LICENSE = /^(CC0( 1\.0)?|Public domain|CC BY(-SA)? \d\.\d( [a-z]{2,})?)$/i
const IMAGE_FILE = /\.(jpe?g|png|webp|tiff?)$/i
const GEO_RADIUS = 150
const MAX_COMMONS = 30
const MAX_FLICKR = 12
const MAX_UNSPLASH = 8
const MAX_PHOTOS = 5
const [TILE_W, TILE_H, COLS] = [220, 190, 6]

const args = process.argv.slice(2)
const city = args[0]
const option = (name) => { const i = args.indexOf(name); return i > 0 ? args[i + 1] : null }
const only = option('--only')?.split(',').filter(Boolean)
const picks = args.flatMap((a, i) => (a === '--pick' ? [args[i + 1]] : []))
const missing = args.includes('--missing')
if (!city || (!only && !missing && picks.length === 0)) {
  console.error('Usage: node scripts/photoCandidates.js <city|world> (--only <id>,<id> | --missing | --pick <id>=<n>,<n>) [--out <dir>]')
  process.exit(1)
}
const outDir = option('--out') || path.join(os.tmpdir(), 'archmap-photos', city)
const cityPath = path.join(__dirname, '..', 'public', 'top', `${city}.json`)
const data = JSON.parse(fs.readFileSync(cityPath, 'utf8'))

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchJson(url, headers = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } }).catch(() => null)
    if (res?.ok) return res.json()
    if (attempt >= 3 || (res && res.status < 500 && res.status !== 429)) throw new Error(`HTTP ${res?.status} for ${url}`)
    await sleep(3000 * attempt)
  }
}

const commons = (params) => fetchJson(`${COMMONS}?${new URLSearchParams({ format: 'json', ...params })}`)

// --- Pick: add chosen candidates to the city file ----------------------------------------

if (picks.length > 0) {
  for (const pick of picks) {
    const [id, numbers] = pick.split('=')
    const place = data.places.find(p => p.id === id)
    const sheet = path.join(outDir, `${id}.json`)
    if (!place || !fs.existsSync(sheet)) {
      console.error(`${id}: ${place ? `no candidates in ${sheet}` : 'no such place'}`)
      process.exit(1)
    }
    const candidates = JSON.parse(fs.readFileSync(sheet, 'utf8'))
    place.photos = place.photos || []
    for (const n of numbers.split(',').map(Number)) {
      const c = candidates[n]
      if (!c) throw new Error(`${id}: no candidate ${n}`)
      const photo = c.file ? { file: c.file } : c.flickr ? { flickr: c.flickr } : { unsplash: c.unsplash }
      const key = (p) => p.file || p.flickr || p.unsplash
      if (place.photos.some(p => key(p) === key(photo)) || place.photos.length >= MAX_PHOTOS) continue
      place.photos.push(photo)
      // Unsplash counts a photo as downloaded when an app uses it, and asks to be told
      if (c.download) await fetch(c.download, { headers: unsplashHeaders() }).catch(() => null)
    }
    console.log(`${id}: ${place.photos.length} photos`)
  }
  // Same layout as verifyTop.js: coordinate pairs on one line
  fs.writeFileSync(cityPath, JSON.stringify(data, null, 2).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]') + '\n')
  process.exit(0)
}

// --- Candidates -------------------------------------------------------------------------

// Every word of a name counts when matching it, its kind too: "Charles Library" is not any category with "Charles"
const STOP = new Set(['the', 'of', 'and', 'de', 'des', 'du', 'la', 'le', 'an', 'at', 'in', 'for'])
const words = (text) => (text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1 && !STOP.has(w))
const hasAllWords = (text, name) => { const have = new Set(words(text)); const want = words(name); return want.length > 0 && want.every(w => have.has(w)) }

// The year the place was completed: the last year its card names ("2014–2020" → 2020)
const completedIn = (place) => Math.max(0, ...((place.year || '').match(/\b(1[5-9]|20)\d\d\b/g) || []).map(Number))

// The town to search with: "City" of a world place's "City, Country", or the city of the file
const townOf = (place) => (data.id === 'world' ? (place.area || '').split(',')[0] : data.name)

async function wikidataOf(qids) {
  if (qids.length === 0) return []
  const json = await fetchJson(`https://www.wikidata.org/w/api.php?${new URLSearchParams({
    action: 'wbgetentities', ids: qids.join('|'), props: 'claims|labels|sitelinks', format: 'json'
  })}`)
  return Object.values(json.entities || {}).map(e => ({
    id: e.id,
    images: (e.claims?.P18 || []).map(c => c.mainsnak?.datavalue?.value).filter(Boolean),
    category: e.sitelinks?.commonswiki?.title?.startsWith('Category:') ? e.sitelinks.commonswiki.title
      : e.claims?.P373?.[0]?.mainsnak?.datavalue?.value ? `Category:${e.claims.P373[0].mainsnak.datavalue.value}` : null,
    labels: Object.values(e.labels || {}).map(l => l.value)
  }))
}

async function categoryMembers(category, type, limit = 50) {
  const json = await commons({ action: 'query', list: 'categorymembers', cmtitle: category, cmtype: type, cmlimit: String(limit) })
  return (json.query?.categorymembers || []).map(m => m.title)
}

// Files of a category and of its subcategories, one level down
async function categoryFiles(category) {
  const files = await categoryMembers(category, 'file')
  for (const sub of (await categoryMembers(category, 'subcat', 20)).slice(0, 10)) files.push(...await categoryMembers(sub, 'file', 30))
  return files
}

async function searchFiles(query, limit = 20) {
  const json = await commons({ action: 'query', list: 'search', srsearch: query, srnamespace: '6', srlimit: String(limit) })
  return (json.query?.search || []).map(r => r.title)
}

// Categories named like the place: every word of one of its names in the category's title, and nothing else but
// its town or region ("Väven, Umeå", "Central Library (Calgary)"); "Bob Bolder" is not The Bolder
async function categoriesByName(names, place) {
  const allowed = new Set(['category', ...words(place.area), ...words(townOf(place))])
  const found = new Set()
  for (const name of names) {
    const wanted = words(name)
    if (wanted.length === 0) continue
    const json = await commons({ action: 'query', list: 'search', srsearch: name, srnamespace: '14', srlimit: '10' })
    for (const r of json.query?.search || []) {
      const extra = words(r.title).filter(w => !wanted.includes(w) && !allowed.has(w))
      if (hasAllWords(r.title, name) && extra.length === 0) found.add(r.title)
    }
  }
  return [...found].slice(0, 3)
}

// Commons files and categories the OSM objects of the place link to (wikimedia_commons, image)
async function osmCommons(osmRefs) {
  if (osmRefs.length === 0) return []
  const prefix = { node: 'N', way: 'W', relation: 'R' }
  const json = await fetchJson(`https://nominatim.openstreetmap.org/lookup?${new URLSearchParams({
    osm_ids: osmRefs.map(r => prefix[r.split('/')[0]] + r.split('/')[1]).join(','), format: 'json', extratags: '1'
  })}`)
  await sleep(1100)
  const titles = []
  for (const item of json) {
    for (const value of [item.extratags?.wikimedia_commons, item.extratags?.image].filter(Boolean)) {
      const title = decodeURIComponent(value.replace(/^https?:\/\/commons\.wikimedia\.org\/wiki\//, '')).replace(/_/g, ' ')
      if (title.startsWith('File:')) titles.push(title)
      else if (title.startsWith('Category:')) titles.push(...await categoryFiles(title))
    }
  }
  return titles
}

async function nearbyFiles(at) {
  const json = await commons({ action: 'query', list: 'geosearch', gscoord: `${at.lat}|${at.lng}`, gsradius: String(GEO_RADIUS), gsnamespace: '6', gslimit: '50' })
  return (json.query?.geosearch || []).map(r => r.title)
}

// License, size and date of Commons files, with a 220 px thumbnail
async function commonsInfo(titles) {
  const info = new Map()
  for (let i = 0; i < titles.length; i += 40) {
    const json = await commons({
      action: 'query', titles: titles.slice(i, i + 40).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(TILE_W)
    })
    for (const page of Object.values(json.query?.pages || {})) {
      const ii = page.imageinfo?.[0]
      if (!ii) continue
      const meta = ii.extmetadata || {}
      const strip = (v) => (v || '').replace(/<[^>]+>/g, ' ').trim()
      info.set(page.title, {
        license: strip(meta.LicenseShortName?.value),
        taken: Number((strip(meta.DateTimeOriginal?.value).match(/\b(1[89]|20)\d\d\b/) || [])[0]) || null,
        thumb: ii.thumburl
      })
    }
  }
  return info
}

// Flickr without an API key (keys are for Pro accounts only): its public feed by tag, up to the 20 latest photos
// carrying all the given tags, with the date each was taken. The feed has no license: Flickr's oEmbed gives it,
// and only free ones are kept
const flickrTag = (text) => (text || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

async function flickrFeed(tags) {
  await sleep(500)
  const json = await fetchJson(`https://api.flickr.com/services/feeds/photos_public.gne?${new URLSearchParams({
    tags: tags.join(','), tagmode: 'all', format: 'json', nojsoncallback: '1'
  })}`)
  return (json.items || []).map(i => ({
    flickr: i.link.replace(/^http:/, 'https:'),
    title: i.title || '',
    author: (i.author.match(/\("(.*)"\)/) || [])[1] || '',
    text: `${i.title} ${i.tags}`,
    taken: Number((i.date_taken || '').slice(0, 4)) || null,
    thumb: i.media?.m,
    unchecked: true
  }))
}

async function flickrLicense(url) {
  await sleep(200)
  const json = await fetchJson(`https://www.flickr.com/services/oembed/?${new URLSearchParams({ url, format: 'json' })}`).catch(() => null)
  const licenseUrl = json?.license_url || ''
  const cc = licenseUrl.match(/creativecommons\.org\/licenses\/(by|by-sa)\/(\d\.\d)/)
  return cc ? `CC ${cc[1].toUpperCase()} ${cc[2]}` : /publicdomain\/(zero|mark)/.test(licenseUrl) ? 'CC0 / PD' : null
}

// Unsplash: photos under the Unsplash License (UNSPLASH_API_KEY; the demo key allows 50 requests an hour).
// Unsplash+ photos are under another license and are left out
let unsplashOff = !process.env.UNSPLASH_API_KEY

async function unsplashSearch(query) {
  if (unsplashOff) return []
  const res = await fetch(`https://api.unsplash.com/search/photos?${new URLSearchParams({ query, per_page: '12' })}`, { headers: unsplashHeaders() })
  if (!res.ok) {
    // Out of requests for this hour: the rest of the run goes without Unsplash
    unsplashOff = true
    console.error(`Unsplash: HTTP ${res.status}${res.status === 403 ? ' (hourly limit reached)' : ''} — the other places go without it`)
    return []
  }
  const json = await res.json()
  return (json.results || []).filter(p => !p.premium && !p.plus).map(p => ({
    unsplash: p.links.html,
    title: p.description || p.alt_description || '',
    author: p.user.name,
    taken: null,
    thumb: p.urls.small,
    download: p.links.download_location
  }))
}

let lastOpenverse = 0
// Without a key: Flickr through Openverse (20 requests a minute anonymously). Its Cloudflare guard refuses a query
// with a comma, so punctuation goes
async function openverseSearch(query) {
  const wait = 3200 - (Date.now() - lastOpenverse)
  if (wait > 0) await sleep(wait)
  lastOpenverse = Date.now()
  const headers = process.env.OPENVERSE_TOKEN ? { Authorization: `Bearer ${process.env.OPENVERSE_TOKEN}` } : {}
  const json = await fetchJson(`https://api.openverse.org/v1/images/?${new URLSearchParams({
    q: query.replace(/[,;:]/g, ' '), source: 'flickr', license: 'by,by-sa,cc0,pdm', page_size: '20'
  })}`, headers)
  return (json.results || []).map(r => ({
    flickr: r.foreign_landing_url.replace(/^http:/, 'https:'),
    title: r.title || '',
    author: r.creator || '',
    text: [r.title, ...(r.tags || []).map(t => t.name)].join(' '),
    taken: null,
    thumb: (r.url || '').replace(/(_[a-z])?\.jpg$/, '_m.jpg')
  }))
}

async function candidatesOf(place) {
  const refs = [...(place.points || []), ...(place.shapes || [])]
  const qids = [...new Set(refs.map(r => r.refs?.wikidata).filter(Boolean))]
  const items = await wikidataOf(qids)
  const mainTitle = place.title.replace(/\s*\(.*?\)/g, '').trim()
  const names = [...new Set([mainTitle, ...[...place.title.matchAll(/\((.*?)\)/g)].map(m => m[1]), ...items.flatMap(i => i.labels)])].slice(0, 4)
  const town = townOf(place)

  // Most reliable first: the item's own image and category, files that depict it, files taken next to it
  const titles = []
  for (const item of items) titles.push(...item.images.map(f => `File:${f}`))
  for (const item of items) if (item.category) titles.push(...await categoryFiles(item.category))
  for (const qid of qids) titles.push(...await searchFiles(`haswbstatement:P180=${qid}`))
  titles.push(...await osmCommons([...new Set(refs.flatMap(r => [r.refs?.osm].flat()).filter(Boolean))]))
  for (const at of refs.filter(r => Number.isFinite(r.lat))) titles.push(...await nearbyFiles(at))
  for (const category of await categoriesByName(names, place)) titles.push(...(await categoryFiles(category)).slice(0, 15))
  titles.push(...(await searchFiles(`${mainTitle} ${town}`)).filter(t => names.some(n => hasAllWords(t, n))))

  const used = new Set((place.photos || []).map(p => p.file && `File:${p.file}`))
  const unique = [...new Set(titles)].filter(t => IMAGE_FILE.test(t) && !used.has(t))
  const info = await commonsInfo(unique)
  const year = completedIn(place)
  const fromCommons = unique
    .map(t => ({ file: t.replace(/^File:/, ''), ...info.get(t) }))
    .filter(c => c.thumb && FREE_LICENSE.test(c.license || '') && !(year && c.taken && c.taken < year))
    .slice(0, MAX_COMMONS)

  // A Flickr photo has two addresses, by the user's name and by their number: compare the photo's own id
  const flickrId = (url) => (url.match(/\/photos\/[^/]+\/(\d+)/) || [])[1]
  const usedFlickr = new Set((place.photos || []).map(p => p.flickr && flickrId(p.flickr)).filter(Boolean))
  const fromFlickr = []
  // A search by text matches loosely: keep the photos whose title or tags carry every word of one of the names.
  // Photos taken at the point need no name, but none taken before the place was completed
  const add = (results, byName) => {
    for (const r of results) {
      if (byName && !names.some(n => hasAllWords(r.text, n))) continue
      if ((year && r.taken && r.taken < year) || usedFlickr.has(flickrId(r.flickr)) || fromFlickr.some(f => flickrId(f.flickr) === flickrId(r.flickr))) continue
      fromFlickr.push(r)
    }
  }
  try {
    // By tag: each name as one tag ("fuglemyrhytta", "powerhousetelemark"), then its words as tags all present
    const tagSets = names.flatMap(n => [[flickrTag(n)], words(n).map(flickrTag)])
      .filter(tags => tags.length > 0 && tags.every(t => t.length >= 3))
    for (const tags of [...new Map(tagSets.map(t => [t.join(','), t])).values()].slice(0, 5)) add(await flickrFeed(tags), true)
    // By text, through Openverse
    for (const query of [`${mainTitle} ${town}`, names[1] && `${names[1]} ${town}`].filter(Boolean)) add(await openverseSearch(query), true)
  } catch (err) {
    console.error(`${place.id}: Flickr search failed — ${err.message}`)
  }
  // The feed's photos are kept only under a free license
  for (const r of fromFlickr.filter(r => r.unchecked)) {
    r.license = await flickrLicense(r.flickr)
    delete r.unchecked
  }
  const freeFlickr = fromFlickr.filter(r => r.license !== null)
  // Unsplash falls back on the town's sights when it knows nothing of the place: keep the photos whose description
  // names it, as for Flickr
  const fromUnsplash = (await unsplashSearch(`${mainTitle} ${town}`))
    .filter(r => names.some(n => hasAllWords(r.title, n)) && !(place.photos || []).some(p => p.unsplash === r.unsplash))
  return [...fromCommons, ...freeFlickr.slice(0, MAX_FLICKR), ...fromUnsplash.slice(0, MAX_UNSPLASH)]
}

// --- Contact sheet ---------------------------------------------------------------------

const xml = (text) => text.replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]))

async function contactSheet(candidates, file) {
  const rows = Math.max(1, Math.ceil(candidates.length / COLS))
  const tiles = []
  const labels = []
  await Promise.all(candidates.map(async (c, i) => {
    const x = (i % COLS) * TILE_W
    const y = Math.floor(i / COLS) * TILE_H
    const res = await fetch(c.thumb, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null)
    if (res?.ok) {
      const input = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize(TILE_W - 6, TILE_H - 30, { fit: 'contain', background: '#ffffff' }).toBuffer().catch(() => null)
      if (input) tiles.push({ input, left: x + 3, top: y + 3 })
    }
    // A Flickr photo shows its author: the firm's own account or a photographer's press shots are left out
    const name = c.file || `${c.author}: ${c.title}`
    const label = `${i} ${c.file ? '' : c.flickr ? '[F] ' : '[U] '}${name}`.slice(0, 34) + (c.taken ? ` ${c.taken}` : '')
    labels.push(`<text x="${x + 4}" y="${y + TILE_H - 10}" font-family="Helvetica, Arial" font-size="13">${xml(label)}</text>`)
  }))
  const width = COLS * TILE_W
  const height = rows * TILE_H
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.join('')}</svg>`
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite([...tiles, { input: Buffer.from(svg), left: 0, top: 0 }])
    .jpeg({ quality: 80 }).toFile(file)
}

fs.mkdirSync(outDir, { recursive: true })
const places = data.places.filter(p => (only ? only.includes(p.id) : (p.photos || []).length === 0))
for (const id of (only || []).filter(id => !data.places.some(p => p.id === id))) console.error(`no place "${id}"`)
for (const place of places) {
  try {
    const candidates = await candidatesOf(place)
    fs.writeFileSync(path.join(outDir, `${place.id}.json`), JSON.stringify(candidates, null, 1))
    if (candidates.length > 0) await contactSheet(candidates, path.join(outDir, `${place.id}.jpg`))
    const count = (key) => candidates.filter(c => c[key]).length
    console.log(`${place.id}: ${count('file')} Commons, ${count('flickr')} Flickr, ${count('unsplash')} Unsplash${candidates.length ? ` → ${place.id}.jpg` : ''}`)
  } catch (err) {
    console.log(`${place.id}: failed — ${err.message}`)
  }
}
console.log(`sheets in ${outDir}`)
