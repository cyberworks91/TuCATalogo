import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://guhujopfymyspqwxuemu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHVqb3BmeW15c3Bxd3h1ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mjc2MjMsImV4cCI6MjA5MDQwMzYyM30.XMyFA62XeGtM9sxvYK1rij8cyIfmStPc2dbx2dBMxZE';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
