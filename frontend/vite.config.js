import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.API_GATEWAY_URL': JSON.stringify(
      process.env.API_GATEWAY_URL
    )
  },
  server: {
    middlewareMode: false,
    allowedHosts: [
      tamagotchi-n0y6.onrender.com,
      process.env.USER_SERVICE_URL,
      process.env.PET_SERVICE_URL,
      process.env.API_GATEWAY_URL,
      process.env.DATA_TRACKING_SERVICE_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean)
  }

})