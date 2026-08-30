import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Water3J/',
  build: {
    rollupOptions: {
      input: {
        principal: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        studio: resolve(__dirname, 'studio.html'),
      },
    },
  },
});
