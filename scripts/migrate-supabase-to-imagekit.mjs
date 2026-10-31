import fs from 'fs';

const accountId = "923e48902005bc33559c2c5583e5eeeb";
const databaseId = "2a6af808-f142-4edc-a959-d5e9b8b0fb05";
const apiToken = Buffer.from("Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=", "base64").toString("ascii");

const sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHVqb3BmeW15c3Bxd3h1ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mjc2MjMsImV4cCI6MjA5MDQwMzYyM30.XMyFA62XeGtM9sxvYK1rij8cyIfmStPc2dbx2dBMxZE";
const sbBaseUrl = "https://guhujopfymyspqwxuemu.supabase.co";

const imageKitPrivateKey = "private_SVxwOEVfklgnjh3N8xt2yQNnIo0=";
const imageKitAuthHeader = "Basic " + Buffer.from(imageKitPrivateKey + ":").toString("base64");

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

async function uploadToImageKit(fileUrl, fileName, folder = "/tucatalogo/products") {
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
    throw new Error(data.message || `Failed to upload ${fileName} to ImageKit`);
  }
  return data.url;
}

async function runMigration() {
  console.log("=== STARTING SUPABASE -> IMAGEKIT MIGRATION ===");

  // 1. Fetch all products from Supabase
  const sbRes = await fetch(`${sbBaseUrl}/rest/v1/products?select=id,name,photos,catalog_id`, {
    headers: { "apikey": sbKey, "Authorization": `Bearer ${sbKey}` }
  });
  const sbProducts = await sbRes.json();
  console.log(`Found ${sbProducts.length} products in Supabase.`);

  // 2. Fetch all products from Cloudflare D1
  const d1Res = await executeD1("SELECT id, name, photos, catalog_id FROM products");
  const d1Products = d1Res.results;
  console.log(`Found ${d1Products.length} products in Cloudflare D1.`);

  const d1Map = new Map();
  d1Products.forEach(p => d1Map.set(p.id, p));

  // 3. Collect unique image URLs from Supabase products
  const urlMapping = new Map(); // supabaseUrl -> imageKitUrl
  let totalUploaded = 0;
  let totalErrors = 0;

  for (const sp of sbProducts) {
    let photos = sp.photos;
    if (typeof photos === "string") {
      try { photos = JSON.parse(photos); } catch (e) {}
    }
    if (!Array.isArray(photos) || photos.length === 0) continue;

    for (const photoUrl of photos) {
      if (typeof photoUrl !== "string" || !photoUrl.includes("supabase.co")) continue;
      if (urlMapping.has(photoUrl)) continue;

      const fileName = photoUrl.split("/").pop() || `photo_${Date.now()}.jpg`;
      try {
        console.log(`Uploading ${fileName} to ImageKit...`);
        const ikUrl = await uploadToImageKit(photoUrl, fileName, "/tucatalogo/products");
        urlMapping.set(photoUrl, ikUrl);
        totalUploaded++;
        console.log(`Uploaded (${totalUploaded}): ${ikUrl}`);
      } catch (err) {
        console.error(`Error uploading ${photoUrl}:`, err.message);
        totalErrors++;
      }
    }
  }

  console.log(`Image migration finished: ${totalUploaded} uploaded, ${totalErrors} errors.`);

  // 4. Update matching products in Cloudflare D1
  let updatedProductsCount = 0;
  for (const sp of sbProducts) {
    if (!d1Map.has(sp.id)) continue;

    let photos = sp.photos;
    if (typeof photos === "string") {
      try { photos = JSON.parse(photos); } catch (e) {}
    }
    if (!Array.isArray(photos) || photos.length === 0) continue;

    const newPhotos = photos.map(url => urlMapping.get(url) || url);

    // Update D1
    await executeD1(
      "UPDATE products SET photos = ? WHERE id = ?",
      [JSON.stringify(newPhotos), sp.id]
    );
    updatedProductsCount++;
  }

  console.log(`Updated ${updatedProductsCount} products in Cloudflare D1 with ImageKit URLs!`);

  // 5. Also migrate catalog logo for Espazio if needed
  try {
    const espazioLogoSupabase = "https://guhujopfymyspqwxuemu.supabase.co/storage/v1/object/public/logos/logo-b74e097e-5a76-422d-b6ed-91f9781f0ee5-1775038800558-1001431760-removebg-preview.png";
    console.log("Migrating Espazio logo to ImageKit...");
    const espazioLogoIk = await uploadToImageKit(
      espazioLogoSupabase,
      "espazio-logo.png",
      "/tucatalogo/logos"
    );
    console.log("Espazio logo uploaded to ImageKit:", espazioLogoIk);

    const espazioCat = await executeD1("SELECT settings FROM catalogs WHERE id = 'b74e097e-5a76-422d-b6ed-91f9781f0ee5'");
    if (espazioCat.results.length > 0) {
      let settings = JSON.parse(espazioCat.results[0].settings || "{}");
      settings.logo = espazioLogoIk;
      await executeD1("UPDATE catalogs SET settings = ? WHERE id = 'b74e097e-5a76-422d-b6ed-91f9781f0ee5'", [JSON.stringify(settings)]);
      console.log("Espazio catalog settings updated with ImageKit logo!");
    }
  } catch (logoErr) {
    console.error("Logo migration error:", logoErr.message);
  }

  console.log("=== MIGRATION TO IMAGEKIT COMPLETE ===");
}

runMigration().catch(console.error);
