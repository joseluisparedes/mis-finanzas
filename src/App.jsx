import React, { useState, useEffect } from 'react';
import { useSupabaseData } from './hooks/useSupabaseData';
import { SubscriptionProvider } from './hooks/useUserSubscription';
import AppSupabase from './AppSupabase.jsx';
import LandingPage from './components/landing/LandingPage.jsx';

const App = () => {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'app', 'login'
  const { isAuthenticated, loading } = useSupabaseData();

  // Check URL for routing
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    if (path === '/app' || hash === '#app') {
      setCurrentView('app');
    } else if (path === '/login' || hash === '#login') {
      setCurrentView('login');
    } else {
      setCurrentView('landing');
    }
  }, []);

  // Handle navigation
  const handleNavigateToApp = () => {
    // Si no está autenticado, ir directo al login/registro
    if (!isAuthenticated) {
      setCurrentView('login');
      window.history.pushState({}, '', '#login');
    } else {
      setCurrentView('app');
      window.history.pushState({}, '', '#app');
    }
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
    window.history.pushState({}, '', '#login');
  };

  const handleNavigateToLanding = () => {
    setCurrentView('landing');
    window.history.pushState({}, '', '/mis-finanzas/');
  };

  const handleOpenLoginModal = () => {
    // Abrir modal SIN cambiar URL - solución definitiva
    return 'open-modal-directly';
  };

  // Auto-redirect authenticated users to app
  useEffect(() => {
    if (isAuthenticated && currentView === 'landing') {
      handleNavigateToApp();
    }
  }, [isAuthenticated, currentView]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render based on current view
  if (currentView === 'app' || (isAuthenticated && currentView !== 'landing')) {
    return (
      <SubscriptionProvider>
        <AppSupabase onNavigateToLanding={handleNavigateToLanding} />
      </SubscriptionProvider>
    );
  }

  if (currentView === 'landing' || currentView === 'login') {
    return (
      <LandingPage 
        onNavigateToApp={handleNavigateToApp}
        onNavigateToLogin={handleNavigateToLogin}
        onOpenLoginModal={handleOpenLoginModal}
        onCloseModal={handleNavigateToLanding}
        autoOpenLogin={currentView === 'login'}
      />
    );
  }

  // Default to landing page
  return (
    <LandingPage 
      onNavigateToApp={handleNavigateToApp}
      onNavigateToLogin={handleNavigateToLogin}
      onOpenLoginModal={handleOpenLoginModal}
      onCloseModal={handleNavigateToLanding}
      autoOpenLogin={false}
    />
  );
};

export default App;