/** HTTP Cache-Control helpers for public storefront GETs. */

const PUBLIC_CATALOG =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
const PUBLIC_CONTENT =
  "public, max-age=120, s-maxage=600, stale-while-revalidate=600";
const PUBLIC_SALE =
  "public, max-age=15, s-maxage=30, stale-while-revalidate=60";
const NO_STORE = "no-store, no-cache, must-revalidate, private";

function setCache(res, value) {
  res.setHeader("Cache-Control", value);
}

function publicCatalog(req, res, next) {
  if (req.method === "GET") setCache(res, PUBLIC_CATALOG);
  next();
}

function publicContent(req, res, next) {
  if (req.method === "GET") setCache(res, PUBLIC_CONTENT);
  next();
}

function publicSale(req, res, next) {
  if (req.method === "GET") setCache(res, PUBLIC_SALE);
  next();
}

function noStore(req, res, next) {
  setCache(res, NO_STORE);
  next();
}

module.exports = {
  PUBLIC_CATALOG,
  PUBLIC_CONTENT,
  PUBLIC_SALE,
  NO_STORE,
  setCache,
  publicCatalog,
  publicContent,
  publicSale,
  noStore,
};
