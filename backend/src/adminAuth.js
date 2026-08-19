require("dotenv").config();
const crypto = require("crypto");

const USERNAME = process.env.ADMIN_USERNAME || "";
const PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.ADMIN_SECRET || "mocha-admin-dev-secret";
const TOKEN_MS = 1000 * 60 * 60 * 12;
const COOKIE = "mocha_admin";

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function signToken() {
  const exp = Date.now() + TOKEN_MS;
  const data = `admin.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  const data = `${role}.${exp}`;
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  if (!safeEqual(sig, expected) || role !== "admin") return false;
  return Number(exp) > Date.now();
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    if (!part.trim()) continue;
    const [key, ...rest] = part.trim().split("=");
    cookies[key] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

function getToken(req) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return parseCookies(req)[COOKIE] || "";
}

function cookieOptions() {
  const crossSite = process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT);
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite,
    maxAge: TOKEN_MS,
    path: "/",
  };
}

function login(req, res) {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!USERNAME || !PASSWORD) {
    return res.status(500).json({ message: "Admin credentials are not configured" });
  }

  if (!safeEqual(username, USERNAME) || !safeEqual(password, PASSWORD)) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = signToken();
  res.cookie(COOKIE, token, cookieOptions());
  return res.json({ ok: true, role: "admin", token });
}

function me(req, res) {
  if (!verifyToken(getToken(req))) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, role: "admin", username: USERNAME });
}

function logout(req, res) {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
}

function requireAdmin(req, res, next) {
  if (!verifyToken(getToken(req))) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.admin = { username: USERNAME };
  next();
}

module.exports = { login, me, logout, requireAdmin };
