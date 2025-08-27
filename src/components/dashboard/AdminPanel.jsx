import React, { useState, useEffect } from 'react';
import { Crown, Shield, Users, TrendingUp, AlertCircle, CheckCircle, Gift, Database, Settings, History } from 'lucide-react';
import { useAdminFunctions } from '../../hooks/useUserSubscription';
import { supabase } from '../../lib/supabase';
import databaseService from '../../services/databaseService';
import PromotionAdminPanel from '../features/PromotionAdminPanel';
import AdvancedUserManagement from '../features/AdvancedUserManagement';
import AuditLogViewer from '../features/AuditLogViewer';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('advanced'); // 'users' | 'promotions' | 'advanced' | 'audit'

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
      
      const [usersData, statsData] = await Promise.all([
        getAllSubscriptions(),
        getSubscriptionStats()
      ]);
      
      console.log('📊 Usuarios cargados:', usersData?.length || 0);
      console.log('📈 Estadísticas cargadas:', statsData);
      
      setUsers(usersData || []);
      setStats(statsData || {});
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      console.error('❌ Stack trace:', error.stack);
      setMessage({ type: 'error', text: `Error cargando datos de administración: ${error.message || error}` });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToPremium = async (userId, userEmail, isEarlyBird = true) => {
    try {
      setActionLoading(`promote-${userId}`);
      
      const paymentInfo = {
        price: isEarlyBird ? 5.00 : 15.00,
        currency: 'PEN',
        billing_period: 'monthly',
        payment_method: 'admin_promotion',
        transaction_id: `ADMIN_${Date.now()}`,
        is_early_bird: isEarlyBird,
        early_bird_price: isEarlyBird ? 5.00 : null
      };

      // Usar la nueva función RPC segura
      const { data, error } = await supabase.rpc('safe_promote_to_premium', {
        target_user_id: userId,
        payment_info: paymentInfo
      });
      
      if (error) throw error;
      
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
      
      // Usar la nueva función RPC segura
      const { data, error } = await supabase.rpc('safe_degrade_user', {
        target_user_id: userId
      });
      
      if (error) throw error;
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
                <History className="w-4 h-4 inline mr-2" />
                Auditoría
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'users' && (
          <>
            {/* Estadísticas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                        Fecha Registro
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
                        onDowngradeToFree={handleDowngradeToFree}
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
const UserRow = ({ user, onPromoteToPremium, onDowngradeToFree, actionLoading }) => {
  const isPromoting = actionLoading === `promote-${user.user_id}`;
  const isDowngrading = actionLoading === `downgrade-${user.user_id}`;
  const isLoading = isPromoting || isDowngrading;

  const getSubscriptionBadge = () => {
    const config = {
      free: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', text: 'Free' },
      premium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', text: 'Premium' },
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
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
        {user.subscription_type === 'free' && (
          <>
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
        
        {user.subscription_type === 'premium' && (
          <button
            onClick={() => onDowngradeToFree(user.user_id, user.user_email || user.users?.email || 'N/A')}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            {isDowngrading ? '...' : '⬇️ Degradar'}
          </button>
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