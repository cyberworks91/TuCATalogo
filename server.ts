import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

// Initialize Supabase Admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
