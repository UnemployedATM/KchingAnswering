import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from './supabase';

const AuthContext = createContext(null);

// Deep-link scheme registered in capacitor.config.ts
const APP_SCHEME = 'com.bidaman.serenityclient';
// Where Supabase sends the user after OAuth
const REDIRECT_URL = Capacitor.isNativePlatform()
  ? `${APP_SCHEME}://auth/callback`
  : `${window.location.origin}/auth/callback`;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [client, setClient]   = useState(undefined);
  const [loading, setLoading] = useState(true);

  async function loadClient(userId) {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, studio_id, status')
      .eq('auth_user_id', userId)
      .maybeSingle(); // returns null (not 406) when no client record exists yet
    setClient(data ?? null);
  }

  useEffect(() => {
    // 1. Restore session on app launch
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          loadClient(u.id).finally(() => setLoading(false));
        } else {
          // If we're on the OAuth callback page, Supabase is mid-exchange — stay loading
          // until onAuthStateChange fires with the result.
          const isCallback = window.location.pathname === '/auth/callback'
            && new URLSearchParams(window.location.search).has('code');
          if (!isCallback) setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    // 2. Keep state in sync; also resolves loading after a code exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadClient(u.id).finally(() => setLoading(false));
      } else {
        setClient(null);
        setLoading(false);
      }
    });

    // 3. On native: listen for the deep-link callback from the system browser.
    //    Supabase redirects to com.bidaman.serenityclient://auth/callback?code=xxx
    //    Capacitor fires appUrlOpen — we extract the code and exchange it.
    let appUrlListener;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (url.startsWith(`${APP_SCHEME}://auth/callback`)) {
          // Close the system browser first so the app comes to foreground
          await Browser.close().catch(() => {});

          const urlObj = new URL(url);
          const code  = urlObj.searchParams.get('code');

          if (code) {
            // PKCE flow: exchange the code for a session
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) console.error('Auth callback error:', error.message);
          } else {
            // Implicit flow fallback: tokens may be in the hash fragment
            const hashParams = new URLSearchParams(urlObj.hash.slice(1));
            const accessToken  = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
          }
        }
      }).then(l => { appUrlListener = l; });
    }

    return () => {
      subscription.unsubscribe();
      appUrlListener?.remove();
    };
  }, []);

  // Opens OAuth in the system browser (native) or redirects (web)
  async function signInWithProvider(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: REDIRECT_URL,
        // PKCE is more secure and works better with mobile deep links
        skipBrowserRedirect: Capacitor.isNativePlatform(),
      },
    });
    if (error) throw error;

    // On native: open Supabase's OAuth URL in the system browser
    if (Capacitor.isNativePlatform() && data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' });
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user,
      client,
      loading,
      isAuthenticated:  !!user,
      hasProfile:       !!client,
      signInWithGoogle: () => signInWithProvider('google'),
      signInWithApple:  () => signInWithProvider('apple'),
      logout,
      reloadClient: () => user && loadClient(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
