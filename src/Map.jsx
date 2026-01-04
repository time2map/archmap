import { useState, useEffect, useCallback, useRef } from 'react'
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

// Mapbox tileset configuration
// Replace with your Mapbox tileset ID after uploading to Mapbox Studio
const MAPBOX_TILESET_ID = import.meta.env.VITE_MAPBOX_TILESET_ID || 'your-username.your-tileset-id'
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
// Source layer name - typically matches your GeoJSON filename (without .geojson)
// Common names: "data", "points", or the filename you uploaded
const MAPBOX_SOURCE_LAYER = import.meta.env.VITE_MAPBOX_SOURCE_LAYER || 'data'

function MapComponent({ data, useVectorTiles = false }) {
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [viewState, setViewState] = useState({
    longitude: -3.7038,
    latitude: 40.4168,
    zoom: 6
  })
  const [isLocating, setIsLocating] = useState(false)
  const mapRef = useRef(null)

  // Fallback: Parse coordinates for non-vector tile mode
  const markers = useVectorTiles ? [] : (data || [])
    .filter(item => item.coords && item.coords.includes(','))
    .map(item => {
      const [lat, lng] = item.coords.split(',').map(Number)
      return {
        ...item,
        position: [lat, lng]
      }
    })
    .filter(item => !isNaN(item.position[0]) && !isNaN(item.position[1]))

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
  }, [markers.length, useVectorTiles])

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
                id="architectural-points"
                type="circle"
                source-layer={MAPBOX_SOURCE_LAYER}
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
                  'circle-color': '#3498db',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                  'circle-opacity': 0.8
                }}
              />
            </Source>
          </>
        ) : (
          // Fallback mode: Render individual markers (original implementation)
          data && data.length > 0 && (
            <>
              {markers.map((item, index) => (
                <Marker
                  key={item.id || index}
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
                        backgroundColor: '#3498db',
                        transition: 'width 0.2s, height 0.2s'
                      }}
                    />
                  </div>
                </Marker>
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
            <div className={`${isMobile ? 'min-w-[calc(100vw-60px)] max-w-[calc(100vw-60px)]' : 'min-w-[200px] max-w-[320px]'}`}>
              {getImageUrl(selectedFeature.properties) && (
                <img
                  src={getImageUrl(selectedFeature.properties)}
                  alt={selectedFeature.properties.title || 'Architecture photo'}
                  className="w-full h-auto mb-3 rounded-lg block shadow-md"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}
              <h3 className="m-0 mb-2 text-base font-semibold leading-tight text-gray-900">
                {selectedFeature.properties.title}
              </h3>
              <div className="space-y-1.5 text-sm text-gray-700">
                {selectedFeature.properties.author && selectedFeature.properties.author.length > 0 && (
                  <p className="m-0">
                    <span className="font-semibold text-gray-900">Author:</span>{' '}
                    {Array.isArray(selectedFeature.properties.author) 
                      ? selectedFeature.properties.author.join(', ')
                      : selectedFeature.properties.author}
                  </p>
                )}
                {selectedFeature.properties.city && selectedFeature.properties.city.length > 0 && (
                  <p className="m-0">
                    <span className="font-semibold text-gray-900">City:</span>{' '}
                    {Array.isArray(selectedFeature.properties.city)
                      ? selectedFeature.properties.city.join(', ')
                      : selectedFeature.properties.city}
                  </p>
                )}
                {selectedFeature.properties.country && selectedFeature.properties.country.length > 0 && (
                  <p className="m-0">
                    <span className="font-semibold text-gray-900">Country:</span>{' '}
                    {Array.isArray(selectedFeature.properties.country)
                      ? selectedFeature.properties.country.join(', ')
                      : selectedFeature.properties.country}
                  </p>
                )}
                {selectedFeature.properties.date && (
                  <p className="m-0">
                    <span className="font-semibold text-gray-900">Date:</span>{' '}
                    {selectedFeature.properties.date}
                  </p>
                )}
              </div>
              {getArticleUrl(selectedFeature.properties) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
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
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

export default MapComponent
