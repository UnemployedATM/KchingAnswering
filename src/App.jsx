import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/layout/AppShell';
import Auth from '@/pages/Auth';
import Discover from '@/pages/Discover';
import StudioClasses from '@/pages/StudioClasses';
import MyPasses from '@/pages/MyPasses';
import MyBookings from '@/pages/MyBookings';
import BookClass from '@/pages/BookClass';
import Profile from '@/pages/Profile';
import { supabase } from '@/lib/supabase'; // used for join_studio RPC in ProtectedRoutes

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
});

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
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#3f6840] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/discover" replace />} />
        <Route path="discover"              element={<Discover />} />
        <Route path="studio/:studioId"     element={<StudioClasses />} />
        <Route path="passes"               element={<MyPasses />} />
        <Route path="bookings"             element={<MyBookings />} />
        <Route path="book/:sessionId"      element={<BookClass />} />
        <Route path="profile"              element={<Profile />} />
      </Route>
    </Routes>
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
      <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-[#3f6840] animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth"          element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*"             element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
