import { createClient } from '@supabase/supabase-js';
import { supabase, isPlaceholder } from './supabase';

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
      return list.filter((p: any) => p.catalog_id === catalogId);
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
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};

export const authService = {
  async register(email: string, password: string, metadata: any) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      if (error) throw error;
      
      // Manually create profile if it doesn't exist (in case trigger is missing)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            username: metadata.username,
            full_name: metadata.full_name,
            phone: metadata.phone,
            role: metadata.role || 'user',
            catalog_id: metadata.catalog_id
          });
        if (profileError) console.warn('Profile creation error:', profileError);
      }
      
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  async createClientUser(email?: string, password = '123456', metadata: any = {}) {
    try {
      const targetEmail = email && email.trim() !== '' 
        ? email.trim() 
        : `cliente_${Date.now()}_${Math.floor(Math.random()*10000)}@catalogo.local`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

      let userId = '';
      const { data, error } = await tempSupabase.auth.signUp({
        email: targetEmail,
        password,
        options: {
          data: metadata
        }
      });

      if (data?.user) {
        userId = data.user.id;
      } else if (error) {
        console.warn('Auth signUp warning, generating fallback client ID:', error);
        userId = crypto.randomUUID();
      }

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
        catalog_id: metadata.catalog_id
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload)
        .select()
        .single();

      if (profileError) console.warn('Profile creation error:', profileError);
      return profile || profilePayload;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  async login(identifier: string, password: string) {
    try {
      let email = identifier;
      
      // If identifier doesn't look like an email, try to find it as a username
      if (!identifier.includes('@')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .single();
        
        if (profile && !profileError) {
          email = profile.email;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  async getProfile(id: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('Notice fetching profile row:', error);
      }
      return data || null;
    } catch (error) {
      console.warn('Notice in getProfile:', error);
      return null;
    }
  },
  
  async updateUser(updates: { email?: string; password?: string; data?: any }) {
    try {
      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
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
      if (d1Res && d1Res.length > 0) {
        return d1Res.map((c: any) => ({
          ...c,
          exchange_rate: Number(c.exchange_rate) || 1,
          settings: typeof c.settings === 'string' ? JSON.parse(c.settings) : (c.settings || {})
        }));
      }

      if (isPlaceholder) return [];
      const { data, error } = await supabase.from('catalogs').select('*');
      if (error) {
        console.warn('Notice in getCatalogs:', error.message || error);
        return [];
      }
      return (data || []).map((c: any) => ({ ...c, exchange_rate: Number(c.exchange_rate) || 1 }));
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

      if (isPlaceholder) return null;
      const { data, error } = await supabase.from('catalogs').select('*').eq('slug', slug).maybeSingle();
      if (error) {
        console.warn('Notice in getCatalogBySlug:', error.message || error);
        return null;
      }
      return data ? { ...data, exchange_rate: Number(data.exchange_rate) || 1 } : null;
    } catch (error) {
      console.warn('Notice in getCatalogBySlug:', error);
      return null;
    }
  },
  async createCatalog(catalog: any) {
    try {
      const { data, error } = await supabase.from('catalogs').insert(catalog).select().single();
      if (data) {
        const settingsStr = typeof data.settings === 'object' ? JSON.stringify(data.settings) : (data.settings || '{}');
        await queryD1(
          'INSERT OR REPLACE INTO catalogs (id, name, slug, exchange_rate, settings, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [data.id, data.name, data.slug, Number(data.exchange_rate) || 1, settingsStr, data.created_at || new Date().toISOString()]
        );
      }
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
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

      let sbData = null;
      try {
        const { data, error } = await supabase.from('catalogs').update(updates).eq('id', id).select().single();
        if (!error && data) sbData = data;
      } catch (err) {
        console.warn('Notice in updateCatalog Supabase error:', err);
      }

      const d1Res = await queryD1('SELECT * FROM catalogs WHERE id = ? LIMIT 1', [id]);
      if (d1Res && d1Res.length > 0) {
        const cat = d1Res[0];
        return {
          ...sbData,
          ...cat,
          exchange_rate: Number(cat.exchange_rate ?? sbData?.exchange_rate ?? 1),
          settings: typeof cat.settings === 'string' ? JSON.parse(cat.settings) : (cat.settings || {})
        };
      }

      if (sbData) return { ...sbData, exchange_rate: Number(sbData.exchange_rate) || 1 };
      throw new Error('No catalog found');
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Products
  async getProducts(catalogId: string) {
    try {
      if (!catalogId) return [];
      const d1Res = await queryD1('SELECT * FROM products WHERE catalog_id = ?', [catalogId]);
      if (d1Res && d1Res.length > 0) {
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

      if (isPlaceholder) return [];
      const { data, error } = await supabase.from('products').select('*').eq('catalog_id', catalogId);
      if (error) {
        console.warn('Notice in getProducts:', error.message || error);
        return [];
      }
      return (data || []).map(normalizeProduct);
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
      if (d1Res && d1Res.length > 0) {
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

      const { data, error } = await supabase
        .from('products')
        .select('*, catalogs(name, slug)')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(20);
      if (error) throw error;
      return (data || []).map(p => ({
        ...normalizeProduct(p),
        catalogs: p.catalogs
      }));
    } catch (error) {
      handleSupabaseError(error);
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
      Object.keys(cleanProduct).forEach(key => {
        if (cleanProduct[key] === undefined) {
          delete cleanProduct[key];
        }
      });

      let resProd: any = null;
      const { data, error } = await supabase.from('products').insert(cleanProduct).select().single();
      if (error) {
        console.warn('Supabase product create notice, attempting sanitized fallback:', error);
        // Standard columns present in initial schema
        const baseKeys = ['id', 'catalog_id', 'type_id', 'code', 'name', 'description', 'price', 'price_ref', 'ref_price', 'cup_price', 'classification', 'sale_price', 'is_active', 'min_quantity', 'min_wholesale_qty', 'photos', 'created_at'];
        const fallbackPayload: any = {};
        for (const k of baseKeys) {
          if (cleanProduct[k] !== undefined) {
            fallbackPayload[k] = cleanProduct[k];
          }
        }
        const { data: retryData, error: retryError } = await supabase.from('products').insert(fallbackPayload).select().single();
        if (!retryError && retryData) {
          resProd = normalizeProduct({ ...cleanProduct, ...retryData });
        } else {
          console.warn('Supabase product create retry notice, relying on D1/Local resilience:', retryError || error);
          resProd = normalizeProduct(cleanProduct);
        }
      } else {
        resProd = normalizeProduct(data);
      }

      if (resProd) {
        await syncProductToD1(resProd).catch(err => console.warn('D1 sync notice:', err));
      }
      return resProd;
    } catch (error) {
      console.warn('Unhandled exception in createProduct, returning product object:', error);
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
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === undefined) {
          delete cleanUpdates[key];
        }
      });

      let resProd: any = null;
      const { data, error } = await supabase.from('products').update(cleanUpdates).eq('id', id).select().single();
      if (error) {
        console.warn('Supabase product update notice, attempting sanitized fallback:', error);
        const baseKeys = ['catalog_id', 'type_id', 'code', 'name', 'description', 'price', 'price_ref', 'ref_price', 'cup_price', 'classification', 'sale_price', 'is_active', 'min_quantity', 'min_wholesale_qty', 'photos'];
        const fallbackPayload: any = {};
        for (const k of baseKeys) {
          if (cleanUpdates[k] !== undefined) {
            fallbackPayload[k] = cleanUpdates[k];
          }
        }
        const { data: retryData, error: retryError } = await supabase.from('products').update(fallbackPayload).eq('id', id).select().single();
        if (!retryError && retryData) {
          resProd = normalizeProduct({ ...cleanUpdates, ...retryData, id });
        } else {
          console.warn('Supabase product update retry notice, relying on D1/Local resilience:', retryError || error);
          const existing = await queryD1('SELECT * FROM products WHERE id = ? LIMIT 1', [id]).catch(() => null);
          resProd = normalizeProduct({ ...(existing && existing[0] ? existing[0] : {}), ...cleanUpdates, id });
        }
      } else {
        resProd = normalizeProduct(data);
      }

      if (resProd) {
        await syncProductToD1(resProd).catch(err => console.warn('D1 sync notice:', err));
      }
      return resProd;
    } catch (error) {
      console.warn('Unhandled exception in updateProduct, returning product object:', error);
      return normalizeProduct({ ...updates, id });
    }
  },
  async deleteProduct(id: string) {
    try {
      await queryD1('DELETE FROM products WHERE id = ?', [id]);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.warn('Supabase product delete notice:', error);
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Product Types
  async getProductTypes() {
    try {
      if (isPlaceholder) return [];
      const { data, error } = await supabase.from('product_types').select('*');
      if (error) {
        console.warn('Notice in getProductTypes:', error.message || error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('Notice in getProductTypes:', error);
      return [];
    }
  },
  async createProductType(type: any) {
    try {
      const { data, error } = await supabase.from('product_types').insert(type).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async updateProductType(id: string, updates: any) {
    try {
      const { data, error } = await supabase.from('product_types').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async deleteProductType(id: string) {
    try {
      const { error } = await supabase.from('product_types').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Profiles / Users
  async getUsers(catalogId?: string) {
    let remoteUsers: any[] = [];
    try {
      if (!isPlaceholder) {
        let query = supabase.from('profiles').select('*');
        if (catalogId) query = query.eq('catalog_id', catalogId);
        const { data, error } = await query;
        if (!error && data) remoteUsers = data;
      }
    } catch (error) {
      console.warn('Error fetching users from Supabase:', error);
    }

    const localUsers = getLocalProfiles(catalogId);
    const combinedMap = new Map();
    remoteUsers.forEach(u => combinedMap.set(u.id, u));
    localUsers.forEach(u => {
      if (!combinedMap.has(u.id)) {
        combinedMap.set(u.id, u);
      }
    });

    return Array.from(combinedMap.values());
  },
  async updateProfile(id: string, updates: any) {
    const payload = { id, ...updates };
    saveLocalProfile(payload);
    try {
      if (isPlaceholder) return payload;

      // Primary: upsert profile
      const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
      if (!error && data) return data;

      // Fallback 1: update
      const { data: updateData, error: updateError } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (!updateError && updateData) return updateData;

      // Fallback 2: insert
      const { data: insertData, error: insertError } = await supabase.from('profiles').insert(payload).select().single();
      if (!insertError && insertData) return insertData;

      return payload;
    } catch (error) {
      console.warn('updateProfile error, returning local profile:', error);
      return payload;
    }
  },
  async deleteUser(id: string) {
    try {
      if (isPlaceholder) return;
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) console.warn('Supabase deleteUser error:', error);
    } catch (error) {
      console.warn('Error in deleteUser:', error);
    }
  },

  // Orders
  async getOrders(catalogId?: string, userId?: string) {
    let remoteOrders: any[] = [];
    if (!isPlaceholder) {
      try {
        let query = supabase.from('orders').select('*');
        if (catalogId) query = query.eq('catalog_id', catalogId);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
        if (!error && data) {
          // Retrieve local cache for merging
          let localList: any[] = [];
          try {
            const raw = localStorage.getItem('app_local_orders');
            if (raw) localList = JSON.parse(raw);
          } catch (e) {}

          const localMap = new Map<string, any>();
          localList.forEach(o => localMap.set(o.id, o));

          remoteOrders = data.map((r: any) => {
            let parsedItems = r.items;
            if (typeof r.items === 'string') {
              try {
                parsedItems = JSON.parse(r.items);
              } catch (e) {
                parsedItems = r.items;
              }
            }
            const localMatch = localMap.get(r.id);
            return {
              ...r,
              items: parsedItems,
              order_number: r.order_number || localMatch?.order_number || null,
              order_index: r.order_index ?? localMatch?.order_index ?? null,
              deal_type: r.deal_type || localMatch?.deal_type || 'Factura de Mercancía'
            };
          });

          // Ensure all remote orders have sequential order_index and order_number if missing
          const sorted = [...remoteOrders].sort((a, b) => {
            const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tA - tB;
          });

          let maxIndex = 0;
          sorted.forEach(o => {
            let idx = 0;
            if (typeof o.order_index === 'number' && o.order_index > 0) {
              idx = o.order_index;
            } else if (o.order_index && !isNaN(Number(o.order_index)) && Number(o.order_index) > 0) {
              idx = Number(o.order_index);
            } else if (o.order_number) {
              const digits = String(o.order_number).replace(/\D/g, '');
              if (digits.length >= 8) {
                idx = Number(digits.slice(2));
              } else if (digits.length > 0) {
                idx = Number(digits);
              }
            }
            if (!isNaN(idx) && idx > maxIndex) {
              maxIndex = idx;
            }
          });

          sorted.forEach(o => {
            let idx = 0;
            if (typeof o.order_index === 'number' && o.order_index > 0) {
              idx = o.order_index;
            } else if (o.order_index && !isNaN(Number(o.order_index)) && Number(o.order_index) > 0) {
              idx = Number(o.order_index);
            } else if (o.order_number) {
              const digits = String(o.order_number).replace(/\D/g, '');
              if (digits.length >= 8) {
                idx = Number(digits.slice(2));
              } else if (digits.length > 0) {
                idx = Number(digits);
              }
            }

            if (!idx || isNaN(idx) || idx <= 0) {
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

          // Sync local storage
          try {
            let list: any[] = localList;
            const remoteIds = new Set(remoteOrders.map(r => r.id));

            list = list.filter((o: any) => {
              if (catalogId && o.catalog_id && o.catalog_id !== catalogId) return true;
              return remoteIds.has(o.id);
            });

            remoteOrders.forEach(r => {
              const idx = list.findIndex((o: any) => o.id === r.id);
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...r };
              } else {
                list.push(r);
              }
            });

            localStorage.setItem('app_local_orders', JSON.stringify(list));
          } catch (e) {
            console.warn('Failed to sync remote orders to local storage:', e);
          }

          return remoteOrders.filter((o: any) => o.status !== 'deleted' && o.status !== 'canceled');
        } else if (error) {
          console.warn('Supabase getOrders query error:', error);
        }
      } catch (error) {
        console.warn('Error fetching remote orders:', error);
      }
    }

    const localOrders = getLocalOrders(catalogId).filter(o => !userId || o.user_id === userId);
    return localOrders.filter((o: any) => o.status !== 'deleted' && o.status !== 'canceled');
  },

  subscribeToOrders(callback: () => void) {
    if (isPlaceholder) return () => {};
    try {
      const channel = supabase
        .channel('public:orders:' + Math.random().toString(36).substring(2, 9))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          callback();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Supabase realtime error:', e);
      return () => {};
    }
  },

  async createOrder(order: any) {
    const orderWithId = {
      id: order.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...order
    };

    saveLocalOrder(orderWithId);

    if (isPlaceholder) {
      return orderWithId;
    }

    const itemVariants = [
      orderWithId.items,
      typeof orderWithId.items === 'object' ? JSON.stringify(orderWithId.items) : orderWithId.items
    ];

    for (const itemsValue of itemVariants) {
      const payload = { ...orderWithId, items: itemsValue };
      try {
        const { data, error } = await supabase.from('orders').insert(payload).select().single();
        if (!error && data) {
          const res = { ...data, items: orderWithId.items };
          saveLocalOrder(res);
          return res;
        }

        const { error: err2 } = await supabase.from('orders').insert(payload);
        if (!err2) {
          return orderWithId;
        }

        const { order_number, order_index, deal_type, ...fallback1 } = payload;
        const { data: data3, error: err3 } = await supabase.from('orders').insert(fallback1).select().single();
        if (!err3 && data3) {
          const res = { ...data3, order_number, order_index, deal_type, items: orderWithId.items };
          saveLocalOrder(res);
          return res;
        }

        const { user_id, ...fallback2 } = fallback1;
        const { data: data4, error: err4 } = await supabase.from('orders').insert(fallback2).select().single();
        if (!err4 && data4) {
          const res = { ...data4, user_id: orderWithId.user_id, order_number, order_index, deal_type, items: orderWithId.items };
          saveLocalOrder(res);
          return res;
        }

        const { error: err5 } = await supabase.from('orders').insert(fallback2);
        if (!err5) {
          return orderWithId;
        }
      } catch (err) {
        console.warn('Error during createOrder attempt:', err);
      }
    }

    console.warn('All Supabase order insert variants failed, order saved locally.');
    return orderWithId;
  },
  async updateOrder(id: string, updates: any) {
    saveLocalOrder({ id, ...updates });
    try {
      if (isPlaceholder) return { id, ...updates };

      const itemVariants = updates.items !== undefined
        ? [updates.items, typeof updates.items === 'object' ? JSON.stringify(updates.items) : updates.items]
        : [undefined];

      for (const itemsValue of itemVariants) {
        const payload = { ...updates };
        if (itemsValue !== undefined) {
          payload.items = itemsValue;
        }

        const { data, error } = await supabase.from('orders').update(payload).eq('id', id).select().single();
        if (!error && data) {
          const res = { ...data, ...updates };
          saveLocalOrder(res);
          return res;
        }

        const { error: err2 } = await supabase.from('orders').update(payload).eq('id', id);
        if (!err2) {
          saveLocalOrder({ id, ...updates });
          return { id, ...updates };
        }

        const { order_number, order_index, deal_type, ...fallback1 } = payload;
        if (Object.keys(fallback1).length > 0) {
          const { data: data3, error: err3 } = await supabase.from('orders').update(fallback1).eq('id', id).select().single();
          if (!err3 && data3) {
            const res = { ...data3, ...updates };
            saveLocalOrder(res);
            return res;
          }

          const { error: err4 } = await supabase.from('orders').update(fallback1).eq('id', id);
          if (!err4) {
            saveLocalOrder({ id, ...updates });
            return { id, ...updates };
          }
        }
      }

      console.warn('All Supabase updateOrder attempts failed. Saved order locally.');
      return { id, ...updates };
    } catch (error) {
      console.warn('Error in updateOrder (saved locally):', error);
      return { id, ...updates };
    }
  },
  async deleteOrder(id: string) {
    deleteLocalOrder(id);
    try {
      if (isPlaceholder) return;
      const { data: hardData, error: hardError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .select();

      if (!hardError && hardData && hardData.length > 0) return;

      await supabase.from('orders').update({ status: 'deleted' }).eq('id', id);
    } catch (error) {
      console.warn('Error deleting remote order (deleted locally):', error);
    }
  },

  // Global Settings
  async getClients(catalogId?: string) {
    return this.getUsers(catalogId);
  },

  async getGlobalSettings() {
    try {
      const { data, error } = await supabase.from('global_settings').select('*').single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async updateGlobalSettings(updates: any) {
    try {
      // Check if settings exist
      const { data: existing } = await supabase.from('global_settings').select('id').single();
      const { id, created_at, ...cleanUpdates } = updates;
      
      if (existing) {
        const { data, error } = await supabase.from('global_settings').update(cleanUpdates).eq('id', existing.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('global_settings').insert(cleanUpdates).select().single();
        if (error) throw error;
        return data;
      }
    } catch (error) {
      handleSupabaseError(error);
    }
  }
};
