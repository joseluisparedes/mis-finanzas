import React, { useState, useEffect } from 'react';
import { Mail, AlertTriangle, CheckCircle, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useUserSubscription } from '../../hooks/useUserSubscription';

const EmailUsageDashboard = ({ compact = false }) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { supabaseClient } = useSupabaseData();
  const { isAdmin } = useUserSubscription();

  // Solo admins pueden ver este dashboard
  if (!isAdmin) {
    return null;
  }

  // Función para obtener estadísticas de uso
  const fetchUsage = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await supabaseClient.functions.invoke('send-email/usage', {
        method: 'GET'
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.success) {
        setUsage(response.data.usage);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.data.error || 'Failed to fetch usage');
      }
    } catch (err) {
      console.error('Error fetching email usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchUsage();
  }, []);

  // Auto-refresh cada 5 minutos si está abierto
  useEffect(() => {
    if (!compact) {
      const interval = setInterval(fetchUsage, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [compact]);

  // Determinar color y estado basado en el porcentaje
  const getUsageStatus = () => {
    if (!usage) return { color: 'gray', status: 'unknown', icon: Clock };
    
    if (usage.percentage >= 90) {
      return { color: 'red', status: 'critical', icon: AlertTriangle };
    } else if (usage.percentage >= 75) {
      return { color: 'yellow', status: 'warning', icon: AlertTriangle };
    } else {
      return { color: 'green', status: 'normal', icon: CheckCircle };
    }
  };

  const { color, status, icon: StatusIcon } = getUsageStatus();

  // Versión compacta para el header de admin
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-${color}-50 dark:bg-${color}-900/20`}>
        <Mail className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
        <span className={`text-sm font-medium text-${color}-600 dark:text-${color}-400`}>
          {loading ? '...' : usage ? `${usage.percentage}%` : 'N/A'}
        </span>
      </div>
    );
  }

  // Versión completa del dashboard
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Uso de Emails (Resend)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Monitoreo automático del límite mensual
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchUsage}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error cargando datos</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          ))}
        </div>
      ) : usage ? (
        <div className="space-y-6">
          {/* Barra de progreso principal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uso actual
              </span>
              <span className={`text-sm font-bold text-${color}-600 dark:text-${color}-400`}>
                {usage.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  usage.percentage >= 90 ? 'bg-red-500' :
                  usage.percentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Estadísticas detalladas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usage.used?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Emails Enviados
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usage.remaining?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Emails Restantes
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usage.limit?.toLocaleString() || '3,000'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Límite Mensual
              </div>
            </div>
          </div>

          {/* Estado y alertas */}
          <div className={`p-4 rounded-lg border-l-4 ${
            status === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
            status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
            'bg-green-50 dark:bg-green-900/20 border-green-500'
          }`}>
            <div className="flex items-center space-x-3">
              <StatusIcon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
              <div>
                <div className={`font-medium text-${color}-800 dark:text-${color}-200`}>
                  {status === 'critical' ? 'Uso Crítico - Acción Requerida' :
                   status === 'warning' ? 'Uso Alto - Monitorear' :
                   'Uso Normal'}
                </div>
                <div className={`text-sm text-${color}-600 dark:text-${color}-400`}>
                  {status === 'critical' 
                    ? 'Considera upgrade o reduce envíos no críticos'
                    : status === 'warning' 
                    ? 'Monitorear uso más frecuentemente'
                    : 'Todo funcionando correctamente'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Información de reset */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Próximo Reset</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              El límite se resetea automáticamente el {' '}
              <strong>{usage.resetDate ? new Date(usage.resetDate).toLocaleDateString('es-ES') : 'próximo mes'}</strong>
            </p>
          </div>

          {/* Información de última actualización */}
          {lastUpdated && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Última actualización: {lastUpdated.toLocaleString('es-ES')}
            </div>
          )}
        </div>
      ) : null}

      {/* Enlaces útiles */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href="https://resend.com/emails"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Dashboard Resend
          </a>
          <a
            href="https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Logs Supabase
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmailUsageDashboard;