import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * The Meet content script must be a single classic script. Chrome content
 * scripts cannot import shared extension chunks, so this build is separate
 * from the popup and onboarding bundle and inlines every dependency.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/content/meet.ts'),
      name: 'AskKeepMeet',
      formats: ['iife'],
      fileName: () => 'content-meet.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
  },
});
