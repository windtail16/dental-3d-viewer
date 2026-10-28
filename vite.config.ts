import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages(https://windtail16.github.io/dental-3d-viewer/) 배포 경로
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/dental-3d-viewer/',
});
