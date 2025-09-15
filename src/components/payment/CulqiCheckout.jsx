import React, { useState, useEffect } from 'react';
// Iconos removidos completamente para evitar errores
import { supabase } from '../../lib/supabase';

const CulqiCheckout = ({ plan, onSuccess, onCancel, onError }) => {
  // Mostrar mensaje temporal para pagos con tarjeta de crédito
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            🚀 ¡Próximamente disponible!
          </h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Contenido del mensaje */}
        <div className="text-center space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <div className="text-4xl mb-4">💳</div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Pagos con tarjeta en desarrollo
            </h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Estamos trabajando para ofrecerte más opciones de pago seguras.
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
              📱 Mientras tanto, usa Yape
            </h5>
            <p className="text-purple-700 dark:text-purple-300 text-sm">
              Puedes continuar usando Yape para completar tu suscripción y acceder a todas las funcionalidades premium de forma inmediata.
            </p>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            💡 Los pagos con tarjeta estarán disponibles muy pronto
          </div>
        </div>

        {/* Botón de cerrar */}
        <div className="mt-6">
          <button
            onClick={onCancel}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};


export default CulqiCheckout;