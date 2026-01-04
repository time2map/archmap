import { useState, useEffect } from 'react'
import Map from './Map'
import './App.css'

// Set to true to use Mapbox vector tiles, false to use local GeoJSON
const USE_VECTOR_TILES = import.meta.env.VITE_USE_VECTOR_TILES === 'true'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(!USE_VECTOR_TILES)
  const [error, setError] = useState(null)

  useEffect(() => {
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
      <Map data={data} useVectorTiles={USE_VECTOR_TILES} />
    </div>
  )
}

export default App

