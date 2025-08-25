import React from 'react';
import { Crown, Shield, Zap, Heart, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUserSubscription, useLimitDisplay } from '../../hooks/useUserSubscription';

const SubscriptionStatus = ({ compact = false }) => {
  const {
    loading,
    error,
    subscriptionType,
    isFree,
    isPremium,
    isFamily,
    isAdmin,
    isEarlyBird,
    earlyBirdPrice,
    subscription
  } = useUserSubscription();

  const { getLimitDisplayInfo } = useLimitDisplay();

  if (loading) {
    return (
      <div className={`${compact ? 'p-2' : 'p-4'} bg-gray-50 dark:bg-gray-800 rounded-lg`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? 'p-2' : 'p-4'} bg-red-50 dark:bg-red-900/20 rounded-lg`}>
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Error cargando suscripción</span>
        </div>
      </div>
    );
  }

  // Iconos y colores por tipo de suscripción
  const getSubscriptionConfig = () => {
    if (isAdmin) {
      return {
        icon: Shield,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        label: 'Administrador',
        badge: 'ADMIN'
      };
    }
    if (isFamily) {
      return {
        icon: Heart,
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        label: 'Familia Premium',
        badge: 'FAMILY'
      };
    }
    if (isPremium) {
      return {
        icon: Crown,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        label: isEarlyBird ? `Premium Early Bird (S/ ${earlyBirdPrice})` : 'Premium',
        badge: isEarlyBird ? 'EARLY BIRD' : 'PREMIUM'
      };
    }
    return {
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      label: 'Gratis',
      badge: 'FREE'
    };
  };

  const config = getSubscriptionConfig();
  const Icon = config.icon;

  // Versión compacta para el header
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${config.bgColor}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.badge}
        </span>
      </div>
    );
  }

  // Versión completa para mostrar detalles
  return (
    <div className={`p-6 rounded-xl ${config.bgColor} border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${config.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${config.color}`}>
              {config.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Estado: Activo
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-bold ${config.color} ${config.bgColor} border`}>
          {config.badge}
        </div>
      </div>

      {/* Mostrar límites solo para usuarios FREE */}
      {isFree && (
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Uso actual (Plan Gratuito):
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LimitCard
              title="Transacciones"
              limitType="monthly_transactions"
              getLimitDisplayInfo={getLimitDisplayInfo}
            />
            <LimitCard
              title="Presupuestos"
              limitType="budgets"
              getLimitDisplayInfo={getLimitDisplayInfo}
            />
            <LimitCard
              title="Categorías"
              limitType="categories"
              getLimitDisplayInfo={getLimitDisplayInfo}
            />
            <LimitCard
              title="Recurrentes"
              limitType="recurring_transactions"
              getLimitDisplayInfo={getLimitDisplayInfo}
            />
          </div>
        </div>
      )}

      {/* Características premium */}
      {(isPremium || isFamily || isAdmin) && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Características Premium:
          </h4>
          <div className="flex flex-wrap gap-2">
            <FeatureBadge text="Transacciones ilimitadas" />
            <FeatureBadge text="Multi-moneda PEN/USD" />
            <FeatureBadge text="Exportar Excel" />
            <FeatureBadge text="Análisis avanzados" />
            {isFamily && <FeatureBadge text="Acceso Familiar GRATIS" family />}
            {isAdmin && <FeatureBadge text="Panel Admin" premium />}
          </div>
        </div>
      )}

      {/* Información de suscripción */}
      {subscription?.subscription && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-4">
            <span>Desde: {new Date(subscription.subscription.started_at).toLocaleDateString()}</span>
            {subscription.subscription.expires_at && (
              <span>Expira: {new Date(subscription.subscription.expires_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Call to action para FREE */}
      {isFree && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
            🚀 Upgrade a Premium - Solo S/ 15/mes
          </button>
        </div>
      )}
    </div>
  );
};

// Componente para mostrar límites individuales
const LimitCard = ({ title, limitType, getLimitDisplayInfo }) => {
  const info = getLimitDisplayInfo(limitType);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </span>
        <span className={`text-sm font-bold ${info.color}`}>
          {info.text}
        </span>
      </div>
      
      {!info.text.includes('Ilimitado') && (
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              info.percentage >= 90 ? 'bg-red-500' :
              info.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(info.percentage, 100)}%` }}
          />
        </div>
      )}
      
      {info.showUpgrade && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          ¡Límite alcanzado!
        </div>
      )}
    </div>
  );
};

// Badge para características
const FeatureBadge = ({ text, premium = false, family = false }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    premium 
      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200' 
      : family
        ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200'
        : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
  }`}>
    <CheckCircle className="w-3 h-3 mr-1" />
    {text}
  </span>
);

export default SubscriptionStatus;