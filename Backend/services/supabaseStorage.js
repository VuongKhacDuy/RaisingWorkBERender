// Supabase Storage via its REST API (no SDK). Needs env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret key, server only), SUPABASE_BUCKET (public bucket)

// Folders admins may upload into (match the existing bucket layout)
const ALLOWED_FOLDERS = ["Pets", "Items-img", "News-img", "Short-Stories", "Grammar", "Exam", "collection"];

const config = () => {
    const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const bucket = process.env.SUPABASE_BUCKET || "";
    if (!url || !key || !bucket) {
        throw new Error("Supabase storage chưa cấu hình (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_BUCKET).");
    }
    return { url, key, bucket };
};

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

/** Permanent public link of a file in the (public) bucket. */
const publicUrl = (path) => {
    const { url, bucket } = config();
    return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(path)}`;
};

/** Uploads (or overwrites) a file and returns its public URL. */
const uploadBuffer = async (buffer, path, contentType) => {
    const { url, key, bucket } = config();
    const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(path)}`, {
        method: "POST",
        headers: {
            // New sb_secret keys are accepted when apikey and Authorization carry the same key
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": contentType || "application/octet-stream",
            "x-upsert": "true",
            "Cache-Control": "max-age=31536000",
        },
        body: buffer,
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Upload Supabase thất bại (${response.status}): ${text.slice(0, 200)}`);
    }
    return publicUrl(path);
};

/** Image type from the file's first bytes (base64 data has no content type). */
const sniffImage = (buffer) => {
    if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return { ext: "png", type: "image/png" };
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
    if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "GIF8") return { ext: "gif", type: "image/gif" };
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
    return null;
};

/** "Chiprosh Fire!" → "chiprosh-fire" (safe path segment). */
const slugify = (value) => String(value || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60);

module.exports = { ALLOWED_FOLDERS, uploadBuffer, publicUrl, sniffImage, slugify };
