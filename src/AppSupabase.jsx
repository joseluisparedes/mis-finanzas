import React, { useState, useEffect } from 'react';
import { PlusCircle, Settings, BarChart3, TrendingUp, TrendingDown, Calendar, CreditCard, Filter, Edit2, Trash2, Save, X, Download, Upload, AlertCircle, Activity, Wifi, WifiOff, User, Moon, Sun, Search, Target, Repeat, MoreHorizontal, TrendingDownIcon, Menu, ArrowUpDown, ArrowUp, ArrowDown, Pause, Play, Users, LogOut } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useUserSubscription } from './hooks/useUserSubscription';
import AuthModal from './components/Auth/AuthModal';
import AuthButton from './components/Auth/AuthButton';
import MigrationBanner from './components/Migration/MigrationBanner';
import FinancialDashboard from './components/FinancialDashboard';
import UserManagementPanel from './components/UserManagementPanel';
import SubscriptionStatus from './components/SubscriptionStatus';
import ProfileCustomization from './components/ProfileCustomization';
import Avatar from './components/Avatar';
import migrationService from './services/migrationService';
import supabaseExcelService from './services/supabaseExcelService';

// Funciones de utilidad de seguridad
const securityUtils = {
  // Sanitizar texto de entrada
  sanitizeText: (input) => {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 255).replace(/[<>]/g, '');
  },
  
  // Validar monto con límites seguros
  validateAmount: (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 999999.99;
  },
  
  // Validar email básico
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  // Validar texto requerido
  validateRequiredText: (text, minLength = 1, maxLength = 255) => {
    if (typeof text !== 'string') return false;
    const cleaned = text.trim();
    return cleaned.length >= minLength && cleaned.length <= maxLength;
  },
  
  // Rate limiting simple
  rateLimiter: (() => {
    const limits = {};
    return (key, maxAttempts = 3, windowMs = 2000) => {
      const now = Date.now();
      if (!limits[key]) limits[key] = [];
      
      // Limpiar intentos antiguos
      limits[key] = limits[key].filter(time => now - time < windowMs);
      
      if (limits[key].length >= maxAttempts) {
        return false; // Rate limited
      }
      
      limits[key].push(now);
      return true; // Permitido
    };
  })()
};

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
    const result = formatDateToLocalString(peruTime);
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
    budgets,
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
    generateRecurringIncomes,
    getCreditCardAssignmentMonth,
    updateSettings,
    signIn,
    signUp,
    googleSignIn,
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
    addBudget: addBudgetToData,
    updateBudget: updateBudgetData,
    deleteBudget: deleteBudgetFromData,
    getBudgetProgress: getBudgetProgressData,
    getUserProfile,
    updateUserProfile,
    lastSync
  } = useSupabaseData();

  // Hook de suscripción para roles
  const { 
    isAdmin, 
    subscriptionType, 
    loading: subscriptionLoading, 
    subscription 
  } = useUserSubscription();

  // Mostrar estado de carga mientras se verifica la suscripción
  const isSubscriptionReady = !subscriptionLoading && subscription !== undefined;

  // Variables derivadas
  const recurringIncomes = recurringExpenses.filter(r => r.transaction_type === 'income');
  const actualRecurringExpenses = recurringExpenses.filter(r => r.transaction_type === 'expense');

  // Estados para UI
  const [activeTab, setActiveTab] = useState('gastos');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [showProfileCustomization, setShowProfileCustomization] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState({
    gastos: false,
    ingresos: false,
    balance: false,
    reportes: false,
    configuracion: false
  });
  
  // Estados para búsqueda
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  
  // Estados para edición
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
  const [editPaymentFormData, setEditPaymentFormData] = useState({});
  
  // Estados para presupuestos
  const [showBudgets, setShowBudgets] = useState(false);
  const [expandedBudgets, setExpandedBudgets] = useState(new Set());
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
  
  // Estados para secciones expandibles en Detalle de Balance
  const [expandedSections, setExpandedSections] = useState({
    regularIncomes: false,
    recurringIncomes: false,
    regularExpenses: false,
    recurringExpenses: false
  });

  // Estados para selectores de vista en Detalle de Balance
  const [balanceViewOptions, setBalanceViewOptions] = useState({
    incomes: 'category', // 'category', 'payment', 'both'
    expenses: 'category' // 'category', 'payment', 'both'
  });
  
  // Estado para formulario de método de pago
  const [newPaymentMethodForm, setNewPaymentMethodForm] = useState({
    name: '',
    color: '#74B9FF',
    payment_type: 'cash',
    cc_closing_day: '',
    cc_payment_day: ''
  });
  
  // Estados para monedas y tipo de cambio
  const [exchangeRate, setExchangeRate] = useState(3.78); // Tipo de cambio USD a PEN actualizado
  const [salaryDay, setSalaryDay] = useState(28); // Día del mes que recibes tu sueldo
  const [currencies] = useState([
    { id: 'PEN', name: 'Soles (S/.)', symbol: 'S/.' },
    { id: 'USD', name: 'Dólares ($)', symbol: '$' }
  ]);

  // Cargar tipo de cambio y día de sueldo desde configuración cuando se cargan los settings
  useEffect(() => {
    if (settings) {
      if (settings.exchange_rate) {
        const rate = Number(settings.exchange_rate);
        if (!isNaN(rate) && rate > 0) {
          console.log('Cargando tipo de cambio desde configuración:', rate);
          setExchangeRate(rate);
        }
      }
      if (settings.salary_day) {
        setSalaryDay(settings.salary_day);
      }
    }
  }, [settings]);

  // Cargar perfil de usuario cuando esté autenticado
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (user) {
          const profile = await getUserProfile();
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [user]);

  // Manejar actualización de perfil
  const handleProfileUpdate = (newProfile) => {
    console.log('Actualizando perfil:', newProfile);
    setUserProfile(newProfile);
    
    // Forzar re-renderizado inmediato
    // También recargar el perfil desde la BD para asegurar sincronización
    setTimeout(async () => {
      try {
        const refreshedProfile = await getUserProfile();
        if (refreshedProfile) {
          setUserProfile(refreshedProfile);
          console.log('Perfil recargado:', refreshedProfile);
        }
      } catch (error) {
        console.error('Error recargando perfil:', error);
      }
    }, 100);
  };

  // Función para guardar tipo de cambio
  const saveExchangeRate = async (newRate) => {
    try {
      const rate = Number(newRate);
      if (isNaN(rate) || rate <= 0) {
        console.warn('Tipo de cambio inválido:', newRate);
        return;
      }
      console.log('Guardando nuevo tipo de cambio:', rate);
      await updateSettings({ exchange_rate: rate });
      setExchangeRate(rate);
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

  // Función para alternar secciones expandibles en Detalle de Balance
  const toggleBalanceSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Función para agrupar transacciones por categoría
  const groupByCategory = (transactions) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const category = categories.find(cat => cat.id === transaction.category_id);
      const categoryName = category?.name || 'Sin categoría';
      const categoryColor = category?.color || '#6B7280';
      
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          color: categoryColor,
          items: [],
          total: 0
        };
      }
      
      acc[categoryName].items.push(transaction);
      acc[categoryName].total += convertToSoles(parseFloat(transaction.amount), transaction.currency);
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  // Función para agrupar transacciones por método de pago
  const groupByPaymentMethod = (transactions) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const paymentMethod = paymentMethods.find(pm => pm.id === transaction.payment_method_id);
      const methodName = paymentMethod?.name || 'Sin método';
      const methodColor = paymentMethod?.color || '#6B7280';
      
      if (!acc[methodName]) {
        acc[methodName] = {
          name: methodName,
          color: methodColor,
          items: [],
          total: 0
        };
      }
      
      acc[methodName].items.push(transaction);
      acc[methodName].total += convertToSoles(parseFloat(transaction.amount), transaction.currency);
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  // Función para agrupar transacciones por categoría y método de pago
  const groupByCategoryAndPayment = (transactions) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const category = categories.find(cat => cat.id === transaction.category_id);
      const paymentMethod = paymentMethods.find(pm => pm.id === transaction.payment_method_id);
      const categoryName = category?.name || 'Sin categoría';
      const methodName = paymentMethod?.name || 'Sin método';
      const key = `${categoryName} • ${methodName}`;
      
      if (!acc[key]) {
        acc[key] = {
          name: key,
          category: categoryName,
          paymentMethod: methodName,
          categoryColor: category?.color || '#6B7280',
          paymentColor: paymentMethod?.color || '#6B7280',
          items: [],
          total: 0
        };
      }
      
      acc[key].items.push(transaction);
      acc[key].total += convertToSoles(parseFloat(transaction.amount), transaction.currency);
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => b.total - a.total);
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

  // Estados para filtros de reportes (separados) - inicializar con mes actual
  const [reportFilters, setReportFilters] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      startDate: formatDateToLocalString(firstDay),
      endDate: formatDateToLocalString(lastDay),
      category: '',
      paymentMethod: '',
      showRecurring: true
    };
  });

  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Estado para ordenamiento de transacciones en reportes
  const [transactionSort, setTransactionSort] = useState({
    field: 'date', // 'date', 'amount', 'description'
    direction: 'desc' // 'asc', 'desc'
  });
  const [trendPeriod, setTrendPeriod] = useState('3');

  // Estados para configuración
  const [showConfig, setShowConfig] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  
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

  // Sistema de clases mejorado para dark mode
  const cardClasses = "bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-sm dark:shadow-lg transition-all duration-300";
  const surfaceClasses = "bg-gray-50 dark:bg-dark-bg";
  const textPrimaryClasses = "text-gray-900 dark:text-dark-text";
  const textSecondaryClasses = "text-gray-600 dark:text-dark-text-secondary";
  const textMutedClasses = "text-gray-500 dark:text-dark-text-muted";
  
  const inputClasses = "w-full px-3 py-2 border rounded-md bg-white dark:bg-dark-card border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-base sm:text-sm";

  const selectClasses = "w-full px-3 py-2 border rounded-md bg-white dark:bg-dark-card border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-base sm:text-sm [&>option]:bg-white [&>option]:dark:bg-dark-card [&>option]:text-gray-900 [&>option]:dark:text-dark-text";
  
  const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 shadow-sm hover:shadow-md";
  const buttonSecondaryClasses = "bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-border text-gray-700 dark:text-dark-text font-medium py-2 px-4 rounded-md transition-colors duration-200";
  const buttonDangerClasses = "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200";
  const buttonSuccessClasses = "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200";

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
    
    // Rate limiting
    if (!securityUtils.rateLimiter('expense', 3, 2000)) {
      setExpenseError('Demasiados intentos. Espera un momento.');
      return false;
    }
    
    // Validar monto con límites seguros
    if (!securityUtils.validateAmount(newExpense.amount)) {
      setExpenseError('El monto debe ser mayor a 0 y menor a 999,999.99');
      return false;
    }
    
    // Validar descripción
    if (!securityUtils.validateRequiredText(newExpense.description, 1, 255)) {
      setExpenseError('La descripción es obligatoria (máx. 255 caracteres)');
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
    
    // Rate limiting
    if (!securityUtils.rateLimiter('income', 3, 2000)) {
      setIncomeError('Demasiados intentos. Espera un momento.');
      return false;
    }
    
    // Validar monto con límites seguros
    if (!securityUtils.validateAmount(newIncome.amount)) {
      setIncomeError('El monto debe ser mayor a 0 y menor a 999,999.99');
      return false;
    }
    
    // Validar descripción
    if (!securityUtils.validateRequiredText(newIncome.description, 1, 255)) {
      setIncomeError('La descripción es obligatoria (máx. 255 caracteres)');
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
    
    // Convertir el monto a soles si es necesario y sanitizar datos
    const expenseData = {
      ...newExpense,
      amount: convertToSoles(parseFloat(newExpense.amount), newExpense.currency),
      description: securityUtils.sanitizeText(newExpense.description),
      notes: newExpense.notes ? securityUtils.sanitizeText(newExpense.notes) : null
    };
    
    const result = await addExpenseToData(expenseData);
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
    
    // Convertir el monto a soles si es necesario y sanitizar datos
    const incomeData = {
      ...newIncome,
      amount: convertToSoles(parseFloat(newIncome.amount), newIncome.currency),
      description: securityUtils.sanitizeText(newIncome.description),
      notes: newIncome.notes ? securityUtils.sanitizeText(newIncome.notes) : null
    };
    
    const result = await addIncomeToData(incomeData);
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

  const handleGoogleSignIn = async () => {
    try {
      console.log('AppSupabase: handleGoogleSignIn called');
      console.log('AppSupabase: calling googleSignIn...');
      const result = await googleSignIn();
      console.log('AppSupabase: googleSignIn result:', result);
      if (result.success) {
        // La redirección se maneja automáticamente por Supabase
        // No necesitamos cerrar el modal aquí porque la página se recargará
      }
      return result;
    } catch (error) {
      console.error('AppSupabase: Google sign in error:', error);
      return { success: false, error: error.message };
    }
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

  // Función simplificada para obtener gastos filtrados
  const getSearchedExpenses = () => {
    return getFilteredExpenses();
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

  // Funciones para filtrar con reportFilters (para la sección de Reportes)
  const getReportFilteredExpenses = () => {
    return expenses.filter(expense => {
      const paymentMethod = paymentMethods.find(pm => pm.id === expense.payment_method_id);
      const assignmentDate = getCreditCardAssignmentMonth(expense.date, paymentMethod);
      const assignmentDateObj = new Date(assignmentDate);
      
      const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
      const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;
      
      if (startDate && assignmentDateObj < startDate) return false;
      if (endDate && assignmentDateObj > endDate) return false;
      if (reportFilters.paymentMethod && expense.payment_method_id !== reportFilters.paymentMethod) return false;
      if (reportFilters.category && expense.category_id !== reportFilters.category) return false;
      
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

  // Función simplificada para obtener ingresos filtrados
  const getSearchedIncomes = () => {
    return getFilteredIncomes();
  };


  // Funciones utilitarias para monedas
  const convertToSoles = (amount, currency) => {
    if (currency === 'USD') {
      const rate = Number(exchangeRate) || 3.78;
      const result = Number(amount) * rate;
      console.log(`CONVERSION DEBUG:`, {
        amount_input: amount,
        amount_type: typeof amount,
        currency: currency,
        rate: rate,
        rate_type: typeof rate,
        result: result.toFixed(2)
      });
      return result;
    }
    return Number(amount); // Ya está en soles
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
    
    // Filtrar gastos e ingresos regulares del mes por fecha de asignación al balance
    const monthExpenses = expenses.filter(expense => {
      const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
      const assignmentDate = getCreditCardAssignmentMonth(expense.date, paymentMethod);
      // Agregar hora para evitar problemas de zona horaria
      const assignmentDateObj = new Date(assignmentDate + 'T12:00:00');
      
      return assignmentDateObj.getFullYear() === parseInt(year) && 
             assignmentDateObj.getMonth() === parseInt(month) - 1;
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

  // Función para ordenar transacciones
  const sortTransactions = (transactions) => {
    return [...transactions].sort((a, b) => {
      let aValue, bValue;
      
      switch (transactionSort.field) {
        case 'amount':
          aValue = Math.abs(parseFloat(a.amount));
          bValue = Math.abs(parseFloat(b.amount));
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }
      
      if (transactionSort.direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Funciones para manejar presupuestos (conectadas con hook)
  const addBudget = async () => {
    if (!newBudget.categoryId || !newBudget.amount) {
      setError('Debe seleccionar una categoría y especificar un monto');
      return;
    }

    const result = await addBudgetToData({
      categoryId: newBudget.categoryId,
      amount: newBudget.amount,
      period: newBudget.period
    });

    if (result.success) {
      setNewBudget({ categoryId: '', amount: '', period: 'monthly' });
      setSuccessMessage('Presupuesto agregado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const deleteBudget = async (budgetId) => {
    const result = await deleteBudgetFromData(budgetId);
    if (result.success) {
      setSuccessMessage('Presupuesto eliminado');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setError(result.error);
    }
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
    } else if (budget.period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }
    
    const periodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expense.category_id === budget.category_id &&
             expenseDate >= startDate && expenseDate <= endDate;
    });
    
    const spent = periodExpenses.reduce((sum, expense) => {
      return sum + convertToSoles(parseFloat(expense.amount), expense.currency || 'PEN');
    }, 0);
    const percentage = (spent / budget.amount) * 100;
    
    return { spent, percentage, remaining: budget.amount - spent };
  };

  // Funciones para manejar expansión de presupuestos
  const toggleBudgetExpansion = (budgetId) => {
    const newExpanded = new Set(expandedBudgets);
    if (newExpanded.has(budgetId)) {
      newExpanded.delete(budgetId);
    } else {
      newExpanded.add(budgetId);
    }
    setExpandedBudgets(newExpanded);
  };

  const getBudgetExpenses = (budget) => {
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
    } else if (budget.period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }
    
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expense.category_id === budget.category_id &&
               expenseDate >= startDate && expenseDate <= endDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Funciones para transacciones recurrentes
  const toggleRecurringIncome = async (id) => {
    const recurring = recurringExpenses.find(r => r.id === id);
    if (!recurring) return;
    
    await updateRecurringExpense(id, {
      is_active: !recurring.is_active
    });
  };

  const deleteRecurringIncome = async (id) => {
    await deleteRecurringExpenseFromData(id);
  };

  const addRecurringExpense = async () => {
    // Rate limiting
    if (!securityUtils.rateLimiter('recurring', 3, 2000)) {
      setError('Demasiados intentos. Espera un momento.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Validar campos según el tipo de transacción
    const isExpense = recurringTransactionType === 'expense';
    const requiredField = isExpense ? newRecurringExpense.category : newRecurringExpense.incomeType;
    
    // Validar monto
    if (!securityUtils.validateAmount(newRecurringExpense.amount)) {
      setError('El monto debe ser mayor a 0 y menor a 999,999.99');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Validar descripción
    if (!securityUtils.validateRequiredText(newRecurringExpense.description, 1, 255)) {
      setError('La descripción es obligatoria (máx. 255 caracteres)');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!requiredField) {
      setError(`Debe seleccionar ${isExpense ? 'una categoría' : 'un tipo de ingreso'}`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const transactionData = {
      description: securityUtils.sanitizeText(newRecurringExpense.description),
      amount: parseFloat(newRecurringExpense.amount), // Guardar en moneda original
      currency: newRecurringExpense.currency,
      frequency: newRecurringExpense.frequency,
      nextDate: newRecurringExpense.nextDate,
      transaction_type: recurringTransactionType
    };
    
    console.log('GUARDANDO RECURRENTE:', transactionData);

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
    <div className={`min-h-screen transition-colors duration-300 ${surfaceClasses}`}>
      <header className={`${cardClasses} shadow-lg border-b-2 border-gray-100 dark:border-dark-border rounded-none`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* FILA 1: Título (izquierda) ↔ Usuario + Cerrar sesión (derecha) */}
          <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-dark-border">
            {/* Título - Izquierda */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-xl">
                  <TrendingUp className="w-7 h-7 text-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                </div>
                <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl -z-10 blur-lg"></div>
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent`}>
                  MisFinanzas
                </h1>
                <p className={`text-xs sm:text-sm ${textSecondaryClasses} opacity-75 font-medium`}>
                  Tu centro de control financiero
                </p>
              </div>
            </div>
            
            {/* Usuario + Opciones - Derecha */}
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                /* Usuario Autenticado - Información Completa */
                <div className="flex items-center space-x-3">
                  {/* Avatar y Saludo */}
                  <div className="flex items-center space-x-3">
                    <Avatar
                      avatar={userProfile?.avatar}
                      avatarColor={userProfile?.avatar_color}
                      size="lg"
                      onClick={() => setShowProfileCustomization(true)}
                      className="cursor-pointer hover:scale-105 transition-transform"
                    />
                    <div className="hidden sm:block">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        ¡Hola, {userProfile?.display_name || user?.email?.split('@')[0] || 'Usuario'}!
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {subscriptionType === 'admin' ? '👑 Administrador' : 
                         subscriptionType === 'premium' ? '⭐ Premium' : 
                         subscriptionType === 'family' ? '❤️ Familia' : '🆓 Plan Free'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Opciones de Edición */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowProfileCustomization(true)}
                      className="p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
                      title="Personalizar perfil"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('¿Estás seguro de cerrar sesión?')) {
                          handleSignOut();
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Cerrar sesión"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Usuario No Autenticado */
                <div className="hidden lg:flex items-center space-x-3">
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
              )}
            </div>
          </div>
          
          {/* FILA 2: Tema + Sync (izquierda) ↔ Funcionalidades (derecha) */}
          <div className="flex justify-between items-center py-3">
            
            {/* Tema + Sync - Izquierda */}
            <div className="flex items-center space-x-4">
              {/* Toggle de modo oscuro */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                  darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/80'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">Tema</span>
              </button>
              
              {isAuthenticated && (
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  syncing 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                </div>
              )}
            </div>
            
            {/* Funcionalidades - Derecha */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center">
                {/* Grupo de Datos */}
                <div className="flex items-center border-r border-gray-200 dark:border-gray-600 pr-4 mr-4">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      darkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 active:bg-gray-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                    title="Exportar datos a Excel"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden lg:inline">Excel</span>
                  </button>
                  
                  <label className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium ${
                    darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 active:bg-gray-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  title="Importar datos desde Excel">
                    <Upload className="w-4 h-4" />
                    <span className="hidden lg:inline">Importar</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {/* Grupo de Herramientas */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowBudgets(!showBudgets)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      showBudgets
                        ? darkMode
                          ? 'bg-blue-600/90 text-white shadow-lg'
                          : 'bg-blue-500 text-white shadow-lg'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700/80'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="Gestionar presupuestos"
                  >
                    <Target className="w-4 h-4" />
                    <span className="hidden lg:inline">Presupuestos</span>
                  </button>
                  
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                      showConfig
                        ? darkMode
                          ? 'bg-blue-600/90 text-white shadow-lg'
                          : 'bg-blue-500 text-white shadow-lg'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700/80'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="Configuración"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden lg:inline">Config</span>
                  </button>
                </div>
              </div>
            )}
              
          
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
            <div className={`lg:hidden border-t py-4 space-y-2 ${'border-gray-200 dark:border-dark-border'}`}>
              {isAuthenticated && (
                <div className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs ${
                  'bg-gray-100 hover:bg-gray-200 dark:bg-dark-card dark:hover:bg-dark-border text-gray-700 dark:text-dark-text'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizado'}</span>
                </div>
              )}
              
              {/* Menú móvil reorganizado */}
              <div className="space-y-3">
                {isAuthenticated && (
                  <>
                    {/* Grupo de Datos - Móvil */}
                    <div className="space-y-2">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider px-3 ${textMutedClasses}`}>
                        Datos
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setShowExportModal(true);
                            setShowMobileMenu(false);
                          }}
                          className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                            darkMode 
                              ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-600'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span>Excel</span>
                        </button>
                        
                        <label className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium ${
                          darkMode 
                            ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-600'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                        }`}>
                          <Upload className="w-4 h-4" />
                          <span>Importar</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                              handleImportFile(e);
                              setShowMobileMenu(false);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    
                    {/* Grupo de Herramientas - Móvil */}
                    <div className="space-y-2">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider px-3 ${textMutedClasses}`}>
                        Herramientas
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setShowBudgets(!showBudgets);
                            setShowMobileMenu(false);
                          }}
                          className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                            showBudgets
                              ? darkMode
                                ? 'bg-blue-600/90 text-white border border-blue-500'
                                : 'bg-blue-500 text-white border border-blue-400'
                              : darkMode
                                ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-600'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
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
                          className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                            showConfig
                              ? darkMode
                                ? 'bg-blue-600/90 text-white border border-blue-500'
                                : 'bg-blue-500 text-white border border-blue-400'
                              : darkMode
                                ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 border border-gray-600'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <Settings className="w-4 h-4" />
                          <span>Config</span>
                        </button>
                      </div>
                    </div>
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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6 xl:py-8">
        {successMessage && <MessageAlert message={successMessage} type="success" />}
        {(dataError || expenseError || incomeError) && (
          <MessageAlert 
            message={dataError || expenseError || incomeError} 
            type="error" 
          />
        )}
        
        {!isAuthenticated ? (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center px-4">
            <div className="max-w-lg mx-auto">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-800/50 p-8 sm:p-12 text-center transform transition-all duration-300 hover:scale-[1.02]">
                
                {/* Logo y branding */}
                <div className="mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform rotate-3">
                      <TrendingUp className="w-10 h-10 text-white" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">$</span>
                      </div>
                    </div>
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl -z-10 blur-xl"></div>
                  </div>
                  
                  <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent leading-tight">
                      MisFinanzas
                    </h1>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                      Tu centro de control financiero
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                      Gestiona tus ingresos, gastos y presupuestos de forma inteligente. 
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium"> Todo en un solo lugar.</span>
                    </p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-4 mb-8">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <User className="w-5 h-5" />
                    <span>Comenzar ahora</span>
                  </button>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gratis para siempre • Sin tarjeta de crédito
                  </p>
                </div>

                {/* Características destacadas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <Settings className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Seguro en la nube</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Reportes visuales</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Control de presupuestos</span>
                  </div>
                </div>

                {/* Footer elegante */}
                <div className="mt-12 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Servidor en línea</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Datos encriptados</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Sincronización automática</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showBudgets ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${textPrimaryClasses}`}>Gestión de Presupuestos</h2>
              <button
                onClick={() => setShowBudgets(false)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  buttonPrimaryClasses
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
                  <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Categoría</label>
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
                  <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Monto</label>
                  <input
                    type="number"
                  inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({...newBudget, amount: e.target.value})}
                    className={inputClasses}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Período</label>
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
              <div className={`p-6 border-b transition-colors duration-200 ${'border-gray-200 dark:border-dark-border'}`}>
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
                    const category = categories.find(c => c.id === budget.category_id);
                    const progress = getBudgetProgress(budget);
                    const isOverBudget = progress.percentage > 100;
                    
                    return (
                      <div key={budget.id} className={`p-6 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">{category?.name}</h4>
                            <p className={`text-sm ${textMutedClasses}`}>
                              Presupuesto {budget.period === 'monthly' ? 'mensual' : budget.period === 'weekly' ? 'semanal' : 'anual'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleBudgetExpansion(budget.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                expandedBudgets.has(budget.id) 
                                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              }`}
                              title="Ver detalle de gastos"
                            >
                              {expandedBudgets.has(budget.id) ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteBudget(budget.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                            <span className={`text-xs ${textMutedClasses}`}>
                              {progress.remaining >= 0 ? `Restante: $${progress.remaining.toFixed(2)}` : `Excedido: $${Math.abs(progress.remaining).toFixed(2)}`}
                            </span>
                            {isOverBudget && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                ¡Presupuesto excedido!
                              </span>
                            )}
                          </div>
                          
                          {/* Sección expandida con detalle de gastos */}
                          {expandedBudgets.has(budget.id) && (() => {
                            const budgetExpenses = getBudgetExpenses(budget);
                            return (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className={`font-medium text-sm ${textSecondaryClasses}`}>
                                    Detalle de Gastos ({budgetExpenses.length} transacciones)
                                  </h5>
                                  <span className={`text-xs ${textMutedClasses}`}>
                                    {budget.period === 'monthly' ? 'Este mes' : 
                                     budget.period === 'weekly' ? 'Esta semana' : 'Este año'}
                                  </span>
                                </div>
                                
                                {budgetExpenses.length === 0 ? (
                                  <p className={`text-sm text-center py-3 ${textMutedClasses}`}>
                                    No hay gastos registrados para este período
                                  </p>
                                ) : (
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {budgetExpenses.map(expense => {
                                      const paymentMethod = paymentMethods.find(pm => pm.id === expense.payment_method_id);
                                      const amountInSoles = convertToSoles(parseFloat(expense.amount), expense.currency || 'PEN');
                                      
                                      return (
                                        <div key={expense.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                          darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                        }`}>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                              <p className={`font-medium truncate ${textPrimaryClasses}`}>
                                                {expense.description}
                                              </p>
                                              <span className={`font-bold ml-2 ${textPrimaryClasses}`}>
                                                {formatCurrency(amountInSoles)}
                                              </span>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-1">
                                              <span className={`text-xs ${textMutedClasses}`}>
                                                {formatDateForDisplay(expense.date)}
                                              </span>
                                              {paymentMethod && (
                                                <>
                                                  <span className={`text-xs ${textMutedClasses}`}>•</span>
                                                  <span className={`text-xs ${textMutedClasses}`}>
                                                    {paymentMethod.name}
                                                  </span>
                                                </>
                                              )}
                                              {expense.currency === 'USD' && (
                                                <>
                                                  <span className={`text-xs ${textMutedClasses}`}>•</span>
                                                  <span className={`text-xs ${textMutedClasses}`}>
                                                    ${expense.amount} USD
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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
                `${cardClasses} ${textPrimaryClasses}`
              }`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                  textPrimaryClasses
                }`}>
                  <CreditCard className="w-5 h-5 mr-2 text-yellow-500" />
                  Configuración de Monedas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      textSecondaryClasses
                    }`}>
                      Tipo de Cambio USD a PEN
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${textMutedClasses}`}>
                        US$ 1.00 =
                      </span>
                      <input
                        type="number"
                  inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={exchangeRate}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value);
                          if (!isNaN(newRate) && newRate > 0 && newRate <= 10) {
                            saveExchangeRate(newRate);
                          }
                        }}
                        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="3.75"
                      />
                      <span className={`text-sm ${textMutedClasses}`}>
                        Soles
                      </span>
                    </div>
                    <p className={`text-xs mt-2 ${'text-gray-500 dark:text-dark-text-muted'}`}>
                      Actualiza este valor cuando cambien las tasas de cambio
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      textSecondaryClasses
                    }`}>
                      Día del Sueldo
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${textMutedClasses}`}>
                        Día:
                      </span>
                      <input
                        type="number"
                  inputMode="decimal"
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
                      <span className={`text-sm ${textMutedClasses}`}>
                        de cada mes
                      </span>
                    </div>
                    <p className={`text-xs mt-2 ${'text-gray-500 dark:text-dark-text-muted'}`}>
                      Usado para calcular cuándo impactan los gastos de TC en tu balance
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      textSecondaryClasses
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
                          <span className={`font-medium ${textPrimaryClasses}`}>
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
                      className={buttonSuccessClasses}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
                
                {/* Lista de categorías */}
                <div className="space-y-2 max-h-60 overflow-y-auto -mx-1 px-1">
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
                  <div className="space-y-3 sm:space-y-4">
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
                  inputMode="decimal"
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
                  inputMode="decimal"
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
                <div className="space-y-2 max-h-60 overflow-y-auto -mx-1 px-1">
                  {paymentMethods.map(method => {
                    // Mostrar formulario de edición completo si está siendo editado
                    if (editingPaymentMethod === method.id) {
                      return (
                        <div key={method.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-orange-700 mb-1">
                                  Nombre:
                                </label>
                                <input
                                  type="text"
                                  value={editPaymentFormData.name || ''}
                                  onChange={(e) => setEditPaymentFormData({...editPaymentFormData, name: e.target.value})}
                                  className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-orange-700 mb-1">
                                  Color:
                                </label>
                                <input
                                  type="color"
                                  value={editPaymentFormData.color || '#74B9FF'}
                                  onChange={(e) => setEditPaymentFormData({...editPaymentFormData, color: e.target.value})}
                                  className="w-full h-10 border border-orange-300 rounded-md cursor-pointer"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-orange-700 mb-1">
                                Tipo de Pago:
                              </label>
                              <select
                                value={editPaymentFormData.payment_type || 'cash'}
                                onChange={(e) => setEditPaymentFormData({
                                  ...editPaymentFormData, 
                                  payment_type: e.target.value,
                                  cc_closing_day: e.target.value !== 'credit_card' ? '' : editPaymentFormData.cc_closing_day,
                                  cc_payment_day: e.target.value !== 'credit_card' ? '' : editPaymentFormData.cc_payment_day
                                })}
                                className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                <option value="cash">Efectivo</option>
                                <option value="debit_card">Tarjeta de Débito</option>
                                <option value="credit_card">Tarjeta de Crédito</option>
                              </select>
                            </div>
                            {/* Campos específicos para tarjeta de crédito */}
                            {editPaymentFormData.payment_type === 'credit_card' && (
                              <div className="grid grid-cols-2 gap-3 p-3 bg-orange-100 rounded-lg border border-orange-200">
                                <div>
                                  <label className="block text-sm font-medium text-orange-800 mb-1">
                                    Día de Cierre (1-31):
                                  </label>
                                  <input
                                    type="number"
                  inputMode="decimal"
                                    min="1"
                                    max="31"
                                    value={editPaymentFormData.cc_closing_day || ''}
                                    onChange={(e) => setEditPaymentFormData({...editPaymentFormData, cc_closing_day: e.target.value})}
                                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="ej. 15"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-orange-800 mb-1">
                                    Día de Pago (1-31):
                                  </label>
                                  <input
                                    type="number"
                  inputMode="decimal"
                                    min="1"
                                    max="31"
                                    value={editPaymentFormData.cc_payment_day || ''}
                                    onChange={(e) => setEditPaymentFormData({...editPaymentFormData, cc_payment_day: e.target.value})}
                                    className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="ej. 10"
                                  />
                                </div>
                              </div>
                            )}
                            <div className="flex space-x-2 pt-2">
                              <button
                                onClick={async () => {
                                  try {
                                    const updateData = {
                                      name: editPaymentFormData.name?.trim(),
                                      color: editPaymentFormData.color,
                                      payment_type: editPaymentFormData.payment_type
                                    };
                                    
                                    if (editPaymentFormData.payment_type === 'credit_card') {
                                      if (!editPaymentFormData.cc_closing_day || !editPaymentFormData.cc_payment_day) {
                                        setError('Para tarjetas de crédito, las fechas de cierre y pago son obligatorias');
                                        setTimeout(() => setError(''), 3000);
                                        return;
                                      }
                                      updateData.cc_closing_day = parseInt(editPaymentFormData.cc_closing_day);
                                      updateData.cc_payment_day = parseInt(editPaymentFormData.cc_payment_day);
                                    }
                                    
                                    await updatePaymentMethod(method.id, updateData);
                                    setEditingPaymentMethod(null);
                                    setEditPaymentFormData({});
                                    setSuccessMessage('Método de pago actualizado exitosamente');
                                    setTimeout(() => setSuccessMessage(''), 3000);
                                  } catch (error) {
                                    setError('Error al actualizar el método de pago');
                                    setTimeout(() => setError(''), 3000);
                                  }
                                }}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPaymentMethod(null);
                                  setEditPaymentFormData({});
                                }}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: method.color }}
                          ></div>
                          <div className="flex flex-col">
                            <span className="font-medium">
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
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                                  {method.payment_type === 'cash' ? 'Efectivo' : 'Débito'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingPaymentMethod(method.id);
                              setEditPaymentFormData({
                                name: method.name,
                                color: method.color,
                                payment_type: method.payment_type,
                                cc_closing_day: method.cc_closing_day || '',
                                cc_payment_day: method.cc_payment_day || ''
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Editar método de pago"
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
                            title="Eliminar método de pago"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                      className={buttonSuccessClasses}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
                
                {/* Lista de tipos de ingresos */}
                <div className="space-y-2 max-h-60 overflow-y-auto -mx-1 px-1">
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
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${buttonDangerClasses}`}
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

            <nav className={`flex flex-wrap sm:flex-nowrap p-1 rounded-lg shadow mb-4 sm:mb-8 overflow-x-auto transition-colors duration-200 ${
              'bg-white dark:bg-dark-surface'
            }`}>
              {[
                { id: 'gastos', label: 'Gastos', icon: TrendingDown },
                { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
                { id: 'recurrentes', label: 'Recurrentes', icon: Repeat },
                { id: 'balance', label: 'Balance', icon: Calendar },
                { id: 'reportes', label: 'Reportes', icon: BarChart3 },
                ...(isSubscriptionReady && isAdmin ? [{ id: 'admin', label: 'Administración', icon: Users }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap min-w-0 ${
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
                  <h2 className={`text-xl font-semibold mb-4 flex items-center ${textPrimaryClasses}`}>
                    <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
                    Agregar Nuevo Gasto
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Monto</label>
                      <input
                        type="number"
                  inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        className={inputClasses}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="sm:col-span-1 lg:col-span-2 xl:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Descripción</label>
                      <input
                        type="text"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                        className={inputClasses}
                        placeholder="Descripción del gasto"
                      />
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Categoría</label>
                      <select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                        className={selectClasses}
                      >
                        <option value="">Seleccionar categoría</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Método de Pago</label>
                      <select
                        value={newExpense.paymentMethod}
                        onChange={(e) => setNewExpense({...newExpense, paymentMethod: e.target.value})}
                        className={selectClasses}
                      >
                        <option value="">Seleccionar método</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>{method.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Fecha</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                        className={inputClasses}
                      />
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Moneda</label>
                      <select
                        value={newExpense.currency}
                        onChange={(e) => setNewExpense({...newExpense, currency: e.target.value})}
                        className={selectClasses}
                      >
                        {currencies.map(currency => (
                          <option key={currency.id} value={currency.id}>{currency.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Notas (opcional)</label>
                      <input
                        type="text"
                        value={newExpense.notes || ''}
                        onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                        className={inputClasses}
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
                

                {/* Lista de Gastos */}
                <div className={cardClasses}>
                  <div className={`p-6 border-b transition-colors duration-200 ${'border-gray-200 dark:border-dark-border'}`}>
                    <div className="flex justify-between items-center">
                      <h3 className={`text-lg font-semibold ${textPrimaryClasses}`}>Gastos</h3>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200 dark:divide-dark-border">
                    {(() => {
                      const searchedExpenses = getSearchedExpenses();
                      if (searchedExpenses.length === 0) {
                        return (
                          <div className={`p-8 text-center ${textMutedClasses}`}>
                            <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <>
                                <p>No hay gastos registrados</p>
                                <p className="text-sm">Agrega tu primer gasto usando el formulario de arriba</p>
                              </>
                          </div>
                        );
                      }
                      
                      return (showAllExpenses ? searchedExpenses : searchedExpenses.slice(0, 10)).map(expense => {
                        const category = categories.find(c => c.id === expense.category_id);
                        const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
                        
                        if (editingExpense === expense.id) {
                          // Formulario de edición
                          return (
                            <div key={expense.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50">
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Descripción</label>
                                    <input
                                      type="text"
                                      value={editFormData.description || ''}
                                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Monto</label>
                                    <input
                                      type="number"
                  inputMode="decimal"
                                      step="0.01"
                                      value={editFormData.amount || ''}
                                      onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Categoría</label>
                                    <select
                                      value={editFormData.category_id || ''}
                                      onChange={(e) => setEditFormData({...editFormData, category_id: e.target.value})}
                                      className={selectClasses}
                                    >
                                      <option value="">Seleccionar categoría</option>
                                      {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Método de pago</label>
                                    <select
                                      value={editFormData.payment_method_id || ''}
                                      onChange={(e) => setEditFormData({...editFormData, payment_method_id: e.target.value})}
                                      className={selectClasses}
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
                                      value={editFormData.date || ''}
                                      onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Moneda</label>
                                    <select
                                      value={editFormData.currency || 'PEN'}
                                      onChange={(e) => setEditFormData({...editFormData, currency: e.target.value})}
                                      className={selectClasses}
                                    >
                                      <option value="PEN">PEN (S/)</option>
                                      <option value="USD">USD ($)</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Notas</label>
                                  <textarea
                                    value={editFormData.notes || ''}
                                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                                    rows="2"
                                    className={inputClasses}
                                    placeholder="Notas adicionales (opcional)"
                                  />
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        console.log('📝 Datos del formulario antes de actualizar:', editFormData);
                                        console.log('💳 payment_method_id a actualizar:', editFormData.payment_method_id);
                                        await updateExpense(expense.id, editFormData);
                                        setEditingExpense(null);
                                        setEditFormData({});
                                        setSuccessMessage('Gasto actualizado exitosamente');
                                        setTimeout(() => setSuccessMessage(''), 3000);
                                      } catch (error) {
                                        console.error('❌ Error actualizando gasto:', error);
                                        setError('Error al actualizar el gasto');
                                        setTimeout(() => setError(''), 3000);
                                      }
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    <Save className="w-4 h-4 inline mr-1" />
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingExpense(null);
                                      setEditFormData({});
                                    }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    <X className="w-4 h-4 inline mr-1" />
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Vista normal
                        return (
                          <div key={expense.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-card/50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category?.color || '#6B7280' }}
                                  ></div>
                                  <div>
                                    <p className={`font-medium ${textPrimaryClasses}`}>{expense.description}</p>
                                    <p className={`text-sm ${textSecondaryClasses}`}>
                                      {category?.name} • {paymentMethod?.name}
                                      {paymentMethod?.payment_type === 'credit_card' && (
                                        <span className="text-blue-600">
                                          {' '}• Balance: {new Date(getCreditCardAssignmentMonth(expense.date, paymentMethod) + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                        </span>
                                      )}
                                      {' '}• {formatDateForDisplay(expense.date)}
                                    </p>
                                    {expense.notes && (
                                      <p className={`text-sm mt-1 ${textMutedClasses}`}>{expense.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-semibold text-red-600">
                                  -{formatCurrency(Number(expense.amount), expense.currency)}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingExpense(expense.id);
                                    setEditFormData({
                                      description: expense.description,
                                      amount: expense.amount,
                                      category_id: expense.category_id,
                                      payment_method_id: expense.payment_method_id,
                                      date: expense.date,
                                      notes: expense.notes || '',
                                      currency: expense.currency
                                    });
                                  }}
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Editar gasto"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="Eliminar gasto"
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
                        <button 
                          onClick={() => setShowAllExpenses(!showAllExpenses)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {showAllExpenses 
                            ? 'Mostrar menos gastos' 
                            : `Ver todos los gastos (${searchedExpenses.length})`}
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
                  <h2 className={`text-xl font-semibold mb-4 flex items-center ${textPrimaryClasses}`}>
                    <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                    Agregar Nuevo Ingreso
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Monto</label>
                      <input
                        type="number"
                  inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={newIncome.amount}
                        onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
                        className={inputClasses}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="sm:col-span-1 lg:col-span-2 xl:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Descripción</label>
                      <input
                        type="text"
                        value={newIncome.description}
                        onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                        className={inputClasses}
                        placeholder="Descripción del ingreso"
                      />
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Tipo de Ingreso</label>
                      <select
                        value={newIncome.type}
                        onChange={(e) => setNewIncome({...newIncome, type: e.target.value})}
                        className={selectClasses}
                      >
                        <option value="">Seleccionar tipo</option>
                        {incomeTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Fecha</label>
                      <input
                        type="date"
                        value={newIncome.date}
                        onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
                        className={inputClasses}
                      />
                    </div>
                    
                    <div className="sm:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Moneda</label>
                      <select
                        value={newIncome.currency}
                        onChange={(e) => setNewIncome({...newIncome, currency: e.target.value})}
                        className={selectClasses}
                      >
                        {currencies.map(currency => (
                          <option key={currency.id} value={currency.id}>{currency.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Notas (opcional)</label>
                      <input
                        type="text"
                        value={newIncome.notes || ''}
                        onChange={(e) => setNewIncome({...newIncome, notes: e.target.value})}
                        className={inputClasses}
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
                

                {/* Lista de Ingresos */}
                <div className={cardClasses}>
                  <div className={`p-6 border-b transition-colors duration-200 ${'border-gray-200 dark:border-dark-border'}`}>
                    <div className="flex justify-between items-center">
                      <h3 className={`text-lg font-semibold ${textPrimaryClasses}`}>Ingresos</h3>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200 dark:divide-dark-border">
                    {(() => {
                      const searchedIncomes = getSearchedIncomes();
                      if (searchedIncomes.length === 0) {
                        return (
                          <div className={`p-8 text-center ${textMutedClasses}`}>
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <>
                                <p>No hay ingresos registrados</p>
                                <p className="text-sm">Agrega tu primer ingreso usando el formulario de arriba</p>
                              </>
                          </div>
                        );
                      }
                      
                      return searchedIncomes.slice(0, 10).map(income => {
                        const incomeType = incomeTypes.find(t => t.id === income.income_type_id);
                        
                        if (editingIncome === income.id) {
                          // Formulario de edición
                          return (
                            <div key={income.id} className="p-4 bg-green-50 border border-green-200">
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Descripción</label>
                                    <input
                                      type="text"
                                      value={editFormData.description || ''}
                                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Monto</label>
                                    <input
                                      type="number"
                  inputMode="decimal"
                                      step="0.01"
                                      value={editFormData.amount || ''}
                                      onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Tipo de ingreso</label>
                                    <select
                                      value={editFormData.income_type_id || ''}
                                      onChange={(e) => setEditFormData({...editFormData, income_type_id: e.target.value})}
                                      className={selectClasses}
                                    >
                                      <option value="">Seleccionar tipo</option>
                                      {incomeTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Fecha</label>
                                    <input
                                      type="date"
                                      value={editFormData.date || ''}
                                      onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Moneda</label>
                                    <select
                                      value={editFormData.currency || 'PEN'}
                                      onChange={(e) => setEditFormData({...editFormData, currency: e.target.value})}
                                      className={selectClasses}
                                    >
                                      <option value="PEN">PEN (S/)</option>
                                      <option value="USD">USD ($)</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Notas</label>
                                  <textarea
                                    value={editFormData.notes || ''}
                                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                                    rows="2"
                                    className={inputClasses}
                                    placeholder="Notas adicionales (opcional)"
                                  />
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateIncome(income.id, editFormData);
                                        setEditingIncome(null);
                                        setEditFormData({});
                                        setSuccessMessage('Ingreso actualizado exitosamente');
                                        setTimeout(() => setSuccessMessage(''), 3000);
                                      } catch (error) {
                                        setError('Error al actualizar el ingreso');
                                        setTimeout(() => setError(''), 3000);
                                      }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    <Save className="w-4 h-4 inline mr-1" />
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingIncome(null);
                                      setEditFormData({});
                                    }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    <X className="w-4 h-4 inline mr-1" />
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Vista normal
                        return (
                          <div key={income.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-card/50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: incomeType?.color || '#10B981' }}
                                  ></div>
                                  <div>
                                    <p className={`font-medium ${textPrimaryClasses}`}>{income.description}</p>
                                    <p className={`text-sm ${textSecondaryClasses}`}>
                                      {incomeType?.name} • {formatDateForDisplay(income.date)}
                                    </p>
                                    {income.notes && (
                                      <p className={`text-sm mt-1 ${textMutedClasses}`}>{income.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-semibold text-green-600">
                                  +{formatCurrency(Number(income.amount), income.currency)}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingIncome(income.id);
                                    setEditFormData({
                                      description: income.description,
                                      amount: income.amount,
                                      income_type_id: income.income_type_id,
                                      date: income.date,
                                      notes: income.notes || '',
                                      currency: income.currency
                                    });
                                  }}
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Editar ingreso"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteIncome(income.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="Eliminar ingreso"
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
                <div className={`${cardClasses} p-6 mb-6`}>
                  <h2 className={`text-xl font-semibold mb-4 flex items-center ${textPrimaryClasses}`}>
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    Reportes y Análisis
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Fecha Inicio</label>
                      <input
                        type="date"
                        value={reportFilters.startDate}
                        onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                        className={inputClasses}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Fecha Fin</label>
                      <input
                        type="date"
                        value={reportFilters.endDate}
                        onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                        className={inputClasses}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Categoría</label>
                      <select
                        value={reportFilters.category}
                        onChange={(e) => setReportFilters({...reportFilters, category: e.target.value})}
                        className={selectClasses}
                      >
                        <option value="">Todas las categorías</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>Método de Pago</label>
                      <select
                        value={reportFilters.paymentMethod}
                        onChange={(e) => setReportFilters({...reportFilters, paymentMethod: e.target.value})}
                        className={selectClasses}
                      >
                        <option value="">Todos los métodos</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    
                    <div className="sm:col-span-2 lg:col-span-1 flex flex-col space-y-2">
                      <button
                        onClick={() => setReportFilters({ startDate: '', endDate: '', category: '', paymentMethod: '', showRecurring: true })}
                        className={`w-full px-3 py-2 rounded-md transition-colors text-sm ${buttonSecondaryClasses}`}
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
                            endDate: formatDateToLocalString(lastDay),
                            category: '',
                            paymentMethod: '',
                            showRecurring: true
                          });
                        }}
                        className={`w-full px-3 py-2 rounded-md transition-colors text-sm flex items-center justify-center space-x-1 ${buttonPrimaryClasses}`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Este Mes</span>
                      </button>
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

                {/* Título del período */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-blue-800 text-center">
                    📊 Resumen del Período: {(() => {
                      const hasDateFilters = reportFilters.startDate && reportFilters.endDate;
                      if (hasDateFilters) {
                        const startDate = new Date(reportFilters.startDate + 'T12:00:00');
                        const endDate = new Date(reportFilters.endDate + 'T12:00:00');
                        return `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                      }
                      return 'Mes Actual';
                    })()}
                  </h3>
                </div>

                {/* Resumen Filtrado */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  {(() => {
                    // Verificar si hay filtros de fecha aplicados - si no, mostrar resumen del mes actual
                    const hasDateFilters = reportFilters.startDate && reportFilters.endDate;
                    
                    // Obtener resumen financiero que incluye gastos recurrentes para el período filtrado
                    const summary = getFinancialSummary(reportFilters.startDate, reportFilters.endDate);
                    const filteredExpenses = getReportFilteredExpenses();
                    const filteredIncomes = getReportFilteredIncomes();
                    const totalExpenses = summary.total_expenses;
                    const totalIncomes = summary.total_incomes;
                    const balance = summary.balance;
                    
                    // Obtener periodo para mostrar en el título
                    const periodText = hasDateFilters 
                      ? `${reportFilters.startDate} a ${reportFilters.endDate}`
                      : 'Mes actual';
                    
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Filter className="w-5 h-5 mr-2" />
                        Transacciones Filtradas
                      </h3>
                      
                      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                        {/* Controles de ordenamiento */}
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                          <span className={`text-sm ${textSecondaryClasses} whitespace-nowrap`}>Ordenar por:</span>
                          <select
                            value={transactionSort.field}
                            onChange={(e) => setTransactionSort({...transactionSort, field: e.target.value})}
                            className={`text-sm rounded px-2 py-1 ${selectClasses}`}
                          >
                            <option value="date">Fecha</option>
                            <option value="amount">Monto</option>
                            <option value="description">Nombre</option>
                          </select>
                          <button
                            onClick={() => setTransactionSort({...transactionSort, direction: transactionSort.direction === 'asc' ? 'desc' : 'asc'})}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            title={`Ordenar ${transactionSort.direction === 'asc' ? 'descendente' : 'ascendente'}`}
                          >
                            {transactionSort.direction === 'asc' ? (
                              <ArrowUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                        
                        {/* Filtro incluir recurrentes */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <input
                            type="checkbox"
                            id="showRecurringInList"
                            checked={reportFilters.showRecurring}
                            onChange={(e) => setReportFilters({...reportFilters, showRecurring: e.target.checked})}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                          />
                          <label htmlFor="showRecurringInList" className={`text-sm ${textSecondaryClasses} flex items-center space-x-1 whitespace-nowrap`}>
                            <Repeat className="w-4 h-4 text-purple-600" />
                            <span>Incluir recurrentes</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {(() => {
                      const filteredExpenses = activeTab === 'reportes' ? getReportFilteredExpenses() : getFilteredExpenses();
                      const filteredIncomes = activeTab === 'reportes' ? getReportFilteredIncomes() : getFilteredIncomes();
                      
                      // Generar gastos e ingresos recurrentes para el período cuando estamos en reportes
                      const recurringExpensesInPeriod = activeTab === 'reportes' && reportFilters.showRecurring
                        ? generateRecurringExpenses(reportFilters.startDate, reportFilters.endDate)
                        : [];
                      
                      const recurringIncomesInPeriod = activeTab === 'reportes' && reportFilters.showRecurring
                        ? generateRecurringIncomes(reportFilters.startDate, reportFilters.endDate)
                        : [];
                      
                      const allTransactions = [
                        ...filteredExpenses.map(expense => {
                          const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
                          return {
                            ...expense,
                            type: 'expense',
                            isRecurring: false,
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
                        ...recurringExpensesInPeriod.map(expense => {
                          const paymentMethod = paymentMethods.find(p => p.id === expense.payment_method_id);
                          return {
                            ...expense,
                            type: 'expense',
                            isRecurring: true,
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
                          isRecurring: false,
                          amount: parseFloat(income.amount),
                          categoryName: incomeTypes.find(t => t.id === income.income_type_id)?.name || 'Sin tipo',
                          categoryColor: incomeTypes.find(t => t.id === income.income_type_id)?.color || '#10B981',
                          paymentMethodName: 'N/A'
                        })),
                        ...recurringIncomesInPeriod.map(income => ({
                          ...income,
                          type: 'income',
                          isRecurring: true,
                          amount: parseFloat(income.amount),
                          categoryName: incomeTypes.find(t => t.id === income.income_type_id)?.name || 'Sin tipo',
                          categoryColor: incomeTypes.find(t => t.id === income.income_type_id)?.color || '#10B981',
                          paymentMethodName: 'N/A'
                        }))
                      ];
                      
                      const sortedTransactions = sortTransactions(allTransactions);

                      if (sortedTransactions.length === 0) {
                        return (
                          <div className="p-8 text-center text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No hay transacciones con los filtros aplicados</p>
                            <p className="text-sm">Ajusta los filtros para ver más resultados</p>
                          </div>
                        );
                      }

                      return sortedTransactions.slice(0, 20).map(transaction => (
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
                                    {transaction.isRecurring && (
                                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                                        <Repeat className="w-3 h-3" />
                                        <span>Recurrente</span>
                                      </span>
                                    )}
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
                    const filteredExpenses = activeTab === 'reportes' ? getReportFilteredExpenses() : getFilteredExpenses();
                    const filteredIncomes = activeTab === 'reportes' ? getReportFilteredIncomes() : getFilteredIncomes();
                    const recurringExpensesInPeriod = activeTab === 'reportes' && reportFilters.showRecurring
                      ? generateRecurringExpenses(reportFilters.startDate, reportFilters.endDate)
                      : [];
                    const recurringIncomesInPeriod = activeTab === 'reportes' && reportFilters.showRecurring
                      ? generateRecurringIncomes(reportFilters.startDate, reportFilters.endDate)
                      : [];
                    const totalTransactions = filteredExpenses.length + filteredIncomes.length + recurringExpensesInPeriod.length + recurringIncomesInPeriod.length;
                    
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
                  `${cardClasses} ${textPrimaryClasses}`
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 flex items-center ${
                    textPrimaryClasses
                  }`}>
                    <Target className="w-5 h-5 mr-2 text-green-500" />
                    Gestión de Presupuestos
                  </h2>
                  
                  {/* Formulario para nuevo presupuesto */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        textSecondaryClasses
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
                        textSecondaryClasses
                      }`}>Monto:</label>
                      <input
                        type="number"
                  inputMode="decimal"
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
                        textSecondaryClasses
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
                  <div className="space-y-3 sm:space-y-4">
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
                              <h3 className={`font-medium ${textPrimaryClasses}`}>
                                {categoryName}
                              </h3>
                              <p className={`text-sm ${textMutedClasses}`}>
                                ${budget.amount} {budget.period === 'weekly' ? 'semanal' : budget.period === 'monthly' ? 'mensual' : 'anual'}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteBudget(budget.id)}
                              className={`text-red-500 hover:text-red-700 transition-colors ${
                                'hover:text-red-500 dark:hover:text-red-400'
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
                              'hover:bg-gray-100 dark:hover:bg-dark-card'
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
                      <div className={`text-center py-8 ${textMutedClasses}`}>
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
                {/* Cabecera con estadísticas */}
                <div className={`${cardClasses} p-6 mb-6`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className={`text-2xl font-bold ${textPrimaryClasses} flex items-center`}>
                        <Repeat className="w-6 h-6 mr-3 text-indigo-600" />
                        Transacciones Recurrentes
                      </h1>
                      <p className={`text-sm mt-1 ${textMutedClasses}`}>
                        Gestiona tus ingresos y gastos automáticos
                      </p>
                    </div>
                    
                    {/* Estadísticas rápidas */}
                    <div className="flex space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {recurringIncomes.filter(r => r.is_active).length}
                        </div>
                        <div className="text-xs text-gray-500">Ingresos Activos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {recurringExpenses.filter(r => r.is_active).length}
                        </div>
                        <div className="text-xs text-gray-500">Gastos Activos</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Toggle tipo de transacción mejorado */}
                  <div className="flex justify-center mb-6">
                    <div className={`inline-flex rounded-lg p-1 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <button
                        onClick={() => handleRecurringTypeChange('expense')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                          recurringTransactionType === 'expense'
                            ? 'bg-red-500 text-white shadow-lg transform scale-105'
                            : darkMode 
                              ? 'text-gray-300 hover:text-white hover:bg-gray-600' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        <span>Gastos Recurrentes</span>
                        <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                          {recurringExpenses.length}
                        </span>
                      </button>
                      <button
                        onClick={() => handleRecurringTypeChange('income')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                          recurringTransactionType === 'income'
                            ? 'bg-green-500 text-white shadow-lg transform scale-105'
                            : darkMode 
                              ? 'text-gray-300 hover:text-white hover:bg-gray-600' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>Ingresos Recurrentes</span>
                        <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                          {recurringIncomes.length}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Formulario para nueva transacción mejorado */}
                <div className={`${cardClasses} p-6 mb-6`}>
                  <div className="flex items-center mb-4">
                    <PlusCircle className={`w-5 h-5 mr-2 ${
                      recurringTransactionType === 'expense' ? 'text-red-500' : 'text-green-500'
                    }`} />
                    <h3 className={`text-lg font-semibold ${textPrimaryClasses}`}>
                      Agregar {recurringTransactionType === 'expense' ? 'Gasto' : 'Ingreso'} Recurrente
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div className="xl:col-span-2">
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={newRecurringExpense.description}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, description: e.target.value})}
                        placeholder="Ej. Netflix, Salario, etc."
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          recurringTransactionType === 'expense'
                            ? 'focus:ring-red-500 focus:border-red-500'
                            : 'focus:ring-green-500 focus:border-green-500'
                        } ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-black'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textSecondaryClasses}`}>
                        Monto
                      </label>
                      <input
                        type="number"
                  inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={newRecurringExpense.amount}
                        onChange={(e) => setNewRecurringExpense({...newRecurringExpense, amount: e.target.value})}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors duration-200 ${
                          recurringTransactionType === 'expense'
                            ? 'focus:ring-red-500 focus:border-red-500'
                            : 'focus:ring-green-500 focus:border-green-500'
                        } ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-black'
                        }`}
                      />
                    </div>
                    
                    {/* Campo condicional: Categoría para gastos, Tipo de ingreso para ingresos */}
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        textSecondaryClasses
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
                        textSecondaryClasses
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
                        textSecondaryClasses
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
                        textSecondaryClasses
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
                        className={`w-full font-medium py-2 px-4 rounded-md transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                          recurringTransactionType === 'expense'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                  
                </div>

                {/* Lista de transacciones */}
                <div className={`${cardClasses} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${textPrimaryClasses} flex items-center`}>
                      {recurringTransactionType === 'expense' ? (
                        <>
                          <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
                          Gastos Recurrentes
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                          Ingresos Recurrentes
                        </>
                      )}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        recurringTransactionType === 'expense'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {recurringTransactionType === 'expense' ? actualRecurringExpenses.length : recurringIncomes.length}
                      </span>
                    </h3>
                  </div>
                  
                  {/* Estadísticas de resumen */}
                  <div className={`${cardClasses} p-3 sm:p-4 mb-6`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className={`text-center p-3 rounded-lg ${
                        recurringTransactionType === 'expense' 
                          ? 'bg-red-50 dark:bg-red-900/20' 
                          : 'bg-green-50 dark:bg-green-900/20'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          recurringTransactionType === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {recurringTransactionType === 'expense' ? actualRecurringExpenses.filter(r => r.is_active).length : recurringIncomes.filter(r => r.is_active).length}
                        </div>
                        <div className={`text-sm ${textMutedClasses}`}>Activos</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${
                        recurringTransactionType === 'expense' 
                          ? 'bg-red-50 dark:bg-red-900/20' 
                          : 'bg-green-50 dark:bg-green-900/20'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          recurringTransactionType === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(() => {
                            const active = recurringTransactionType === 'expense' 
                              ? actualRecurringExpenses.filter(r => r.is_active)
                              : recurringIncomes.filter(r => r.is_active);
                            const monthlyEstimate = active.reduce((sum, item) => {
                              const amount = parseFloat(item.amount);
                              const amountInSoles = convertToSoles(amount, item.currency);
                              console.log(`DEBUG RECURRENTE:`, {
                                description: item.description,
                                amount_original: item.amount,
                                amount_parsed: amount,
                                currency: item.currency,
                                amountInSoles: amountInSoles.toFixed(2),
                                exchangeRate: exchangeRate
                              });
                              switch (item.frequency) {
                                case 'weekly': return sum + (amountInSoles * 4.33);
                                case 'monthly': return sum + amountInSoles;
                                case 'quarterly': return sum + (amountInSoles / 3);
                                case 'yearly': return sum + (amountInSoles / 12);
                                default: return sum;
                              }
                            }, 0);
                            return formatCurrency(monthlyEstimate);
                          })()}
                        </div>
                        <div className={`text-sm ${textMutedClasses}`}>Estimado Mensual</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${
                        recurringTransactionType === 'expense' 
                          ? 'bg-red-50 dark:bg-red-900/20' 
                          : 'bg-green-50 dark:bg-green-900/20'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          recurringTransactionType === 'expense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(() => {
                            const items = recurringTransactionType === 'expense' ? actualRecurringExpenses : recurringIncomes;
                            const today = new Date();
                            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                            return items.filter(item => {
                              if (!item.is_active) return false;
                              const nextDate = new Date(item.next_date + 'T00:00:00');
                              return nextDate <= nextWeek;
                            }).length;
                          })()}
                        </div>
                        <div className={`text-sm ${textMutedClasses}`}>Próximos 7 días</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {(recurringTransactionType === 'expense' ? actualRecurringExpenses : recurringIncomes).length === 0 ? (
                      <div className={`text-center py-12 ${textMutedClasses}`}>
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                          recurringTransactionType === 'expense'
                            ? 'bg-red-50 text-red-400'
                            : 'bg-green-50 text-green-400'
                        }`}>
                          <Repeat className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">
                          No hay {recurringTransactionType === 'expense' ? 'gastos' : 'ingresos'} recurrentes
                        </h3>
                        <p className="text-sm">
                          Agrega tu primer {recurringTransactionType === 'expense' ? 'gasto' : 'ingreso'} recurrente usando el formulario de arriba
                        </p>
                      </div>
                    ) : (
                      (recurringTransactionType === 'expense' ? actualRecurringExpenses : recurringIncomes).map(recurring => {
                        const category = recurringTransactionType === 'expense' 
                          ? categories.find(c => c.id === recurring.category_id)
                          : incomeTypes.find(t => t.id === recurring.income_type_id);
                        const nextDueDate = formatDateForDisplay(recurring.next_date);
                        const frequencyLabel = {
                          weekly: 'Semanal',
                          monthly: 'Mensual',
                          quarterly: 'Trimestral',
                          yearly: 'Anual'
                        }[recurring.frequency];

                        const frequencyIcons = {
                          weekly: '📅',
                          monthly: '📆',
                          quarterly: '🗓️',
                          yearly: '📋'
                        };

                        const getDaysTillNext = (nextDate) => {
                          const today = new Date();
                          const next = new Date(nextDate + 'T00:00:00');
                          const diffTime = next - today;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays;
                        };

                        const daysTillNext = getDaysTillNext(recurring.next_date);
                        
                        const isUpcoming = daysTillNext <= 7;
                        const isOverdue = daysTillNext < 0;
                        
                        // Mostrar formulario de edición si está siendo editado
                        if (editingRecurring === recurring.id) {
                          return (
                            <div key={recurring.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                      Descripción:
                                    </label>
                                    <input
                                      type="text"
                                      value={editFormData.description || ''}
                                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                      Monto:
                                    </label>
                                    <input
                                      type="number"
                  inputMode="decimal"
                                      step="0.01"
                                      value={editFormData.amount || ''}
                                      onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                      Categoría:
                                    </label>
                                    <select
                                      value={editFormData.category_id || ''}
                                      onChange={(e) => setEditFormData({...editFormData, category_id: e.target.value})}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                      <option value="">Seleccionar categoría</option>
                                      {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                      Frecuencia:
                                    </label>
                                    <select
                                      value={editFormData.frequency || ''}
                                      onChange={(e) => setEditFormData({...editFormData, frequency: e.target.value})}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                      <option value="">Seleccionar frecuencia</option>
                                      <option value="weekly">Semanal</option>
                                      <option value="monthly">Mensual</option>
                                      <option value="quarterly">Trimestral</option>
                                      <option value="yearly">Anual</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                      Moneda:
                                    </label>
                                    <select
                                      value={editFormData.currency || 'PEN'}
                                      onChange={(e) => setEditFormData({...editFormData, currency: e.target.value})}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                      <option value="PEN">PEN (S/.)</option>
                                      <option value="USD">USD ($)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                      Próxima fecha:
                                    </label>
                                    <input
                                      type="date"
                                      value={editFormData.next_date || ''}
                                      onChange={(e) => setEditFormData({...editFormData, next_date: e.target.value})}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex space-x-2 pt-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateRecurringExpense(recurring.id, editFormData);
                                        setEditingRecurring(null);
                                        setEditFormData({});
                                        setSuccessMessage('Gasto recurrente actualizado exitosamente');
                                        setTimeout(() => setSuccessMessage(''), 3000);
                                      } catch (error) {
                                        setError('Error al actualizar el gasto recurrente');
                                        setTimeout(() => setError(''), 3000);
                                      }
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRecurring(null);
                                      setEditFormData({});
                                    }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={recurring.id} className={`${cardClasses} p-5 border-l-4 ${
                            recurring.is_active 
                              ? recurringTransactionType === 'expense' 
                                ? 'border-l-red-500' 
                                : 'border-l-green-500'
                              : 'border-l-gray-400'
                          } ${
                            isOverdue && recurring.is_active ? 'ring-2 ring-red-200 dark:ring-red-800' : ''
                          } ${
                            isUpcoming && recurring.is_active && !isOverdue ? 'ring-2 ring-yellow-200 dark:ring-yellow-800' : ''
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                              <div className="flex items-start space-x-4 flex-1 min-w-0">
                                <div className={`p-3 rounded-full flex-shrink-0 ${
                                  recurring.is_active 
                                    ? recurringTransactionType === 'expense' 
                                      ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                                      : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                                }`}>
                                  <div className="text-lg">{frequencyIcons[recurring.frequency]}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                    <h3 className={`text-lg font-semibold truncate ${textPrimaryClasses}`}>
                                      {recurring.description}
                                    </h3>
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ${
                                      recurring.is_active 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                      {recurring.is_active ? (
                                        <><Play className="w-3 h-3 inline mr-1" />Activo</>
                                      ) : (
                                        <><Pause className="w-3 h-3 inline mr-1" />Pausado</>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div className={`text-xl font-bold mb-2 ${
                                    recurringTransactionType === 'expense' ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {formatCurrency(recurring.amount, recurring.currency, recurring.currency === 'USD')}
                                    {recurring.currency === 'USD' && (
                                      <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                        USD
                                      </span>
                                    )}
                                  </div>

                                  <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm ${textSecondaryClasses}`}>
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0" 
                                        style={{ backgroundColor: category?.color || '#6B7280' }}
                                      ></div>
                                      <span className="truncate">{category?.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-4 h-4 flex-shrink-0" />
                                      <span>{frequencyLabel}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-row gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingRecurring(recurring.id);
                                      setEditFormData({
                                        description: recurring.description,
                                        amount: recurring.amount,
                                        category_id: recurring.category_id,
                                        frequency: recurring.frequency,
                                        currency: recurring.currency,
                                        next_date: recurring.next_date
                                      });
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex-shrink-0"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (recurringTransactionType === 'expense') {
                                        toggleRecurringExpense(recurring.id);
                                      } else {
                                        toggleRecurringIncome(recurring.id);
                                      }
                                    }}
                                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                      recurring.is_active 
                                        ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' 
                                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                    }`}
                                    title={recurring.is_active ? 'Pausar' : 'Activar'}
                                  >
                                    {recurring.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (recurringTransactionType === 'expense') {
                                        deleteRecurringExpense(recurring.id);
                                      } else {
                                        deleteRecurringIncome(recurring.id);
                                      }
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className={`text-sm ${textMutedClasses}`}>
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

                {/* Detalle de Balance */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Detalle de Balance</h3>
                  
                  {(() => {
                    const { 
                      monthExpenses, 
                      monthIncomes, 
                      totalExpenses, 
                      totalIncomes, 
                      regularExpenses, 
                      recurringExpenses 
                    } = getMonthData();
                    
                    // Generar gastos recurrentes para el mes seleccionado
                    const [year, month] = reportMonth.split('-');
                    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const endDate = new Date(parseInt(year), parseInt(month), 0);
                    const recurringExpensesInMonth = generateRecurringExpenses(
                      formatDateToLocalString(startDate), 
                      formatDateToLocalString(endDate)
                    );
                    
                    // Generar ingresos recurrentes para el mes seleccionado
                    const recurringIncomesInMonth = generateRecurringIncomes(
                      formatDateToLocalString(startDate), 
                      formatDateToLocalString(endDate)
                    );
                    
                    // Calcular totales regulares (convertir a soles)
                    const regularExpensesTotal = monthExpenses.reduce((sum, expense) => sum + convertToSoles(parseFloat(expense.amount), expense.currency), 0);
                    const regularIncomesTotal = monthIncomes.reduce((sum, income) => sum + convertToSoles(parseFloat(income.amount), income.currency), 0);
                    
                    // Calcular totales recurrentes (convertir a soles)
                    const recurringExpensesTotal = recurringExpensesInMonth.reduce((sum, expense) => sum + convertToSoles(parseFloat(expense.amount), expense.currency), 0);
                    const recurringIncomesTotal = recurringIncomesInMonth.reduce((sum, income) => sum + convertToSoles(parseFloat(income.amount), income.currency), 0);
                    
                    return (
                      <div className="space-y-6">
                        {/* Sección de Ingresos */}
                        <div>
                          <h4 className="text-md font-medium text-green-700 mb-3 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Ingresos del Mes: {formatCurrency(totalIncomes)}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                            {/* Ingresos Regulares */}
                            <div className="bg-green-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-medium text-green-800">Ingresos Regulares</h5>
                                <span className="text-sm font-bold text-green-600">
                                  {formatCurrency(regularIncomesTotal)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {monthIncomes.length === 0 ? (
                                  <p className="text-xs text-green-600">Sin ingresos regulares</p>
                                ) : (
                                  <>
                                    {(expandedSections.regularIncomes ? monthIncomes : monthIncomes.slice(0, 3)).map(income => {
                                      const incomeType = incomeTypes.find(type => type.id === income.income_type_id);
                                      return (
                                        <div key={income.id} className="flex justify-between text-xs text-green-700">
                                          <span className="truncate mr-2">{income.description}</span>
                                          <span>{formatCurrency(income.amount, income.currency, income.currency === 'USD')}</span>
                                        </div>
                                      );
                                    })}
                                    {monthIncomes.length > 3 && (
                                      <button
                                        onClick={() => toggleBalanceSection('regularIncomes')}
                                        className="text-xs text-green-600 italic hover:text-green-800 underline cursor-pointer"
                                      >
                                        {expandedSections.regularIncomes 
                                          ? 'Mostrar menos' 
                                          : `...y ${monthIncomes.length - 3} más`}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Ingresos Recurrentes */}
                            <div className="bg-green-100 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-medium text-green-800 flex items-center">
                                  <Repeat className="w-3 h-3 mr-1" />
                                  Ingresos Recurrentes
                                </h5>
                                <span className="text-sm font-bold text-green-600">
                                  {formatCurrency(recurringIncomesTotal)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {recurringIncomesInMonth.length === 0 ? (
                                  <p className="text-xs text-green-600">Sin ingresos recurrentes</p>
                                ) : (
                                  <>
                                    {(expandedSections.recurringIncomes ? recurringIncomesInMonth : recurringIncomesInMonth.slice(0, 3)).map(income => {
                                      const incomeType = incomeTypes.find(type => type.id === income.income_type_id);
                                      return (
                                        <div key={income.id} className="flex justify-between text-xs text-green-700">
                                          <span className="truncate mr-2">{income.description}</span>
                                          <span>{formatCurrency(income.amount, income.currency, income.currency === 'USD')}</span>
                                        </div>
                                      );
                                    })}
                                    {recurringIncomesInMonth.length > 3 && (
                                      <button
                                        onClick={() => toggleBalanceSection('recurringIncomes')}
                                        className="text-xs text-green-600 italic hover:text-green-800 underline cursor-pointer"
                                      >
                                        {expandedSections.recurringIncomes 
                                          ? 'Mostrar menos' 
                                          : `...y ${recurringIncomesInMonth.length - 3} más`}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Sección de Gastos */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-md font-medium text-red-700 flex items-center">
                              <TrendingDown className="w-4 h-4 mr-2" />
                              Gastos del Mes: {formatCurrency(totalExpenses)}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-600">Ver:</label>
                              <select
                                value={balanceViewOptions.expenses}
                                onChange={(e) => setBalanceViewOptions(prev => ({...prev, expenses: e.target.value}))}
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              >
                                <option value="category">Por Categoría</option>
                                <option value="payment">Por Método de Pago</option>
                                <option value="both">Categoría + Método</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                            {/* Gastos Regulares */}
                            <div className="bg-red-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-medium text-red-800">Gastos Regulares</h5>
                                <span className="text-sm font-bold text-red-600">
                                  {formatCurrency(regularExpensesTotal)}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {monthExpenses.length === 0 ? (
                                  <p className="text-xs text-red-600">Sin gastos regulares</p>
                                ) : (
                                  (() => {
                                    let groupedExpenses;
                                    switch(balanceViewOptions.expenses) {
                                      case 'payment':
                                        groupedExpenses = groupByPaymentMethod(monthExpenses);
                                        break;
                                      case 'both':
                                        groupedExpenses = groupByCategoryAndPayment(monthExpenses);
                                        break;
                                      case 'category':
                                      default:
                                        groupedExpenses = groupByCategory(monthExpenses);
                                        break;
                                    }

                                    const displayGroups = expandedSections.regularExpenses ? groupedExpenses : groupedExpenses.slice(0, 3);

                                    return (
                                      <>
                                        {displayGroups.map((group, index) => (
                                          <div key={index} className="border-l-3 pl-2 space-y-1" style={{ borderLeftColor: group.color || group.categoryColor }}>
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-medium text-red-800 truncate">
                                                {balanceViewOptions.expenses === 'both' ? (
                                                  <div className="flex items-center space-x-1">
                                                    <span className="text-xs bg-red-200 px-1 rounded">{group.category}</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-xs bg-gray-200 px-1 rounded">{group.paymentMethod}</span>
                                                  </div>
                                                ) : group.name}
                                              </span>
                                              <span className="text-xs font-bold text-red-700">
                                                {formatCurrency(group.total)}
                                              </span>
                                            </div>
                                            {expandedSections.regularExpenses && (
                                              <div className="ml-2 space-y-1">
                                                {group.items.map(expense => (
                                                  <div key={expense.id} className="flex justify-between text-xs text-red-600">
                                                    <span className="truncate mr-2">{expense.description}</span>
                                                    <span>{formatCurrency(expense.amount, expense.currency, expense.currency === 'USD')}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {groupedExpenses.length > 3 && (
                                          <button
                                            onClick={() => toggleBalanceSection('regularExpenses')}
                                            className="text-xs text-red-600 italic hover:text-red-800 underline cursor-pointer"
                                          >
                                            {expandedSections.regularExpenses 
                                              ? 'Mostrar menos' 
                                              : `...y ${groupedExpenses.length - 3} ${balanceViewOptions.expenses === 'category' ? 'categorías' : balanceViewOptions.expenses === 'payment' ? 'métodos' : 'combinaciones'} más`}
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()
                                )}
                              </div>
                            </div>
                            
                            {/* Gastos Recurrentes */}
                            <div className="bg-red-100 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-medium text-red-800 flex items-center">
                                  <Repeat className="w-3 h-3 mr-1" />
                                  Gastos Recurrentes
                                </h5>
                                <span className="text-sm font-bold text-red-600">
                                  {formatCurrency(recurringExpensesTotal)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {recurringExpensesInMonth.length === 0 ? (
                                  <p className="text-xs text-red-600">Sin gastos recurrentes</p>
                                ) : (
                                  <>
                                    {(expandedSections.recurringExpenses ? recurringExpensesInMonth : recurringExpensesInMonth.slice(0, 3)).map(expense => {
                                      const category = categories.find(cat => cat.id === expense.category_id);
                                      return (
                                        <div key={expense.id} className="flex justify-between text-xs text-red-700">
                                          <span className="truncate mr-2">{expense.description}</span>
                                          <span>{formatCurrency(expense.amount, expense.currency, expense.currency === 'USD')}</span>
                                        </div>
                                      );
                                    })}
                                    {recurringExpensesInMonth.length > 3 && (
                                      <button
                                        onClick={() => toggleBalanceSection('recurringExpenses')}
                                        className="text-xs text-red-600 italic hover:text-red-800 underline cursor-pointer"
                                      >
                                        {expandedSections.recurringExpenses 
                                          ? 'Mostrar menos' 
                                          : `...y ${recurringExpensesInMonth.length - 3} más`}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Resumen del Balance */}
                        <div className="border-t pt-4">
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Calendar className="w-5 h-5 text-purple-600 mr-2" />
                                <div>
                                  <h5 className="text-sm font-medium text-purple-800">Balance Total del Mes</h5>
                                  <p className="text-xs text-purple-600">
                                    ({formatCurrency(regularIncomesTotal + recurringIncomesTotal)} ingresos - {formatCurrency(regularExpensesTotal + recurringExpensesTotal)} gastos)
                                  </p>
                                </div>
                              </div>
                              <span className={`text-lg font-bold ${(totalIncomes - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(totalIncomes - totalExpenses)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Análisis por Categorías del Mes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gastos por Categoría (Regulares + Recurrentes) */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
                    <p className="text-xs text-gray-500 mb-3">Incluye gastos regulares y recurrentes del mes</p>
                    
                    {(() => {
                      const { monthExpenses } = getMonthData();
                      
                      // Obtener gastos recurrentes del mes
                      const [year, month] = reportMonth.split('-');
                      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                      const endDate = new Date(parseInt(year), parseInt(month), 0);
                      const recurringExpensesInMonth = generateRecurringExpenses(
                        formatDateToLocalString(startDate), 
                        formatDateToLocalString(endDate)
                      );
                      
                      const categoryData = categories.map(category => {
                        // Gastos regulares
                        const regularExpenses = monthExpenses.filter(expense => expense.category_id === category.id);
                        const regularTotal = regularExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        
                        // Gastos recurrentes
                        const recurringExpenses = recurringExpensesInMonth.filter(expense => expense.category_id === category.id);
                        const recurringTotal = recurringExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
                        
                        const totalAmount = regularTotal + recurringTotal;
                        
                        return {
                          name: category.name,
                          value: totalAmount,
                          regular: regularTotal,
                          recurring: recurringTotal,
                          color: category.color,
                          count: regularExpenses.length + recurringExpenses.length
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
                              <Tooltip 
                                formatter={(value, name, props) => {
                                  const data = props.payload;
                                  return [
                                    `S/. ${Number(value).toFixed(2)} (Total)`,
                                    `Regulares: S/. ${Number(data.regular || 0).toFixed(2)}`,
                                    `Recurrentes: S/. ${Number(data.recurring || 0).toFixed(2)}`,
                                    `${data.count || 0} transacciones`
                                  ];
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Ingresos por Tipo (Regulares + Recurrentes) */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Ingresos por Tipo</h3>
                    <p className="text-xs text-gray-500 mb-3">Incluye ingresos regulares y recurrentes del mes</p>
                    
                    {(() => {
                      const { monthIncomes } = getMonthData();
                      
                      // Obtener ingresos recurrentes del mes
                      const [year, month] = reportMonth.split('-');
                      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                      const endDate = new Date(parseInt(year), parseInt(month), 0);
                      const recurringIncomesInMonth = generateRecurringIncomes(
                        formatDateToLocalString(startDate), 
                        formatDateToLocalString(endDate)
                      );
                      
                      const incomeData = incomeTypes.map(type => {
                        // Ingresos regulares
                        const regularIncomes = monthIncomes.filter(income => income.income_type_id === type.id);
                        const regularTotal = regularIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
                        
                        // Ingresos recurrentes
                        const recurringIncomes = recurringIncomesInMonth.filter(income => income.income_type_id === type.id);
                        const recurringTotal = recurringIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
                        
                        const totalAmount = regularTotal + recurringTotal;
                        
                        return {
                          name: type.name,
                          value: totalAmount,
                          regular: regularTotal,
                          recurring: recurringTotal,
                          color: type.color,
                          count: regularIncomes.length + recurringIncomes.length
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
                              <Tooltip 
                                formatter={(value, name, props) => {
                                  const data = props.payload;
                                  return [
                                    `S/. ${Number(value).toFixed(2)} (Total)`,
                                    `Regulares: S/. ${Number(data.regular || 0).toFixed(2)}`,
                                    `Recurrentes: S/. ${Number(data.recurring || 0).toFixed(2)}`,
                                    `${data.count || 0} transacciones`
                                  ];
                                }}
                              />
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
          onGoogleSignIn={handleGoogleSignIn}
          loading={loading}
        />

        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
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
                    className={`flex-1 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed ${buttonSuccessClasses}`}
                  >
                    Exportar a Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Administración (Solo para Admin) */}
        {activeTab === 'admin' && isAdmin && (
          <div>
            <UserManagementPanel />
          </div>
        )}
      </div>
      
      {/* Modal de Personalización de Perfil */}
      <ProfileCustomization
        isOpen={showProfileCustomization}
        onClose={() => setShowProfileCustomization(false)}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default AppSupabase;