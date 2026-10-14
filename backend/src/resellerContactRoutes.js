const resellers = require("./resellers");
const resellerPricing = require("./resellerPricing");

function register(app, resellerAuth) {
  app.patch("/api/reseller/settings", resellerAuth.requireReseller, async (req, res) => {
    try {
      if (typeof req.body?.whatsapp_number !== "string") {
        return res.status(400).json({ message: "WhatsApp number is required; use an empty value to remove it" });
      }
      const reseller = await resellers.updateOne(req.reseller.id, {
        whatsapp_number: req.body.whatsapp_number,
      });
      res.json({ whatsapp_number: reseller.whatsapp_number });
    } catch (error) {
      resellers.sendError(res, error);
    }
  });

  app.get("/api/store-contact", async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.set("Vary", "Cookie, X-Reseller-Code");
    try {
      res.json(await resellerPricing.storefrontContact(req));
    } catch (error) {
      resellers.sendError(res, error);
    }
  });
}

module.exports = { register };
