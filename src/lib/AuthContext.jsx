import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '@/api/authService';
import appSettingsService from '@/api/appSettingsService';
import { appParams } from '@/lib/app-params';
import { backendConfig } from '@/api/backendConfig';

const AuthContext = createContext();

// Local user accounts for each role
const LOCAL_USERS = {
  admin_systeme: {
    id: 'local-user-001',
    email: 'admin@harchive.local',
    prenom: 'Admin',
    nom: 'Système',
    full_name: 'Admin Système',
    role: 'admin_systeme',
    role_archive: 'admin_systeme',
    etablissement_id: 'etab-001',
    etablissement_nom: 'Établissement Local',
    photo_url: null,
  },
  admin_etablissement: {
    id: 'local-user-002',
    email: 'admin.etab@harchive.local',
    prenom: 'Directeur',
    nom: 'Établissement',
    full_name: 'Directeur Établissement',
    role: 'admin_etablissement',
    role_archive: 'admin_etablissement',
    etablissement_id: 'etab-001',
    etablissement_nom: 'Établissement Local',
    photo_url: null,
  },
  professeur: {
    id: 'local-user-003',
    email: 'prof@harchive.local',
    prenom: 'Jean',
    nom: 'Professeur',
    full_name: 'Jean Professeur',
    role: 'professeur',
    role_archive: 'professeur',
    etablissement_id: 'etab-001',
    etablissement_nom: 'Établissement Local',
    classe_ids: ['classe-001', 'classe-002'],
    matieres: ['Mathématiques', 'Physique'],
    photo_url: null,
  },
  etudiant: {
    id: 'local-user-004',
    email: 'etudiant@harchive.local',
    prenom: 'Marie',
    nom: 'Étudiante',
    full_name: 'Marie Étudiante',
    role: 'etudiant',
    role_archive: 'etudiant',
    etablissement_id: 'etab-001',
    etablissement_nom: 'Établissement Local',
    classe_id: 'classe-001',
    promotion_id: 'promo-001',
    photo_url: null,
  },
  parent: {
    id: 'local-user-005',
    email: 'parent@harchive.local',
    prenom: 'Pierre',
    nom: 'Parent',
    full_name: 'Pierre Parent',
    role: 'parent',
    role_archive: 'parent',
    etablissement_id: 'etab-001',
    etablissement_nom: 'Établissement Local',
    enfants: [
      { id: 'local-user-004', prenom: 'Marie', nom: 'Étudiante', classe_id: 'classe-001' }
    ],
    photo_url: null,
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, try to get app public settings (with 5s timeout to avoid hanging)
      let publicSettings = null;
      try {
        const settingsPromise = appSettingsService.getPublicSettings();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
        publicSettings = await Promise.race([settingsPromise, timeoutPromise]);
      } catch (appError) {
        console.warn('Could not fetch public settings, using defaults:', appError.message);
      }
      setAppPublicSettings(publicSettings || { id: backendConfig.appId, public_settings: {} });

      // Check user authentication
      if (backendConfig.useLocalBackend) {
        // Try to authenticate via HttpOnly cookie (sent automatically)
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
        } catch {
          // Cookie expired or invalid — check local role (dev mode only)
          if (!import.meta.env.PROD) {
            const savedRole = localStorage.getItem('harchive_local_role');
            if (savedRole && LOCAL_USERS[savedRole]) {
              setUser(LOCAL_USERS[savedRole]);
              setIsAuthenticated(true);
            } else {
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
          setIsLoadingAuth(false);
        }
      } else if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      // Even on error, don't block the app — let it render
      setAppPublicSettings({ id: backendConfig.appId, public_settings: {} });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('harchive_local_role');
    
    if (shouldRedirect) {
      authService.logout('/');
    } else {
      authService.logout();
    }
  };

  /**
   * Login with email and password
   */
  const loginWithEmail = async (email, password) => {
    try {
      const { user: userData } = await authService.loginWithEmail(email, password);
      // Refresh full user data from /api/auth/me to get all fields (amis, photo_url, etc.)
      try {
        const fullUser = await authService.getCurrentUser();
        setUser(fullUser);
        setIsAuthenticated(true);
        return fullUser;
      } catch {
        // Fallback to login response if getCurrentUser fails
        setUser(userData);
        setIsAuthenticated(true);
        return userData;
      }
    } catch (error) {
      throw { message: error.message || error.data?.message || 'Email ou mot de passe incorrect' };
    }
  };

  const navigateToLogin = () => {
    authService.redirectToLogin(window.location.href);
  };

  const refreshUser = async () => {
    try {
      const fullUser = await authService.getCurrentUser();
      setUser(fullUser);
    } catch (e) {
      // ignore
    }
  };

  const switchUser = (role) => {
    // Only allow in development mode
    if (import.meta.env.PROD) return;
    const newUser = LOCAL_USERS[role];
    if (newUser) {
      localStorage.setItem('harchive_local_role', role);
      setUser(newUser);
      setIsAuthenticated(true);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      loginWithEmail,
      navigateToLogin,
      checkAppState,
      switchUser,
      refreshUser,
      localUsers: LOCAL_USERS,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
