import React, { useState, useEffect } from 'react';
import { PlusCircle, Settings, BarChart3, TrendingUp, TrendingDown, Calendar, CreditCard, Filter, Edit2, Trash2, Save, X, Download, Upload, AlertCircle, Activity, Wifi, WifiOff, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useSupabaseData } from './hooks/useSupabaseData';
import AuthModal from './components/Auth/AuthModal';
import AuthButton from './components/Auth/AuthButton';
import MigrationBanner from './components/Migration/MigrationBanner';
import FinancialDashboard from './components/FinancialDashboard';
import migrationService from './services/migrationService';
import supabaseExcelService from './services/supabaseExcelService';

const AppSupabase = () => {
  // Estados para UI
  const [activeTab, setActiveTab] = useState('gastos');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  
  // Estados para mensajes informativos
  const [expenseError, setExpenseError] = useState('');
  const [incomeError, setIncomeError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Estados para formularios
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: '',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newIncome, setNewIncome] = useState({
    amount: '',
    description: '',
    type: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Estados para filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: '',
    category: ''
  });

  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [trendPeriod, setTrendPeriod] = useState('3');

  // Estados para configuración
  const [showConfig, setShowConfig] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  
  // Estados para modal de exportación
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelections, setExportSelections] = useState({
    expenses: true,
    incomes: true,
    categories: true,
    paymentMethods: true,
    incomeTypes: true,
    metadata: true
  });

  // Estados para migración
  const [migrationLoading, setMigrationLoading] = useState(false);

  // Estados para Balance
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [trendPeriod, setTrendPeriod] = useState('3');
  const [migrationProgress, setMigrationProgress] = useState(null);

  // Hook personalizado para datos con Supabase
  const {
    // Estados
    loading,
    error: dataError,
    user,
    isAuthenticated,
    syncing,
    lastSync,
    
    // Datos
    categories,
    paymentMethods,
    incomeTypes,
    expenses,
    incomes,
    settings,
    
    // Funciones de gastos
    addExpense: addExpenseToData,
    updateExpense,
    deleteExpense: deleteExpenseFromData,
    
    // Funciones de ingresos
    addIncome: addIncomeToData,
    updateIncome,
    deleteIncome: deleteIncomeFromData,
    
    // Funciones de categorías
    addCategory,
    updateCategory,
    deleteCategory,
    
    // Funciones de métodos de pago
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    
    // Funciones de tipos de ingresos
    addIncomeType,
    updateIncomeType,
    deleteIncomeType,
    
    // Funciones de configuración
    updateSettings,
    
    // Funciones de análisis
    getFinancialSummary,
    
    // Funciones de autenticación
    signIn,
    signUp,
    signOut,
    
    // Utilidades
    refreshData,
    clearError
  } = useSupabaseData();

  // Verificar migración al cargar - DESACTIVADO (app 100% Supabase)
  useEffect(() => {
    // Banner de migración desactivado permanentemente
    setShowMigrationBanner(false);
  }, [isAuthenticated]);

  // Función para limpiar mensajes
  const clearMessages = () => {
    setExpenseError('');
    setIncomeError('');
    setSuccessMessage('');
    clearError();
  };

  // Funciones para validar formularios
  const validateExpenseForm = () => {
    clearMessages();
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      setExpenseError('El monto debe ser mayor a 0');
      return false;
    }
    if (!newExpense.description.trim()) {
      setExpenseError('La descripción es obligatoria');
      return false;
    }
    if (!newExpense.category) {
      setExpenseError('Debe seleccionar una categoría');
      return false;
    }
    if (!newExpense.paymentMethod) {
      setExpenseError('Debe seleccionar un método de pago');
      return false;
    }
    return true;
  };

  const validateIncomeForm = () => {
    clearMessages();
    if (!newIncome.amount || parseFloat(newIncome.amount) <= 0) {
      setIncomeError('El monto debe ser mayor a 0');
      return false;
    }
    if (!newIncome.description.trim()) {
      setIncomeError('La descripción es obligatoria');
      return false;
    }
    if (!newIncome.type) {
      setIncomeError('Debe seleccionar un tipo de ingreso');
      return false;
    }
    return true;
  };

  // Funciones para agregar gastos
  const addExpense = async () => {
    if (!validateExpenseForm()) return;
    
    const result = await addExpenseToData(newExpense);
    if (result.success) {
      setNewExpense({
        amount: '',
        description: '',
        category: '',
        paymentMethod: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSuccessMessage('¡Gasto agregado exitosamente!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setExpenseError(result.error || 'Error agregando gasto');
    }
  };

  // Funciones para agregar ingresos
  const addIncome = async () => {
    if (!validateIncomeForm()) return;
    
    const result = await addIncomeToData(newIncome);
    if (result.success) {
      setNewIncome({
        amount: '',
        description: '',
        type: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSuccessMessage('¡Ingreso agregado exitosamente!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setIncomeError(result.error || 'Error agregando ingreso');
    }
  };

  // Funciones para eliminar
  const deleteExpense = async (id) => {
    const result = await deleteExpenseFromData(id);
    if (result.success) {
      setSuccessMessage('Gasto eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setExpenseError(result.error || 'Error eliminando gasto');
    }
  };

  const deleteIncome = async (id) => {
    const result = await deleteIncomeFromData(id);
    if (result.success) {
      setSuccessMessage('Ingreso eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setIncomeError(result.error || 'Error eliminando ingreso');
    }
  };

  // Función para manejar autenticación
  const handleSignIn = async (email, password) => {
    const result = await signIn(email, password);
    if (result.success) {
      setShowAuthModal(false);
    }
    return result;
  };

  const handleSignUp = async (email, password, userData) => {
    const result = await signUp(email, password, userData);
    if (result.success) {
      setShowAuthModal(false);
    }
    return result;
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      setShowMigrationBanner(false);
    }
    return result;
  };

  // Función para migración
  const handleMigration = async () => {
    setMigrationLoading(true);
    try {
      const result = await migrationService.migrateToSupabase((progress) => {
        setMigrationProgress(progress);
      });
      
      if (result.success) {
        setSuccessMessage('¡Migración completada exitosamente!');
        setShowMigrationBanner(false);
        await refreshData();
      } else {
        setExpenseError(result.error || 'Error en la migración');
      }
    } catch (error) {
      setExpenseError('Error durante la migración: ' + error.message);
    } finally {
      setMigrationLoading(false);
      setMigrationProgress(null);
    }
  };

  // Función para importar archivo
  const handleImportFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const result = await supabaseExcelService.importFromExcel(file, {
          updateExisting: false
        });
        
        if (result.success) {
          setSuccessMessage('Datos importados desde Excel exitosamente');
          await refreshData();
        } else {
          setExpenseError(result.error || 'Error importando datos de Excel');
        }
      } else {
        setExpenseError('Solo se admiten archivos Excel (.xlsx, .xls)');
      }
    } catch (error) {
      setExpenseError('Error procesando archivo: ' + error.message);
    }
    
    event.target.value = '';
    setTimeout(() => {
      setSuccessMessage('');
      setExpenseError('');
    }, 5000);
  };

  // Función para exportar datos a Excel
  const handleConfirmExport = async () => {
    try {
      const result = await supabaseExcelService.exportToExcel(exportSelections);
      if (result.success) {
        setSuccessMessage(`Datos exportados exitosamente: ${result.fileName}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setExpenseError(result.error || 'Error exportando datos a Excel');
        setTimeout(() => setExpenseError(''), 3000);
      }
    } catch (error) {
      setExpenseError('Error exportando: ' + error.message);
      setTimeout(() => setExpenseError(''), 3000);
    }
    setShowExportModal(false);
  };

  // Función para descargar plantilla Excel
  const handleDownloadTemplate = async () => {
    try {
      const result = await supabaseExcelService.exportToExcel({
        expenses: false,
        incomes: false,
        categories: true,
        paymentMethods: true,
        incomeTypes: true,
        metadata: true
      });
      
      if (result.success) {
        setSuccessMessage('Plantilla Excel descargada exitosamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setExpenseError('Error descargando plantilla');
        setTimeout(() => setExpenseError(''), 3000);
      }
    } catch (error) {
      setExpenseError('Error: ' + error.message);
      setTimeout(() => setExpenseError(''), 3000);
    }
  };

  // Función para filtrar gastos
  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      if (startDate && expenseDate < startDate) return false;
      if (endDate && expenseDate > endDate) return false;
      if (filters.paymentMethod && expense.payment_method_id !== filters.paymentMethod) return false;
      if (filters.category && expense.category_id !== filters.category) return false;
      
      return true;
    });
  };

  const getFilteredIncomes = () => {
    return incomes.filter(income => {
      const incomeDate = new Date(income.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      if (startDate && incomeDate < startDate) return false;
      if (endDate && incomeDate > endDate) return false;
      
      return true;
    });
  };


  // Función para obtener datos del mes seleccionado
  const getMonthData = () => {
    const [year, month] = reportMonth.split('-');
    const monthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === parseInt(year) && 
             expenseDate.getMonth() === parseInt(month) - 1;
    });
    
    const monthIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getFullYear() === parseInt(year) && 
             incomeDate.getMonth() === parseInt(month) - 1;
    });

    const totalExpenses = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncomes = monthIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const balance = totalIncomes - totalExpenses;

    return { monthExpenses, monthIncomes, totalExpenses, totalIncomes, balance };
  };

  // Función para obtener datos de tendencia
  const getTrendData = () => {
    const months = parseInt(trendPeriod);
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
      });
      
      const monthIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getFullYear() === year && incomeDate.getMonth() === month;
      });
      
      const totalExpenses = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      const totalIncomes = monthIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
      const balance = totalIncomes - totalExpenses;
      
      data.push({
        month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        gastos: totalExpenses,
        ingresos: totalIncomes,
        balance: balance
      });
    }
    
    return data;
  };

  // Calcular datos del mes actual
  const { monthExpenses, monthIncomes, totalExpenses, totalIncomes, balance } = getMonthData();
  const trendData = getTrendData();


  // Función para obtener datos de tendencia financiera
  const getFinancialTrendData = () => {
    const months = parseInt(trendPeriod);
    const trendData = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
      });
      
      const monthIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getFullYear() === year && incomeDate.getMonth() === month;
      });
      
      const totalExpenses = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      const totalIncomes = monthIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
      const balance = totalIncomes - totalExpenses;
      const savingsRate = totalIncomes > 0 ? ((balance / totalIncomes) * 100) : 0;
      
      trendData.push({
        month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        fullMonth: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        ingresos: totalIncomes,
        gastos: totalExpenses,
        balance: balance,
        ahorro: savingsRate
      });
    }
    
    return trendData;
  };

  // Datos para gráficos
  const getChartData = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Datos por categoría
    const categoryData = categories.map(category => ({
      name: category.name,
      value: filteredExpenses
        .filter(expense => expense.category_id === category.id)
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0),
      color: category.color
    })).filter(item => item.value > 0);

    // Datos por método de pago
    const paymentData = paymentMethods.map(method => ({
      name: method.name,
      value: filteredExpenses
        .filter(expense => expense.payment_method_id === method.id)
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0),
      color: method.color
    })).filter(item => item.value > 0);

    // Datos por fecha (últimos 7 días)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayExpenses = filteredExpenses
        .filter(expense => expense.date === dateStr)
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      
      last7Days.push({
        date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        gastos: dayExpenses
      });
    }

    return { categoryData, paymentData, last7Days };
  };

  const { categoryData, paymentData, last7Days } = getChartData();
  const { monthExpenses, monthIncomes, totalExpenses, totalIncomes, balance } = getMonthData();
  const trendData = getFinancialTrendData();

  // Componente para mensajes
  const MessageAlert = ({ message, type = 'success' }) => {
    if (!message) return null;
    
    const bgColor = type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
    const textColor = type === 'error' ? 'text-red-800' : 'text-green-800';
    const iconColor = type === 'error' ? 'text-red-400' : 'text-green-400';
    
    return (
      <div className={`mb-4 p-4 rounded-lg border ${bgColor}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="ml-3">
            <p className={`text-sm ${textColor}`}>{message}</p>
          </div>
        </div>
      </div>
    );
  };

  // Función para obtener gastos por categoría (adaptada para Supabase)
  const getExpensesByCategory = () => {
    return categories.map(category => {
      const categoryExpenses = expenses.filter(
        expense => expense.category_id === category.id
      );
      const total = categoryExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      
      return {
        ...category,
        total,
        count: categoryExpenses.length,
        percentage: expenses.length > 0 ? (categoryExpenses.length / expenses.length) * 100 : 0
      };
    }).filter(category => category.total > 0);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos financieros...</p>
          {syncing && <p className="text-sm text-blue-600">Sincronizando con Supabase...</p>}
          {user && <p className="text-xs text-gray-500 mt-2">Usuario: {user.email}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left">💰 Gestor Financiero</h1>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Indicador de sincronización */}
              {isAuthenticated && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg text-xs">
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                  {lastSync && (
                    <span className="text-gray-500">• {new Date(lastSync).toLocaleTimeString()}</span>
                  )}
                </div>
              )}
              
              {/* Botones de importar/exportar (solo si está autenticado) */}
              {isAuthenticated && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    title="Exportar a Excel"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                  
                  <label className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Importar</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              
              {/* Botón de configuración (solo si está autenticado) */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Settings className="w-4 h-4" />
                  <span>Config</span>
                </button>
              )}
              
              {/* Botón de autenticación */}
              <AuthButton
                isAuthenticated={isAuthenticated}
                user={user}
                onSignIn={() => setShowAuthModal(true)}
                onSignOut={handleSignOut}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Banner de migración */}
        {showMigrationBanner && (
          <MigrationBanner
            hasLocalData={migrationService.hasLocalData()}
            onMigrate={handleMigration}
            onDismiss={() => setShowMigrationBanner(false)}
            loading={migrationLoading}
            isVisible={true}
          />
        )}
        
        {/* Progreso de migración */}
        {migrationProgress && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">{migrationProgress.status}</p>
                <div className="mt-2 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {migrationProgress.current} de {migrationProgress.total} elementos procesados
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Mensajes */}
        {successMessage && <MessageAlert message={successMessage} type="success" />}
        {(dataError || expenseError || incomeError) && (
          <MessageAlert 
            message={dataError || expenseError || incomeError} 
            type="error" 
          />
        )}
        
        
        {/* Contenido principal */}
        {!isAuthenticated ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido!</h2>
                  <p className="text-gray-600">Inicia sesión para gestionar tus finanzas de forma segura en la nube.</p>
                </div>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Iniciar Sesión / Registrarse
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    <p>✓ Datos seguros en la nube</p>
                    <p>✓ Acceso desde cualquier dispositivo</p>
                    <p>✓ Backup automático</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showConfig ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Configuración</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <X className="w-4 h-4" />
                <span>Cerrar</span>
              </button>
            </div>
            {/* Panel de Configuración para Supabase */}
            <div className="space-y-6">
              {/* Información del Usuario */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-500" />
                  Información del Usuario
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Registro</label>
                    <input
                      type="text"
                      value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Gestión de Categorías */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-green-500" />
                  Categorías de Gastos
                </h3>
                
                {/* Agregar nueva categoría */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre de la categoría"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newCategory = {
                            name: e.target.value.trim(),
                            color: '#' + Math.floor(Math.random()*16777215).toString(16),
                            sort_order: categories.length + 1
                          };
                          addCategory(newCategory);
                          e.target.value = '';
                        }
                      }}
                    />
                    <input
                      type="color"
                      defaultValue="#6B7280"
                      className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <button
                      onClick={(e) => {
                        const nameInput = e.target.parentElement.querySelector('input[type="text"]');
                        const colorInput = e.target.parentElement.querySelector('input[type="color"]');
                        if (nameInput.value.trim()) {
                          const newCategory = {
                            name: nameInput.value.trim(),
                            color: colorInput.value,
                            sort_order: categories.length + 1
                          };
                          addCategory(newCategory);
                          nameInput.value = '';
                          colorInput.value = '#6B7280';
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
                
                {/* Lista de categorías */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        {editingCategory === category.id ? (
                          <input
                            type="text"
                            defaultValue={category.name}
                            className="border-none bg-transparent focus:outline-none focus:bg-white focus:border focus:border-blue-500 px-2 py-1 rounded"
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== category.name) {
                                updateCategory(category.id, { name: e.target.value.trim() });
                              }
                              setEditingCategory(null);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{category.name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingCategory(editingCategory === category.id ? null : category.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de eliminar esta categoría?')) {
                              deleteCategory(category.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gestión de Métodos de Pago */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                  Métodos de Pago
                </h3>
                
                {/* Agregar nuevo método */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre del método de pago"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newPaymentMethod = {
                            name: e.target.value.trim(),
                            color: '#' + Math.floor(Math.random()*16777215).toString(16),
                            sort_order: paymentMethods.length + 1
                          };
                          addPaymentMethod(newPaymentMethod);
                          e.target.value = '';
                        }
                      }}
                    />
                    <input
                      type="color"
                      defaultValue="#6B7280"
                      className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <button
                      onClick={(e) => {
                        const nameInput = e.target.parentElement.querySelector('input[type="text"]');
                        const colorInput = e.target.parentElement.querySelector('input[type="color"]');
                        if (nameInput.value.trim()) {
                          const newPaymentMethod = {
                            name: nameInput.value.trim(),
                            color: colorInput.value,
                            sort_order: paymentMethods.length + 1
                          };
                          addPaymentMethod(newPaymentMethod);
                          nameInput.value = '';
                          colorInput.value = '#6B7280';
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
                
                {/* Lista de métodos de pago */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {paymentMethods.map(method => (
                    <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: method.color }}
                        ></div>
                        {editingPayment === method.id ? (
                          <input
                            type="text"
                            defaultValue={method.name}
                            className="border-none bg-transparent focus:outline-none focus:bg-white focus:border focus:border-blue-500 px-2 py-1 rounded"
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== method.name) {
                                updatePaymentMethod(method.id, { name: e.target.value.trim() });
                              }
                              setEditingPayment(null);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{method.name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingPayment(editingPayment === method.id ? null : method.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de eliminar este método de pago?')) {
                              deletePaymentMethod(method.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gestión de Tipos de Ingresos */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                  Tipos de Ingresos
                </h3>
                
                {/* Agregar nuevo tipo */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre del tipo de ingreso"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newIncomeType = {
                            name: e.target.value.trim(),
                            color: '#' + Math.floor(Math.random()*16777215).toString(16),
                            sort_order: incomeTypes.length + 1
                          };
                          addIncomeType(newIncomeType);
                          e.target.value = '';
                        }
                      }}
                    />
                    <input
                      type="color"
                      defaultValue="#10B981"
                      className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <button
                      onClick={(e) => {
                        const nameInput = e.target.parentElement.querySelector('input[type="text"]');
                        const colorInput = e.target.parentElement.querySelector('input[type="color"]');
                        if (nameInput.value.trim()) {
                          const newIncomeType = {
                            name: nameInput.value.trim(),
                            color: colorInput.value,
                            sort_order: incomeTypes.length + 1
                          };
                          addIncomeType(newIncomeType);
                          nameInput.value = '';
                          colorInput.value = '#10B981';
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
                
                {/* Lista de tipos de ingresos */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {incomeTypes.map(type => (
                    <div key={type.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        ></div>
                        {editingIncome === type.id ? (
                          <input
                            type="text"
                            defaultValue={type.name}
                            className="border-none bg-transparent focus:outline-none focus:bg-white focus:border focus:border-blue-500 px-2 py-1 rounded"
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== type.name) {
                                updateIncomeType(type.id, { name: e.target.value.trim() });
                              }
                              setEditingIncome(null);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{type.name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingIncome(editingIncome === type.id ? null : type.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de eliminar este tipo de ingreso?')) {
                              deleteIncomeType(type.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estadísticas de Uso */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
                  Estadísticas de Uso
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                    <div className="text-sm text-gray-600">Categorías</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{paymentMethods.length}</div>
                    <div className="text-sm text-gray-600">Métodos de Pago</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{expenses.length}</div>
                    <div className="text-sm text-gray-600">Gastos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{incomes.length}</div>
                    <div className="text-sm text-gray-600">Ingresos</div>
                  </div>
                </div>
              </div>

              {/* Acciones de Cuenta */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-gray-500" />
                  Acciones de Cuenta
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const result = supabaseExcelService.exportToExcel({
                        expenses: true,
                        incomes: true,
                        categories: true,
                        paymentMethods: true,
                        incomeTypes: true,
                        metadata: true
                      });
                      if (result.success) {
                        setSuccessMessage('Datos exportados exitosamente');
                        setTimeout(() => setSuccessMessage(''), 3000);
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar Todos los Datos</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm('¿Estás seguro de cerrar sesión?')) {
                        handleSignOut();
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation */}
            <nav className="flex flex-wrap bg-white p-1 rounded-lg shadow mb-4 sm:mb-8 overflow-x-auto">
              {[
                { id: 'gastos', label: 'Gastos', icon: TrendingDown },
                { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
                { id: 'balance', label: 'Balance', icon: Calendar },
                { id: 'reportes', label: 'Reportes', icon: BarChart3 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md transition-colors text-sm whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline lg:inline xl:inline">{tab.label}</span>
                </button>
              ))}
            </nav>


            {/* Sección de Gastos */}
            {activeTab === 'gastos' && (
              <div>
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
                    Agregar Nuevo Gasto
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descripción del gasto"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                      <select
                        value={newExpense.paymentMethod}
                        onChange={(e) => setNewExpense({...newExpense, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar método</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2 lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                      <input
                        type="text"
                        value={newExpense.notes || ''}
                        onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notas adicionales"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={addExpense}
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Agregando...' : 'Agregar Gasto'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Lista de Gastos */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Gastos Recientes</h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {expenses.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay gastos registrados</p>
                        <p className="text-sm">Agrega tu primer gasto usando el formulario de arriba</p>
                      </div>
                    ) : (
                      expenses.slice(0, 10).map(expense => {
                        const category = categories.find(c => c.id === expense.category_id);
                        const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
                        
                        return (
                          <div key={expense.id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category?.color || '#6B7280' }}
                                  ></div>
                                  <div>
                                    <p className="font-medium text-gray-900">{expense.description}</p>
                                    <p className="text-sm text-gray-500">
                                      {category?.name} • {paymentMethod?.name} • {new Date(expense.date).toLocaleDateString()}
                                    </p>
                                    {expense.notes && (
                                      <p className="text-sm text-gray-400 mt-1">{expense.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-semibold text-red-600">
                                  -${Number(expense.amount).toFixed(2)}
                                </span>
                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {expenses.length > 10 && (
                    <div className="p-4 text-center border-t border-gray-200">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Ver todos los gastos ({expenses.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección de Ingresos */}
            {activeTab === 'ingresos' && (
              <div>
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                    Agregar Nuevo Ingreso
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newIncome.amount}
                        onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={newIncome.description}
                        onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descripción del ingreso"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ingreso</label>
                      <select
                        value={newIncome.type}
                        onChange={(e) => setNewIncome({...newIncome, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar tipo</option>
                        {incomeTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={newIncome.date}
                        onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2 lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                      <input
                        type="text"
                        value={newIncome.notes || ''}
                        onChange={(e) => setNewIncome({...newIncome, notes: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notas adicionales"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={addIncome}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Agregando...' : 'Agregar Ingreso'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Lista de Ingresos */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Ingresos Recientes</h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {incomes.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay ingresos registrados</p>
                        <p className="text-sm">Agrega tu primer ingreso usando el formulario de arriba</p>
                      </div>
                    ) : (
                      incomes.slice(0, 10).map(income => {
                        const incomeType = incomeTypes.find(t => t.id === income.income_type_id);
                        
                        return (
                          <div key={income.id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: incomeType?.color || '#10B981' }}
                                  ></div>
                                  <div>
                                    <p className="font-medium text-gray-900">{income.description}</p>
                                    <p className="text-sm text-gray-500">
                                      {incomeType?.name} • {new Date(income.date).toLocaleDateString()}
                                    </p>
                                    {income.notes && (
                                      <p className="text-sm text-gray-400 mt-1">{income.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-semibold text-green-600">
                                  +${Number(income.amount).toFixed(2)}
                                </span>
                                <button
                                  onClick={() => deleteIncome(income.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {incomes.length > 10 && (
                    <div className="p-4 text-center border-t border-gray-200">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Ver todos los ingresos ({incomes.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección de Reportes */}
            {activeTab === 'reportes' && (
              <div className="space-y-6">
                {/* Filtros de transacciones */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    Reportes y Filtros de Transacciones
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todas las categorías</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                      <select
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos los métodos</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setFilters({ startDate: '', endDate: '', category: '', paymentMethod: '' })}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>

                {/* Resumen de datos filtrados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <TrendingDown className="w-8 h-8 text-red-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Gastos Filtrados</p>
                        <p className="text-2xl font-bold text-red-600">
                          ${getFilteredExpenses().reduce((sum, expense) => sum + parseFloat(expense.amount), 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">{getFilteredExpenses().length} transacciones</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Ingresos Filtrados</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${getFilteredIncomes().reduce((sum, income) => sum + parseFloat(income.amount), 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">{getFilteredIncomes().length} transacciones</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <Calendar className="w-8 h-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Balance Filtrado</p>
                        <p className={`text-2xl font-bold ${
                          (getFilteredIncomes().reduce((sum, income) => sum + parseFloat(income.amount), 0) - 
                           getFilteredExpenses().reduce((sum, expense) => sum + parseFloat(expense.amount), 0)) >= 0 
                          ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${(
                            getFilteredIncomes().reduce((sum, income) => sum + parseFloat(income.amount), 0) - 
                            getFilteredExpenses().reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transacciones filtradas */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Historial de Transacciones Filtradas</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Mostrando {getFilteredExpenses().length} gastos y {getFilteredIncomes().length} ingresos
                    </p>
                  </div>
                  
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {[...getFilteredExpenses().map(expense => ({ ...expense, type: 'expense' })), 
                      ...getFilteredIncomes().map(income => ({ ...income, type: 'income' }))]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay transacciones que coincidan con los filtros</p>
                        <p className="text-sm">Ajusta los filtros para ver más resultados</p>
                      </div>
                    ) : (
                      [...getFilteredExpenses().map(expense => ({ ...expense, type: 'expense' })), 
                       ...getFilteredIncomes().map(income => ({ ...income, type: 'income' }))]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(transaction => {
                          if (transaction.type === 'expense') {
                            const category = categories.find(c => c.id === transaction.category_id);
                            const paymentMethod = paymentMethods.find(p => p.id === transaction.payment_method_id);
                            
                            return (
                              <div key={`expense-${transaction.id}`} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: category?.color || '#6B7280' }}
                                    ></div>
                                    <div>
                                      <p className="font-medium">{transaction.description}</p>
                                      <p className="text-sm text-gray-500">
                                        {category?.name} • {paymentMethod?.name} • {new Date(transaction.date).toLocaleDateString()}
                                      </p>
                                      {transaction.notes && (
                                        <p className="text-sm text-gray-400 mt-1">{transaction.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="text-lg font-semibold text-red-600">
                                      -${Number(transaction.amount).toFixed(2)}
                                    </span>
                                    <p className="text-xs text-gray-500">Gasto</p>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            const incomeType = incomeTypes.find(t => t.id === transaction.income_type_id);
                            
                            return (
                              <div key={`income-${transaction.id}`} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: incomeType?.color || '#10B981' }}
                                    ></div>
                                    <div>
                                      <p className="font-medium">{transaction.description}</p>
                                      <p className="text-sm text-gray-500">
                                        {incomeType?.name} • {new Date(transaction.date).toLocaleDateString()}
                                      </p>
                                      {transaction.notes && (
                                        <p className="text-sm text-gray-400 mt-1">{transaction.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="text-lg font-semibold text-green-600">
                                      +${Number(transaction.amount).toFixed(2)}
                                    </span>
                                    <p className="text-xs text-gray-500">Ingreso</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })
                    )}
                  </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico por categorías */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Monto']} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No hay datos para mostrar</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tendencia financiera */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Tendencia Financiera</h3>
                      <select
                        value={trendPeriod}
                        onChange={(e) => setTrendPeriod(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="3">Últimos 3 meses</option>
                        <option value="6">Últimos 6 meses</option>
                        <option value="12">Últimos 12 meses</option>
                      </select>
                    </div>
                    
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '']} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="ingresos" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            name="Ingresos"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="gastos" 
                            stroke="#EF4444" 
                            strokeWidth={2}
                            name="Gastos"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            name="Balance"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No hay datos para mostrar</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desglose detallado */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Desglose por Categoría</h3>
                  </div>
                  
                  <div className="p-6">
                    {getExpensesByCategory().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay gastos para mostrar en el período seleccionado</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getExpensesByCategory().map(category => (
                          <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              ></div>
                              <div>
                                <p className="font-medium">{category.name}</p>
                                <p className="text-sm text-gray-500">{category.count} transacciones</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="font-bold text-lg">${category.total.toFixed(2)}</p>
                              <p className="text-sm text-gray-500">
                                {((category.total / totalExpenses) * 100).toFixed(1)}% del total
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sección de Balance */}
            {activeTab === 'balance' && (
              <div className="space-y-6">
                {/* Selector de período */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 className="text-xl font-semibold flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                      Balance Mensual
                    </h2>
                    
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mes del Balance</label>
                        <input
                          type="month"
                          value={reportMonth}
                          onChange={(e) => setReportMonth(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen del mes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                        <p className="text-2xl font-bold text-green-600">${totalIncomes.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{monthIncomes.length} transacciones</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <TrendingDown className="w-8 h-8 text-red-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Gastos del Mes</p>
                        <p className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{monthExpenses.length} transacciones</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <Calendar className="w-8 h-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Balance del Mes</p>
                        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${balance.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {balance >= 0 ? 'Superávit' : 'Déficit'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráficos comparativos */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Comparativo de Balance</h3>
                    <select
                      value={trendPeriod}
                      onChange={(e) => setTrendPeriod(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="1">Último mes</option>
                      <option value="3">Últimos 3 meses</option>
                      <option value="6">Últimos 6 meses</option>
                      <option value="12">Últimos 12 meses</option>
                    </select>
                  </div>
                  
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="ingresos" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Ingresos"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="gastos" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          name="Gastos"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Balance"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No hay datos para mostrar</p>
                      </div>
                    </div>
                  )}

                {/* Resumen de gastos por los últimos 7 días */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Gastos de los Últimos 7 Días</h3>
                  
                  {last7Days.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Gastos']} />
                        <Bar dataKey="gastos" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No hay datos de gastos para mostrar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de autenticación */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        loading={loading}
      />

      {/* Modal de selección de exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Seleccionar datos a exportar</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSelections.expenses}
                    onChange={(e) => setExportSelections(prev => ({ ...prev, expenses: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Gastos ({expenses.length} registros)</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSelections.incomes}
                    onChange={(e) => setExportSelections(prev => ({ ...prev, incomes: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Ingresos ({incomes.length} registros)</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSelections.categories}
                    onChange={(e) => setExportSelections(prev => ({ ...prev, categories: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Categorías ({categories.length} elementos)</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSelections.paymentMethods}
                    onChange={(e) => setExportSelections(prev => ({ ...prev, paymentMethods: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Métodos de Pago ({paymentMethods.length} elementos)</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSelections.incomeTypes}
                    onChange={(e) => setExportSelections(prev => ({ ...prev, incomeTypes: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Tipos de Ingreso ({incomeTypes.length} elementos)</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSelections.metadata}
                    onChange={(e) => setExportSelections(prev => ({ ...prev, metadata: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Metadatos del sistema</span>
                </label>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmExport}
                  disabled={!Object.values(exportSelections).some(Boolean)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Exportar Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSupabase;