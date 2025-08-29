import React from 'react';
import { useUserSubscription } from '../../hooks/useUserSubscription';

const DeletedUserBlock = ({ children, showMessage = true }) => {
  const { isUserDeleted, subscriptionStatus, loading } = useUserSubscription();

  // Mientras carga, mostrar contenido normal
  if (loading) {
    return children;
  }

  // Si usuario está eliminado/deleted, bloquear contenido
  if (isUserDeleted || subscriptionStatus === 'deleted') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Cuenta Deshabilitada
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Tu cuenta ha sido deshabilitada por un administrador. Ya no puedes acceder a las funcionalidades de la aplicación.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>¿Crees que esto es un error?</strong><br />
                Contacta al soporte para solicitar la reactivación de tu cuenta.
              </p>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = 'mailto:contacto.misfinanzaspersonales@gmail.com?subject=Solicitud de Reactivación de Cuenta&body=Hola,%0A%0AMi cuenta ha sido deshabilitada y me gustaría solicitar la reactivación.%0A%0ADetalles:%0A- Email de mi cuenta: [tu email aquí]%0A- Fecha aproximada de deshabilitación: [fecha]%0A- Razón (si la conoces): [razón o "No estoy seguro"]%0A%0AGracias por su atención.%0A%0ASaludos cordiales'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                📧 Contactar Soporte
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    window.location.href = '/auth/logout';
                  }
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Usuario activo, mostrar contenido normal
  return children;
};

export default DeletedUserBlock;