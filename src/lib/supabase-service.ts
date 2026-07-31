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
  async uploadFile(bucket: string, file: File, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error) {
      handleSupabaseError(error);
    }
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
  return {
    ...p,
    description: cleanDesc,
    units_per_box: unitsPerBox ? Number(unitsPerBox) : undefined,
    invoice_name: invoiceName || p.invoice_name || undefined
  };
};

export const dbService = {
  // Catalogs
  async getCatalogs() {
    try {
      if (isPlaceholder) return [];
      const { data, error } = await supabase.from('catalogs').select('*');
      if (error) {
        console.warn('Notice in getCatalogs:', error.message || error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('Notice in getCatalogs:', error);
      return [];
    }
  },
  async getCatalogBySlug(slug: string) {
    try {
      if (!slug || isPlaceholder) return null;
      const { data, error } = await supabase.from('catalogs').select('*').eq('slug', slug).maybeSingle();
      if (error) {
        console.warn('Notice in getCatalogBySlug:', error.message || error);
        return null;
      }
      return data || null;
    } catch (error) {
      console.warn('Notice in getCatalogBySlug:', error);
      return null;
    }
  },
  async createCatalog(catalog: any) {
    try {
      const { data, error } = await supabase.from('catalogs').insert(catalog).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async updateCatalog(id: string, updates: any) {
    try {
      const { data, error } = await supabase.from('catalogs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Products
  async getProducts(catalogId: string) {
    try {
      if (!catalogId || isPlaceholder) return [];
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
      const { data, error } = await supabase.from('products').insert(cleanProduct).select().single();
      if (error) {
        if (error.message?.includes('units_per_box') || error.message?.includes('invoice_name') || error.code === 'PGRST204' || error.message?.includes('column')) {
          console.warn('Supabase product create error, retrying without optional columns:', error);
          const { units_per_box, invoice_name, ...fallback } = cleanProduct;
          const { data: retryData, error: retryError } = await supabase.from('products').insert(fallback).select().single();
          if (retryError) throw retryError;
          return normalizeProduct(retryData);
        }
        throw error;
      }
      return normalizeProduct(data);
    } catch (error) {
      handleSupabaseError(error);
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
      const { data, error } = await supabase.from('products').update(cleanUpdates).eq('id', id).select().single();
      if (error) {
        if (error.message?.includes('units_per_box') || error.message?.includes('invoice_name') || error.code === 'PGRST204' || error.message?.includes('column')) {
          console.warn('Supabase product update error, retrying without optional columns:', error);
          const { units_per_box, invoice_name, ...fallback } = cleanUpdates;
          const { data: retryData, error: retryError } = await supabase.from('products').update(fallback).eq('id', id).select().single();
          if (retryError) throw retryError;
          return normalizeProduct(retryData);
        }
        throw error;
      }
      return normalizeProduct(data);
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async deleteProduct(id: string) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
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
    try {
      if (!isPlaceholder) {
        let query = supabase.from('orders').select('*');
        if (catalogId) query = query.eq('catalog_id', catalogId);
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
        if (!error && data) {
          remoteOrders = data.map((r: any) => {
            let parsedItems = r.items;
            if (typeof r.items === 'string') {
              try {
                parsedItems = JSON.parse(r.items);
              } catch (e) {
                parsedItems = r.items;
              }
            }
            return {
              ...r,
              items: parsedItems
            };
          });
        } else if (error) {
          console.warn('Supabase getOrders query error:', error);
        }
      }
    } catch (error) {
      console.warn('Error fetching remote orders:', error);
    }

    const localOrders = getLocalOrders(catalogId).filter(o => !userId || o.user_id === userId);

    const localMap = new Map<string, any>();
    localOrders.forEach(o => localMap.set(o.id, o));

    const combinedMap = new Map<string, any>();
    remoteOrders.forEach(r => {
      const l = localMap.get(r.id);
      combinedMap.set(r.id, {
        ...l,
        ...r,
        items: (Array.isArray(r.items) && r.items.length > 0) ? r.items : (l?.items || r.items),
        order_number: r.order_number || l?.order_number,
        order_index: r.order_index ?? l?.order_index,
        deal_type: r.deal_type || l?.deal_type
      });
    });
    localOrders.forEach(l => {
      if (!combinedMap.has(l.id)) {
        combinedMap.set(l.id, l);
      }
    });

    const allOrders = Array.from(combinedMap.values());
    return allOrders.filter((o: any) => o.status !== 'deleted' && o.status !== 'canceled');
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
      const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
      if (error) {
        console.warn('Supabase updateOrder primary update error, attempting schema column fallback:', error);
        const { order_number, order_index, deal_type, ...fallbackUpdates } = updates;
        if (Object.keys(fallbackUpdates).length > 0) {
          const { data: data2, error: error2 } = await supabase.from('orders').update(fallbackUpdates).eq('id', id).select().single();
          if (!error2 && data2) return { ...data2, ...updates };
        }
        return { id, ...updates };
      }
      return data;
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
