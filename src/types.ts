export type Role = 'superadmin' | 'admin' | 'editor' | 'user';

export interface FooterSettings {
  about?: string;
  schedule?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  map_url?: string;
}

export interface CatalogSettings {
  bg_color: string;
  text_color: string;
  window_color: string;
  logo: string | null;
  footer?: FooterSettings;
}

export interface GlobalSettings {
  footer: FooterSettings;
  logo?: string | null;
  top_bar_color?: string;
  top_bar_text_color?: string;
  bottom_bar_color?: string;
  bottom_bar_text_color?: string;
  bg_color?: string;
  font_family?: string;
}

export interface Catalog {
  id: string;
  name: string;
  slug: string;
  settings: CatalogSettings;
  exchange_rate: number;
}

export interface ProductType {
  id: string;
  name: string;
  emoji: string;
}

export interface Product {
  id: string;
  catalog_id: string;
  type_id?: string;
  code?: string;
  name: string;
  description: string;
  photos: string[];
  ref_price: number; // Wholesale REF
  cup_price: number; // Retail CUP
  classification: 'new' | 'sale' | 'stock' | 'out';
  sale_price?: number;
  sale_wholesale_price_ref?: number;
  min_wholesale_qty: number;
  custom_wholesale_price_mn?: number;
  created_at: string;
  out_of_stock_at?: string;
  is_active?: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  phone?: string;
  role: Role;
  catalog_id: string | null;
  avatar_url?: string;
  achievements?: string[];
}

export interface OrderItem {
  product_id: string;
  product_code?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  catalog_id: string;
  user_id: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'ready' | 'completed';
  created_at: string;
}
