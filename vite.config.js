import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute base: each city has its own page at /<city>/ (see scripts/buildPages.js), and assets
// and data load from the site root. time2map.github.io/archmap/ redirects to archmap.time2map.com.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
