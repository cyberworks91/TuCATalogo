export type Role = 'superadmin' | 'admin' | 'editor' | 'user' | 'client';

export interface FooterSettings {
  about?: string;
  schedule?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  map_url?: string;
}

export interface ProviderSettings {
  name?: string;
  dni_nit?: string;
  city?: string;
  address?: string;
  contact?: string;
  phone?: string;
  invoice_prefix?: string;
}

export interface PlanConfig {
  id: string;
  name: string;
  duration_months: number;
  price_per_month: number;
  total_price: number;
  max_products: number | null;
  allow_carousel: boolean;
  is_free?: boolean;
  badge?: string;
  description?: string;
}

export interface CatalogPlanInfo {
  plan_id: string;
  plan_name: string;
  plan_status: 'active' | 'pending' | 'rejected' | 'expired';
  max_products: number | null;
  allow_carousel: boolean;
  payment_amount?: number;
  payment_receipt_url?: string;
  payment_submitted_at?: string;
  bank_card?: string;
  rejection_reason?: string;
  created_at?: string;
  activated_at?: string;
  expires_at?: string | null;
}

export interface CatalogSettings {
  bg_color: string;
  text_color: string;
  window_color: string;
  logo: string | null;
  presentation_images?: string[];
  sale_type_wholesale?: boolean;
  sale_type_retail?: boolean;
  exchange_rate_margin?: number;
  footer?: FooterSettings;
  provider?: ProviderSettings;
  top_bar_color?: string;
  top_bar_text_color?: string;
  top_bar_font?: string;
  bottom_bar_color?: string;
  bottom_bar_text_color?: string;
  bottom_bar_font?: string;
  plan?: CatalogPlanInfo;
}

export interface GlobalSettings {
  footer: FooterSettings;
  logo?: string | null;
  top_bar_color?: string;
  top_bar_text_color?: string;
  top_bar_font?: string;
  bottom_bar_color?: string;
  bottom_bar_text_color?: string;
  bottom_bar_font?: string;
  bg_color?: string;
  font_family?: string;
  bank_card_number?: string;
  bank_card_owner?: string;
  plans?: PlanConfig[];
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
  invoice_name?: string;
  name: string;
  description: string;
  photos: string[];
  ref_price: number; // Wholesale REF
  price_ref?: number;
  cup_price: number; // Retail CUP
  classification: 'new' | 'sale' | 'stock' | 'out';
  sale_price?: number;
  sale_wholesale_price_ref?: number;
  min_wholesale_qty: number;
  units_per_box?: number;
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
  province?: string;
  municipality?: string;
  address_detail?: string;
  client_type?: 'persona' | 'empresa';
  ci_number?: string;
  company_name?: string;
  nit?: string;
  role: Role;
  catalog_id: string | null;
  avatar_url?: string;
  achievements?: string[];
  created_by?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  pay_currency?: 'REF' | 'MN';
}

export interface OrderItem {
  product_id: string;
  product_code?: string;
  name: string;
  quantity: number;
  price: number;
  pay_currency?: 'REF' | 'MN';
}

export interface Order {
  id: string;
  order_number?: string;
  order_index?: number;
  deal_type?: string;
  catalog_id: string;
  user_id: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'ready' | 'completed';
  exchange_rate?: number;
  payment_method?: string;
  created_at: string;
}
