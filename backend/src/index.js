require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
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

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "https://mochawear.vercel.app";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

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

app.get("/api/collections", async (_req, res) => {
  try {
    const items = await collections.listPublished();
    res.json({ items });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.get("/api/collections/:slug", async (req, res) => {
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
    res.status(201).json({ item });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.patch("/api/admin/collections/reorder", adminAuth.requireAdmin, async (req, res) => {
  try {
    const items = await collections.reorder(req.body?.ids);
    res.json({ items });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.patch("/api/admin/collections/:id", adminAuth.requireAdmin, mediaFields, async (req, res) => {
  try {
    const body = await attachCloudinary(req, { ...req.body });
    const item = await collections.updateOne(req.params.id, body);
    res.json({ item });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.delete("/api/admin/collections/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    await collections.removeOne(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    collections.sendError(res, error);
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const requested = String(req.query.collection || "").trim();
    let collectionId = requested;
    if (requested && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)) {
      const collection = await collections.getBySlug(requested);
      if (!collection) return res.json({ items: [] });
      collectionId = collection.id;
    }
    const items = products.listPublished({ collection: collectionId });
    res.json({ items });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/products/:slug", (req, res) => {
  try {
    const item = products.getBySlug(req.params.slug);
    if (!item) return res.status(404).json({ message: "Product not found" });
    res.json({ item });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/admin/products", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json({ items: products.listAll() });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.post("/api/admin/products", adminAuth.requireAdmin, productFields, async (req, res) => {
  try {
    const body = await attachProductImages(req, { ...req.body });
    const item = products.createOne(body);
    notifications.notifyNewProduct(item);
    res.status(201).json({ item });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.patch("/api/admin/products/:id", adminAuth.requireAdmin, productFields, async (req, res) => {
  try {
    const before = products.getById(req.params.id);
    const body = await attachProductImages(req, { ...req.body });
    const item = products.updateOne(req.params.id, body);
    if (item.is_published && !before?.is_published) notifications.notifyNewProduct(item);
    res.json({ item });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.delete("/api/admin/products/:id", adminAuth.requireAdmin, async (req, res) => {
  try {
    products.removeOne(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    products.sendError(res, error);
  }
});

app.get("/api/hero", async (_req, res) => {
  try {
    res.json({ hero: await hero.getPublic() });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.get("/api/admin/hero", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json({ hero: hero.getAdmin() });
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
    const slide = hero.addSlide(body);
    res.status(201).json({ slide });
  } catch (error) {
    hero.sendError(res, error);
  }
});

app.patch("/api/admin/hero/reorder", adminAuth.requireAdmin, (req, res) => {
  try {
    const slides = hero.reorderSlides(req.body?.ids);
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
    const slide = hero.updateSlide(req.params.id, body);
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

app.get("/api/sales", (_req, res) => {
  try {
    res.json({ items: sales.listPublished() });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.get("/api/sales/active", (_req, res) => {
  try {
    res.json({ sale: sales.getActive() });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.get("/api/admin/sales", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json({ items: sales.listAll() });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.post("/api/admin/sales", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = sales.createOne(req.body);
    const nextIds = products.resolveSaleProductIds(item.product_ids, item.collection_ids);
    products.syncSaleProducts([], nextIds);
    res.status(201).json({ item });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.patch("/api/admin/sales/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    const existing = sales.getById(req.params.id);
    const prevIds = products.resolveSaleProductIds(existing?.product_ids, existing?.collection_ids);
    const item = sales.updateOne(req.params.id, req.body);
    const nextIds = products.resolveSaleProductIds(item.product_ids, item.collection_ids);
    if (req.body.product_ids !== undefined || req.body.collection_ids !== undefined) {
      products.syncSaleProducts(prevIds, nextIds);
    }
    res.json({ item });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.delete("/api/admin/sales/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    sales.removeOne(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    sales.sendError(res, error);
  }
});

app.get("/api/reviews", (_req, res) => {
  try {
    res.json({ items: reviews.listPublished() });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.get("/api/admin/reviews", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json({ items: reviews.listAll() });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.post("/api/admin/reviews", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = reviews.createOne(req.body);
    res.status(201).json({ item });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.patch("/api/admin/reviews/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = reviews.updateOne(req.params.id, req.body);
    res.json({ item });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.delete("/api/admin/reviews/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    reviews.removeOne(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    reviews.sendError(res, error);
  }
});

app.get("/api/help", (_req, res) => {
  try {
    res.json({ help: help.getPublic() });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.get("/api/admin/help", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json({ help: help.getAdmin() });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.patch("/api/admin/help", adminAuth.requireAdmin, (req, res) => {
  try {
    res.json({ help: help.updateSettings(req.body) });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.post("/api/admin/help/topics", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = help.createTopic(req.body);
    res.status(201).json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.patch("/api/admin/help/topics/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = help.updateTopic(req.params.id, req.body);
    res.json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.delete("/api/admin/help/topics/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    help.removeTopic(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.post("/api/admin/help/notes", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = help.createNote(req.body);
    res.status(201).json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.patch("/api/admin/help/notes/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = help.updateNote(req.params.id, req.body);
    res.json({ item });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.delete("/api/admin/help/notes/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    help.removeNote(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    help.sendError(res, error);
  }
});

app.post("/api/orders", (req, res) => {
  try {
    const item = orders.createOne(req.body);
    notifications.notifyNewOrder(item);
    res.status(201).json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.post("/api/orders/lookup", (req, res) => {
  try {
    const items = orders.lookup(req.body || {});
    res.json({ items });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.post("/api/orders/:id/cancel", (req, res) => {
  try {
    const item = orders.cancelOne(req.params.id, req.body || {}, "customer");
    notifications.notifyCancel(item);
    res.json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.get("/api/admin/orders", adminAuth.requireAdmin, (_req, res) => {
  try {
    const items = customers.attachIds(orders.listAll());
    res.json({ items, stats: orders.stats(items) });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.patch("/api/admin/orders/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    const before = orders.getById(req.params.id);
    const item = orders.updateOne(req.params.id, req.body);
    if (before && before.status !== item.status) notifications.notifyOrderStatus(item);
    res.json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.post("/api/admin/orders/:id/cancel", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = orders.cancelOne(req.params.id, req.body || {}, "admin");
    notifications.notifyCancel(item);
    res.json({ item });
  } catch (error) {
    orders.sendError(res, error);
  }
});

app.get("/api/admin/customers", adminAuth.requireAdmin, (_req, res) => {
  try {
    const orderItems = orders.listAll();
    const items = customers.syncFromOrders(orderItems);
    res.json({ items, stats: customers.stats(items) });
  } catch (error) {
    customers.sendError(res, error);
  }
});

app.get("/api/admin/customers/:id", adminAuth.requireAdmin, (req, res) => {
  try {
    const found = customers.getById(req.params.id, orders.listAll());
    if (!found) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    res.json(found);
  } catch (error) {
    customers.sendError(res, error);
  }
});

app.get("/api/notifications", (req, res) => {
  try {
    const items = notifications.listUser(req.query.phone);
    res.json({ items, unread: notifications.unreadCount(items.filter((item) => item.phone)) });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.post("/api/notifications/:id/read", (req, res) => {
  try {
    const item = notifications.markRead(req.params.id, "user");
    if (!item) return res.status(404).json({ message: "Notification not found" });
    res.json({ item });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.get("/api/admin/notifications", adminAuth.requireAdmin, (_req, res) => {
  try {
    const items = notifications.listAdmin();
    res.json({ items, unread: notifications.unreadCount(items) });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.post("/api/admin/notifications/:id/read", adminAuth.requireAdmin, (req, res) => {
  try {
    const item = notifications.markRead(req.params.id, "admin");
    if (!item) return res.status(404).json({ message: "Notification not found" });
    res.json({ item });
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.post("/api/admin/notifications/read-all", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json(notifications.markAllRead("admin"));
  } catch (error) {
    notifications.sendError(res, error);
  }
});

app.get("/api/settings", (_req, res) => {
  try {
    res.json({ settings: settings.getPublic() });
  } catch (error) {
    settings.sendError(res, error);
  }
});

app.get("/api/admin/settings", adminAuth.requireAdmin, (_req, res) => {
  try {
    res.json({ settings: settings.getAdmin() });
  } catch (error) {
    settings.sendError(res, error);
  }
});

app.patch("/api/admin/settings", adminAuth.requireAdmin, (req, res) => {
  try {
    res.json({ settings: settings.updateSettings(req.body) });
  } catch (error) {
    settings.sendError(res, error);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
