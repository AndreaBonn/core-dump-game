/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const THEME_BACKGROUND = '#0a0e14';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Core Dump',
        short_name: 'Core Dump',
        description: 'A hacker-themed marble shooter puzzle game.',
        theme_color: THEME_BACKGROUND,
        background_color: THEME_BACKGROUND,
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,mp3,svg,png,ico}'],
        // Firebase is an optional, online-only feature loaded on demand; keep
        // its chunk out of the offline precache so installs stay small.
        globIgnores: ['**/firebase-*.js'],
        maximumFileSizeToCacheInBytes: 3_000_000,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The Firebase vendor chunk is intentionally large and loaded on demand.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/engine/**/*.ts', 'src/config/**/*.ts', 'src/services/**/*.ts'],
      exclude: [
        'src/engine/systems/RenderSystem.ts',
        'src/engine/systems/VisualFx.ts',
        'src/engine/systems/FxRenderer.ts',
      ],
    },
  },
});
