interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Solo procesamos peticiones HTML (evitamos imágenes, JS, CSS)
  const isHtml = request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('/') || !url.pathname.includes('.');
  
  if (!isHtml) {
    return next();
  }

  // Obtenemos la respuesta original (el index.html de tu app)
  const response = await next();

  // CONFIGURACIÓN POR DEFECTO (Si no se encuentra un catálogo específico)
  let title = "TuCATalogo - Catálogos Digitales";
  let description = "Crea y gestiona tu catálogo de productos de forma profesional.";
  let imageUrl = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1000"; // Imagen genérica bonita

  // LÓGICA DINÁMICA: Si la URL tiene un slug (ej: /mi-tienda)
  const pathParts = url.pathname.split('/').filter(Boolean);
  const slug = pathParts[0];

  // Ignoramos rutas de sistema
  const systemRoutes = ['login', 'register', 'superadmin', 'api', 'admin'];
  
  if (slug && !systemRoutes.includes(slug)) {
    try {
      const supabaseUrl = env.VITE_SUPABASE_URL;
      const anonKey = env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && anonKey) {
        // Consultamos a Supabase para obtener la info del catálogo
        const sbResponse = await fetch(
          `${supabaseUrl}/rest/v1/catalogs?slug=eq.${slug}&select=name,settings`,
          {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            }
          }
        );

        if (sbResponse.ok) {
          const catalogs: any[] = await sbResponse.json();
          if (catalogs.length > 0) {
            const cat = catalogs[0];
            title = `Catálogo - ${cat.name}`;
            description = `Explora los productos de ${cat.name} y haz tu pedido por WhatsApp.`;
            
            // Si el catálogo tiene logo, lo usamos como imagen de previsualización
            if (cat.settings?.logo) {
              // Construimos la URL de la imagen de Supabase Storage
              // Ajusta 'logos' por el nombre de tu bucket de Supabase
              imageUrl = `${supabaseUrl}/storage/v1/object/public/logos/${cat.settings.logo}`;
            }
          }
        }
      }
    } catch (e) {
      console.error("Middleware Error:", e);
    }
  }

  // Inyectamos las etiquetas Meta usando HTMLRewriter de Cloudflare
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        // Eliminamos etiquetas previas si existieran para evitar duplicados
        // y añadimos las nuevas
        el.append(`<meta property="og:title" content="${title}" />`, { html: true });
        el.append(`<meta property="og:description" content="${description}" />`, { html: true });
        el.append(`<meta property="og:image" content="${imageUrl}" />`, { html: true });
        el.append(`<meta property="og:url" content="${url.toString()}" />`, { html: true });
        el.append(`<meta property="og:type" content="website" />`, { html: true });
        el.append(`<meta name="twitter:card" content="summary_large_image" />`, { html: true });
        el.append(`<meta name="twitter:title" content="${title}" />`, { html: true });
        el.append(`<meta name="twitter:description" content="${description}" />`, { html: true });
        el.append(`<meta name="twitter:image" content="${imageUrl}" />`, { html: true });
      }
    })
    .transform(response);
};
