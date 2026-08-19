require("dotenv").config();
const ws = require("ws");
const { createAdminClient } = require("@supabase/server/core");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = ws;
}

function getSupabase() {
  return createAdminClient({
    supabaseOptions: {
      realtime: { transport: ws },
    },
  });
}

async function ping() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw error;
  return new Date().toISOString();
}

module.exports = { getSupabase, ping };
