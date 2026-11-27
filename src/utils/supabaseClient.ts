import { createClient } from '@supabase/supabase-js';

// ZUNO's Supabase project uses a public project URL and publishable key.
// These values are intentionally browser-safe; never place a service_role
// or sb_secret key in VITE_ variables or client-side code.
const defaultProjectUrl = 'https://vjdrndrqxlmvzzrqiaej.supabase.co';
const defaultPublishableKey = 'sb_publishable_UzbzfJ98hzoLD90SdbetJw_lxirUwmd';

const projectUrl = (import.meta.env.VITE_SUPABASE_URL || defaultProjectUrl).trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || defaultPublishableKey
).trim();

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
