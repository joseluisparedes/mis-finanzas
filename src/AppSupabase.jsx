import React, { useState, useEffect } from 'react';
import { PlusCircle, Settings, BarChart3, TrendingUp, TrendingDown, Calendar, CreditCard, Filter, Edit2, Trash2, Save, X, Download, Upload, AlertCircle, Activity, Wifi, WifiOff, User, Moon, Sun, Search, Target, Repeat, MoreHorizontal, TrendingDownIcon, Menu, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';
import { useSupabaseData } from './hooks/useSupabaseData';
import AuthModal from './components/Auth/AuthModal';
import AuthButton from './components/Auth/AuthButton';
import MigrationBanner from './components/Migration/MigrationBanner';
import FinancialDashboard from './components/FinancialDashboard';
import migrationService from './services/migrationService';
import supabaseExcelService from './services/supabaseExcelService';

const AppSupabase = () => {
  // Funciones auxiliares para manejar fechas sin problemas de zona horaria
  const formatDateToLocalString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para mostrar fechas correctamente en la UI
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    // Agregar 'T00:00:00' para evitar problemas de zona horaria
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
  };

  const getTodayLocalDateString = () => {
    // Crear fecha explícitamente en hora local de Perú
    const now = new Date();
    const peruTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Lima"}));
    console.log('🌍 getTodayLocalDateString - Fecha original:', now);
    console.log('🌍 getTodayLocalDateString - Fecha Perú:', peruTime);
    const result = formatDateToLocalString(peruTime);
    console.log('🌍 getTodayLocalDateString - Resultado:', result);
    return result;
  };

  // Estados principales del hook
  const {
    isAuthenticated,
    user,
    loading,
    signOut,
    expenses,
    incomes,
    categories,
    paymentMethods,
    incomeTypes,
    recurringExpenses,
    totals,
    settings,
    addExpense: addExpenseToData,
    addIncome: addIncomeToData,
    deleteExpense: deleteExpenseFromData,
    deleteIncome: deleteIncomeFromData,
    refreshData,
    syncing,
    error: dataError,
    addRecurringExpense: addRecurringExpenseToData,
    getFinancialSummary,
    getRecurringExpensesForPeriod,
    updateRecurringExpense,
    addPaymentMethod,
    deleteRecurringExpense: deleteRecurringExpenseFromData,
    generateRecurringExpenses,
    getCreditCardAssignmentMonth,
    updateSettings,
    signIn,
    signUp,
    clearError,
    updateExpense,
    updateIncome,
    addCategory,
    updateCategory,
    deleteCategory,
    updatePaymentMethod,
    deletePaymentMethod,
    addIncomeType,
    updateIncomeType,
    deleteIncomeType,
    lastSync
  } = useSupabaseData();

  // Estados para UI
  const [activeTab, setActiveTab] = useState('gastos');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState({
    gastos: false,
    ingresos: false,
    balance: false,
    reportes: false,
    configuracion: false
  });
  
  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    minAmount: '',
    maxAmount: '',
    hasNotes: false
  });
  
  // Estados para presupuestos
  const [showBudgets, setShowBudgets] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [newBudget, setNewBudget] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly'
  });
  
  // Estados para transacciones recurrentes
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringTransactionType, setRecurringTransactionType] = useState('expense');
  const [newRecurringExpense, setNewRecurringExpense] = useState({
    description: '',
    amount: '',
    category: '',
    incomeType: '',
    currency: 'PEN',
    frequency: 'monthly',
    nextDate: getTodayLocalDateString(),
    isActive: true
  });
  
  // Estados para tipos de gráficos
  const [chartType, setChartType] = useState('pie');
  
  // Estado para formulario de método de pago
  const [newPaymentMethodForm, setNewPaymentMethodForm] = useState({
    name: '',
    color: '#74B9FF',
    payment_type: 'cash',
    cc_closing_day: '',
    cc_payment_day: ''
  });
  
  // Estados para monedas y tipo de cambio
  const [exchangeRate, setExchangeRate] = useState(3.75); // Tipo de cambio USD a PEN
  const [salaryDay, setSalaryDay] = useState(28); // Día del mes que recibes tu sueldo
  const [currencies] = useState([
    { id: 'PEN', name: 'Soles (S/.)', symbol: 'S/.' },
    { id: 'USD', name: 'Dólares ($)', symbol: '$' }
  ]);

  // Cargar tipo de cambio y día de sueldo desde configuración cuando se cargan los settings
  useEffect(() => {
    if (settings) {
      if (settings.exchange_rate) {
        setExchangeRate(settings.exchange_rate);
      }
      if (settings.salary_day) {
        setSalaryDay(settings.salary_day);
      }
    }
  }, [settings]);

  // Función para guardar tipo de cambio
  const saveExchangeRate = async (newRate) => {
    try {
      await updateSettings({ exchange_rate: newRate });
      setExchangeRate(newRate);
    } catch (error) {
      console.error('Error guardando tipo de cambio:', error);
    }
  };

  // Función para guardar día de sueldo
  const saveSalaryDay = async (newDay) => {
    try {
      await updateSettings({ salary_day: newDay });
      setSalaryDay(newDay);
    } catch (error) {
      console.error('Error guardando día de sueldo:', error);
    }
  };

  // Función para cambiar el tipo de transacción recurrente
  const handleRecurringTypeChange = (type) => {
    setRecurringTransactionType(type);
    // Limpiar campos específicos del tipo anterior
    setNewRecurringExpense({
      ...newRecurringExpense,
      category: '',
      incomeType: ''
    });
  };

  // Función para alternar el colapso de secciones
  const toggleSection = (section) => {
    setMenuCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Estados para ordenamiento
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Estados para UX móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Estados para mensajes informativos
  const [error, setError] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [incomeError, setIncomeError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Limpiar errores automáticamente después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Estados para formularios
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: '',
    paymentMethod: '',
    currency: 'PEN', // Soles por defecto
    date: getTodayLocalDateString()
  });

  const [newIncome, setNewIncome] = useState({
    amount: '',
    description: '',
    type: '',
    currency: 'PEN', // Soles por defecto
    date: getTodayLocalDateString()
  });

  // Estados para filtros (gastos e ingresos)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: '',
    category: ''
  });

  // Estados para filtros de reportes (separados)
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: ''
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

  const selectClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
    darkMode 
      ? 'bg-gray-700 border-gray-600 text-white [&>option]:bg-gray-700 [&>option]:text-white' 
      : 'bg-white border-gray-300 text-gray-900 [&>option]:bg-white [&>option]:text-gray-900'
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
        currency: 'PEN',
        date: getTodayLocalDateString()
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
        currency: 'PEN',
        date: getTodayLocalDateString()
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

  // Función para filtrar gastos considerando fechas de TC
  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      const paymentMethod = paymentMethods.find(pm => pm.id === expense.payment_method_id);
      const assignmentDate = getCreditCardAssignmentMonth(expense.date, paymentMethod);
      const assignmentDateObj = new Date(assignmentDate);
      
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      
      if (startDate && assignmentDateObj < startDate) return false;
      if (endDate && assignmentDateObj > endDate) return false;
      if (filters.paymentMethod && expense.payment_method_id !== filters.paymentMethod) return false;
      if (filters.category && expense.category_id !== filters.category) return false;
      
      return true;
    });
  };

  // Función para búsqueda inteligente en gastos con filtros avanzados
  const getSearchedExpenses = () => {
    let filtered = getFilteredExpenses();
    
    // Aplicar filtros avanzados
    if (advancedFilters.minAmount) {
      filtered = filtered.filter(expense => parseFloat(expense.amount) >= parseFloat(advancedFilters.minAmount));
    }
    if (advancedFilters.maxAmount) {
      filtered = filtered.filter(expense => parseFloat(expense.amount) <= parseFloat(advancedFilters.maxAmount));
    }
    if (advancedFilters.hasNotes) {
      filtered = filtered.filter(expense => expense.notes && expense.notes.trim());
    }
    
    // Aplicar búsqueda por texto
    if (!searchTerm.trim()) return filtered;

    return filtered.filter(expense => {
      const searchLower = searchTerm.toLowerCase();
      
      // Buscar en descripción
      if (expense.description.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en monto
      if (expense.amount.toString().includes(searchTerm)) return true;
      
      // Buscar en fecha
      const formattedDate = formatDateForDisplay(expense.date);
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
      const formattedDate = formatDateForDisplay(income.date);
      if (formattedDate.includes(searchTerm)) return true;
      
      // Buscar en tipo de ingreso
      const incomeType = incomeTypes.find(t => t.id === income.income_type_id);
      if (incomeType && incomeType.name.toLowerCase().includes(searchLower)) return true;
      
      // Buscar en notas
      if (income.notes && income.notes.toLowerCase().includes(searchLower)) return true;
      
      return false;
    });
  };

  // Funciones específicas para filtros de reportes
  const getReportFilteredExpenses = () => {
    return expenses.filter(expense => {
      const paymentMethod = paymentMethods.find(pm => pm.id === expense.payment_method_id);
      const assignmentDate = getCreditCardAssignmentMonth(expense.date, paymentMethod);
      const assignmentDateObj = new Date(assignmentDate);
      
      const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
      const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;
      
      if (startDate && assignmentDateObj < startDate) return false;
      if (endDate && assignmentDateObj > endDate) return false;
      
      return true;
    });
  };

  const getReportFilteredIncomes = () => {
    return incomes.filter(income => {
      const incomeDate = new Date(income.date);
      const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
      const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;
      
      if (startDate && incomeDate < startDate) return false;
      if (endDate && incomeDate > endDate) return false;
      
      return true;
    });
  };

  // Funciones utilitarias para monedas
  const convertToSoles = (amount, currency) => {
    if (currency === 'USD') {
      return amount * exchangeRate;
    }
    return amount; // Ya está en soles
  };

  const formatCurrency = (amount, currency = 'PEN', showOriginal = false) => {
    const solesAmount = convertToSoles(amount, currency);
    if (showOriginal && currency === 'USD') {
      return `S/. ${solesAmount.toFixed(2)} (US$ ${amount.toFixed(2)})`;
    }
    return `S/. ${solesAmount.toFixed(2)}`;
  };

  const getCurrencySymbol = (currencyId) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.symbol : 'S/.';
  };

  // Funciones para ordenamiento
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data, config = sortConfig) => {
    if (!config.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[config.key];
      let bValue = b[config.key];
      
      // Manejar casos especiales
      if (config.key === 'amount') {
        aValue = parseFloat(convertToSoles(aValue, a.currency || 'PEN'));
        bValue = parseFloat(convertToSoles(bValue, b.currency || 'PEN'));
      } else if (config.key === 'description') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Función para obtener datos del mes seleccionado
  const getMonthData = () => {
    const [year, month] = reportMonth.split('-');
    
    // Calcular fechas del mes
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    // Obtener resumen financiero que incluye gastos recurrentes
    const summary = getFinancialSummary(formatDateToLocalString(startDate), formatDateToLocalString(endDate));
    
    // Filtrar gastos e ingresos regulares del mes
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

    // Usar los valores del resumen que incluyen gastos recurrentes
    return { 
      monthExpenses, 
      monthIncomes, 
      totalExpenses: summary.total_expenses,
      totalIncomes: summary.total_incomes, 
      balance: summary.balance,
      regularExpenses: summary.regular_expenses,
      recurringExpenses: summary.recurring_expenses
    };
  };

  // Funciones para manejar presupuestos
  const addBudget = () => {
    if (!newBudget.categoryId || !newBudget.amount) return;
    
    const budget = {
      id: Date.now().toString(),
      categoryId: newBudget.categoryId,
      amount: parseFloat(newBudget.amount),
      period: newBudget.period,
      createdAt: new Date().toISOString()
    };
    
    setBudgets([...budgets, budget]);
    setNewBudget({ categoryId: '', amount: '', period: 'monthly' });
    setSuccessMessage('Presupuesto agregado exitosamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const deleteBudget = (budgetId) => {
    setBudgets(budgets.filter(b => b.id !== budgetId));
    setSuccessMessage('Presupuesto eliminado');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getBudgetProgress = (budget) => {
    const now = new Date();
    let startDate, endDate;
    
    if (budget.period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (budget.period === 'weekly') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else { // yearly
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }
    
    const periodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expense.category_id === budget.categoryId &&
             expenseDate >= startDate && expenseDate <= endDate;
    });
    
    const spent = periodExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const percentage = (spent / budget.amount) * 100;
    
    return { spent, percentage, remaining: budget.amount - spent };
  };

  // Funciones para gastos recurrentes
  const addRecurringExpense = async () => {
    // Validar campos según el tipo de transacción
    const isExpense = recurringTransactionType === 'expense';
    const requiredField = isExpense ? newRecurringExpense.category : newRecurringExpense.incomeType;
    
    if (!newRecurringExpense.description || !newRecurringExpense.amount || !requiredField) return;
    
    const transactionData = {
      description: newRecurringExpense.description,
      amount: newRecurringExpense.amount,
      currency: newRecurringExpense.currency,
      frequency: newRecurringExpense.frequency,
      nextDate: newRecurringExpense.nextDate,
      transaction_type: recurringTransactionType
    };

    // Agregar el campo específico según el tipo
    if (isExpense) {
      transactionData.category = newRecurringExpense.category;
    } else {
      transactionData.incomeType = newRecurringExpense.incomeType;
    }
    
    const result = await addRecurringExpenseToData(transactionData);
    
    if (result.success) {
      setNewRecurringExpense({
        description: '',
        amount: '',
        category: '',
        incomeType: '',
        currency: 'PEN',
        frequency: 'monthly',
        nextDate: getTodayLocalDateString(),
        isActive: true
      });
      setSuccessMessage(
        `${recurringTransactionType === 'expense' ? 'Gasto' : 'Ingreso'} recurrente agregado exitosamente`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const deleteRecurringExpense = async (id) => {
    const result = await deleteRecurringExpenseFromData(id);
    if (result.success) {
      setSuccessMessage('Gasto recurrente eliminado');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const toggleRecurringExpense = async (id) => {
    const recurring = recurringExpenses.find(r => r.id === id);
    if (!recurring) return;
    
    const result = await updateRecurringExpense(id, {
      is_active: !recurring.is_active
    });
    
    if (result.success) {
      setSuccessMessage('Estado actualizado');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setError(result.error);
    }
  };

  // Función para agregar método de pago con validación de TC
  const addPaymentMethodWithValidation = async () => {
    setError(''); // Limpiar errores previos
    
    if (!newPaymentMethodForm.name.trim()) {
      setError('El nombre del método de pago es obligatorio');
      return;
    }

    // Refrescar datos para asegurar que tenemos la información más reciente
    await refreshData();

    // Verificar si ya existe un método de pago con ese nombre (después del refresh)
    const currentPaymentMethods = paymentMethods.length > 0 ? paymentMethods : 
      await new Promise(resolve => {
        setTimeout(() => resolve(paymentMethods), 100); // Esperar un poco por el refresh
      });
    
    const existingMethod = currentPaymentMethods.find(method => 
      method.name.toLowerCase().trim() === newPaymentMethodForm.name.toLowerCase().trim()
    );
    
    if (existingMethod) {
      setError(`Ya existe un método de pago con el nombre "${newPaymentMethodForm.name}"`);
      return;
    }

    if (newPaymentMethodForm.payment_type === 'credit_card') {
      if (!newPaymentMethodForm.cc_closing_day || !newPaymentMethodForm.cc_payment_day) {
        setError('Para tarjetas de crédito, las fechas de cierre y pago son obligatorias');
        return;
      }
      
      const closingDay = parseInt(newPaymentMethodForm.cc_closing_day);
      const paymentDay = parseInt(newPaymentMethodForm.cc_payment_day);
      
      if (closingDay < 1 || closingDay > 31 || paymentDay < 1 || paymentDay > 31) {
        setError('Los días deben estar entre 1 y 31');
        return;
      }
    }

    const methodData = {
      name: newPaymentMethodForm.name.trim(),
      color: newPaymentMethodForm.color,
      payment_type: newPaymentMethodForm.payment_type,
      sort_order: paymentMethods.length + 1
    };

    if (newPaymentMethodForm.payment_type === 'credit_card') {
      methodData.cc_closing_day = parseInt(newPaymentMethodForm.cc_closing_day);
      methodData.cc_payment_day = parseInt(newPaymentMethodForm.cc_payment_day);
    }

    const result = await addPaymentMethod(methodData);
    
    if (result.success) {
      setNewPaymentMethodForm({
        name: '',
        color: '#74B9FF',
        payment_type: 'cash',
        cc_closing_day: '',
        cc_payment_day: ''
      });
      setSuccessMessage('Método de pago agregado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      // Manejo específico para errores de constraint único
      if (result.error && result.error.includes('duplicate key value violates unique constraint')) {
        setError(`Ya existe un método de pago con el nombre "${newPaymentMethodForm.name}". Intenta con un nombre diferente.`);
      } else {
        setError(result.error || 'Error al crear el método de pago');
      }
    }
  };

  const getNextDueDate = (currentDate, frequency) => {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return formatDateToLocalString(date);
  };

  // Función para obtener datos de tendencia
  const getTrendData = () => {
    const months = parseInt(trendPeriod);
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      // Calcular fechas del mes
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Obtener resumen financiero que incluye gastos recurrentes
      const summary = getFinancialSummary(
        formatDateToLocalString(startDate), 
        formatDateToLocalString(endDate)
      );
      
      data.push({
        month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        gastos: summary.total_expenses,
        ingresos: summary.total_incomes,
        balance: summary.balance
      });
    }
    
    return data;
  };

  // Componente para mensajes
  const MessageAlert = ({ message, type = 'success' }) => {
    if (!message) return null;
    
    const isError = type === 'error';
    const bgColor = isError ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300';
    const textColor = isError ? 'text-red-900' : 'text-green-900';
    const iconColor = isError ? 'text-red-500' : 'text-green-500';
    
    return (
      <div className={`fixed top-4 right-4 left-4 z-50 mx-auto max-w-md p-4 rounded-lg border-2 shadow-lg transform transition-all duration-300 ${bgColor} ${isError ? 'animate-pulse border-red-400' : ''}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertCircle className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${textColor}`}>{message}</p>
          </div>
          {isError && (
            <div className="ml-2">
              <div className={`h-2 w-2 rounded-full ${iconColor.replace('text-', 'bg-')} animate-ping`}></div>
            </div>
          )}
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
          <div className="flex justify-between items-center py-4">
            <h1 className={`text-xl sm:text-2xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              💰 Gestor Financiero
            </h1>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
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
                <span>Tema</span>
              </button>
              
              {isAuthenticated && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-xs transition-colors duration-200 ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                </div>
              )}
              
              {isAuthenticated && (
                <>
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
                    <span>Excel</span>
                  </button>
                  
                  <label className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm ${
                    darkMode 
                      ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}>
                    <Upload className="w-4 h-4" />
                    <span>Importar</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={() => setShowBudgets(!showBudgets)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                      darkMode 
                        ? 'bg-purple-900 text-purple-300 hover:bg-purple-800' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Presupuestos</span>
                  </button>
                  
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
                </>
              )}
              
              <AuthButton
                isAuthenticated={isAuthenticated}
                user={user}
                onSignIn={() => setShowAuthModal(true)}
                onSignOut={handleSignOut}
                loading={loading}
                darkMode={darkMode}
                isMobile={false}
              />
            </div>
            
            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center space-x-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className={`lg:hidden border-t py-4 space-y-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {isAuthenticated && (
                <div className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => {
                        setShowExportModal(true);
                        setShowMobileMenu(false);
                      }}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        darkMode 
                          ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar</span>
                    </button>
                    
                    <label className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm ${
                      darkMode 
                        ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Importar</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>
                    
                    <button
                      onClick={() => {
                        setShowBudgets(!showBudgets);
                        setShowMobileMenu(false);
                      }}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        darkMode 
                          ? 'bg-purple-900 text-purple-300 hover:bg-purple-800' 
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      <span>Presupuestos</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowConfig(!showConfig);
                        setShowMobileMenu(false);
                      }}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configuración</span>
                    </button>
                  </>
                )}
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <AuthButton
                  isAuthenticated={isAuthenticated}
                  user={user}
                  onSignIn={() => {
                    setShowAuthModal(true);
                    setShowMobileMenu(false);
                  }}
                  onSignOut={handleSignOut}
                  loading={loading}
                  darkMode={darkMode}
                  isMobile={true}
                />
              </div>
            </div>
          )}
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
        ) : showBudgets ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Gestión de Presupuestos</h2>
              <button
                onClick={() => setShowBudgets(false)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <X className="w-4 h-4" />
                <span>Cerrar</span>
              </button>
            </div>

            {/* Agregar nuevo presupuesto */}
            <div className={`${cardClasses} p-6 mb-6`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-500" />
                Crear Nuevo Presupuesto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Categoría</label>
                  <select
                    value={newBudget.categoryId}
                    onChange={(e) => setNewBudget({...newBudget, categoryId: e.target.value})}
                    className={selectClasses}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({...newBudget, amount: e.target.value})}
                    className={inputClasses}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Período</label>
                  <select
                    value={newBudget.period}
                    onChange={(e) => setNewBudget({...newBudget, period: e.target.value})}
                    className={inputClasses}
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={addBudget}
                    disabled={!newBudget.categoryId || !newBudget.amount}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Crear Presupuesto
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de presupuestos activos */}
            <div className={cardClasses}>
              <div className={`p-6 border-b transition-colors duration-200 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="text-lg font-semibold">Presupuestos Activos</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {budgets.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay presupuestos configurados</p>
                    <p className="text-sm">Crea tu primer presupuesto para controlar tus gastos</p>
                  </div>
                ) : (
                  budgets.map(budget => {
                    const category = categories.find(c => c.id === budget.categoryId);
                    const progress = getBudgetProgress(budget);
                    const isOverBudget = progress.percentage > 100;
                    
                    return (
                      <div key={budget.id} className={`p-6 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">{category?.name}</h4>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Presupuesto {budget.period === 'monthly' ? 'mensual' : budget.period === 'weekly' ? 'semanal' : 'anual'}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteBudget(budget.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {formatCurrency(progress.spent)} de {formatCurrency(budget.amount)}
                            </span>
                            <span className={`text-sm font-bold ${
                              isOverBudget ? 'text-red-600' : progress.percentage > 80 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {progress.percentage.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isOverBudget ? 'bg-red-500' : progress.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {progress.remaining >= 0 ? `Restante: $${progress.remaining.toFixed(2)}` : `Excedido: $${Math.abs(progress.remaining).toFixed(2)}`}
                            </span>
                            {isOverBudget && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                ¡Presupuesto excedido!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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

              {/* Configuración de Monedas */}
              <div className={`rounded-lg shadow p-6 transition-colors duration-200 ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <CreditCard className="w-5 h-5 mr-2 text-yellow-500" />
                  Configuración de Monedas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Tipo de Cambio USD a PEN
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        US$ 1.00 =
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={exchangeRate}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value) || 3.75;
                          saveExchangeRate(newRate);
                        }}
                        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="3.75"
                      />
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Soles
                      </span>
                    </div>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Actualiza este valor cuando cambien las tasas de cambio
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Día del Sueldo
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Día:
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={salaryDay}
                        onChange={(e) => {
                          const newDay = parseInt(e.target.value) || 28;
                          if (newDay >= 1 && newDay <= 31) {
                            saveSalaryDay(newDay);
                          }
                        }}
                        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="28"
                      />
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        de cada mes
                      </span>
                    </div>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Usado para calcular cuándo impactan los gastos de TC en tu balance
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Monedas Disponibles
                    </label>
                    <div className="space-y-2">
                      {currencies.map(currency => (
                        <div key={currency.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700' 
                            : 'border-gray-200 bg-gray-50'
                        }`}>
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {currency.name}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded transition-colors duration-200 ${
                            currency.id === 'PEN' 
                              ? darkMode 
                                ? 'bg-green-900 text-green-200' 
                                : 'bg-green-100 text-green-800'
                              : darkMode 
                                ? 'bg-blue-900 text-blue-200' 
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {currency.id === 'PEN' ? 'Por defecto' : 'Secundaria'}
                          </span>
                        </div>
                      ))}
                    </div>
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
                  <div className="space-y-4">
                    {/* Campos básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre del método"
                        value={newPaymentMethodForm.name}
                        onChange={(e) => setNewPaymentMethodForm({
                          ...newPaymentMethodForm, 
                          name: e.target.value
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="color"
                        value={newPaymentMethodForm.color}
                        onChange={(e) => setNewPaymentMethodForm({
                          ...newPaymentMethodForm, 
                          color: e.target.value
                        })}
                        className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                      />
                      <select
                        value={newPaymentMethodForm.payment_type}
                        onChange={(e) => setNewPaymentMethodForm({
                          ...newPaymentMethodForm, 
                          payment_type: e.target.value,
                          cc_closing_day: '',
                          cc_payment_day: ''
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Efectivo/Débito</option>
                        <option value="credit_card">Tarjeta de Crédito</option>
                      </select>
                    </div>
                    
                    {/* Campos específicos para TC */}
                    {newPaymentMethodForm.payment_type === 'credit_card' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            Día de Cierre *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Ej: 10"
                            value={newPaymentMethodForm.cc_closing_day}
                            onChange={(e) => setNewPaymentMethodForm({
                              ...newPaymentMethodForm, 
                              cc_closing_day: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-blue-600 mt-1">
                            Día del mes que cierra el estado de cuenta
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            Día de Pago *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Ej: 19"
                            value={newPaymentMethodForm.cc_payment_day}
                            onChange={(e) => setNewPaymentMethodForm({
                              ...newPaymentMethodForm, 
                              cc_payment_day: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-blue-600 mt-1">
                            Día límite de pago cada mes
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={addPaymentMethodWithValidation}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      {newPaymentMethodForm.payment_type === 'credit_card' ? 'Agregar Tarjeta de Crédito' : 'Agregar Método de Pago'}
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
                          <div className="flex flex-col">
                            <span 
                              onClick={() => setEditingPayment(method.id)}
                              className="font-medium cursor-pointer hover:text-blue-600"
                            >
                              {method.name}
                            </span>
                            <div className="flex items-center space-x-2 mt-1">
                              {method.payment_type === 'credit_card' ? (
                                <>
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                    TC
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Cierre: {method.cc_closing_day}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Pago: {method.cc_payment_day}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                                  Efectivo/Débito
                                </span>
                              )}
                            </div>
                          </div>
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
                { id: 'recurrentes', label: 'Recurrentes', icon: Repeat },
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
                    
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                      <select
                        value={newExpense.currency}
                        onChange={(e) => setNewExpense({...newExpense, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {currencies.map(currency => (
                          <option key={currency.id} value={currency.id}>{currency.name}</option>
                        ))}
                      </select>
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
                
                {/* Barra de búsqueda avanzada */}
                <div className={`${cardClasses} p-4 mb-6`}>
                  <div className="space-y-4">
                    {/* Búsqueda principal */}
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
                    
                    {/* Filtros avanzados */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Monto mínimo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={advancedFilters.minAmount}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})}
                          className={inputClasses}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Monto máximo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={advancedFilters.maxAmount}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, maxAmount: e.target.value})}
                          className={inputClasses}
                          placeholder="999999.99"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={advancedFilters.hasNotes}
                            onChange={(e) => setAdvancedFilters({...advancedFilters, hasNotes: e.target.checked})}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Solo con notas</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Limpiar filtros */}
                    {(advancedFilters.minAmount || advancedFilters.maxAmount || advancedFilters.hasNotes) && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setAdvancedFilters({ minAmount: '', maxAmount: '', hasNotes: false })}
                          className={`text-sm px-3 py-1 rounded transition-colors ${
                            darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Limpiar filtros avanzados
                        </button>
                      </div>
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
                                      {category?.name} • {paymentMethod?.name}
                                      {paymentMethod?.payment_type === 'credit_card' && (
                                        <span className="text-blue-600">
                                          {' '}• Pago: {new Date(getCreditCardAssignmentMonth(expense.date, paymentMethod) + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                        </span>
                                      )}
                                      {' '}• {formatDateForDisplay(expense.date)}
                                    </p>
                                    {expense.notes && (
                                      <p className="text-sm text-gray-400 mt-1">{expense.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-semibold text-red-600">
                                  -{formatCurrency(Number(expense.amount), expense.currency)}
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
                    
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                      <select
                        value={newIncome.currency}
                        onChange={(e) => setNewIncome({...newIncome, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {currencies.map(currency => (
                          <option key={currency.id} value={currency.id}>{currency.name}</option>
                        ))}
                      </select>
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
                                      {incomeType?.name} • {formatDateForDisplay(income.date)}
                                    </p>
                                    {income.notes && (
                                      <p className="text-sm text-gray-400 mt-1">{income.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-semibold text-green-600">
                                  +{formatCurrency(Number(income.amount), income.currency)}
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        value={reportFilters.startDate}
                        onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                      <input
                        type="date"
                        value={reportFilters.endDate}
                        onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => setReportFilters({ startDate: '', endDate: '' })}
                        className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                      >
                        Limpiar Filtros
                      </button>
                      
                      <button
                        onClick={() => {
                          const now = new Date();
                          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                          setReportFilters({
                            startDate: formatDateToLocalString(firstDay),
                            endDate: formatDateToLocalString(lastDay)
                          });
                        }}
                        className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm flex items-center justify-center space-x-1"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Este Mes</span>
                      </button>
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
                  
                  {/* Selector de tipo de gráfico */}
                  <div className="mt-4 border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Gráfico:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setChartType('pie')}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          chartType === 'pie' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🥧 Circular
                      </button>
                      <button
                        onClick={() => setChartType('donut')}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          chartType === 'donut' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🍩 Dona
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          chartType === 'bar' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📊 Barras
                      </button>
                      <button
                        onClick={() => setChartType('area')}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          chartType === 'area' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📈 Área
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resumen Filtrado */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  {(() => {
                    // Obtener resumen financiero que incluye gastos recurrentes para el período filtrado
                    const summary = getFinancialSummary(reportFilters.startDate, reportFilters.endDate);
                    const filteredExpenses = getReportFilteredExpenses();
                    const filteredIncomes = getReportFilteredIncomes();
                    const totalExpenses = summary.total_expenses;
                    const totalIncomes = summary.total_incomes;
                    const balance = summary.balance;
                    
                    return (
                      <>
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Total Ingresos</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes)}</p>
                            <p className="text-sm text-gray-500">{filteredIncomes.length} transacciones</p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Total Gastos</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                            <p className="text-sm text-gray-500">
                              {filteredExpenses.length} regulares + {summary.recurring_expenses} recurrentes
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow p-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Balance Neto</p>
                            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(balance)}
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
                              S/. {(() => {
                                const days = reportFilters.startDate && reportFilters.endDate 
                                  ? Math.max(1, Math.ceil((new Date(reportFilters.endDate) - new Date(reportFilters.startDate)) / (1000 * 60 * 60 * 24)) + 1)
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
                      const filteredExpenses = getReportFilteredExpenses();
                      
                      // Generar gastos recurrentes para el período filtrado
                      const recurringExpensesInPeriod = generateRecurringExpenses(reportFilters.startDate, reportFilters.endDate);
                      
                      const categoryStats = categories.map(category => {
                        const categoryExpenses = filteredExpenses.filter(expense => expense.category_id === category.id);
                        const recurringExpenses = recurringExpensesInPeriod.filter(expense => expense.category_id === category.id);
                        
                        const regularTotal = categoryExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        const recurringTotal = recurringExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        
                        return {
                          name: category.name,
                          value: regularTotal + recurringTotal,
                          count: categoryExpenses.length + recurringExpenses.length,
                          color: category.color,
                          regular: regularTotal,
                          recurring: recurringTotal
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
                              {chartType === 'pie' && (
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
                                  <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Total']} />
                                </PieChart>
                              )}
                              
                              {chartType === 'donut' && (
                                <PieChart>
                                  <Pie
                                    data={categoryStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {categoryStats.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Total']} />
                                </PieChart>
                              )}
                              
                              {chartType === 'bar' && (
                                <BarChart data={categoryStats}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Total']} />
                                  <Bar dataKey="value" fill="#3B82F6">
                                    {categoryStats.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              )}
                              
                              {chartType === 'area' && (
                                <AreaChart data={categoryStats}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Total']} />
                                  <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#3B82F6" 
                                    fill="url(#colorGradient)" 
                                  />
                                  <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                    </linearGradient>
                                  </defs>
                                </AreaChart>
                              )}
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
                                  <div className="font-medium">S/. {category.value.toFixed(2)}</div>
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
                      const filteredExpenses = getReportFilteredExpenses();
                      
                      // Generar gastos recurrentes para el período filtrado
                      const recurringExpensesInPeriod = generateRecurringExpenses(reportFilters.startDate, reportFilters.endDate);
                      
                      // Combinar gastos normales y recurrentes
                      const allExpenses = [...filteredExpenses, ...recurringExpensesInPeriod];
                      
                      const paymentStats = paymentMethods.map(method => {
                        const methodExpenses = allExpenses.filter(expense => expense.payment_method_id === method.id);
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
                                <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Total']} />
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
                                  <div className="font-medium">S/. {method.value.toFixed(2)}</div>
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
                        ...filteredExpenses.map(expense => {
                          const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
                          return {
                            ...expense,
                            type: 'expense',
                            amount: -parseFloat(expense.amount),
                            categoryName: categories.find(c => c.id === expense.category_id)?.name || 'Sin categoría',
                            categoryColor: categories.find(c => c.id === expense.category_id)?.color || '#6B7280',
                            paymentMethodName: paymentMethod?.name || 'Sin método',
                            paymentMethod: paymentMethod,
                            billingMonth: paymentMethod?.payment_type === 'credit_card' 
                              ? getCreditCardAssignmentMonth(expense.date, paymentMethod)
                              : null
                          };
                        }),
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
                                    {transaction.billingMonth && (
                                      <span className="text-blue-600">
                                        {' '}• Cierre: {new Date(transaction.billingMonth).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                      </span>
                                    )}
                                    {' • '}{formatDateForDisplay(transaction.date)}
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
                                {transaction.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
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

            {/* Sección de Presupuestos */}
            {activeTab === 'presupuestos' && (
              <div>
                {/* Gestión de Presupuestos */}
                <div className={`rounded-lg shadow p-6 mb-6 transition-colors duration-200 ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 flex items-center ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Target className="w-5 h-5 mr-2 text-green-500" />
                    Gestión de Presupuestos
                  </h2>
                  
                  {/* Formulario para nuevo presupuesto */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Categoría:</label>
                      <select
                        value={newBudget.categoryId}
                        onChange={(e) => setNewBudget({...newBudget, categoryId: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Monto:</label>
                      <input
                        type="number"
                        value={newBudget.amount}
                        onChange={(e) => setNewBudget({...newBudget, amount: e.target.value})}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Período:</label>
                      <select
                        value={newBudget.period}
                        onChange={(e) => setNewBudget({...newBudget, period: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="yearly">Anual</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={addBudget}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                      >
                        <PlusCircle className="w-4 h-4 inline mr-1" />
                        Agregar
                      </button>
                    </div>
                  </div>
                  
                  {/* Lista de presupuestos */}
                  <div className="space-y-4">
                    {budgets.map(budget => {
                      const categoryName = categories.find(c => c.id === budget.categoryId)?.name || 'Sin categoría';
                      const progress = getBudgetProgress(budget);
                      
                      return (
                        <div key={budget.id} className={`p-4 rounded-lg border transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {categoryName}
                              </h3>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ${budget.amount} {budget.period === 'weekly' ? 'semanal' : budget.period === 'monthly' ? 'mensual' : 'anual'}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteBudget(budget.id)}
                              className={`text-red-500 hover:text-red-700 transition-colors ${
                                darkMode ? 'hover:text-red-400' : ''
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="mb-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Gastado: ${progress.spent.toFixed(2)}
                              </span>
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                {progress.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className={`w-full bg-gray-200 rounded-full h-2 ${
                              darkMode ? 'bg-gray-600' : ''
                            }`}>
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progress.percentage >= 100 
                                    ? 'bg-red-500' 
                                    : progress.percentage >= 80 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {progress.percentage >= 80 && (
                            <div className={`text-sm mt-2 p-2 rounded ${
                              progress.percentage >= 100 
                                ? darkMode 
                                  ? 'bg-red-900 text-red-200' 
                                  : 'bg-red-100 text-red-800'
                                : darkMode 
                                  ? 'bg-yellow-900 text-yellow-200' 
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {progress.percentage >= 100 
                                ? `¡Presupuesto excedido! Has gastado $${(progress.spent - budget.amount).toFixed(2)} de más.`
                                : `¡Atención! Has usado el ${progress.percentage.toFixed(1)}% de tu presupuesto.`
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {budgets.length === 0 && (
                      <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay presupuestos configurados</p>
                        <p className="text-sm">Agrega tu primer presupuesto arriba</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sección de Gastos Recurrentes */}
            {activeTab === 'recurrentes' && (
              <div>
                {/* Gestión de Gastos Recurrentes */}
                <div className={`rounded-lg shadow p-6 mb-6 transition-colors duration-200 ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-xl font-semibold flex items-center ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <Repeat className="w-5 h-5 mr-2 text-blue-500" />
                      Transacciones Recurrentes
                    </h2>
                    
                    {/* Toggle entre Gastos e Ingresos */}
                    <div className={`flex items-center rounded-lg p-1 transition-colors duration-200 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <button
                        onClick={() => handleRecurringTypeChange('expense')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
                          recurringTransactionType === 'expense'
                            ? 'bg-red-500 text-white'
                            : darkMode 
                              ? 'text-gray-300 hover:text-white' 
                              : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        💸 Gastos
                      </button>
                      <button
                        onClick={() => handleRecurringTypeChange('income')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
                          recurringTransactionType === 'income'
                            ? 'bg-green-500 text-white'
                            : darkMode 
                              ? 'text-gray-300 hover:text-white' 
                              : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        💰 Ingresos
                      </button>
                    </div>
                  </div>
                  
                  {/* Formulario para nueva transacción recurrente */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Descripción:</label>
                      <input
                        type="text"
                        value={newRecurringExpense.description}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, description: e.target.value})}
                        placeholder={recurringTransactionType === 'expense' ? 'ej. Netflix, Spotify...' : 'ej. Sueldo, Freelance...'}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Monto:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newRecurringExpense.amount}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, amount: e.target.value})}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                    
                    {/* Campo condicional: Categoría para gastos, Tipo de ingreso para ingresos */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {recurringTransactionType === 'expense' ? 'Categoría:' : 'Tipo de Ingreso:'}
                      </label>
                      <select
                        value={recurringTransactionType === 'expense' ? newRecurringExpense.category : newRecurringExpense.incomeType}
                        onChange={(e) => {
                          if (recurringTransactionType === 'expense') {
                            setNewRecurringExpense({...newRecurringExpense, category: e.target.value, incomeType: ''});
                          } else {
                            setNewRecurringExpense({...newRecurringExpense, incomeType: e.target.value, category: ''});
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">
                          {recurringTransactionType === 'expense' ? 'Seleccionar categoría' : 'Seleccionar tipo de ingreso'}
                        </option>
                        {recurringTransactionType === 'expense' 
                          ? categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))
                          : incomeTypes.map(type => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))
                        }
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Frecuencia:</label>
                      <select
                        value={newRecurringExpense.frequency}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, frequency: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="yearly">Anual</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Moneda:</label>
                      <select
                        value={newRecurringExpense.currency}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, currency: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        {currencies.map(currency => (
                          <option key={currency.id} value={currency.id}>{currency.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Próximo Cobro:</label>
                      <input
                        type="date"
                        value={newRecurringExpense.nextDate}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, nextDate: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={addRecurringExpense}
                        disabled={
                          !newRecurringExpense.description || 
                          !newRecurringExpense.amount || 
                          (recurringTransactionType === 'expense' ? !newRecurringExpense.category : !newRecurringExpense.incomeType)
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <PlusCircle className="w-4 h-4 inline mr-1" />
                        {recurringTransactionType === 'expense' ? 'Agregar Gasto' : 'Agregar Ingreso'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Lista de gastos recurrentes */}
                  <div className="space-y-4">
                    {recurringExpenses.length === 0 ? (
                      <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Repeat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No hay gastos recurrentes</p>
                        <p>Agrega tu primer gasto recurrente usando el formulario de arriba</p>
                      </div>
                    ) : (
                      recurringExpenses.map(recurring => {
                        const category = categories.find(c => c.id === recurring.category_id);
                        const nextDueDate = formatDateForDisplay(recurring.next_date);
                        const frequencyLabel = {
                          weekly: 'Semanal',
                          monthly: 'Mensual',
                          quarterly: 'Trimestral',
                          yearly: 'Anual'
                        }[recurring.frequency];
                        
                        return (
                          <div key={recurring.id} className={`p-4 rounded-lg border transition-colors duration-200 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: category?.color || '#6B7280' }}
                                ></div>
                                <div>
                                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {recurring.description}
                                  </h3>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatCurrency(recurring.amount, recurring.currency, recurring.currency === 'USD')} - {frequencyLabel}
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {category?.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => toggleRecurringExpense(recurring.id)}
                                  className={`px-2 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                                    recurring.is_active 
                                      ? darkMode 
                                        ? 'bg-green-900 text-green-200 hover:bg-green-800' 
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : darkMode 
                                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}
                                >
                                  {recurring.is_active ? 'Activo' : 'Pausado'}
                                </button>
                                <button
                                  onClick={() => deleteRecurringExpense(recurring.id)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                  title="Eliminar gasto recurrente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Próximo cargo: {nextDueDate}
                              </p>
                              {recurring.currency === 'USD' && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  darkMode 
                                    ? 'bg-blue-900 text-blue-200' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  USD → PEN
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
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
                                S/. {totalIncomes.toFixed(2)}
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
                                S/. {totalExpenses.toFixed(2)}
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
                                {formatCurrency(balance)}
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
                          formatter={(value, name) => [`S/. ${Number(value).toFixed(2)}`, name === 'gastos' ? 'Gastos' : name === 'ingresos' ? 'Ingresos' : 'Balance']}
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
                              <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Cantidad']} />
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
                              <Tooltip formatter={(value) => [`S/. ${Number(value).toFixed(2)}`, 'Cantidad']} />
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