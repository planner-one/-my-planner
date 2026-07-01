import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase'
          if (id.includes('/react-grid-layout/') || id.includes('/react-resizable/')) return 'vendor-grid'
          if (id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) return 'vendor-charts'
          if (id.includes('/tesseract.js/') || id.includes('/tesseract.js-core/') || id.includes('/regenerator-runtime/')) return 'vendor-ocr'
          return 'vendor'
        },
      },
    },
  },
})
