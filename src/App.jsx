import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/lib/ThemeContext';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NavigationTracker from '@/lib/NavigationTracker';
import VisualEditAgent from '@/lib/VisualEditAgent';
import PageNotFound from '@/lib/PageNotFound';
import { pagesConfig } from './pages.config';

const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

const { Pages, mainPage, Layout } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];

const PUBLIC_PAGES = ['connexion', 'inscription', 'inscriptionparent', 'inscriptionetablissement', 'home', '', 'comptebloque'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#2d2d2d',flexDirection:'column',gap:'16px'}}>
        <div style={{width:'40px',height:'40px',border:'4px solid #555',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
        <p style={{color:'#ccc',fontSize:'14px',margin:0}}>Chargement...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{padding: '40px', background: '#1a1a2e', color: '#eee', minHeight: '100vh'}}>
        <h2 style={{color: '#ff6b6b'}}>Erreur: {authError.type}</h2>
        <p>{authError.message}</p>
      </div>
    );
  }

  // Redirect to login if not authenticated and not on a public page
  const currentPath = location.pathname.replace(/^\//, '').toLowerCase();
  if (!user && !PUBLIC_PAGES.includes(currentPath)) {
    return <Navigate to="/connexion" replace />;
  }

  // Redirect blocked users to the blocked page
  if (user && user.blocked && currentPath !== 'comptebloque') {
    return <Navigate to="/comptebloque" replace />;
  }

  const LayoutWrapper = Layout || (({ children }) => <>{children}</>);

  return (
    <LayoutWrapper>
      <Routes>
        {Object.entries(Pages).map(([name, Component]) => (
          <Route
            key={name}
            path={`/${name.toLowerCase().replace(/ /g, '-')}`}
            element={<Component />}
          />
        ))}
        {/* Main page also accessible at / */}
        {Pages[mainPageKey] && (() => {
          const MainPage = Pages[mainPageKey];
          return <Route path="/" element={<MainPage />} />;
        })()}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};

function App() {
  return (
    <ThemeProvider>
    <ErrorBoundary>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
          <VisualEditAgent />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;