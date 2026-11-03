import fetch from 'node-fetch';

async function queryD1(sql, params = []) {
  const res = await fetch('http://localhost:3000/api/d1/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json();
  if (data && data.result && data.result[0] && data.result[0].results) {
    return data.result[0].results;
  }
  return [];
}

async function uploadToImageKit(base64Data, fileName, folder = '/tucatalogo/products') {
  const res = await fetch('http://localhost:3000/api/imagekit/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: base64Data,
      fileName,
      folder
    })
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Upload failed');
  }
  return data.url;
}

async function run() {
  console.log('=== Starting Base64 to ImageKit Migration ===');

  // 1. Migrate Products with base64 photos
  const base64Products = await queryD1('SELECT id, name, photos FROM products WHERE photos LIKE "%data:image%"');
  console.log(`Found ${base64Products.length} products with base64 photos`);

  for (const p of base64Products) {
    try {
      let photos = JSON.parse(p.photos);
      let updatedPhotos = [];
      let changed = false;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (typeof photo === 'string' && photo.startsWith('data:image')) {
          console.log(`Uploading photo for product: ${p.name} (${p.id})...`);
          const fileName = `prod_${p.id.slice(0, 8)}_${i}_${Date.now()}.jpg`;
          const url = await uploadToImageKit(photo, fileName, '/tucatalogo/products');
          console.log(`-> Uploaded to ${url}`);
          updatedPhotos.push(url);
          changed = true;
        } else {
          updatedPhotos.push(photo);
        }
      }

      if (changed) {
        await queryD1('UPDATE products SET photos = ? WHERE id = ?', [JSON.stringify(updatedPhotos), p.id]);
        console.log(`Updated product in D1: ${p.id}`);
      }
    } catch (err) {
      console.error(`Failed product ${p.id}:`, err);
    }
  }

  // 2. Migrate Catalog Settings with base64 logos
  const base64Catalogs = await queryD1('SELECT id, name, settings FROM catalogs WHERE settings LIKE "%data:image%"');
  console.log(`Found ${base64Catalogs.length} catalogs with base64 settings`);

  for (const c of base64Catalogs) {
    try {
      const settings = typeof c.settings === 'string' ? JSON.parse(c.settings) : c.settings;
      let changed = false;

      if (settings.logo && typeof settings.logo === 'string' && settings.logo.startsWith('data:image')) {
        console.log(`Uploading logo for catalog: ${c.name} (${c.id})...`);
        const fileName = `logo_${c.id.slice(0, 8)}_${Date.now()}.jpg`;
        const url = await uploadToImageKit(settings.logo, fileName, '/tucatalogo/logos');
        console.log(`-> Uploaded logo to ${url}`);
        settings.logo = url;
        changed = true;
      }

      if (Array.isArray(settings.presentation_images)) {
        for (let i = 0; i < settings.presentation_images.length; i++) {
          const img = settings.presentation_images[i];
          if (typeof img === 'string' && img.startsWith('data:image')) {
            console.log(`Uploading presentation image ${i} for catalog ${c.name}...`);
            const fileName = `pres_${c.id.slice(0, 8)}_${i}_${Date.now()}.jpg`;
            const url = await uploadToImageKit(img, fileName, '/tucatalogo/presentation');
            settings.presentation_images[i] = url;
            changed = true;
          }
        }
      }

      if (changed) {
        await queryD1('UPDATE catalogs SET settings = ? WHERE id = ?', [JSON.stringify(settings), c.id]);
        console.log(`Updated catalog settings in D1: ${c.id}`);
      }
    } catch (err) {
      console.error(`Failed catalog ${c.id}:`, err);
    }
  }

  console.log('=== Migration Complete ===');
}

run();
