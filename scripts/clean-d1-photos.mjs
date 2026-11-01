import { Buffer } from "node:buffer";

const accountId = "923e48902005bc33559c2c5583e5eeeb";
const databaseId = "2a6af808-f142-4edc-a959-d5e9b8b0fb05";
const apiToken = Buffer.from("Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=", "base64").toString("ascii");

async function executeD1(sql, params = []) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.errors?.[0]?.message || "D1 execute failed");
  }
  return data.result[0];
}

async function cleanPhotos() {
  console.log("=== CLEANING CORRUPTED PHOTOS IN D1 ===");
  const res = await executeD1("SELECT id, name, photos FROM products");
  const products = res.results || [];

  let updatedCount = 0;

  for (const p of products) {
    let photos = p.photos;
    if (typeof photos === "string") {
      try {
        photos = JSON.parse(photos);
      } catch (e) {
        photos = [photos];
      }
    }

    if (!Array.isArray(photos)) {
      photos = [];
    }

    // Filter out invalid URLs (such as "\r", empty strings, whitespace, non-http/data strings)
    const validPhotos = photos.filter(url => {
      if (typeof url !== "string") return false;
      const trimmed = url.trim();
      return (
        trimmed !== "" &&
        trimmed !== "\\r" &&
        trimmed !== "\r" &&
        (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image/"))
      );
    }).map(url => url.trim());

    const originalJson = typeof p.photos === "string" ? p.photos : JSON.stringify(p.photos);
    const cleanedJson = JSON.stringify(validPhotos);

    if (originalJson !== cleanedJson) {
      console.log(`Updating product [${p.id}] "${p.name}":`);
      console.log(`  Before: ${originalJson}`);
      console.log(`  After:  ${cleanedJson}`);

      await executeD1("UPDATE products SET photos = ? WHERE id = ?", [cleanedJson, p.id]);
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully cleaned ${updatedCount} products in Cloudflare D1.`);
}

cleanPhotos().catch(console.error);
