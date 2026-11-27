import { createClient } from '@supabase/supabase-js';

const projectUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

// Only the publishable browser key belongs here. Never use a service_role or secret key.
export const supabase = isSupabaseConfigured
  ? createClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
