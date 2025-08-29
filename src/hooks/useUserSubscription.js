import React, { useState, useEffect, useContext, createContext } from 'react';
import databaseService from '../services/databaseService';
import authService from '../services/authService';
import { supabase } from '../lib/supabase';

// Context para compartir información de suscripción globalmente
const SubscriptionContext = createContext();

// Provider del contexto de suscripción
export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Cargar información de suscripción al inicializar y cuando cambie la autenticación
  useEffect(() => {
    // Función para verificar el estado de autenticación
    const checkAuthAndLoadSubscription = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Esperar un momento para que Supabase inicialice
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const user = authService.getCurrentUser();
        console.log('🔍 Checking user:', user ? user.email : 'No user');
        
        if (!user) {
          setSubscription(null);
          setAuthReady(true);
          setLoading(false);
          return;
        }

        console.log('🔄 Loading subscription for user:', user.email);
        let subscriptionInfo;
        
        try {
          subscriptionInfo = await databaseService.getUserSubscription();
          console.log('📋 Subscription loaded:', subscriptionInfo);
        } catch (subscriptionError) {
          console.log('⚠️ No subscription found...');
          
          // Verificar si el usuario fue eliminado intencionalmente
          try {
            const { data: deletedSub } = await supabase
              .from('user_subscriptions')
              .select('status')
              .eq('user_id', user.id)
              .eq('status', 'deleted')
              .single();
              
            if (deletedSub) {
              console.log('🚫 Usuario fue eliminado por admin, no crear suscripción');
              subscriptionInfo = { subscription: { status: 'deleted', type: 'free' } };
            } else {
              console.log('👤 Usuario nuevo, creando suscripción por defecto...');
              // Si no existe suscripción, crear una por defecto (usuario nuevo)
              await databaseService.createDefaultUserSubscription();
              subscriptionInfo = await databaseService.getUserSubscription();
              console.log('✅ Default subscription created:', subscriptionInfo);
            }
          } catch (createError) {
            console.error('❌ Error creating default subscription:', createError);
            // Continuar sin suscripción, se manejará como usuario sin plan
            subscriptionInfo = null;
          }
        }
        
        setSubscription(subscriptionInfo);
        setAuthReady(true);
      } catch (err) {
        console.error('❌ Error loading subscription:', err);
        setError(err.message);
        setSubscription(null);
        setAuthReady(true);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadSubscription();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Usuario se ha logueado, recargar suscripción
          setTimeout(checkAuthAndLoadSubscription, 500);
        } else if (event === 'SIGNED_OUT') {
          // Usuario se ha deslogueado
          setSubscription(null);
          setAuthReady(false);
          setLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      authSubscription?.unsubscribe();
    };
  }, []);

  // Función para recargar suscripción manualmente
  const loadUserSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = authService.getCurrentUser();
      if (!user) {
        setSubscription(null);
        return;
      }

      console.log('🔄 Manual reload subscription for:', user.email);
      const subscriptionInfo = await databaseService.getUserSubscription();
      console.log('📋 Subscription reloaded:', subscriptionInfo);
      setSubscription(subscriptionInfo);
    } catch (err) {
      console.error('❌ Error reloading subscription:', err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  // Refrescar información de suscripción
  const refreshSubscription = () => {
    return loadUserSubscription();
  };

  const contextValue = {
    subscription,
    loading,
    error,
    refreshSubscription,
    loadUserSubscription
  };

  return React.createElement(
    SubscriptionContext.Provider,
    { value: contextValue },
    children
  );
};

// Hook principal para usar la información de suscripción
export const useUserSubscription = () => {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error('useUserSubscription must be used within a SubscriptionProvider');
  }

  const { subscription, loading, error, refreshSubscription } = context;

  // Información básica de suscripción
  const subscriptionType = subscription?.subscription?.type || 'free';
  const subscriptionStatus = subscription?.subscription?.status || 'inactive';
  const isActive = subscriptionStatus === 'active';
  
  // Detectar si el usuario fue eliminado (está autenticado pero suscripción deleted)
  const isUserDeleted = !loading && (subscription === null || subscriptionStatus === 'deleted');

  // Roles del usuario
  const isFree = subscriptionType === 'free' && isActive;
  const isPremium = subscriptionType === 'premium' && isActive;
  const isFamily = subscriptionType === 'family' && isActive;
  const isAdmin = subscriptionType === 'admin' && isActive;

  // Early Bird
  const isEarlyBird = subscription?.subscription?.is_early_bird || false;
  const earlyBirdPrice = subscription?.subscription?.early_bird_price || null;

  // Límites y restricciones
  const limits = subscription?.limits || {};
  const features = subscription?.features || {};

  // Funciones de verificación de límites
  const canCreateTransaction = () => {
    // BLOQUEO: Usuarios eliminados NO pueden hacer nada
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    if (isPremium || isFamily || isAdmin) return true;
    const available = limits.monthly_transactions?.available;
    return available === -1 || available > 0;
  };

  const canCreateBudget = () => {
    // BLOQUEO: Usuarios eliminados NO pueden hacer nada
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    if (isPremium || isFamily || isAdmin) return true;
    const available = limits.budgets?.available;
    return available === -1 || available > 0;
  };

  const canCreateCategory = () => {
    // BLOQUEO: Usuarios eliminados NO pueden hacer nada
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    if (isPremium || isFamily || isAdmin) return true;
    const available = limits.categories?.available;
    return available === -1 || available > 0;
  };

  const canCreatePaymentMethod = () => {
    // BLOQUEO: Usuarios eliminados NO pueden hacer nada
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    if (isPremium || isFamily || isAdmin) return true;
    const available = limits.payment_methods?.available;
    return available === -1 || available > 0;
  };

  const canCreateIncomeType = () => {
    // BLOQUEO: Usuarios eliminados NO pueden hacer nada
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    if (isPremium || isFamily || isAdmin) return true;
    const available = limits.income_types?.available;
    return available === -1 || available > 0;
  };

  const canCreateRecurringTransaction = () => {
    // BLOQUEO: Usuarios eliminados NO pueden hacer nada
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    if (isPremium || isFamily || isAdmin) return true;
    const available = limits.recurring_transactions?.available;
    return available === -1 || available > 0;
  };

  // Funciones de verificación de características
  const canUseMultiCurrency = () => {
    // BLOQUEO: Usuarios eliminados NO pueden usar features
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    return isPremium || isFamily || isAdmin || features.multi_currency_enabled;
  };

  const canExportExcel = () => {
    // BLOQUEO: Usuarios eliminados NO pueden usar features
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    return isPremium || isFamily || isAdmin || features.excel_export_enabled;
  };

  const canImportExcel = () => {
    // BLOQUEO: Usuarios eliminados NO pueden usar features
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    return isPremium || isFamily || isAdmin || features.excel_import_enabled;
  };

  const canUseAdvancedReports = () => {
    // BLOQUEO: Usuarios eliminados NO pueden usar features
    if (isUserDeleted || subscriptionStatus === 'deleted') return false;
    if (!isActive) return false;
    return isPremium || isFamily || isAdmin || features.advanced_reports_enabled;
  };

  const getReportMonthsLimit = () => {
    if (isPremium || isFamily || isAdmin) return -1; // Ilimitado
    return features.report_months_limit || 3;
  };

  // Función para obtener el estado actual de límites
  const getLimitStatus = (limitType) => {
    const limitInfo = limits[limitType];
    if (!limitInfo) return { unlimited: true, available: -1, current: 0, limit: -1 };

    const isUnlimited = limitInfo.limit === -1;
    return {
      unlimited: isUnlimited,
      available: limitInfo.available,
      current: limitInfo.current,
      limit: limitInfo.limit,
      percentage: isUnlimited ? 0 : Math.round((limitInfo.current / limitInfo.limit) * 100)
    };
  };

  // Función para verificar si se debe mostrar mensaje de upgrade
  const shouldShowUpgradeMessage = (limitType) => {
    if (isPremium || isFamily || isAdmin) return false;
    const status = getLimitStatus(limitType);
    return !status.unlimited && status.available <= 0;
  };

  // Mensaje de upgrade personalizado
  const getUpgradeMessage = (limitType) => {
    const messages = {
      monthly_transactions: '¡Has alcanzado el límite de 30 transacciones mensuales! Upgrade a Premium para transacciones ilimitadas.',
      budgets: '¡Has alcanzado el límite de 2 presupuestos! Upgrade a Premium para presupuestos ilimitados.',
      categories: '¡Has alcanzado el límite de categorías personalizadas! Upgrade a Premium para categorías ilimitadas.',
      payment_methods: '¡Has alcanzado el límite de métodos de pago! Upgrade a Premium para métodos ilimitados.',
      income_types: '¡Has alcanzado el límite de tipos de ingreso! Upgrade a Premium para tipos ilimitados.',
      recurring_transactions: '¡Has alcanzado el límite de 5 transacciones recurrentes! Upgrade a Premium para recurrentes ilimitadas.'
    };
    return messages[limitType] || '¡Upgrade a Premium para desbloquear más funcionalidades!';
  };

  return {
    // Estado de carga
    loading,
    error,
    refreshSubscription,

    // Información de suscripción
    subscription,
    subscriptionType,
    subscriptionStatus,
    isActive,
    isUserDeleted,

    // Roles
    isFree,
    isPremium,
    isFamily,
    isAdmin,

    // Early Bird
    isEarlyBird,
    earlyBirdPrice,

    // Límites (objetos completos)
    limits,
    features,

    // Funciones de verificación
    canCreateTransaction,
    canCreateBudget,
    canCreateCategory,
    canCreatePaymentMethod,
    canCreateIncomeType,
    canCreateRecurringTransaction,

    // Características Premium
    canUseMultiCurrency,
    canExportExcel,
    canImportExcel,
    canUseAdvancedReports,
    getReportMonthsLimit,

    // Utilidades
    getLimitStatus,
    shouldShowUpgradeMessage,
    getUpgradeMessage
  };
};

// Hook específico para verificaciones de admin
export const useAdminFunctions = () => {
  const { isAdmin } = useUserSubscription();

  const promoteUserToPremium = async (userId, paymentInfo) => {
    if (!isAdmin) throw new Error('No tienes permisos de administrador');
    return await databaseService.upgradeUserToPremium(userId, paymentInfo);
  };

  const downgradeUserToFree = async (userId) => {
    if (!isAdmin) throw new Error('No tienes permisos de administrador');
    return await databaseService.downgradeUserToFree(userId);
  };

  const promoteUserToAdmin = async (userEmail) => {
    if (!isAdmin) throw new Error('No tienes permisos de administrador');
    return await databaseService.promoteUserToAdmin(userEmail);
  };

  const getAllSubscriptions = async () => {
    if (!isAdmin) throw new Error('No tienes permisos de administrador');
    return await databaseService.getAllSubscriptions();
  };

  const getSubscriptionStats = async () => {
    if (!isAdmin) throw new Error('No tienes permisos de administrador');
    return await databaseService.getSubscriptionStats();
  };

  return {
    isAdmin,
    promoteUserToPremium,
    downgradeUserToFree,
    promoteUserToAdmin,
    getAllSubscriptions,
    getSubscriptionStats
  };
};

// Hook para componentes que necesitan mostrar límites
export const useLimitDisplay = () => {
  const { 
    limits, 
    isFree, 
    isPremium, 
    isFamily,
    isAdmin, 
    getLimitStatus,
    shouldShowUpgradeMessage,
    getUpgradeMessage 
  } = useUserSubscription();

  // Generar información para mostrar en la UI
  const getLimitDisplayInfo = (limitType) => {
    const status = getLimitStatus(limitType);
    const shouldUpgrade = shouldShowUpgradeMessage(limitType);
    
    if (status.unlimited) {
      return {
        text: 'Ilimitado',
        color: 'text-green-600 dark:text-green-400',
        badge: '∞',
        showUpgrade: false
      };
    }

    const color = status.percentage >= 90 ? 'text-red-600 dark:text-red-400' :
                  status.percentage >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400';

    return {
      text: `${status.current}/${status.limit}`,
      available: status.available,
      color,
      percentage: status.percentage,
      badge: status.available.toString(),
      showUpgrade: shouldUpgrade,
      upgradeMessage: shouldUpgrade ? getUpgradeMessage(limitType) : null
    };
  };

  return {
    isFree,
    isPremium,
    isFamily,
    isAdmin,
    getLimitDisplayInfo
  };
};

export default useUserSubscription;