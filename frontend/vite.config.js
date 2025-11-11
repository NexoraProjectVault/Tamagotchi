import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
    allowedHosts: ['tamagotchi-n0y6.onrender.com'],
  },
})