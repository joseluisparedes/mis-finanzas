import { useState } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [currentErrorId, setCurrentErrorId] = useState(null);

  const showError = (errorMessage) => {
    // Si es un objeto Error, extraer el mensaje
    const message = errorMessage?.message || errorMessage || 'Ha ocurrido un error inesperado';
    
    // Mejorar mensajes específicos
    const improvedMessage = improveErrorMessage(message);
    
    // Generar un ID único para evitar errores duplicados
    const errorId = Date.now() + Math.random();
    
    // Solo mostrar si es un error diferente al actual
    if (improvedMessage !== error) {
      setError(improvedMessage);
      setCurrentErrorId(errorId);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const improveErrorMessage = (message) => {
    // Mapear errores comunes a mensajes más amigables
    const errorMappings = {
      'has alcanzado el límite de categorías': 'Has alcanzado el límite de categorías personalizadas para tu plan Free (3 máximo). Upgrade a Premium para categorías ilimitadas.',
      'has alcanzado el límite de métodos de pago': 'Has alcanzado el límite de métodos de pago personalizados para tu plan Free (2 máximo). Upgrade a Premium para métodos ilimitados.',
      'has alcanzado el límite de tipos de ingreso': 'Has alcanzado el límite de tipos de ingreso personalizados para tu plan Free (1 máximo). Upgrade a Premium para tipos ilimitados.',
      'has alcanzado el límite de presupuestos': 'Has alcanzado el límite de presupuestos para tu plan Free (2 máximo). Upgrade a Premium para presupuestos ilimitados.',
      'network error': 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.',
      'unauthorized': 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      'forbidden': 'No tienes permisos para realizar esta acción.',
      'not found': 'El recurso solicitado no fue encontrado.',
      'internal server error': 'Error interno del servidor. Por favor, intenta más tarde.',
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [key, value] of Object.entries(errorMappings)) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return value;
      }
    }

    return message;
  };

  return {
    error,
    showError,
    clearError
  };
};