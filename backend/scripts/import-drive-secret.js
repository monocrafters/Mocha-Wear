// One-shot, loopback-only secret import. Never logs submitted values.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const nonce = crypto.randomBytes(32).toString('hex');
const route = '/' + nonce;
const target = path.join(__dirname, '..', '.env');
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
  if (req.url !== route || req.headers.host !== 'localhost:5099') { res.writeHead(404).end(); return; }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Save Drive server credential</h1><p>Saved only to the ignored local backend .env file.</p><form method="post"><label>Client secret <input type="password" name="secret" autocomplete="off" required></label><button>Save securely</button></form>'); return;
  }
  if (req.method !== 'POST' || req.headers.origin !== 'http://localhost:5099') { res.writeHead(403).end(); return; }
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 4096) { res.writeHead(413).end(); return; } }
  const secret = new URLSearchParams(body).get('secret') || '';
  if (!/^GOCSPX-[A-Za-z0-9_-]+$/.test(secret)) { res.writeHead(400).end('Invalid secret format.'); return; }
  const vars = {
    GOOGLE_DRIVE_CLIENT_ID: '353103817759-bug7hrr9r49u6boota5jiairimmrsj3n.apps.googleusercontent.com',
    GOOGLE_DRIVE_CLIENT_SECRET: secret,
    GOOGLE_DRIVE_REDIRECT_URI: 'http://localhost:5000/api/admin/media/drive/callback',
    GOOGLE_DRIVE_TOKEN_KEY: crypto.randomBytes(32).toString('hex'),
  };
  let env = fs.readFileSync(target, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    if (key === 'GOOGLE_DRIVE_TOKEN_KEY' && new RegExp('^' + key + '=[a-f0-9]{64}$', 'm').test(env)) continue;
    env = env.replace(new RegExp('^' + key + '=.*(?:\\r?\\n|$)', 'gm'), '');
    env += '\n' + key + '=' + value + '\n';
  }
  fs.writeFileSync(target, env, { mode: 0o600 });
  res.end('Credential saved securely. You can close this page.');
  server.close();
});
server.listen(5099, '127.0.0.1', () => console.log('http://localhost:5099' + route));
setTimeout(() => server.close(), 15 * 60 * 1000).unref();
