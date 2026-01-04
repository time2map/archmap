# Mapbox Studio Setup Guide

This guide will help you upload your architectural data to Mapbox Studio and use it as vector tiles for better performance.

## Benefits of Using Mapbox Vector Tiles

- ⚡ **Much faster loading**: Only visible tiles are loaded, not the entire dataset
- 📦 **Smaller data transfer**: Vector tiles are optimized and compressed
- 🌍 **Global CDN**: Mapbox serves tiles from locations worldwide
- 🎨 **Better performance**: Especially noticeable with large datasets (10k+ points)

## Step 1: Convert Data to GeoJSON

First, convert your `data.json` to GeoJSON format:

```bash
node scripts/convertToGeoJSON.js
```

This will create `public/data.geojson` with your data in GeoJSON format.

## Step 2: Create a Mapbox Account

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account (includes 50,000 free map loads per month)
3. Navigate to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
4. Copy your default public token (or create a new one)

## Step 3: Upload to Mapbox Studio

1. Go to [Mapbox Studio](https://studio.mapbox.com/)
2. Click on **Tilesets** in the left sidebar
3. Click **New tileset** → **Upload a file**
4. Upload your `public/data.geojson` file
5. Wait for processing to complete (this may take a few minutes for large files)
6. Once processed, note your tileset ID (format: `username.tileset-id`)

## Step 4: Configure Your App

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Mapbox credentials:
   ```
   VITE_MAPBOX_ACCESS_TOKEN=your-actual-token-here
   VITE_MAPBOX_TILESET_ID=your-username.your-tileset-id
   VITE_MAPBOX_SOURCE_LAYER=data
   VITE_USE_VECTOR_TILES=true
   ```
   
   **Finding your source layer name:**
   - In Mapbox Studio, click on your tileset
   - Look at the "Source layers" section - this shows the layer name
   - Common names: `data` (if you uploaded `data.geojson`), `points`, or the filename without extension
   - Set `VITE_MAPBOX_SOURCE_LAYER` to match this name

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Step 5: Verify It's Working

- The map should load much faster
- You should see points rendered as circles (not individual markers)
- Clicking on points should show popups with the same information
- Check the browser Network tab - you should see requests to `mapbox://` URLs instead of loading the entire `data.json`

## Troubleshooting

### "Invalid tileset ID" error
- Make sure your tileset ID format is correct: `username.tileset-id`
- Verify the tileset exists in your Mapbox Studio account

### "Invalid access token" error
- Check that your access token is correct in `.env`
- Make sure the token has the right scopes (should work with default public token)

### "Source layer does not exist" error
- This means the source layer name doesn't match your tileset
- In Mapbox Studio, open your tileset and check the "Source layers" section
- Update `VITE_MAPBOX_SOURCE_LAYER` in your `.env` to match the actual layer name
- Common names: `data`, `points`, or your filename without `.geojson`
- Restart your dev server after changing the `.env` file

### Points not showing
- Verify `VITE_USE_VECTOR_TILES=true` in your `.env` file
- Check browser console for errors
- Make sure the tileset finished processing in Mapbox Studio
- Verify the source layer name is correct (see above)

### Want to switch back to local GeoJSON?
Set `VITE_USE_VECTOR_TILES=false` in your `.env` file and restart the dev server.

## Mapbox Pricing

- **Free tier**: 50,000 map loads per month
- **Pay-as-you-go**: $5 per 1,000 additional map loads
- For most personal/small projects, the free tier is sufficient

## Notes

- The vector tile implementation uses MapLibre GL (open source) but can consume Mapbox-hosted tiles
- All your original data properties (title, author, city, etc.) are preserved in the tileset
- You can update the tileset in Mapbox Studio by re-uploading the GeoJSON file

