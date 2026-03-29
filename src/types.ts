export type Role = 'superadmin' | 'admin' | 'editor' | 'user';

export interface CatalogSettings {
  bgColor: string;
  textColor: string;
  windowColor: string;
  logo: string | null;
}

export interface Catalog {
  id: string;
  name: string;
  slug: string;
  settings: CatalogSettings;
  exchangeRate: number;
}

export interface ProductType {
  id: string;
  name: string;
  emoji: string;
}

export interface Product {
  id: string;
  catalogId: string;
  typeId?: string;
  name: string;
  description: string;
  photos: string[];
  refPrice: number; // Wholesale REF
  cupPrice: number; // Retail CUP
  classification: 'new' | 'sale' | 'stock' | 'out';
  salePrice?: number;
  saleWholesalePriceRef?: number;
  minWholesaleQty: number;
  customWholesalePriceMN?: number;
  createdAt: string;
  outOfStockAt?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  phone?: string;
  role: Role;
  catalogId: string | null;
  avatar?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  catalogId: string;
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'ready' | 'completed';
  createdAt: string;
}
