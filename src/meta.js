// Page titles and descriptions. The app sets the tab title from them, and scripts/buildPages.js
// writes them into the static page of each city (title, description, Open Graph), so keep this file free of JSX.

export const SITE_URL = 'https://archmap.time2map.com'
export const SITE_NAME = 'ArchMap'

// The home page's picture in link previews: a collage of the city covers, rebuilt only on request
// with `npm run og-image` (scripts/buildOgImage.js), so its alt names no cities
export const SITE_IMAGE = {
  path: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Landmarks of the cities on ArchMap'
}

export function siteTitle() {
  return `${SITE_NAME} – TOP places to visit for architects and designers`
}

// No list of cities: there will be too many of them
export function siteDescription() {
  return 'City by city, the best architecture on one map: city cores, notable buildings, contemporary housing, parks, and areas and streets to walk.'
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
