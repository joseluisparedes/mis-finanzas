import React, { useState, useEffect } from 'react';
import { Crown, Shield, Users, TrendingUp, AlertCircle, CheckCircle, Gift, Database, Settings } from 'lucide-react';
import { useAdminFunctions } from '../../hooks/useUserSubscription';
import { supabase } from '../../lib/supabase';
import databaseService from '../../services/databaseService';
import PromotionAdminPanel from '../admin/PromotionAdminPanel';
import AdvancedUserManagement from '../admin/AdvancedUserManagement';
import AuditLogViewer from '../admin/AuditLogViewer';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('advanced'); // 'users' | 'promotions' | 'advanced' | 'audit'
  const [expiringSubscriptions, setExpiringSubscriptions] = useState([]);

  const {
    isAdmin,
    promoteUserToPremium,
    downgradeUserToFree,
    getAllSubscriptions,
    getSubscriptionStats
  } = useAdminFunctions();

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando datos de administración...');
      
      const [usersData, statsData, expiringData] = await Promise.all([
        getAllSubscriptions(),
        getSubscriptionStats(),
        loadExpiringSubscriptions()
      ]);
      
      console.log('📊 Usuarios cargados:', usersData?.length || 0);
      console.log('📈 Estadísticas cargadas:', statsData);
      console.log('⏰ Suscripciones próximas a vencer:', expiringData?.length || 0);
      
      setUsers(usersData || []);
      setStats(statsData || {});
      setExpiringSubscriptions(expiringData || []);
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      console.error('❌ Stack trace:', error.stack);
      setMessage({ type: 'error', text: `Error cargando datos de administración: ${error.message || error}` });
    } finally {
      setLoading(false);
    }
  };

  const loadExpiringSubscriptions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_expiring_subscriptions_admin');
      if (error) {
        console.log('⚠️ No se pudieron cargar suscripciones próximas a vencer:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.log('⚠️ Error cargando suscripciones próximas a vencer:', error);
      return [];
    }
  };

  const handlePromoteToPremium = async (userId, userEmail, isEarlyBird = true, billing_period = 'monthly') => {
    try {
      setActionLoading(`promote-${userId}`);
      
      // Calcular precios según configuración actualizada
      let price;
      let early_bird_price = null;
      
      if (billing_period === 'annual') {
        price = 150.00; // S/150 anual
        early_bird_price = null; // No hay early bird para anual
      } else {
        // Mensual
        if (isEarlyBird) {
          price = 5.00;  // Early Bird S/5
          early_bird_price = 5.00;
        } else {
          price = 15.00; // Premium regular S/15
          early_bird_price = null;
        }
      }
      
      const paymentInfo = {
        price: price,
        currency: 'PEN',
        billing_period: billing_period,
        payment_method: 'admin_promotion',
        transaction_id: `ADMIN_${Date.now()}_${billing_period.toUpperCase()}`,
        is_early_bird: isEarlyBird && billing_period === 'monthly',
        early_bird_price: early_bird_price,
        notes: `Promoción admin: ${billing_period === 'annual' ? 'Plan anual S/150' : isEarlyBird ? 'Early Bird S/5' : 'Premium regular S/15'}`
      };

      // Calcular fecha de fin según el periodo
      const startDate = new Date();
      const endDate = new Date();
      if (billing_period === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setDate(endDate.getDate() + 30);
      }

      // Obtener la suscripción anterior para el log
      const { data: oldSubscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_type, subscription_end_date')
        .eq('user_id', userId)
        .single();

      // Actualizar suscripción con fechas correctas
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'premium',
          is_early_bird: isEarlyBird && billing_period === 'monthly',
          early_bird_price: early_bird_price,
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Registrar cambio en el log
      const { error: logError } = await supabase
        .from('subscription_change_log')
        .insert({
          user_id: userId,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          change_type: 'promotion',
          old_subscription_type: oldSubscription?.subscription_type || 'free',
          new_subscription_type: 'premium',
          old_end_date: oldSubscription?.subscription_end_date,
          new_end_date: endDate.toISOString(),
          notes: `Promoción a Premium ${billing_period === 'annual' ? 'Anual' : isEarlyBird ? 'Early Bird' : 'Regular'} (${billing_period === 'annual' ? 'S/150' : isEarlyBird ? 'S/5' : 'S/15'})`,
          payment_info: paymentInfo
        });

      if (logError) {
        console.warn('Error logging subscription change:', logError);
      }

      const data = `Usuario promovido a Premium ${billing_period === 'annual' ? 'Anual' : isEarlyBird ? 'Early Bird' : 'Regular'}. Inicio: ${startDate.toLocaleDateString()}, Fin: ${endDate.toLocaleDateString()}`;
      
      console.log('✅ Resultado de promoción:', data);
      setMessage({ 
        type: 'success', 
        text: data
      });
      loadData(); // Recargar datos
    } catch (error) {
      console.error('Error promoting user:', error);
      setMessage({ type: 'error', text: `Error promoviendo usuario: ${error.message}` });
    } finally {
      setActionLoading('');
    }
  };

  const handlePromoteToFamily = async (userId, userEmail) => {
    try {
      setActionLoading(`promote-family-${userId}`);
      
      const paymentInfo = {
        price: 0.00,  // FAMILY ES GRATUITO
        currency: 'PEN',
        billing_period: 'lifetime',
        payment_method: 'admin_promotion_family',
        transaction_id: `ADMIN_FAMILY_${Date.now()}`,
        is_early_bird: false,  // NO HAY EARLY BIRD PARA FAMILY
        early_bird_price: null
      };

      // Obtener la suscripción anterior para el log
      const { data: oldSubscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_type, subscription_end_date')
        .eq('user_id', userId)
        .single();

      // Actualizar suscripción a Family con fechas correctas
      const startDate = new Date();
      
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'family',
          is_early_bird: false,
          early_bird_price: null,
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: null, // Family NO tiene fecha fin
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Registrar cambio en el log
      const { error: logError } = await supabase
        .from('subscription_change_log')
        .insert({
          user_id: userId,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          change_type: 'promotion',
          old_subscription_type: oldSubscription?.subscription_type || 'free',
          new_subscription_type: 'family',
          old_end_date: oldSubscription?.subscription_end_date,
          new_end_date: null,
          notes: 'Promoción a Family (Plan gratuito sin vencimiento)',
          payment_info: paymentInfo
        });

      if (logError) {
        console.warn('Error logging subscription change:', logError);
      }

      const data = `Usuario promovido a Family. Inicio: ${startDate.toLocaleDateString()}, Sin vencimiento`;
      
      console.log('✅ Resultado de promoción a Family:', data);
      setMessage({ 
        type: 'success', 
        text: data
      });
      loadData(); // Recargar datos
    } catch (error) {
      console.error('Error promoting user to Family:', error);
      setMessage({ type: 'error', text: `Error promoviendo usuario a Family: ${error.message}` });
    } finally {
      setActionLoading('');
    }
  };

  const handleDowngradeToFree = async (userId, userEmail) => {
    // Prevenir auto-degradación accidental
    if (userEmail.includes('admin') || userEmail.includes('jose241100@gmail.com') || userEmail.includes('joseluisparedes')) {
      alert('⚠️ No puedes degradar la cuenta de administrador principal. Usa otro usuario para pruebas.');
      return;
    }
    
    if (!confirm(`¿Seguro que quieres degradar a ${userEmail} a plan Free?`)) return;
    
    try {
      setActionLoading(`downgrade-${userId}`);
      console.log('🔄 Iniciando degradación de usuario:', userId, userEmail);
      
      // Obtener la suscripción anterior para el log
      const { data: oldSubscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_type, subscription_end_date')
        .eq('user_id', userId)
        .single();

      // Degradar a Free con fechas correctas
      const startDate = new Date();
      
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'free',
          is_early_bird: false,
          early_bird_price: null,
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: null, // Free NO tiene fecha fin
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Registrar cambio en el log
      const { error: logError } = await supabase
        .from('subscription_change_log')
        .insert({
          user_id: userId,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          change_type: 'demotion',
          old_subscription_type: oldSubscription?.subscription_type || 'premium',
          new_subscription_type: 'free',
          old_end_date: oldSubscription?.subscription_end_date,
          new_end_date: null,
          notes: 'Degradación a Free (Plan gratuito)',
          payment_info: null
        });

      if (logError) {
        console.warn('Error logging subscription change:', logError);
      }

      const data = `Usuario degradado a Free. Inicio: ${startDate.toLocaleDateString()}, Sin vencimiento`;
      console.log('✅ Resultado de degradación:', data);
      
      setMessage({ type: 'success', text: `Usuario ${userEmail} degradado a Free` });
      
      console.log('🔄 Recargando datos de administración...');
      await loadData();
      console.log('✅ Datos recargados exitosamente');
    } catch (error) {
      console.error('❌ Error en proceso de degradación:', error);
      setMessage({ type: 'error', text: `Error degradando usuario: ${error.message || error}` });
    } finally {
      setActionLoading('');
    }
  };

  const handleExtendSubscription = async (userId, userEmail, extensionPeriod) => {
    const periodText = extensionPeriod === '30_days' ? '30 días' : '1 año';
    
    if (!confirm(`¿Seguro que quieres extender la suscripción de ${userEmail} por ${periodText}?`)) return;
    
    try {
      setActionLoading(`extend-${userId}-${extensionPeriod}`);
      console.log(`🔄 Extendiendo suscripción: ${userId}, período: ${extensionPeriod}`);
      
      // Usar la función RPC del databaseService
      const result = await databaseService.extendSubscription(
        userId, 
        extensionPeriod, 
        `Extensión manual por administrador - ${periodText}`
      );

      if (result && result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || `Suscripción de ${userEmail} extendida por ${periodText}`
        });
        await loadData();
      } else {
        throw new Error(result?.error || 'Error desconocido en la extensión');
      }
    } catch (error) {
      console.error('❌ Error extendiendo suscripción:', error);
      setMessage({ type: 'error', text: `Error extendiendo suscripción: ${error.message}` });
    } finally {
      setActionLoading('');
    }
  };

  // Función para crear mensaje de WhatsApp automático basado en el estado de suscripción
  const generateWhatsAppMessage = (user) => {
    const userEmail = user.user_email || user.users?.email || 'Usuario';
    
    // Si es free o family, ofrecer planes Premium
    if (['free', 'family'].includes(user.subscription_type)) {
      return `¡Hola! Te contactamos desde Mis Finanzas.

¿Te gustaría conocer nuestros planes Premium?

💎 Premium mensual: S/ 15.00
🎯 Premium anual: S/ 150.00 (2 meses gratis)`;
    }

    // Si tiene suscripción Premium con fecha de vencimiento
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const today = new Date();
      const timeDiff = endDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // Determinar si es Early Bird (Fundador) o Premium Regular
      const isEarlyBird = user.is_early_bird || user.subscription_type === 'early_bird';

      if (daysLeft < 0) {
        // Ya venció
        const daysExpired = Math.abs(daysLeft);
        if (isEarlyBird) {
          return `¡Hola! Tu plan Premium Early Bird venció hace ${daysExpired} día${daysExpired > 1 ? 's' : ''}.

¿Te gustaría renovarlo para recuperar todas las funciones?

💰 Plan mensual disponible: S/ 5.00
📅 Duración: 30 días

¡Reactiva tu cuenta hoy!`;
        } else {
          return `¡Hola! Tu plan Premium venció hace ${daysExpired} día${daysExpired > 1 ? 's' : ''}.

¿Te gustaría renovarlo para recuperar todas las funciones?

💰 Opciones disponibles:
• 1 mes: S/ 15.00
• 1 año: S/ 150.00 (¡Ahorra S/ 30!)

¡Reactiva tu cuenta hoy!`;
        }
      } else if (daysLeft <= 10) {
        // Próximo a vencer o vence hoy
        const dayText = daysLeft === 0 ? 'vence hoy' : `te quedan ${daysLeft} día${daysLeft > 1 ? 's' : ''} antes de que tu plan Premium ${isEarlyBird ? 'Early Bird ' : ''}venza`;
        
        if (isEarlyBird) {
          return `¡Hola! ${dayText === 'vence hoy' ? 'Tu plan Premium Early Bird vence hoy' : `Te quedan ${daysLeft} día${daysLeft > 1 ? 's' : ''} antes de que tu plan Premium Early Bird venza`}.

¿Deseas ampliar el periodo?

💰 Plan mensual disponible: S/ 5.00
📅 Duración: 30 días adicionales

¿Te gustaría renovar?`;
        } else {
          return `¡Hola! ${dayText === 'vence hoy' ? 'Tu plan Premium vence hoy' : `Te quedan ${daysLeft} día${daysLeft > 1 ? 's' : ''} antes de que tu plan Premium venza`}.

¿Deseas ampliar el periodo?

💰 Opciones disponibles:
• 1 mes más: S/ 15.00
• 1 año completo: S/ 150.00 (equivale a S/12.50/mes)

¿Cuál prefieres?`;
        }
      } else {
        // Contacto general para usuarios Premium activos
        if (isEarlyBird) {
          return `¡Hola! Te contactamos desde Mis Finanzas.

Tu plan Premium Early Bird está activo hasta el ${endDate.toLocaleDateString('es-PE')}.

¡Disfruta de todas las funciones Premium!`;
        } else {
          return `¡Hola! Te contactamos desde Mis Finanzas.

Tu plan Premium está activo hasta el ${endDate.toLocaleDateString('es-PE')}.

¡Disfruta de todas las funciones Premium!`;
        }
      }
    }

    // Fallback general
    return `¡Hola! Te contactamos desde Mis Finanzas. ¡Esperamos poder ayudarte!`;
  };

  // Handler para WhatsApp
  const handleWhatsAppContact = async (user) => {
    try {
      const userEmail = user.user_email || user.users?.email || 'Usuario';
      const phoneNumber = user.phone_number;
      
      if (!phoneNumber) {
        alert('No hay número de teléfono registrado para este usuario. Agrégalo primero.');
        return;
      }

      const message = generateWhatsAppMessage(user);
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
      
      // Registrar contacto en el log
      const { error: logError } = await supabase
        .from('admin_contact_log')
        .insert({
          target_user_id: user.user_id,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          contact_method: 'whatsapp',
          contact_reason: 'Contacto automático por estado de suscripción',
          contact_notes: message.substring(0, 200) + (message.length > 200 ? '...' : '')
        });

      if (logError) {
        console.warn('Error logging WhatsApp contact:', logError);
      }

      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      setMessage({ 
        type: 'success', 
        text: `WhatsApp abierto para contactar a ${userEmail}`
      });
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      setMessage({ type: 'error', text: `Error enviando mensaje de WhatsApp: ${error.message}` });
    }
  };

  // Handler para Email
  const handleEmailContact = async (user) => {
    try {
      const userEmail = user.user_email || user.users?.email || '';
      
      if (!userEmail) {
        alert('No hay email registrado para este usuario.');
        return;
      }

      const message = generateWhatsAppMessage(user); // Mismo mensaje base
      const subject = encodeURIComponent('Mis Finanzas - Estado de tu suscripción');
      const body = encodeURIComponent(message);
      
      const mailtoUrl = `mailto:${userEmail}?subject=${subject}&body=${body}`;
      
      // Registrar contacto en el log
      const { error: logError } = await supabase
        .from('admin_contact_log')
        .insert({
          target_user_id: user.user_id,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          contact_method: 'email',
          contact_reason: 'Contacto automático por estado de suscripción',
          contact_notes: message.substring(0, 200) + (message.length > 200 ? '...' : '')
        });

      if (logError) {
        console.warn('Error logging email contact:', logError);
      }

      // Abrir cliente de email
      window.open(mailtoUrl, '_blank');
      
      setMessage({ 
        type: 'success', 
        text: `Cliente de email abierto para contactar a ${userEmail}`
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setMessage({ type: 'error', text: `Error abriendo cliente de email: ${error.message}` });
    }
  };

  // Handler para actualizar teléfono (en tiempo real)
  const handlePhoneUpdate = (userId, phoneValue) => {
    // Actualizar el estado local inmediatamente para UX fluida
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.user_id === userId ? { ...u, phone_number: phoneValue } : u
      )
    );
  };

  // Handler para guardar teléfono (cuando pierde el foco)
  const handlePhoneSave = async (userId, phoneValue) => {
    try {
      const { error } = await supabase.rpc('admin_update_user_phone', {
        target_user_id: userId,
        new_phone_number: phoneValue || null
      });

      if (error) throw error;

      console.log(`Teléfono actualizado para usuario ${userId}: ${phoneValue}`);
    } catch (error) {
      console.error('Error updating phone:', error);
      setMessage({ type: 'error', text: `Error actualizando teléfono: ${error.message}` });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Solo los administradores pueden acceder a este panel.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Panel de Administración
            </h1>
          </div>
          
          {message && (
            <div className={`p-4 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mt-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('advanced')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'advanced'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                Gestión Avanzada
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Usuarios Básico
              </button>
              <button
                onClick={() => setActiveTab('promotions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'promotions'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Gift className="w-4 h-4 inline mr-2" />
                Promociones
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="inline mr-2">📜</span>
                Auditoría
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'users' && (
          <>
            {/* Alertas de vencimiento */}
            {expiringSubscriptions.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                    Suscripciones próximas a vencer ({expiringSubscriptions.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {expiringSubscriptions.slice(0, 3).map(sub => (
                    <div key={sub.user_id} className="flex items-center justify-between text-sm">
                      <span className="text-orange-700 dark:text-orange-300">
                        {sub.display_name || sub.email} ({sub.subscription_type})
                      </span>
                      <span className="font-medium text-orange-800 dark:text-orange-200">
                        {sub.warning_message}
                      </span>
                    </div>
                  ))}
                  {expiringSubscriptions.length > 3 && (
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      ... y {expiringSubscriptions.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Estadísticas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <StatCard
                  icon={Users}
                  title="Total Usuarios"
                  value={stats.total_users}
                  color="blue"
                />
                <StatCard
                  icon={TrendingUp}
                  title="Free"
                  value={stats.free_users}
                  color="gray"
                />
                <StatCard
                  icon={Crown}
                  title="Premium"
                  value={stats.premium_users}
                  color="yellow"
                />
                <StatCard
                  icon={Users}
                  title="Family"
                  value={stats.family_users || 0}
                  color="green"
                />
                <StatCard
                  icon={Shield}
                  title="Admin"
                  value={stats.admin_users}
                  color="purple"
                />
              </div>
            )}

            {/* Lista de usuarios */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Gestión de Usuarios
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fechas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <UserRow
                        key={user.user_id}
                        user={user}
                        onPromoteToPremium={handlePromoteToPremium}
                        onPromoteToFamily={handlePromoteToFamily}
                        onDowngradeToFree={handleDowngradeToFree}
                        onExtendSubscription={handleExtendSubscription}
                        onWhatsAppContact={handleWhatsAppContact}
                        onEmailContact={handleEmailContact}
                        onPhoneUpdate={handlePhoneUpdate}
                        onPhoneSave={handlePhoneSave}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab de Gestión Avanzada */}
        {activeTab === 'advanced' && (
          <AdvancedUserManagement />
        )}

        {/* Tab de Promociones */}
        {activeTab === 'promotions' && (
          <PromotionAdminPanel />
        )}

        {/* Tab de Auditoría */}
        {activeTab === 'audit' && (
          <AuditLogViewer />
        )}
      </div>
    </div>
  );
};

// Componente para cada fila de usuario
const UserRow = ({ user, onPromoteToPremium, onPromoteToFamily, onDowngradeToFree, onExtendSubscription, onWhatsAppContact, onEmailContact, onPhoneUpdate, onPhoneSave, actionLoading }) => {
  const isPromoting = actionLoading === `promote-${user.user_id}`;
  const isPromotingFamily = actionLoading === `promote-family-${user.user_id}`;
  const isDowngrading = actionLoading === `downgrade-${user.user_id}`;
  const isExtending30Days = actionLoading === `extend-${user.user_id}-30_days`;
  const isExtending1Year = actionLoading === `extend-${user.user_id}-1_year`;
  const isLoading = isPromoting || isPromotingFamily || isDowngrading || isExtending30Days || isExtending1Year;

  // Función para calcular si está próximo a vencer
  const getExpirationStatus = () => {
    // SOLO Free y Family NO tienen fecha de vencimiento
    // TODOS los otros planes (Premium, EB, Admin, etc.) SÍ deben tener fecha fin
    if (['free', 'family'].includes(user.subscription_type)) {
      return { isExpiring: false, daysLeft: null, color: '', message: '' };
    }

    // Si no es free/family pero no tiene fecha de fin, es ERROR
    if (!user.subscription_end_date) {
      return { isExpiring: false, daysLeft: null, color: '', message: '' };
    }

    const endDate = new Date(user.subscription_end_date);
    const today = new Date();
    const timeDiff = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysLeft < 0) {
      return {
        isExpiring: true,
        daysLeft,
        color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        message: `Venció hace ${Math.abs(daysLeft)} días`
      };
    } else if (daysLeft <= 3) {
      return {
        isExpiring: true,
        daysLeft,
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
        message: daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`
      };
    }

    return { isExpiring: false, daysLeft, color: '', message: '' };
  };

  const expirationStatus = getExpirationStatus();

  const getSubscriptionBadge = () => {
    const config = {
      free: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', text: 'Free' },
      premium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', text: 'Premium' },
      family: { color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', text: 'Family' },
      admin: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', text: 'Admin' }
    };
    
    const { color, text } = config[user.subscription_type] || config.free;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        {text}
        {user.is_early_bird && user.subscription_type === 'premium' && ' 🌟'}
      </span>
    );
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {user.user_email || user.users?.email || 'N/A'}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getSubscriptionBadge()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.status === 'active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
        }`}>
          {user.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        <div className="space-y-1">
          <div className="text-xs">
            <span className="font-medium">Registro:</span> {new Date(user.created_at).toLocaleDateString()}
          </div>
          <div className="text-xs">
            <span className="font-medium">Inicio Plan:</span> {user.subscription_start_date ? new Date(user.subscription_start_date).toLocaleDateString() : 'No definido'}
          </div>
          {/* SOLO Free y Family NO tienen fecha fin */}
          {['free', 'family'].includes(user.subscription_type) ? (
            <div className="text-xs text-gray-400">
              <span className="font-medium">Fin Plan:</span> Sin vencimiento
            </div>
          ) : (
            <div className="text-xs">
              <span className="font-medium">Fin Plan:</span> 
              {user.subscription_end_date ? (
                <>
                  {new Date(user.subscription_end_date).toLocaleDateString()}
                  {expirationStatus.isExpiring && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${expirationStatus.color}`}>
                      ⚠️ {expirationStatus.message}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-red-600 ml-1 font-semibold">⚠️ FALTA FECHA FIN</span>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center space-x-2">
          {/* Ícono WhatsApp */}
          <button
            onClick={() => onWhatsAppContact(user)}
            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="Contactar por WhatsApp"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.515"/>
            </svg>
          </button>

          {/* Ícono Email */}
          <button
            onClick={() => onEmailContact(user)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Contactar por email"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Teléfono editable */}
          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="Teléfono"
              value={user.phone_number || ''}
              onChange={(e) => onPhoneUpdate(user.user_id, e.target.value)}
              onBlur={(e) => onPhoneSave(user.user_id, e.target.value)}
              className="w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
        {user.subscription_type === 'free' && (
          <>
            <button
              onClick={() => onPromoteToPremium(user.user_id, user.user_email || user.users?.email || 'N/A', true, 'monthly')}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors mr-1"
              title="Premium Early Bird mensual - S/5"
            >
              {isPromoting ? '...' : '👑 Premium EB S/5'}
            </button>
            <button
              onClick={() => onPromoteToPremium(user.user_id, user.user_email || user.users?.email || 'N/A', false, 'monthly')}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors mr-1"
              title="Premium regular mensual - S/15"
            >
              {isPromoting ? '...' : '💎 Premium S/15'}
            </button>
            <button
              onClick={() => onPromoteToPremium(user.user_id, user.user_email || user.users?.email || 'N/A', false, 'annual')}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors mr-1"
              title="Premium anual - S/150 (equivale a S/12.50/mes)"
            >
              {isPromoting ? '...' : '🏆 Premium Anual S/150'}
            </button>
            <button
              onClick={() => onPromoteToFamily(user.user_id, user.user_email || user.users?.email || 'N/A')}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              title="Plan familiar gratuito"
            >
              {isPromotingFamily ? '...' : '👪 Family GRATIS'}
            </button>
          </>
        )}
        
        {user.subscription_type === 'premium' && (
          <>
            <button
              onClick={() => onDowngradeToFree(user.user_id, user.user_email || user.users?.email || 'N/A')}
              disabled={isLoading}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors mr-1"
            >
              {isDowngrading ? '...' : '⬇️ Degradar'}
            </button>
            <button
              onClick={() => onExtendSubscription(user.user_id, user.user_email || user.users?.email || 'N/A', '30_days')}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors mr-1"
              title="Extender suscripción por 30 días"
            >
              {isExtending30Days ? '...' : '📅 +30d'}
            </button>
            <button
              onClick={() => onExtendSubscription(user.user_id, user.user_email || user.users?.email || 'N/A', '1_year')}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              title="Extender suscripción por 1 año"
            >
              {isExtending1Year ? '...' : '📅 +1año'}
            </button>
          </>
        )}

        {user.subscription_type === 'family' && (
          <>
            <button
              onClick={() => onDowngradeToFree(user.user_id, user.user_email || user.users?.email || 'N/A')}
              disabled={isLoading}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              {isDowngrading ? '...' : '⬇️ Free'}
            </button>
            <button
              onClick={() => onPromoteToPremium(user.user_id, user.user_email || user.users?.email || 'N/A', true)}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              {isPromoting ? '...' : '👑 Premium EB'}
            </button>
            <button
              onClick={() => onPromoteToPremium(user.user_id, user.user_email || user.users?.email || 'N/A', false)}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              {isPromoting ? '...' : '💎 Premium'}
            </button>
          </>
        )}
      </td>
    </tr>
  );
};

// Componente para estadísticas
const StatCard = ({ icon: Icon, title, value, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-700',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;