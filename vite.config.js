import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path for GitHub Pages
// Repository name: archmap
// URL will be: https://sasfeat.github.io/archmap/
export default defineConfig({
  plugins: [react()],
  base: '/archmap/',
})

