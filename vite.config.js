import { defineConfig } from 'vite';

// base './': the same build works on GitHub Pages (/star-skipper/) and on Studio's beta site.
export default defineConfig({ base: './', build: { outDir: 'dist' } });
