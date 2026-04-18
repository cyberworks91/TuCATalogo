interface Env {
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${request.method} not allowed. Use POST.` }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  // Parse body
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const { userId, newPassword } = body;

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration missing' }), { status: 500 });
  }

  // Use fetch to Supabase Auth Admin API directly or a lightweight client
  // Since we are in a Worker environment, we'll use fetch for reliability
  
  // 1. Verify User Token
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseServiceKey
    }
  });

  if (!userResponse.ok) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  const userData: any = await userResponse.json();
  const requesterId = userData.id;

  // 2. Check Role (using PostgREST API via fetch)
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${requesterId}&select=role`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseServiceKey
    }
  });

  if (!profileResponse.ok) {
    return new Response(JSON.stringify({ error: 'Error checking profile' }), { status: 500 });
  }

  const profiles: any[] = await profileResponse.json();
  const profile = profiles[0];

  if (!profile || profile.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Only Super Admins can perform this action' }), { status: 403 });
  }

  // 3. Update Password via Admin API
  const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: newPassword })
  });

  if (!updateResponse.ok) {
    const errorData: any = await updateResponse.json();
    return new Response(JSON.stringify({ error: errorData.msg || 'Error updating password' }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: 'Password updated successfully' }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
