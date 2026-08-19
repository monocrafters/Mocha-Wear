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
  const isVideo = String(file.mimetype || "").startsWith("video/");
  return uploadBuffer(file.buffer, {
    folder,
    resourceType: isVideo ? "video" : "image",
  });
}

module.exports = { isConfigured, uploadMedia };
