export async function onRequestPost(context) {
  const { request, env } = context;

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { sql, params } = body;
  if (!sql) {
    return new Response(JSON.stringify({ error: 'Missing SQL statement' }), { status: 400 });
  }

  // 1. If Cloudflare Pages D1 Binding is connected as `DB`
  if (env && env.DB) {
    try {
      const stmt = env.DB.prepare(sql).bind(...(params || []));
      const queryResult = await stmt.all();
      return new Response(JSON.stringify({
        success: true,
        result: [{
          results: queryResult.results,
          success: true
        }]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 2. Fallback using Cloudflare REST API with API Token
  const accountId = (env && env.CLOUDFLARE_ACCOUNT_ID) || '923e48902005bc33559c2c5583e5eeeb';
  const databaseId = (env && env.CLOUDFLARE_DATABASE_ID) || '2a6af808-f142-4edc-a959-d5e9b8b0fb05';
  const apiToken = (env && env.CLOUDFLARE_API_TOKEN);

  if (apiToken) {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params: params || [] })
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'No D1 binding (DB) or CLOUDFLARE_API_TOKEN configured in Cloudflare Pages' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
