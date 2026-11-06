import { Catalog, Product, ProductType } from '../types';

// In-memory L1 cache for instant sub-millisecond retrieval
const catalogMemoryCache = new Map<string, Catalog>();
const productsMemoryCache = new Map<string, Product[]>();
let productTypesMemoryCache: ProductType[] | null = null;

const CATALOG_CACHE_PREFIX = 'app_catalog_cache_';
const PRODUCTS_CACHE_PREFIX = 'app_products_cache_';
const PRODUCT_TYPES_CACHE_KEY = 'app_product_types_cache';

/**
 * Obtener un catálogo guardado localmente en el navegador (memoria o localStorage)
 */
export function getCachedCatalog(slugOrId: string): Catalog | null {
  if (!slugOrId) return null;
  const key = slugOrId.toLowerCase().trim();

  // 1. Verificar caché en memoria L1
  if (catalogMemoryCache.has(key)) {
    return catalogMemoryCache.get(key)!;
  }

  // 2. Verificar localStorage L2
  try {
    const raw = localStorage.getItem(`${CATALOG_CACHE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        catalogMemoryCache.set(key, parsed);
        if (parsed.id) catalogMemoryCache.set(parsed.id.toLowerCase(), parsed);
        if (parsed.slug) catalogMemoryCache.set(parsed.slug.toLowerCase(), parsed);
        return parsed;
      }
    }

    // 3. Verificar si está en la lista general de catálogos guardados de la página principal
    const rawList = localStorage.getItem('app_cached_catalogs');
    if (rawList) {
      const list = JSON.parse(rawList);
      if (Array.isArray(list)) {
        const found = list.find((c: any) => 
          c.slug?.toLowerCase() === key || 
          c.id?.toLowerCase() === key
        );
        if (found) {
          catalogMemoryCache.set(key, found);
          return found;
        }
      }
    }
  } catch (e) {
    console.warn('Error al leer catálogo desde caché local:', e);
  }

  return null;
}

/**
 * Guardar catálogo en caché local (memoria y localStorage)
 */
export function saveCachedCatalog(slugOrId: string, catalog: Catalog): void {
  if (!catalog || !catalog.id) return;
  const idKey = catalog.id.toLowerCase().trim();
  const slugKey = catalog.slug ? catalog.slug.toLowerCase().trim() : '';

  // Actualizar L1
  catalogMemoryCache.set(idKey, catalog);
  if (slugKey) catalogMemoryCache.set(slugKey, catalog);
  if (slugOrId) catalogMemoryCache.set(slugOrId.toLowerCase().trim(), catalog);

  // Actualizar L2
  try {
    const str = JSON.stringify(catalog);
    localStorage.setItem(`${CATALOG_CACHE_PREFIX}${idKey}`, str);
    if (slugKey) {
      localStorage.setItem(`${CATALOG_CACHE_PREFIX}${slugKey}`, str);
    }
  } catch (e) {
    console.warn('Error al guardar catálogo en caché local:', e);
  }
}

/**
 * Obtener productos guardados en caché local para un catálogo (por ID o slug)
 */
export function getCachedCatalogProducts(catalogIdOrSlug: string): Product[] | null {
  if (!catalogIdOrSlug) return null;
  const key = catalogIdOrSlug.toLowerCase().trim();

  // 1. Verificar L1
  if (productsMemoryCache.has(key)) {
    return productsMemoryCache.get(key)!;
  }

  // 2. Verificar L2
  try {
    const raw = localStorage.getItem(`${PRODUCTS_CACHE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        productsMemoryCache.set(key, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error al leer productos desde caché local:', e);
  }

  return null;
}

/**
 * Guardar productos en caché local (memoria y localStorage)
 */
export function saveCachedCatalogProducts(catalogId: string, slug: string, products: Product[]): void {
  if (!Array.isArray(products)) return;
  const idKey = catalogId ? catalogId.toLowerCase().trim() : '';
  const slugKey = slug ? slug.toLowerCase().trim() : '';

  if (idKey) productsMemoryCache.set(idKey, products);
  if (slugKey) productsMemoryCache.set(slugKey, products);

  try {
    const str = JSON.stringify(products);
    if (idKey) localStorage.setItem(`${PRODUCTS_CACHE_PREFIX}${idKey}`, str);
    if (slugKey) localStorage.setItem(`${PRODUCTS_CACHE_PREFIX}${slugKey}`, str);
  } catch (e) {
    console.warn('Error al guardar productos en caché local (posible cuota excedida):', e);
  }
}

/**
 * Obtener tipos/categorías de productos desde la caché
 */
export function getCachedProductTypes(): ProductType[] | null {
  if (productTypesMemoryCache && productTypesMemoryCache.length > 0) {
    return productTypesMemoryCache;
  }
  try {
    const raw = localStorage.getItem(PRODUCT_TYPES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        productTypesMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Guardar tipos/categorías de productos en la caché
 */
export function saveCachedProductTypes(types: ProductType[]): void {
  if (!Array.isArray(types)) return;
  productTypesMemoryCache = types;
  try {
    localStorage.setItem(PRODUCT_TYPES_CACHE_KEY, JSON.stringify(types));
  } catch {}
}
