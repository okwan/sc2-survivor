import { defineConfig } from 'vite';

// `vite build --mode single` bundles everything into one script (used for the hosted preview page).
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    rollupOptions: mode === 'single' ? { output: { inlineDynamicImports: true } } : {},
  },
}));
