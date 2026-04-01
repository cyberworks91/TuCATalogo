-- SQL Schema for Supabase
-- Este script crea las tablas necesarias para la aplicación de catálogo.

-- 1. Tabla de Perfiles (Extensión de Auth.Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('superadmin', 'admin', 'editor', 'user')) DEFAULT 'user',
  catalog_id UUID, -- Se asignará después de crear las tablas de catálogo
  avatar_url TEXT,
  achievements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Tipos de Producto
CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Catálogos
CREATE TABLE IF NOT EXISTS catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  exchange_rate NUMERIC DEFAULT 1.0,
  settings JSONB DEFAULT '{
    "bg_color": "#ffffff",
    "text_color": "#000000",
    "window_color": "#f3f4f6",
    "logo": null,
    "top_bar_color": "#ffffff",
    "top_bar_text_color": "#000000",
    "top_bar_font": "Inter",
    "bottom_bar_color": "#ffffff",
    "bottom_bar_text_color": "#000000",
    "bottom_bar_font": "Inter",
    "footer": {
      "about": "",
      "schedule": "",
      "email": "",
      "phone": "",
      "whatsapp": "",
      "address": "",
      "mapUrl": ""
    }
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID REFERENCES catalogs(id) ON DELETE CASCADE,
  type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  photos TEXT[] DEFAULT '{}', -- URLs de Supabase Storage
  ref_price NUMERIC DEFAULT 0.0,
  cup_price NUMERIC DEFAULT 0.0,
  classification TEXT CHECK (classification IN ('new', 'sale', 'stock', 'out')) DEFAULT 'new',
  sale_price NUMERIC,
  sale_wholesale_price_ref NUMERIC,
  min_wholesale_qty INTEGER DEFAULT 1,
  custom_wholesale_price_mn NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  out_of_stock_at TIMESTAMPTZ
);

-- 5. Tabla de Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID REFERENCES catalogs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'ready', 'completed')) DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para verificar si el usuario es staff (editor, admin, superadmin)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('editor', 'admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para verificar si el usuario es admin/superadmin sin causar recursión
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Crear Políticas de Acceso

-- Limpiar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

DROP POLICY IF EXISTS "Public read access for product_types" ON product_types;
DROP POLICY IF EXISTS "Admin access for product_types" ON product_types;

DROP POLICY IF EXISTS "Public read access for catalogs" ON catalogs;
DROP POLICY IF EXISTS "Admin access for catalogs" ON catalogs;

DROP POLICY IF EXISTS "Public read access for products" ON products;
DROP POLICY IF EXISTS "Admin access for products" ON products;
DROP POLICY IF EXISTS "Staff access for products" ON products;

DROP POLICY IF EXISTS "Users can see their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can see all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Staff can see all orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;

-- Perfiles: Cada uno ve el suyo, Admins ven todos
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Enable insert for authenticated users only" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Lectura pública para el catálogo
CREATE POLICY "Public read access for product_types" ON product_types FOR SELECT USING (true);
CREATE POLICY "Admin access for product_types" ON product_types FOR ALL USING (is_admin());

CREATE POLICY "Public read access for catalogs" ON catalogs FOR SELECT USING (true);
CREATE POLICY "Staff access for catalogs" ON catalogs FOR ALL USING (is_staff());

CREATE POLICY "Public read access for products" ON products FOR SELECT USING (true);
CREATE POLICY "Staff access for products" ON products FOR ALL USING (is_staff());

-- Pedidos: Dueños y Staff
CREATE POLICY "Users can see their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can see all orders" ON orders FOR SELECT USING (is_staff());
CREATE POLICY "Staff can update orders" ON orders FOR UPDATE USING (is_staff());

-- 8. Políticas de Storage (Buckets y Objetos)
-- Asegurar que los buckets existan y sean públicos
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;
END $$;

-- Limpiar políticas antiguas de storage
DELETE FROM storage.policies WHERE bucket_id IN ('products', 'avatars', 'logos');

-- Lectura pública
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('products', 'avatars', 'logos'));

-- Escritura para Staff (Editor, Admin, Superadmin)
CREATE POLICY "Staff Insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('products', 'avatars', 'logos') AND public.is_staff()
);

CREATE POLICY "Staff Update" ON storage.objects FOR UPDATE USING (
  bucket_id IN ('products', 'avatars', 'logos') AND public.is_staff()
);

CREATE POLICY "Staff Delete" ON storage.objects FOR DELETE USING (
  bucket_id IN ('products', 'avatars', 'logos') AND public.is_staff()
);

-- 10. Migraciones (Ejecutar si las tablas ya existen)
/*
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_catalog_id_fkey, ADD CONSTRAINT products_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.catalogs(id) ON DELETE CASCADE;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_id_fkey, ADD CONSTRAINT products_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.product_types(id) ON DELETE SET NULL;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS footer JSONB DEFAULT '{"about": "", "schedule": "", "email": "", "phone": "", "whatsapp": "", "address": "", "map_url": ""}'::JSONB;
*/

-- 9. Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, phone, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si ya existe para evitar errores al re-ejecutar el script
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  footer JSONB DEFAULT '{"about": "", "schedule": "", "email": "", "phone": "", "whatsapp": "", "address": "", "mapUrl": ""}'::JSONB,
  logo TEXT,
  top_bar_color TEXT,
  top_bar_text_color TEXT,
  top_bar_font TEXT,
  bottom_bar_color TEXT,
  bottom_bar_text_color TEXT,
  bottom_bar_font TEXT,
  bg_color TEXT,
  font_family TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Public read access for global_settings" ON global_settings;
DROP POLICY IF EXISTS "Superadmin access for global_settings" ON global_settings;

CREATE POLICY "Public read access for global_settings" ON global_settings FOR SELECT USING (true);
CREATE POLICY "Superadmin access for global_settings" ON global_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);
