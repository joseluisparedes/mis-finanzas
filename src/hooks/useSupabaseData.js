import { useState, useEffect, useCallback } from 'react';
import authService from '../services/authService.js';
import databaseService from '../services/databaseService.js';

// Hook para manejar datos financieros con Supabase
export const useSupabaseData = () => {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Estados de datos
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [incomeTypes, setIncomeTypes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [settings, setSettings] = useState({});

  // Estados de interfaz
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Inicializar autenticación y datos
  useEffect(() => {
    initializeData();
    
    // Listener para cambios de autenticación
    const removeAuthListener = authService.addAuthListener(handleAuthChange);
    
    return () => {
      removeAuthListener();
    };
  }, []);

  // Manejar cambios de autenticación
  const handleAuthChange = async (authEvent) => {
    try {
      console.log('Cambio de autenticación:', authEvent.type, authEvent.user?.email);
      
      switch (authEvent.type) {
        case 'SIGNED_IN':
          setUser(authEvent.user);
          setIsAuthenticated(true);
          setError(null); // Limpiar errores previos
          console.log('Usuario autenticado, cargando datos...');
          await loadAllData();
          break;
          
        case 'SIGNED_OUT':
          console.log('Usuario cerró sesión, limpiando datos...');
          setUser(null);
          setIsAuthenticated(false);
          clearData();
          setError(null);
          break;
          
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          console.log('Token actualizado o usuario modificado');
          setUser(authEvent.user);
          break;
      }
    } catch (error) {
      console.error('Error handling auth change:', error);
      setError('Error en autenticación: ' + error.message);
    }
  };

  // Inicializar datos
  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Inicializando datos...');

      // Verificar si el usuario ya está autenticado
      const currentUser = authService.getCurrentUser();
      console.log('Usuario actual:', currentUser?.email || 'No autenticado');
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        await loadAllData();
      } else {
        console.log('Usuario no autenticado, mostrando pantalla de login');
      }
    } catch (err) {
      console.error('Error initializing data:', err);
      setError('Error de inicialización: ' + err.message);
    } finally {
      setLoading(false);
      console.log('Inicialización completada');
    }
  };

  // Cargar todos los datos del usuario
  const loadAllData = async () => {
    if (!authService.isUserAuthenticated()) {
      console.log('Usuario no autenticado, saltando carga de datos');
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      console.log('Iniciando carga de datos del usuario...');

      const [
        categoriesData,
        paymentMethodsData,
        incomeTypesData,
        expensesData,
        incomesData,
        recurringExpensesData,
        settingsData
      ] = await Promise.all([
        databaseService.getCategories().catch(err => {
          console.warn('Error cargando categorías:', err);
          return [];
        }),
        databaseService.getPaymentMethods().catch(err => {
          console.warn('Error cargando métodos de pago:', err);
          return [];
        }),
        databaseService.getIncomeTypes().catch(err => {
          console.warn('Error cargando tipos de ingreso:', err);
          return [];
        }),
        databaseService.getExpenses().catch(err => {
          console.warn('Error cargando gastos:', err);
          return [];
        }),
        databaseService.getIncomes().catch(err => {
          console.warn('Error cargando ingresos:', err);
          return [];
        }),
        databaseService.getRecurringExpenses().catch(err => {
          console.warn('Error cargando gastos recurrentes:', err);
          return [];
        }),
        databaseService.getUserSettings().catch(err => {
          console.warn('Error cargando configuración:', err);
          return null;
        })
      ]);

      console.log('Datos cargados:', {
        categorias: categoriesData?.length || 0,
        metodosPago: paymentMethodsData?.length || 0,
        tiposIngreso: incomeTypesData?.length || 0,
        gastos: expensesData?.length || 0,
        ingresos: incomesData?.length || 0,
        gastosRecurrentes: recurringExpensesData?.length || 0
      });

      setCategories(categoriesData || []);
      setPaymentMethods(paymentMethodsData || []);
      setIncomeTypes(incomeTypesData || []);
      setExpenses(expensesData || []);
      setIncomes(incomesData || []);
      setRecurringExpenses(recurringExpensesData || []);
      setSettings(settingsData || getDefaultSettings());
      setLastSync(new Date().toISOString());

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error cargando datos: ' + error.message);
      // No bloquear la UI, usar datos vacíos
      setCategories([]);
      setPaymentMethods([]);
      setIncomeTypes([]);
      setExpenses([]);
      setIncomes([]);
      setRecurringExpenses([]);
      setSettings(getDefaultSettings());
    } finally {
      setSyncing(false);
    }
  };

  // Limpiar datos al cerrar sesión
  const clearData = () => {
    console.log('Limpiando datos de sesión...');
    setCategories([]);
    setPaymentMethods([]);
    setIncomeTypes([]);
    setExpenses([]);
    setIncomes([]);
    setRecurringExpenses([]);
    setSettings(getDefaultSettings());
    setLastSync(null);
    setError(null);
  };

  // Configuración por defecto
  const getDefaultSettings = () => ({
    auto_backup: true,
    backup_frequency: 'daily',
    currency: 'PEN',
    date_format: 'YYYY-MM-DD',
    show_json_export: false,
    theme: 'light',
    language: 'es'
  });

  // ==============================================
  // FUNCIONES DE GASTOS
  // ==============================================

  const addExpense = useCallback(async (expenseData) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const newExpense = await databaseService.createExpense({
        category_id: expenseData.category,
        payment_method_id: expenseData.paymentMethod,
        amount: parseFloat(expenseData.amount),
        description: expenseData.description,
        date: expenseData.date,
        notes: expenseData.notes
      });

      setExpenses(prev => [newExpense, ...prev]);
      return { success: true, data: newExpense };

    } catch (error) {
      console.error('Error adding expense:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const updateExpense = useCallback(async (id, updates) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedExpense = await databaseService.updateExpense(id, {
        category_id: updates.category,
        payment_method_id: updates.paymentMethod,
        amount: updates.amount ? parseFloat(updates.amount) : undefined,
        description: updates.description,
        date: updates.date,
        notes: updates.notes
      });

      setExpenses(prev => 
        prev.map(expense => expense.id === id ? updatedExpense : expense)
      );

      return { success: true, data: updatedExpense };

    } catch (error) {
      console.error('Error updating expense:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const deleteExpense = useCallback(async (id) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      await databaseService.deleteExpense(id);
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      return { success: true };

    } catch (error) {
      console.error('Error deleting expense:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ==============================================
  // FUNCIONES DE INGRESOS
  // ==============================================

  const addIncome = useCallback(async (incomeData) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const newIncome = await databaseService.createIncome({
        income_type_id: incomeData.type,
        amount: parseFloat(incomeData.amount),
        description: incomeData.description,
        date: incomeData.date,
        notes: incomeData.notes
      });

      setIncomes(prev => [newIncome, ...prev]);
      return { success: true, data: newIncome };

    } catch (error) {
      console.error('Error adding income:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const updateIncome = useCallback(async (id, updates) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedIncome = await databaseService.updateIncome(id, {
        income_type_id: updates.type,
        amount: updates.amount ? parseFloat(updates.amount) : undefined,
        description: updates.description,
        date: updates.date,
        notes: updates.notes
      });

      setIncomes(prev => 
        prev.map(income => income.id === id ? updatedIncome : income)
      );

      return { success: true, data: updatedIncome };

    } catch (error) {
      console.error('Error updating income:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const deleteIncome = useCallback(async (id) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      await databaseService.deleteIncome(id);
      setIncomes(prev => prev.filter(income => income.id !== id));
      return { success: true };

    } catch (error) {
      console.error('Error deleting income:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ==============================================
  // FUNCIONES DE CATEGORÍAS
  // ==============================================

  const addCategory = useCallback(async (categoryData) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const newCategory = await databaseService.createCategory(categoryData);
      setCategories(prev => [...prev, newCategory]);
      return { success: true, data: newCategory };

    } catch (error) {
      console.error('Error adding category:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const updateCategory = useCallback(async (id, updates) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedCategory = await databaseService.updateCategory(id, updates);
      setCategories(prev => 
        prev.map(category => category.id === id ? updatedCategory : category)
      );
      return { success: true, data: updatedCategory };

    } catch (error) {
      console.error('Error updating category:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const deleteCategory = useCallback(async (id) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      await databaseService.deleteCategory(id);
      setCategories(prev => prev.filter(category => category.id !== id));
      return { success: true };

    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ==============================================
  // FUNCIONES DE MÉTODOS DE PAGO
  // ==============================================

  const addPaymentMethod = useCallback(async (methodData) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const newMethod = await databaseService.createPaymentMethod(methodData);
      setPaymentMethods(prev => [...prev, newMethod]);
      return { success: true, data: newMethod };

    } catch (error) {
      console.error('Error adding payment method:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const updatePaymentMethod = useCallback(async (id, updates) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedMethod = await databaseService.updatePaymentMethod(id, updates);
      setPaymentMethods(prev => 
        prev.map(method => method.id === id ? updatedMethod : method)
      );
      return { success: true, data: updatedMethod };

    } catch (error) {
      console.error('Error updating payment method:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const deletePaymentMethod = useCallback(async (id) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      await databaseService.deletePaymentMethod(id);
      setPaymentMethods(prev => prev.filter(method => method.id !== id));
      return { success: true };

    } catch (error) {
      console.error('Error deleting payment method:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ==============================================
  // FUNCIONES DE TIPOS DE INGRESOS
  // ==============================================

  const addIncomeType = useCallback(async (typeData) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const newType = await databaseService.createIncomeType(typeData);
      setIncomeTypes(prev => [...prev, newType]);
      return { success: true, data: newType };

    } catch (error) {
      console.error('Error adding income type:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const updateIncomeType = useCallback(async (id, updates) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedType = await databaseService.updateIncomeType(id, updates);
      setIncomeTypes(prev => 
        prev.map(type => type.id === id ? updatedType : type)
      );
      return { success: true, data: updatedType };

    } catch (error) {
      console.error('Error updating income type:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const deleteIncomeType = useCallback(async (id) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      await databaseService.deleteIncomeType(id);
      setIncomeTypes(prev => prev.filter(type => type.id !== id));
      return { success: true };

    } catch (error) {
      console.error('Error deleting income type:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ==============================================
  // FUNCIONES DE CONFIGURACIÓN
  // ==============================================

  const updateSettings = useCallback(async (newSettings) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedSettings = await databaseService.updateUserSettings({
        ...settings,
        ...newSettings
      });

      setSettings(updatedSettings);
      return { success: true, data: updatedSettings };

    } catch (error) {
      console.error('Error updating settings:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, settings]);

  // ==============================================
  // FUNCIONES DE GASTOS RECURRENTES
  // ==============================================

  const addRecurringExpense = useCallback(async (recurringData) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const newRecurring = await databaseService.createRecurringExpense({
        category_id: recurringData.category,
        description: recurringData.description,
        amount: parseFloat(recurringData.amount),
        currency: recurringData.currency,
        frequency: recurringData.frequency,
        next_date: recurringData.nextDate
      });

      setRecurringExpenses(prev => [newRecurring, ...prev]);
      return { success: true, data: newRecurring };

    } catch (error) {
      console.error('Error adding recurring expense:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const updateRecurringExpense = useCallback(async (id, updates) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      const updatedRecurring = await databaseService.updateRecurringExpense(id, {
        category_id: updates.category,
        description: updates.description,
        amount: updates.amount ? parseFloat(updates.amount) : undefined,
        currency: updates.currency,
        frequency: updates.frequency,
        next_date: updates.nextDate,
        is_active: updates.is_active
      });

      setRecurringExpenses(prev => 
        prev.map(recurring => recurring.id === id ? updatedRecurring : recurring)
      );

      return { success: true, data: updatedRecurring };

    } catch (error) {
      console.error('Error updating recurring expense:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const deleteRecurringExpense = useCallback(async (id) => {
    try {
      if (!isAuthenticated) throw new Error('Usuario no autenticado');

      await databaseService.deleteRecurringExpense(id);
      setRecurringExpenses(prev => prev.filter(recurring => recurring.id !== id));
      return { success: true };

    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ==============================================
  // FUNCIONES DE GASTOS RECURRENTES AUTOMÁTICOS
  // ==============================================

  // Calcular cuántas veces debe aplicarse un gasto recurrente en un período
  const getRecurringOccurrences = useCallback((recurring, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nextDate = new Date(recurring.next_date);
    const occurrences = [];

    // Si la próxima fecha es después del período, no hay ocurrencias
    if (nextDate > end) return occurrences;

    let currentDate = new Date(nextDate);
    
    // Retroceder para encontrar la primera fecha dentro del período
    while (currentDate > start) {
      switch (recurring.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() - 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() - 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() - 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() - 1);
          break;
        default:
          return occurrences;
      }
    }

    // Avanzar hasta estar dentro del período y generar ocurrencias
    currentDate = new Date(nextDate);
    while (currentDate <= end) {
      if (currentDate >= start && currentDate <= end) {
        occurrences.push({
          ...recurring,
          date: currentDate.toISOString().split('T')[0],
          id: `recurring_${recurring.id}_${currentDate.getTime()}`,
          isRecurring: true
        });
      }
      
      switch (recurring.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          return occurrences;
      }
    }

    return occurrences;
  }, []);

  // Generar gastos recurrentes virtuales para un período
  const generateRecurringExpenses = useCallback((startDate, endDate) => {
    const virtualExpenses = [];
    
    recurringExpenses.forEach(recurring => {
      if (recurring.is_active) {
        const occurrences = getRecurringOccurrences(recurring, startDate, endDate);
        virtualExpenses.push(...occurrences);
      }
    });

    return virtualExpenses;
  }, [recurringExpenses, getRecurringOccurrences]);

  // ==============================================
  // FUNCIONES DE TARJETAS DE CRÉDITO
  // ==============================================

  // Función para determinar el mes al que pertenece un gasto de TC
  const getCreditCardAssignmentMonth = useCallback((expenseDate, paymentMethod) => {
    if (!paymentMethod || paymentMethod.payment_type !== 'credit_card') {
      return expenseDate; // Para métodos que no son TC, mantener fecha original
    }

    // Crear fecha local para evitar problemas de zona horaria
    const expDate = new Date(expenseDate + 'T00:00:00');
    const expDay = expDate.getDate();
    const expMonth = expDate.getMonth();
    const expYear = expDate.getFullYear();
    
    const closingDay = paymentMethod.cc_closing_day;

    // Determinar el mes de cierre al que pertenece este gasto
    let closingMonth, closingYear;
    
    if (expDay <= closingDay) {
      // El gasto está dentro del ciclo actual (cierra este mes)
      closingMonth = expMonth;
      closingYear = expYear;
    } else {
      // El gasto está después del cierre, va al próximo ciclo
      closingMonth = expMonth + 1;
      closingYear = expYear;
      if (closingMonth > 11) {
        closingMonth = 0;
        closingYear++;
      }
    }

    // El gasto se asigna al mes de cierre de la tarjeta
    // Esto significa que aparecerá en el balance del mes cuando cierre la tarjeta
    return new Date(closingYear, closingMonth, 1).toISOString().split('T')[0];
  }, []);

  // ==============================================
  // FUNCIONES DE ANÁLISIS
  // ==============================================

  const getFinancialSummary = useCallback((startDate, endDate) => {
    try {
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');

      // Filtrar gastos normales considerando fechas de TC
      const filteredExpenses = expenses.filter(expense => {
        const paymentMethod = paymentMethods.find(pm => pm.id === expense.payment_method_id);
        const assignmentDate = getCreditCardAssignmentMonth(expense.date, paymentMethod);
        const assignmentDateObj = new Date(assignmentDate);
        const expenseMonth = assignmentDateObj.getMonth();
        const expenseYear = assignmentDateObj.getFullYear();
        
        return assignmentDateObj >= start && assignmentDateObj <= end;
      });

      // Generar gastos recurrentes virtuales para el período
      const recurringExpensesInPeriod = generateRecurringExpenses(start, end);

      // Combinar gastos normales y recurrentes
      const allExpenses = [...filteredExpenses, ...recurringExpensesInPeriod];

      // Filtrar ingresos
      const filteredIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate >= start && incomeDate <= end;
      });

      const totalExpenses = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      const totalIncomes = filteredIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
      const balance = totalIncomes - totalExpenses;

      return {
        total_expenses: totalExpenses,
        total_incomes: totalIncomes,
        balance: balance,
        expense_count: allExpenses.length,
        income_count: filteredIncomes.length,
        savings_rate: totalIncomes > 0 ? ((balance / totalIncomes) * 100) : 0,
        average_expense: allExpenses.length > 0 ? totalExpenses / allExpenses.length : 0,
        average_income: filteredIncomes.length > 0 ? totalIncomes / filteredIncomes.length : 0,
        recurring_expenses: recurringExpensesInPeriod.length,
        regular_expenses: filteredExpenses.length
      };

    } catch (error) {
      console.error('Error getting financial summary:', error);
      return {
        total_expenses: 0,
        total_incomes: 0,
        balance: 0,
        expense_count: 0,
        income_count: 0,
        savings_rate: 0,
        recurring_expenses: 0,
        regular_expenses: 0
      };
    }
  }, [expenses, incomes, paymentMethods, generateRecurringExpenses, getCreditCardAssignmentMonth]);

  // ==============================================
  // FUNCIONES DE AUTENTICACIÓN
  // ==============================================

  const signIn = useCallback(async (email, password) => {
    try {
      setError(null);
      const result = await authService.signIn(email, password);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, []);

  const signUp = useCallback(async (email, password, userData = {}) => {
    try {
      setError(null);
      const result = await authService.signUp(email, password, userData);
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      const result = await authService.signOut();
      return result;
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, []);

  // ==============================================
  // UTILIDADES
  // ==============================================

  const refreshData = useCallback(async () => {
    if (isAuthenticated) {
      await loadAllData();
    }
  }, [isAuthenticated]);

  return {
    // Estados principales
    loading,
    error,
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
    recurringExpenses,
    settings,

    // Funciones de gastos
    addExpense,
    updateExpense,
    deleteExpense,

    // Funciones de ingresos
    addIncome,
    updateIncome,
    deleteIncome,

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

    // Funciones de gastos recurrentes
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    generateRecurringExpenses,

    // Funciones de tarjetas de crédito
    getCreditCardAssignmentMonth,

    // Funciones de análisis
    getFinancialSummary,

    // Funciones de autenticación
    signIn,
    signUp,
    signOut,

    // Utilidades
    refreshData,
    clearError: () => setError(null)
  };
};