import React, { useState, useEffect } from 'react';
import { 
  Crown, Shield, Users, Heart, TrendingUp, 
  AlertCircle, CheckCircle, Search, Filter,
  UserPlus, Edit3, Trash2, Mail, Calendar
} from 'lucide-react';
import { useAdminFunctions } from '../hooks/useUserSubscription';
import databaseService from '../services/databaseService';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';

const UserManagementPanel = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { isAdmin, getAllSubscriptions } = useAdminFunctions();

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        getAllSubscriptions(),
        getExtendedStats()
      ]);
      setUsers(usersData || []);
      setStats(statsData || {});
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Error cargando datos' });
    } finally {
      setLoading(false);
    }
  };

  const getExtendedStats = async () => {
    try {
      // Usar una función temporal que cuenta manualmente
      const users = await getAllSubscriptions();
      const stats = {
        total_users: users.length,
        free_users: users.filter(u => u.subscription_type === 'free').length,
        premium_users: users.filter(u => u.subscription_type === 'premium').length,
        family_users: users.filter(u => u.subscription_type === 'family').length,
        admin_users: users.filter(u => u.subscription_type === 'admin').length,
        early_bird_users: users.filter(u => u.is_early_bird).length,
        active_subscriptions: users.filter(u => u.status === 'active').length
      };
      return stats;
    } catch (error) {
      console.error('Error getting extended stats:', error);
      return {};
    }
  };

  const changeUserSubscription = async (userEmail, newType, extraData = {}) => {
    try {
      setActionLoading(`change-${userEmail}`);
      
      const paymentInfo = {
        price: extraData.price || 0,
        billing_period: extraData.billing_period || 'monthly',
        is_early_bird: extraData.is_early_bird || false,
        notes: extraData.notes || '',
        target_user_email: userEmail
      };

      const { data, error } = await supabase
        .rpc('change_user_subscription', {
          new_subscription_type: newType,
          payment_info: paymentInfo
        });

      if (error) throw error;
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Usuario ${userEmail} cambiado a ${newType.toUpperCase()}` 
        });
        loadData();
        setShowPromoteModal(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setActionLoading('');
    }
  };

  const filteredUsers = users.filter(user => {
    const email = user.user_email || user.users?.email || '';
    const matchesSearch = email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || user.subscription_type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Solo los administradores pueden gestionar usuarios.
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Gestión de Usuarios
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Administra roles y permisos de usuarios
                </p>
              </div>
            </div>
          </div>
          
          {message && (
            <div className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
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
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard
              icon={Users}
              title="Total"
              value={stats.total_users || 0}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              title="Free"
              value={stats.free_users || 0}
              color="gray"
            />
            <StatCard
              icon={Crown}
              title="Premium"
              value={stats.premium_users || 0}
              color="yellow"
            />
            <StatCard
              icon={Heart}
              title="Familia"
              value={stats.family_users || 0}
              color="pink"
            />
            <StatCard
              icon={Shield}
              title="Admin"
              value={stats.admin_users || 0}
              color="purple"
            />
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="family">Familia</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Usuarios ({filteredUsers.length})
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
                    Plan Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.user_id}
                    user={user}
                    onChangeSubscription={changeUserSubscription}
                    onEditUser={(user) => {
                      setSelectedUser(user);
                      setShowPromoteModal(true);
                    }}
                    actionLoading={actionLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de promoción */}
        {showPromoteModal && (
          <PromoteModal
            user={selectedUser}
            onClose={() => {
              setShowPromoteModal(false);
              setSelectedUser(null);
            }}
            onConfirm={changeUserSubscription}
            loading={actionLoading.includes('change-')}
          />
        )}
      </div>
    </div>
  );
};

// Componente para cada fila de usuario
const UserRow = ({ user, onChangeSubscription, onEditUser, actionLoading }) => {
  const isChanging = actionLoading === `change-${user.users?.email}`;

  const getSubscriptionBadge = () => {
    const configs = {
      free: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', text: 'Free', icon: null },
      premium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', text: 'Premium', icon: Crown },
      family: { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200', text: 'Familia', icon: Heart },
      admin: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', text: 'Admin', icon: Shield }
    };
    
    const config = configs[user.subscription_type] || configs.free;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {config.text}
        {user.is_early_bird && user.subscription_type === 'premium' && ' 🌟'}
      </span>
    );
  };

  const formatPrice = () => {
    if (user.subscription_type === 'family') return 'GRATIS';
    if (user.subscription_type === 'free') return '-';
    if (user.price_paid === 0) return 'S/ 0.00';
    return `S/ ${parseFloat(user.price_paid || 0).toFixed(2)}`;
  };

  return (
    <tr className={isChanging ? 'opacity-50' : ''}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Avatar
              avatar={user.profile?.avatar || 'person-1'}
              avatarColor={user.profile?.avatar_color || '#8B5CF6'}
              displayName={user.profile?.display_name || user.users?.email}
              size="md"
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user.profile?.display_name || (user.user_email || user.users?.email)?.split('@')[0] || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user.user_email || user.users?.email || 'N/A'}
            </div>
            {user.notes && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Nota: {user.notes}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getSubscriptionBadge()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <div className="font-medium">{formatPrice()}</div>
        {user.billing_period && (
          <div className="text-xs text-gray-500">
            {user.billing_period === 'monthly' ? 'mensual' : 'anual'}
          </div>
        )}
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
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <button
          onClick={() => onEditUser(user)}
          disabled={isChanging}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors inline-flex items-center"
        >
          {isChanging ? (
            <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
          ) : (
            <>
              <Edit3 className="w-3 h-3 mr-1" />
              Cambiar Plan
            </>
          )}
        </button>
      </td>
    </tr>
  );
};

// Modal para promocionar usuarios
const PromoteModal = ({ user, onClose, onConfirm, loading }) => {
  const [selectedPlan, setSelectedPlan] = useState(user?.subscription_type || 'free');
  const [isEarlyBird, setIsEarlyBird] = useState(user?.is_early_bird || false);
  const [billingPeriod, setBillingPeriod] = useState(user?.billing_period || 'monthly');
  const [notes, setNotes] = useState(user?.notes || '');

  const plans = [
    {
      id: 'free',
      name: 'Plan Free',
      description: '30 transacciones/mes, límites básicos',
      price: 0,
      icon: TrendingUp,
      color: 'text-gray-600'
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      description: 'Acceso completo sin límites',
      price: isEarlyBird ? 5 : 15,
      icon: Crown,
      color: 'text-yellow-600'
    },
    {
      id: 'family',
      name: 'Plan Familia',
      description: 'Acceso Premium GRATIS para familiares',
      price: 0,
      icon: Heart,
      color: 'text-pink-600'
    },
    {
      id: 'admin',
      name: 'Administrador',
      description: 'Control total del sistema',
      price: 0,
      icon: Shield,
      color: 'text-purple-600'
    }
  ];

  const handleConfirm = () => {
    const price = selectedPlan === 'premium' ? (isEarlyBird ? 5 : 15) : 0;
    const userEmail = user.users?.email || user.user_email;
    
    console.log('DEBUG - user object:', user);
    console.log('DEBUG - user.users?.email:', user.users?.email);
    console.log('DEBUG - user.user_email:', user.user_email);
    console.log('DEBUG - final userEmail:', userEmail);
    
    onConfirm(userEmail, selectedPlan, {
      price,
      billing_period: selectedPlan === 'premium' ? billingPeriod : null,
      is_early_bird: selectedPlan === 'premium' ? isEarlyBird : false,
      notes: selectedPlan === 'family' ? notes : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cambiar Plan de Usuario
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {user?.users?.email}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Selección de plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Seleccionar Plan:
            </label>
            <div className="grid grid-cols-1 gap-3">
              {plans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <label key={plan.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlan === plan.id}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      selectedPlan === plan.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${plan.color}`} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {plan.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {plan.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {plan.price === 0 ? 'GRATIS' : `S/ ${plan.price}`}
                          </div>
                          {plan.id === 'premium' && (
                            <div className="text-xs text-gray-500">
                              por mes
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Opciones Premium */}
          {selectedPlan === 'premium' && (
            <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isEarlyBird}
                    onChange={(e) => setIsEarlyBird(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Early Bird (S/ 5 en lugar de S/ 15) 🌟
                  </span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Período de facturación:
                </label>
                <select
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual (descuento)</option>
                </select>
              </div>
            </div>
          )}

          {/* Notas para familia */}
          {selectedPlan === 'family' && (
            <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Relación familiar (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Esposa, Hermano, Hijo, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 inline-flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2"></div>
                Cambiando...
              </>
            ) : (
              'Confirmar Cambio'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para estadísticas
const StatCard = ({ icon: Icon, title, value, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-700',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    pink: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="ml-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPanel;