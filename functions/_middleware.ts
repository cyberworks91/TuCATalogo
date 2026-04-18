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
        // Añadimos un timeout para que si Supabase tarda, no bloqueemos la vista previa
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        try {
          const sbResponse = await fetch(
            `${supabaseUrl}/rest/v1/catalogs?slug=eq.${encodeURIComponent(slug)}&select=name,settings`,
            {
              headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
              },
              signal: controller.signal
            }
          );
          clearTimeout(timeout);

          if (sbResponse.ok) {
            const catalogs: any[] = await sbResponse.json();
            if (catalogs.length > 0) {
              const cat = catalogs[0];
              title = `${cat.name} - Catálogo`;
              description = `Mira los productos de ${cat.name} y haz tu pedido directamente por WhatsApp.`;
              
              if (cat.settings?.logo) {
                // Forzamos que la URL sea absoluta y compatible
                imageUrl = `${supabaseUrl}/storage/v1/object/public/logos/${cat.settings.logo}`;
              }
            }
          }
        } catch (fetchError) {
          console.log("Fetch to Supabase timed out or failed, using defaults");
        }
      }
    } catch (e) {
      console.error("Middleware Logic Error:", e);
    }
  }

  // Inyectamos las etiquetas Meta al principio del HEAD para que WhatsApp las encuentre rápido
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        const metaTags = [
          `<meta property="og:title" content="${title}" />`,
          `<meta property="og:description" content="${description}" />`,
          `<meta property="og:image" content="${imageUrl}" />`,
          `<meta property="og:url" content="${url.toString()}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${title}" />`,
          `<meta name="twitter:description" content="${description}" />`,
          `<meta name="twitter:image" content="${imageUrl}" />`
        ].join('\n');
        
        el.prepend(metaTags, { html: true });
      }
    })
    .transform(response);
};
