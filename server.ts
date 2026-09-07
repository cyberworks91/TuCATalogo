import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

// Initialize Supabase Admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase credentials missing in server. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // Migration endpoint from Supabase to Cloudflare D1 + Cloudinary
  app.post('/api/migrate-from-supabase', async (req, res) => {
    try {
      const stats = {
        catalogs: 0,
        profiles: 0,
        products: 0,
        product_types: 0,
        orders: 0,
        global_settings: 0,
        images_migrated: 0,
        errors: [] as string[]
      };

      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '923e48902005bc33559c2c5583e5eeeb';
      const databaseId = process.env.CLOUDFLARE_DATABASE_ID || '2a6af808-f142-4edc-a959-d5e9b8b0fb05';
      const apiToken = process.env.CLOUDFLARE_API_TOKEN || Buffer.from('Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=', 'base64').toString('ascii');

      const executeD1 = async (sql: string, params: any[] = []) => {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql, params })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.errors?.[0]?.message || 'D1 execute failed');
        }
        return data;
      };

      const uploadToCloudinary = async (imageUrl: string): Promise<string> => {
        if (!imageUrl || imageUrl.includes('res.cloudinary.com')) return imageUrl;
        try {
          const formData = new FormData();
          formData.append('file', imageUrl);
          formData.append('upload_preset', 'tucatalogo_preset');

          const response = await fetch('https://api.cloudinary.com/v1_1/vj0gqfr2/image/upload', {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          if (data && data.secure_url) {
            stats.images_migrated++;
            return data.secure_url;
          }
        } catch (e: any) {
          stats.errors.push(`Image upload failed for ${imageUrl}: ${e.message}`);
        }
        return imageUrl;
      };

      // 1. Catalogs
      const { data: catalogs, error: catErr } = await supabaseAdmin.from('catalogs').select('*');
      if (catErr) stats.errors.push(`Fetch catalogs: ${catErr.message}`);
      if (catalogs) {
        for (const cat of catalogs) {
          let settingsObj = typeof cat.settings === 'string' ? JSON.parse(cat.settings) : (cat.settings || {});
          if (settingsObj.logo) {
            settingsObj.logo = await uploadToCloudinary(settingsObj.logo);
          }
          if (Array.isArray(settingsObj.presentation_images)) {
            const newImages = [];
            for (const img of settingsObj.presentation_images) {
              newImages.push(await uploadToCloudinary(img));
            }
            settingsObj.presentation_images = newImages;
          }
          await executeD1(
            `INSERT OR REPLACE INTO catalogs (id, name, slug, settings, created_at) VALUES (?, ?, ?, ?, ?)`,
            [cat.id, cat.name, cat.slug, JSON.stringify(settingsObj), cat.created_at || new Date().toISOString()]
          );
          stats.catalogs++;
        }
      }

      // 2. Profiles
      const { data: profiles, error: profErr } = await supabaseAdmin.from('profiles').select('*');
      if (profErr) stats.errors.push(`Fetch profiles: ${profErr.message}`);
      if (profiles) {
        for (const p of profiles) {
          await executeD1(
            `INSERT OR REPLACE INTO profiles (id, catalog_id, username, full_name, role, phone, password_hash, ci_number, nit, province, municipality, address_detail, email, company_name, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id, p.catalog_id || null, p.username || null, p.full_name || null, p.role || 'user',
              p.phone || null, p.password_hash || null, p.ci_number || null, p.nit || null,
              p.province || null, p.municipality || null, p.address_detail || null, p.email || null,
              p.company_name || null, p.is_active ? 1 : 0, p.created_at || new Date().toISOString()
            ]
          );
          stats.profiles++;
        }
      }

      // 3. Products
      const { data: products, error: prodErr } = await supabaseAdmin.from('products').select('*');
      if (prodErr) stats.errors.push(`Fetch products: ${prodErr.message}`);
      if (products) {
        for (const prod of products) {
          let photosList: string[] = [];
          if (Array.isArray(prod.photos)) photosList = prod.photos;
          else if (typeof prod.photos === 'string') {
            try { photosList = JSON.parse(prod.photos); } catch { photosList = [prod.photos]; }
          }
          
          const newPhotos = [];
          for (const photo of photosList) {
            newPhotos.push(await uploadToCloudinary(photo));
          }

          const refPrice = prod.ref_price ?? prod.price_ref ?? 0;
          const cupPrice = prod.cup_price ?? prod.price ?? 0;
          const minQty = prod.min_wholesale_qty ?? prod.min_quantity ?? 1;

          await executeD1(
            `INSERT OR REPLACE INTO products (
              id, catalog_id, type_id, code, name, invoice_name, description,
              price, price_ref, ref_price, cup_price,
              classification, sale_price, sale_wholesale_price_ref, custom_wholesale_price_mn,
              is_active, units_per_box, min_quantity, min_wholesale_qty,
              out_of_stock_since, out_of_stock_at, photos, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prod.id, prod.catalog_id, prod.type_id || null, prod.code || null, prod.name, prod.invoice_name || null,
              prod.description || null, cupPrice, refPrice, refPrice, cupPrice,
              prod.classification || 'stock', prod.sale_price ?? null, prod.sale_wholesale_price_ref ?? null, prod.custom_wholesale_price_mn ?? null,
              prod.is_active ? 1 : 0, prod.units_per_box || 1, minQty, minQty,
              prod.out_of_stock_at || prod.out_of_stock_since || null, prod.out_of_stock_at || prod.out_of_stock_since || null, JSON.stringify(newPhotos), prod.created_at || new Date().toISOString()
            ]
          );
          stats.products++;
        }
      }

      // 4. Product Types
      const { data: pTypes, error: typeErr } = await supabaseAdmin.from('product_types').select('*');
      if (typeErr) stats.errors.push(`Fetch product_types: ${typeErr.message}`);
      if (pTypes) {
        try {
          await executeD1('ALTER TABLE product_types ADD COLUMN emoji TEXT;');
        } catch (e) {
          // Ignore if column already exists
        }
        for (const pt of pTypes) {
          await executeD1(
            `INSERT OR REPLACE INTO product_types (id, name, emoji) VALUES (?, ?, ?)`,
            [pt.id, pt.name, pt.emoji || '📦']
          );
          stats.product_types++;
        }
      }

      // 5. Orders
      const { data: orders, error: ordErr } = await supabaseAdmin.from('orders').select('*');
      if (ordErr) stats.errors.push(`Fetch orders: ${ordErr.message}`);
      if (orders) {
        for (const ord of orders) {
          const itemsJson = typeof ord.items === 'string' ? ord.items : JSON.stringify(ord.items || []);
          const clientInfoJson = typeof ord.client_info === 'string' ? ord.client_info : JSON.stringify(ord.client_info || {});
          await executeD1(
            `INSERT OR REPLACE INTO orders (id, catalog_id, user_id, order_number, order_index, deal_type, payment_method, status, exchange_rate, items, client_info, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ord.id, ord.catalog_id, ord.user_id || null, ord.order_number || null, ord.order_index || 0,
              ord.deal_type || null, ord.payment_method || null, ord.status || 'pending',
              ord.exchange_rate || 1, itemsJson, clientInfoJson, ord.created_at || new Date().toISOString()
            ]
          );
          stats.orders++;
        }
      }

      // 6. Global Settings
      const { data: gSettings, error: globErr } = await supabaseAdmin.from('global_settings').select('*');
      if (globErr) stats.errors.push(`Fetch global_settings: ${globErr.message}`);
      if (gSettings) {
        for (const gs of gSettings) {
          let settingsObj = typeof gs.settings === 'string' ? JSON.parse(gs.settings) : (gs.settings || {});
          if (settingsObj.logo) {
            settingsObj.logo = await uploadToCloudinary(settingsObj.logo);
          }
          await executeD1(
            `INSERT OR REPLACE INTO global_settings (id, settings, updated_at) VALUES (?, ?, ?)`,
            [gs.id, JSON.stringify(settingsObj), gs.updated_at || new Date().toISOString()]
          );
          stats.global_settings++;
        }
      }

      res.json({ success: true, stats });
    } catch (error: any) {
      console.error('Migration error:', error);
      res.status(500).json({ error: error.message || 'Migration failed' });
    }
  });

  // API Route for Cloudflare D1 Database Queries
  app.post('/api/d1/query', async (req, res) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '923e48902005bc33559c2c5583e5eeeb';
    const databaseId = process.env.CLOUDFLARE_DATABASE_ID || '2a6af808-f142-4edc-a959-d5e9b8b0fb05';
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || Buffer.from('Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=', 'base64').toString('ascii');

    const { sql, params } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'Missing SQL statement' });
    }

    try {
      let response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql,
          params: params || []
        })
      });

      let data = await response.json();
      
      // Auto-repair missing column errors if D1 reports SQLite column error
      if (!response.ok || !data.success) {
        const errMsg = data.errors?.[0]?.message || '';
        const matchNamed = errMsg.match(/table\s+(\w+)\s+has\s+no\s+column\s+named\s+(\w+)/i);
        const matchNoSuch = errMsg.match(/no\s+such\s+column:\s+(\w+)/i);

        let targetTable = '';
        let targetCol = '';

        if (matchNamed) {
          targetTable = matchNamed[1];
          targetCol = matchNamed[2];
        } else if (matchNoSuch) {
          targetCol = matchNoSuch[1];
        }

        if (!targetTable) {
          const sqlMatch = sql.match(/(?:INTO|FROM|UPDATE)\s+(\w+)/i);
          if (sqlMatch) targetTable = sqlMatch[1];
        }

        if (targetTable && targetCol) {
          console.log(`Attempting auto-migration: ALTER TABLE ${targetTable} ADD COLUMN ${targetCol} TEXT...`);
          await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sql: `ALTER TABLE ${targetTable} ADD COLUMN ${targetCol} TEXT;`,
              params: []
            })
          });

          // Retry original query
          response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sql,
              params: params || []
            })
          });
          data = await response.json();
        }
      }

      if (!response.ok || !data.success) {
        console.error('Cloudflare D1 Query Error:', data);
        return res.status(response.status || 500).json({ error: data.errors?.[0]?.message || 'D1 query failed', data });
      }

      res.json(data);
    } catch (error: any) {
      console.error('Error executing D1 query:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route for Super Admin to change any user's password
  app.post('/api/admin/update-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { userId, newPassword } = req.body;

    try {
      // 1. Verify the requester's token and get their ID
      const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !requester) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // 2. Check if the requester is a Super Admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single();

      if (profileError || profile?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only Super Admins can perform this action' });
      }

      // 3. Update the target user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        throw updateError;
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Public API Endpoint for external catalog consultation via API Key
  const handleCatalogApi = async (req: express.Request, res: express.Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      // 1. Extract API Key
      let apiKey = (req.headers['x-api-key'] as string) || '';
      if (!apiKey && req.headers['authorization']) {
        const auth = req.headers['authorization'];
        if (auth.startsWith('Bearer ')) {
          apiKey = auth.substring(7).trim();
        } else {
          apiKey = auth.trim();
        }
      }
      if (!apiKey && req.query.api_key) {
        apiKey = String(req.query.api_key).trim();
      }
      if (!apiKey && req.query.key) {
        apiKey = String(req.query.key).trim();
      }

      if (!apiKey) {
        return res.status(401).json({
          status: 'error',
          error: 'UNAUTHORIZED',
          message: 'Se requiere una API Key para acceder al catálogo. Envíala en la cabecera "x-api-key: TU_API_KEY", "Authorization: Bearer TU_API_KEY" o como parámetro "?api_key=TU_API_KEY".'
        });
      }

      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '923e48902005bc33559c2c5583e5eeeb';
      const databaseId = process.env.CLOUDFLARE_DATABASE_ID || '2a6af808-f142-4edc-a959-d5e9b8b0fb05';
      const apiToken = process.env.CLOUDFLARE_API_TOKEN || Buffer.from('Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=', 'base64').toString('ascii');

      const queryD1Internal = async (sql: string, params: any[] = []) => {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql, params })
        });
        const data = await response.json();
        if (data?.result?.[0]?.results) {
          return data.result[0].results;
        }
        return [];
      };

      // 2. Locate catalog with matching API Key
      const catalogs = await queryD1Internal('SELECT * FROM catalogs');
      let targetCatalog: any = null;
      let matchedApiKey: any = null;

      for (const cat of catalogs) {
        const settings = typeof cat.settings === 'string' ? JSON.parse(cat.settings || '{}') : (cat.settings || {});
        if (Array.isArray(settings.api_keys)) {
          const foundKey = settings.api_keys.find((k: any) => k.key === apiKey);
          if (foundKey) {
            targetCatalog = {
              ...cat,
              settings
            };
            matchedApiKey = foundKey;
            break;
          }
        }
      }

      if (!targetCatalog || !matchedApiKey) {
        return res.status(401).json({
          status: 'error',
          error: 'INVALID_API_KEY',
          message: 'La API Key proporcionada no es válida o no existe.'
        });
      }

      if (matchedApiKey.is_active === false) {
        return res.status(403).json({
          status: 'error',
          error: 'API_KEY_DISABLED',
          message: 'La API Key proporcionada está deshabilitada en el panel de administración.'
        });
      }

      // 3. Update last_used_at for the API key asynchronously
      try {
        const updatedKeys = targetCatalog.settings.api_keys.map((k: any) => {
          if (k.id === matchedApiKey.id || k.key === matchedApiKey.key) {
            return { ...k, last_used_at: new Date().toISOString() };
          }
          return k;
        });
        const updatedSettings = { ...targetCatalog.settings, api_keys: updatedKeys };
        queryD1Internal('UPDATE catalogs SET settings = ? WHERE id = ?', [JSON.stringify(updatedSettings), targetCatalog.id]).catch(() => {});
      } catch (err) {
        console.warn('Could not update API key last_used_at:', err);
      }

      // 4. Fetch products and product categories for this catalog
      const [productsRows, typesRows] = await Promise.all([
        queryD1Internal('SELECT * FROM products WHERE catalog_id = ?', [targetCatalog.id]),
        queryD1Internal('SELECT * FROM product_types')
      ]);

      const categoryMap = new Map<string, { name: string; emoji: string }>();
      typesRows.forEach((t: any) => {
        categoryMap.set(t.id, { name: t.name, emoji: t.emoji || '📦' });
      });

      const exchangeRate = Number(targetCatalog.exchange_rate) || 1;
      const exchangeMargin = Number(targetCatalog.settings?.exchange_rate_margin) || 0;
      const effectiveRate = exchangeRate + exchangeMargin;

      let products = productsRows.map((p: any) => {
        let photos: string[] = [];
        try {
          photos = typeof p.photos === 'string' ? JSON.parse(p.photos || '[]') : (p.photos || []);
        } catch (e) {
          photos = [];
        }

        const typeInfo = p.type_id ? categoryMap.get(p.type_id) : null;
        const isOut = !!(p.out_of_stock_at || p.out_of_stock_since);
        const isActive = p.is_active === 1 || p.is_active === true || p.is_active === '1';

        const refPrice = Number(p.price_ref ?? p.ref_price ?? p.price ?? 0);
        const cupPrice = Number(p.cup_price ?? p.price ?? 0);
        const classification = p.classification || 'stock';
        const salePriceRef = p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : null;
        const saleWholesalePriceRef = p.sale_wholesale_price_ref !== null && p.sale_wholesale_price_ref !== undefined ? Number(p.sale_wholesale_price_ref) : null;
        const customWholesalePriceMn = p.custom_wholesale_price_mn !== null && p.custom_wholesale_price_mn !== undefined ? Number(p.custom_wholesale_price_mn) : null;

        let calculatedWholesalePriceMn = 0;
        if (customWholesalePriceMn !== null && customWholesalePriceMn !== undefined && Number(customWholesalePriceMn) > 0) {
          calculatedWholesalePriceMn = Number(customWholesalePriceMn);
        } else if (saleWholesalePriceRef !== null && saleWholesalePriceRef !== undefined && Number(saleWholesalePriceRef) > 0) {
          calculatedWholesalePriceMn = Math.round(Number(saleWholesalePriceRef) * effectiveRate);
        } else if (classification === 'sale' && salePriceRef !== null && salePriceRef !== undefined && Number(salePriceRef) > 0) {
          calculatedWholesalePriceMn = Math.round(Number(salePriceRef) * effectiveRate);
        } else if (refPrice > 0) {
          calculatedWholesalePriceMn = Math.round(refPrice * effectiveRate);
        }

        return {
          id: p.id,
          code: p.code || null,
          name: p.name,
          invoice_name: p.invoice_name || p.name,
          description: p.description || null,
          category_id: p.type_id || null,
          category_name: typeInfo?.name || null,
          category_emoji: typeInfo?.emoji || null,
          photos,
          pricing: {
            ref_price: refPrice,
            cup_price: cupPrice,
            classification,
            sale_price_ref: salePriceRef,
            sale_wholesale_price_ref: saleWholesalePriceRef,
            min_wholesale_qty: Number(p.min_wholesale_qty || p.min_quantity || 1),
            custom_wholesale_price_mn: customWholesalePriceMn,
            calculated_wholesale_price_mn: calculatedWholesalePriceMn
          },
          units_per_box: Number(p.units_per_box || 1),
          min_quantity: Number(p.min_quantity || p.min_wholesale_qty || 1),
          in_stock: !isOut,
          is_active: isActive,
          created_at: p.created_at || null
        };
      });

      // Query Filters
      if (req.query.is_active === 'true' || req.query.is_active === undefined) {
        products = products.filter((p: any) => p.is_active);
      } else if (req.query.is_active === 'false') {
        products = products.filter((p: any) => !p.is_active);
      }

      if (req.query.in_stock === 'true') {
        products = products.filter((p: any) => p.in_stock);
      } else if (req.query.in_stock === 'false') {
        products = products.filter((p: any) => !p.in_stock);
      }

      if (req.query.category_id || req.query.type_id) {
        const catId = String(req.query.category_id || req.query.type_id);
        products = products.filter((p: any) => p.category_id === catId);
      }

      if (req.query.classification) {
        const cls = String(req.query.classification).toLowerCase();
        products = products.filter((p: any) => p.pricing.classification === cls);
      }

      if (req.query.search) {
        const q = String(req.query.search).toLowerCase();
        products = products.filter((p: any) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.invoice_name && p.invoice_name.toLowerCase().includes(q))
        );
      }

      res.json({
        status: 'success',
        catalog: {
          id: targetCatalog.id,
          name: targetCatalog.name,
          slug: targetCatalog.slug,
          exchange_rate: exchangeRate,
          exchange_rate_margin: exchangeMargin,
          effective_exchange_rate: effectiveRate,
          sale_type_wholesale: targetCatalog.settings?.sale_type_wholesale !== false,
          sale_type_retail: targetCatalog.settings?.sale_type_retail !== false,
          logo_url: targetCatalog.settings?.logo || null,
          contact: {
            phone: targetCatalog.settings?.footer?.phone || null,
            whatsapp: targetCatalog.settings?.footer?.whatsapp || null,
            email: targetCatalog.settings?.footer?.email || null,
            address: targetCatalog.settings?.footer?.address || null,
            schedule: targetCatalog.settings?.footer?.schedule || null,
            about: targetCatalog.settings?.footer?.about || null,
            map_url: targetCatalog.settings?.footer?.map_url || null
          },
          provider: {
            name: targetCatalog.settings?.provider?.name || targetCatalog.name,
            dni_nit: targetCatalog.settings?.provider?.dni_nit || null,
            city: targetCatalog.settings?.provider?.city || null,
            address: targetCatalog.settings?.provider?.address || targetCatalog.settings?.footer?.address || null,
            contact: targetCatalog.settings?.provider?.contact || targetCatalog.settings?.footer?.email || null,
            phone: targetCatalog.settings?.provider?.phone || targetCatalog.settings?.footer?.phone || null,
            invoice_prefix: targetCatalog.settings?.provider?.invoice_prefix || null
          }
        },
        categories: typesRows.map((t: any) => ({
          id: t.id,
          name: t.name,
          emoji: t.emoji || '📦'
        })),
        products,
        meta: {
          total_products: products.length,
          api_key_name: matchedApiKey.name || 'API Key',
          generated_at: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Error in handleCatalogApi:', error);
      res.status(500).json({ status: 'error', error: 'INTERNAL_ERROR', message: error.message || 'Error al consultar catálogo' });
    }
  };

  app.get('/api/v1/catalog', handleCatalogApi);
  app.get('/api/v1/catalog/products', handleCatalogApi);
  app.get('/api/v1/catalogs/products', handleCatalogApi);

  // Serve static assets from public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      // Do not return index.html for missing static files (png, jpg, ico, svg, json, etc.)
      if (/\.(png|jpg|jpeg|gif|ico|svg|webp|json|css|js|webmanifest|woff2?|xml|txt)$/i.test(req.path)) {
        return res.status(404).send('Not found');
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
