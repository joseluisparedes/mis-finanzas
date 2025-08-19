import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, onSignIn, onSignUp, loading }) => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {mode === 'signin' ? (
              <LogIn className="h-6 w-6 text-blue-600" />
            ) : (
              <UserPlus className="h-6 w-6 text-green-600" />
            )}
            <h2 className="text-xl font-semibold text-gray-800">
              {mode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre (solo en registro) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.displayName 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.email 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.password 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Mínimo 6 caracteres"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Repite tu contraseña"
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{authError}</p>
            </div>
          )}

          {/* Botón de submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'signin'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              <span>
                {mode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="text-center text-sm text-gray-600">
            {mode === 'signin' ? (
              <span>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Regístrate aquí
                </button>
              </span>
            ) : (
              <span>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Inicia sesión
                </button>
              </span>
            )}
          </div>

          {mode === 'signin' && (
            <div className="mt-3 text-center">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => alert('Función de recuperación de contraseña próximamente')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;