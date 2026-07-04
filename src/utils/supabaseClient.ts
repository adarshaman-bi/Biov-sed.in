import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = !rawUrl || rawUrl.includes('placeholder') || !rawKey || rawKey.includes('placeholder');

export let supabase: any;

if (isPlaceholder) {
  console.warn('[Supabase] No valid production credentials found. Initializing ultra-fast client-side simulation proxy to prevent startup hanging.');

  const makeChainedMock = (tableName?: string) => {
    const builder: any = {
      select: (fields?: string) => builder,
      eq: (column: string, value: any) => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      upsert: (values: any) => Promise.resolve({ data: values, error: null }),
      update: (values: any) => builder,
      delete: () => builder,
      insert: (values: any) => Promise.resolve({ data: values, error: null }),
      
      // Implement thenable interface so awaiting any chain resolves properly
      then: (onfulfilled?: (value: any) => any) => {
        const result = { data: [], error: null };
        if (onfulfilled) {
          return Promise.resolve(result).then(onfulfilled);
        }
        return Promise.resolve(result);
      }
    };
    return builder;
  };

  const authCallbacks = new Set<(event: string, session: any) => void>();

  supabase = {
    from: (tableName: string) => makeChainedMock(tableName),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authCallbacks.add(callback);
        // Fire once with initial empty state
        setTimeout(() => callback('SIGNED_OUT', null), 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authCallbacks.delete(callback);
              }
            }
          }
        };
      },
      signInWithOAuth: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: null }),
      signOut: () => {
        authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
        return Promise.resolve({ error: null });
      }
    }
  };
} else {
  supabase = createClient(rawUrl, rawKey);
}

