import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Fix: Use API_KEY from environment variables and assign to process.env.API_KEY, as per guidelines.
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
      },
      resolve: {
        alias: {
          // Fix: __dirname is not available in ES modules. Use import.meta.url to derive the directory path.
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      }
    };
});
