import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the data file
const dataPath = path.join(__dirname, '..', 'data.json')
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

// Collect all firms/authors
const firmCounts = {}

data.forEach(item => {
  if (item.author && item.author.length > 0) {
    const authors = Array.isArray(item.author) ? item.author : [item.author]
    
    authors.forEach(author => {
      if (author && author.trim()) {
        const firmName = author.trim()
        firmCounts[firmName] = (firmCounts[firmName] || 0) + 1
      }
    })
  }
})

// Convert to array and sort by count (descending)
const firms = Object.entries(firmCounts)
  .map(([name, count]) => ({
    name,
    count
  }))
  .sort((a, b) => b.count - a.count)

// Create output object
const output = {
  firms,
  totalFirms: firms.length,
  totalProjects: data.length
}

// Write to file
const outputPath = path.join(__dirname, '..', 'public', 'firms.json')
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')

console.log(`Extracted ${firms.length} unique firms`)
console.log(`Top 10 firms by project count:`)
firms.slice(0, 10).forEach((firm, index) => {
  console.log(`${index + 1}. ${firm.name}: ${firm.count} projects`)
})

