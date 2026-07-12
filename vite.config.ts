/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { songApiPlugin } from './scripts/songApiPlugin.mjs';

export default defineConfig({
  plugins: [basicSsl(), react(), songApiPlugin()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: { environment: 'node' },
});
