import { supabase } from '../lib/supabase.js';
import authService from './authService.js';

// Servicio para operaciones de base de datos con Supabase
class DatabaseService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupConnectionMonitoring();
  }

  // Monitorear estado de conexión
  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🟢 Conexión restaurada');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('🔴 Conexión perdida');
    });
  }

  // Obtener ID del usuario actual
  getCurrentUserId() {
    const userId = authService.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    return userId;
  }

  // Manejo genérico de errores
  handleError(error, operation) {
    console.error(`Error in ${operation}:`, error);
    
    if (error.message?.includes('JWT')) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
    
    if (error.message?.includes('network')) {
      throw new Error('Error de conexión. Verifica tu internet.');
    }

    throw new Error(error.message || `Error en ${operation}`);
  }

  // ==============================================
  // OPERACIONES DE CATEGORÍAS
  // ==============================================

  async getCategories() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getCategories');
    }
  }

  async createCategory(category) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          user_id: userId,
          name: category.name,
          color: category.color || '#FF6B6B',
          icon: category.icon || 'circle',
          sort_order: category.sort_order || 0
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createCategory');
    }
  }

  async updateCategory(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updateCategory');
    }
  }

  async deleteCategory(id) {
    try {
      const userId = this.getCurrentUserId();
      
      // Marcar como inactiva en lugar de eliminar (para preservar referencias)
      const { error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      this.handleError(error, 'deleteCategory');
    }
  }

  // ==============================================
  // OPERACIONES DE MÉTODOS DE PAGO
  // ==============================================

  async getPaymentMethods() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getPaymentMethods');
    }
  }

  async createPaymentMethod(method) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{
          user_id: userId,
          name: method.name,
          color: method.color || '#74B9FF',
          icon: method.icon || 'credit-card',
          sort_order: method.sort_order || 0
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createPaymentMethod');
    }
  }

  async updatePaymentMethod(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updatePaymentMethod');
    }
  }

  async deletePaymentMethod(id) {
    try {
      const userId = this.getCurrentUserId();
      
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      this.handleError(error, 'deletePaymentMethod');
    }
  }

  // ==============================================
  // OPERACIONES DE TIPOS DE INGRESOS
  // ==============================================

  async getIncomeTypes() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('income_types')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getIncomeTypes');
    }
  }

  async createIncomeType(type) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('income_types')
        .insert([{
          user_id: userId,
          name: type.name,
          color: type.color || '#00B894',
          icon: type.icon || 'dollar-sign',
          sort_order: type.sort_order || 0
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createIncomeType');
    }
  }

  async updateIncomeType(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('income_types')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updateIncomeType');
    }
  }

  async deleteIncomeType(id) {
    try {
      const userId = this.getCurrentUserId();
      
      const { error } = await supabase
        .from('income_types')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      this.handleError(error, 'deleteIncomeType');
    }
  }

  // ==============================================
  // OPERACIONES DE GASTOS
  // ==============================================

  async getExpenses(startDate = null, endDate = null, limit = 1000) {
    try {
      const userId = this.getCurrentUserId();
      
      let query = supabase
        .from('expenses')
        .select(`
          *,
          categories(id, name, color),
          payment_methods(id, name, color)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getExpenses');
    }
  }

  async createExpense(expense) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          user_id: userId,
          category_id: expense.category_id,
          payment_method_id: expense.payment_method_id,
          amount: parseFloat(expense.amount),
          description: expense.description,
          date: expense.date,
          notes: expense.notes,
          tags: expense.tags || [],
          is_recurring: expense.is_recurring || false,
          recurring_frequency: expense.recurring_frequency
        }])
        .select(`
          *,
          categories(id, name, color),
          payment_methods(id, name, color)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createExpense');
    }
  }

  async updateExpense(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          categories(id, name, color),
          payment_methods(id, name, color)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updateExpense');
    }
  }

  async deleteExpense(id) {
    try {
      const userId = this.getCurrentUserId();
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      this.handleError(error, 'deleteExpense');
    }
  }

  // ==============================================
  // OPERACIONES DE INGRESOS
  // ==============================================

  async getIncomes(startDate = null, endDate = null, limit = 1000) {
    try {
      const userId = this.getCurrentUserId();
      
      let query = supabase
        .from('incomes')
        .select(`
          *,
          income_types(id, name, color)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getIncomes');
    }
  }

  async createIncome(income) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('incomes')
        .insert([{
          user_id: userId,
          income_type_id: income.income_type_id,
          amount: parseFloat(income.amount),
          description: income.description,
          date: income.date,
          notes: income.notes,
          tags: income.tags || [],
          is_recurring: income.is_recurring || false,
          recurring_frequency: income.recurring_frequency
        }])
        .select(`
          *,
          income_types(id, name, color)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createIncome');
    }
  }

  async updateIncome(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('incomes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          income_types(id, name, color)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updateIncome');
    }
  }

  async deleteIncome(id) {
    try {
      const userId = this.getCurrentUserId();
      
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      this.handleError(error, 'deleteIncome');
    }
  }

  // ==============================================
  // OPERACIONES DE CONFIGURACIÓN
  // ==============================================

  async getUserSettings() {
    try {
      const userId = this.getCurrentUserId();
      console.log('Obteniendo configuración para usuario:', userId);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Usar maybeSingle en lugar de single

      if (error) {
        console.error('Error obteniendo configuración:', error);
        // Si es error 406 o similar, devolver null sin fallar
        if (error.code === '406' || error.message?.includes('406')) {
          console.warn('Error 406 obteniendo configuración, usando valores por defecto');
          return null;
        }
        throw error;
      }

      console.log('Configuración obtenida:', data);
      return data || null;
    } catch (error) {
      console.error('Error en getUserSettings:', error);
      // No propagar el error, devolver null para usar configuración por defecto
      return null;
    }
  }

  async updateUserSettings(settings) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_settings')
        .upsert([{
          user_id: userId,
          ...settings
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updateUserSettings');
    }
  }

  // ==============================================
  // OPERACIONES DE RESUMEN Y ANÁLISIS
  // ==============================================

  async getFinancialSummary(startDate = null, endDate = null) {
    try {
      const userId = this.getCurrentUserId();
      
      // Usar la función SQL personalizada
      const { data, error } = await supabase
        .rpc('get_financial_summary', {
          user_uuid: userId,
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;

      return data || {
        total_expenses: 0,
        total_incomes: 0,
        balance: 0,
        expense_count: 0,
        income_count: 0,
        savings_rate: 0
      };
    } catch (error) {
      this.handleError(error, 'getFinancialSummary');
    }
  }

  // ==============================================
  // OPERACIONES DE BACKUP
  // ==============================================

  async createBackup(backupData) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_backups')
        .insert([{
          user_id: userId,
          backup_data: backupData,
          backup_type: 'manual',
          file_size: JSON.stringify(backupData).length
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createBackup');
    }
  }

  async getBackups(limit = 10) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_backups')
        .select('id, backup_type, file_size, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getBackups');
    }
  }

  // ==============================================
  // UTILITARIOS
  // ==============================================

  // Verificar conexión con la base de datos
  async checkConnection() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .limit(1);

      return { connected: !error, error };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // Obtener todos los datos del usuario (para migración)
  async getAllUserData() {
    try {
      const userId = this.getCurrentUserId();
      
      const [categories, paymentMethods, incomeTypes, expenses, incomes, settings] = await Promise.all([
        this.getCategories(),
        this.getPaymentMethods(),
        this.getIncomeTypes(),
        this.getExpenses(),
        this.getIncomes(),
        this.getUserSettings()
      ]);

      return {
        categories,
        paymentMethods,
        incomeTypes,
        expenses,
        incomes,
        settings: settings || {}
      };
    } catch (error) {
      this.handleError(error, 'getAllUserData');
    }
  }
}

// Instancia singleton
const databaseService = new DatabaseService();

export default databaseService;