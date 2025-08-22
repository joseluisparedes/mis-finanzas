import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus, Sparkles, Shield } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onSignIn, onSignUp, onGoogleSignIn, loading }) => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo específico
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar email con límites de seguridad
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || formData.email.length > 254) {
      newErrors.email = 'Formato de email inválido o muy largo';
    }

    // Validar contraseña con mejores requisitos
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6 || formData.password.length > 128) {
      newErrors.password = 'La contraseña debe tener entre 6 y 128 caracteres';
    }

    // Validaciones específicas para registro
    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }

      if (!formData.displayName.trim()) {
        newErrors.displayName = 'El nombre es requerido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setAuthError('');

    try {
      if (mode === 'signin') {
        const result = await onSignIn(formData.email, formData.password);
        if (result.success) {
          onClose();
          resetForm();
        } else {
          setAuthError(result.error || 'Error al iniciar sesión');
        }
      } else {
        const result = await onSignUp(formData.email, formData.password, {
          displayName: formData.displayName
        });
        if (result.success) {
          if (result.needsConfirmation) {
            alert('Se ha enviado un email de confirmación. Revisa tu bandeja de entrada.');
          }
          onClose();
          resetForm();
        } else {
          setAuthError(result.error || 'Error al crear cuenta');
        }
      }
    } catch (error) {
      console.error('Error in auth:', error);
      setAuthError('Error inesperado. Por favor intenta de nuevo.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('AuthModal: handleGoogleSignIn called');
      setGoogleLoading(true);
      setAuthError('');
      
      console.log('AuthModal: calling onGoogleSignIn...');
      const result = await onGoogleSignIn();
      console.log('AuthModal: onGoogleSignIn result:', result);
      
      if (!result.success) {
        setAuthError(result.error || 'Error al iniciar sesión con Google');
      }
      // No cerramos el modal aquí porque la redirección manejará el flujo
    } catch (error) {
      console.error('AuthModal: Error with Google sign in:', error);
      setAuthError('Error inesperado con Google. Intenta de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
    setErrors({});
    setAuthError('');
    setShowPassword(false);
    setGoogleLoading(false);
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md transform transition-all duration-300 animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-indigo-500/20"></div>
          <div className="relative flex flex-col items-center p-8 pb-6">
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
              {mode === 'signin' ? (
                <Shield className="h-8 w-8 text-white" />
              ) : (
                <Sparkles className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              {mode === 'signin' ? 'Te damos la bienvenida' : 'Únete a MisFinanzas'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
              {mode === 'signin' 
                ? 'Accede a tu cuenta para gestionar tus finanzas de forma inteligente' 
                : 'Crea tu cuenta y comienza a tomar el control de tus finanzas'
              }
            </p>
          </div>
          
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          {/* Nombre (solo en registro) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ¿Cómo te llamas?
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50 dark:bg-gray-800 dark:text-white ${
                    errors.displayName 
                      ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  placeholder="Tu nombre completo"
                />
              </div>
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50 dark:bg-gray-800 dark:text-white ${
                  errors.email 
                    ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contraseña segura
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50 dark:bg-gray-800 dark:text-white ${
                  errors.password 
                    ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                placeholder="Mínimo 6 caracteres"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirmar contraseña (solo en registro) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirma tu contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-gray-50 dark:bg-gray-800 dark:text-white ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  placeholder="Escribe tu contraseña nuevamente"
                  autoComplete="new-password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Error de autenticación */}
          {authError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-800 dark:text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {authError}
              </p>
            </div>
          )}

          {/* Botón de Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 group shadow-sm hover:shadow-md"
          >
            {googleLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span>Conectando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="group-hover:text-gray-800 dark:group-hover:text-white transition-colors">Continuar con Google</span>
              </>
            )}
          </button>

          {/* Separador */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">o continúa con</span>
            </div>
          </div>

          {/* Botón de submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              <span>
                {mode === 'signin' ? '🚀 Acceder a mi cuenta' : '✨ Crear mi cuenta'}
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {mode === 'signin' ? (
              <span>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold transition-colors hover:underline"
                >
                  Únete gratis
                </button>
              </span>
            ) : (
              <span>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors hover:underline"
                >
                  Accede aquí
                </button>
              </span>
            )}
          </div>

          {mode === 'signin' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors hover:underline inline-flex items-center"
                onClick={() => alert('Función de recuperación de contraseña próximamente')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ¿Problemas para acceder?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;