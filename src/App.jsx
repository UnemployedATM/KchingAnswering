import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/layout/AppShell';
import Auth from '@/pages/Auth';
import Discover from '@/pages/Discover';
import MyPasses from '@/pages/MyPasses';
import MyBookings from '@/pages/MyBookings';
import BookClass from '@/pages/BookClass';
import Profile from '@/pages/Profile';
import { supabase } from '@/lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
});

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/discover" replace />} />
        <Route path="discover"        element={<Discover />} />
        <Route path="passes"          element={<MyPasses />} />
        <Route path="bookings"        element={<MyBookings />} />
        <Route path="book/:sessionId" element={<BookClass />} />
        <Route path="profile"         element={<Profile />} />
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

// Web-only: Supabase redirects here after OAuth with ?code= in the URL.
// On native the deep link is handled in AuthContext via the appUrlOpen listener.
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        navigate('/discover', { replace: true });
      });
    } else {
      navigate('/auth', { replace: true });
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
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
