import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default function config() {
  return defineConfig({
    plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
    base: './',
    build: {
      modulePreload: { polyfill: false },
    },
    server: {
      port: 3000,
      open: true
    }
  });
}
