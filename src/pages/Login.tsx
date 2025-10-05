import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supaBaseClient';
import { useAuth } from '../auth/AuthProvider';
import logoUrl from '@/assets/seso-logo.svg';

export default function Login() {
  const { session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const signInWithGoogle = async () => {
    setError(null);
    setSigningIn(true);
    const redirectTo = `${window.location.origin}`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (signInError) {
      console.error('Google sign-in failed', signInError);
      setError(signInError.message ?? 'Google sign-in failed');
      setSigningIn(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-sm space-y-6 text-center">
        <img src={logoUrl} alt="Seso Labor" className="mx-auto h-16 w-16" />
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Seso Collections Tracker</h1>
          <p className="text-sm text-slate-300">Sign in to continue</p>
        </header>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading || signingIn}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {signingIn ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        {error && <div className="text-sm text-red-500">{error}</div>}
      </section>
    </main>
  );
}
