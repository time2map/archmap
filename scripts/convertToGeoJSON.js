import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the data file
const dataPath = path.join(__dirname, '..', 'data.json')
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

// Convert to GeoJSON FeatureCollection
const features = data
  .filter(item => item.coords && item.coords.includes(','))
  .map(item => {
    const [lat, lng] = item.coords.split(',').map(Number)
    
    if (isNaN(lat) || isNaN(lng)) {
      return null
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON uses [lng, lat]
      },
      properties: {
        id: item.id,
        slug: item.slug,
        title: item.title,
        img: item.img,
        author: item.author,
        country: item.country,
        city: item.city,
        actualizacion: item.actualizacion,
        hash: item.hash,
        date: item.date
      }
    }
  })
  .filter(feature => feature !== null)

const geoJSON = {
  type: 'FeatureCollection',
  features: features
}

// Write GeoJSON file
const outputPath = path.join(__dirname, '..', 'public', 'data.geojson')
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

fs.writeFileSync(outputPath, JSON.stringify(geoJSON, null, 2))

console.log(`Converted ${features.length} features to GeoJSON`)
console.log(`Output: ${outputPath}`)




