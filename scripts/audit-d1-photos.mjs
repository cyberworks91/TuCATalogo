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

async function audit() {
  console.log("=== AUDITING PRODUCTS IN D1 ===");
  const res = await executeD1("SELECT id, name, photos FROM products");
  const products = res.results || [];
  console.log(`Total products: ${products.length}`);

  let emptyCount = 0;
  let validIkCount = 0;
  let cldCount = 0;
  let corruptedCount = 0;
  const corruptedList = [];

  for (const p of products) {
    let photos = p.photos;
    if (typeof photos === "string") {
      try {
        photos = JSON.parse(photos);
      } catch (e) {
        photos = [photos];
      }
    }

    if (!photos || (Array.isArray(photos) && photos.length === 0)) {
      emptyCount++;
      continue;
    }

    if (Array.isArray(photos)) {
      const hasCorrupted = photos.some(url => {
        if (typeof url !== "string") return true;
        const trimmed = url.trim();
        return trimmed === "" || trimmed === "\\r" || trimmed === "\r" || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/"));
      });

      if (hasCorrupted) {
        corruptedCount++;
        corruptedList.push({ id: p.id, name: p.name, rawPhotos: p.photos, parsed: photos });
      }

      for (const url of photos) {
        if (typeof url === "string") {
          if (url.includes("ik.imagekit.io")) validIkCount++;
          if (url.includes("res.cloudinary.com")) cldCount++;
        }
      }
    }
  }

  console.log(`Empty/No photos: ${emptyCount}`);
  console.log(`Products with corrupted/invalid photo strings: ${corruptedCount}`);
  console.log(`ImageKit photos count: ${validIkCount}`);
  console.log(`Cloudinary photos count: ${cldCount}`);

  console.log("\nCorrupted sample (up to 20):");
  for (const item of corruptedList.slice(0, 20)) {
    console.log(`- [${item.id}] "${item.name}": ${JSON.stringify(item.parsed)}`);
  }

  // Also check product "Globos" specifically
  console.log("\nSearching for Globos:");
  const globos = products.filter(p => p.name?.toLowerCase().includes("globo"));
  for (const g of globos) {
    console.log(`- [${g.id}] "${g.name}": photos=${g.photos}`);
  }
}

audit().catch(console.error);
