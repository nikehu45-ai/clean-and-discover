import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/clean-and-discover/' : '/',
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
});
