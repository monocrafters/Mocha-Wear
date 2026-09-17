import { formatPkr } from "@/lib/money";
import { ORDER_STATUSES, orderDate, orderPlace, orderTotal, type Order } from "@/lib/orders";

function statusLabel(status: string) {
  return ORDER_STATUSES.find((row) => row.id === status)?.label || status;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orderHtml(order: Order) {
  const customer = order.customer;
  const items = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name)}${item.size ? ` · ${escapeHtml(item.size)}` : ""}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">${escapeHtml(formatPkr(item.price))}</td>
        <td style="text-align:right">${escapeHtml(formatPkr(item.price * item.qty))}</td>
      </tr>`,
    )
    .join("");

  return `
    <section class="order-card">
      <header>
        <div>
          <h2>${escapeHtml(order.id)}</h2>
          <p>${escapeHtml(orderDate(order))} · ${escapeHtml(statusLabel(order.status))}</p>
        </div>
        <div class="meta">
          <p>${escapeHtml(order.payment || "Cash on delivery")}</p>
          ${order.source === "manual" ? `<p>Manual${order.channel ? ` · ${escapeHtml(order.channel)}` : ""}</p>` : ""}
        </div>
      </header>
      <div class="grid">
        <div>
          <h3>Customer</h3>
          <p><strong>${escapeHtml(customer?.name || "")}</strong></p>
          <p>${escapeHtml(customer?.phone || "")}</p>
          ${customer?.whatsapp ? `<p>WhatsApp: ${escapeHtml(customer.whatsapp)}</p>` : ""}
          <p>${escapeHtml(orderPlace(order))}</p>
        </div>
        <div>
          <h3>Totals</h3>
          <p>Subtotal: ${escapeHtml(formatPkr(order.subtotal ?? order.items.reduce((s, i) => s + i.price * i.qty, 0)))}</p>
          <p>Delivery: ${escapeHtml(formatPkr(order.delivery || 0))}</p>
          <p><strong>Total: ${escapeHtml(formatPkr(orderTotal(order)))}</strong></p>
          ${order.courier ? `<p>Courier: ${escapeHtml(order.courier)}</p>` : ""}
          ${order.dispatch_id ? `<p>Dispatch ID: ${escapeHtml(order.dispatch_id)}</p>` : ""}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Line</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      ${order.note ? `<p class="note"><strong>Note:</strong> ${escapeHtml(order.note)}</p>` : ""}
    </section>`;
}

export function printOrdersPdf(orders: Order[], title = "Mocha Wear Orders") {
  if (typeof window === "undefined") return;
  const list = Array.isArray(orders) ? orders.filter((order) => order?.id) : [];
  if (!list.length) return;

  const body = list.map(orderHtml).join("");
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 24px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 24px; }
    .order-card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 18px; page-break-inside: avoid; }
    header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 18px; }
    h3 { margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #eee; padding: 8px 4px; text-align: left; vertical-align: top; }
    .note { margin-top: 12px; font-size: 13px; }
    .meta { text-align: right; font-size: 12px; color: #444; }
    @media print {
      body { margin: 0; }
      .order-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${list.length} order${list.length === 1 ? "" : "s"} · ${escapeHtml(new Date().toLocaleString())}</p>
  ${body}
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  win.document.close();
}
