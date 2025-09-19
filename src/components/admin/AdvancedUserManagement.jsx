import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, Eye, Ban, Trash2, RotateCcw, 
  AlertTriangle, CheckCircle, Clock, Shield, Activity, Calendar,
  FileDown, MoreVertical, UserX, UserCheck, Database, ArrowDown,
  MessageCircle, Mail, Phone
} from 'lucide-react';
import { useUserSubscription, useAdminFunctions } from '../../hooks/useUserSubscription';
import { supabase } from '../../lib/supabase';
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
      
      // Cargar datos de usuarios y estadísticas de contacto en paralelo
      const [usersData, contactStats] = await Promise.all([
        getAllSubscriptions(),
        loadContactStats()
      ]);
      
      console.log('✅ Users data loaded:', usersData);
      console.log('📊 Contact stats loaded:', contactStats);
      
      // Filtrar usuarios que realmente tienen suscripción (no eliminados)
      const validUsers = (usersData || []).filter(user => 
        user && user.user_id && user.subscription_type
      );
      
      // Combinar datos de usuarios con estadísticas de contacto
      const usersWithContactStats = validUsers.map(user => {
        const userStats = contactStats.find(stat => stat.user_id === user.user_id);
        return {
          ...user,
          total_contacts: userStats?.total_contacts || 0,
          email_contacts: userStats?.email_contacts || 0,
          whatsapp_contacts: userStats?.whatsapp_contacts || 0,
          phone_contacts: userStats?.phone_contacts || 0,
          last_contact_date: userStats?.last_contact_date,
          last_contact_method: userStats?.last_contact_method
        };
      });
      
      console.log('📊 Valid users with contact stats:', usersWithContactStats.length);
      
      setUsers(usersWithContactStats);
    } catch (error) {
      console.error('❌ Error loading users in AdvancedUserManagement:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadContactStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_users_contact_stats');
      if (error) {
        console.log('⚠️ No se pudieron cargar estadísticas de contacto:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.log('⚠️ Error cargando estadísticas de contacto:', error);
      return [];
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

  const markUserAsDeleted = async (userId, userEmail) => {
    // Confirmación para marcar como eliminado
    const confirmed = window.confirm(
      `⚠️ DESHABILITAR USUARIO\n\n` +
      `Usuario: ${userEmail}\n\n` +
      `Esta acción:\n` +
      `• Deshabilitará el acceso del usuario\n` +
      `• Mantendrá sus datos guardados\n` +
      `• Se puede reactivar más adelante\n` +
      `• Usuario no podrá usar la aplicación\n\n` +
      `¿Confirmar deshabilitación?`
    );
    
    if (!confirmed) return;
    
    setActionLoading(true);
    try {
      console.log(`🚫 Deshabilitando usuario ${userEmail} (${userId})`);
      
      // Usar función RPC para deshabilitar usuario de forma segura
      const { data, error } = await supabase.rpc('disable_user_admin', {
        target_user_id: userId
      });
        
      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al deshabilitar usuario');
      }

      console.log('✅ Usuario deshabilitado:', data.message);
      
      await loadUsersData();
      await loadSystemStats();
      
      alert(`✅ ${data.message}`);
    } catch (error) {
      console.error('Error deshabilitando usuario:', error);
      alert(`❌ Error al deshabilitar usuario: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const reactivateUser = async (userId, userEmail) => {
    const confirmed = window.confirm(
      `🔄 REACTIVAR USUARIO\n\n` +
      `Usuario: ${userEmail}\n\n` +
      `Esta acción:\n` +
      `• Reactivará el acceso del usuario\n` +
      `• Lo convertirá a plan FREE con datos limpios\n` +
      `• Mantendrá sus datos antiguos guardados\n` +
      `• Usuario podrá usar la aplicación nuevamente\n\n` +
      `¿Confirmar reactivación?`
    );
    
    if (!confirmed) return;
    
    setActionLoading(true);
    try {
      console.log(`🔄 Reactivando usuario ${userEmail} (${userId})`);
      
      // Usar función RPC para reactivar usuario de forma segura
      const { data, error } = await supabase.rpc('reactivate_user_admin', {
        target_user_id: userId
      });
        
      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al reactivar usuario');
      }

      console.log('✅ Usuario reactivado con plan FREE:', data.message);
      
      await loadUsersData();
      await loadSystemStats();
      
      alert(`✅ Usuario ${userEmail} reactivado con plan FREE. Puede usar la aplicación nuevamente.`);
    } catch (error) {
      console.error('Error reactivando usuario:', error);
      alert(`❌ Error al reactivar usuario: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const degradeUser = async (userId, userEmail) => {
    setActionLoading(true);
    try {
      console.log('🔄 Iniciando degradación atómica para:', userId, userEmail);
      
      // Usar la función atómica segura
      const { data, error } = await supabase.rpc('safe_degrade_user', {
        target_user_id: userId
      });
      
      if (error) throw error;

      console.log('✅ Resultado de degradación:', data);
      
      // Verificar estado admin después de la operación
      const { data: adminStatus } = await supabase.rpc('verify_admin_status');
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
      console.log(`📤 Iniciando exportación completa de datos para usuario: ${userEmail} (${userId})`);

      // Obtener TODOS los datos del usuario en paralelo
      const [
        userData,
        userProfile,
        userSettings,
        expenses,
        incomes,
        categories,
        paymentMethods,
        incomeTypes,
        budgets,
        recurringExpenses,
        userBackups
      ] = await Promise.all([
        // Datos de suscripción
        supabase.from('user_subscriptions').select('*').eq('user_id', userId).single(),

        // Datos del perfil (si existe)
        supabase.from('user_profiles').select('*').eq('user_id', userId).single(),

        // Configuraciones del usuario
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),

        // Transacciones del usuario con información relacionada
        supabase.from('expenses').select(`
          id, amount, description, date, notes, tags, is_recurring, recurring_frequency, created_at, updated_at,
          categories (name, color, icon),
          payment_methods (name, color, icon, payment_type)
        `).eq('user_id', userId).order('date', { ascending: false }),

        supabase.from('incomes').select(`
          id, amount, description, date, notes, tags, is_recurring, recurring_frequency, created_at, updated_at,
          income_types (name, color, icon)
        `).eq('user_id', userId).order('date', { ascending: false }),

        // Configuraciones personalizadas del usuario
        supabase.from('categories').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('payment_methods').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('income_types').select('*').eq('user_id', userId).order('sort_order'),

        // Presupuestos
        supabase.from('budgets').select(`
          id, amount, period, is_active, created_at, updated_at,
          categories (name, color)
        `).eq('user_id', userId),

        // Gastos recurrentes
        supabase.from('recurring_expenses').select(`
          id, description, amount, currency, frequency, next_date, is_active, created_at, updated_at,
          categories (name, color)
        `).eq('user_id', userId),

        // Backups del usuario
        supabase.from('user_backups').select('id, backup_type, file_size, created_at').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      console.log('✅ Datos obtenidos:', {
        userData: userData.data || userData.error,
        userProfile: userProfile.data || userProfile.error,
        userSettings: userSettings.data || userSettings.error,
        expenses: expenses.data?.length || 0,
        incomes: incomes.data?.length || 0,
        categories: categories.data?.length || 0,
        paymentMethods: paymentMethods.data?.length || 0,
        incomeTypes: incomeTypes.data?.length || 0,
        budgets: budgets.data?.length || 0,
        recurringExpenses: recurringExpenses.data?.length || 0,
        userBackups: userBackups.data?.length || 0
      });

      // Verificar que al menos tenemos datos de suscripción
      if (userData.error) throw userData.error;

      // Crear workbook de Excel
      const wb = XLSX.utils.book_new();

      // Hoja de información completa del usuario
      const userInfo = [
        ['CAMPO', 'VALOR'],
        ['=== INFORMACIÓN BÁSICA ===', ''],
        ['ID de Usuario', userData.data?.user_id || 'N/A'],
        ['Email', userEmail || 'N/A'],
        ['Tipo de Suscripción', userData.data?.subscription_type || 'N/A'],
        ['Estado de Suscripción', userData.data?.status || 'N/A'],
        ['Fecha de Registro', userData.data?.created_at || 'N/A'],
        ['Última Actualización', userData.data?.updated_at || 'N/A'],
        ['', ''],
        ['=== DATOS DE SUSCRIPCIÓN ===', ''],
        ['Precio Pagado', userData.data?.price_paid || 'N/A'],
        ['Método de Pago', userData.data?.payment_method || 'N/A'],
        ['Es Early Bird', userData.data?.is_early_bird ? 'Sí' : 'No'],
        ['Fecha Inicio Plan', userData.data?.subscription_start_date || 'N/A'],
        ['Fecha Fin Plan', userData.data?.subscription_end_date || 'N/A'],
        ['Límite Transacciones Mensuales', userData.data?.monthly_transaction_limit || 'N/A'],
        ['Límite de Presupuestos', userData.data?.budget_limit || 'N/A'],
        ['', ''],
        ['=== PERFIL DE USUARIO ===', ''],
        ['Número de Teléfono', userProfile.data?.phone_number || 'N/A'],
        ['Nombre Completo', userProfile.data?.full_name || 'N/A'],
        ['Avatar URL', userProfile.data?.avatar_url || 'N/A'],
        ['', ''],
        ['=== CONFIGURACIONES ===', ''],
        ['Auto Backup', userSettings.data?.auto_backup ? 'Activado' : 'Desactivado'],
        ['Frecuencia de Backup', userSettings.data?.backup_frequency || 'N/A'],
        ['Moneda', userSettings.data?.currency || 'PEN'],
        ['Formato de Fecha', userSettings.data?.date_format || 'YYYY-MM-DD'],
        ['Mostrar Exportación JSON', userSettings.data?.show_json_export ? 'Sí' : 'No'],
        ['Tema', userSettings.data?.theme || 'light'],
        ['Idioma', userSettings.data?.language || 'es'],
        ['', ''],
        ['=== ESTADÍSTICAS ===', ''],
        ['Total de Gastos', expenses.data?.length || 0],
        ['Total de Ingresos', incomes.data?.length || 0],
        ['Categorías Creadas', categories.data?.length || 0],
        ['Métodos de Pago', paymentMethods.data?.length || 0],
        ['Tipos de Ingreso', incomeTypes.data?.length || 0],
        ['Presupuestos Activos', budgets.data?.length || 0],
        ['Gastos Recurrentes', recurringExpenses.data?.length || 0],
        ['Backups Realizados', userBackups.data?.length || 0]
      ];

      const wsUser = XLSX.utils.aoa_to_sheet(userInfo);
      XLSX.utils.book_append_sheet(wb, wsUser, '📋 Info Usuario');

      // Hoja de gastos con formato completo
      if (expenses.data && expenses.data.length > 0) {
        const expensesFormatted = expenses.data.map(expense => ({
          'ID': expense.id,
          'Monto (S/)': expense.amount,
          'Descripción': expense.description,
          'Fecha': expense.date,
          'Categoría': expense.categories?.name || 'Sin categoría',
          'Color Categoría': expense.categories?.color || 'N/A',
          'Método de Pago': expense.payment_methods?.name || 'Sin método',
          'Tipo de Pago': expense.payment_methods?.payment_type || 'N/A',
          'Es Recurrente': expense.is_recurring ? 'Sí' : 'No',
          'Frecuencia': expense.recurring_frequency || 'N/A',
          'Tags': expense.tags ? expense.tags.join(', ') : '',
          'Notas': expense.notes || '',
          'Fecha Creación': expense.created_at,
          'Última Modificación': expense.updated_at
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesFormatted);
        XLSX.utils.book_append_sheet(wb, wsExpenses, '💰 Gastos');
      }

      // Hoja de ingresos con formato completo
      if (incomes.data && incomes.data.length > 0) {
        const incomeFormatted = incomes.data.map(inc => ({
          'ID': inc.id,
          'Monto (S/)': inc.amount,
          'Descripción': inc.description,
          'Fecha': inc.date,
          'Tipo de Ingreso': inc.income_types?.name || 'Sin tipo',
          'Color Tipo': inc.income_types?.color || 'N/A',
          'Es Recurrente': inc.is_recurring ? 'Sí' : 'No',
          'Frecuencia': inc.recurring_frequency || 'N/A',
          'Tags': inc.tags ? inc.tags.join(', ') : '',
          'Notas': inc.notes || '',
          'Fecha Creación': inc.created_at,
          'Última Modificación': inc.updated_at
        }));
        const wsIncome = XLSX.utils.json_to_sheet(incomeFormatted);
        XLSX.utils.book_append_sheet(wb, wsIncome, '📈 Ingresos');
      }

      // Hoja de gastos recurrentes
      if (recurringExpenses.data && recurringExpenses.data.length > 0) {
        const recurringFormatted = recurringExpenses.data.map(rec => ({
          'ID': rec.id,
          'Descripción': rec.description,
          'Monto': rec.amount,
          'Moneda': rec.currency,
          'Frecuencia': rec.frequency,
          'Próxima Fecha': rec.next_date,
          'Categoría': rec.categories?.name || 'Sin categoría',
          'Estado': rec.is_active ? 'Activo' : 'Inactivo',
          'Fecha Creación': rec.created_at,
          'Última Modificación': rec.updated_at
        }));
        const wsRecurring = XLSX.utils.json_to_sheet(recurringFormatted);
        XLSX.utils.book_append_sheet(wb, wsRecurring, '🔄 Gastos Recurrentes');
      }

      // Hoja de presupuestos con información completa
      if (budgets.data && budgets.data.length > 0) {
        const budgetsFormatted = budgets.data.map(budget => ({
          'ID': budget.id,
          'Monto (S/)': budget.amount,
          'Período': budget.period,
          'Categoría': budget.categories?.name || 'Sin categoría',
          'Color Categoría': budget.categories?.color || 'N/A',
          'Estado': budget.is_active ? 'Activo' : 'Inactivo',
          'Fecha Creación': budget.created_at,
          'Última Modificación': budget.updated_at
        }));
        const wsBudgets = XLSX.utils.json_to_sheet(budgetsFormatted);
        XLSX.utils.book_append_sheet(wb, wsBudgets, '🎯 Presupuestos');
      }

      // Hoja de categorías personalizadas
      if (categories.data && categories.data.length > 0) {
        const categoriesFormatted = categories.data.map(cat => ({
          'ID': cat.id,
          'Nombre': cat.name,
          'Color': cat.color,
          'Ícono': cat.icon,
          'Orden': cat.sort_order,
          'Estado': cat.is_active ? 'Activa' : 'Inactiva',
          'Fecha Creación': cat.created_at,
          'Última Modificación': cat.updated_at
        }));
        const wsCategories = XLSX.utils.json_to_sheet(categoriesFormatted);
        XLSX.utils.book_append_sheet(wb, wsCategories, '📂 Categorías');
      }

      // Hoja de métodos de pago personalizados
      if (paymentMethods.data && paymentMethods.data.length > 0) {
        const paymentMethodsFormatted = paymentMethods.data.map(pm => ({
          'ID': pm.id,
          'Nombre': pm.name,
          'Color': pm.color,
          'Ícono': pm.icon,
          'Tipo': pm.payment_type,
          'Día Cierre (TC)': pm.cc_closing_day || 'N/A',
          'Día Pago (TC)': pm.cc_payment_day || 'N/A',
          'Orden': pm.sort_order,
          'Estado': pm.is_active ? 'Activo' : 'Inactivo',
          'Fecha Creación': pm.created_at,
          'Última Modificación': pm.updated_at
        }));
        const wsPaymentMethods = XLSX.utils.json_to_sheet(paymentMethodsFormatted);
        XLSX.utils.book_append_sheet(wb, wsPaymentMethods, '💳 Métodos de Pago');
      }

      // Hoja de tipos de ingreso personalizados
      if (incomeTypes.data && incomeTypes.data.length > 0) {
        const incomeTypesFormatted = incomeTypes.data.map(it => ({
          'ID': it.id,
          'Nombre': it.name,
          'Color': it.color,
          'Ícono': it.icon,
          'Orden': it.sort_order,
          'Estado': it.is_active ? 'Activo' : 'Inactivo',
          'Fecha Creación': it.created_at,
          'Última Modificación': it.updated_at
        }));
        const wsIncomeTypes = XLSX.utils.json_to_sheet(incomeTypesFormatted);
        XLSX.utils.book_append_sheet(wb, wsIncomeTypes, '📊 Tipos de Ingreso');
      }

      // Hoja de configuraciones detalladas
      if (userSettings.data) {
        const settingsData = [
          ['CONFIGURACIÓN', 'VALOR', 'DESCRIPCIÓN'],
          ['Auto Backup', userSettings.data.auto_backup ? 'Activado' : 'Desactivado', 'Backup automático de datos'],
          ['Frecuencia Backup', userSettings.data.backup_frequency, 'Con qué frecuencia se realiza backup'],
          ['Moneda', userSettings.data.currency, 'Moneda principal del usuario'],
          ['Formato Fecha', userSettings.data.date_format, 'Formato preferido para fechas'],
          ['Exportación JSON', userSettings.data.show_json_export ? 'Habilitado' : 'Deshabilitado', 'Mostrar opción de exportar JSON'],
          ['Tema', userSettings.data.theme, 'Tema visual de la aplicación'],
          ['Idioma', userSettings.data.language, 'Idioma de la interfaz'],
          ['Configurado el', userSettings.data.created_at, 'Fecha de configuración inicial'],
          ['Última actualización', userSettings.data.updated_at, 'Última modificación de configuración']
        ];
        const wsSettings = XLSX.utils.aoa_to_sheet(settingsData);
        XLSX.utils.book_append_sheet(wb, wsSettings, '⚙️ Configuraciones');
      }

      // Hoja de backups realizados
      if (userBackups.data && userBackups.data.length > 0) {
        const backupsFormatted = userBackups.data.map(backup => ({
          'ID': backup.id,
          'Tipo': backup.backup_type,
          'Tamaño (bytes)': backup.file_size || 'N/A',
          'Fecha Backup': backup.created_at
        }));
        const wsBackups = XLSX.utils.json_to_sheet(backupsFormatted);
        XLSX.utils.book_append_sheet(wb, wsBackups, '💾 Historial Backups');
      }

      // Descargar archivo con nombre descriptivo
      const timestamp = new Date().toISOString().split('T')[0];
      const cleanEmail = userEmail.replace('@', '_').replace('.', '_');
      const fileName = `MisFinanzas_ExportCompleto_${cleanEmail}_${timestamp}.xlsx`;

      console.log(`💾 Descargando archivo: ${fileName}`);
      XLSX.writeFile(wb, fileName);

      // Mostrar resumen de exportación
      const exportSummary = `
✅ EXPORTACIÓN COMPLETA REALIZADA

👤 Usuario: ${userEmail}
📅 Fecha: ${timestamp}
📁 Archivo: ${fileName}

📊 DATOS EXPORTADOS:
• Información y configuración del usuario
• ${expenses.data?.length || 0} gastos
• ${incomes.data?.length || 0} ingresos
• ${recurringExpenses.data?.length || 0} gastos recurrentes
• ${budgets.data?.length || 0} presupuestos
• ${categories.data?.length || 0} categorías personalizadas
• ${paymentMethods.data?.length || 0} métodos de pago
• ${incomeTypes.data?.length || 0} tipos de ingreso
• ${userBackups.data?.length || 0} backups previos

💡 El archivo contiene TODOS los datos del usuario organizados en hojas separadas.
      `.trim();

      alert(exportSummary);

      console.log('✅ Exportación de datos completa finalizada para:', userEmail);
    } catch (error) {
      console.error('❌ Error exportando datos del usuario:', error);
      alert(`❌ Error al exportar datos: ${error.message}`);
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
            <option value="family">Family</option>
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
                  Contacto
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
                  onDelete={markUserAsDeleted}
                  onReactivate={reactivateUser}
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
const UserRowAdvanced = ({ user, onDelete, onReactivate, onExport, onDegrade, isLoading }) => {
  const userEmail = user.user_email || user.users?.email || 'N/A';
  const isActive = user.status === 'active';
  const isSuspended = user.status === 'suspended';
  const isDeleted = user.status === 'deleted';

  const handlePhoneUpdate = async (userId, phoneNumber) => {
    try {
      console.log(`📱 Actualizando teléfono para usuario ${userId}:`, phoneNumber);
      
      const { data, error } = await supabase.rpc('admin_update_user_phone', {
        target_user_id: userId,
        new_phone_number: phoneNumber.trim() || null
      });
      
      if (error) throw error;
      
      console.log('✅ Teléfono actualizado:', data.message);
      // No necesitamos recargar toda la página, solo mostrar confirmación sutil
    } catch (error) {
      console.error('❌ Error actualizando teléfono:', error);
      alert(`Error actualizando teléfono: ${error.message}`);
    }
  };

  const handleContactLog = async (userId, method) => {
    try {
      const { data, error } = await supabase.rpc('log_admin_contact', {
        target_user_id: userId,
        contact_method: method,
        contact_reason: `Contacto directo via ${method}`
      });
      
      if (error) throw error;
      
      console.log(`📞 Contacto registrado: ${method} para usuario ${userId}`);
    } catch (error) {
      console.error('❌ Error registrando contacto:', error);
    }
  };

  const getSubscriptionBadge = (user) => {
    // Debug temporal
    console.log('🐛 User subscription data:', {
      user_id: user.user_id,
      subscription_type: user.subscription_type,
      type: user.type,
      is_early_bird: user.is_early_bird,
      full_user: user
    });
    
    const config = {
      free: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', text: 'Free' },
      premium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', text: 'Premium' },
      family: { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200', text: 'Family' },
      admin: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', text: 'Admin' }
    };
    
    const subscriptionType = user.subscription_type || user.type || 'free';
    const { color, text } = config[subscriptionType] || config.free;
    
    // Verificar si es Early Bird
    const isEarlyBird = user.is_early_bird || false;
    const displayText = subscriptionType === 'premium' && isEarlyBird ? 'Premium (Early Bird)' : text;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        {displayText}
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
        {getSubscriptionBadge(user)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        <div className="space-y-1">
          <div className="text-xs flex items-center">
            <span className="font-medium">Email:</span> 
            <span className="ml-1">{userEmail}</span>
            <a
              href={`mailto:${userEmail}`}
              onClick={() => handleContactLog(user.user_id, 'email')}
              className="ml-2 text-blue-600 hover:text-blue-700"
              title="Enviar correo"
            >
              <Mail className="w-3 h-3" />
            </a>
          </div>
          <div className="text-xs flex items-center">
            <span className="font-medium">Celular:</span> 
            <input
              type="text"
              placeholder="Agregar número"
              defaultValue={user.phone_number || ''}
              onBlur={(e) => handlePhoneUpdate(user.user_id, e.target.value)}
              className="ml-2 px-2 py-1 text-xs border border-gray-200 rounded w-24 focus:outline-none focus:border-purple-500"
            />
            {user.phone_number && (
              <a
                href={`https://wa.me/${user.phone_number.replace(/\D/g, '')}`}
                onClick={() => handleContactLog(user.user_id, 'whatsapp')}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-green-600 hover:text-green-700"
                title="Contactar por WhatsApp"
              >
                <MessageCircle className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="text-xs text-gray-400 flex items-center space-x-2">
            <span>Registro: {new Date(user.created_at).toLocaleDateString('es-ES')}</span>
            <span className="text-purple-600 font-medium" title="Contactos registrados">
              📞 {user.total_contacts || 0}
            </span>
          </div>
        </div>
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

        {/* Botón de deshabilitar/reactivar usuario */}
        {isActive && (
          <button
            onClick={() => onDelete(user.user_id, userEmail)}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            title="Deshabilitar usuario"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {isDeleted && (
          <button
            onClick={() => onReactivate(user.user_id, userEmail)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            title="Reactivar usuario"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}

        {isSuspended && (
          <button
            onClick={() => onReactivate(user.user_id, userEmail)}
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