import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import RequestHelp from './pages/RequestHelp';
import Chat from './pages/Chat';
import Providers from './pages/Providers';
import SmartDashboard from './pages/SmartDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import Loader from './components/Loader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,        // 30 seconds
      refetchOnWindowFocus: true,
    },
  },
});

function AppContent() {
  const { darkMode } = useDarkMode();
  const { loading } = useAuth();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#2196f3' },
      secondary: { main: '#ff9800' },
      error: { main: '#f44336' },
    },
    typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
    shape: { borderRadius: 8 },
  });

  if (loading) return <Loader fullScreen />;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {[
            { path: '/', element: <Home /> },
            { path: '/dashboard', element: <Dashboard /> },
            { path: '/request', element: <RequestHelp /> },
            { path: '/chat/:requestId', element: <Chat /> },
            { path: '/providers', element: <Providers /> },
            { path: '/smart', element: <SmartDashboard /> },
            { path: '/provider-dashboard', element: <ProviderDashboard /> },
            { path: '/provider', element: <ProviderDashboard /> },
          ].map(({ path, element }) => (
            <Route key={path} path={path} element={
              <ProtectedRoute>
                <Navbar />
                {element}
              </ProtectedRoute>
            } />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  );
}