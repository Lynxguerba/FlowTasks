import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function localApi() {
  const dataPath = path.resolve('workspaces.json');
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/data')) {
          if (req.method === 'GET') {
            if (fs.existsSync(dataPath)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(dataPath));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({}));
            }
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const incomingData = JSON.parse(body);
                let currentData = {};
                if (fs.existsSync(dataPath)) {
                  currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                }
                
                const { username, key, data } = incomingData;
                if (!currentData[username]) {
                  currentData[username] = {};
                }
                currentData[username][key] = data;
                
                fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                console.error('Error saving data:', err);
                res.statusCode = 500;
                res.end('Error saving data');
              }
            });
            return;
          }
        }
        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApi()
  ],
  server: {
    host: true // Expose to local network
  }
})
