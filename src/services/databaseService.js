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

  // Función auxiliar para convertir fecha string a fecha local sin timezone issues
  convertToLocalDate(dateString) {
    if (!dateString) return dateString;
    
    
    // Si ya es una fecha completa, devolverla tal como está
    if (dateString.includes('T') || dateString.includes(' ')) {
      return dateString;
    }
    
    // PRUEBA SIMPLIFICADA: Solo enviar la fecha como está
    // PostgreSQL debería interpretar DATE '2025-08-18' correctamente
    return dateString;
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

    // Manejo específico para errores de constraint único
    if (error.message?.includes('duplicate key value violates unique constraint')) {
      if (error.message.includes('payment_methods_user_id_name_active_idx')) {
        throw new Error('Ya existe un método de pago activo con este nombre');
      }
      if (error.message.includes('payment_methods_user_id_name_key')) {
        throw new Error('Ya existe un método de pago con este nombre');
      }
      if (error.message.includes('categories_user_id_name_key')) {
        throw new Error('Ya existe una categoría con este nombre');
      }
      if (error.message.includes('income_types_user_id_name_key')) {
        throw new Error('Ya existe un tipo de ingreso con este nombre');
      }
      throw new Error('Ya existe un elemento con este nombre');
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
      
      // Verificar si ya existe una categoría ACTIVA con el mismo nombre
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('name', category.name)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existingCategory) {
        throw new Error(`Ya tienes una categoría llamada "${category.name}". Usa un nombre diferente.`);
      }
      
      // Verificar límites de suscripción antes de crear
      const subscriptionInfo = await this.getUserSubscription();
      const categoryLimits = subscriptionInfo?.limits?.categories;
      
      if (categoryLimits && categoryLimits.available !== -1 && categoryLimits.available <= 0) {
        throw new Error('Has alcanzado el límite de categorías personalizadas para tu plan. Upgrade a Premium para categorías ilimitadas.');
      }
      
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
      throw error;
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
      
      // Verificar si ya existe un método de pago ACTIVO con el mismo nombre
      const { data: existingMethod } = await supabase
        .from('payment_methods')
        .select('id, name')
        .eq('user_id', userId)
        .eq('name', method.name)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existingMethod) {
        throw new Error(`Ya tienes un método de pago llamado "${method.name}". Usa un nombre diferente.`);
      }
      
      // Verificar límites de suscripción antes de crear
      const subscriptionInfo = await this.getUserSubscription();
      const paymentMethodLimits = subscriptionInfo?.limits?.payment_methods;
      
      if (paymentMethodLimits && paymentMethodLimits.available !== -1 && paymentMethodLimits.available <= 0) {
        throw new Error('Has alcanzado el límite de métodos de pago personalizados para tu plan. Upgrade a Premium para métodos ilimitados.');
      }
      
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{
          user_id: userId,
          name: method.name,
          color: method.color || '#74B9FF',
          icon: method.icon || 'credit-card',
          sort_order: method.sort_order || 0,
          payment_type: method.payment_type || 'cash',
          cc_closing_day: method.cc_closing_day || null,
          cc_payment_day: method.cc_payment_day || null
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createPaymentMethod');
      throw error;
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
      
      // Verificar si ya existe un tipo de ingreso ACTIVO con el mismo nombre
      const { data: existingType } = await supabase
        .from('income_types')
        .select('id, name')
        .eq('user_id', userId)
        .eq('name', type.name)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existingType) {
        throw new Error(`Ya tienes un tipo de ingreso llamado "${type.name}". Usa un nombre diferente.`);
      }
      
      // Verificar límites de suscripción antes de crear
      const subscriptionInfo = await this.getUserSubscription();
      const incomeTypeLimits = subscriptionInfo?.limits?.income_types;
      
      if (incomeTypeLimits && incomeTypeLimits.available !== -1 && incomeTypeLimits.available <= 0) {
        throw new Error('Has alcanzado el límite de tipos de ingreso personalizados para tu plan. Upgrade a Premium para tipos ilimitados.');
      }
      
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
      throw error;
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
      
      
      // SOLUCIÓN DEFINITIVA: Usar función SQL DATE() para forzar interpretación local
      const { data, error } = await supabase
        .rpc('create_expense_with_date', {
          p_user_id: userId,
          p_category_id: expense.category_id,
          p_payment_method_id: expense.payment_method_id,
          p_amount: parseFloat(expense.amount),
          p_description: expense.description,
          p_date_str: expense.date, // Enviar como string
          p_notes: expense.notes,
          p_tags: expense.tags || [],
          p_is_recurring: expense.is_recurring || false,
          p_recurring_frequency: expense.recurring_frequency
        });

      if (error) {
        // Fallback al método tradicional con zona horaria explícita
        const convertedDate = `${expense.date}T12:00:00-05:00`;
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('expenses')
          .insert([{
            user_id: userId,
            category_id: expense.category_id,
            payment_method_id: expense.payment_method_id,
            amount: parseFloat(expense.amount),
            description: expense.description,
            date: convertedDate,
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

        if (fallbackError) throw fallbackError;
        
        return fallbackData;
      }

      
      // Obtener el registro creado con las relaciones
      const { data: expenseWithRelations, error: selectError } = await supabase
        .from('expenses')
        .select(`
          *,
          categories(id, name, color),
          payment_methods(id, name, color)
        `)
        .eq('id', data[0].id)
        .single();

      if (selectError) throw selectError;
      
      return expenseWithRelations;
    } catch (error) {
      this.handleError(error, 'createExpense');
    }
  }

  async updateExpense(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      // Procesar fechas en updates si existen
      const processedUpdates = { ...updates };
      if (processedUpdates.date) {
        processedUpdates.date = this.convertToLocalDate(processedUpdates.date);
      }
      
      console.log('🔄 Actualizando gasto:', { id, updates, processedUpdates });
      
      const { data, error } = await supabase
        .from('expenses')
        .update(processedUpdates)
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
      
      
      // SOLUCIÓN DEFINITIVA: Usar función SQL DATE() para forzar interpretación local
      const { data, error } = await supabase
        .rpc('create_income_with_date', {
          p_user_id: userId,
          p_income_type_id: income.income_type_id,
          p_amount: parseFloat(income.amount),
          p_description: income.description,
          p_date_str: income.date, // Enviar como string
          p_notes: income.notes,
          p_tags: income.tags || [],
          p_is_recurring: income.is_recurring || false,
          p_recurring_frequency: income.recurring_frequency
        });

      if (error) {
        // Fallback al método tradicional con zona horaria explícita
        const convertedDate = `${income.date}T12:00:00-05:00`;
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('incomes')
          .insert([{
            user_id: userId,
            income_type_id: income.income_type_id,
            amount: parseFloat(income.amount),
            description: income.description,
            date: convertedDate,
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

        if (fallbackError) throw fallbackError;
        
        return fallbackData;
      }

      
      // Obtener el registro creado con las relaciones
      const { data: incomeWithRelations, error: selectError } = await supabase
        .from('incomes')
        .select(`
          *,
          income_types(id, name, color)
        `)
        .eq('id', data[0].id)
        .single();

      if (selectError) throw selectError;
      
      return incomeWithRelations;
    } catch (error) {
      this.handleError(error, 'createIncome');
    }
  }

  async updateIncome(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      // Procesar fechas en updates si existen
      const processedUpdates = { ...updates };
      if (processedUpdates.date) {
        processedUpdates.date = this.convertToLocalDate(processedUpdates.date);
      }
      
      const { data, error } = await supabase
        .from('incomes')
        .update(processedUpdates)
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
  // OPERACIONES DE GASTOS RECURRENTES
  // ==============================================

  async getRecurringExpenses() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select(`
          *,
          categories(id, name, color)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('next_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.handleError(error, 'getRecurringExpenses');
    }
  }

  async createRecurringExpense(recurring) {
    try {
      const userId = this.getCurrentUserId();
      
      // Preparar datos base
      const insertData = {
        user_id: userId,
        description: recurring.description,
        amount: parseFloat(recurring.amount),
        currency: recurring.currency || 'PEN',
        frequency: recurring.frequency,
        next_date: this.convertToLocalDate(recurring.next_date),
        transaction_type: recurring.transaction_type || 'expense'
      };

      // Agregar campos específicos según el tipo
      if (recurring.transaction_type === 'income') {
        insertData.income_type_id = recurring.income_type_id;
        insertData.category_id = null;
      } else {
        insertData.category_id = recurring.category_id;
        insertData.income_type_id = null;
      }
      
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert([insertData])
        .select(`
          *,
          categories(id, name, color),
          income_types(id, name)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'createRecurringExpense');
    }
  }

  async updateRecurringExpense(id, updates) {
    try {
      const userId = this.getCurrentUserId();
      
      // Procesar fechas en updates si existen
      const processedUpdates = { ...updates };
      if (processedUpdates.next_date) {
        processedUpdates.next_date = this.convertToLocalDate(processedUpdates.next_date);
      }
      
      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(processedUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          categories(id, name, color)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'updateRecurringExpense');
    }
  }

  async deleteRecurringExpense(id) {
    try {
      const userId = this.getCurrentUserId();
      
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      this.handleError(error, 'deleteRecurringExpense');
    }
  }

  // ==============================================
  // OPERACIONES DE CONFIGURACIÓN
  // ==============================================

  async getUserSettings() {
    try {
      const userId = this.getCurrentUserId();
      
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
  // PRESUPUESTOS
  // ==============================================

  // Obtener todos los presupuestos del usuario
  async getBudgets() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories:category_id (
            id,
            name,
            color,
            icon
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error, 'getBudgets');
      throw error;
    }
  }

  // Crear un nuevo presupuesto
  async createBudget(budgetData) {
    try {
      const userId = this.getCurrentUserId();
      
      // Verificar límites de suscripción antes de crear
      const subscriptionInfo = await this.getUserSubscription();
      const budgetLimits = subscriptionInfo?.limits?.budgets;
      
      if (budgetLimits && budgetLimits.available !== -1 && budgetLimits.available <= 0) {
        throw new Error('Has alcanzado el límite de presupuestos para tu plan. Upgrade a Premium para presupuestos ilimitados.');
      }
      
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          category_id: budgetData.category_id,
          amount: budgetData.amount,
          period: budgetData.period
        })
        .select(`
          *,
          categories:category_id (
            id,
            name,
            color,
            icon
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, 'createBudget');
      throw error;
    }
  }

  // Actualizar un presupuesto
  async updateBudget(budgetId, budgetData) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('budgets')
        .update({
          category_id: budgetData.category_id,
          amount: budgetData.amount,
          period: budgetData.period,
          is_active: budgetData.is_active !== undefined ? budgetData.is_active : true
        })
        .eq('id', budgetId)
        .eq('user_id', userId)
        .select(`
          *,
          categories:category_id (
            id,
            name,
            color,
            icon
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, 'updateBudget');
      throw error;
    }
  }

  // Eliminar un presupuesto
  async deleteBudget(budgetId) {
    try {
      const userId = this.getCurrentUserId();
      
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      this.handleError(error, 'deleteBudget');
      throw error;
    }
  }

  // Obtener progreso de un presupuesto específico
  async getBudgetProgress(budgetId) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .rpc('get_budget_progress', {
          budget_uuid: budgetId,
          user_uuid: userId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, 'getBudgetProgress');
      throw error;
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
      
      const [categories, paymentMethods, incomeTypes, expenses, incomes, recurringExpenses, budgets, settings] = await Promise.all([
        this.getCategories(),
        this.getPaymentMethods(),
        this.getIncomeTypes(),
        this.getExpenses(),
        this.getIncomes(),
        this.getRecurringExpenses(),
        this.getBudgets(),
        this.getUserSettings()
      ]);

      return {
        categories,
        paymentMethods,
        incomeTypes,
        expenses,
        incomes,
        recurringExpenses,
        budgets,
        settings: settings || {}
      };
    } catch (error) {
      this.handleError(error, 'getAllUserData');
    }
  }

  // ==============================================
  // FUNCIONES DE SUSCRIPCIONES Y ROLES
  // ==============================================

  // Obtener información completa de suscripción del usuario
  async getUserSubscription(userId = null) {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      console.log('🔍 DatabaseService: Getting subscription for user ID:', targetUserId);
      
      const { data, error } = await supabase
        .rpc('get_user_subscription_info', { user_uuid: targetUserId });

      if (error) {
        console.error('🚨 DatabaseService: RPC error:', error);
        throw error;
      }
      
      console.log('✅ DatabaseService: Subscription data:', data);
      return data;
    } catch (error) {
      console.error('❌ DatabaseService: Error getting user subscription:', error);
      return null;
    }
  }

  // Verificar si el usuario puede realizar una acción según sus límites
  async checkUserLimit(limitType, userId = null) {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      
      const { data, error } = await supabase
        .rpc('check_user_limit', { 
          user_uuid: targetUserId, 
          limit_type: limitType 
        });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error checking user limit:', error);
      return false;
    }
  }

  // Crear nueva suscripción (solo admin)
  async createSubscription(subscriptionData) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert([subscriptionData])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, 'createSubscription');
    }
  }

  // Actualizar suscripción (solo admin)
  async updateSubscription(subscriptionId, updates) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, 'updateSubscription');
    }
  }

  // Promover usuario a Premium
  async upgradeUserToPremium(userId, paymentInfo = {}) {
    try {
      const updates = {
        subscription_type: 'premium',
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: paymentInfo.billing_period === 'yearly' 
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        price_paid: paymentInfo.price || 15.00,
        currency: paymentInfo.currency || 'PEN',
        billing_period: paymentInfo.billing_period || 'monthly',
        payment_method: paymentInfo.payment_method,
        transaction_id: paymentInfo.transaction_id,
        is_early_bird: paymentInfo.is_early_bird || false,
        early_bird_price: paymentInfo.early_bird_price
      };

      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;

      // Aplicar límites Premium
      await supabase.rpc('set_subscription_limits', { 
        sub_type: 'premium', 
        user_uuid: userId 
      });

      return data;
    } catch (error) {
      this.handleError(error, 'upgradeUserToPremium');
    }
  }

  // Cancelar suscripción Premium (volver a Free)
  async downgradeUserToFree(userId) {
    try {
      const updates = {
        subscription_type: 'free',
        status: 'active',
        expires_at: null,
        cancelled_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;

      // Aplicar límites Free
      await supabase.rpc('set_subscription_limits', { 
        sub_type: 'free', 
        user_uuid: userId 
      });

      return data;
    } catch (error) {
      this.handleError(error, 'downgradeUserToFree');
    }
  }

  // Promover usuario a Admin
  async promoteUserToAdmin(userEmail) {
    try {
      const { data, error } = await supabase
        .rpc('promote_user_to_admin', { target_user_email: userEmail });

      if (error) throw error;
      return data;
    } catch (error) {
      this.handleError(error, 'promoteUserToAdmin');
    }
  }

  // Obtener todas las suscripciones (solo admin)
  async getAllSubscriptions() {
    try {
      console.log('🔄 Calling RPC function get_all_subscriptions_admin...');
      const { data, error } = await supabase.rpc('get_all_subscriptions_admin');

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }
      
      console.log('✅ RPC Success:', data);
      
      // La función devuelve un JSON que ya es un array
      if (Array.isArray(data)) {
        return data;
      } else if (data && data.error) {
        throw new Error(data.error);
      } else if (typeof data === 'string') {
        // Si viene como string, parsearlo
        try {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      
      return [];
    } catch (error) {
      this.handleError(error, 'getAllSubscriptions');
      throw error;
    }
  }

  // Obtener estadísticas de suscripciones (solo admin)
  async getSubscriptionStats() {
    try {
      console.log('🔄 Calling RPC function get_subscription_stats...');
      const { data, error } = await supabase.rpc('get_subscription_stats');

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }
      
      console.log('✅ RPC Stats Success:', data);
      return data || {};
    } catch (error) {
      this.handleError(error, 'getSubscriptionStats');
      throw error;
    }
  }

  // Verificar si el usuario es admin
  async isUserAdmin(userId = null) {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_type')
        .eq('user_id', targetUserId)
        .single();

      if (error) return false;
      return data?.subscription_type === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Crear suscripción por defecto para nuevos usuarios (OAuth)
  async createDefaultUserSubscription() {
    try {
      const userId = this.getCurrentUserId();
      console.log('🆕 Creating default subscription for user:', userId);
      
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existing) {
        console.log('✅ Subscription already exists');
        return;
      }
      
      // Crear suscripción FREE por defecto
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          subscription_type: 'free',
          status: 'active',
          monthly_transaction_limit: 30,
          budget_limit: 2,
          custom_category_limit: 3,
          custom_payment_method_limit: 2,
          custom_income_type_limit: 1,
          recurring_transaction_limit: 5,
          report_months_limit: 3,
          multi_currency_enabled: false,
          excel_export_enabled: false,
          excel_import_enabled: false,
          advanced_reports_enabled: false
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating subscription:', error);
        throw error;
      }
      
      console.log('✅ Default subscription created successfully:', data);
      
      // Crear categorías por defecto
      await this.createDefaultCategories();
      await this.createDefaultPaymentMethods();
      await this.createDefaultIncomeTypes();
      
      return data;
    } catch (error) {
      console.error('Error creating default subscription:', error);
      throw error;
    }
  }

  // Crear categorías por defecto
  async createDefaultCategories() {
    try {
      const userId = this.getCurrentUserId();
      
      const defaultCategories = [
        { name: 'Comida', color: '#FF6B6B', sort_order: 1 },
        { name: 'Transporte', color: '#4ECDC4', sort_order: 2 },
        { name: 'Entretenimiento', color: '#45B7D1', sort_order: 3 },
        { name: 'Servicios', color: '#96CEB4', sort_order: 4 },
        { name: 'Compras', color: '#FFEAA7', sort_order: 5 }
      ];
      
      for (const category of defaultCategories) {
        const { error } = await supabase
          .from('categories')
          .insert({
            user_id: userId,
            ...category
          });
        
        if (error && !error.message.includes('duplicate key')) {
          console.error('Error creating category:', category.name, error);
        }
      }
      
      console.log('✅ Default categories created');
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  }

  // Crear métodos de pago por defecto
  async createDefaultPaymentMethods() {
    try {
      const userId = this.getCurrentUserId();
      
      const defaultMethods = [
        { name: 'Efectivo', color: '#74B9FF', sort_order: 1 },
        { name: 'Tarjeta de Débito', color: '#0984E3', sort_order: 2 },
        { name: 'Tarjeta de Crédito', color: '#6C5CE7', sort_order: 3 },
        { name: 'Transferencia', color: '#A29BFE', sort_order: 4 }
      ];
      
      for (const method of defaultMethods) {
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            user_id: userId,
            ...method
          });
        
        if (error && !error.message.includes('duplicate key')) {
          console.error('Error creating payment method:', method.name, error);
        }
      }
      
      console.log('✅ Default payment methods created');
    } catch (error) {
      console.error('Error creating default payment methods:', error);
    }
  }

  // Crear tipos de ingresos por defecto
  async createDefaultIncomeTypes() {
    try {
      const userId = this.getCurrentUserId();
      
      const defaultTypes = [
        { name: 'Salario Principal', color: '#00B894', sort_order: 1 },
        { name: 'Salario Secundario', color: '#00CEC9', sort_order: 2 },
        { name: 'Ingresos Adicionales', color: '#55A3FF', sort_order: 3 }
      ];
      
      for (const type of defaultTypes) {
        const { error } = await supabase
          .from('income_types')
          .insert({
            user_id: userId,
            ...type
          });
        
        if (error && !error.message.includes('duplicate key')) {
          console.error('Error creating income type:', type.name, error);
        }
      }
      
      console.log('✅ Default income types created');
    } catch (error) {
      console.error('Error creating default income types:', error);
    }
  }

  // Obtener perfil personalizado del usuario
  async getUserProfile() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Actualizar perfil personalizado del usuario
  async updateUserProfile(profileData) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ User profile updated:', data);
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // ==============================================
  // FUNCIONES DE SUSCRIPCIÓN Y ROLES
  // ==============================================

  // Crear suscripción por defecto para usuario nuevo
  async createDefaultUserSubscription() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          subscription_type: 'free',
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Default subscription created:', data);
      return data;
    } catch (error) {
      console.error('Error creating default subscription:', error);
      throw error;
    }
  }

  // Obtener información completa de suscripción del usuario
  async getUserSubscription() {
    try {
      const userId = this.getCurrentUserId();
      
      // Usar la función SQL que calcula límites dinámicamente
      const { data, error } = await supabase
        .rpc('get_user_subscription_info', { user_uuid: userId });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('No subscription found');
      }
      
      console.log('📋 Subscription info loaded:', data);
      return data;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw error;
    }
  }

  // Verificar si el usuario puede crear más recursos de un tipo
  async checkUserLimit(limitType) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .rpc('check_user_limit', { 
          user_uuid: userId, 
          limit_type: limitType 
        });
      
      if (error) throw error;
      
      return data; // true si puede crear, false si llegó al límite
    } catch (error) {
      console.error(`Error checking limit for ${limitType}:`, error);
      return false;
    }
  }

  // Actualizar usuario a Premium con información de pago
  async upgradeUserToPremium(paymentInfo) {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'premium',
          status: 'active',
          price_paid: paymentInfo.price,
          billing_period: paymentInfo.billingPeriod || 'monthly',
          transaction_id: paymentInfo.transactionId,
          payment_method: paymentInfo.paymentMethod,
          is_early_bird: paymentInfo.isEarlyBird || false,
          early_bird_price: paymentInfo.earlyBirdPrice,
          // Habilitar todas las características Premium
          monthly_transaction_limit: -1,
          budget_limit: -1,
          custom_category_limit: -1,
          custom_payment_method_limit: -1,
          custom_income_type_limit: -1,
          recurring_transaction_limit: -1,
          report_months_limit: -1,
          multi_currency_enabled: true,
          excel_export_enabled: true,
          excel_import_enabled: true,
          advanced_reports_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ User upgraded to Premium:', data);
      return data;
    } catch (error) {
      console.error('Error upgrading to Premium:', error);
      throw error;
    }
  }

  // Degradar usuario a Free
  async downgradeUserToFree() {
    try {
      const userId = this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'free',
          status: 'active',
          cancelled_at: new Date().toISOString(),
          // Aplicar límites de Free
          monthly_transaction_limit: 30,
          budget_limit: 2,
          custom_category_limit: 3,
          custom_payment_method_limit: 2,
          custom_income_type_limit: 1,
          recurring_transaction_limit: 5,
          report_months_limit: 3,
          multi_currency_enabled: false,
          excel_export_enabled: false,
          excel_import_enabled: false,
          advanced_reports_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ User downgraded to Free:', data);
      return data;
    } catch (error) {
      console.error('Error downgrading to Free:', error);
      throw error;
    }
  }

  // Promover usuario a Admin
  async promoteUserToAdmin(userEmail) {
    try {
      const adminId = this.getCurrentUserId();
      
      // Verificar que el usuario actual es admin
      const adminCheck = await this.isUserAdmin();
      if (!adminCheck) {
        throw new Error('No tienes permisos de administrador');
      }
      
      const { data, error } = await supabase
        .rpc('promote_user_to_admin', { 
          admin_uuid: adminId,
          target_email: userEmail 
        });
      
      if (error) throw error;
      
      console.log('✅ User promoted to Admin:', data);
      return data;
    } catch (error) {
      console.error('Error promoting user to Admin:', error);
      throw error;
    }
  }

  // Verificar si el usuario actual es admin
  async isUserAdmin() {
    try {
      const { data, error } = await supabase
        .rpc('is_current_user_admin');
      
      if (error) {
        console.log('Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }


  // Obtener estadísticas de suscripciones (solo admin)
  async getSubscriptionStats() {
    try {
      const isAdmin = await this.isUserAdmin();
      if (!isAdmin) {
        throw new Error('No tienes permisos de administrador');
      }
      
      const { data, error } = await supabase
        .rpc('get_subscription_stats_simple');
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      throw error;
    }
  }
}

// Instancia singleton
const databaseService = new DatabaseService();

export default databaseService;