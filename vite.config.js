import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  root: '.',
  publicDir: 'public',
  base: '/Melodist/',
  build: {
    outDir: 'dist',
  },
});
