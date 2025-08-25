import React, { useState } from 'react';
import { Cloud, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const MigrationBanner = ({ 
  hasLocalData, 
  onMigrate, 
  onDismiss, 
  loading,
  isVisible = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || !hasLocalData) {
    return null;
  }

  const handleMigrate = async () => {
    if (confirm('¿Estás seguro de que quieres migrar tus datos a la nube? Esta acción sincronizará todos tus datos locales con Supabase.')) {
      await onMigrate();
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Cloud className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-blue-800">
                ¡Migra tus datos a la nube!
              </h3>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Tienes datos guardados localmente. Migra a Supabase para acceso desde cualquier dispositivo.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? 'Ver menos' : 'Ver más'}
          </button>
          
          <button
            onClick={onDismiss}
            className="text-blue-400 hover:text-blue-600 transition-colors"
            title="Cerrar aviso"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>Backup automático:</strong> Tus datos estarán seguros en la nube
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>Sincronización:</strong> Accede desde cualquier dispositivo
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>Seguridad:</strong> Datos protegidos con autenticación
              </p>
            </div>

            <div className="bg-blue-100 rounded-lg p-3 mt-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">¿Qué sucederá durante la migración?</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Se crearán todas tus categorías, métodos de pago y tipos de ingreso</li>
                    <li>Se migrarán todos tus gastos e ingresos existentes</li>
                    <li>Tus datos locales se mantendrán como respaldo</li>
                    <li>El proceso puede tomar unos minutos dependiendo de la cantidad de datos</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMigrate}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Migrando...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4" />
                      <span>Migrar Datos</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                >
                  Ahora no
                </button>
              </div>
              
              <p className="text-xs text-blue-600">
                Podrás migrar más tarde desde Configuración
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationBanner;