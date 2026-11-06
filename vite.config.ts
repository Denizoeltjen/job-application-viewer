import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@private': path.resolve(__dirname, 'private'),
    },
  },
  server: {
    // `npm run dev:server` serves the API; Vite forwards to it so the session
    // cookie stays same-origin in dev just like in the single production container.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
