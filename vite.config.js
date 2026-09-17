import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'app/src/main/assets/dist',
    emptyOutDir: true,
    target: 'es2015'
  },
  resolve: {
    alias: [
      { find: /^react-icons\/(.*)$/, replacement: 'react-icons/$1/index.esm.js' },
      { find: '@', replacement: path.resolve(__dirname, './src') }
    ]
  }
});
