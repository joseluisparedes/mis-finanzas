import React from 'react';
import { LogIn, LogOut, User } from 'lucide-react';

const AuthButton = ({ 
  isAuthenticated, 
  user, 
  onSignIn, 
  onSignOut, 
  loading,
  className = '' 
}) => {
  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-600">Cargando...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Avatar y nombre de usuario */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">
              {user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuario'}
            </p>
            <p className="text-xs text-gray-500">
              {user.email}
            </p>
          </div>
        </div>

        {/* Botón de cerrar sesión */}
        <button
          onClick={onSignOut}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSignIn}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${className}`}
    >
      <LogIn className="h-4 w-4" />
      <span>Iniciar Sesión</span>
    </button>
  );
};

export default AuthButton;