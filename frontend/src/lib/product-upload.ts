import { API_URL, apiFetch } from "@/lib/api";

// Keep successful uploads when saving fails, so retrying does not duplicate files.
const uploads = new WeakMap<File, Promise<string>>();
export function uploadProductFile(file: File, resourceType: "image" | "video") {
  if (!file.type.startsWith(resourceType + "/")) return Promise.reject(new Error("Choose a valid " + resourceType + " file"));
  if (file.size > 60 * 1024 * 1024) return Promise.reject(new Error(file.name + " exceeds the 60 MB file limit"));
  const existing = uploads.get(file);
  if (existing) return existing;
  const upload = (async () => {
    const authorization = await apiFetch(API_URL + "/api/admin/product-upload-signature", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_type: resourceType }),
    });
    const signed = await authorization.json().catch(() => ({}));
    if (!authorization.ok) throw new Error(signed.message || "Could not authorize upload. Wait for the backend update and retry.");
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.api_key);
    body.append("signature", signed.signature);
    Object.entries(signed.params).forEach(([key, value]) => body.append(key, String(value)));
    // No app cookies, bearer tokens, resizing, or compression are sent to Cloudinary.
    const response = await fetch(signed.upload_url, { method: "POST", body, credentials: "omit" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed for " + file.name);
    return result.secure_url as string;
  })();
  uploads.set(file, upload);
  void upload.catch(() => uploads.delete(file));
  return upload;
}
