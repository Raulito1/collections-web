import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supaBaseClient';

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

type AuthContextValue = { session: Session | null; loading: boolean };

const initialAuthCtx: AuthContextValue = { session: null, loading: true };
const AuthCtx = createContext<AuthContextValue>(initialAuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      setLoading(true);

      const currentUrl = new URL(window.location.href);
      const hasOAuthParams =
        currentUrl.searchParams.has('code') ||
        currentUrl.searchParams.has('error') ||
        currentUrl.searchParams.has('error_description');

      if (hasOAuthParams) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(currentUrl.toString());
        if (!isMounted) return;

        if (error) {
          console.error('Supabase OAuth session exchange failed', error);
        }

        setSession(data.session ?? null);

        const cleanUrl = `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}`;
        window.history.replaceState({}, document.title, cleanUrl);
      } else {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(data.session ?? null);
      }

      if (isMounted) setLoading(false);
    };

    void initializeSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      setSession(supabaseSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const contextValue = useMemo<AuthContextValue>(() => ({ session, loading }), [session, loading]);

  return <AuthCtx.Provider value={contextValue}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
