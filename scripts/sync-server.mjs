// Presentation sync server — serves the built app AND relays WebSocket messages,
// all on a single port. This means one ngrok tunnel covers everything.
//
// ── Same-WiFi setup (no firewall) ───────────────────────────────────────────
//   npm run present          ← builds + starts this server
//   npm run sync             ← just starts the server (if already built)
//
// ── Through a firewall / different networks (needs internet) ─────────────────
//   npm run present          ← build + start server on port 8080
//   npx ngrok http 8080      ← in a second terminal; copy the https://xxxx.ngrok-free.app URL
//
// URLs (replace ORIGIN with either http://192.168.x.x:8080 or the ngrok URL):
//   iPad (presenter):   ORIGIN/?sync=ORIGIN&role=presenter
//   Projector viewer:   ORIGIN/?sync=ORIGIN&view=1
//
// The server is a stateless broadcast relay — every message received from one
// client is forwarded to all other connected clients.

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const DIST = resolve(__dirname, '../dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// ── HTTP: serve the built app from dist/ ────────────────────────────────────
const httpServer = createServer((req, res) => {
  if (!existsSync(DIST)) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('dist/ folder not found — run `npm run build` first.');
    return;
  }
  const urlPath = req.url.split('?')[0];
  let filePath = join(DIST, urlPath);
  // SPA fallback: missing paths and directories all serve index.html
  try {
    if (statSync(filePath).isDirectory()) filePath = join(DIST, 'index.html');
  } catch {
    filePath = join(DIST, 'index.html');
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

// ── WebSocket: broadcast relay ───────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();

wss.on('connection', ws => {
  clients.add(ws);
  console.log(`+ client connected  (${clients.size} total)`);
  ws.on('message', data => {
    const str = data.toString();
    for (const c of clients) {
      if (c !== ws && c.readyState === 1) c.send(str);
    }
  });
  ws.on('close',  () => { clients.delete(ws); console.log(`- client disconnected  (${clients.size} remaining)`); });
  ws.on('error',  () => clients.delete(ws));
});

// ── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  function localIp() {
    for (const ifaces of Object.values(networkInterfaces())) {
      for (const i of ifaces) {
        if (i.family === 'IPv4' && !i.internal) return i.address;
      }
    }
    return 'localhost';
  }

  const ip = localIp();
  const local = `http://${ip}:${PORT}`;

  console.log(`\nPresentation server running on port ${PORT}`);
  console.log(`\n── Same WiFi (no firewall) ─────────────────────────────────`);
  console.log(`  iPad (presenter):   ${local}/?sync=ws://${ip}:${PORT}`);
  console.log(`  Projector viewer:   ${local}/?sync=ws://${ip}:${PORT}&view=1`);
  console.log(`\n── Through firewall / different networks ───────────────────`);
  console.log(`  1. Open a new terminal and run:  npx ngrok http ${PORT}`);
  console.log(`  2. Copy the  https://xxxx.ngrok-free.app  URL ngrok gives you.`);
  console.log(`  3. Use these URLs (replace NGROK with your ngrok URL):`);
  console.log(`     iPad (presenter):   NGROK/?sync=NGROK`);
  console.log(`     Projector viewer:   NGROK/?sync=NGROK&view=1`);
  console.log(`     (Viewer can also use:  http://localhost:${PORT}/?sync=ws://localhost:${PORT}&view=1)`);
  console.log(`\nPress Ctrl-C to stop.\n`);
});
