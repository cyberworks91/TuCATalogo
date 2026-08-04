-- Schema SQL para Cloudflare D1 (TuCatalogo)

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  catalog_id TEXT,
  username TEXT,
  full_name TEXT,
  role TEXT,
  phone TEXT,
  password_hash TEXT,
  ci_number TEXT,
  nit TEXT,
  province TEXT,
  municipality TEXT,
  address_detail TEXT,
  email TEXT,
  company_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalogs (
  id TEXT PRIMARY KEY,
  name TEXT,
  slug TEXT UNIQUE,
  settings TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  catalog_id TEXT,
  code TEXT,
  name TEXT,
  invoice_name TEXT,
  description TEXT,
  price REAL DEFAULT 0,
  price_ref REAL DEFAULT 0,
  classification TEXT,
  is_active INTEGER DEFAULT 1,
  units_per_box INTEGER DEFAULT 1,
  min_quantity INTEGER DEFAULT 1,
  out_of_stock_since TEXT,
  photos TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_types (
  id TEXT PRIMARY KEY,
  name TEXT,
  emoji TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  catalog_id TEXT,
  user_id TEXT,
  order_number TEXT,
  order_index INTEGER,
  deal_type TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  exchange_rate REAL DEFAULT 1,
  items TEXT,
  client_info TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS global_settings (
  id TEXT PRIMARY KEY,
  settings TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
