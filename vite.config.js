import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path for GitHub Pages
// Update this to match your repository name
// If your repo is "archmap", keep it as "/archmap/"
// If your repo is "username.github.io", change it to "/"
const REPO_NAME = 'archmap' // Change this to your repository name

export default defineConfig({
  plugins: [react()],
  base: REPO_NAME === 'username.github.io' ? '/' : `/${REPO_NAME}/`,
})

