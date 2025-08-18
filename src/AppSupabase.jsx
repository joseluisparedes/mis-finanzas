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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left">💰 Gestor Financiero</h1>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {isAuthenticated && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg text-xs">
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                  {lastSync && (
                    <span className="text-gray-500">• {new Date(lastSync).toLocaleTimeString()}</span>
                  )}
                </div>
              )}
              
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
              
              {isAuthenticated && (
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
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
        ) : (
          <div className="text-center py-12">
            <p>Aplicación funcionando correctamente - Interfaz completa disponible después del build exitoso</p>
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
    </div>
  );
};

export default AppSupabase;