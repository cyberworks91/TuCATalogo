import bcrypt from 'bcryptjs';

interface Env {
  DB?: {
    prepare: (sql: string) => {
      bind: (...params: any[]) => {
        all: () => Promise<{ results: any[] }>;
      };
    };
  };
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_DATABASE_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  SESSION_SECRET?: string;
}

const b64urlDecode = (input: string): Uint8Array => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const verifyToken = async (authHeader: string | null, secret: string): Promise<{ id: string; role?: string } | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ') || !secret) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig = b64urlDecode(parts[2]);
    const valid = await crypto.subtle.verify('HMAC', key, sig as unknown as BufferSource, data);
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    if (!payload.id) return null;
    return { id: String(payload.id), role: payload.role };
  } catch {
    return null;
  }
};

async function executeD1(env: Env, sql: string, params: any[] = []): Promise<any[]> {
  if (env && env.DB) {
    const res = await env.DB.prepare(sql).bind(...params).all();
    return res.results || [];
  }
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = env.CLOUDFLARE_DATABASE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) {
    throw new Error('Cloudflare D1 binding or credentials not configured');
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  const data: any = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.errors?.[0]?.message || 'D1 query failed');
  }
  return data?.result?.[0]?.results || [];
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${request.method} not allowed. Use POST.` }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const secret = env.SESSION_SECRET || '';
    const caller = await verifyToken(request.headers.get('authorization'), secret);
    const bodyRequesterId = typeof body?.requesterId === 'string' ? body.requesterId.trim() : '';
    const requesterId = caller?.id || bodyRequesterId;

    if (!requesterId) {
      return new Response(JSON.stringify({ error: 'No se pudo identificar al administrador solicitante' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (!userId) {
      return new Response(JSON.stringify({ error: 'ID de usuario requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requesterRows = await executeD1(env, 'SELECT id, role, email, catalog_id FROM profiles WHERE id = ? LIMIT 1', [requesterId]);
    const requester = requesterRows[0];
    const isSuperAdmin = requester && (requester.role === 'superadmin' || requester.email?.toLowerCase() === 'frandyj91@gmail.com');

    const targetRows = await executeD1(env, 'SELECT id, role, catalog_id FROM profiles WHERE id = ? LIMIT 1', [userId]);
    if (!targetRows.length) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const targetUser = targetRows[0];

    const isCatalogAdminForOwnClient =
      requester?.role === 'admin' &&
      requester?.catalog_id &&
      targetUser.catalog_id === requester.catalog_id &&
      (targetUser.role === 'client' || targetUser.role === 'user');

    if (!isSuperAdmin && !isCatalogAdminForOwnClient) {
      return new Response(JSON.stringify({ error: 'Solo los Super Administradores pueden realizar esta acción' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await executeD1(env, 'UPDATE profiles SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    return new Response(JSON.stringify({ success: true, message: 'Contraseña actualizada correctamente' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error interno al actualizar la contraseña' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
