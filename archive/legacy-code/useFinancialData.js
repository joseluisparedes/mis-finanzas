import { useState, useEffect, useCallback } from 'react';
import storage from '../services/storage.js';

// Hook personalizado para manejar datos financieros con persistencia robusta
export const useFinancialData = () => {
  // Estados principales
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados derivados
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [incomeTypes, setIncomeTypes] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Monitorear estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-guardar cuando cambian los datos
  useEffect(() => {
    if (data && !loading) {
      saveDataToStorage();
    }
  }, [data, loading]);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedData = storage.loadData();
      
      if (loadedData) {
        setData(loadedData);
        updateDerivedStates(loadedData);
        setLastSaved(loadedData.lastModified);
      }

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error cargando datos financieros');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estados derivados
  const updateDerivedStates = (newData) => {
    setExpenses(newData.expenses || []);
    setIncomes(newData.incomes || []);
    setCategories(newData.categories || []);
    setPaymentMethods(newData.paymentMethods || []);
    setIncomeTypes(newData.incomeTypes || []);
  };

  // Guardar datos en storage
  const saveDataToStorage = useCallback(async () => {
    if (!data) return false;

    try {
      const success = storage.saveData(data);
      if (success) {
        setLastSaved(new Date().toISOString());
        setError(null);
        return true;
      } else {
        throw new Error('Error guardando datos');
      }
    } catch (err) {
      console.error('Error guardando:', err);
      setError('Error guardando datos');
      return false;
    }
  }, [data]);

  // Actualizar datos y guardar automáticamente
  const updateData = useCallback((updates) => {
    setData(prevData => {
      const newData = { ...prevData, ...updates };
      updateDerivedStates(newData);
      return newData;
    });
  }, []);

  // FUNCIONES PARA GASTOS
  const addExpense = useCallback((expense) => {
    const newExpense = {
      id: Date.now() + Math.random(),
      ...expense,
      amount: parseFloat(expense.amount),
      timestamp: new Date().toISOString()
    };

    updateData({
      expenses: [...expenses, newExpense]
    });

    return newExpense;
  }, [expenses, updateData]);

  const updateExpense = useCallback((id, updates) => {
    const updatedExpenses = expenses.map(expense => 
      expense.id === id 
        ? { ...expense, ...updates, lastModified: new Date().toISOString() }
        : expense
    );

    updateData({ expenses: updatedExpenses });
  }, [expenses, updateData]);

  const deleteExpense = useCallback((id) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    updateData({ expenses: updatedExpenses });
  }, [expenses, updateData]);

  // FUNCIONES PARA INGRESOS
  const addIncome = useCallback((income) => {
    const newIncome = {
      id: Date.now() + Math.random(),
      ...income,
      amount: parseFloat(income.amount),
      timestamp: new Date().toISOString()
    };

    updateData({
      incomes: [...incomes, newIncome]
    });

    return newIncome;
  }, [incomes, updateData]);

  const updateIncome = useCallback((id, updates) => {
    const updatedIncomes = incomes.map(income => 
      income.id === id 
        ? { ...income, ...updates, lastModified: new Date().toISOString() }
        : income
    );

    updateData({ incomes: updatedIncomes });
  }, [incomes, updateData]);

  const deleteIncome = useCallback((id) => {
    const updatedIncomes = incomes.filter(income => income.id !== id);
    updateData({ incomes: updatedIncomes });
  }, [incomes, updateData]);

  // FUNCIONES PARA CATEGORÍAS
  const addCategory = useCallback((category) => {
    const newCategory = {
      id: Math.max(...categories.map(c => c.id), 0) + 1,
      ...category
    };

    updateData({
      categories: [...categories, newCategory]
    });

    return newCategory;
  }, [categories, updateData]);

  const updateCategory = useCallback((id, updates) => {
    const updatedCategories = categories.map(category => 
      category.id === id ? { ...category, ...updates } : category
    );

    updateData({ categories: updatedCategories });
  }, [categories, updateData]);

  const deleteCategory = useCallback((id) => {
    const updatedCategories = categories.filter(category => category.id !== id);
    updateData({ categories: updatedCategories });
  }, [categories, updateData]);

  // FUNCIONES PARA MÉTODOS DE PAGO
  const addPaymentMethod = useCallback((method) => {
    const newMethod = {
      id: Math.max(...paymentMethods.map(m => m.id), 0) + 1,
      ...method
    };

    updateData({
      paymentMethods: [...paymentMethods, newMethod]
    });

    return newMethod;
  }, [paymentMethods, updateData]);

  const updatePaymentMethod = useCallback((id, updates) => {
    const updatedMethods = paymentMethods.map(method => 
      method.id === id ? { ...method, ...updates } : method
    );

    updateData({ paymentMethods: updatedMethods });
  }, [paymentMethods, updateData]);

  const deletePaymentMethod = useCallback((id) => {
    const updatedMethods = paymentMethods.filter(method => method.id !== id);
    updateData({ paymentMethods: updatedMethods });
  }, [paymentMethods, updateData]);

  // FUNCIONES PARA TIPOS DE INGRESOS
  const addIncomeType = useCallback((type) => {
    const newType = {
      id: Math.max(...incomeTypes.map(t => t.id), 0) + 1,
      ...type
    };

    updateData({
      incomeTypes: [...incomeTypes, newType]
    });

    return newType;
  }, [incomeTypes, updateData]);

  const updateIncomeType = useCallback((id, updates) => {
    const updatedTypes = incomeTypes.map(type => 
      type.id === id ? { ...type, ...updates } : type
    );

    updateData({ incomeTypes: updatedTypes });
  }, [incomeTypes, updateData]);

  const deleteIncomeType = useCallback((id) => {
    const updatedTypes = incomeTypes.filter(type => type.id !== id);
    updateData({ incomeTypes: updatedTypes });
  }, [incomeTypes, updateData]);

  // FUNCIONES DE BACKUP Y EXPORTACIÓN
  const createBackup = useCallback(() => {
    return storage.createBackup();
  }, []);

  const exportData = useCallback(() => {
    return storage.exportData();
  }, []);

  const importData = useCallback(async (file) => {
    try {
      const importedData = await storage.importData(file);
      setData(importedData);
      updateDerivedStates(importedData);
      setLastSaved(importedData.lastModified);
      return { success: true, data: importedData };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, []);

  const exportToExcel = useCallback((selections = null) => {
    return storage.exportToExcel(selections);
  }, []);

  const importFromExcel = useCallback(async (file) => {
    try {
      const importedData = await storage.importFromExcel(file);
      setData(importedData);
      updateDerivedStates(importedData);
      setLastSaved(importedData.lastModified);
      return { success: true, data: importedData };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  }, []);

  // FUNCIONES PARA CONFIGURACIÓN
  const updateSettings = useCallback((newSettings) => {
    updateData({
      settings: { ...data?.settings, ...newSettings }
    });
  }, [data?.settings, updateData]);

  // FUNCIONES DE ANÁLISIS
  const getStorageStats = useCallback(() => {
    return storage.getStorageStats();
  }, []);

  const getFinancialSummary = useCallback((startDate, endDate) => {
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      return expenseDate >= start && expenseDate <= end;
    });

    const filteredIncomes = incomes.filter(income => {
      const incomeDate = new Date(income.date);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-12-31');
      return incomeDate >= start && incomeDate <= end;
    });

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncomes = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
    const balance = totalIncomes - totalExpenses;

    return {
      totalExpenses,
      totalIncomes,
      balance,
      savingsRate: totalIncomes > 0 ? (balance / totalIncomes) * 100 : 0,
      expenseCount: filteredExpenses.length,
      incomeCount: filteredIncomes.length,
      averageExpense: filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0,
      averageIncome: filteredIncomes.length > 0 ? totalIncomes / filteredIncomes.length : 0
    };
  }, [expenses, incomes]);

  // Función para obtener datos por categoría
  const getExpensesByCategory = useCallback(() => {
    return categories.map(category => {
      const categoryExpenses = expenses.filter(
        expense => expense.category === category.id.toString()
      );
      const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      return {
        ...category,
        total,
        count: categoryExpenses.length,
        percentage: expenses.length > 0 ? (categoryExpenses.length / expenses.length) * 100 : 0
      };
    }).filter(category => category.total > 0);
  }, [expenses, categories]);

  return {
    // Estados principales
    data,
    loading,
    error,
    lastSaved,
    isOnline,

    // Datos
    expenses,
    incomes,
    categories,
    paymentMethods,
    incomeTypes,
    settings: data?.settings,

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

    // Funciones de backup
    createBackup,
    exportData,
    importData,
    exportToExcel,
    importFromExcel,

    // Funciones de configuración
    updateSettings,

    // Funciones de análisis
    getStorageStats,
    getFinancialSummary,
    getExpensesByCategory,

    // Función manual de guardado
    saveData: saveDataToStorage,

    // Función de recarga
    reloadData: loadInitialData
  };
};