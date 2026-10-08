import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend bật CORS cho http://localhost:3000 -> frontend PHẢI chạy cổng 3000.
    port: 3000,
    // Mọi request "/api/..." khi dev sẽ được chuyển sang Flask ở cổng 8000.
    // Nhờ proxy này, frontend chỉ cần gọi "/api/topics" là đủ, khỏi lo CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
