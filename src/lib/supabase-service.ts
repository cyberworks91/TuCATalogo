import { supabase } from './supabase';

export const storageService = {
  async uploadFile(bucket: string, file: File, path: string) {
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
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    if (error) throw error;
  }
};

export const authService = {
  async register(email: string, password: string, metadata: any) {
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
  },

  async login(identifier: string, password: string) {
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
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getProfile(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};

export const dbService = {
  // Catalogs
  async getCatalogs() {
    const { data, error } = await supabase.from('catalogs').select('*');
    if (error) throw error;
    return data;
  },
  async getCatalogBySlug(slug: string) {
    const { data, error } = await supabase.from('catalogs').select('*').eq('slug', slug).single();
    if (error) throw error;
    return data;
  },
  async createCatalog(catalog: any) {
    const { data, error } = await supabase.from('catalogs').insert(catalog).select().single();
    if (error) throw error;
    return data;
  },
  async updateCatalog(id: string, updates: any) {
    const { data, error } = await supabase.from('catalogs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // Products
  async getProducts(catalogId: string) {
    const { data, error } = await supabase.from('products').select('*').eq('catalog_id', catalogId);
    if (error) throw error;
    return data;
  },
  async createProduct(product: any) {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    return data;
  },
  async updateProduct(id: string, updates: any) {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // Product Types
  async getProductTypes() {
    const { data, error } = await supabase.from('product_types').select('*');
    if (error) throw error;
    return data;
  },
  async createProductType(type: any) {
    const { data, error } = await supabase.from('product_types').insert(type).select().single();
    if (error) throw error;
    return data;
  },
  async updateProductType(id: string, updates: any) {
    const { data, error } = await supabase.from('product_types').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteProductType(id: string) {
    const { error } = await supabase.from('product_types').delete().eq('id', id);
    if (error) throw error;
  },

  // Profiles / Users
  async getUsers(catalogId?: string) {
    let query = supabase.from('profiles').select('*');
    if (catalogId) query = query.eq('catalog_id', catalogId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async updateProfile(id: string, updates: any) {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteUser(id: string) {
    // Note: This only deletes the profile. Deleting from auth.users requires admin privileges.
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  // Orders
  async getOrders(catalogId?: string, userId?: string) {
    let query = supabase.from('orders').select('*');
    if (catalogId) query = query.eq('catalog_id', catalogId);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  async createOrder(order: any) {
    const { data, error } = await supabase.from('orders').insert(order).select().single();
    if (error) throw error;
    return data;
  },
  async updateOrder(id: string, updates: any) {
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // Global Settings
  async getGlobalSettings() {
    const { data, error } = await supabase.from('global_settings').select('*').single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data;
  },
  async updateGlobalSettings(updates: any) {
    // Check if settings exist
    const { data: existing } = await supabase.from('global_settings').select('id').single();
    if (existing) {
      const { data, error } = await supabase.from('global_settings').update(updates).eq('id', existing.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('global_settings').insert(updates).select().single();
      if (error) throw error;
      return data;
    }
  }
};
