import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { SITE_URL, SITE_IMAGE } from '../src/meta.js'

// Builds public/og-image.jpg, the home page's picture in link previews: the covers of the cities
// in public/top/index.json (the first MAX_TILES of them), each with the city's name and the photo's
// author and licence. Not part of npm run build: run it on request and commit the image.
// Usage: npm run og-image

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const topDir = path.join(root, 'public', 'top')
const output = path.join(root, 'public', SITE_IMAGE.path)

const USER_AGENT = 'archmap-og-image/1.0 (https://github.com/time2map/archmap)'
const MAX_TILES = 8
const GAP = 4
const STRIP = 36
const BACKGROUND = '#111111'
const FONT = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"
const { width: WIDTH, height: HEIGHT } = SITE_IMAGE

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function coverOf(city) {
  for (const place of city.places) {
    const photo = (place.photos || []).find(p => p.file === city.cover)
    if (photo) return photo
  }
  throw new Error(`${city.id}: cover "${city.cover}" is not the file of any of the city's photos`)
}

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

// One row up to three cities, then two rows, the upper one taking the odd tile
function layout(count) {
  const rows = count <= 3 ? [count] : [Math.ceil(count / 2), Math.floor(count / 2)]
  const rowHeight = (HEIGHT - STRIP - GAP * (rows.length - 1)) / rows.length
  return rows.flatMap((inRow, row) => {
    const tileWidth = (WIDTH - GAP * (inRow - 1)) / inRow
    return Array.from({ length: inRow }, (_, i) => ({
      left: Math.round(i * (tileWidth + GAP)),
      top: Math.round(row * (rowHeight + GAP)),
      width: Math.round(tileWidth),
      height: Math.round(rowHeight)
    }))
  })
}

// The city's name over a dark gradient at the bottom of the tile, the photo credit under it
function tileOverlay({ width, height }, name, photo) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0" />
      <stop offset="1" stop-color="#000" stop-opacity="0.7" />
    </linearGradient>
  </defs>
  <rect x="0" y="${height - 120}" width="${width}" height="120" fill="url(#shade)" />
  <text x="20" y="${height - 40}" font-family="${FONT}" font-size="34" font-weight="700" fill="#ffffff">${escape(name)}</text>
  <text x="20" y="${height - 16}" font-family="${FONT}" font-size="14" fill="#ffffff" fill-opacity="0.8">${escape(`${photo.author} · ${photo.license}`)}</text>
</svg>`)
}

function stripOverlay() {
  const y = HEIGHT - STRIP / 2 + 5
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <text x="20" y="${y}" font-family="${FONT}" font-size="15" font-weight="600" fill="#ffffff">${escape(SITE_URL.replace(/^https?:\/\//, ''))}</text>
  <text x="${WIDTH - 20}" y="${y}" text-anchor="end" font-family="${FONT}" font-size="13" fill="#ffffff" fill-opacity="0.7">Photos: Wikimedia Commons, cropped</text>
</svg>`)
}

const cities = readJson(path.join(topDir, 'index.json')).slice(0, MAX_TILES).map(({ id }) => readJson(path.join(topDir, `${id}.json`)))
const tiles = layout(cities.length)

const composites = []
for (const [i, city] of cities.entries()) {
  const tile = tiles[i]
  const photo = coverOf(city)
  // Attention: the crop keeps the most striking part of the photo, not just its middle
  const image = await sharp(await download(photo.src))
    .resize(tile.width, tile.height, { fit: 'cover', position: sharp.strategy.attention })
    .composite([{ input: tileOverlay(tile, city.name, photo) }])
    .toBuffer()
  composites.push({ input: image, left: tile.left, top: tile.top })
  console.log(`${city.name}: ${photo.file} (${photo.author}, ${photo.license})`)
}
composites.push({ input: stripOverlay(), left: 0, top: 0 })

await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: BACKGROUND } })
  .composite(composites)
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(output)
console.log(`${path.relative(root, output)}: ${cities.length} cities, ${Math.round(fs.statSync(output).size / 1024)} KB`)
