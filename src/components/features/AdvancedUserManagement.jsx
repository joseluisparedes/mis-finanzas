import React from 'react';
import { 
  AlertTriangle, CheckCircle, Database
} from 'lucide-react';
import { useUserSubscription } from '../../hooks/useUserSubscription';

const AdvancedUserManagement = () => {
  const { isAdmin } = useUserSubscription();

  // Solo admins pueden acceder
  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <div>
            <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Acceso Denegado</h3>
            <p className="text-red-600 dark:text-red-400">Solo administradores pueden acceder a esta sección.</p>
          </div>
        </div>
      </div>
    );
  }

  // Versión simplificada temporalmente
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Database className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión Avanzada de Usuarios
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Panel avanzado con todas las funcionalidades administrativas
          </p>
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Sistema Activado</h3>
            <p className="text-blue-600 dark:text-blue-400">
              Las funcionalidades avanzadas están siendo cargadas. Próximamente disponibles:
            </p>
            <ul className="mt-2 text-sm text-blue-600 dark:text-blue-400 list-disc list-inside">
              <li>Suspensión y restauración de cuentas</li>
              <li>Eliminación de usuarios con soft delete</li>
              <li>Exportación completa de datos a Excel</li>
              <li>Estadísticas del sistema en tiempo real</li>
              <li>Historial completo de auditoría</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedUserManagement;