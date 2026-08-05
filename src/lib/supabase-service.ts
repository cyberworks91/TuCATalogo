import { createClient } from '@supabase/supabase-js';
import { supabase, isPlaceholder } from './supabase';
import { useAuthStore } from '../store';

const handleSupabaseError = (error: any) => {
  if (error?.message === 'Failed to fetch') {
    throw new Error('No se pudo conectar con Supabase. Por favor, verifica tu conexión a internet y asegúrate de que las credenciales de Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY) estén configuradas correctamente en tu archivo .env.');
  }
  throw error;
};

const getLocalOrders = (catalogId?: string) => {
  try {
    const raw = localStorage.getItem('app_local_orders');
    const list = raw ? JSON.parse(raw) : [];
    if (catalogId) {
      return list.filter((o: any) => o.catalog_id === catalogId);
    }
    return list;
  } catch (e) {
    return [];
  }
};

const saveLocalOrder = (order: any) => {
  try {
    const raw = localStorage.getItem('app_local_orders');
    const list = raw ? JSON.parse(raw) : [];
    const existsIdx = list.findIndex((o: any) => o.id === order.id);
    if (existsIdx >= 0) {
      list[existsIdx] = { ...list[existsIdx], ...order };
    } else {
      list.unshift(order);
    }
    localStorage.setItem('app_local_orders', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save local order:', e);
  }
};

const deleteLocalOrder = (id: string) => {
  try {
    const raw = localStorage.getItem('app_local_orders');
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((o: any) => o.id !== id);
    localStorage.setItem('app_local_orders', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete local order:', e);
  }
};

const getLocalProfiles = (catalogId?: string) => {
  try {
    const raw = localStorage.getItem('app_local_profiles');
    const list = raw ? JSON.parse(raw) : [];
    if (catalogId) {
      return list.filter((p: any) => p.catalog_id === catalogId || !p.catalog_id);
    }
    return list;
  } catch (e) {
    return [];
  }
};

const saveLocalProfile = (profile: any) => {
  try {
    const raw = localStorage.getItem('app_local_profiles');
    const list = raw ? JSON.parse(raw) : [];
    const existsIdx = list.findIndex((p: any) => p.id === profile.id);
    if (existsIdx >= 0) {
      list[existsIdx] = { ...list[existsIdx], ...profile };
    } else {
      list.push(profile);
    }
    localStorage.setItem('app_local_profiles', JSON.stringify(list));
    return profile;
  } catch (e) {
    console.warn('Failed to save local profile:', e);
    return profile;
  }
};

const deleteLocalProfile = (id: string) => {
  try {
    const raw = localStorage.getItem('app_local_profiles');
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((p: any) => p.id !== id);
    localStorage.setItem('app_local_profiles', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete local profile:', e);
  }
};

export const storageService = {
  async uploadFile(bucket: string, file: File | Blob, path: string): Promise<string> {
    const fileObj = file instanceof File ? file : new File([file], path.split('/').pop() || 'image.jpg', { type: file.type || 'image/jpeg' });

    // Exclusively upload to Cloudinary organized into folders
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'vj0gqfr2';
    const presetCandidates = Array.from(new Set([
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      'tucatalogo_preset',
      'PIP',
      '77373d50-eca8-49f5-a36d-f8facd6a7f97',
      'ml_default'
    ].filter(Boolean))) as string[];

    const folderName = `tucatalogo/${bucket || 'general'}`;
    let lastError = '';

    if (cloudName && presetCandidates.length > 0) {
      for (const preset of presetCandidates) {
        // First try with folder parameter
        try {
          const formData = new FormData();
          formData.append('file', fileObj);
          formData.append('upload_preset', preset);
          formData.append('folder', folderName);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data && data.secure_url) {
            console.log(`Successfully uploaded to Cloudinary folder '${folderName}' using preset '${preset}':`, data.secure_url);
            return data.secure_url;
          } else if (data && data.error) {
            lastError = data.error.message || 'Error en Cloudinary';
            console.warn(`Cloudinary upload attempt with preset '${preset}' and folder error:`, lastError);
          }
        } catch (err: any) {
          lastError = err?.message || 'Error de conexión con Cloudinary';
          console.warn(`Cloudinary upload failed with preset '${preset}':`, err);
        }

        // Retry without folder parameter if preset restricts folder override
        try {
          const formDataNoFolder = new FormData();
          formDataNoFolder.append('file', fileObj);
          formDataNoFolder.append('upload_preset', preset);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formDataNoFolder,
          });

          const data = await res.json();
          if (data && data.secure_url) {
            console.log(`Successfully uploaded to Cloudinary using preset '${preset}':`, data.secure_url);
            return data.secure_url;
          }
        } catch (err: any) {
          console.warn(`Cloudinary retry without folder failed with preset '${preset}':`, err);
        }
      }
    }

    // Fallback to Data URL if Cloudinary upload fails so product creation and photo upload never crash
    console.warn(`Cloudinary upload failed (${lastError}), falling back to Data URL for image`);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fileObj);
    });
  },

  async deleteFile(bucket: string, path: string) {
    // Cloudinary or local image deletion no-op for now
    console.log(`Deleting file ${path} from ${bucket}`);
  }
};

export const authService = {
  async register(email: string, password: string, metadata: any) {
    try {
      const id = crypto.randomUUID();
      const profile = {
        id,
        email,
        username: metadata.username || email.split('@')[0],
        full_name: metadata.full_name || metadata.username || email.split('@')[0],
        phone: metadata.phone || '',
        role: metadata.role || 'user',
        catalog_id: metadata.catalog_id,
        created_by: metadata.created_by || null
      };
      await dbService.updateProfile(id, profile);
      return { user: { id, email, user_metadata: metadata } };
    } catch (error) {
      console.warn('Register notice:', error);
      throw error;
    }
  },

  async createClientUser(email?: string, password = '123456', metadata: any = {}) {
    try {
      const targetEmail = email && email.trim() !== '' 
        ? email.trim() 
        : `cliente_${Date.now()}_${Math.floor(Math.random()*10000)}@catalogo.local`;
      const userId = crypto.randomUUID();

      const profilePayload = {
        id: userId,
        email: targetEmail,
        username: metadata.username || metadata.full_name?.toLowerCase().replace(/\s+/g, '_') || `cliente_${Date.now()}`,
        full_name: metadata.full_name,
        phone: metadata.phone || '',
        province: metadata.province || '',
        municipality: metadata.municipality || '',
        address_detail: metadata.address_detail || '',
        client_type: metadata.client_type || 'persona',
        company_name: metadata.company_name || '',
        nit: metadata.nit || '',
        ci_number: metadata.ci_number || '',
        role: metadata.role || 'client',
        catalog_id: metadata.catalog_id,
        created_by: metadata.created_by || null
      };

      const profile = await dbService.updateProfile(userId, profilePayload);
      return profile || profilePayload;
    } catch (error) {
      console.warn('createClientUser notice:', error);
      return null;
    }
  },

  async login(identifier: string, password: string) {
    try {
      const d1Res = await queryD1('SELECT * FROM profiles WHERE email = ? OR username = ? LIMIT 1', [identifier, identifier]);
      if (d1Res && d1Res.length > 0) {
        const user = d1Res[0];
        return { user: { id: user.id, email: user.email, user_metadata: user }, session: { user } };
      }
      const localProfiles = getLocalProfiles();
      const match = localProfiles.find((p: any) => p.email === identifier || p.username === identifier);
      if (match) {
        return { user: { id: match.id, email: match.email, user_metadata: match }, session: { user: match } };
      }
      return null;
    } catch (error) {
      console.warn('Notice in login D1:', error);
      return null;
    }
  },

  async logout() {
    return Promise.resolve();
  },

  async getProfile(id: string) {
    try {
      const d1Res = await queryD1('SELECT * FROM profiles WHERE id = ? LIMIT 1', [id]);
      if (d1Res && d1Res.length > 0) return d1Res[0];
      const localProfiles = getLocalProfiles();
      return localProfiles.find((p: any) => p.id === id) || null;
    } catch (error) {
      console.warn('Notice in getProfile D1:', error);
      return null;
    }
  },
  
  async updateUser(updates: { email?: string; password?: string; data?: any }) {
    return updates;
  }
};

const normalizeProduct = (p: any) => {
  if (!p) return p;
  let unitsPerBox = p.units_per_box;
  let cleanDesc = p.description || '';
  if ((unitsPerBox === undefined || unitsPerBox === null) && cleanDesc) {
    const match = cleanDesc.match(/\[box:(\d+)\]/i);
    if (match) {
      unitsPerBox = parseInt(match[1]);
    }
  }
  let invoiceName = p.invoice_name;
  if (!invoiceName && cleanDesc) {
    const matchInv = cleanDesc.match(/\[invoice_name:(.*?)\]/i);
    if (matchInv) {
      invoiceName = matchInv[1];
    }
  }
  if (cleanDesc) {
    cleanDesc = cleanDesc.replace(/\[box:\d+\]/gi, '').replace(/\[invoice_name:.*?\]/gi, '').trim();
  }

  const refPrice = Number(p.ref_price ?? p.price_ref ?? 0);
  const cupPrice = Number(p.cup_price ?? p.price ?? 0);
  const minQty = Number(p.min_wholesale_qty ?? p.min_quantity ?? 1);

  return {
    ...p,
    description: cleanDesc,
    ref_price: refPrice,
    cup_price: cupPrice,
    price_ref: refPrice,
    price: cupPrice,
    min_wholesale_qty: minQty,
    min_quantity: minQty,
    sale_price: p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : undefined,
    sale_wholesale_price_ref: p.sale_wholesale_price_ref !== null && p.sale_wholesale_price_ref !== undefined ? Number(p.sale_wholesale_price_ref) : undefined,
    custom_wholesale_price_mn: p.custom_wholesale_price_mn !== null && p.custom_wholesale_price_mn !== undefined ? Number(p.custom_wholesale_price_mn) : undefined,
    units_per_box: unitsPerBox ? Number(unitsPerBox) : undefined,
    invoice_name: invoiceName || p.invoice_name || undefined
  };
};

async function queryD1(sql: string, params: any[] = []) {
  try {
    const res = await fetch('/api/d1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.result && json.result[0] && json.result[0].results) {
      return json.result[0].results;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function syncProductToD1(prod: any) {
  if (!prod || !prod.id) return;
  const refPrice = Number(prod.ref_price ?? prod.price_ref ?? 0);
  const cupPrice = Number(prod.cup_price ?? prod.price ?? 0);
  const minQty = Number(prod.min_wholesale_qty ?? prod.min_quantity ?? 1);
  let photosStr = JSON.stringify(prod.photos || []);

  await queryD1(
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
      prod.out_of_stock_at || prod.out_of_stock_since || null, prod.out_of_stock_at || prod.out_of_stock_since || null,
      photosStr, prod.created_at || new Date().toISOString()
    ]
  );
}

export const dbService = {
  // Catalogs
  async getCatalogs() {
    try {
      const d1Res = await queryD1('SELECT * FROM catalogs');
      if (d1Res) {
        return d1Res.map((c: any) => ({
          ...c,
          exchange_rate: Number(c.exchange_rate) || 1,
          settings: typeof c.settings === 'string' ? JSON.parse(c.settings) : (c.settings || {})
        }));
      }
      return [];
    } catch (error) {
      console.warn('Notice in getCatalogs:', error);
      return [];
    }
  },
  async getCatalogBySlug(slug: string) {
    try {
      if (!slug) return null;
      const d1Res = await queryD1('SELECT * FROM catalogs WHERE slug = ? LIMIT 1', [slug]);
      if (d1Res && d1Res.length > 0) {
        const cat = d1Res[0];
        return {
          ...cat,
          exchange_rate: Number(cat.exchange_rate) || 1,
          settings: typeof cat.settings === 'string' ? JSON.parse(cat.settings) : (cat.settings || {})
        };
      }
      return null;
    } catch (error) {
      console.warn('Notice in getCatalogBySlug:', error);
      return null;
    }
  },
  async createCatalog(catalog: any) {
    try {
      const catId = catalog.id || crypto.randomUUID();
      const settingsStr = typeof catalog.settings === 'object' ? JSON.stringify(catalog.settings) : (catalog.settings || '{}');
      const createdAt = catalog.created_at || new Date().toISOString();

      await queryD1(
        'INSERT OR REPLACE INTO catalogs (id, name, slug, exchange_rate, settings, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [catId, catalog.name, catalog.slug, Number(catalog.exchange_rate) || 1, settingsStr, createdAt]
      );

      return {
        ...catalog,
        id: catId,
        exchange_rate: Number(catalog.exchange_rate) || 1,
        settings: typeof catalog.settings === 'string' ? JSON.parse(catalog.settings) : (catalog.settings || {}),
        created_at: createdAt
      };
    } catch (error) {
      console.warn('Notice in createCatalog:', error);
      return catalog;
    }
  },
  async updateCatalog(id: string, updates: any) {
    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      if (updates.exchange_rate !== undefined) {
        setClauses.push('exchange_rate = ?');
        params.push(Number(updates.exchange_rate) || 0);
      }
      if (updates.name !== undefined) {
        setClauses.push('name = ?');
        params.push(updates.name);
      }
      if (updates.slug !== undefined) {
        setClauses.push('slug = ?');
        params.push(updates.slug);
      }
      if (updates.settings !== undefined) {
        setClauses.push('settings = ?');
        params.push(typeof updates.settings === 'object' ? JSON.stringify(updates.settings) : updates.settings);
      }
      if (setClauses.length > 0) {
        params.push(id);
        await queryD1(`UPDATE catalogs SET ${setClauses.join(', ')} WHERE id = ?`, params);
      }

      const d1Res = await queryD1('SELECT * FROM catalogs WHERE id = ? LIMIT 1', [id]);
      if (d1Res && d1Res.length > 0) {
        const cat = d1Res[0];
        return {
          ...cat,
          exchange_rate: Number(cat.exchange_rate || 1),
          settings: typeof cat.settings === 'string' ? JSON.parse(cat.settings) : (cat.settings || {})
        };
      }
      return { id, ...updates };
    } catch (error) {
      console.warn('Notice in updateCatalog:', error);
      return { id, ...updates };
    }
  },

  // Products
  async getProducts(catalogId: string) {
    try {
      if (!catalogId) return [];
      const d1Res = await queryD1('SELECT * FROM products WHERE catalog_id = ?', [catalogId]);
      if (d1Res) {
        return d1Res.map((p: any) => {
          let photos: string[] = [];
          if (typeof p.photos === 'string') {
            try { photos = JSON.parse(p.photos); } catch { photos = [p.photos]; }
          } else if (Array.isArray(p.photos)) {
            photos = p.photos;
          }
          return normalizeProduct({ ...p, photos, is_active: Boolean(p.is_active) });
        });
      }
      return [];
    } catch (error) {
      console.warn('Notice in getProducts:', error);
      return [];
    }
  },
  async searchAllProducts(query: string) {
    try {
      const d1Res = await queryD1(
        'SELECT p.*, c.name as catalog_name, c.slug as catalog_slug FROM products p LEFT JOIN catalogs c ON p.catalog_id = c.id WHERE p.is_active = 1 AND p.name LIKE ? LIMIT 20',
        [`%${query}%`]
      );
      if (d1Res) {
        return d1Res.map((p: any) => {
          let photos: string[] = [];
          if (typeof p.photos === 'string') {
            try { photos = JSON.parse(p.photos); } catch { photos = [p.photos]; }
          } else if (Array.isArray(p.photos)) {
            photos = p.photos;
          }
          return {
            ...normalizeProduct({ ...p, photos, is_active: Boolean(p.is_active) }),
            catalogs: { name: p.catalog_name, slug: p.catalog_slug }
          };
        });
      }
      return [];
    } catch (error) {
      console.warn('Notice in searchAllProducts:', error);
      return [];
    }
  },
  async createProduct(product: any) {
    try {
      const cleanProduct = { ...product };
      if (!cleanProduct.id) {
        cleanProduct.id = crypto.randomUUID();
      }
      if (cleanProduct.units_per_box && cleanProduct.units_per_box > 0) {
        let desc = cleanProduct.description || '';
        desc = desc.replace(/\[box:\d+\]/gi, '').trim();
        cleanProduct.description = desc ? `${desc}\n[box:${cleanProduct.units_per_box}]` : `[box:${cleanProduct.units_per_box}]`;
      }
      if (cleanProduct.invoice_name) {
        let desc = cleanProduct.description || '';
        desc = desc.replace(/\[invoice_name:.*?\]/gi, '').trim();
        cleanProduct.description = desc ? `${desc}\n[invoice_name:${cleanProduct.invoice_name}]` : `[invoice_name:${cleanProduct.invoice_name}]`;
      }

      const resProd = normalizeProduct(cleanProduct);
      await syncProductToD1(resProd);
      return resProd;
    } catch (error) {
      console.warn('Unhandled exception in createProduct:', error);
      return normalizeProduct(product);
    }
  },
  async updateProduct(id: string, updates: any) {
    try {
      const cleanUpdates = { ...updates };
      if (cleanUpdates.units_per_box && cleanUpdates.units_per_box > 0) {
        let desc = cleanUpdates.description || '';
        desc = desc.replace(/\[box:\d+\]/gi, '').trim();
        cleanUpdates.description = desc ? `${desc}\n[box:${cleanUpdates.units_per_box}]` : `[box:${cleanUpdates.units_per_box}]`;
      } else if (cleanUpdates.units_per_box === null || cleanUpdates.units_per_box === 0) {
        if (cleanUpdates.description) {
          cleanUpdates.description = cleanUpdates.description.replace(/\[box:\d+\]/gi, '').trim();
        }
      }
      if (cleanUpdates.invoice_name) {
        let desc = cleanUpdates.description || '';
        desc = desc.replace(/\[invoice_name:.*?\]/gi, '').trim();
        cleanUpdates.description = desc ? `${desc}\n[invoice_name:${cleanUpdates.invoice_name}]` : `[invoice_name:${cleanUpdates.invoice_name}]`;
      } else if (cleanUpdates.invoice_name === '' || cleanUpdates.invoice_name === null) {
        if (cleanUpdates.description) {
          cleanUpdates.description = cleanUpdates.description.replace(/\[invoice_name:.*?\]/gi, '').trim();
        }
      }

      const fieldMap: Record<string, string> = {
        catalog_id: 'catalog_id',
        type_id: 'type_id',
        code: 'code',
        name: 'name',
        invoice_name: 'invoice_name',
        description: 'description',
        price: 'price',
        price_ref: 'price_ref',
        ref_price: 'ref_price',
        cup_price: 'cup_price',
        classification: 'classification',
        sale_price: 'sale_price',
        sale_wholesale_price_ref: 'sale_wholesale_price_ref',
        custom_wholesale_price_mn: 'custom_wholesale_price_mn',
        is_active: 'is_active',
        units_per_box: 'units_per_box',
        min_quantity: 'min_quantity',
        min_wholesale_qty: 'min_wholesale_qty',
        out_of_stock_since: 'out_of_stock_since',
        out_of_stock_at: 'out_of_stock_at',
        photos: 'photos'
      };

      const setClauses: string[] = [];
      const params: any[] = [];

      for (const [key, colName] of Object.entries(fieldMap)) {
        if (cleanUpdates[key] !== undefined) {
          setClauses.push(`${colName} = ?`);
          let val = cleanUpdates[key];
          if (key === 'photos' && Array.isArray(val)) {
            val = JSON.stringify(val);
          } else if (key === 'is_active') {
            val = val ? 1 : 0;
          } else if (val === undefined) {
            val = null;
          }
          params.push(val);
        }
      }

      if (setClauses.length > 0) {
        params.push(id);
        await queryD1(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`, params);
      }

      const d1Res = await queryD1('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
      if (d1Res && d1Res.length > 0) {
        const p = d1Res[0];
        let photos: string[] = [];
        if (typeof p.photos === 'string') {
          try { photos = JSON.parse(p.photos); } catch { photos = [p.photos]; }
        } else if (Array.isArray(p.photos)) {
          photos = p.photos;
        }
        return normalizeProduct({ ...p, photos, is_active: Boolean(p.is_active) });
      }

      return normalizeProduct({ ...cleanUpdates, id });
    } catch (error) {
      console.warn('Unhandled exception in updateProduct:', error);
      return normalizeProduct({ ...updates, id });
    }
  },
  async deleteProduct(id: string) {
    try {
      await queryD1('DELETE FROM products WHERE id = ?', [id]);
    } catch (error) {
      console.warn('Error deleting product from D1:', error);
    }
  },

  // Product Types
  async getProductTypes() {
    try {
      let d1Res: any[] = [];
      try {
        d1Res = await queryD1('SELECT * FROM product_types');
      } catch (err) {
        try {
          await queryD1('ALTER TABLE product_types ADD COLUMN emoji TEXT;');
          d1Res = await queryD1('SELECT * FROM product_types');
        } catch (e) {}
      }
      if (!d1Res || d1Res.length === 0) {
        if (!isPlaceholder) {
          const { data } = await supabase.from('product_types').select('*');
          if (data && data.length > 0) return data;
        }
      }
      return (d1Res || []).map((pt: any) => ({
        ...pt,
        emoji: pt.emoji || '📦'
      }));
    } catch (error) {
      console.warn('Notice in getProductTypes:', error);
      return [];
    }
  },
  async createProductType(type: any) {
    try {
      const id = type.id || crypto.randomUUID();
      const emoji = type.emoji || '📦';
      try {
        await queryD1('INSERT OR REPLACE INTO product_types (id, name, emoji) VALUES (?, ?, ?)', [id, type.name, emoji]);
      } catch (err) {
        try {
          await queryD1('ALTER TABLE product_types ADD COLUMN emoji TEXT;');
          await queryD1('INSERT OR REPLACE INTO product_types (id, name, emoji) VALUES (?, ?, ?)', [id, type.name, emoji]);
        } catch (err2) {
          await queryD1('INSERT OR REPLACE INTO product_types (id, name) VALUES (?, ?)', [id, type.name]);
        }
      }
      if (!isPlaceholder) {
        await supabase.from('product_types').upsert({ id, name: type.name, emoji });
      }
      return { id, name: type.name, emoji };
    } catch (error) {
      console.warn('Notice in createProductType:', error);
      return type;
    }
  },
  async updateProductType(id: string, updates: any) {
    try {
      const emoji = updates.emoji !== undefined ? updates.emoji : '📦';
      if (updates.name !== undefined || updates.emoji !== undefined) {
        try {
          await queryD1('UPDATE product_types SET name = ?, emoji = ? WHERE id = ?', [updates.name, emoji, id]);
        } catch (err) {
          try {
            await queryD1('ALTER TABLE product_types ADD COLUMN emoji TEXT;');
            await queryD1('UPDATE product_types SET name = ?, emoji = ? WHERE id = ?', [updates.name, emoji, id]);
          } catch (err2) {
            await queryD1('UPDATE product_types SET name = ? WHERE id = ?', [updates.name, id]);
          }
        }
        if (!isPlaceholder) {
          await supabase.from('product_types').update({ name: updates.name, emoji }).eq('id', id);
        }
      }
      return { id, ...updates, emoji };
    } catch (error) {
      console.warn('Notice in updateProductType:', error);
      return { id, ...updates };
    }
  },
  async deleteProductType(id: string) {
    try {
      await queryD1('DELETE FROM product_types WHERE id = ?', [id]);
    } catch (error) {
      console.warn('Notice in deleteProductType:', error);
    }
  },

  // Profiles / Users
  async getUsers(catalogId?: string) {
    let remoteUsers: any[] = [];
    try {
      let sql = 'SELECT * FROM profiles';
      const params: any[] = [];
      if (catalogId) {
        sql += ' WHERE catalog_id = ? OR catalog_id IS NULL OR catalog_id = ""';
        params.push(catalogId);
      }
      const d1Res = await queryD1(sql, params);
      if (d1Res) remoteUsers = d1Res;
    } catch (error) {
      console.warn('Error fetching users from D1:', error);
    }

    const localUsers = getLocalProfiles(catalogId);
    const combinedMap = new Map();
    remoteUsers.forEach(u => combinedMap.set(u.id, u));
    localUsers.forEach(u => {
      if (combinedMap.has(u.id)) {
        const remote = combinedMap.get(u.id);
        combinedMap.set(u.id, { ...remote, ...u });
      } else {
        combinedMap.set(u.id, u);
      }
    });

    return Array.from(combinedMap.values());
  },
  async updateProfile(id: string, updates: any) {
    let existing: any = null;
    try {
      const d1Res = await queryD1('SELECT * FROM profiles WHERE id = ? LIMIT 1', [id]);
      if (d1Res && d1Res.length > 0) existing = d1Res[0];
    } catch (e) {}

    if (!existing) {
      const localProfiles = getLocalProfiles();
      existing = localProfiles.find((p: any) => p.id === id) || {};
    }

    const payload = { ...existing, id, ...updates };
    if (payload.catalog_id === '') payload.catalog_id = null;

    saveLocalProfile(payload);

    try {
      const colsToEnsure = [
        'catalog_id', 'username', 'full_name', 'role', 'phone', 'password_hash',
        'ci_number', 'nit', 'province', 'municipality', 'address_detail', 'email',
        'company_name', 'avatar_url', 'is_active', 'created_at', 'created_by'
      ];
      for (const col of colsToEnsure) {
        try {
          await queryD1(`ALTER TABLE profiles ADD COLUMN ${col} TEXT;`);
        } catch (e) {}
      }
      await queryD1(
        `INSERT OR REPLACE INTO profiles (
          id, catalog_id, username, full_name, role, phone, password_hash, ci_number, nit, province, municipality, address_detail, email, company_name, avatar_url, is_active, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.catalog_id || null,
          payload.username || null,
          payload.full_name || null,
          payload.role || 'user',
          payload.phone || null,
          payload.password_hash || null,
          payload.ci_number || null,
          payload.nit || null,
          payload.province || null,
          payload.municipality || null,
          payload.address_detail || null,
          payload.email || null,
          payload.company_name || null,
          payload.avatar_url || null,
          payload.is_active ? 1 : 0,
          payload.created_at || new Date().toISOString(),
          payload.created_by || null
        ]
      );

      try {
        const rawActive = localStorage.getItem('app_active_user') || sessionStorage.getItem('app_active_user');
        if (rawActive) {
          const active = JSON.parse(rawActive);
          if (active && active.id === id) {
            const updatedActive = { ...active, ...payload };
            if (localStorage.getItem('app_active_user')) {
              localStorage.setItem('app_active_user', JSON.stringify(updatedActive));
            }
            if (sessionStorage.getItem('app_active_user')) {
              sessionStorage.setItem('app_active_user', JSON.stringify(updatedActive));
            }
            useAuthStore.getState().setUser(updatedActive);
          }
        }
      } catch (e) {
        console.warn('Error updating active user store:', e);
      }

      return payload;
    } catch (error) {
      console.warn('updateProfile error:', error);
      return payload;
    }
  },
  async deleteUser(id: string) {
    deleteLocalProfile(id);
    try {
      await queryD1('DELETE FROM profiles WHERE id = ?', [id]);
    } catch (error) {
      console.warn('Error in deleteUser D1:', error);
    }
  },

  // Orders
  async getOrders(catalogId?: string, userId?: string) {
    let remoteOrders: any[] = [];
    try {
      let sql = 'SELECT * FROM orders';
      const conditions: string[] = [];
      const params: any[] = [];
      if (catalogId) {
        conditions.push('catalog_id = ?');
        params.push(catalogId);
      }
      if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      const d1Res = await queryD1(sql, params);
      if (d1Res) {
        let localList: any[] = [];
        try {
          const raw = localStorage.getItem('app_local_orders');
          if (raw) localList = JSON.parse(raw);
        } catch (e) {}

        const localMap = new Map<string, any>();
        localList.forEach(o => localMap.set(o.id, o));

        remoteOrders = d1Res.map((r: any) => {
          let parsedItems = r.items;
          if (typeof r.items === 'string') {
            try { parsedItems = JSON.parse(r.items); } catch (e) { parsedItems = r.items; }
          }
          let parsedClientInfo = r.client_info;
          if (typeof r.client_info === 'string') {
            try { parsedClientInfo = JSON.parse(r.client_info); } catch (e) { parsedClientInfo = r.client_info; }
          }
          const localMatch = localMap.get(r.id);
          return {
            ...r,
            items: parsedItems,
            client_info: parsedClientInfo || localMatch?.client_info,
            order_number: r.order_number || localMatch?.order_number || null,
            order_index: r.order_index ?? localMatch?.order_index ?? null,
            deal_type: r.deal_type || localMatch?.deal_type || 'Factura de Mercancía'
          };
        });

        const sorted = [...remoteOrders].sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        });

        let maxIndex = 0;
        sorted.forEach(o => {
          let idx = Number(o.order_index) || 0;
          if (!idx && o.order_number) {
            const digits = String(o.order_number).replace(/\D/g, '');
            if (digits.length >= 8) idx = Number(digits.slice(2));
            else if (digits.length > 0) idx = Number(digits);
          }
          if (idx > maxIndex) maxIndex = idx;
        });

        sorted.forEach(o => {
          let idx = Number(o.order_index) || 0;
          if (!idx) {
            maxIndex += 1;
            idx = maxIndex;
            o.order_index = idx;
          } else {
            o.order_index = idx;
          }

          if (!o.order_number) {
            const dateObj = o.created_at ? new Date(o.created_at) : new Date();
            const yearStr = dateObj.getFullYear().toString().slice(-2);
            o.order_number = `${yearStr}${String(idx).padStart(6, '0')}`;
          }
        });

        return remoteOrders.filter((o: any) => o.status !== 'deleted' && o.status !== 'canceled');
      }
    } catch (error) {
      console.warn('Error fetching remote orders from D1:', error);
    }

    const localOrders = getLocalOrders(catalogId).filter(o => !userId || o.user_id === userId);
    return localOrders.filter((o: any) => o.status !== 'deleted' && o.status !== 'canceled');
  },

  subscribeToOrders(callback: () => void) {
    // Polling interval for D1 order updates
    const interval = setInterval(() => {
      callback();
    }, 15000);
    return () => clearInterval(interval);
  },

  async createOrder(order: any) {
    const orderWithId = {
      id: order.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...order
    };

    saveLocalOrder(orderWithId);

    try {
      const itemsJson = typeof orderWithId.items === 'string' ? orderWithId.items : JSON.stringify(orderWithId.items || []);
      const clientInfoJson = typeof orderWithId.client_info === 'string' ? orderWithId.client_info : JSON.stringify(orderWithId.client_info || {});

      await queryD1(
        `INSERT OR REPLACE INTO orders (id, catalog_id, user_id, order_number, order_index, deal_type, payment_method, status, exchange_rate, items, client_info, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderWithId.id, orderWithId.catalog_id || null, orderWithId.user_id || null, orderWithId.order_number || null, orderWithId.order_index || 0,
          orderWithId.deal_type || null, orderWithId.payment_method || null, orderWithId.status || 'pending',
          orderWithId.exchange_rate || 1, itemsJson, clientInfoJson, orderWithId.created_at
        ]
      );
    } catch (err) {
      console.warn('D1 createOrder insert warning:', err);
    }

    return orderWithId;
  },
  async updateOrder(id: string, updates: any) {
    saveLocalOrder({ id, ...updates });
    try {
      const setClauses: string[] = [];
      const params: any[] = [];

      const fieldMap: Record<string, string> = {
        catalog_id: 'catalog_id',
        user_id: 'user_id',
        order_number: 'order_number',
        order_index: 'order_index',
        deal_type: 'deal_type',
        payment_method: 'payment_method',
        status: 'status',
        exchange_rate: 'exchange_rate',
        items: 'items',
        client_info: 'client_info'
      };

      for (const [key, colName] of Object.entries(fieldMap)) {
        if (updates[key] !== undefined) {
          setClauses.push(`${colName} = ?`);
          let val = updates[key];
          if ((key === 'items' || key === 'client_info') && typeof val === 'object') {
            val = JSON.stringify(val);
          }
          params.push(val);
        }
      }

      if (setClauses.length > 0) {
        params.push(id);
        await queryD1(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, params);
      }
    } catch (error) {
      console.warn('Error in updateOrder D1:', error);
    }
    return { id, ...updates };
  },
  async deleteOrder(id: string) {
    deleteLocalOrder(id);
    try {
      await queryD1('DELETE FROM orders WHERE id = ?', [id]);
    } catch (error) {
      console.warn('Error deleting order from D1:', error);
    }
  },

  // Global Settings
  async getClients(catalogId?: string) {
    return this.getUsers(catalogId);
  },

  async getGlobalSettings() {
    try {
      const d1Res = await queryD1('SELECT * FROM global_settings LIMIT 1');
      if (d1Res && d1Res.length > 0) {
        const gs = d1Res[0];
        const parsedSettings = typeof gs.settings === 'string' ? JSON.parse(gs.settings) : (gs.settings || {});
        
        const defaultFooter = {
          about: '',
          schedule: '',
          email: '',
          phone: '',
          whatsapp: '',
          address: '',
          map_url: ''
        };

        const footer = typeof parsedSettings.footer === 'object' && parsedSettings.footer
          ? { ...defaultFooter, ...parsedSettings.footer }
          : (typeof gs.footer === 'object' && gs.footer ? { ...defaultFooter, ...gs.footer } : defaultFooter);

        return {
          id: gs.id || 'global',
          logo: parsedSettings.logo ?? gs.logo ?? null,
          top_bar_color: parsedSettings.top_bar_color || gs.top_bar_color || '#ffffff',
          top_bar_text_color: parsedSettings.top_bar_text_color || gs.top_bar_text_color || '#000000',
          top_bar_font: parsedSettings.top_bar_font || gs.top_bar_font || 'Inter',
          bottom_bar_color: parsedSettings.bottom_bar_color || gs.bottom_bar_color || '#ffffff',
          bottom_bar_text_color: parsedSettings.bottom_bar_text_color || gs.bottom_bar_text_color || '#000000',
          bottom_bar_font: parsedSettings.bottom_bar_font || gs.bottom_bar_font || 'Inter',
          bg_color: parsedSettings.bg_color || gs.bg_color || '#f9fafb',
          font_family: parsedSettings.font_family || gs.font_family || 'Inter',
          ...parsedSettings,
          footer
        };
      }
      return null;
    } catch (error) {
      console.warn('Notice in getGlobalSettings D1:', error);
      return null;
    }
  },
  async updateGlobalSettings(updates: any) {
    try {
      const id = updates.id || 'global';
      let settingsPayload: any = {};

      if (updates.settings && typeof updates.settings === 'object') {
        settingsPayload = { ...updates.settings };
      } else {
        settingsPayload = { ...updates };
        delete settingsPayload.id;
        delete settingsPayload.updated_at;
      }

      const settingsObj = JSON.stringify(settingsPayload);
      const updatedAt = new Date().toISOString();

      await queryD1(
        'INSERT OR REPLACE INTO global_settings (id, settings, updated_at) VALUES (?, ?, ?)',
        [id, settingsObj, updatedAt]
      );

      return { id, ...settingsPayload, updated_at: updatedAt };
    } catch (error) {
      console.warn('Notice in updateGlobalSettings D1:', error);
      return updates;
    }
  }
};
