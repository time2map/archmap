import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cityTitle, cityDescription, cityPath, siteTitle, siteDescription } from './meta'

// Same base map as the main tab (see Map.jsx)
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
const MAP_STYLE = MAPBOX_ACCESS_TOKEN
  ? 'mapbox://styles/mapbox/standard'
  : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
// Standard places custom layers into slots: areas under roads, lines above them
const slot = (name) => (MAPBOX_ACCESS_TOKEN ? { slot: name } : {})

const GROUPS = [
  { id: 'city-core', label: 'City core', color: '#c0392b' },
  { id: 'housing', label: 'Housing', color: '#e67e22' },
  { id: 'buildings', label: 'Buildings', color: '#2980b9' },
  { id: 'unusual', label: 'Unusual', color: '#8e44ad' },
  { id: 'parks', label: 'Parks', color: '#27ae60' }
]
const GROUP_BY_ID = Object.fromEntries(GROUPS.map(g => [g.id, g]))
const MIN_MENTIONS = [1, 2, 3]
// The map's frame when no city is open
const OVERVIEW = Symbol('overview')

const isLocated = (pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng)
const located = (pins) => pins.filter(isLocated)

// Everything a place shows on the map: its areas and lines first, then its buildings.
// A shape's pin stands at the position the verify script chose for it.
function pinsOf(place) {
  return [
    ...(place.shapes || []).map(shape => ({ name: shape.name, lat: shape.lat, lng: shape.lng, shape: shape.geometry ? shape : null })),
    ...place.points.map(point => ({ name: point.name, lat: point.lat, lng: point.lng, shape: null }))
  ]
}

// The most mentioned first, then those with a photo, then places on the map
function sortPlaces(places) {
  return [...places].sort((a, b) =>
    b.sources.length - a.sources.length ||
    Number((b.photos || []).length > 0) - Number((a.photos || []).length > 0) ||
    Number(located(b.pins).length > 0) - Number(located(a.pins).length > 0) ||
    (b.photos || []).length - (a.photos || []).length ||
    a.title.localeCompare(b.title)
  )
}

function shapeCoords(geometry) {
  return geometry.type === 'MultiPolygon' ? geometry.coordinates.flat(2) : geometry.coordinates.flat()
}

// Bounds of [lng, lat] pairs
function boundsOf(coords) {
  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

// Whole outlines of the pins' shapes plus the building points
function pinCoords(pins) {
  return located(pins).flatMap(pin => (pin.shape ? shapeCoords(pin.shape.geometry) : [[pin.lng, pin.lat]]))
}

function bboxArea(coords) {
  const [[west, south], [east, north]] = boundsOf(coords)
  return (east - west) * (north - south)
}

function mapPadding() {
  return window.innerWidth < 768 ? 40 : 80
}

function googleMapsUrl(point) {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`
}

function googleMapsSearchUrl(place, cityName) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.title}, ${cityName}`)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2017-09-20" → "20 Sep 2017", "2017-09" → "Sep 2017", "2017" → "2017"
function formatDate(date) {
  if (!date) return null
  const [year, month, day] = date.split('-').map(Number)
  return [day, month && MONTHS[month - 1], year].filter(Boolean).join(' ')
}

function sourceLabel(source) {
  const author = source.author && source.author !== source.publisher ? source.author : null
  return [source.publisher, author, formatDate(source.date)].filter(Boolean).join(' · ')
}

const stop = (e) => e.stopPropagation()

function ExternalIcon() {
  return (
    <svg className="w-3.5 h-3.5 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function PhotoGallery({ photos, title }) {
  const [index, setIndex] = useState(0)
  const stripRef = useRef(null)

  const scrollTo = (next) => {
    const strip = stripRef.current
    if (!strip) return
    strip.scrollTo({ left: next * strip.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="relative group">
      <div
        ref={stripRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.map((photo, i) => (
          <figure key={photo.file} className="w-full shrink-0 snap-center">
            <img
              src={photo.src}
              alt={`${title} — photo ${i + 1}`}
              loading="lazy"
              className="w-full aspect-[16/10] object-cover bg-gray-100"
            />
            <figcaption className="px-3 pt-1.5 text-[11px] leading-tight text-gray-500">
              Photo:{' '}
              <a href={photo.page} target="_blank" rel="noopener noreferrer" onClick={stop} className="underline hover:text-gray-700">
                {photo.author}
              </a>
              {', '}
              {photo.licenseUrl ? (
                <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" onClick={stop} className="underline hover:text-gray-700">
                  {photo.license}
                </a>
              ) : photo.license}
              {' · Wikimedia Commons'}
            </figcaption>
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white pointer-events-none">
            {index + 1}/{photos.length}
          </span>
          {index > 0 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); scrollTo(index - 1) }}
              className="absolute left-2 top-[calc(50%-1.5rem)] hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ‹
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); scrollTo(index + 1) }}
              className="absolute right-2 top-[calc(50%-1.5rem)] hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  )
}

function PlaceCard({ place, cityName, sources, selected, onSelect, onSelectPoint, cardRef }) {
  const group = GROUP_BY_ID[place.group]
  const votes = place.sources.length
  const mapPins = located(place.pins)
  const isEnsemble = place.pins.length > 1

  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(place)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(place)
        }
      }}
      className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected ? 'shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md'
      }`}
      style={selected ? { borderColor: group.color, boxShadow: `0 0 0 2px ${group.color}` } : undefined}
    >
      {place.photos?.length > 0 && <PhotoGallery photos={place.photos} title={place.title} />}

      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug text-gray-900">{place.title}</h3>
            {(place.architect || place.year) && (
              <p className="mt-0.5 text-sm text-gray-600">{[place.architect, place.year].filter(Boolean).join(' · ')}</p>
            )}
            {place.area && <p className="mt-0.5 text-xs text-gray-500">{place.area}</p>}
          </div>
          <div className="shrink-0 text-right" title="Independent authors and outlets that recommend this place">
            <div className="text-lg font-bold leading-none text-gray-900">{votes}</div>
            <div className="text-[10px] text-gray-500">{votes === 1 ? 'mention' : 'mentions'}</div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
            {group.label}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-gray-800">{place.why}</p>

        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">Recommended by</p>
          <div className="flex flex-wrap gap-1">
            {place.sources.map(key => {
              const source = sources[key]
              return (
                <a
                  key={key}
                  href={source.url}
                  title={source.title}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={stop}
                  className="text-xs rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 hover:bg-gray-200"
                >
                  {sourceLabel(source)}
                </a>
              )
            })}
          </div>
        </div>

        {isEnsemble && (
          <ul className="mt-3 space-y-1">
            {place.pins.map((point, index) => {
              const onMap = isLocated(point)
              return (
                <li key={`${point.name}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                  {onMap ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectPoint(place, index)
                        }}
                        className="text-left text-gray-700 hover:text-gray-900 hover:underline"
                      >
                        {point.name}
                      </button>
                      <a
                        href={googleMapsUrl(point)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={stop}
                        className="text-green-700 hover:text-green-800"
                        title="Open in Google Maps"
                      >
                        <ExternalIcon />
                      </a>
                    </>
                  ) : (
                    <span className="text-gray-400" title="No confirmed location">{point.name} — no confirmed location</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {place.note && <p className="mt-2 text-xs text-gray-500">{place.note}</p>}

        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {mapPins.length > 0 ? (
            <a
              href={googleMapsUrl(mapPins[0])}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="inline-flex items-center gap-1 font-medium text-green-700 hover:text-green-800"
            >
              Open in Google Maps <ExternalIcon />
            </a>
          ) : (
            <>
              <span className="text-gray-500">No confirmed location</span>
              <a
                href={googleMapsSearchUrl(place, cityName)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="inline-flex items-center gap-1 font-medium text-green-700 hover:text-green-800"
              >
                Find in Google Maps <ExternalIcon />
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

// A city on the overview. The name is a real link, for search engines and for opening the city in a new tab.
function CityCard({ city, onOpen }) {
  const open = () => onOpen(city.id)
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {city.cover && <PhotoGallery photos={[city.cover]} title={city.coverTitle} />}
      <div className="p-3 sm:p-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          <a
            href={cityPath(city.id)}
            onClick={(e) => {
              // Cmd/Ctrl- and Shift-click open the page in a new tab or window; a plain click opens it here, through the card
              if (e.metaKey || e.ctrlKey || e.shiftKey) e.stopPropagation()
              else e.preventDefault()
            }}
            className="hover:underline"
          >
            {city.name}
          </a>
        </h2>
        <span className="shrink-0 text-sm text-gray-500">{city.count} places</span>
      </div>
    </article>
  )
}

// With a city: its places. Without one: the overview of all cities, on the same map, so that opening a city flies into it.
function TopCity({ cityId, onCityChange }) {
  const [cities, setCities] = useState([])
  // City files by id, loaded on demand and kept: a city opened from the overview shows at once
  const [cityData, setCityData] = useState({})
  const [error, setError] = useState(null)
  // pointIndex: which pin of an ensemble is active (only that one gets a map label)
  const [selection, setSelection] = useState({ id: null, pointIndex: null })
  const [groupFilter, setGroupFilter] = useState('all')
  const [minMentions, setMinMentions] = useState(1)
  const [mapLoaded, setMapLoaded] = useState(false)
  // Rounded to half steps so markers re-render only when their size class can change
  const [zoom, setZoom] = useState(11)
  const [cursor, setCursor] = useState('')
  const mapRef = useRef(null)
  const cardRefs = useRef({})
  const requestedCities = useRef(new Set())
  // What the map framed last: null before the first frame, OVERVIEW, or a city id
  const framedRef = useRef(null)
  const selectedId = selection.id

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}top/index.json`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load the list of cities')
        return response.json()
      })
      .then(setCities)
      .catch(err => setError(err.message))
  }, [])

  const loadCity = useCallback((id) => {
    if (requestedCities.current.has(id)) return
    requestedCities.current.add(id)
    fetch(`${import.meta.env.BASE_URL}top/${id}.json`)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load ${id}`)
        return response.json()
      })
      .then(data => setCityData(prev => ({ ...prev, [id]: data })))
      .catch(err => setError(err.message))
  }, [])

  // A city's page needs only its own file; the overview needs all of them
  useEffect(() => {
    if (cityId) loadCity(cityId)
    else cities.forEach(c => loadCity(c.id))
  }, [cityId, cities, loadCity])

  const city = (cityId && cityData[cityId]) || null

  useEffect(() => {
    setSelection({ id: null, pointIndex: null })
  }, [cityId])

  // Every loaded city: the bounds of its pins, its cover, and where its marker stands: at the place
  // of the cover (the Eiffel Tower, the Royal Palace), or in the middle of the city without one
  const overview = useMemo(() => cities.filter(c => cityData[c.id]).map(({ id }) => {
    const data = cityData[id]
    const bounds = boundsOf(data.places.flatMap(place => located(pinsOf(place)).map(pin => [pin.lng, pin.lat])))
    const coverPlace = data.places.find(place => (place.photos || []).some(photo => photo.file === data.cover))
    const at = coverPlace && located(pinsOf(coverPlace))[0]
    return {
      id,
      name: data.name,
      count: data.places.length,
      bounds,
      cover: coverPlace?.photos.find(photo => photo.file === data.cover),
      coverTitle: coverPlace?.title,
      lng: at ? at.lng : (bounds[0][0] + bounds[1][0]) / 2,
      lat: at ? at.lat : (bounds[0][1] + bounds[1][1]) / 2
    }
  }), [cities, cityData])

  // On a city's own URL the browser tab shows the same title as its static page; the home page keeps the site title
  useEffect(() => {
    if (!city || !cityId) return
    document.title = cityTitle(city)
    return () => { document.title = siteTitle() }
  }, [city, cityId])

  // rank keeps higher places on top where pins overlap
  const places = useMemo(
    () => (city ? sortPlaces(city.places.map(place => ({ ...place, pins: pinsOf(place) }))).map((place, rank) => ({ ...place, rank })) : []),
    [city]
  )

  const visiblePlaces = useMemo(() => places.filter(place =>
    place.sources.length >= minMentions && (groupFilter === 'all' || place.group === groupFilter)
  ), [places, groupFilter, minMentions])

  // Pins only: a whole district would zoom the city out too far. Without a pitch the map keeps its tilt.
  const fitPlaces = useCallback((list, duration = 1000, pitch) => {
    const coords = list.flatMap(p => located(p.pins).map(pin => [pin.lng, pin.lat]))
    if (mapRef.current && coords.length > 0) {
      mapRef.current.fitBounds(boundsOf(coords), { padding: mapPadding(), duration, ...(pitch !== undefined && { pitch }) })
    }
  }, [])

  // Areas and lines of the visible places; smaller areas go last so they are drawn and hit on top
  const shapeData = useMemo(() => {
    const features = visiblePlaces.flatMap(place => place.pins.map((pin, pinIndex) => (pin.shape ? {
      type: 'Feature',
      geometry: pin.shape.geometry,
      properties: {
        placeId: place.id,
        pinIndex,
        kind: pin.shape.kind,
        color: GROUP_BY_ID[place.group].color,
        selected: place.id === selectedId,
        size: bboxArea(shapeCoords(pin.shape.geometry))
      }
    } : null)).filter(Boolean))
    features.sort((a, b) => b.properties.size - a.properties.size)
    return { type: 'FeatureCollection', features }
  }, [visiblePlaces, selectedId])

  // Frame the whole city once its file is loaded: fly in from the overview, jump from another city
  // or on the first load. Back on the overview, frame every city once all of them are loaded.
  useEffect(() => {
    const map = mapRef.current
    if (!mapLoaded || !map) return
    const framed = framedRef.current
    if (cityId) {
      if (places.length === 0 || framed === cityId) return
      fitPlaces(places, framed === OVERVIEW ? 2000 : 0, 45)
      framedRef.current = cityId
    } else if (framed !== OVERVIEW && cities.length > 0 && overview.length === cities.length) {
      const padding = mapPadding()
      map.fitBounds(boundsOf(overview.flatMap(c => c.bounds)), {
        // Room at the bottom for the labels under the southern cities
        padding: { top: padding, right: padding, bottom: padding + 32, left: padding },
        maxZoom: 6,
        pitch: 0,
        duration: framed ? 1500 : 0
      })
      framedRef.current = OVERVIEW
    }
  }, [mapLoaded, cityId, places, cities, overview, fitPlaces])

  useEffect(() => {
    if (!visiblePlaces.some(p => p.id === selectedId)) setSelection({ id: null, pointIndex: null })
  }, [visiblePlaces, selectedId])

  // A single building: fly to it. Areas, lines and ensembles: frame all of it.
  const showPlaceOnMap = useCallback((place, pointIndex = null) => {
    const map = mapRef.current
    const pins = pointIndex !== null ? [place.pins[pointIndex]] : located(place.pins)
    if (!map || pins.length === 0 || !isLocated(pins[0])) return
    if (pins.length === 1 && !pins[0].shape) {
      map.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 16, pitch: 45, duration: 1200 })
    } else {
      map.fitBounds(boundsOf(pinCoords(pins)), { padding: mapPadding(), maxZoom: 16, pitch: 45, duration: 1200 })
    }
  }, [])

  const handleSelect = useCallback((place) => {
    setSelection({ id: place.id, pointIndex: null })
    showPlaceOnMap(place)
  }, [showPlaceOnMap])

  const handleSelectPoint = useCallback((place, pointIndex) => {
    setSelection({ id: place.id, pointIndex })
    showPlaceOnMap(place, pointIndex)
  }, [showPlaceOnMap])

  const handleMarkerClick = useCallback((place, pointIndex) => {
    const activePoint = place.pins.length > 1 ? pointIndex : null
    setSelection({ id: place.id, pointIndex: activePoint })
    showPlaceOnMap(place, activePoint)
    cardRefs.current[place.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [showPlaceOnMap])

  const handleShapeClick = (e) => {
    const feature = e.features?.[0]
    const place = feature && places.find(p => p.id === feature.properties.placeId)
    if (place) handleMarkerClick(place, feature.properties.pinIndex)
  }

  const handleGroupFilter = (groupId) => {
    setGroupFilter(groupId)
    fitPlaces(places.filter(place =>
      place.sources.length >= minMentions && (groupId === 'all' || place.group === groupId)
    ))
  }

  const groupChips = [
    { id: 'all', label: 'All', count: places.length },
    ...GROUPS.map(g => ({ ...g, count: places.filter(p => p.group === g.id).length }))
  ].filter(chip => chip.id === 'all' || chip.count > 0)

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      {/* Map: top on mobile, right on desktop */}
      <div className="relative order-1 md:order-2 h-[42%] md:h-auto md:flex-1 shrink-0">
        <Map
          ref={mapRef}
          // Replaced by the frame of the city or of all cities as soon as their files load
          initialViewState={cityId ? { longitude: -3.7, latitude: 40.42, zoom: 11, pitch: 45 } : { longitude: 2, latitude: 45, zoom: 4, pitch: 0 }}
          onZoom={(e) => {
            const next = Math.round(e.viewState.zoom * 2) / 2
            setZoom(prev => (prev === next ? prev : next))
          }}
          onLoad={(e) => {
            // Same as the main tab: keep Standard's 3D buildings, drop terrain so pins stay visible
            e.target.setTerrain(null)
            setMapLoaded(true)
          }}
          // Outlines and lines are clickable; the inside of an area is not, or a whole district would catch every click
          interactiveLayerIds={['top-shapes-hit']}
          onClick={handleShapeClick}
          onMouseEnter={() => setCursor('pointer')}
          onMouseLeave={() => setCursor('')}
          cursor={cursor}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN || undefined}
        >
          {mapLoaded && (
            <Source id="top-shapes" type="geojson" data={shapeData}>
              {/* Emissive strength 1 keeps the colours true under Standard's lighting */}
              <Layer
                id="top-areas-fill"
                type="fill"
                {...slot('bottom')}
                filter={['==', ['get', 'kind'], 'area']}
                paint={{
                  'fill-color': ['get', 'color'],
                  'fill-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.18, 0.08],
                  'fill-emissive-strength': 1
                }}
              />
              <Layer
                id="top-areas-line"
                type="line"
                {...slot('middle')}
                filter={['==', ['get', 'kind'], 'area']}
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': ['case', ['boolean', ['get', 'selected'], false], 2.5, 1.5],
                  'line-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.9, 0.5],
                  'line-emissive-strength': 1
                }}
              />
              <Layer
                id="top-lines"
                type="line"
                {...slot('middle')}
                filter={['==', ['get', 'kind'], 'line']}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': ['case', ['boolean', ['get', 'selected'], false], 6, 4],
                  'line-opacity': ['case', ['boolean', ['get', 'selected'], false], 1, 0.75],
                  'line-emissive-strength': 1
                }}
              />
              {/* Wide invisible line along outlines and lines, so they are easy to hit */}
              <Layer
                id="top-shapes-hit"
                type="line"
                {...slot('middle')}
                paint={{ 'line-color': '#000000', 'line-width': 14, 'line-opacity': 0 }}
              />
            </Source>
          )}

          {visiblePlaces.map(place => {
            const color = GROUP_BY_ID[place.group].color
            const selected = place.id === selectedId
            const isEnsemble = place.pins.length > 1
            const photo = place.photos?.[0]
            return place.pins.map((point, index) => {
              if (!isLocated(point)) return null
              // In an ensemble only the active pin is labelled, otherwise labels pile up
              const active = selected && (!isEnsemble || selection.pointIndex === index)
              // Dense cities: small pins when zoomed out, so they don't cover each other
              const base = zoom < 12 ? 18 : zoom < 13.5 ? 28 : 40
              const size = active ? 56 : selected ? Math.max(base, 32) : isEnsemble ? base - 4 : base
              return (
                <Marker
                  key={`${place.id}-${index}`}
                  longitude={point.lng}
                  latitude={point.lat}
                  anchor="center"
                  // Higher places on top; the selected place above everything
                  style={{ zIndex: active ? places.length + 2 : selected ? places.length + 1 : places.length - place.rank }}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation()
                    handleMarkerClick(place, index)
                  }}
                >
                  <div className="relative cursor-pointer" title={point.name || place.title}>
                    {/* The group colour is the ring; the first photo fills the pin */}
                    <div
                      className="rounded-full overflow-hidden bg-white shadow-md transition-all duration-200"
                      style={{ width: size, height: size, border: `${size < 24 ? 2 : 3}px solid ${color}` }}
                    >
                      {photo && (
                        <img
                          src={photo.thumb || photo.src}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {active && (
                      <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-white/95 px-2 py-0.5 text-xs font-semibold text-gray-900 shadow pointer-events-none">
                        {point.name || place.title}
                      </div>
                    )}
                  </div>
                </Marker>
              )
            })
          })}

          {/* The overview: a city's cover at its landmark; a click opens the city */}
          {!cityId && overview.map(c => (
            <Marker
              key={c.id}
              longitude={c.lng}
              latitude={c.lat}
              anchor="center"
              // Northern cities on top: a label hangs below its photo, onto the city south of it
              style={{ zIndex: Math.round(c.lat * 100) }}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onCityChange(c.id)
              }}
            >
              <div className="relative cursor-pointer group" title={c.name}>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-white border-[3px] border-white shadow-lg transition-transform group-hover:scale-110">
                  {c.cover && (
                    <img src={c.cover.thumb || c.cover.src} alt="" draggable={false} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-white/95 px-2 py-0.5 text-xs font-semibold text-gray-900 shadow">
                  {c.name} <span className="font-normal text-gray-500">· {c.count}</span>
                </div>
              </div>
            </Marker>
          ))}
        </Map>
      </div>

      {/* List: bottom on mobile, left sidebar on desktop */}
      <aside className="order-2 md:order-1 flex-1 min-h-0 md:flex-none md:w-[420px] overflow-y-auto bg-gray-50 border-t md:border-t-0 md:border-r border-gray-200">
        <div className="p-3 sm:p-4 space-y-3">
          {/* The heading repeats the page title (src/meta.js) */}
          <header className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-bold leading-snug text-gray-900">{city ? cityTitle(city) : cityId ? 'TOP' : siteTitle()}</h1>
            {cities.length > 0 && (
              <select
                value={cityId || ''}
                onChange={(e) => onCityChange(e.target.value || null)}
                className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-900"
                aria-label="City"
              >
                <option value="">All cities</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </header>

          {city && <p className="text-sm leading-relaxed text-gray-600">{cityDescription(city)}</p>}
          {!cityId && <p className="text-sm leading-relaxed text-gray-600">{siteDescription()}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {(cityId ? !city : overview.length === 0) && !error && <p className="text-sm text-gray-500">Loading…</p>}

          {!cityId && overview.map(c => <CityCard key={c.id} city={c} onOpen={onCityChange} />)}

          {city && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {groupChips.map(chip => {
                  const active = groupFilter === chip.id
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleGroupFilter(chip.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {chip.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chip.color }} />}
                      {chip.label}
                      <span className={active ? 'text-gray-300' : 'text-gray-400'}>{chip.count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span>Mentions</span>
                {MIN_MENTIONS.map(min => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setMinMentions(min)}
                    className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
                      minMentions === min ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {min === 1 ? 'Any' : `${min}+`}
                  </button>
                ))}
              </div>

              {visiblePlaces.map(place => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  cityName={city.name}
                  sources={city.sources}
                  selected={place.id === selectedId}
                  onSelect={handleSelect}
                  onSelectPoint={handleSelectPoint}
                  cardRef={(el) => { cardRefs.current[place.id] = el }}
                />
              ))}
              {visiblePlaces.length === 0 && <p className="text-sm text-gray-500">No places match these filters.</p>}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export default TopCity
