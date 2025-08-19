import React from 'react';
import { LogIn, LogOut, User } from 'lucide-react';

const AuthButton = ({ 
  isAuthenticated, 
  user, 
  onSignIn, 
  onSignOut, 
  loading,
  className = '',
  darkMode = false,
  isMobile = false
}) => {
  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Cargando...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const userName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuario';
    
    return (
      <div className={`flex items-center ${isMobile ? 'justify-between w-full' : 'space-x-3'} ${className}`}>
        {/* Avatar y nombre de usuario */}
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-blue-800 text-blue-300' : 'bg-blue-100 text-blue-600'
          }`}>
            <User className="h-4 w-4" />
          </div>
          <div className={isMobile ? 'block' : 'hidden sm:block'}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-700'}`}>
              {userName}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Botón de cerrar sesión - movido a la derecha y color rojo */}
        <button
          onClick={onSignOut}
          className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
            isMobile ? 'ml-auto' : ''
          } ${
            darkMode 
              ? 'text-red-300 hover:text-red-200 hover:bg-red-900' 
              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
          }`}
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Cerrar Sesión</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSignIn}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        darkMode 
          ? 'bg-blue-700 hover:bg-blue-600 text-white' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      } ${className}`}
    >
      <LogIn className="h-4 w-4" />
      <span>Iniciar Sesión</span>
    </button>
  );
};

export default AuthButton;