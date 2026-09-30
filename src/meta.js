// Page titles and descriptions. The app sets the tab title from them, and scripts/buildPages.js
// writes them into the static page of each city (title, description, Open Graph), so keep this file free of JSX.

export const SITE_URL = 'https://archmap.time2map.com'
export const SITE_NAME = 'ArchMap'

// "Madrid, Barcelona and Paris"
function listNames(names) {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join('')
}

export function siteTitle() {
  return `${SITE_NAME} – TOP places to visit for architects and designers`
}

export function siteDescription(cities) {
  return `The best architecture, city cores, and areas and streets to walk in ${listNames(cities.map(c => c.name))}, on one map.`
}

export function cityTitle(city) {
  return `${city.name} – TOP ${city.places.length} places to visit for architects and designers`
}

export function cityDescription(city) {
  return `The best architecture of ${city.name} on one map: the city core, notable buildings, contemporary housing, parks, and areas and streets to walk.`
}

export function cityPath(id) {
  return `/${id}/`
}
