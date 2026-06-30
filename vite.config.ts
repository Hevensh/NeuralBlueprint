import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), localExitPlugin()],
})

function localExitPlugin(): Plugin {
  return {
    name: 'neural-blueprint-local-exit',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__neural-blueprint-exit', (request, response, next) => {
        if (request.method !== 'POST') {
          next();
          return;
        }

        response.statusCode = 204;
        response.end();
        setTimeout(() => {
          server.httpServer?.close(() => process.exit(0));
        }, 50);
      });
    },
  };
}
