import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// (BƯỚC 21.2) Import "vũ khí" (plugin) "vá" (patch)
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  // (BƯỚC 21.2) Thêm "vũ khí" (plugin) vào
  plugins: [
    react(),
    nodePolyfills(), // Sửa lỗi 'stream', 'util', 'events'...
  ],
  
  // (Code cũ, giữ nguyên)
  server: {
    port: 5174
  },
  
  // (Code cũ, giữ nguyên)
  define: {
    global: 'window',
  },

  // (BƯỚC 21.2) XÓA BỎ 'resolve.alias' (CŨ, THẤT BẠI)
});