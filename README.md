# ArchMap

A React application that displays architectural data on an interactive map. Each entry from `data.json` is shown as a point on the map with detailed information available in popups.

## Features

- Interactive map using MapLibre GL and React Map GL
- All architectural locations from `data.json` displayed as markers
- Clickable markers with popups showing:
  - Photo (when available)
  - Title
  - Author(s)
  - City
  - Country
  - Date
- Automatic map bounds adjustment to show all markers
- Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure `data.json` is in the `public` folder (it should already be there)

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup

1. **Push your code to GitHub** (if you haven't already):
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save

3. **(Optional) Configure Mapbox Secrets** (only if using vector tiles):
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add the following secrets if you want to use Mapbox vector tiles:
     - `VITE_MAPBOX_ACCESS_TOKEN` - Your Mapbox access token
     - `VITE_MAPBOX_TILESET_ID` - Your Mapbox tileset ID
     - `VITE_MAPBOX_SOURCE_LAYER` - Your source layer name (e.g., `data`)
     - `VITE_USE_VECTOR_TILES` - Set to `true` to use vector tiles
   - If you don't add these secrets, the app will use local GeoJSON mode

4. **The workflow will automatically deploy** on every push to `main` branch

Your site will be available at: `https://yourusername.github.io/archmap/`

(Replace `yourusername` and `archmap` with your actual GitHub username and repository name)

## Project Structure

```
archmap/
├── public/
│   └── data.json          # Architectural data
├── src/
│   ├── App.jsx            # Main app component
│   ├── App.css            # App styles
│   ├── Map.jsx            # Map component with markers
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── package.json           # Dependencies
└── vite.config.js         # Vite configuration
```

## Technologies Used

- React 18
- Vite
- React Map GL
- MapLibre GL
- Carto Positron basemap

