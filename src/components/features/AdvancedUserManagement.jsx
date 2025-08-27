import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, Eye, Ban, Trash2, RotateCcw, 
  AlertTriangle, CheckCircle, Clock, Shield, Activity, Calendar,
  FileDown, MoreVertical, UserX, UserCheck, Database, History
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { useUserSubscription } from '../../hooks/useUserSubscription';
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
      const { data, error } = await supabaseClient.rpc('get_users_detailed_admin');
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const { data, error } = await supabaseClient.rpc('get_system_admin_stats');
      
      if (error) throw error;
      
      // Convertir array de stats a objeto
      const statsObject = {};
      data.forEach(stat => {
        statsObject[stat.stat_name] = {
          value: stat.stat_value,
          percentage: stat.stat_percentage,
          metadata: stat.stat_metadata
        };
      });
      
      setSystemStats(statsObject);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrar por estado de cuenta
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active': return user.account_status === 'active' && !user.is_suspended;
          case 'suspended': return user.is_suspended;
          case 'deleted': return user.is_deleted;
          default: return true;
        }
      });
    }

    // Filtrar por tipo de suscripción
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => user.subscription_type === subscriptionFilter);
    }

    setFilteredUsers(filtered);
  };

  const loadUserDetails = async (userId) => {
    try {
      const { data, error } = await supabaseClient.rpc('get_user_complete_details', { p_user_id: userId });
      
      if (error) throw error;
      
      setSelectedUser(data[0]);
      setShowUserDetails(true);
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Error al cargar detalles del usuario');
    }
  };

  const suspendUser = async (userId, reason) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc('suspend_user_account', {
        p_user_id: userId,
        p_reason: reason,
        p_admin_id: (await supabaseClient.auth.getUser()).data.user.id
      });
      
      if (error) throw error;
      
      alert('Usuario suspendido exitosamente');
      loadUsersData();
      setShowConfirmDialog(null);
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Error al suspender usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const restoreUser = async (userId) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc('restore_user_account', {
        p_user_id: userId,
        p_admin_id: (await supabaseClient.auth.getUser()).data.user.id
      });
      
      if (error) throw error;
      
      alert('Usuario restaurado exitosamente');
      loadUsersData();
      setShowConfirmDialog(null);
    } catch (error) {
      console.error('Error restoring user:', error);
      alert('Error al restaurar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId, reason) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc('soft_delete_user_account', {
        p_user_id: userId,
        p_reason: reason,
        p_admin_id: (await supabaseClient.auth.getUser()).data.user.id
      });
      
      if (error) throw error;
      
      alert('Usuario eliminado exitosamente');
      loadUsersData();
      setShowConfirmDialog(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const exportUserData = async (userId, userEmail) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc('get_user_complete_data_export', {
        p_user_id: userId
      });
      
      if (error) throw error;
      
      // Crear workbook de Excel
      const wb = XLSX.utils.book_new();
      
      // Agregar cada tipo de dato como una hoja separada
      data.forEach(item => {
        const sheetData = [];
        
        if (item.data_type === 'user_profile') {
          // Datos del perfil
          sheetData.push(item.data_json);
        } else if (Array.isArray(item.data_json)) {
          // Arrays de datos (expenses, income, etc.)
          sheetData.push(...item.data_json);
        } else if (item.data_json) {
          // Otros datos JSON
          sheetData.push(item.data_json);
        }
        
        if (sheetData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(wb, ws, item.data_type);
        }
      });
      
      // Descargar archivo
      const fileName = `usuario_${userEmail.split('@')[0]}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error exporting user data:', error);
      alert('Error al exportar datos del usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (user) => {
    if (user.is_deleted) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Eliminado</span>;
    }
    if (user.is_suspended) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Suspendido</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Activo</span>;
  };

  const getSubscriptionBadge = (type) => {
    const badges = {
      free: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Gratis' },
      premium: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-400', label: 'Premium' },
      premium_early_bird: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'Premium EB' },
      admin: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Admin' }
    };
    
    const badge = badges[type] || badges.free;
    return <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión Avanzada de Usuarios</h2>
            <p className="text-gray-600 dark:text-gray-400">Administración completa con auditoría y exportación</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadUsersData}
              className="p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              <Database className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Estadísticas del sistema */}
        {systemStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {systemStats.total_users?.value || 0}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Usuarios</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {systemStats.active_users_30d?.value || 0}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Activos (30d)</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {systemStats.premium_users?.value || 0}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Premium</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {systemStats.suspended_accounts?.value || 0}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">Suspendidos</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
            <option value="deleted">Eliminados</option>
          </select>
          
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todas las suscripciones</option>
            <option value="free">Gratis</option>
            <option value="premium">Premium</option>
            <option value="premium_early_bird">Premium Early Bird</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Suscripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actividad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Datos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Avatar 
                        src={user.avatar_url} 
                        alt={user.full_name || user.email} 
                        size="w-10 h-10"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.full_name || user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSubscriptionBadge(user.subscription_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div>Última: {formatDate(user.last_activity)}</div>
                    <div>{user.total_actions || 0} acciones</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div>Gastos: {user.total_expenses || 0}</div>
                    <div>Ingresos: {user.total_income || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Ver detalles */}
                      <button
                        onClick={() => loadUserDetails(user.user_id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {/* Exportar datos */}
                      <button
                        onClick={() => exportUserData(user.user_id, user.email)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="Exportar datos"
                        disabled={actionLoading}
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      
                      {/* Acciones de administración */}
                      {!user.is_deleted && (
                        <>
                          {user.is_suspended ? (
                            <button
                              onClick={() => setShowConfirmDialog({ type: 'restore', user })}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="Restaurar cuenta"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowConfirmDialog({ type: 'suspend', user })}
                              className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                              title="Suspender cuenta"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => setShowConfirmDialog({ type: 'delete', user })}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Modal de detalles de usuario */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal 
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Modal de confirmación */}
      {showConfirmDialog && (
        <ConfirmationModal 
          dialog={showConfirmDialog}
          onConfirm={(reason) => {
            const { type, user } = showConfirmDialog;
            if (type === 'suspend') {
              suspendUser(user.user_id, reason);
            } else if (type === 'restore') {
              restoreUser(user.user_id);
            } else if (type === 'delete') {
              deleteUser(user.user_id, reason);
            }
          }}
          onCancel={() => setShowConfirmDialog(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

// Componente para detalles de usuario
const UserDetailsModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalles del Usuario</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Información Personal</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Nombre:</strong> {user.full_name || 'No especificado'}</div>
                <div><strong>Registrado:</strong> {new Date(user.created_at).toLocaleDateString('es-ES')}</div>
                <div><strong>Último acceso:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-ES') : 'Nunca'}</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Suscripción</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Tipo:</strong> {user.subscription_type}</div>
                <div><strong>Estado:</strong> {user.subscription_status}</div>
                <div><strong>Expira:</strong> {user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('es-ES') : 'Sin expiración'}</div>
              </div>
            </div>
          </div>

          {/* Estadísticas financieras */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Estadísticas Financieras</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{user.total_expenses || 0}</div>
                <div className="text-sm text-red-600 dark:text-red-400">Gastos</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{user.total_income || 0}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Ingresos</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{user.total_budgets || 0}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Presupuestos</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{user.total_actions || 0}</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Acciones</div>
              </div>
            </div>
          </div>

          {/* Estado de cuenta */}
          {(user.account_status !== 'active' || user.is_suspended || user.is_deleted) && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Estado de Cuenta</h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-sm space-y-1">
                  <div><strong>Estado:</strong> {user.account_status}</div>
                  {user.suspension_reason && <div><strong>Motivo suspensión:</strong> {user.suspension_reason}</div>}
                  {user.suspended_at && <div><strong>Suspendido en:</strong> {new Date(user.suspended_at).toLocaleString('es-ES')}</div>}
                  {user.deleted_reason && <div><strong>Motivo eliminación:</strong> {user.deleted_reason}</div>}
                  {user.deleted_at && <div><strong>Eliminado en:</strong> {new Date(user.deleted_at).toLocaleString('es-ES')}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Actividad de seguridad */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Actividad y Seguridad</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div><strong>Sesiones activas:</strong> {user.current_active_sessions || 0}</div>
                <div><strong>Total sesiones:</strong> {user.total_sessions || 0}</div>
                <div><strong>Acciones (30 días):</strong> {user.actions_last_30_days || 0}</div>
                <div><strong>Acción más común:</strong> {user.most_common_action || 'N/A'}</div>
              </div>
              <div className="space-y-2 text-sm">
                <div><strong>Última IP:</strong> {user.last_ip || 'N/A'}</div>
                <div><strong>Actividad sospechosa:</strong> 
                  <span className={user.suspicious_activity ? 'text-red-600 font-bold' : 'text-green-600'}>
                    {user.suspicious_activity ? 'SÍ' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para modal de confirmación
const ConfirmationModal = ({ dialog, onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  const { type, user } = dialog;
  
  const titles = {
    suspend: 'Suspender Usuario',
    restore: 'Restaurar Usuario',
    delete: 'Eliminar Usuario'
  };
  
  const messages = {
    suspend: `¿Estás seguro que quieres suspender la cuenta de ${user.email}?`,
    restore: `¿Estás seguro que quieres restaurar la cuenta de ${user.email}?`,
    delete: `¿Estás seguro que quieres eliminar permanentemente la cuenta de ${user.email}?`
  };
  
  const needsReason = type === 'suspend' || type === 'delete';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {titles[type]}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {messages[type]}
        </p>
        
        {needsReason && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo (requerido):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica el motivo de esta acción..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || (needsReason && !reason.trim())}
            className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
              type === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700' :
              'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedUserManagement;