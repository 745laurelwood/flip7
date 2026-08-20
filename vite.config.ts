import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The other games all sit on 3000; this one moves over so they can run
  // side by side.
  server: { port: 3007, host: '0.0.0.0' },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
