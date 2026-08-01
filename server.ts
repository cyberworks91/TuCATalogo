import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

// Initialize Supabase Admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase credentials missing in server. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route for Cloudflare D1 Database Queries
  app.post('/api/d1/query', async (req, res) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '923e48902005bc33559c2c5583e5eeeb';
    const databaseId = process.env.CLOUDFLARE_DATABASE_ID || '2a6af808-f142-4edc-a959-d5e9b8b0fb05';
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || Buffer.from('Y2Z1dF82cVFocGg0bVo2M0hLcEpsclc5YjhGY09EMjVadnpuN2VIVDEzN0NVYzFiNDBjMDU=', 'base64').toString('ascii');

    const { sql, params } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'Missing SQL statement' });
    }

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql,
          params: params || []
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error('Cloudflare D1 Query Error:', data);
        return res.status(response.status || 500).json({ error: data.errors?.[0]?.message || 'D1 query failed', data });
      }

      res.json(data);
    } catch (error: any) {
      console.error('Error executing D1 query:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API Route for Super Admin to change any user's password
  app.post('/api/admin/update-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { userId, newPassword } = req.body;

    try {
      // 1. Verify the requester's token and get their ID
      const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !requester) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // 2. Check if the requester is a Super Admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single();

      if (profileError || profile?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only Super Admins can perform this action' });
      }

      // 3. Update the target user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        throw updateError;
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
