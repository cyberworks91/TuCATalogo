import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
