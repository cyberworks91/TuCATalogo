// Cloudflare Pages Function for /api/v1/catalog and /api/v1/catalog/products
export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  try {
    const url = new URL(request.url);

    // 1. Extract API Key
    let apiKey = request.headers.get('x-api-key') || '';
    if (!apiKey && request.headers.get('authorization')) {
      const auth = request.headers.get('authorization') || '';
      if (auth.startsWith('Bearer ')) {
        apiKey = auth.substring(7).trim();
      } else {
        apiKey = auth.trim();
      }
    }
    if (!apiKey && url.searchParams.get('api_key')) {
      apiKey = url.searchParams.get('api_key').trim();
    }
    if (!apiKey && url.searchParams.get('key')) {
      apiKey = url.searchParams.get('key').trim();
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        status: 'error',
        error: 'UNAUTHORIZED',
        message: 'Se requiere una API Key para acceder al catálogo. Envíala en la cabecera "x-api-key: TU_API_KEY", "Authorization: Bearer TU_API_KEY" o como parámetro "?api_key=TU_API_KEY".'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Database querying helper (supports D1 binding or REST API fallback)
    const queryD1Internal = async (sql, params = []) => {
      if (env && env.DB) {
        const stmt = env.DB.prepare(sql).bind(...params);
        const res = await stmt.all();
        return res.results || [];
      }

      const accountId = (env && env.CLOUDFLARE_ACCOUNT_ID) || '923e48902005bc33559c2c5583e5eeeb';
      const databaseId = (env && env.CLOUDFLARE_DATABASE_ID) || '2a6af808-f142-4edc-a959-d5e9b8b0fb05';
      const apiToken = (env && env.CLOUDFLARE_API_TOKEN) || 'cfut_6qQhph4mV63HKpJlrW9b8FcOD25Zvzn7eHT137CUc1b40c05';

      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
      });
      const data = await response.json();
      if (data?.result?.[0]?.results) {
        return data.result[0].results;
      }
      return [];
    };

    // 2. Locate catalog with matching API Key
    const catalogs = await queryD1Internal('SELECT * FROM catalogs');
    let targetCatalog = null;
    let matchedApiKey = null;

    for (const cat of catalogs) {
      const settings = typeof cat.settings === 'string' ? JSON.parse(cat.settings || '{}') : (cat.settings || {});
      if (Array.isArray(settings.api_keys)) {
        const foundKey = settings.api_keys.find((k) => k.key === apiKey);
        if (foundKey) {
          targetCatalog = {
            ...cat,
            settings
          };
          matchedApiKey = foundKey;
          break;
        }
      }
    }

    if (!targetCatalog || !matchedApiKey) {
      return new Response(JSON.stringify({
        status: 'error',
        error: 'INVALID_API_KEY',
        message: 'La API Key proporcionada no es válida o no existe.'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    if (matchedApiKey.is_active === false) {
      return new Response(JSON.stringify({
        status: 'error',
        error: 'API_KEY_DISABLED',
        message: 'La API Key proporcionada está deshabilitada en el panel de administración.'
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // 3. Update last_used_at for the API key asynchronously
    try {
      const updatedKeys = targetCatalog.settings.api_keys.map((k) => {
        if (k.id === matchedApiKey.id || k.key === matchedApiKey.key) {
          return { ...k, last_used_at: new Date().toISOString() };
        }
        return k;
      });
      const updatedSettings = { ...targetCatalog.settings, api_keys: updatedKeys };
      queryD1Internal('UPDATE catalogs SET settings = ? WHERE id = ?', [JSON.stringify(updatedSettings), targetCatalog.id]).catch(() => {});
    } catch (err) {
      console.warn('Could not update API key last_used_at:', err);
    }

    // 4. Fetch products and product categories for this catalog
    const [productsRows, typesRows] = await Promise.all([
      queryD1Internal('SELECT * FROM products WHERE catalog_id = ?', [targetCatalog.id]),
      queryD1Internal('SELECT * FROM product_types')
    ]);

    const categoryMap = new Map();
    typesRows.forEach((t) => {
      categoryMap.set(t.id, { name: t.name, emoji: t.emoji || '📦' });
    });

    const exchangeRate = Number(targetCatalog.exchange_rate) || 1;
    const exchangeMargin = Number(targetCatalog.settings?.exchange_rate_margin) || 0;
    const effectiveRate = exchangeRate + exchangeMargin;

    let products = productsRows.map((p) => {
      let photos = [];
      try {
        photos = typeof p.photos === 'string' ? JSON.parse(p.photos || '[]') : (p.photos || []);
      } catch (e) {
        photos = [];
      }

      const typeInfo = p.type_id ? categoryMap.get(p.type_id) : null;
      const isOut = !!(p.out_of_stock_at || p.out_of_stock_since);
      const isActive = p.is_active === 1 || p.is_active === true || p.is_active === '1';

      const refPrice = Number(p.price_ref ?? p.ref_price ?? p.price ?? 0);
      const cupPrice = Number(p.cup_price ?? p.price ?? 0);
      const classification = p.classification || 'stock';
      const salePriceRef = p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : null;
      const saleWholesalePriceRef = p.sale_wholesale_price_ref !== null && p.sale_wholesale_price_ref !== undefined ? Number(p.sale_wholesale_price_ref) : null;
      const customWholesalePriceMn = p.custom_wholesale_price_mn !== null && p.custom_wholesale_price_mn !== undefined ? Number(p.custom_wholesale_price_mn) : null;

      let calculatedWholesalePriceMn = 0;
      if (customWholesalePriceMn !== null && customWholesalePriceMn !== undefined && Number(customWholesalePriceMn) > 0) {
        calculatedWholesalePriceMn = Number(customWholesalePriceMn);
      } else if (saleWholesalePriceRef !== null && saleWholesalePriceRef !== undefined && Number(saleWholesalePriceRef) > 0) {
        calculatedWholesalePriceMn = Math.round(Number(saleWholesalePriceRef) * effectiveRate);
      } else if (classification === 'sale' && salePriceRef !== null && salePriceRef !== undefined && Number(salePriceRef) > 0) {
        calculatedWholesalePriceMn = Math.round(Number(salePriceRef) * effectiveRate);
      } else if (refPrice > 0) {
        calculatedWholesalePriceMn = Math.round(refPrice * effectiveRate);
      }

      return {
        id: p.id,
        code: p.code || null,
        name: p.name,
        invoice_name: p.invoice_name || p.name,
        description: p.description || null,
        category_id: p.type_id || null,
        category_name: typeInfo?.name || null,
        category_emoji: typeInfo?.emoji || null,
        photos,
        pricing: {
          ref_price: refPrice,
          cup_price: cupPrice,
          classification,
          sale_price_ref: salePriceRef,
          sale_wholesale_price_ref: saleWholesalePriceRef,
          min_wholesale_qty: Number(p.min_wholesale_qty || p.min_quantity || 1),
          custom_wholesale_price_mn: customWholesalePriceMn,
          calculated_wholesale_price_mn: calculatedWholesalePriceMn
        },
        units_per_box: Number(p.units_per_box || 1),
        min_quantity: Number(p.min_quantity || p.min_wholesale_qty || 1),
        in_stock: !isOut,
        is_active: isActive,
        created_at: p.created_at || null
      };
    });

    // Query Filters
    const isActiveFilter = url.searchParams.get('is_active');
    if (isActiveFilter === 'true' || isActiveFilter === null) {
      products = products.filter((p) => p.is_active);
    } else if (isActiveFilter === 'false') {
      products = products.filter((p) => !p.is_active);
    }

    const inStockFilter = url.searchParams.get('in_stock');
    if (inStockFilter === 'true') {
      products = products.filter((p) => p.in_stock);
    } else if (inStockFilter === 'false') {
      products = products.filter((p) => !p.in_stock);
    }

    const categoryIdFilter = url.searchParams.get('category_id') || url.searchParams.get('type_id');
    if (categoryIdFilter) {
      products = products.filter((p) => p.category_id === categoryIdFilter);
    }

    const classFilter = url.searchParams.get('classification');
    if (classFilter) {
      products = products.filter((p) => p.pricing.classification === classFilter.toLowerCase());
    }

    const searchQuery = url.searchParams.get('search');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.invoice_name && p.invoice_name.toLowerCase().includes(q))
      );
    }

    return new Response(JSON.stringify({
      status: 'success',
      catalog: {
        id: targetCatalog.id,
        name: targetCatalog.name,
        slug: targetCatalog.slug,
        exchange_rate: exchangeRate,
        exchange_rate_margin: exchangeMargin,
        effective_exchange_rate: effectiveRate,
        sale_type_wholesale: targetCatalog.settings?.sale_type_wholesale !== false,
        sale_type_retail: targetCatalog.settings?.sale_type_retail !== false,
        logo_url: targetCatalog.settings?.logo || null,
        contact: {
          phone: targetCatalog.settings?.footer?.phone || null,
          whatsapp: targetCatalog.settings?.footer?.whatsapp || null,
          email: targetCatalog.settings?.footer?.email || null,
          address: targetCatalog.settings?.footer?.address || null,
          schedule: targetCatalog.settings?.footer?.schedule || null,
          about: targetCatalog.settings?.footer?.about || null,
          map_url: targetCatalog.settings?.footer?.map_url || null
        },
        provider: {
          name: targetCatalog.settings?.provider?.name || targetCatalog.name,
          dni_nit: targetCatalog.settings?.provider?.dni_nit || null,
          city: targetCatalog.settings?.provider?.city || null,
          address: targetCatalog.settings?.provider?.address || targetCatalog.settings?.footer?.address || null,
          contact: targetCatalog.settings?.provider?.contact || targetCatalog.settings?.footer?.email || null,
          phone: targetCatalog.settings?.provider?.phone || targetCatalog.settings?.footer?.phone || null,
          invoice_prefix: targetCatalog.settings?.provider?.invoice_prefix || null
        }
      },
      categories: typesRows.map((t) => ({
        id: t.id,
        name: t.name,
        emoji: t.emoji || '📦'
      })),
      products,
      meta: {
        total_products: products.length,
        api_key_name: matchedApiKey.name || 'API Key',
        generated_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error in Cloudflare Pages handleCatalogApi:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: 'INTERNAL_ERROR',
      message: error.message || 'Error al consultar catálogo'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
