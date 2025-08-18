import React, { useState, useEffect } from 'react';
import { PlusCircle, Settings, BarChart3, TrendingUp, TrendingDown, Calendar, CreditCard, Filter, Edit2, Trash2, Save, X, Download, Upload, AlertCircle, Activity, Wifi, WifiOff, User, Moon, Sun, Search } from 'lucide-react';
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
  const [darkMode, setDarkMode] = useState(false);
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
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
  const [migrationProgress, setMigrationProgress] = useState(null);

  // Hook personalizado para datos con Supabase
  const {
    loading,
    error: dataError,
    user,
    isAuthenticated,
    syncing,
    lastSync,
    categories,
    paymentMethods,
    incomeTypes,
    expenses,
    incomes,
    settings,
    addExpense: addExpenseToData,
    updateExpense,
    deleteExpense: deleteExpenseFromData,
    addIncome: addIncomeToData,
    updateIncome,
    deleteIncome: deleteIncomeFromData,
    addCategory,
    updateCategory,
    deleteCategory,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addIncomeType,
    updateIncomeType,
    deleteIncomeType,
    updateSettings,
    getFinancialSummary,
    signIn,
    signUp,
    signOut,
    refreshData,
    clearError
  } = useSupabaseData();

  // Verificar migración al cargar - DESACTIVADO (app 100% Supabase)
  useEffect(() => {
    setShowMigrationBanner(false);
  }, [isAuthenticated]);

  // Cargar preferencia de tema desde localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('finanzas-theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Aplicar tema cuando cambia darkMode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('finanzas-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('finanzas-theme', 'light');
    }
  }, [darkMode]);

  // Clases helper para tema oscuro
  const cardClasses = `rounded-lg shadow transition-colors duration-200 ${
    darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
  }`;
  
  const inputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
    darkMode 
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
  }`;

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

  // Función para búsqueda inteligente en gastos
  const getSearchedExpenses = () => {
    const filtered = getFilteredExpenses();
    if (!searchTerm.trim()) return filtered;

    return filtered.filter(expense => {
      const searchLower = searchTerm.toLowerCase();
      
      // Buscar en descripción
      if (expense.description.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en monto
      if (expense.amount.toString().includes(searchTerm)) return true;
      
      // Buscar en fecha
      const formattedDate = new Date(expense.date).toLocaleDateString();
      if (formattedDate.includes(searchTerm)) return true;
      
      // Buscar en categoría
      const category = categories.find(c => c.id === expense.category_id);
      if (category && category.name.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en método de pago
      const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
      if (paymentMethod && paymentMethod.name.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en notas
      if (expense.notes && expense.notes.toLowerCase().includes(searchLower)) return true;
      
      return false;
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

  // Función para búsqueda inteligente en ingresos
  const getSearchedIncomes = () => {
    const filtered = getFilteredIncomes();
    if (!searchTerm.trim()) return filtered;

    return filtered.filter(income => {
      const searchLower = searchTerm.toLowerCase();
      
      // Buscar en descripción
      if (income.description.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en monto
      if (income.amount.toString().includes(searchTerm)) return true;
      
      // Buscar en fecha
      const formattedDate = new Date(income.date).toLocaleDateString();
      if (formattedDate.includes(searchTerm)) return true;
      
      // Buscar en tipo de ingreso
      const incomeType = incomeTypes.find(t => t.id === income.income_type_id);
      if (incomeType && incomeType.name.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en notas
      if (income.notes && income.notes.toLowerCase().includes(searchLower)) return true;
      
      return false;
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
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`shadow-sm border-b transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 space-y-2 sm:space-y-0">
            <h1 className={`text-xl sm:text-2xl font-bold text-center sm:text-left transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>💰 Gestor Financiero</h1>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Toggle de modo oscuro */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">{darkMode ? 'Claro' : 'Oscuro'}</span>
              </button>
              {isAuthenticated && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs transition-colors duration-200 ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                  {lastSync && (
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>• {new Date(lastSync).toLocaleTimeString()}</span>
                  )}
                </div>
              )}
              
              {isAuthenticated && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                      darkMode 
                        ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title="Exportar a Excel"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                  
                  <label className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm ${
                    darkMode 
                      ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}>
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
              
              {isAuthenticated && (
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Config</span>
                </button>
              )}
              
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
        {successMessage && <MessageAlert message={successMessage} type="success" />}
        {(dataError || expenseError || incomeError) && (
          <MessageAlert 
            message={dataError || expenseError || incomeError} 
            type="error" 
          />
        )}
        
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
                  <PlusCircle className="w-5 h-5 mr-2 text-green-500" />
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
                
                {/* Agregar nuevo método de pago */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre del método"
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
                      defaultValue="#74B9FF"
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
                          colorInput.value = '#74B9FF';
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
                
                {/* Agregar nuevo tipo de ingreso */}
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
                      defaultValue="#00B894"
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
                          colorInput.value = '#00B894';
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
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                    <div className="text-sm text-gray-600">Categorías</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-600">{paymentMethods.length}</div>
                    <div className="text-sm text-gray-600">Métodos de Pago</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{incomeTypes.length}</div>
                    <div className="text-sm text-gray-600">Tipos de Ingresos</div>
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
                      handleConfirmExport();
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
          <div>
            <nav className={`flex flex-wrap p-1 rounded-lg shadow mb-4 sm:mb-8 overflow-x-auto transition-colors duration-200 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
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
                      : darkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
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
                <div className={`${cardClasses} p-6 mb-6`}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
                    Agregar Nuevo Gasto
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
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
                    
                    <div className="sm:col-span-1 lg:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descripción del gasto"
                      />
                    </div>
                    
                    <div className="sm:col-span-1">
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
                    
                    <div className="sm:col-span-1">
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
                    
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                      <input
                        type="text"
                        value={newExpense.notes || ''}
                        onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notas adicionales"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1 flex items-end">
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
                
                {/* Barra de búsqueda */}
                <div className={`${cardClasses} p-4 mb-6`}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar gastos por descripción, monto, fecha, categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-10 pr-4 py-2 rounded-lg focus:border-transparent ${inputClasses}`}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Gastos */}
                <div className={cardClasses}>
                  <div className={`p-6 border-b transition-colors duration-200 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Gastos {searchTerm && `(${getSearchedExpenses().length} resultados)`}</h3>
                      {searchTerm && (
                        <span className="text-sm text-gray-500">
                          Búsqueda: "{searchTerm}"
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {(() => {
                      const searchedExpenses = getSearchedExpenses();
                      if (searchedExpenses.length === 0) {
                        return (
                          <div className="p-8 text-center text-gray-500">
                            <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            {searchTerm ? (
                              <>
                                <p>No se encontraron gastos con "{searchTerm}"</p>
                                <p className="text-sm">Intenta con otros términos de búsqueda</p>
                              </>
                            ) : (
                              <>
                                <p>No hay gastos registrados</p>
                                <p className="text-sm">Agrega tu primer gasto usando el formulario de arriba</p>
                              </>
                            )}
                          </div>
                        );
                      }
                      
                      return searchedExpenses.slice(0, 10).map(expense => {
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
                      });
                    })()}
                  </div>
                  
                  {(() => {
                    const searchedExpenses = getSearchedExpenses();
                    return searchedExpenses.length > 10 && (
                      <div className="p-4 text-center border-t border-gray-200">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Ver todos los gastos ({searchedExpenses.length})
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Sección de Ingresos */}
            {activeTab === 'ingresos' && (
              <div>
                <div className={`${cardClasses} p-6 mb-6`}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                    Agregar Nuevo Ingreso
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
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
                    
                    <div className="sm:col-span-1 lg:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={newIncome.description}
                        onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descripción del ingreso"
                      />
                    </div>
                    
                    <div className="sm:col-span-1">
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
                    
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={newIncome.date}
                        onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                      <input
                        type="text"
                        value={newIncome.notes || ''}
                        onChange={(e) => setNewIncome({...newIncome, notes: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notas adicionales"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1 flex items-end">
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
                
                {/* Barra de búsqueda para ingresos */}
                <div className={`${cardClasses} p-4 mb-6`}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar ingresos por descripción, monto, fecha, tipo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-10 pr-4 py-2 rounded-lg focus:border-transparent ${inputClasses}`}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Ingresos */}
                <div className={cardClasses}>
                  <div className={`p-6 border-b transition-colors duration-200 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Ingresos {searchTerm && `(${getSearchedIncomes().length} resultados)`}</h3>
                      {searchTerm && (
                        <span className="text-sm text-gray-500">
                          Búsqueda: "{searchTerm}"
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {(() => {
                      const searchedIncomes = getSearchedIncomes();
                      if (searchedIncomes.length === 0) {
                        return (
                          <div className="p-8 text-center text-gray-500">
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            {searchTerm ? (
                              <>
                                <p>No se encontraron ingresos con "{searchTerm}"</p>
                                <p className="text-sm">Intenta con otros términos de búsqueda</p>
                              </>
                            ) : (
                              <>
                                <p>No hay ingresos registrados</p>
                                <p className="text-sm">Agrega tu primer ingreso usando el formulario de arriba</p>
                              </>
                            )}
                          </div>
                        );
                      }
                      
                      return searchedIncomes.slice(0, 10).map(income => {
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
                      });
                    })()}
                  </div>
                  
                  {(() => {
                    const searchedIncomes = getSearchedIncomes();
                    return searchedIncomes.length > 10 && (
                      <div className="p-4 text-center border-t border-gray-200">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Ver todos los ingresos ({searchedIncomes.length})
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Sección de Reportes */}
            {activeTab === 'reportes' && (
              <div>
                {/* Filtros de Reportes */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    Reportes y Análisis
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  
                  <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => setFilters({
                        startDate: '',
                        endDate: '',
                        paymentMethod: '',
                        category: ''
                      })}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Limpiar Filtros</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        setFilters({
                          ...filters,
                          startDate: firstDay.toISOString().split('T')[0],
                          endDate: today.toISOString().split('T')[0]
                        });
                      }}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Este Mes</span>
                    </button>
                  </div>
                </div>

                {/* Resumen Filtrado */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  {(() => {
                    const filteredExpenses = getFilteredExpenses();
                    const filteredIncomes = getFilteredIncomes();
                    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                    const totalIncomes = filteredIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
                    const balance = totalIncomes - totalExpenses;
                    
                    return (
                      <>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Total Ingresos</p>
                            <p className="text-2xl font-bold text-green-600">${totalIncomes.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">{filteredIncomes.length} transacciones</p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Total Gastos</p>
                            <p className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">{filteredExpenses.length} transacciones</p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Balance Neto</p>
                            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${balance.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {balance >= 0 ? 'Ahorro' : 'Déficit'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Promedio Diario</p>
                            <p className="text-lg font-bold text-blue-600">
                              ${(() => {
                                const days = filters.startDate && filters.endDate 
                                  ? Math.max(1, Math.ceil((new Date(filters.endDate) - new Date(filters.startDate)) / (1000 * 60 * 60 * 24)) + 1)
                                  : 30;
                                return (totalExpenses / days).toFixed(2);
                              })()}
                            </p>
                            <p className="text-sm text-gray-500">gastos por día</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Gráficos de Análisis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Distribución de Gastos por Categoría */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
                    
                    {(() => {
                      const filteredExpenses = getFilteredExpenses();
                      const categoryStats = categories.map(category => {
                        const categoryExpenses = filteredExpenses.filter(expense => expense.category_id === category.id);
                        const total = categoryExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        return {
                          name: category.name,
                          value: total,
                          count: categoryExpenses.length,
                          color: category.color
                        };
                      }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

                      if (categoryStats.length === 0) {
                        return (
                          <div className="text-center text-gray-500 py-12">
                            <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay gastos con los filtros aplicados</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="h-64 mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={categoryStats}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {categoryStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total']} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="space-y-2">
                            {categoryStats.slice(0, 5).map(category => (
                              <div key={category.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category.color }}
                                  ></div>
                                  <span>{category.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">${category.value.toFixed(2)}</div>
                                  <div className="text-gray-500">{category.count} gastos</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Distribución por Método de Pago */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Método de Pago</h3>
                    
                    {(() => {
                      const filteredExpenses = getFilteredExpenses();
                      const paymentStats = paymentMethods.map(method => {
                        const methodExpenses = filteredExpenses.filter(expense => expense.payment_method_id === method.id);
                        const total = methodExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        return {
                          name: method.name,
                          value: total,
                          count: methodExpenses.length,
                          color: method.color
                        };
                      }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

                      if (paymentStats.length === 0) {
                        return (
                          <div className="text-center text-gray-500 py-12">
                            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay gastos con los filtros aplicados</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="h-64 mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={paymentStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total']} />
                                <Bar dataKey="value" fill="#3B82F6" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="space-y-2">
                            {paymentStats.map(method => (
                              <div key={method.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: method.color }}
                                  ></div>
                                  <span>{method.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">${method.value.toFixed(2)}</div>
                                  <div className="text-gray-500">{method.count} gastos</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Transacciones Filtradas */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Filter className="w-5 h-5 mr-2" />
                      Transacciones Filtradas
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {(() => {
                      const filteredExpenses = getFilteredExpenses();
                      const filteredIncomes = getFilteredIncomes();
                      
                      const allTransactions = [
                        ...filteredExpenses.map(expense => ({
                          ...expense,
                          type: 'expense',
                          amount: -parseFloat(expense.amount),
                          categoryName: categories.find(c => c.id === expense.category_id)?.name || 'Sin categoría',
                          categoryColor: categories.find(c => c.id === expense.category_id)?.color || '#6B7280',
                          paymentMethodName: paymentMethods.find(p => p.id === expense.payment_method_id)?.name || 'Sin método'
                        })),
                        ...filteredIncomes.map(income => ({
                          ...income,
                          type: 'income',
                          amount: parseFloat(income.amount),
                          categoryName: incomeTypes.find(t => t.id === income.income_type_id)?.name || 'Sin tipo',
                          categoryColor: incomeTypes.find(t => t.id === income.income_type_id)?.color || '#10B981',
                          paymentMethodName: 'N/A'
                        }))
                      ].sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (allTransactions.length === 0) {
                        return (
                          <div className="p-8 text-center text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay transacciones con los filtros aplicados</p>
                            <p className="text-sm">Ajusta los filtros para ver más resultados</p>
                          </div>
                        );
                      }

                      return allTransactions.slice(0, 20).map(transaction => (
                        <div key={`${transaction.type}-${transaction.id}`} className="p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: transaction.categoryColor }}
                                ></div>
                                <div>
                                  <p className="font-medium text-gray-900 flex items-center space-x-2">
                                    <span>{transaction.description}</span>
                                    {transaction.type === 'expense' ? (
                                      <TrendingDown className="w-4 h-4 text-red-500" />
                                    ) : (
                                      <TrendingUp className="w-4 h-4 text-green-500" />
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {transaction.categoryName}
                                    {transaction.type === 'expense' && ` • ${transaction.paymentMethodName}`}
                                    {' • '}{new Date(transaction.date).toLocaleDateString()}
                                  </p>
                                  {transaction.notes && (
                                    <p className="text-sm text-gray-400 mt-1">{transaction.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`text-lg font-semibold ${
                                transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  
                  {(() => {
                    const filteredExpenses = getFilteredExpenses();
                    const filteredIncomes = getFilteredIncomes();
                    const totalTransactions = filteredExpenses.length + filteredIncomes.length;
                    
                    return totalTransactions > 20 && (
                      <div className="p-4 text-center border-t border-gray-200">
                        <p className="text-blue-600 text-sm font-medium">
                          Mostrando 20 de {totalTransactions} transacciones
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Sección de Balance */}
            {activeTab === 'balance' && (
              <div>
                {/* Controles de Balance */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <h2 className="text-xl font-semibold flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                      Balance Mensual
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mes:</label>
                        <input
                          type="month"
                          value={reportMonth}
                          onChange={(e) => setReportMonth(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período de Tendencia:</label>
                        <select
                          value={trendPeriod}
                          onChange={(e) => setTrendPeriod(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="3">Últimos 3 meses</option>
                          <option value="6">Últimos 6 meses</option>
                          <option value="12">Últimos 12 meses</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen del Mes Seleccionado */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {(() => {
                    const { totalExpenses, totalIncomes, balance } = getMonthData();
                    const savingsRate = totalIncomes > 0 ? ((balance / totalIncomes) * 100) : 0;
                    
                    return (
                      <>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                              <p className="text-2xl font-bold text-green-600">
                                ${totalIncomes.toFixed(2)}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Gastos del Mes</p>
                              <p className="text-2xl font-bold text-red-600">
                                ${totalExpenses.toFixed(2)}
                              </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-500" />
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Balance del Mes</p>
                              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${balance.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Tasa de ahorro: {savingsRate.toFixed(1)}%
                              </p>
                            </div>
                            <Calendar className="h-8 w-8 text-purple-500" />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Gráfico de Tendencias */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Tendencia de los Últimos {trendPeriod} Meses</h3>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name === 'gastos' ? 'Gastos' : name === 'ingresos' ? 'Ingresos' : 'Balance']}
                          labelFormatter={(label) => `Mes: ${label}`}
                        />
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
                          stroke="#8B5CF6" 
                          strokeWidth={2}
                          name="Balance"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Análisis por Categorías del Mes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gastos por Categoría */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
                    
                    {(() => {
                      const { monthExpenses } = getMonthData();
                      const categoryData = categories.map(category => {
                        const categoryExpenses = monthExpenses.filter(expense => expense.category_id === category.id);
                        const total = categoryExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        return {
                          name: category.name,
                          value: total,
                          color: category.color
                        };
                      }).filter(item => item.value > 0);

                      if (categoryData.length === 0) {
                        return (
                          <div className="text-center text-gray-500 py-8">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay gastos en este mes</p>
                          </div>
                        );
                      }

                      return (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cantidad']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Ingresos por Tipo */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Ingresos por Tipo</h3>
                    
                    {(() => {
                      const { monthIncomes } = getMonthData();
                      const incomeData = incomeTypes.map(type => {
                        const typeIncomes = monthIncomes.filter(income => income.income_type_id === type.id);
                        const total = typeIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
                        return {
                          name: type.name,
                          value: total,
                          color: type.color
                        };
                      }).filter(item => item.value > 0);

                      if (incomeData.length === 0) {
                        return (
                          <div className="text-center text-gray-500 py-8">
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay ingresos en este mes</p>
                          </div>
                        );
                      }

                      return (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incomeData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cantidad']} />
                              <Bar dataKey="value" fill="#10B981" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          loading={loading}
        />

        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
                
                <div className="space-y-4 mb-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Datos de Transacciones</h4>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportSelections.expenses}
                        onChange={(e) => setExportSelections({...exportSelections, expenses: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Gastos</span>
                        <span className="text-gray-500 ml-1">({expenses.length} registros)</span>
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportSelections.incomes}
                        onChange={(e) => setExportSelections({...exportSelections, incomes: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Ingresos</span>
                        <span className="text-gray-500 ml-1">({incomes.length} registros)</span>
                      </span>
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Configuración</h4>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportSelections.categories}
                        onChange={(e) => setExportSelections({...exportSelections, categories: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Categorías de Gastos</span>
                        <span className="text-gray-500 ml-1">({categories.length} categorías)</span>
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportSelections.paymentMethods}
                        onChange={(e) => setExportSelections({...exportSelections, paymentMethods: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Métodos de Pago</span>
                        <span className="text-gray-500 ml-1">({paymentMethods.length} métodos)</span>
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportSelections.incomeTypes}
                        onChange={(e) => setExportSelections({...exportSelections, incomeTypes: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Tipos de Ingresos</span>
                        <span className="text-gray-500 ml-1">({incomeTypes.length} tipos)</span>
                      </span>
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Información Adicional</h4>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportSelections.metadata}
                        onChange={(e) => setExportSelections({...exportSelections, metadata: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Metadatos</span>
                        <span className="text-gray-500 ml-1">(fecha de exportación, resumen, etc.)</span>
                      </span>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      const allSelected = Object.values(exportSelections).every(Boolean);
                      const newSelections = {
                        expenses: !allSelected,
                        incomes: !allSelected,
                        categories: !allSelected,
                        paymentMethods: !allSelected,
                        incomeTypes: !allSelected,
                        metadata: !allSelected
                      };
                      setExportSelections(newSelections);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {Object.values(exportSelections).every(Boolean) ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    {Object.values(exportSelections).filter(Boolean).length} de {Object.keys(exportSelections).length} seleccionados
                  </span>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmExport}
                    disabled={!Object.values(exportSelections).some(Boolean)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Exportar a Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSupabase;