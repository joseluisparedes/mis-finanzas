import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, Eye, Ban, Trash2, RotateCcw, 
  AlertTriangle, CheckCircle, Clock, Shield, Activity, Calendar,
  FileDown, MoreVertical, UserX, UserCheck, Database, History, ArrowDown
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useUserSubscription, useAdminFunctions } from '../../hooks/useUserSubscription';
import Avatar from '../common/Avatar';
import * as XLSX from 'xlsx';

const AdvancedUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { supabaseClient } = useSupabaseData();
  const { isAdmin } = useUserSubscription();
  const { getAllSubscriptions, getSubscriptionStats } = useAdminFunctions();

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

  // Cargar datos iniciales
  useEffect(() => {
    loadUsersData();
    loadSystemStats();
  }, []);

  // Filtrar usuarios cuando cambian los filtros
  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, subscriptionFilter]);

  const loadUsersData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading users data for AdvancedUserManagement...');
      // Usar el mismo método que funciona en AdminPanel
      const data = await getAllSubscriptions();
      console.log('✅ Users data loaded:', data);
      console.log('📊 Number of users found:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('👤 First user sample:', data[0]);
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('❌ Error loading users in AdvancedUserManagement:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      console.log('🔄 Loading system stats...');
      // Usar el mismo método que funciona en AdminPanel
      const stats = await getSubscriptionStats();
      console.log('✅ System stats loaded:', stats);
      
      // Adaptar formato si es necesario
      const adaptedStats = {
        total_users: stats?.total_users || 0,
        active_users: stats?.active_users || 0,
        free_users: stats?.free_users || 0,
        premium_users: stats?.premium_users || 0,
        admin_users: stats?.admin_users || 0,
        suspended_users: stats?.suspended_users || 0
      };
      
      setSystemStats(adaptedStats);
    } catch (error) {
      console.error('❌ Error loading system stats:', error);
      // Fallback stats
      setSystemStats({
        total_users: 0,
        active_users: 0,
        free_users: 0,
        premium_users: 0,
        admin_users: 0,
        suspended_users: 0
      });
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user =>
        (user.user_email || user.users?.email)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Filtro por suscripción
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => user.subscription_type === subscriptionFilter);
    }

    setFilteredUsers(filtered);
  };

  const suspendUser = async (userId, userEmail) => {
    setActionLoading(true);
    try {
      // Intentar usar la función RPC, si falla usar método directo
      try {
        const { error } = await supabaseClient.rpc('suspend_user_account', {
          target_user_id: userId,
          admin_reason: 'Suspensión administrativa'
        });
        
        if (error) throw error;
      } catch (rpcError) {
        // Método alternativo
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({ status: 'suspended' })
          .eq('user_id', userId);
          
        if (error) throw error;
      }

      await loadUsersData();
      await loadSystemStats();
      
      alert(`Usuario ${userEmail} suspendido exitosamente`);
    } catch (error) {
      console.error('Error suspending user:', error);
      alert(`Error al suspender usuario: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const restoreUser = async (userId, userEmail) => {
    setActionLoading(true);
    try {
      // Intentar usar la función RPC, si falla usar método directo
      try {
        const { error } = await supabaseClient.rpc('restore_user_account', {
          target_user_id: userId,
          admin_reason: 'Restauración administrativa'
        });
        
        if (error) throw error;
      } catch (rpcError) {
        // Método alternativo
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .update({ status: 'active' })
          .eq('user_id', userId);
          
        if (error) throw error;
      }

      await loadUsersData();
      await loadSystemStats();
      
      alert(`Usuario ${userEmail} restaurado exitosamente`);
    } catch (error) {
      console.error('Error restoring user:', error);
      alert(`Error al restaurar usuario: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const degradeUser = async (userId, userEmail) => {
    setActionLoading(true);
    try {
      console.log('🔄 Iniciando degradación atómica para:', userId, userEmail);
      
      // Usar la función atómica segura
      const { data, error } = await supabaseClient.rpc('safe_degrade_user', {
        target_user_id: userId
      });
      
      if (error) throw error;

      console.log('✅ Resultado de degradación:', data);
      
      // Verificar estado admin después de la operación
      const { data: adminStatus } = await supabaseClient.rpc('verify_admin_status');
      console.log('👤 Estado admin después:', adminStatus);

      // Mostrar resultado detallado
      alert(`${data}\n\nEstado admin: ${adminStatus}`);

      await loadUsersData();
      await loadSystemStats();
      
    } catch (error) {
      console.error('❌ Error en degradación atómica:', error);
      alert(`Error al degradar usuario: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const exportUserData = async (userId, userEmail) => {
    setActionLoading(true);
    try {
      // Obtener datos completos del usuario
      const { data: userData, error } = await supabaseClient
        .from('user_subscriptions')
        .select(`
          *,
          users:user_id (*)
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Obtener transacciones del usuario
      const { data: expenses } = await supabaseClient
        .from('expenses')
        .select('*')
        .eq('user_id', userId);

      const { data: income } = await supabaseClient
        .from('income')
        .select('*')
        .eq('user_id', userId);

      // Crear workbook de Excel
      const wb = XLSX.utils.book_new();

      // Hoja de información del usuario
      const userInfo = [
        ['Campo', 'Valor'],
        ['ID de Usuario', userData.user_id],
        ['Email', userData.user_email || userData.users?.email || 'N/A'],
        ['Tipo de Suscripción', userData.subscription_type],
        ['Estado', userData.status],
        ['Fecha de Registro', userData.created_at],
        ['Última Actualización', userData.updated_at]
      ];
      
      const wsUser = XLSX.utils.aoa_to_sheet(userInfo);
      XLSX.utils.book_append_sheet(wb, wsUser, 'Información Usuario');

      // Hoja de gastos
      if (expenses && expenses.length > 0) {
        const wsExpenses = XLSX.utils.json_to_sheet(expenses);
        XLSX.utils.book_append_sheet(wb, wsExpenses, 'Gastos');
      }

      // Hoja de ingresos
      if (income && income.length > 0) {
        const wsIncome = XLSX.utils.json_to_sheet(income);
        XLSX.utils.book_append_sheet(wb, wsIncome, 'Ingresos');
      }

      // Descargar archivo
      const fileName = `usuario_${userEmail}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`Datos de ${userEmail} exportados exitosamente`);
    } catch (error) {
      console.error('Error exporting user data:', error);
      alert(`Error al exportar datos: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const exportAllUsers = async () => {
    setActionLoading(true);
    try {
      const wb = XLSX.utils.book_new();

      // Hoja de estadísticas del sistema
      if (systemStats) {
        const statsData = [
          ['Métrica', 'Valor'],
          ['Total de Usuarios', systemStats.total_users],
          ['Usuarios Activos', systemStats.active_users],
          ['Usuarios Free', systemStats.free_users],
          ['Usuarios Premium', systemStats.premium_users],
          ['Usuarios Admin', systemStats.admin_users],
          ['Usuarios Suspendidos', systemStats.suspended_users]
        ];
        
        const wsStats = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas Sistema');
      }

      // Hoja de todos los usuarios
      const usersData = users.map(user => ({
        'ID': user.user_id,
        'Email': user.user_email || user.users?.email || 'N/A',
        'Suscripción': user.subscription_type,
        'Estado': user.status,
        'Fecha Registro': user.created_at,
        'Última Actualización': user.updated_at
      }));

      const wsUsers = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(wb, wsUsers, 'Todos los Usuarios');

      // Descargar archivo
      const fileName = `reporte_sistema_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert('Reporte del sistema exportado exitosamente');
    } catch (error) {
      console.error('Error exporting system report:', error);
      alert(`Error al exportar reporte: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión Avanzada de Usuarios
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Panel completo de administración con todas las funcionalidades
              </p>
            </div>
          </div>
          
          <button
            onClick={exportAllUsers}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Todo</span>
          </button>
        </div>

        {/* Estadísticas del sistema */}
        {systemStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon={Users}
              title="Total"
              value={systemStats.total_users}
              color="blue"
            />
            <StatCard
              icon={CheckCircle}
              title="Activos"
              value={systemStats.active_users}
              color="green"
            />
            <StatCard
              icon={Activity}
              title="Free"
              value={systemStats.free_users}
              color="gray"
            />
            <StatCard
              icon={Shield}
              title="Premium"
              value={systemStats.premium_users}
              color="yellow"
            />
            <StatCard
              icon={Shield}
              title="Admin"
              value={systemStats.admin_users}
              color="purple"
            />
            <StatCard
              icon={Ban}
              title="Suspendidos"
              value={systemStats.suspended_users}
              color="red"
            />
          </div>
        )}
      </div>

      {/* Controles de filtrado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
          </select>

          {/* Filtro por suscripción */}
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todas las suscripciones</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Usuarios ({filteredUsers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Suscripción
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
                <UserRowAdvanced
                  key={user.user_id}
                  user={user}
                  onSuspend={suspendUser}
                  onRestore={restoreUser}
                  onExport={exportUserData}
                  onDegrade={degradeUser}
                  isLoading={actionLoading}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron usuarios con los filtros aplicados
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para cada fila de usuario avanzada
const UserRowAdvanced = ({ user, onSuspend, onRestore, onExport, onDegrade, isLoading }) => {
  const userEmail = user.user_email || user.users?.email || 'N/A';
  const isActive = user.status === 'active';
  const isSuspended = user.status === 'suspended';

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
      </span>
    );
  };

  const getStatusBadge = () => {
    const config = {
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', text: 'Activo' },
      suspended: { color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', text: 'Suspendido' },
      inactive: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', text: 'Inactivo' }
    };
    
    const { color, text } = config[user.status] || config.inactive;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        {text}
      </span>
    );
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Avatar email={userEmail} size="sm" />
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {userEmail}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ID: {user.user_id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getSubscriptionBadge()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {new Date(user.created_at).toLocaleDateString('es-ES')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
        {/* Botón de exportar */}
        <button
          onClick={() => onExport(user.user_id, userEmail)}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
          title="Exportar datos del usuario"
        >
          <Download className="w-3 h-3" />
        </button>

        {/* Botón de degradar a usuario gratuito */}
        {isActive && user.subscription_type !== 'free' && user.subscription_type !== 'admin' && (
          <button
            onClick={() => onDegrade(user.user_id, userEmail)}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            title="Degradar a plan gratuito"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
        )}

        {/* Botón de suspender/restaurar */}
        {isActive && (
          <button
            onClick={() => onSuspend(user.user_id, userEmail)}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            title="Suspender usuario"
          >
            <Ban className="w-3 h-3" />
          </button>
        )}

        {isSuspended && (
          <button
            onClick={() => onRestore(user.user_id, userEmail)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            title="Restaurar usuario"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </td>
    </tr>
  );
};

// Componente para tarjetas de estadísticas
const StatCard = ({ icon: Icon, title, value, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-700',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value || 0}</p>
        </div>
      </div>
    </div>
  );
};

export default AdvancedUserManagement;