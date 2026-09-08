require("dotenv").config();
const cloudinary = require("cloudinary").v2;

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function config() {
  if (!isConfigured()) {
    const err = new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env",
    );
    err.status = 500;
    throw err;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadBuffer(buffer, { folder, resourceType = "auto" }) {
  config();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || "mocha-wear",
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          const err = new Error(error.message || "Cloudinary upload failed");
          err.status = 500;
          reject(err);
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: result.bytes || 0,
          format: result.format || "",
        });
      },
    );
    stream.end(buffer);
  });
}

async function uploadMedia(file, folder) {
  if (!file?.buffer) {
    const err = new Error("No file uploaded");
    err.status = 400;
    throw err;
  }
  const mime = String(file.mimetype || "");
  const isVideo = mime.startsWith("video/");
  const isRaw = !mime.startsWith("image/") && !isVideo;
  return uploadBuffer(file.buffer, {
    folder,
    resourceType: isVideo ? "video" : isRaw ? "raw" : "image",
  });
}

async function destroyMedia(publicId, resourceType = "image") {
  if (!publicId) return { result: "ok" };
  config();
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("Cloudinary destroy failed:", error.message);
    return { result: "error", message: error.message };
  }
}

async function duplicateMedia(url, folder, resourceType = "image") {
  if (!url) {
    const err = new Error("Missing media URL");
    err.status = 400;
    throw err;
  }
  config();
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: folder || "mocha-wear/media",
      resource_type: resourceType || "image",
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      bytes: result.bytes || 0,
      format: result.format || "",
    };
  } catch (error) {
    const err = new Error(error.message || "Could not duplicate media");
    err.status = 500;
    throw err;
  }
}

module.exports = { isConfigured, uploadMedia, destroyMedia, duplicateMedia };
