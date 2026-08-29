const CNAME_TARGET = process.env.STORE_CNAME_TARGET || "cname.vercel-dns.com";
const APEX_A = process.env.STORE_APEX_A || "76.76.21.21";

function isConfigured() {
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function teamQuery() {
  const teamId = String(process.env.VERCEL_TEAM_ID || "").trim();
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

async function vercelFetch(path, options = {}) {
  if (!isConfigured()) {
    const err = new Error("Custom domains are not configured on the server yet");
    err.status = 503;
    throw err;
  }
  const url = `https://api.vercel.com${path}${teamQuery()}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error?.message || body.message || `Vercel API error (${res.status})`);
    err.status = res.status >= 400 && res.status < 500 ? res.status : 502;
    throw err;
  }
  return body;
}

function isApexDomain(domain) {
  const parts = String(domain || "").split(".").filter(Boolean);
  return parts.length === 2;
}

function dnsHostLabel(domain) {
  const parts = String(domain || "").split(".").filter(Boolean);
  if (parts.length <= 2) return "@";
  return parts.slice(0, -2).join(".");
}

function buildDnsRecords(domain) {
  const apex = isApexDomain(domain);
  if (apex) {
    return [{ type: "A", name: "@", value: APEX_A }];
  }
  return [{ type: "CNAME", name: dnsHostLabel(domain), value: CNAME_TARGET }];
}

function mapVerificationStatus(body = {}) {
  if (body.verified === true) return "live";
  if (body.verification?.length) return "pending_dns";
  if (body.misconfigured === true) return "error";
  return "pending_dns";
}

async function addDomain(domain) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const body = await vercelFetch(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  const records = buildDnsRecords(domain);
  if (Array.isArray(body.verification) && body.verification.length) {
    body.verification.forEach((row) => {
      if (row.type && row.domain && row.value) {
        records.push({
          type: String(row.type).toUpperCase(),
          name: row.domain.replace(`.${domain}`, "").replace(domain, "@") || "@",
          value: row.value,
        });
      }
    });
  }
  return {
    domain,
    status: body.verified ? "live" : "pending_dns",
    dns: records,
    verified: Boolean(body.verified),
    raw: body,
  };
}

async function getDomain(domain) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const body = await vercelFetch(`/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`);
  const status = mapVerificationStatus(body);
  return {
    domain,
    status: body.verified ? "live" : status,
    verified: Boolean(body.verified),
    misconfigured: Boolean(body.misconfigured),
    dns: buildDnsRecords(domain),
    raw: body,
  };
}

async function removeDomain(domain) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!isConfigured()) return { ok: true, skipped: true };
  await vercelFetch(`/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`, {
    method: "DELETE",
  });
  return { ok: true };
}

module.exports = {
  isConfigured,
  CNAME_TARGET,
  APEX_A,
  buildDnsRecords,
  isApexDomain,
  dnsHostLabel,
  addDomain,
  getDomain,
  removeDomain,
};
