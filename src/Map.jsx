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
    <div style={{ flex: 1, position: 'relative' }}>
      {/* Geolocation Button */}
      <button
        onClick={handleGeolocate}
        disabled={isLocating}
        style={{
          position: 'absolute',
          bottom: '50px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: '#fff',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          padding: '10px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          opacity: isLocating ? 0.6 : 1,
          transition: 'opacity 0.2s'
        }}
        title="Find my location"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
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
          >
            <div style={{ 
              minWidth: isMobile ? 'calc(100vw - 60px)' : '200px', 
              maxWidth: isMobile ? 'calc(100vw - 60px)' : '300px' 
            }}>
              {getImageUrl(selectedFeature.properties) && (
                <img
                  src={getImageUrl(selectedFeature.properties)}
                  alt={selectedFeature.properties.title || 'Architecture photo'}
                  style={{
                    width: '100%',
                    height: 'auto',
                    marginBottom: '0.75rem',
                    borderRadius: '4px',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', lineHeight: '1.3' }}>
                {selectedFeature.properties.title}
              </h3>
              {selectedFeature.properties.author && selectedFeature.properties.author.length > 0 && (
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                  <strong>Author:</strong> {Array.isArray(selectedFeature.properties.author) 
                    ? selectedFeature.properties.author.join(', ')
                    : selectedFeature.properties.author}
                </p>
              )}
              {selectedFeature.properties.city && selectedFeature.properties.city.length > 0 && (
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                  <strong>City:</strong> {Array.isArray(selectedFeature.properties.city)
                    ? selectedFeature.properties.city.join(', ')
                    : selectedFeature.properties.city}
                </p>
              )}
              {selectedFeature.properties.country && selectedFeature.properties.country.length > 0 && (
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                  <strong>Country:</strong> {Array.isArray(selectedFeature.properties.country)
                    ? selectedFeature.properties.country.join(', ')
                    : selectedFeature.properties.country}
                </p>
              )}
              {selectedFeature.properties.date && (
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                  <strong>Date:</strong> {selectedFeature.properties.date}
                </p>
              )}
              {getArticleUrl(selectedFeature.properties) && (
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.85rem' }}>
                  <a
                    href={getArticleUrl(selectedFeature.properties)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#3498db',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.textDecoration = 'none'
                    }}
                  >
                    View original article →
                  </a>
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

export default MapComponent
