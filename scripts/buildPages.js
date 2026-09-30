import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SITE_URL, SITE_NAME, siteTitle, siteDescription, cityTitle, cityDescription, cityPath } from '../src/meta.js'

// Runs after `vite build` (npm run build). The app is a single page, but search engines and link
// previews need a URL of its own for every city, with its own title, description and Open Graph tags:
// - dist/<city>/index.html — the built index.html with the city's meta;
// - dist/index.html — the same page with the home page meta;
// - dist/sitemap.xml — the home page and every city listed in public/top/index.json.
// Usage: node scripts/buildPages.js

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dist = path.join(root, 'dist')
const topDir = path.join(root, 'public', 'top')
// The block in index.html that each page gets its own copy of
const META_BLOCK = /<!-- page meta[\s\S]*?<!-- \/page meta -->/

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The cover goes into link previews; verifyTop.js has already checked its license and thumbnail
function coverOf(city) {
  for (const place of city.places) {
    const photo = (place.photos || []).find(p => p.file === city.cover)
    if (photo) return { src: photo.src, alt: place.title }
  }
  throw new Error(`${city.id}: cover "${city.cover}" is not the file of any of the city's photos`)
}

function metaBlock({ title, description, url, image }) {
  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${escape(image.src)}" />`,
    `<meta property="og:image:alt" content="${escape(image.alt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />'
  ]
  return ['<!-- page meta -->', ...tags.map(tag => `    ${tag}`), '    <!-- /page meta -->'].join('\n')
}

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!META_BLOCK.test(template)) throw new Error('dist/index.html has no <!-- page meta --> block: run vite build first')

function writePage(file, meta) {
  const target = path.join(dist, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  // A function, so that "$" in the text is not read as a replacement pattern
  fs.writeFileSync(target, template.replace(META_BLOCK, () => metaBlock(meta)))
  console.log(`${file}: ${meta.title}`)
}

const cities = readJson(path.join(topDir, 'index.json')).map(({ id }) => readJson(path.join(topDir, `${id}.json`)))

writePage('index.html', { title: siteTitle(), description: siteDescription(cities), url: `${SITE_URL}/`, image: coverOf(cities[0]) })
for (const city of cities) {
  writePage(path.join(city.id, 'index.html'), {
    title: cityTitle(city),
    description: cityDescription(city),
    url: SITE_URL + cityPath(city.id),
    image: coverOf(city)
  })
}

const urls = [
  { loc: `${SITE_URL}/`, lastmod: cities.map(c => c.updated).sort().at(-1) },
  ...cities.map(city => ({ loc: SITE_URL + cityPath(city.id), lastmod: city.updated }))
]
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(({ loc, lastmod }) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`),
  '</urlset>'
].join('\n')
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap + '\n')
console.log(`sitemap.xml: ${urls.length} pages`)
