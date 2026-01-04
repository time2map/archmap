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

    fetch('/data.json')
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
      <div className="loading">
        <p>Loading map data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ArchMap</h1>
        <p className="subtitle">
          {USE_VECTOR_TILES 
            ? 'Architectural locations' 
            : `${data.length} architectural locations`}
        </p>
      </header>
      <Map data={data} useVectorTiles={USE_VECTOR_TILES} />
    </div>
  )
}

export default App

