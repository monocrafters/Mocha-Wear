/**
 * Push local Supabase env vars to the linked Railway service.
 *
 * Prerequisites:
 *   1. npm i -g @railway/cli   (or npx @railway/cli)
 *   2. railway login
 *   3. railway link   (select mocha-wear-production-4dd5 service)
 *   4. node scripts/set-railway-supabase-from-env.js
 *
 * Never commit .env. This only reads local backend/.env.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];

const OPTIONAL = [
  "SUPABASE_JWKS_URL",
  "CLIENT_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REDIRECT_URI",
  "GOOGLE_DRIVE_TOKEN_KEY",
  "PUBLIC_API_URL",
];

function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function runRailway(args) {
  const result = spawnSync("npx", ["--yes", "@railway/cli@latest", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `railway ${args[0]} failed`);
  }
  return result.stdout;
}

if (!fs.existsSync(ENV_FILE)) {
  console.error("Missing backend/.env — cannot sync secrets.");
  process.exit(1);
}

const env = parseEnv(ENV_FILE);
const missing = REQUIRED.filter((key) => !env[key]);
if (missing.length) {
  console.error("Local .env missing:", missing.join(", "));
  process.exit(1);
}

const keys = [...REQUIRED, ...OPTIONAL.filter((key) => env[key])];

// Keep shop + vercel origins for CORS on the new host.
if (env.CLIENT_URL && !/mochawear\.shop/i.test(env.CLIENT_URL)) {
  env.CLIENT_URL = `${env.CLIENT_URL.replace(/\/+$/, "")},https://mochawear.shop`;
}
if (!env.PUBLIC_API_URL) {
  env.PUBLIC_API_URL = "https://mocha-wear-production-4dd5.up.railway.app";
  if (!keys.includes("PUBLIC_API_URL")) keys.push("PUBLIC_API_URL");
}
if (!env.GOOGLE_DRIVE_REDIRECT_URI || /localhost/i.test(env.GOOGLE_DRIVE_REDIRECT_URI)) {
  env.GOOGLE_DRIVE_REDIRECT_URI =
    "https://mocha-wear-production-4dd5.up.railway.app/api/admin/media/drive/callback";
  if (!keys.includes("GOOGLE_DRIVE_REDIRECT_URI")) keys.push("GOOGLE_DRIVE_REDIRECT_URI");
}

console.log("Setting Railway variables from local .env (values hidden)…");
for (const key of keys) {
  console.log(`  → ${key}`);
  runRailway(["variables", "--set", `${key}=${env[key]}`]);
}

console.log("Done. Redeploy the Railway service, then check /api/health.");
