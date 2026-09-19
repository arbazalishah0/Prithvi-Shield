import { createClient } from '@supabase/supabase-js';

// Retrieve environment keys or fallback to window configuration
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || '';

// Detect dummy / placeholder values — these must be replaced with real project credentials
const DUMMY_PATTERNS = ['dummy', 'xyzcompany', 'your-project', 'placeholder', 'example'];
const urlIsDummy = !SUPABASE_URL || DUMMY_PATTERNS.some(p => SUPABASE_URL.toLowerCase().includes(p));
const keyIsDummy = !SUPABASE_ANON_KEY || DUMMY_PATTERNS.some(p => SUPABASE_ANON_KEY.toLowerCase().includes(p));

/**
 * True only when real (non-placeholder) Supabase credentials are configured.
 * All callers MUST check this before executing any Supabase query.
 */
export const isSupabaseConfigured = !urlIsDummy && !keyIsDummy;

if (!isSupabaseConfigured) {
  console.warn(
    '[PRITHVI-SHIELD] ℹ️ Supabase running in local/demo mode (credentials are placeholders).\n' +
    'Local state and in-memory caches are active for seamless testing.'
  );
}

// Fallback dummy query builder that returns empty results instead of crashing
const createMockSupabase = () => ({
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: [], error: null }),
    update: () => Promise.resolve({ data: [], error: null }),
    delete: () => Promise.resolve({ data: [], error: null }),
    eq: () => Promise.resolve({ data: [], error: null }),
    order: () => Promise.resolve({ data: [], error: null }),
    limit: () => Promise.resolve({ data: [], error: null })
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase credentials not configured') }),
    signUp: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase credentials not configured') }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
});

// Always create the client — using real credentials when present, otherwise a safe mock
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : createMockSupabase();

