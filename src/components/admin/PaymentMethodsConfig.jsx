import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const PaymentMethodsConfig = () => {
  const [config, setConfig] = useState({
    yape_enabled: true,
    culqi_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Intentar cargar configuración desde localStorage primero
      const savedConfig = localStorage.getItem('payment_methods_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
      }

      // También podríamos cargar desde Supabase si tenemos una tabla para configuraciones
      // Por ahora usaremos localStorage para simplicidad
      
    } catch (error) {
      console.error('Error loading payment config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      setSaving(true);
      
      // Guardar en localStorage
      localStorage.setItem('payment_methods_config', JSON.stringify(newConfig));
      setConfig(newConfig);
      
      setMessage({ 
        type: 'success', 
        text: 'Configuración de métodos de pago actualizada exitosamente' 
      });
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error('Error saving payment config:', error);
      setMessage({ 
        type: 'error', 
        text: `Error guardando configuración: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (method) => {
    const newConfig = {
      ...config,
      [method]: !config[method]
    };
    saveConfig(newConfig);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            💳 Configuración de Métodos de Pago
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Habilita o deshabilita los métodos de pago disponibles para los usuarios
          </p>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <p className={`text-sm ${
              message.type === 'success' 
                ? 'text-green-800 dark:text-green-300' 
                : 'text-red-800 dark:text-red-300'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Configuraciones */}
        <div className="p-6 space-y-6">
          
          {/* Yape/Plin */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">📱</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Yape/Plin
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pagos móviles con transferencia bancaria
                </p>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  • Activación manual (máximo 1 hora)
                  • WhatsApp automático al número: 940144418
                  • Ideal para usuarios peruanos
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => handleToggle('yape_enabled')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  config.yape_enabled 
                    ? 'bg-purple-600' 
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.yape_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`ml-3 text-sm font-medium ${
                config.yape_enabled 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {config.yape_enabled ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
          </div>

          {/* Culqi (Tarjeta) */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">💳</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Tarjeta de Crédito/Débito
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Procesamiento inmediato con Culqi
                </p>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  • Activación inmediata automática
                  • Acepta Visa, MasterCard, American Express
                  • Ideal para usuarios internacionales
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => handleToggle('culqi_enabled')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  config.culqi_enabled 
                    ? 'bg-purple-600' 
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.culqi_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`ml-3 text-sm font-medium ${
                config.culqi_enabled 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {config.culqi_enabled ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-300">
                  Información Importante
                </h4>
                <ul className="mt-2 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Los cambios se aplican inmediatamente en toda la aplicación</li>
                  <li>• Si deshabilitas ambos métodos, los usuarios no podrán realizar pagos</li>
                  <li>• Se recomienda mantener al menos un método habilitado</li>
                  <li>• Los usuarios verán solo los métodos habilitados en el checkout</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Estado actual */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              📊 Estado Actual de Métodos de Pago
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded border-l-4 ${
                config.yape_enabled 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="font-medium text-sm">
                  📱 Yape/Plin: {config.yape_enabled ? 'Activo' : 'Inactivo'}
                </div>
              </div>
              <div className={`p-3 rounded border-l-4 ${
                config.culqi_enabled 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="font-medium text-sm">
                  💳 Tarjeta: {config.culqi_enabled ? 'Activo' : 'Inactivo'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsConfig;