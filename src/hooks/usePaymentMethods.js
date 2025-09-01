import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gestionar la configuración de métodos de pago
 * Permite consultar qué métodos están habilitados/deshabilitados
 */
export const usePaymentMethods = () => {
  const [config, setConfig] = useState({
    yape_enabled: true,
    culqi_enabled: true
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para cargar configuración
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar desde localStorage
      const savedConfig = localStorage.getItem('payment_methods_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({
          yape_enabled: parsedConfig.yape_enabled ?? true,
          culqi_enabled: parsedConfig.culqi_enabled ?? true
        });
      }
      
    } catch (err) {
      console.error('Error loading payment methods config:', err);
      setError(err.message);
      // Si hay error, usar configuración por defecto
      setConfig({
        yape_enabled: true,
        culqi_enabled: true
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Escuchar cambios en localStorage (para sincronizar entre pestañas)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'payment_methods_config' && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          setConfig({
            yape_enabled: newConfig.yape_enabled ?? true,
            culqi_enabled: newConfig.culqi_enabled ?? true
          });
        } catch (error) {
          console.error('Error parsing payment config from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Función para actualizar configuración
  const updateConfig = useCallback(async (newConfig) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      localStorage.setItem('payment_methods_config', JSON.stringify(updatedConfig));
      setConfig(updatedConfig);
      return { success: true };
    } catch (err) {
      console.error('Error updating payment config:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [config]);

  // Funciones de utilidad
  const isYapeEnabled = useCallback(() => config.yape_enabled, [config.yape_enabled]);
  const isCulqiEnabled = useCallback(() => config.culqi_enabled, [config.culqi_enabled]);
  const hasAnyMethodEnabled = useCallback(() => 
    config.yape_enabled || config.culqi_enabled, [config.yape_enabled, config.culqi_enabled]);
  const getEnabledMethods = useCallback(() => {
    const methods = [];
    if (config.yape_enabled) methods.push('yape');
    if (config.culqi_enabled) methods.push('culqi');
    return methods;
  }, [config.yape_enabled, config.culqi_enabled]);

  return {
    // Estado
    config,
    loading,
    error,
    
    // Funciones
    loadConfig,
    updateConfig,
    
    // Utilidades
    isYapeEnabled,
    isCulqiEnabled,
    hasAnyMethodEnabled,
    getEnabledMethods
  };
};

export default usePaymentMethods;