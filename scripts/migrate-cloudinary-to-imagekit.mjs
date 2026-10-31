const accountId = "923e48902005bc33559c2c5583e5eeeb";
const databaseId = "2a6af808-f142-4edc-a959-d5e9b8b0fb05";
const apiToken = Buffer.from("Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=", "base64").toString("ascii");

const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY || "private_SVxwOEVfklgnjh3N8xt2yQNnIo0=";
const imageKitAuthHeader = "Basic " + Buffer.from(imageKitPrivateKey + ":").toString("base64");

async function executeD1(sql, params = [], retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`D1 query failed (attempt ${attempt}/${retries}): ${err.message}. Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function uploadToImageKit(fileUrl, fileName, folder = "/tucatalogo/products", retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const form = new FormData();
      form.append("file", fileUrl);
      form.append("fileName", fileName);
      form.append("folder", folder);
      form.append("useUniqueFileName", "false");

      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        headers: { "Authorization": imageKitAuthHeader },
        body: form
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || `Failed to upload ${fileName} to ImageKit (status ${res.status})`);
      }
      return data.url;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`ImageKit upload retry ${attempt}/${retries} for ${fileName}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

export async function migrateCloudinaryToImageKit() {
  console.log("=== STARTING CLOUDINARY TO IMAGEKIT MIGRATION ===");

  // 1. Fetch remaining products with Cloudinary URLs
  const d1Res = await executeD1("SELECT id, name, photos FROM products WHERE photos LIKE '%cloudinary%'");
  const products = d1Res.results;
  console.log(`Found ${products.length} products remaining with Cloudinary photos.`);

  const urlMap = new Map();
  let migratedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let photos = p.photos;
    if (typeof photos === "string") {
      try { photos = JSON.parse(photos); } catch(e){}
    }
    if (!Array.isArray(photos) || photos.length === 0) continue;

    let modified = false;
    const newPhotos = [];

    for (const url of photos) {
      if (typeof url === "string" && url.includes("res.cloudinary.com")) {
        modified = true;
        if (urlMap.has(url)) {
          newPhotos.push(urlMap.get(url));
        } else {
          try {
            const fileName = url.split("/").pop() || `cld_${Date.now()}.jpg`;
            const ikUrl = await uploadToImageKit(url, fileName, "/tucatalogo/products");
            urlMap.set(url, ikUrl);
            newPhotos.push(ikUrl);
            migratedCount++;
            console.log(`[${migratedCount}/${products.length}] Migrated -> ${ikUrl}`);
          } catch (err) {
            console.error(`Failed to migrate ${url}:`, err.message);
            failedCount++;
            newPhotos.push(url);
          }
        }
      } else {
        newPhotos.push(url);
      }
    }

    if (modified) {
      try {
        await executeD1("UPDATE products SET photos = ? WHERE id = ?", [JSON.stringify(newPhotos), p.id]);
      } catch (d1Err) {
        console.error(`Failed to update product ${p.id} in D1:`, d1Err.message);
      }
    }
  }

  console.log(`Products migration finished: ${migratedCount} images migrated to ImageKit, ${failedCount} errors.`);

  // 2. Migrate catalog logos
  console.log("Checking catalog logos...");
  try {
    const catsRes = await executeD1("SELECT id, name, settings FROM catalogs WHERE settings LIKE '%cloudinary%'");
    for (const cat of catsRes.results) {
      let settings = typeof cat.settings === "string" ? JSON.parse(cat.settings) : (cat.settings || {});
      if (settings.logo && settings.logo.includes("res.cloudinary.com")) {
        try {
          const logoName = settings.logo.split("/").pop() || `logo_${Date.now()}.png`;
          const ikLogo = await uploadToImageKit(settings.logo, logoName, "/tucatalogo/logos");
          settings.logo = ikLogo;
          await executeD1("UPDATE catalogs SET settings = ? WHERE id = ?", [JSON.stringify(settings), cat.id]);
          console.log(`Migrated catalog logo for '${cat.name}': ${ikLogo}`);
        } catch (e) {
          console.warn(`Failed logo for catalog '${cat.name}':`, e.message);
        }
      }
    }
  } catch (catErr) {
    console.error("Error migrating catalog logos:", catErr.message);
  }

  // 3. Migrate global settings logo
  console.log("Checking global settings logo...");
  try {
    const gRes = await executeD1("SELECT id, settings FROM global_settings WHERE settings LIKE '%cloudinary%'");
    for (const row of gRes.results) {
      let settings = typeof row.settings === "string" ? JSON.parse(row.settings) : (row.settings || {});
      if (settings.logo && settings.logo.includes("res.cloudinary.com")) {
        try {
          const logoName = settings.logo.split("/").pop() || `global_logo_${Date.now()}.png`;
          const ikLogo = await uploadToImageKit(settings.logo, logoName, "/tucatalogo/logos");
          settings.logo = ikLogo;
          await executeD1("UPDATE global_settings SET settings = ? WHERE id = ?", [JSON.stringify(settings), row.id]);
          console.log(`Migrated global settings logo: ${ikLogo}`);
        } catch (e) {
          console.warn("Failed global settings logo:", e.message);
        }
      }
    }
  } catch (gErr) {
    console.error("Error migrating global settings logo:", gErr.message);
  }

  console.log("=== CLOUDINARY -> IMAGEKIT MIGRATION FULLY COMPLETE ===");
  return { success: true, migratedCount, failedCount };
}

if (process.argv[1]?.endsWith("migrate-cloudinary-to-imagekit.mjs")) {
  migrateCloudinaryToImageKit().then(r => console.log("Done:", r)).catch(console.error);
}
