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
  }
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
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async createProduct(product: any) {
    try {
      const { data, error } = await supabase.from('products').insert(product).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      handleSupabaseError(error);
    }
  },
  async updateProduct(id: string, updates: any) {
    try {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
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
