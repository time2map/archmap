import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Map, { Source, Layer, Popup, Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Detect mobile device
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768

// Helper function to construct image URL
function getImageUrl(properties) {
  if (!properties?.id || !properties?.img || !properties?.hash) {
    return null
  }
  return `https://arquitecturaviva.com/assets/uploads/obras/${properties.id}/av_thumb__${properties.img}?h=${properties.hash}`
}

// Helper function to construct article URL
function getArticleUrl(properties) {
  if (!properties?.slug) {
    return null
  }
  return `https://arquitecturaviva.com/obras/${properties.slug}`
}

// Helper function to normalize author field (handles array, JSON string, or plain string)
function normalizeAuthor(author) {
  if (!author) return null
  
  // If it's already an array, return it
  if (Array.isArray(author)) {
    return author.filter(a => a && a.trim()).join(', ')
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof author === 'string') {
    // Check if it looks like a JSON array
    const trimmed = author.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.filter(a => a && a.trim()).join(', ')
        }
      } catch (e) {
        // If parsing fails, just return the string as is
      }
    }
    // If it's a plain string, return it
    return trimmed
  }
  
  return null
}

// Mapbox tileset configuration
// Replace with your Mapbox tileset ID after uploading to Mapbox Studio
const MAPBOX_TILESET_ID = import.meta.env.VITE_MAPBOX_TILESET_ID || 'your-username.your-tileset-id'
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
// Source layer name - typically matches your GeoJSON filename (without .geojson)
// Common names: "data", "points", or the filename you uploaded
const MAPBOX_SOURCE_LAYER = import.meta.env.VITE_MAPBOX_SOURCE_LAYER || 'data'

// Top-tier architects/firms to highlight in red
const TOP_TIER_FIRMS = [
  'Kengo Kuma',
  'Renzo Piano Building Workshop',
  'OMA - Office for Metropolitan Architecture',
  'BIG Bjarke Ingels Group',
  'Zaha Hadid Architects',
  'Tadao Ando',
  'Foster + Partners',
  'Snøhetta',
  'MVRDV',
  'Santiago Calatrava',
  'Norman Foster',
  'Alvar Aalto',
  'Frank Gehry'
]

// Helper function to check if item belongs to top-tier firms
function isTopTierFirm(item) {
  if (!item.author) return false
  
  const authors = Array.isArray(item.author) ? item.author : [item.author]
  
  return authors.some(author => {
    if (!author) return false
    const authorName = typeof author === 'string' ? author.trim() : String(author).trim()
    return TOP_TIER_FIRMS.includes(authorName)
  })
}

// Helper function to check if item belongs to selected firms
function belongsToSelectedFirms(item, selectedFirms) {
  if (!selectedFirms || selectedFirms.length === 0) {
    return true // Show all if no filter
  }
  
  if (!item.author) {
    return false
  }
  
  const authors = Array.isArray(item.author) ? item.author : [item.author]
  
  // Check if any of the item's authors match any selected firm
  return authors.some(author => {
    if (!author) return false
    const authorName = typeof author === 'string' ? author.trim() : String(author).trim()
    return selectedFirms.includes(authorName)
  })
}

function MapComponent({ data, useVectorTiles = false, selectedFirms = [] }) {
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [viewState, setViewState] = useState({
    longitude: 2.1734, // Barcelona coordinates
    latitude: 41.3851,
    zoom: 12
  })
  const [isLocating, setIsLocating] = useState(false)
  const mapRef = useRef(null)

  // Fallback: Parse coordinates for non-vector tile mode
  // Use useMemo to recalculate when data or selectedFirms change
  const markers = useMemo(() => {
    if (useVectorTiles) return []
    
    const filtered = (data || [])
      .filter(item => belongsToSelectedFirms(item, selectedFirms))
      .filter(item => item.coords && item.coords.includes(','))
      .map(item => {
        const [lat, lng] = item.coords.split(',').map(Number)
        return {
          ...item,
          position: [lat, lng]
        }
      })
      .filter(item => !isNaN(item.position[0]) && !isNaN(item.position[1]))
    
    return filtered
  }, [data, selectedFirms, useVectorTiles])

  // Calculate center point and fit bounds on initial load (only for non-vector mode)
  useEffect(() => {
    if (!useVectorTiles && markers.length > 0) {
      const lngs = markers.map(m => m.position[1])
      const lats = markers.map(m => m.position[0])
      
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      
      const centerLng = (minLng + maxLng) / 2
      const centerLat = (minLat + maxLat) / 2
      
      // Calculate zoom level based on bounds
      const lngDiff = maxLng - minLng
      const latDiff = maxLat - minLat
      const maxDiff = Math.max(lngDiff, latDiff)
      
      let zoom = 6
      if (maxDiff < 0.1) zoom = 10
      else if (maxDiff < 0.5) zoom = 8
      else if (maxDiff < 1) zoom = 7
      else if (maxDiff < 5) zoom = 6
      else zoom = 4
      
      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom: zoom
      })
    }
  }, [markers.length, useVectorTiles, selectedFirms])

  // Handle geolocation
  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setViewState({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          zoom: 14
        })
        setIsLocating(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to get your location. Please check your browser permissions.')
        setIsLocating(false)
      }
    )
  }, [])

  // Handle click on vector tile features
  const handleMapClick = useCallback((event) => {
    if (!useVectorTiles || !mapRef.current) return

    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ['architectural-points']
    })

    if (features && features.length > 0) {
      const feature = features[0]
      
      // Filter is already applied at layer level, so we can show the popup
      const coords = feature.geometry.coordinates
      
      // On mobile, center map first before showing popup
      if (isMobile) {
        setViewState(prev => ({
          ...prev,
          longitude: coords[0],
          latitude: coords[1]
        }))
        // Small delay to allow map to center before showing popup
        setTimeout(() => {
          setSelectedFeature({
            properties: feature.properties,
            coordinates: coords
          })
        }, 300)
      } else {
        setSelectedFeature({
          properties: feature.properties,
          coordinates: coords
        })
      }
    } else {
      setSelectedFeature(null)
    }
  }, [useVectorTiles])

  // Vector tile source URL - use mapbox:// protocol for Mapbox GL JS
  const vectorTileUrl = useVectorTiles && MAPBOX_ACCESS_TOKEN && MAPBOX_TILESET_ID
    ? `mapbox://${MAPBOX_TILESET_ID}`
    : null

  return (
    <div className="flex-1 relative">
      {/* Geolocation Button */}
      <button
        onClick={handleGeolocate}
        disabled={isLocating}
        className="absolute bottom-12 right-3 z-[1000] bg-white border-2 border-gray-200 rounded-lg p-2.5 cursor-pointer shadow-lg hover:shadow-xl hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center w-11 h-11"
        title="Find my location"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block"
        >
          <circle cx="12" cy="12" r="3" fill="#333" />
          <circle cx="12" cy="12" r="8" stroke="#333" strokeWidth="1.5" fill="none" />
          <line x1="12" y1="4" x2="12" y2="2" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="22" x2="12" y2="20" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="12" x2="2" y2="12" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="12" x2="20" y2="12" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle={useVectorTiles 
          ? "mapbox://styles/mapbox/streets-v12"
          : MAPBOX_ACCESS_TOKEN 
            ? "mapbox://styles/mapbox/streets-v12"
            : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN || undefined}
      >
        {useVectorTiles && vectorTileUrl ? (
          // Vector tile mode: Use Mapbox tileset
          <>
            <Source
              id="architectural-data"
              type="vector"
              url={vectorTileUrl}
            >
              <Layer
                key={`points-${selectedFirms.length}`}
                id="architectural-points"
                type="circle"
                source-layer={MAPBOX_SOURCE_LAYER}
                {...(selectedFirms && selectedFirms.length > 0 ? {
                  filter: [
                    'any',
                    ...selectedFirms.map(firm => [
                      'in',
                      firm,
                      ['get', 'author']
                    ])
                  ]
                } : {})}
                paint={{
                  'circle-radius': {
                    'base': 1.75,
                    'stops': [
                      [0, 2],
                      [10, 5],
                      [14, 15],
                      [16, 25],
                      [18, 35]
                    ]
                  },
                  'circle-color': [
                    'case',
                    [
                      'any',
                      ...TOP_TIER_FIRMS.map(firm => [
                        'in',
                        firm,
                        ['get', 'author']
                      ])
                    ],
                    '#e74c3c', // Red for top-tier firms
                    '#3498db'  // Blue for others
                  ],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                  'circle-opacity': 0.8
                }}
              />
              <Layer
                key={`labels-${selectedFirms.length}`}
                id="architectural-points-labels"
                type="symbol"
                source-layer={MAPBOX_SOURCE_LAYER}
                {...(selectedFirms && selectedFirms.length > 0 ? {
                  filter: [
                    'any',
                    ...selectedFirms.map(firm => [
                      'in',
                      firm,
                      ['get', 'author']
                    ])
                  ]
                } : {})}
                layout={{
                  'text-field': ['get', 'title'],
                  'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                  'text-size': 12,
                  'text-anchor': 'bottom',
                  'text-offset': [0, -0.5],
                  'text-allow-overlap': false,
                  'text-ignore-placement': false
                }}
                paint={{
                  'text-color': '#2c3e50',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 2,
                  'text-halo-blur': 1
                }}
                minzoom={14.5}
              />
            </Source>
          </>
        ) : (
          // Fallback mode: Render individual markers (original implementation)
          markers && markers.length > 0 && (
            <>
              {markers.map((item, index) => (
                <div key={item.id || index}>
                  <Marker
                    longitude={item.position[1]}
                    latitude={item.position[0]}
                    anchor="bottom"
                  >
                    <div
                      style={{
                        cursor: 'pointer',
                        width: viewState.zoom >= 14 ? '32px' : viewState.zoom >= 12 ? '24px' : '20px',
                        height: viewState.zoom >= 14 ? '32px' : viewState.zoom >= 12 ? '24px' : '20px',
                        borderRadius: '50%',
                        backgroundColor: '#2c3e50',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.2s, height 0.2s'
                      }}
                      onClick={() => {
                        const coords = [item.position[1], item.position[0]]
                        // On mobile, center map first before showing popup
                        if (isMobile) {
                          setViewState(prev => ({
                            ...prev,
                            longitude: coords[0],
                            latitude: coords[1]
                          }))
                          // Small delay to allow map to center before showing popup
                          setTimeout(() => {
                            setSelectedFeature({
                              properties: item,
                              coordinates: coords
                            })
                          }, 300)
                        } else {
                          setSelectedFeature({
                            properties: item,
                            coordinates: coords
                          })
                        }
                      }}
                    >
                      <div
                        style={{
                          width: viewState.zoom >= 14 ? '16px' : viewState.zoom >= 12 ? '12px' : '10px',
                          height: viewState.zoom >= 14 ? '16px' : viewState.zoom >= 12 ? '12px' : '10px',
                          borderRadius: '50%',
                          backgroundColor: isTopTierFirm(item) ? '#e74c3c' : '#3498db',
                          transition: 'width 0.2s, height 0.2s'
                        }}
                      />
                    </div>
                  </Marker>
                  {viewState.zoom >= 14.5 && item.title && (
                    <Marker
                      longitude={item.position[1]}
                      latitude={item.position[0]}
                      anchor="bottom"
                      offset={[0, -10]}
                    >
                      <div
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          border: '1px solid rgba(0,0,0,0.1)',
                          pointerEvents: 'none',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.title}
                      </div>
                    </Marker>
                  )}
                </div>
              ))}
            </>
          )
        )}
        
        {selectedFeature && (
          <Popup
            longitude={selectedFeature.coordinates[0]}
            latitude={selectedFeature.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedFeature(null)}
            closeButton={true}
            closeOnClick={false}
            className="popup-container"
          >
            <div className="popup-content-wrapper overflow-hidden">
              {getImageUrl(selectedFeature.properties) && (
                <img
                  src={getImageUrl(selectedFeature.properties)}
                  alt={selectedFeature.properties.title || 'Architecture photo'}
                  className="mb-3 rounded-lg block shadow-md"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}
              <h3 className="m-0 mb-2 text-base font-semibold leading-tight text-gray-900 break-words overflow-wrap-anywhere">
                {selectedFeature.properties.title}
              </h3>
              {normalizeAuthor(selectedFeature.properties.author) && (
                <p className="m-0 mb-2 text-sm text-gray-700">
                  {normalizeAuthor(selectedFeature.properties.author)}
                </p>
              )}
              {selectedFeature.properties.date && (
                <p className="m-0 mb-3 text-sm text-gray-600">
                  {selectedFeature.properties.date}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                {getArticleUrl(selectedFeature.properties) && (
                  <a
                    href={getArticleUrl(selectedFeature.properties)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 no-underline font-medium text-sm transition-colors duration-150 inline-flex items-center gap-1"
                  >
                    View original article
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps?q=${selectedFeature.coordinates[1]},${selectedFeature.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 no-underline font-medium text-sm transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Open in Google Maps
                  <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

export default MapComponent
