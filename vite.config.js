import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base: the same build works at https://archmap.time2map.com/ and at
// https://time2map.github.io/archmap/ (the app routes by URL hash, not by path)
export default defineConfig({
  plugins: [react()],
  base: './',
})
