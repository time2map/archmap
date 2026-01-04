import { useState, useEffect } from 'react'
import Map from './Map'
import './App.css'

// Set to true to use Mapbox vector tiles, false to use local GeoJSON
const USE_VECTOR_TILES = import.meta.env.VITE_USE_VECTOR_TILES === 'true'

// Detect mobile device
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768

function App() {
  const [data, setData] = useState([])
  const [firms, setFirms] = useState([])
  const [selectedFirms, setSelectedFirms] = useState([])
  const [showFilter, setShowFilter] = useState(!isMobile) // Hidden on mobile by default, visible on desktop
  const [loading, setLoading] = useState(!USE_VECTOR_TILES)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Load firms data
    fetch(`${import.meta.env.BASE_URL}firms.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load firms')
        }
        return response.json()
      })
      .then(firmsData => {
        setFirms(firmsData.firms || [])
      })
      .catch(err => {
        console.error('Error loading firms:', err)
      })

    // Only load data.json if not using vector tiles
    if (USE_VECTOR_TILES) {
      setLoading(false)
      return
    }

    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        return response.json()
      })
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleFirmChange = (firmName) => {
    setSelectedFirms(prev => {
      if (prev.includes(firmName)) {
        return prev.filter(f => f !== firmName)
      } else {
        return [...prev, firmName]
      }
    })
  }

  const clearFilters = () => {
    setSelectedFirms([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Loading map data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl text-red-600 font-semibold">Error</p>
          <p className="text-gray-700 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Filter Toggle Button - Always visible when filter is hidden */}
      {!showFilter && (
        <button
          onClick={() => setShowFilter(true)}
          className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
          title="Show filter"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {selectedFirms.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedFirms.length}
            </span>
          )}
        </button>
      )}

      {/* Firm Filter */}
      {showFilter && (
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs w-full firm-filter">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Filter by bureau</h3>
            <div className="flex items-center gap-2">
              {selectedFirms.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowFilter(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Hide filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {firms.length === 0 ? (
              <p className="text-xs text-gray-500">Loading firms...</p>
            ) : (
              <div className="space-y-1">
                {firms.map((firm) => (
                  <label
                    key={firm.name}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFirms.includes(firm.name)}
                      onChange={() => handleFirmChange(firm.name)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700 flex-1">
                      {firm.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({firm.count})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedFirms.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                {selectedFirms.length} firm{selectedFirms.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>
      )}
      <Map data={data} useVectorTiles={USE_VECTOR_TILES} selectedFirms={selectedFirms} />
    </div>
  )
}

export default App

