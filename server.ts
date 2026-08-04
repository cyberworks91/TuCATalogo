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
      
      // Auto-repair missing emoji column if D1 reports SQLite column error
      if (!response.ok || !data.success) {
        const errMsg = data.errors?.[0]?.message || '';
        if (errMsg.includes('no such column: emoji') || errMsg.includes('column emoji')) {
          console.log('Attempting auto-migration to add emoji column to product_types...');
          await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sql: 'ALTER TABLE product_types ADD COLUMN emoji TEXT;',
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
