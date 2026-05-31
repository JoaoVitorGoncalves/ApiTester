import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devServer from '@hono/vite-dev-server';
import { fileURLToPath, URL } from 'node:url';

// Single-app setup: Vite serves the React client, while @hono/vite-dev-server
// runs the Hono app (src/server.ts) for `/api/*` requests only. The negative
// lookahead sends everything that is NOT under `/api` back to Vite so the SPA
// and its modules keep full HMR.
export default defineConfig({
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    react(),
    devServer({
      entry: 'src/server.ts',
      exclude: [/^(?!\/api).*/],
    }),
  ],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@client': fileURLToPath(new URL('./src/client', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
