import React, { useState } from 'react';
import { PlusCircle, Settings, BarChart3, TrendingUp, TrendingDown, Calendar, CreditCard, Filter, Edit2, Trash2, Save, X, Download, Upload, AlertCircle, Activity, Wifi, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useFinancialData } from './hooks/useFinancialData';
import FinancialDashboard from './components/FinancialDashboard';

const ExpenseTracker = () => {
  // Estados para UI
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  // Hook personalizado para datos financieros
  const {
    // Estados
    loading,
    error: dataError,
    lastSaved,
    isOnline,
    
    // Datos
    expenses,
    incomes,
    categories,
    paymentMethods,
    incomeTypes,
    
    // Funciones
    addExpense: addExpenseToData,
    addIncome: addIncomeToData,
    deleteExpense: deleteExpenseFromData,
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
    
    // Funciones de análisis
    getFinancialSummary,
    getExpensesByCategory,
    getStorageStats,
    
    // Funciones de backup
    createBackup,
    exportData,
    importData
  } = useFinancialData();

  // Función para limpiar mensajes
  const clearMessages = () => {
    setExpenseError('');
    setIncomeError('');
    setSuccessMessage('');
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
  const addExpense = () => {
    if (!validateExpenseForm()) return;
    
    const expense = addExpenseToData(newExpense);
    if (expense) {
      setNewExpense({
        amount: '',
        description: '',
        category: '',
        paymentMethod: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSuccessMessage('¡Gasto agregado exitosamente!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Funciones para agregar ingresos
  const addIncome = () => {
    if (!validateIncomeForm()) return;
    
    const income = addIncomeToData(newIncome);
    if (income) {
      setNewIncome({
        amount: '',
        description: '',
        type: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSuccessMessage('¡Ingreso agregado exitosamente!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Funciones para eliminar
  const deleteExpense = (id) => {
    deleteExpenseFromData(id);
    setSuccessMessage('Gasto eliminado exitosamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const deleteIncome = (id) => {
    deleteIncomeFromData(id);
    setSuccessMessage('Ingreso eliminado exitosamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Función para importar archivo
  const handleImportFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await importData(file);
      if (result.success) {
        setSuccessMessage('Datos importados exitosamente');
      } else {
        setExpenseError(result.error || 'Error importando datos');
      }
    } catch (error) {
      setExpenseError('Error procesando archivo');
    }
    
    event.target.value = '';
    setTimeout(() => {
      setSuccessMessage('');
      setExpenseError('');
    }, 5000);
  };

  // Función para exportar datos
  const handleExportData = () => {
    const success = exportData();
    if (success) {
      setSuccessMessage('Datos exportados exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setExpenseError('Error exportando datos');
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
      if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
      if (filters.category && expense.category !== filters.category) return false;
      
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

    const totalExpenses = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncomes = monthIncomes.reduce((sum, income) => sum + income.amount, 0);
    const balance = totalIncomes - totalExpenses;

    return { monthExpenses, monthIncomes, totalExpenses, totalIncomes, balance };
  };

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
      
      const totalExpenses = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalIncomes = monthIncomes.reduce((sum, income) => sum + income.amount, 0);
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
        .filter(expense => expense.category === category.id.toString())
        .reduce((sum, expense) => sum + expense.amount, 0),
      color: category.color
    })).filter(item => item.value > 0);

    // Datos por método de pago
    const paymentData = paymentMethods.map(method => ({
      name: method.name,
      value: filteredExpenses
        .filter(expense => expense.paymentMethod === method.id.toString())
        .reduce((sum, expense) => sum + expense.amount, 0),
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
        .reduce((sum, expense) => sum + expense.amount, 0);
      
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

  // Componente de configuración
  const ConfigSection = () => (
    <div className="space-y-6">
      {/* Información del sistema */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Estado del Sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm">
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Último guardado: </span>
            <span className="font-medium">
              {lastSaved ? new Date(lastSaved).toLocaleString() : 'Nunca'}
            </span>
          </div>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={createBackup}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Crear Backup
          </button>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Exportar Datos
          </button>
        </div>
      </div>

      {/* Categorías */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Categorías de Gastos</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-2 border rounded">
              {editingCategory === category.id ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="color"
                    value={category.color}
                    onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                    className="w-8 h-8"
                  />
                  <button onClick={() => setEditingCategory(null)} className="text-green-600">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm sm:text-base">{category.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setEditingCategory(category.id)}
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const newCategory = addCategory({ name: 'Nueva Categoría', color: '#FF6B6B' });
              setEditingCategory(newCategory.id);
            }}
            className="w-full p-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 text-sm"
          >
            + Agregar Categoría
          </button>
        </div>
      </div>

      {/* Métodos de Pago */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Métodos de Pago</h3>
        <div className="space-y-2">
          {paymentMethods.map(method => (
            <div key={method.id} className="flex items-center justify-between p-2 border rounded">
              {editingPayment === method.id ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={method.name}
                    onChange={(e) => updatePaymentMethod(method.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="color"
                    value={method.color}
                    onChange={(e) => updatePaymentMethod(method.id, { color: e.target.value })}
                    className="w-8 h-8"
                  />
                  <button onClick={() => setEditingPayment(null)} className="text-green-600">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: method.color }}
                    ></div>
                    <span className="text-sm sm:text-base">{method.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setEditingPayment(method.id)}
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deletePaymentMethod(method.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const newMethod = addPaymentMethod({ name: 'Nuevo Método', color: '#74B9FF' });
              setEditingPayment(newMethod.id);
            }}
            className="w-full p-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 text-sm"
          >
            + Agregar Método de Pago
          </button>
        </div>
      </div>

      {/* Tipos de Ingresos */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Tipos de Ingresos</h3>
        <div className="space-y-2">
          {incomeTypes.map(type => (
            <div key={type.id} className="flex items-center justify-between p-2 border rounded">
              {editingIncome === type.id ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={type.name}
                    onChange={(e) => updateIncomeType(type.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="color"
                    value={type.color}
                    onChange={(e) => updateIncomeType(type.id, { color: e.target.value })}
                    className="w-8 h-8"
                  />
                  <button onClick={() => setEditingIncome(null)} className="text-green-600">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: type.color }}
                    ></div>
                    <span className="text-sm sm:text-base">{type.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setEditingIncome(type.id)}
                      className="text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteIncomeType(type.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const newType = addIncomeType({ name: 'Nuevo Tipo', color: '#00B894' });
              setEditingIncome(newType.id);
            }}
            className="w-full p-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 text-sm"
          >
            + Agregar Tipo de Ingreso
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos financieros...</p>
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
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* Indicador de estado */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              {/* Botones de importar/exportar */}
              <div className="flex space-x-2">
                <button
                  onClick={handleExportData}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                <label className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer text-sm">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Importar</span>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Config</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mensajes */}
        {successMessage && <MessageAlert message={successMessage} type="success" />}
        {(dataError || expenseError || incomeError) && (
          <MessageAlert 
            message={dataError || expenseError || incomeError} 
            type="error" 
          />
        )}
        
        {showConfig ? (
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
            <ConfigSection />
          </div>
        ) : (
          <>
            {/* Navigation */}
            <nav className="flex flex-wrap bg-white p-1 rounded-lg shadow mb-4 sm:mb-8 overflow-x-auto">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Activity },
                { id: 'gastos', label: 'Gastos', icon: TrendingDown },
                { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
                { id: 'reportes', label: 'Reportes', icon: BarChart3 },
                { id: 'balance', label: 'Balance', icon: Calendar }
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

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <FinancialDashboard
                expenses={expenses}
                incomes={incomes}
                categories={categories}
                paymentMethods={paymentMethods}
                getFinancialSummary={getFinancialSummary}
                getExpensesByCategory={getExpensesByCategory}
              />
            )}

            {/* Gastos */}
            {activeTab === 'gastos' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Formulario */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Agregar Gasto
                  </h2>
                  
                  {expenseError && <MessageAlert message={expenseError} type="error" />}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                      <input
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                        placeholder="Describe el gasto..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                      <select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                      <select
                        value={newExpense.paymentMethod}
                        onChange={(e) => setNewExpense({...newExpense, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      >
                        <option value="">Seleccionar método</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      />
                    </div>

                    <button
                      onClick={addExpense}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
                    >
                      Agregar Gasto
                    </button>
                  </div>
                </div>

                {/* Lista de gastos recientes */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Gastos Recientes</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {expenses.slice(-10).reverse().map(expense => {
                      const category = categories.find(c => c.id === parseInt(expense.category));
                      const payment = paymentMethods.find(p => p.id === parseInt(expense.paymentMethod));
                      return (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category?.color }}
                            ></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{expense.description}</p>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">
                                {category?.name} • {payment?.name} • {expense.date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="font-semibold text-red-600 text-sm sm:text-base">
                              -${expense.amount.toFixed(2)}
                            </span>
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {expenses.length === 0 && (
                      <p className="text-gray-500 text-center py-4 text-sm">No hay gastos registrados</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ingresos */}
            {activeTab === 'ingresos' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Formulario */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Agregar Ingreso
                  </h2>
                  
                  {incomeError && <MessageAlert message={incomeError} type="error" />}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newIncome.amount}
                        onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                      <input
                        type="text"
                        value={newIncome.description}
                        onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                        placeholder="Describe el ingreso..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ingreso *</label>
                      <select
                        value={newIncome.type}
                        onChange={(e) => setNewIncome({...newIncome, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                      >
                        <option value="">Seleccionar tipo</option>
                        {incomeTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={newIncome.date}
                        onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                      />
                    </div>

                    <button
                      onClick={addIncome}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm sm:text-base"
                    >
                      Agregar Ingreso
                    </button>
                  </div>
                </div>

                {/* Lista de ingresos recientes */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Ingresos Recientes</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {incomes.slice(-10).reverse().map(income => {
                      const type = incomeTypes.find(t => t.id === parseInt(income.type));
                      return (
                        <div key={income.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: type?.color }}
                            ></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{income.description}</p>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">
                                {type?.name} • {income.date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="font-semibold text-green-600 text-sm sm:text-base">
                              +${income.amount.toFixed(2)}
                            </span>
                            <button
                              onClick={() => deleteIncome(income.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {incomes.length === 0 && (
                      <p className="text-gray-500 text-center py-4 text-sm">No hay ingresos registrados</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reportes */}
            {activeTab === 'reportes' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Filtros */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    Filtros
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                      <select
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Todos</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Todas</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setFilters({ startDate: '', endDate: '', paymentMethod: '', category: '' })}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Gastado</p>
                        <p className="text-lg sm:text-2xl font-bold text-red-600">
                          ${getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-full">
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Transacciones</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600">
                          {getFilteredExpenses().length}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Promedio</p>
                        <p className="text-lg sm:text-2xl font-bold text-purple-600">
                          ${getFilteredExpenses().length > 0 
                            ? (getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0) / getFilteredExpenses().length).toFixed(2)
                            : '0.00'
                          }
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  {/* Gráfico por categorías */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                        No hay datos para mostrar
                      </div>
                    )}
                  </div>

                  {/* Gráfico por método de pago */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Método de Pago</h3>
                    {paymentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={paymentData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                          <Bar dataKey="value" fill="#8884d8">
                            {paymentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                        No hay datos para mostrar
                      </div>
                    )}
                  </div>
                </div>

                {/* Tendencia de gastos */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Tendencia de Gastos (Últimos 7 Días)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="gastos" stroke="#FF6B6B" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista detallada de gastos filtrados */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Detalle de Gastos</h3>
                  <div className="overflow-x-auto">
                    <div className="hidden sm:block">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Descripción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Categoría
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Método de Pago
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getFilteredExpenses().slice(-20).reverse().map(expense => {
                            const category = categories.find(c => c.id === parseInt(expense.category));
                            const payment = paymentMethods.find(p => p.id === parseInt(expense.paymentMethod));
                            return (
                              <tr key={expense.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {expense.date}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                  {expense.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: category?.color }}
                                    ></div>
                                    <span>{category?.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: payment?.color }}
                                    ></div>
                                    <span>{payment?.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                                  ${expense.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() => deleteExpense(expense.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Vista móvil */}
                    <div className="sm:hidden space-y-3">
                      {getFilteredExpenses().slice(-20).reverse().map(expense => {
                        const category = categories.find(c => c.id === parseInt(expense.category));
                        const payment = paymentMethods.find(p => p.id === parseInt(expense.paymentMethod));
                        return (
                          <div key={expense.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{expense.description}</p>
                                <p className="text-xs text-gray-500">{expense.date}</p>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                <span className="font-semibold text-red-600 text-sm">
                                  ${expense.amount.toFixed(2)}
                                </span>
                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-xs">
                              <div className="flex items-center space-x-1">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: category?.color }}
                                ></div>
                                <span>{category?.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: payment?.color }}
                                ></div>
                                <span>{payment?.name}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Mensual */}
            {activeTab === 'balance' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Selector de mes */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Balance del Mes Completo
                  </h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="w-full sm:w-auto">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mes a analizar:</label>
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      />
                    </div>
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200 w-full sm:w-auto">
                      <p className="font-medium text-gray-700">Mostrando todos los movimientos de:</p>
                      <p className="text-blue-700 font-semibold">
                        {(() => {
                          const [year, month] = reportMonth.split('-');
                          const monthNames = [
                            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                          ];
                          return `${monthNames[parseInt(month) - 1]} ${year}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumen del balance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Ingresos del Mes</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">
                          ${totalIncomes.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Gastos del Mes</p>
                        <p className="text-lg sm:text-2xl font-bold text-red-600">
                          ${totalExpenses.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-full">
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Balance del Mes</p>
                        <p className={`text-lg sm:text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${balance.toFixed(2)}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        {balance >= 0 ? 
                          <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} /> :
                          <TrendingDown className={`w-5 h-5 sm:w-6 sm:h-6 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        }
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">% Ahorro del Mes</p>
                        <p className={`text-lg sm:text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalIncomes > 0 ? ((balance / totalIncomes) * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evolución Financiera */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-lg font-semibold flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Evolución Financiera
                    </h3>
                    <div className="flex space-x-2">
                      <select
                        value={trendPeriod}
                        onChange={(e) => setTrendPeriod(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="3">Últimos 3 meses</option>
                        <option value="6">Últimos 6 meses</option>
                        <option value="12">Últimos 12 meses</option>
                      </select>
                    </div>
                  </div>
                  
                  {trendData.length > 0 ? (
                    <div className="space-y-6">
                      {/* Gráfico de líneas - Ingresos vs Gastos */}
                      <div>
                        <h4 className="text-md font-medium mb-3 text-gray-700">Ingresos vs Gastos</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
                              labelFormatter={(label) => {
                                const item = trendData.find(d => d.month === label);
                                return item ? item.fullMonth : label;
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="ingresos" 
                              stroke="#10B981" 
                              strokeWidth={3}
                              name="Ingresos"
                              dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="gastos" 
                              stroke="#EF4444" 
                              strokeWidth={3}
                              name="Gastos"
                              dot={{ fill: '#EF4444', strokeWidth: 2, r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Gráfico de barras - Balance mensual */}
                      <div>
                        <h4 className="text-md font-medium mb-3 text-gray-700">Balance Mensual</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}
                              labelFormatter={(label) => {
                                const item = trendData.find(d => d.month === label);
                                return item ? item.fullMonth : label;
                              }}
                            />
                            <Bar dataKey="balance" name="Balance">
                              {trendData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.balance >= 0 ? '#10B981' : '#EF4444'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Gráfico de líneas - Tasa de ahorro */}
                      <div>
                        <h4 className="text-md font-medium mb-3 text-gray-700">Tasa de Ahorro (%)</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value) => [`${value.toFixed(1)}%`, 'Tasa de Ahorro']}
                              labelFormatter={(label) => {
                                const item = trendData.find(d => d.month === label);
                                return item ? item.fullMonth : label;
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="ahorro" 
                              stroke="#8B5CF6" 
                              strokeWidth={3}
                              name="% Ahorro"
                              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Resumen de mejora */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="text-md font-semibold mb-2 text-blue-800">📊 Análisis de Mejora Financiera</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-blue-700">Mejor Balance:</p>
                            <p className="text-blue-900">
                              ${Math.max(...trendData.map(d => d.balance)).toFixed(2)}
                              <span className="text-xs ml-1">
                                ({trendData.find(d => d.balance === Math.max(...trendData.map(item => item.balance)))?.month})
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-blue-700">Mejor Ahorro:</p>
                            <p className="text-blue-900">
                              {Math.max(...trendData.map(d => d.ahorro)).toFixed(1)}%
                              <span className="text-xs ml-1">
                                ({trendData.find(d => d.ahorro === Math.max(...trendData.map(item => item.ahorro)))?.month})
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-blue-700">Tendencia:</p>
                            <p className={`font-semibold ${
                              trendData.length >= 2 && trendData[trendData.length - 1].balance > trendData[0].balance
                                ? 'text-green-600' 
                                : trendData.length >= 2 && trendData[trendData.length - 1].balance < trendData[0].balance
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>
                              {trendData.length >= 2 
                                ? trendData[trendData.length - 1].balance > trendData[0].balance
                                  ? '📈 Mejorando'
                                  : trendData[trendData.length - 1].balance < trendData[0].balance
                                  ? '📉 Declinando'
                                  : '➡️ Estable'
                                : '📊 Insuficientes datos'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500 text-center">
                      <div>
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No hay suficientes datos para mostrar la evolución financiera.</p>
                        <p className="text-xs mt-1">Agrega gastos e ingresos para ver tu progreso.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gráfico de balance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  {/* Distribución de ingresos */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Distribución de Ingresos</h3>
                    {monthIncomes.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={incomeTypes.map(type => ({
                              name: type.name,
                              value: monthIncomes
                                .filter(income => income.type === type.id.toString())
                                .reduce((sum, income) => sum + income.amount, 0),
                              color: type.color
                            })).filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {incomeTypes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 text-sm text-center">
                        No hay ingresos registrados para este mes
                      </div>
                    )}
                  </div>

                  {/* Comparación Ingresos vs Gastos */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Ingresos vs Gastos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { name: 'Ingresos', value: totalIncomes, fill: '#10B981' },
                        { name: 'Gastos', value: totalExpenses, fill: '#EF4444' },
                        { name: 'Balance', value: Math.abs(balance), fill: balance >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Detalle de movimientos del mes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  {/* Ingresos del mes */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-green-600">
                      Todos los Ingresos del Mes
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({monthIncomes.length} movimientos)
                      </span>
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {monthIncomes.map(income => {
                        const type = incomeTypes.find(t => t.id === parseInt(income.type));
                        return (
                          <div key={income.id} className="flex items-center justify-between p-2 border-l-4 border-green-500 bg-green-50 rounded">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: type?.color }}
                              ></div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{income.description}</p>
                                <p className="text-xs text-gray-500">{type?.name} • {income.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className="font-semibold text-green-600 text-sm">
                                +${income.amount.toFixed(2)}
                              </span>
                              <button
                                onClick={() => deleteIncome(income.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {monthIncomes.length === 0 && (
                        <p className="text-gray-500 text-center py-4 text-sm">No hay ingresos registrados</p>
                      )}
                    </div>
                  </div>

                  {/* Gastos del mes */}
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">
                      Todos los Gastos del Mes
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({monthExpenses.length} movimientos)
                      </span>
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {monthExpenses.map(expense => {
                        const category = categories.find(c => c.id === parseInt(expense.category));
                        const payment = paymentMethods.find(p => p.id === parseInt(expense.paymentMethod));
                        return (
                          <div key={expense.id} className="flex items-center justify-between p-2 border-l-4 border-red-500 bg-red-50 rounded">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: category?.color }}
                              ></div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{expense.description}</p>
                                <p className="text-xs text-gray-500">{category?.name} • {payment?.name} • {expense.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className="font-semibold text-red-600 text-sm">
                                -${expense.amount.toFixed(2)}
                              </span>
                              <button
                                onClick={() => deleteExpense(expense.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {monthExpenses.length === 0 && (
                        <p className="text-gray-500 text-center py-4 text-sm">No hay gastos registrados</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alerta de balance */}
                {balance < 0 && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          ⚠️ Presupuesto Excedido
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>
                            Tus gastos superan tus ingresos en ${Math.abs(balance).toFixed(2)} este mes. 
                            Considera revisar tus gastos o buscar ingresos adicionales.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {balance > 0 && totalIncomes > 0 && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          ✅ ¡Excelente gestión financiera!
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>
                            Has ahorrado ${balance.toFixed(2)} este mes ({((balance / totalIncomes) * 100).toFixed(1)}% de tus ingresos). 
                            ¡Sigue así!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;