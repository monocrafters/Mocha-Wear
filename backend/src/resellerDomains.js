const resellers = require("./resellers");
const vercelDomains = require("./vercelDomains");

const DOMAIN_STATUSES = new Set(["none", "pending_dns", "live", "error", "suspended"]);

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function validateDomainFormat(domain) {
  const value = normalizeDomain(domain);
  if (!value || value.length < 4 || value.length > 120) {
    const err = new Error("Enter a valid domain (e.g. shop.yourbrand.com)");
    err.status = 400;
    throw err;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value)) {
    const err = new Error("Enter a valid domain (e.g. shop.yourbrand.com)");
    err.status = 400;
    throw err;
  }
  if (value.includes("localhost") || value.endsWith(".vercel.app") || value.includes("mochawear.vercel.app")) {
    const err = new Error("Use your own domain from Hostinger or another registrar");
    err.status = 400;
    throw err;
  }
  return value;
}

async function assertDomainAvailable(domain, excludeResellerId = "") {
  const value = validateDomainFormat(domain);
  const owner = await resellers.getByCustomDomainAny(value);
  if (owner && owner.id !== excludeResellerId) {
    const err = new Error("This domain is already linked to another reseller");
    err.status = 409;
    throw err;
  }
  return value;
}

function domainPayload(reseller) {
  if (!reseller) return null;
  return {
    domain: reseller.custom_domain || "",
    status: reseller.custom_domain_status || "none",
    dns: Array.isArray(reseller.custom_domain_dns) ? reseller.custom_domain_dns : [],
    error: reseller.custom_domain_error || "",
    verified_at: reseller.custom_domain_verified_at || "",
    vercel_configured: vercelDomains.isConfigured(),
    cname_target: vercelDomains.CNAME_TARGET,
    apex_a: vercelDomains.APEX_A,
  };
}

async function applyDomainPatch(resellerId, patch) {
  return resellers.updateOne(resellerId, patch);
}

async function addDomain(reseller, rawDomain) {
  const domain = await assertDomainAvailable(rawDomain, reseller.id);

  if (
    reseller.custom_domain &&
    reseller.custom_domain !== domain &&
    ["pending_dns", "live"].includes(reseller.custom_domain_status)
  ) {
    try {
      await vercelDomains.removeDomain(reseller.custom_domain);
    } catch {
      /* best effort */
    }
  }

  let status = "pending_dns";
  let dns = vercelDomains.buildDnsRecords(domain);
  let error = "";
  let verifiedAt = "";

  if (vercelDomains.isConfigured()) {
    try {
      const result = await vercelDomains.addDomain(domain);
      status = result.verified ? "live" : "pending_dns";
      dns = result.dns?.length ? result.dns : dns;
      if (result.verified) verifiedAt = new Date().toISOString();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not register domain";
      const apiErr = new Error(message);
      apiErr.status = err.status || 502;
      throw apiErr;
    }
  } else {
    status = "pending_dns";
  }

  const updated = await applyDomainPatch(reseller.id, {
    custom_domain: domain,
    custom_domain_status: status,
    custom_domain_dns: dns,
    custom_domain_error: error,
    custom_domain_verified_at: verifiedAt,
  });

  return domainPayload(updated);
}

async function checkDomain(reseller) {
  if (!reseller?.custom_domain) {
    const err = new Error("No custom domain configured");
    err.status = 404;
    throw err;
  }
  if (reseller.custom_domain_status === "suspended") {
    return domainPayload(reseller);
  }

  let status = reseller.custom_domain_status || "pending_dns";
  let error = "";
  let verifiedAt = reseller.custom_domain_verified_at || "";
  let dns = Array.isArray(reseller.custom_domain_dns) ? reseller.custom_domain_dns : vercelDomains.buildDnsRecords(reseller.custom_domain);

  if (vercelDomains.isConfigured()) {
    try {
      const result = await vercelDomains.getDomain(reseller.custom_domain);
      dns = result.dns?.length ? result.dns : dns;
      if (result.verified) {
        status = "live";
        verifiedAt = verifiedAt || new Date().toISOString();
        error = "";
      } else if (result.misconfigured) {
        status = "error";
        error = "DNS is not pointing correctly yet. Double-check Hostinger records.";
      } else {
        status = "pending_dns";
        error = "";
      }
    } catch (err) {
      status = "error";
      error = err instanceof Error ? err.message : "Could not verify domain";
    }
  } else if (status !== "live") {
    status = "pending_dns";
  }

  const updated = await applyDomainPatch(reseller.id, {
    custom_domain_status: status,
    custom_domain_dns: dns,
    custom_domain_error: error,
    custom_domain_verified_at: verifiedAt,
  });

  return domainPayload(updated);
}

async function removeDomain(reseller) {
  if (!reseller?.custom_domain) {
    const err = new Error("No custom domain configured");
    err.status = 404;
    throw err;
  }
  try {
    await vercelDomains.removeDomain(reseller.custom_domain);
  } catch {
    /* best effort */
  }
  const updated = await applyDomainPatch(reseller.id, {
    custom_domain: "",
    custom_domain_status: "none",
    custom_domain_dns: [],
    custom_domain_error: "",
    custom_domain_verified_at: "",
  });
  return domainPayload(updated);
}

async function adminUpdateDomain(resellerId, { action, admin_note } = {}) {
  const reseller = await resellers.getById(resellerId);
  if (!reseller) {
    const err = new Error("Reseller not found");
    err.status = 404;
    throw err;
  }

  if (action === "suspend") {
    if (!reseller.custom_domain) {
      const err = new Error("Reseller has no custom domain");
      err.status = 400;
      throw err;
    }
    const updated = await applyDomainPatch(resellerId, {
      custom_domain_status: "suspended",
      custom_domain_error: admin_note || "Suspended by admin",
    });
    return { item: resellers.publicSafe(updated) };
  }

  if (action === "unsuspend") {
    if (!reseller.custom_domain) {
      const err = new Error("Reseller has no custom domain");
      err.status = 400;
      throw err;
    }
    const nextStatus = reseller.custom_domain_verified_at ? "live" : "pending_dns";
    const updated = await applyDomainPatch(resellerId, {
      custom_domain_status: nextStatus,
      custom_domain_error: "",
    });
    if (nextStatus === "pending_dns") await checkDomain(updated);
    return { item: resellers.publicSafe(await resellers.getById(resellerId)) };
  }

  if (action === "remove") {
    await removeDomain(reseller);
    return { item: resellers.publicSafe(await resellers.getById(resellerId)) };
  }

  const err = new Error("Invalid action");
  err.status = 400;
  throw err;
}

async function listAdminDomains() {
  const list = await resellers.listAll();
  return list
    .filter((row) => row.custom_domain)
    .map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      code: row.code,
      domain: row.custom_domain,
      status: row.custom_domain_status || "none",
      error: row.custom_domain_error || "",
      verified_at: row.custom_domain_verified_at || "",
      updated_at: row.updated_at,
    }));
}

async function sweepPendingDomains() {
  const list = await resellers.listAll();
  const pending = list.filter(
    (row) => row.custom_domain && row.custom_domain_status === "pending_dns",
  );
  for (const row of pending) {
    try {
      await checkDomain(row);
    } catch {
      /* soft fail per domain */
    }
  }
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error("Reseller domain error:", error.message);
  res.status(status).json({ message: error.message || "Could not process domain request" });
}

module.exports = {
  normalizeDomain,
  validateDomainFormat,
  domainPayload,
  addDomain,
  checkDomain,
  removeDomain,
  adminUpdateDomain,
  listAdminDomains,
  sweepPendingDomains,
  sendError,
};
