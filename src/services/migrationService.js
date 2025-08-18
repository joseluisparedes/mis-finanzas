import databaseService from './databaseService.js';
import authService from './authService.js';

// Servicio para migrar datos de LocalStorage a Supabase
class MigrationService {
  constructor() {
    this.isMigrating = false;
  }

  // Verificar si hay datos locales para migrar
  hasLocalData() {
    try {
      // Check localStorage directly without using the storage service
      const localData = this.loadLocalStorageData();
      
      if (!localData) return false;
      
      // Verificar si hay datos significativos
      const hasExpenses = localData.expenses && localData.expenses.length > 0;
      const hasIncomes = localData.incomes && localData.incomes.length > 0;
      const hasCustomCategories = localData.categories && 
        localData.categories.some(cat => 
          !['Comida', 'Transporte', 'Entretenimiento', 'Servicios', 'Compras'].includes(cat.name)
        );
      const hasCustomPaymentMethods = localData.paymentMethods && 
        localData.paymentMethods.some(method => 
          !['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia'].includes(method.name)
        );
      const hasCustomIncomeTypes = localData.incomeTypes && 
        localData.incomeTypes.some(type => 
          !['Mi Salario', 'Salario Esposa', 'Ingresos Adicionales'].includes(type.name)
        );

      return hasExpenses || hasIncomes || hasCustomCategories || hasCustomPaymentMethods || hasCustomIncomeTypes;
    } catch (error) {
      console.error('Error checking local data:', error);
      return false;
    }
  }

  // Load data directly from localStorage
  loadLocalStorageData() {
    try {
      const rawData = localStorage.getItem('mis-finanzas-data');
      if (!rawData) return null;
      return JSON.parse(rawData);
    } catch (error) {
      console.error('Error loading localStorage data:', error);
      return null;
    }
  }

  // Obtener estadísticas de los datos locales
  getLocalDataStats() {
    try {
      const localData = this.loadLocalStorageData();
      
      if (!localData) {
        return {
          expenses: 0,
          incomes: 0,
          categories: 0,
          paymentMethods: 0,
          incomeTypes: 0,
          totalRecords: 0
        };
      }

      const stats = {
        expenses: localData.expenses?.length || 0,
        incomes: localData.incomes?.length || 0,
        categories: localData.categories?.length || 0,
        paymentMethods: localData.paymentMethods?.length || 0,
        incomeTypes: localData.incomeTypes?.length || 0
      };
      
      stats.totalRecords = stats.expenses + stats.incomes;
      
      return stats;
    } catch (error) {
      console.error('Error getting local data stats:', error);
      return { totalRecords: 0 };
    }
  }

  // Migrar datos de LocalStorage a Supabase
  async migrateToSupabase(progressCallback = null) {
    if (this.isMigrating) {
      throw new Error('Migración ya en progreso');
    }

    if (!authService.isUserAuthenticated()) {
      throw new Error('Usuario no autenticado');
    }

    this.isMigrating = true;
    const progress = { current: 0, total: 0, status: 'Iniciando migración...' };
    
    try {
      // 1. Cargar datos locales
      progress.status = 'Cargando datos locales...';
      if (progressCallback) progressCallback(progress);
      
      const localData = this.loadLocalStorageData();
      if (!localData) {
        throw new Error('No hay datos locales para migrar');
      }

      // 2. Calcular total de operaciones
      progress.total = (
        (localData.categories?.length || 0) +
        (localData.paymentMethods?.length || 0) +
        (localData.incomeTypes?.length || 0) +
        (localData.expenses?.length || 0) +
        (localData.incomes?.length || 0) +
        1 // settings
      );

      const migrationResult = {
        categories: { created: 0, skipped: 0, errors: 0 },
        paymentMethods: { created: 0, skipped: 0, errors: 0 },
        incomeTypes: { created: 0, skipped: 0, errors: 0 },
        expenses: { created: 0, skipped: 0, errors: 0 },
        incomes: { created: 0, skipped: 0, errors: 0 },
        settings: { success: false }
      };

      // Mapas para convertir IDs locales a IDs de Supabase
      const idMaps = {
        categories: new Map(),
        paymentMethods: new Map(),
        incomeTypes: new Map()
      };

      // 3. Migrar categorías
      progress.status = 'Migrando categorías...';
      if (progressCallback) progressCallback(progress);
      
      if (localData.categories) {
        const existingCategories = await databaseService.getCategories();
        const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()));

        for (const category of localData.categories) {
          try {
            if (existingCategoryNames.has(category.name.toLowerCase())) {
              // Mapear al existente
              const existing = existingCategories.find(c => c.name.toLowerCase() === category.name.toLowerCase());
              idMaps.categories.set(category.id, existing.id);
              migrationResult.categories.skipped++;
            } else {
              // Crear nueva
              const newCategory = await databaseService.createCategory({
                name: category.name,
                color: category.color,
                sort_order: category.sort_order || 0
              });
              idMaps.categories.set(category.id, newCategory.id);
              migrationResult.categories.created++;
            }
          } catch (error) {
            console.error('Error migrating category:', category.name, error);
            migrationResult.categories.errors++;
          }
          
          progress.current++;
          if (progressCallback) progressCallback(progress);
        }
      }

      // 4. Migrar métodos de pago
      progress.status = 'Migrando métodos de pago...';
      if (progressCallback) progressCallback(progress);
      
      if (localData.paymentMethods) {
        const existingMethods = await databaseService.getPaymentMethods();
        const existingMethodNames = new Set(existingMethods.map(m => m.name.toLowerCase()));

        for (const method of localData.paymentMethods) {
          try {
            if (existingMethodNames.has(method.name.toLowerCase())) {
              const existing = existingMethods.find(m => m.name.toLowerCase() === method.name.toLowerCase());
              idMaps.paymentMethods.set(method.id, existing.id);
              migrationResult.paymentMethods.skipped++;
            } else {
              const newMethod = await databaseService.createPaymentMethod({
                name: method.name,
                color: method.color,
                sort_order: method.sort_order || 0
              });
              idMaps.paymentMethods.set(method.id, newMethod.id);
              migrationResult.paymentMethods.created++;
            }
          } catch (error) {
            console.error('Error migrating payment method:', method.name, error);
            migrationResult.paymentMethods.errors++;
          }
          
          progress.current++;
          if (progressCallback) progressCallback(progress);
        }
      }

      // 5. Migrar tipos de ingresos
      progress.status = 'Migrando tipos de ingresos...';
      if (progressCallback) progressCallback(progress);
      
      if (localData.incomeTypes) {
        const existingTypes = await databaseService.getIncomeTypes();
        const existingTypeNames = new Set(existingTypes.map(t => t.name.toLowerCase()));

        for (const type of localData.incomeTypes) {
          try {
            if (existingTypeNames.has(type.name.toLowerCase())) {
              const existing = existingTypes.find(t => t.name.toLowerCase() === type.name.toLowerCase());
              idMaps.incomeTypes.set(type.id, existing.id);
              migrationResult.incomeTypes.skipped++;
            } else {
              const newType = await databaseService.createIncomeType({
                name: type.name,
                color: type.color,
                sort_order: type.sort_order || 0
              });
              idMaps.incomeTypes.set(type.id, newType.id);
              migrationResult.incomeTypes.created++;
            }
          } catch (error) {
            console.error('Error migrating income type:', type.name, error);
            migrationResult.incomeTypes.errors++;
          }
          
          progress.current++;
          if (progressCallback) progressCallback(progress);
        }
      }

      // 6. Migrar gastos
      progress.status = 'Migrando gastos...';
      if (progressCallback) progressCallback(progress);
      
      if (localData.expenses) {
        for (const expense of localData.expenses) {
          try {
            const categoryId = idMaps.categories.get(parseInt(expense.category));
            const paymentMethodId = idMaps.paymentMethods.get(parseInt(expense.paymentMethod));
            
            await databaseService.createExpense({
              category_id: categoryId,
              payment_method_id: paymentMethodId,
              amount: parseFloat(expense.amount),
              description: expense.description,
              date: expense.date,
              notes: expense.notes || null
            });
            
            migrationResult.expenses.created++;
          } catch (error) {
            console.error('Error migrating expense:', expense.description, error);
            migrationResult.expenses.errors++;
          }
          
          progress.current++;
          if (progressCallback) progressCallback(progress);
        }
      }

      // 7. Migrar ingresos
      progress.status = 'Migrando ingresos...';
      if (progressCallback) progressCallback(progress);
      
      if (localData.incomes) {
        for (const income of localData.incomes) {
          try {
            const incomeTypeId = idMaps.incomeTypes.get(parseInt(income.type));
            
            await databaseService.createIncome({
              income_type_id: incomeTypeId,
              amount: parseFloat(income.amount),
              description: income.description,
              date: income.date,
              notes: income.notes || null
            });
            
            migrationResult.incomes.created++;
          } catch (error) {
            console.error('Error migrating income:', income.description, error);
            migrationResult.incomes.errors++;
          }
          
          progress.current++;
          if (progressCallback) progressCallback(progress);
        }
      }

      // 8. Migrar configuración
      progress.status = 'Migrando configuración...';
      if (progressCallback) progressCallback(progress);
      
      if (localData.settings) {
        try {
          await databaseService.updateUserSettings({
            auto_backup: localData.settings.autoBackup || true,
            backup_frequency: localData.settings.backupFrequency || 'daily',
            currency: localData.settings.currency || 'PEN',
            date_format: localData.settings.dateFormat || 'YYYY-MM-DD',
            show_json_export: localData.settings.showJsonExport || false
          });
          
          migrationResult.settings.success = true;
        } catch (error) {
          console.error('Error migrating settings:', error);
        }
      }
      
      progress.current++;
      if (progressCallback) progressCallback(progress);

      // 9. Crear backup de datos locales
      progress.status = 'Creando backup...';
      if (progressCallback) progressCallback(progress);
      
      try {
        await databaseService.createBackup({
          original_data: localData,
          migration_date: new Date().toISOString(),
          migration_result: migrationResult
        });
      } catch (error) {
        console.warn('No se pudo crear backup en Supabase:', error);
      }

      progress.status = 'Migración completada';
      progress.current = progress.total;
      if (progressCallback) progressCallback(progress);

      // Marcar migración como completada en localStorage
      this.markMigrationCompleted();

      return {
        success: true,
        result: migrationResult,
        message: 'Migración completada exitosamente'
      };

    } catch (error) {
      console.error('Error during migration:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error durante la migración'
      };
    } finally {
      this.isMigrating = false;
    }
  }

  // Marcar migración como completada
  markMigrationCompleted() {
    try {
      localStorage.setItem('migration-completed', 'true');
      localStorage.setItem('migration-date', new Date().toISOString());
    } catch (error) {
      console.error('Error marking migration as completed:', error);
    }
  }

  // Verificar si la migración ya fue completada
  isMigrationCompleted() {
    try {
      return localStorage.getItem('migration-completed') === 'true';
    } catch {
      return false;
    }
  }

  // Resetear estado de migración (para testing)
  resetMigrationStatus() {
    try {
      localStorage.removeItem('migration-completed');
      localStorage.removeItem('migration-date');
    } catch (error) {
      console.error('Error resetting migration status:', error);
    }
  }

  // Verificar si debe mostrar el banner de migración
  shouldShowMigrationBanner() {
    // La aplicación ahora está completamente conectada a Supabase
    // No necesitamos mostrar el banner de migración
    return false;
  }

  // Exportar datos locales como backup antes de migrar
  exportLocalDataAsBackup() {
    try {
      const localData = this.loadLocalStorageData();
      
      if (!localData) {
        throw new Error('No hay datos locales para exportar');
      }

      const backupData = {
        ...localData,
        exportType: 'pre-migration-backup',
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-pre-migracion-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting local data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instancia singleton
const migrationService = new MigrationService();

export default migrationService;