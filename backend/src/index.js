require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const multer = require("multer");
const { ping } = require("./db");
const adminAuth = require("./adminAuth");
const collections = require("./collections");
const products = require("./products");
const cloudinary = require("./cloudinary");
const hero = require("./hero");
const sales = require("./sales");
const reviews = require("./reviews");
const help = require("./help");
const orders = require("./orders");
const customers = require("./customers");
const notifications = require("./notifications");
const settings = require("./settings");
const httpCache = require("./httpCache");
const catalogMeta = require("./catalogMeta");
const resellers = require("./resellers");
const resellerAuth = require("./resellerAuth");
const resellerPrices = require("./resellerPrices");
const resellerWallet = require("./resellerWallet");
const resellerPricing = require("./resellerPricing");
const resellerLinkRequests = require("./resellerLinkRequests");
const resellerDomains = require("./resellerDomains");

const app = express();
const PORT = process.env.PORT || 5000;
app.set("trust proxy", 1);

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    process.env.CORS_ORIGINS,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mochawear.vercel.app",
  ]
    .flatMap((value) => String(value || "").split(","))
    .map(normalizeOrigin)
    .filter(Boolean),
);

app.use(compression());
app.use(
      cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has(normalized)) {
        callback(null, true);
        return;
      }
      try {
        const host = new URL(normalized).hostname;
        if (host === "mochawear.vercel.app" || host.endsWith(".mochawear.vercel.app")) {
          callback(null, true);
          return;
        }
      } catch {
        /* ignore invalid origin */
      }
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Reseller-Code"],
    exposedHeaders: ["Set-Cookie"],
  }),
);
app.use(express.json());

app.use("/api/admin", httpCache.noStore);
app.use("/api/orders", httpCache.noStore);
app.use("/api/notifications", httpCache.noStore);
app.use("/api/health", httpCache.noStore);
app.use("/api/reseller", httpCache.noStore);
app.use("/api/r", httpCache.noStore);
app.use("/api/pricing", httpCache.noStore);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const type = String(file.mimetype || "");
    if (type.startsWith("image/") || type.startsWith("video/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image or video files are allowed"));
  },
});

const mediaFields = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "cover_desktop", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  { name: "banner_desktop", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

const productFields = upload.fields([
  { name: "images", maxCount: 12 },
  { name: "video", maxCount: 1 },
]);

async function attachProductImages(req, body) {
  const files = req.files?.images || [];
  const uploaded = [];
  for (const file of files) {
    const result = await cloudinary.uploadMedia(file, "mocha-wear/products");
    uploaded.push(result.url);
  }
  body.uploaded_images = uploaded;
  const video = req.files?.video?.[0];
  if (video) {
    const result = await cloudinary.uploadMedia(video, "mocha-wear/products/videos");
    body.video_url = result.url;
  }
  return body;
}

async function attachCloudinary(req, body) {
  const cover = req.files?.cover?.[0];
  const coverDesktop = req.files?.cover_desktop?.[0];
  const banner = req.files?.banner?.[0];
  const bannerDesktop = req.files?.banner_desktop?.[0];
  if (cover) {
    const uploaded = await cloudinary.uploadMedia(cover, "mocha-wear/collections/covers");
    body.cover_image = uploaded.url;
  }
  if (coverDesktop) {
    const uploaded = await cloudinary.uploadMedia(coverDesktop, "mocha-wear/collections/covers-desktop");
    body.cover_image_desktop = uploaded.url;
  }
  if (banner) {
    const uploaded = await cloudinary.uploadMedia(banner, "mocha-wear/collections/banners");
    body.banner_image = uploaded.url;
  }
  if (bannerDesktop) {
    const uploaded = await cloudinary.uploadMedia(bannerDesktop, "mocha-wear/collections/banners-desktop");
    body.banner_image_desktop = uploaded.url;
  }
  return body;
}

app.get("/api/health", async (req, res) => {
  try {
    const dbTime = await ping();
    res.json({
      status: "ok",
      message: "Sale API is running",
      database: "connected",
      catalog: "supabase",
      dbTime,
    });
  } catch (error) {
    console.error("Supabase health check failed:", error.message);
    res.status(503).json({
      status: "error",
      message: "Sale API is running, but Supabase is not connected",
      database: "disconnected",
    });
  }
});

app.post("/api/admin/login", adminAuth.login);
app.get("/api/admin/me", adminAuth.me);
app.post("/api/admin/logout", adminAuth.logout);

app.get("/api/catalog-meta", httpCache.publicMeta, async (_req, res) => {
  try {
    res.json({ v: await catalogMeta.getVersion() });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not read catalog meta" });
  }
});

app.get("/api/collections", httpCache.publicCatalog, async (_req, res) => {
  try {
    const items = await collections.listPublished();
    res.json({ items });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.get("/api/collections/:slug", httpCache.publicCatalog, async (req, res) => {
  try {
    const item = await collections.getBySlug(req.params.slug);
    if (!item) return res.status(404).json({ message: "Collection not found" });
    res.json({ item });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.get("/api/admin/collections", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const result = await collections.listAll();
    res.json({ items: result.items });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.post("/api/admin/collections", adminAuth.requireAdmin, mediaFields, async (req, res) => {
  try {
    const body = await attachCloudinary(req, { ...req.body });
    const item = await collections.createOne(body);
    const catalog_v = await catalogMeta.bump();
    res.status(201).json({ item, catalog_v });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.patch("/api/admin/collections/reorder", adminAuth.requireAdmin, async (req, res) => {
  try {
    const items = await collections.reorder(req.body?.ids);
    const catalog_v = await catalogMeta.bump();
    res.json({ items, catalog_v });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.patch("/api/admin/collections/:id", adminAuth.requireAdmin, mediaFields, async (req, res) => {
  try {
    const body = await attachCloudinary(req, { ...req.body });
    const item = await collections.updateOne(req.params.id, body);
    const catalog_v = await catalogMeta.bump();
    res.json({ item, catalog_v });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.delete("/api/admin/collections/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await collections.removeOne(req.params.id);
    const catalog_v = await catalogMeta.bump();
    res.json({ ok: true, catalog_v });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.get("/api/products", httpCache.publicCatalog, async (req, res) => {
  try {
    const hasReferral = Boolean(
      resellerAuth.parseCookies(req).mw_r || req.headers["x-reseller-code"],
    );
    if (hasReferral) {
      res.set("Cache-Control", "private, no-store");
    }
    res.set("Vary", "Cookie, X-Reseller-Code");
    const requested = String(req.query.collection || "").trim();
    let collectionId = requested;
    if (requested && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)) {
      const collection = await collections.getBySlug(requested);
      if (!collection) return res.json({ items: [] });
      collectionId = collection.id;
    }
    const items = await resellerPricing.applyResellerPricingToList(
      await products.listPublished({ collection: collectionId }),
      req,
    );
    res.json({ items });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/products/:slug", httpCache.publicCatalog, async (req, res) => {
  try {
    const hasReferral = Boolean(
      resellerAuth.parseCookies(req).mw_r || req.headers["x-reseller-code"],
    );
    if (hasReferral) {
      res.set("Cache-Control", "private, no-store");
    }
    res.set("Vary", "Cookie, X-Reseller-Code");
    const item = await products.getBySlug(req.params.slug);
    if (!item) return res.status(404).json({ message: "Product not found" });
    res.json({ item: await resellerPricing.applyResellerPricing(item, req) });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/admin/products", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ items: await products.listAll() });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.post("/api/admin/products", adminAuth.requireAdmin, productFields, async (req, res) => {
  try {
    const body = await attachProductImages(req, { ...req.body });
    const item = await products.createOne(body);
    await notifications.notifyNewProduct(item);
    const catalog_v = await catalogMeta.bump();
    res.status(201).json({ item, catalog_v });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.patch("/api/admin/products/:id", adminAuth.requireAdmin, productFields, async (req, res) => {
  try {
    const before = await products.getById(req.params.id);
    const body = await attachProductImages(req, { ...req.body });
    const item = await products.updateOne(req.params.id, body);
    if (item.is_published && !before?.is_published) await notifications.notifyNewProduct(item);
    const catalog_v = await catalogMeta.bump();
    res.json({ item, catalog_v });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.delete("/api/admin/products/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await products.removeOne(req.params.id);
    const catalog_v = await catalogMeta.bump();
    res.json({ ok: true, catalog_v });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/hero", httpCache.publicContent, async (_req, res) => {
  try {
    res.json({ hero: await hero.getPublic() });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.get("/api/admin/hero", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ hero: await hero.getAdmin() });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.post("/api/admin/hero/slides", adminAuth.requireAdmin, mediaFields, async (req, res) => {
  try {
    const body = { ...req.body };
    const imageFile = req.files?.cover?.[0];
    const videoFile = req.files?.video?.[0];
    if (imageFile) {
      const uploaded = await cloudinary.uploadMedia(imageFile, "mocha-wear/hero/slides");
      body.image = uploaded.url;
    }
    if (videoFile) {
      const uploaded = await cloudinary.uploadMedia(videoFile, "mocha-wear/hero/videos");
      body.video = uploaded.url;
    }
    const slide = await hero.addSlide(body);
    res.status(201).json({ slide });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.patch("/api/admin/hero/reorder", adminAuth.requireAdmin, async (req, res) => {
  try {
    const slides = await hero.reorderSlides(req.body?.ids);
    res.json({ slides });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.patch("/api/admin/hero/slides/:id", adminAuth.requireAdmin, mediaFields, async (req, res) => {
  try {
    const body = { ...req.body };
    const imageFile = req.files?.cover?.[0];
    const videoFile = req.files?.video?.[0];
    if (imageFile) {
      const uploaded = await cloudinary.uploadMedia(imageFile, "mocha-wear/hero/slides");
      body.image = uploaded.url;
    }
    if (videoFile) {
      const uploaded = await cloudinary.uploadMedia(videoFile, "mocha-wear/hero/videos");
      body.video = uploaded.url;
    }
    const slide = await hero.updateSlide(req.params.id, body);
    res.json({ slide });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.delete("/api/admin/hero/slides/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await hero.removeSlide(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.get("/api/sales", httpCache.publicSale, async (_req, res) => {
  try {
    res.json({ items: await sales.listPublished() });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.get("/api/sales/active", httpCache.publicSale, async (_req, res) => {
  try {
    res.json({ sale: await sales.getActive() });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.get("/api/admin/sales", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ items: await sales.listAll() });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.post("/api/admin/sales", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await sales.createOne(req.body);
    const nextIds = await products.resolveSaleProductIds(item.product_ids, item.collection_ids);
    await products.syncSaleProducts([], nextIds);
    const catalog_v = await catalogMeta.bump();
    res.status(201).json({ item, catalog_v });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.patch("/api/admin/sales/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const existing = await sales.getById(req.params.id);
    const prevIds = await products.resolveSaleProductIds(existing?.product_ids, existing?.collection_ids);
    const item = await sales.updateOne(req.params.id, req.body);
    const nextIds = await products.resolveSaleProductIds(item.product_ids, item.collection_ids);
    if (req.body.product_ids !== undefined || req.body.collection_ids !== undefined) {
      await products.syncSaleProducts(prevIds, nextIds);
    }
    const catalog_v = await catalogMeta.bump();
    res.json({ item, catalog_v });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.delete("/api/admin/sales/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await sales.removeOne(req.params.id);
    const catalog_v = await catalogMeta.bump();
    res.json({ ok: true, catalog_v });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.get("/api/reviews", httpCache.publicContent, async (_req, res) => {
  try {
    res.json({ items: await reviews.listPublished() });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.get("/api/admin/reviews", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ items: await reviews.listAll() });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.post("/api/admin/reviews", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await reviews.createOne(req.body);
    res.status(201).json({ item });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.patch("/api/admin/reviews/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await reviews.updateOne(req.params.id, req.body);
    res.json({ item });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.delete("/api/admin/reviews/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await reviews.removeOne(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.get("/api/help", httpCache.publicContent, async (_req, res) => {
  try {
    res.json({ help: await help.getPublic() });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.get("/api/admin/help", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ help: await help.getAdmin() });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.patch("/api/admin/help", adminAuth.requireAdmin, async (req, res) => {
  try {
    res.json({ help: await help.updateSettings(req.body) });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.post("/api/admin/help/topics", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await help.createTopic(req.body);
    res.status(201).json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.patch("/api/admin/help/topics/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await help.updateTopic(req.params.id, req.body);
    res.json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.delete("/api/admin/help/topics/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await help.removeTopic(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.post("/api/admin/help/notes", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await help.createNote(req.body);
    res.status(201).json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.patch("/api/admin/help/notes/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await help.updateNote(req.params.id, req.body);
    res.json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.delete("/api/admin/help/notes/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await help.removeNote(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const resolved = await resellerPricing.resolveOrderItems(req.body?.items || [], req);
    const item = await orders.createOne({
      ...req.body,
      items: resolved.items,
      reseller_id: resolved.attributed ? resolved.reseller_id : "",
      reseller_code: resolved.attributed ? resolved.reseller_code : "",
      commission_total: resolved.commission_total,
    });
    if (resolved.attributed && item.commission_total > 0 && item.reseller_id) {
      await resellerWallet.creditPending({
        reseller_id: item.reseller_id,
        order_id: item.id,
        amount: item.commission_total,
      });
    }
    await notifications.notifyNewOrder(item);
    res.status(201).json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.post("/api/orders/lookup", async (req, res) => {
  try {
    const items = await orders.lookup(req.body || {});
    res.json({ items });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.post("/api/orders/:id/cancel", async (req, res) => {
  try {
    const item = await orders.cancelOne(req.params.id, req.body || {}, "customer");
    await notifications.notifyCancel(item);
    res.json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.get("/api/admin/orders", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const items = await customers.attachIds(await orders.listAll());
    res.json({ items, stats: orders.stats(items) });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.patch("/api/admin/orders/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const before = await orders.getById(req.params.id);
    const item = await orders.updateOne(req.params.id, req.body);
    if (before && before.status !== item.status) await notifications.notifyOrderStatus(item);
    res.json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.post("/api/admin/orders/:id/cancel", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await orders.cancelOne(req.params.id, req.body || {}, "admin");
    await notifications.notifyCancel(item);
    res.json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.get("/api/admin/customers", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const orderItems = await orders.listAll();
    const items = await customers.syncFromOrders(orderItems);
    res.json({ items, stats: customers.stats(items) });
  } catch (error) {
    customers.sendError(res, error);
  }
});

app.get("/api/admin/customers/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const found = await customers.getById(req.params.id, await orders.listAll());
    if (!found) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(found);
  } catch (error) {
    customers.sendError(res, error);
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const items = await notifications.listUser(req.query.phone);
    res.json({ items, unread: notifications.unreadCount(items.filter((item) => item.phone)) });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const item = await notifications.markRead(req.params.id, "user");
    if (!item) return res.status(404).json({ message: "Notification not found" });
    res.json({ item });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.get("/api/admin/notifications", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const items = await notifications.listAdmin();
    res.json({ items, unread: notifications.unreadCount(items) });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.post("/api/admin/notifications/:id/read", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await notifications.markRead(req.params.id, "admin");
    if (!item) return res.status(404).json({ message: "Notification not found" });
    res.json({ item });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.post("/api/admin/notifications/read-all", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json(await notifications.markAllRead("admin"));
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.get("/api/settings", httpCache.publicContent, async (_req, res) => {
  try {
    res.json({ settings: await settings.getPublic() });
  } catch (error) {
    settings.sendError(res, error);
  }
});

app.get("/api/admin/settings", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ settings: await settings.getAdmin() });
  } catch (error) {
    settings.sendError(res, error);
  }
});

app.patch("/api/admin/settings", adminAuth.requireAdmin, async (req, res) => {
  try {
    res.json({ settings: await settings.updateSettings(req.body) });
  } catch (error) {
    settings.sendError(res, error);
  }
});

app.get("/api/pricing", async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    res.json({ items: await resellerPricing.pricingForIds(ids, req) });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/r/:code", async (req, res) => {
  try {
    const reseller = await resellerPricing.activateReferral(req.params.code, res, "/");
    const to = String(req.query.to || "/").trim() || "/";
    res.json({ ok: true, code: reseller.code, to: to.startsWith("/") ? to : "/", reseller });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.get("/api/r/:code/p/:slug/share", httpCache.publicCatalog, async (req, res) => {
  try {
    const item = await resellerPricing.sharePreview(req.params.code, req.params.slug);
    res.json({ item });
  } catch (error) {
    res.status(error.status || 404).json({ message: error.message || "Not found" });
  }
});

app.get("/api/r/:code/p/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const reseller = await resellerPricing.activateReferral(req.params.code, res, `/products/${slug}`);
    res.json({ ok: true, code: reseller.code, to: `/products/${slug}`, reseller });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.post("/api/reseller/login", resellerAuth.login);
app.get("/api/reseller/me", resellerAuth.me);
app.post("/api/reseller/logout", resellerAuth.logout);

app.get("/api/reseller/link", resellerAuth.requireReseller, async (req, res) => {
  try {
    const stats = await resellerPricing.clickStats(req.reseller.id);
    const pending = await resellerLinkRequests.getPendingForReseller(req.reseller.id);
    const recent = (await resellerLinkRequests.listByReseller(req.reseller.id)).slice(0, 5);
    res.json({
      code: req.reseller.code,
      path: `/r/${req.reseller.code}`,
      clicks: stats.clicks,
      custom_domain: req.reseller.custom_domain || "",
      custom_domain_status: req.reseller.custom_domain_status || "none",
      pending_request: pending,
      recent_requests: recent,
    });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.get("/api/reseller/link/check", resellerAuth.requireReseller, async (req, res) => {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) {
      return res.status(400).json({ message: "Provide code to check" });
    }
    res.json({ code: await resellerLinkRequests.isCodeAvailable(code, req.reseller.id) });
  } catch (error) {
    resellerLinkRequests.sendError(res, error);
  }
});

app.post("/api/reseller/link/request", resellerAuth.requireReseller, async (req, res) => {
  try {
    const item = await resellerLinkRequests.createRequest(req.reseller, req.body || {});
    res.status(201).json({ item });
  } catch (error) {
    resellerLinkRequests.sendError(res, error);
  }
});

app.get("/api/domain-lookup", async (req, res) => {
  try {
    const host = String(req.query.host || req.headers.host || "")
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/^www\./, "");
    if (!host) return res.json({ item: null });
    const reseller = await resellers.getByCustomDomain(host);
    if (!reseller) return res.json({ item: null });
    res.json({
      item: {
        code: reseller.code,
        name: reseller.name,
        custom_domain: reseller.custom_domain,
        status: "live",
      },
    });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.get("/api/reseller/domain", resellerAuth.requireReseller, async (req, res) => {
  try {
    res.json({ domain: resellerDomains.domainPayload(req.reseller) });
  } catch (error) {
    resellerDomains.sendError(res, error);
  }
});

app.post("/api/reseller/domain", resellerAuth.requireReseller, async (req, res) => {
  try {
    const domain = await resellerDomains.addDomain(req.reseller, req.body?.domain);
    res.status(201).json({ domain });
  } catch (error) {
    resellerDomains.sendError(res, error);
  }
});

app.post("/api/reseller/domain/check", resellerAuth.requireReseller, async (req, res) => {
  try {
    const fresh = await resellers.getById(req.reseller.id);
    res.json({ domain: await resellerDomains.checkDomain(fresh) });
  } catch (error) {
    resellerDomains.sendError(res, error);
  }
});

app.delete("/api/reseller/domain", resellerAuth.requireReseller, async (req, res) => {
  try {
    const fresh = await resellers.getById(req.reseller.id);
    res.json({ domain: await resellerDomains.removeDomain(fresh) });
  } catch (error) {
    resellerDomains.sendError(res, error);
  }
});

app.get("/api/reseller/products", resellerAuth.requireReseller, async (req, res) => {
  try {
    const limits = await resellerPricing.resolveMarkupLimits(req.reseller);
    const prices = await resellerPrices.listByReseller(req.reseller.id);
    const priceMap = new Map(prices.map((row) => [row.product_id, row]));
    const items = (await products.listAll())
      .filter((item) => item.reseller_enabled && item.is_published)
      .map((item) => {
        const wholesale = Math.max(0, Number(item.wholesale_price) || 0);
        const bounds = resellerPricing.priceBounds(wholesale, limits.minPercent, limits.maxPercent);
        const row = priceMap.get(item.id) || null;
        const savedPrice = row && Number(row.custom_price) > 0 ? Number(row.custom_price) : null;
        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
          image: item.images?.[0]?.url || "",
          images: item.images,
          retail_price: item.price,
          wholesale_price: wholesale,
          custom_price: savedPrice,
          is_active: savedPrice != null ? row.is_active !== false && row.is_active !== "false" : false,
          min_price: bounds.minPrice,
          max_price: bounds.maxPrice,
          pricing_ready: Boolean(bounds.ready),
          margin: savedPrice != null ? Math.max(0, savedPrice - wholesale) : 0,
          markup_min_percent: limits.minPercent,
          markup_max_percent: limits.maxPercent,
        };
      });
    res.json({ items, limits });
  } catch (error) {
    resellerPrices.sendError(res, error);
  }
});

app.get("/api/reseller/products/:productId", resellerAuth.requireReseller, async (req, res) => {
  try {
    const item = await products.getById(req.params.productId);
    if (!item || !item.reseller_enabled || !item.is_published) {
      return res.status(404).json({ message: "Product not available for resellers" });
    }
    const limits = await resellerPricing.resolveMarkupLimits(req.reseller);
    const wholesale = Math.max(0, Number(item.wholesale_price) || 0);
    const bounds = resellerPricing.priceBounds(wholesale, limits.minPercent, limits.maxPercent);
    const row = (await resellerPrices.listByReseller(req.reseller.id)).find(
      (p) => p.product_id === item.id,
    ) || null;
    const savedPrice = row && Number(row.custom_price) > 0 ? Number(row.custom_price) : null;
    res.json({
      item: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description || "",
        fabric: item.fabric || "",
        pieces: item.pieces || "",
        color: item.color || "",
        badge: item.badge || "",
        labels: item.labels || [],
        image: item.images?.[0]?.url || "",
        images: item.images || [],
        retail_price: item.price,
        compare_at_price: item.compare_at_price,
        wholesale_price: wholesale,
        custom_price: savedPrice,
        is_active: savedPrice != null ? row?.is_active !== false && row?.is_active !== "false" : false,
        min_price: bounds.minPrice,
        max_price: bounds.maxPrice,
        pricing_ready: Boolean(bounds.ready),
        margin: savedPrice != null ? Math.max(0, savedPrice - wholesale) : 0,
        markup_min_percent: limits.minPercent,
        markup_max_percent: limits.maxPercent,
      },
      limits,
    });
  } catch (error) {
    resellerPrices.sendError(res, error);
  }
});

app.put("/api/reseller/products/:productId/price", resellerAuth.requireReseller, async (req, res) => {
  try {
    const product = await products.getById(req.params.productId);
    if (!product || !product.reseller_enabled) {
      return res.status(404).json({ message: "Product not available for resellers" });
    }
    const limits = await resellerPricing.resolveMarkupLimits(req.reseller);
    const bounds = resellerPricing.priceBounds(product.wholesale_price, limits.minPercent, limits.maxPercent);
    if (!bounds.ready) {
      return res.status(400).json({
        message: "Wholesale price is not set for this product. Ask admin to set it first.",
      });
    }
    const item = await resellerPrices.upsertPrice(
      req.reseller.id,
      product.id,
      {
        custom_price: req.body?.custom_price,
        is_active: req.body?.is_active,
      },
      bounds,
    );
    res.json({ item });
  } catch (error) {
    resellerPrices.sendError(res, error);
  }
});

app.get("/api/reseller/orders", resellerAuth.requireReseller, async (req, res) => {
  try {
    const items = (await orders.listAll()).filter((order) => order.reseller_id === req.reseller.id);
    res.json({ items });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.get("/api/reseller/earnings", resellerAuth.requireReseller, async (req, res) => {
  try {
    await resellerWallet.sweepCleared();
    const fresh = await resellers.getById(req.reseller.id);
    const transactions = await resellerWallet.listByReseller(req.reseller.id);
    const payouts = await resellerWallet.listPayouts(req.reseller.id);
    const global = await resellerPricing.getGlobalResellerSettings();
    const stats = await resellerPricing.clickStats(req.reseller.id);
    res.json({
      wallet_pending: fresh?.wallet_pending || 0,
      wallet_cleared: fresh?.wallet_cleared || 0,
      min_payout: global.minPayout,
      transactions,
      payouts,
      clicks: stats.clicks,
    });
  } catch (error) {
    resellerWallet.sendError(res, error);
  }
});

app.post("/api/reseller/payouts", resellerAuth.requireReseller, async (req, res) => {
  try {
    const global = await resellerPricing.getGlobalResellerSettings();
    const item = await resellerWallet.requestPayout(
      req.reseller.id,
      { amount: req.body?.amount, method: req.body?.method },
      global.minPayout,
    );
    res.status(201).json({ item });
  } catch (error) {
    resellerWallet.sendError(res, error);
  }
});

app.get("/api/admin/reseller-domains", adminAuth.requireAdmin, async (_req, res) => {
  try {
    res.json({ items: await resellerDomains.listAdminDomains() });
  } catch (error) {
    resellerDomains.sendError(res, error);
  }
});

app.patch("/api/admin/reseller-domains/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const result = await resellerDomains.adminUpdateDomain(req.params.id, req.body || {});
    res.json(result);
  } catch (error) {
    resellerDomains.sendError(res, error);
  }
});

app.get("/api/admin/resellers", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const items = (await resellers.listAll()).map(resellers.publicSafe);
    res.json({ items });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.get("/api/admin/link-requests", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const list = await resellers.listAll();
    const map = new Map(list.map((row) => [row.id, row]));
    const items = (await resellerLinkRequests.listAll()).map((row) => ({
      ...row,
      reseller_name: map.get(row.reseller_id)?.name || "",
      reseller_username: map.get(row.reseller_id)?.username || "",
      reseller_code: map.get(row.reseller_id)?.code || row.current_code,
    }));
    res.json({ items });
  } catch (error) {
    resellerLinkRequests.sendError(res, error);
  }
});

app.patch("/api/admin/link-requests/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const result = await resellerLinkRequests.reviewRequest(req.params.id, req.body || {});
    res.json(result);
  } catch (error) {
    resellerLinkRequests.sendError(res, error);
  }
});

app.post("/api/admin/resellers", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await resellers.createOne(req.body || {});
    res.status(201).json({ item });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.patch("/api/admin/resellers/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await resellers.updateOne(req.params.id, req.body || {});
    res.json({ item });
  } catch (error) {
    resellers.sendError(res, error);
  }
});

app.get("/api/admin/payouts", adminAuth.requireAdmin, async (_req, res) => {
  try {
    const items = await resellerWallet.listPayouts();
    const list = await resellers.listAll();
    const map = new Map(list.map((row) => [row.id, row]));
    res.json({
      items: items.map((row) => ({
        ...row,
        reseller_name: map.get(row.reseller_id)?.name || "",
        reseller_code: map.get(row.reseller_id)?.code || "",
      })),
    });
  } catch (error) {
    resellerWallet.sendError(res, error);
  }
});

app.patch("/api/admin/payouts/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    const item = await resellerWallet.updatePayout(req.params.id, req.body || {});
    res.json({ item });
  } catch (error) {
    resellerWallet.sendError(res, error);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
