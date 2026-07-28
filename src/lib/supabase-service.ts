import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

const handleSupabaseError = (error: any) => {
  if (error.message === 'Failed to fetch') {
    throw new Error('No se pudo conectar con Supabase. Por favor, verifica tu conexión a internet y asegúrate de que las credenciales de Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY) estén configuradas correctamente en tu archivo .env.');
  }
  throw error;
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
        userId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
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
  if ((unitsPerBox === undefined || unitsPerBox === null) && p.description) {
    const match = p.description.match(/\[box:(\d+)\]/i);
    if (match) {
      unitsPerBox = parseInt(match[1]);
    }
  }
  return {
    ...p,
    units_per_box: unitsPerBox ? Number(unitsPerBox) : undefined
  };
};

export const dbService = {
  // Catalogs
  async getCatalogs() {
    try {
      const { data, error } = await supabase.from('catalogs').select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async getCatalogBySlug(slug: string) {
    try {
      const { data, error } = await supabase.from('catalogs').select('*').eq('slug', slug).single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
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
      const { data, error } = await supabase.from('products').select('*').eq('catalog_id', catalogId);
      if (error) throw error;
      return (data || []).map(normalizeProduct);
    } catch (error) {
      handleSupabaseError(error);
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
      Object.keys(cleanProduct).forEach(key => {
        if (cleanProduct[key] === undefined) {
          delete cleanProduct[key];
        }
      });
      const { data, error } = await supabase.from('products').insert(cleanProduct).select().single();
      if (error) {
        if (error.message?.includes('units_per_box') || error.code === 'PGRST204' || error.message?.includes('column')) {
          console.warn('Supabase product create error, retrying without optional columns:', error);
          const { units_per_box, ...fallback } = cleanProduct;
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
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === undefined) {
          delete cleanUpdates[key];
        }
      });
      const { data, error } = await supabase.from('products').update(cleanUpdates).eq('id', id).select().single();
      if (error) {
        if (error.message?.includes('units_per_box') || error.code === 'PGRST204' || error.message?.includes('column')) {
          console.warn('Supabase product update error, retrying without optional columns:', error);
          const { units_per_box, ...fallback } = cleanUpdates;
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
      const { data, error } = await supabase.from('product_types').select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
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
    try {
      let query = supabase.from('profiles').select('*');
      if (catalogId) query = query.eq('catalog_id', catalogId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async updateProfile(id: string, updates: any) {
    try {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async deleteUser(id: string) {
    try {
      // Note: This only deletes the profile. Deleting from auth.users requires admin privileges.
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Orders
  async getOrders(catalogId?: string, userId?: string) {
    try {
      let query = supabase.from('orders').select('*');
      if (catalogId) query = query.eq('catalog_id', catalogId);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async createOrder(order: any) {
    try {
      const { data, error } = await supabase.from('orders').insert(order).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async updateOrder(id: string, updates: any) {
    try {
      const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async deleteOrder(id: string) {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error);
    }
  },

  // Global Settings
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
