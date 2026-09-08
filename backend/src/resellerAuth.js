require("dotenv").config();
const crypto = require("crypto");
const resellers = require("./resellers");

const SECRET = process.env.RESELLER_SECRET || process.env.ADMIN_SECRET || "mocha-reseller-dev-secret";
/**
 * Stay signed in until explicit logout.
 * ~400 days matches common browser cookie caps; each authenticated request refreshes it.
 */
const TOKEN_MS = 1000 * 60 * 60 * 24 * 400;
const COOKIE = "mocha_reseller";

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

function signToken(resellerId) {
  const exp = Date.now() + TOKEN_MS;
  const data = `reseller.${resellerId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

function verifyResellerToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [role, resellerId, exp, sig] = parts;
  if (role !== "reseller") return null;
  const data = `reseller.${resellerId}.${exp}`;
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  const left = Buffer.from(String(sig));
  const right = Buffer.from(String(expected));
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  if (Number(exp) <= Date.now()) return null;
  return { resellerId };
}

function readCandidateTokens(req) {
  const auth = String(req.headers.authorization || "");
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const cookie = parseCookies(req)[COOKIE] || "";
  // Prefer a still-valid token. Expired localStorage bearer must not block a valid cookie.
  const candidates = [bearer, cookie].filter(Boolean);
  for (const token of candidates) {
    if (verifyResellerToken(token)) return token;
  }
  return bearer || cookie || "";
}

function getToken(req) {
  return readCandidateTokens(req);
}

function issueSession(res, resellerId) {
  const token = signToken(resellerId);
  res.cookie(COOKIE, token, cookieOptions());
  return token;
}

async function login(req, res) {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const reseller = await resellers.getByUsername(username);
    if (!reseller) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const valid = await resellers.verifyPassword(password, reseller.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    if (reseller.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }
    const token = issueSession(res, reseller.id);
    return res.json({ ok: true, role: "reseller", token, reseller: resellers.publicSafe(reseller) });
  } catch (error) {
    console.error("Reseller login error:", error.message);
    return res.status(500).json({ message: "Login failed" });
  }
}

async function me(req, res) {
  const parsed = verifyResellerToken(getToken(req));
  if (!parsed) return res.status(401).json({ authenticated: false });
  const reseller = await resellers.getById(parsed.resellerId);
  if (!reseller || reseller.status === "suspended") {
    return res.status(401).json({ authenticated: false });
  }
  const token = issueSession(res, reseller.id);
  return res.json({
    authenticated: true,
    role: "reseller",
    token,
    reseller: resellers.publicSafe(reseller),
  });
}

function logout(req, res) {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
}

async function requireReseller(req, res, next) {
  const parsed = verifyResellerToken(getToken(req));
  if (!parsed) return res.status(401).json({ message: "Unauthorized" });
  const reseller = await resellers.getById(parsed.resellerId);
  if (!reseller || reseller.status === "suspended") {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Sliding session: keep cookie fresh until they explicitly log out.
  issueSession(res, reseller.id);
  req.reseller = resellers.publicSafe(reseller);
  next();
}

module.exports = {
  login,
  me,
  logout,
  requireReseller,
  getToken,
  parseCookies,
  verifyResellerToken,
};
