import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/layout/AppShell';
import Auth from '@/pages/Auth';
import { Toaster, toast } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase'; // used for join_studio RPC in ProtectedRoutes

/* ─── Code-split route pages ──────────────────────────────────────────── */
const Discover       = lazy(() => import('@/pages/Discover'));
const StudioClasses  = lazy(() => import('@/pages/StudioClasses'));
const MyPasses       = lazy(() => import('@/pages/MyPasses'));
const MyBookings     = lazy(() => import('@/pages/MyBookings'));
const Checkout       = lazy(() => import('@/pages/Checkout'));
const BookingSuccess = lazy(() => import('@/pages/BookingSuccess'));
const Profile        = lazy(() => import('@/pages/Profile'));

/* ─── Global error surface for any Supabase / RLS / network failure ──── */
function describeQueryError(err) {
  const msg = err?.message ?? String(err);
  // Supabase RLS errors typically include "row-level security" or come back with code 42501
  if (/row-level security|permission denied|JWT/i.test(msg)) {
    return 'You don\'t have access to this data. Try signing out and back in.';
  }
  if (/Failed to fetch|NetworkError|ERR_NETWORK|ERR_INTERNET/i.test(msg)) {
    return 'Network error. Check your connection.';
  }
  if (/PGRST/i.test(msg)) {
    return 'The server couldn\'t process this request.';
  }
  return msg;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only surface a toast if the query has been observed at least once
      // (don't spam during background refetches that succeed silently)
      if (query.state.data !== undefined) return;
      const msg = describeQueryError(error);
      // De-dup: skip if same message is already showing
      toast.error(msg);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(describeQueryError(error));
    },
  }),
});

/* ─── Lazy-page suspense fallback ─────────────────────────────────────── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--ink)] animate-spin" />
    </div>
  );
}

// Persist ?studio= param to localStorage so it survives the OAuth redirect
const pendingStudio = new URLSearchParams(window.location.search).get('studio');
if (pendingStudio) localStorage.setItem('pending_studio_id', pendingStudio);

function ProtectedRoutes() {
  const { isAuthenticated, loading, user, client, reloadClient } = useAuth();

  // Once logged in, check for a pending studio invite and join it.
  // Works for any client regardless of how many studios they're already in.
  useEffect(() => {
    const studioId = localStorage.getItem('pending_studio_id');
    if (studioId && user && client !== undefined) {
      localStorage.removeItem('pending_studio_id');
      supabase.rpc('join_studio', { p_studio_id: studioId }).then(() => reloadClient());
    }
  }, [user, client]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#ffa504] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/discover" replace />} />
          <Route path="discover"              element={<Discover />} />
          <Route path="studio/:studioId"     element={<StudioClasses />} />
          <Route path="passes"               element={<MyPasses />} />
          <Route path="bookings"             element={<MyBookings />} />
          <Route path="checkout"             element={<Checkout />} />
          <Route path="booking/success"      element={<BookingSuccess />} />
          <Route path="profile"              element={<Profile />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function AuthPage() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/discover" replace />;
  return <Auth />;
}

// Web-only: Supabase auto-exchanges ?code= on load. AuthContext stays in
// loading=true until the exchange resolves, then we navigate accordingly.
function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      navigate(isAuthenticated ? '/discover' : '/auth', { replace: true });
    }
  }, [loading, isAuthenticated]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#ffa504] animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth"          element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/*"             element={<ProtectedRoutes />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
