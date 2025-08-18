import * as XLSX from 'xlsx';
import databaseService from './databaseService.js';
import authService from './authService.js';

// Servicio para importación y exportación de Excel con Supabase
class SupabaseExcelService {
  constructor() {
    this.version = '2.0';
  }

  // ==============================================
  // EXPORTACIÓN A EXCEL
  // ==============================================

  async exportToExcel(selections = null) {
    try {
      if (!authService.isUserAuthenticated()) {
        throw new Error('Usuario no autenticado');
      }

      // Selecciones por defecto
      const defaultSelections = {
        expenses: true,
        incomes: true,
        categories: true,
        paymentMethods: true,
        incomeTypes: true,
        metadata: true
      };
      
      const exportSelections = selections || defaultSelections;
      
      // Obtener datos de Supabase
      const [expenses, incomes, categories, paymentMethods, incomeTypes, settings] = await Promise.all([
        exportSelections.expenses ? databaseService.getExpenses() : [],
        exportSelections.incomes ? databaseService.getIncomes() : [],
        exportSelections.categories ? databaseService.getCategories() : [],
        exportSelections.paymentMethods ? databaseService.getPaymentMethods() : [],
        exportSelections.incomeTypes ? databaseService.getIncomeTypes() : [],
        databaseService.getUserSettings()
      ]);

      // Crear workbook
      const workbook = XLSX.utils.book_new();

      // Preparar y agregar hoja de gastos
      if (exportSelections.expenses && expenses.length > 0) {
        const expensesData = expenses.map(expense => ({
          'Fecha': expense.date,
          'Descripcion': expense.description,
          'Monto': expense.amount,
          'Categoria': expense.categories?.name || 'Sin categoría',
          'Metodo_Pago': expense.payment_methods?.name || 'Sin método',
          'Notas': expense.notes || '',
          'Timestamp': expense.created_at
        }));
        
        const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos');
      }

      // Preparar y agregar hoja de ingresos
      if (exportSelections.incomes && incomes.length > 0) {
        const incomesData = incomes.map(income => ({
          'Fecha': income.date,
          'Descripcion': income.description,
          'Monto': income.amount,
          'Tipo_Ingreso': income.income_types?.name || 'Sin tipo',
          'Notas': income.notes || '',
          'Timestamp': income.created_at
        }));
        
        const incomesSheet = XLSX.utils.json_to_sheet(incomesData);
        XLSX.utils.book_append_sheet(workbook, incomesSheet, 'Ingresos');
      }

      // Preparar y agregar hoja de categorías
      if (exportSelections.categories && categories.length > 0) {
        const categoriesData = categories.map(category => ({
          'ID': category.id,
          'Nombre': category.name,
          'Color': category.color,
          'Orden': category.sort_order
        }));
        
        const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
        XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categorias');
      }

      // Preparar y agregar hoja de métodos de pago
      if (exportSelections.paymentMethods && paymentMethods.length > 0) {
        const paymentMethodsData = paymentMethods.map(method => ({
          'ID': method.id,
          'Nombre': method.name,
          'Color': method.color,
          'Orden': method.sort_order
        }));
        
        const paymentMethodsSheet = XLSX.utils.json_to_sheet(paymentMethodsData);
        XLSX.utils.book_append_sheet(workbook, paymentMethodsSheet, 'Metodos_Pago');
      }

      // Preparar y agregar hoja de tipos de ingreso
      if (exportSelections.incomeTypes && incomeTypes.length > 0) {
        const incomeTypesData = incomeTypes.map(type => ({
          'ID': type.id,
          'Nombre': type.name,
          'Color': type.color,
          'Orden': type.sort_order
        }));
        
        const incomeTypesSheet = XLSX.utils.json_to_sheet(incomeTypesData);
        XLSX.utils.book_append_sheet(workbook, incomeTypesSheet, 'Tipos_Ingreso');
      }

      // Preparar y agregar hoja de metadatos
      if (exportSelections.metadata) {
        const user = authService.getCurrentUser();
        const metadataSheet = XLSX.utils.json_to_sheet([{
          'Version': this.version,
          'Fecha_Exportacion': new Date().toISOString(),
          'Usuario': user?.email || 'Desconocido',
          'Total_Gastos': expenses.length,
          'Total_Ingresos': incomes.length,
          'Moneda': settings?.currency || 'PEN',
          'Exportado_Desde': 'Supabase'
        }]);
        
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
      }

      // Generar archivo y descargarlo
      const fileName = `mis-finanzas-supabase-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      return { 
        success: true, 
        fileName,
        recordsExported: {
          expenses: expenses.length,
          incomes: incomes.length,
          categories: categories.length,
          paymentMethods: paymentMethods.length,
          incomeTypes: incomeTypes.length
        }
      };

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ==============================================
  // IMPORTACIÓN DESDE EXCEL
  // ==============================================

  async importFromExcel(file, importOptions = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!authService.isUserAuthenticated()) {
          reject(new Error('Usuario no autenticado'));
          return;
        }

        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Verificar hojas disponibles
            const validSheets = ['Gastos', 'Ingresos', 'Categorias', 'Metodos_Pago', 'Tipos_Ingreso'];
            const availableSheets = validSheets.filter(sheet => workbook.SheetNames.includes(sheet));
            
            if (availableSheets.length === 0) {
              throw new Error(`El archivo debe contener al menos una de estas hojas: ${validSheets.join(', ')}`);
            }

            const importResult = {
              categories: { created: 0, updated: 0, errors: 0 },
              paymentMethods: { created: 0, updated: 0, errors: 0 },
              incomeTypes: { created: 0, updated: 0, errors: 0 },
              expenses: { created: 0, updated: 0, errors: 0 },
              incomes: { created: 0, updated: 0, errors: 0 }
            };

            // Mapas para convertir nombres a IDs
            const idMaps = {
              categories: new Map(),
              paymentMethods: new Map(),
              incomeTypes: new Map()
            };

            // 1. Importar categorías primero
            if (availableSheets.includes('Categorias')) {
              await this.importCategories(workbook.Sheets['Categorias'], importResult, idMaps, importOptions);
            }

            // 2. Importar métodos de pago
            if (availableSheets.includes('Metodos_Pago')) {
              await this.importPaymentMethods(workbook.Sheets['Metodos_Pago'], importResult, idMaps, importOptions);
            }

            // 3. Importar tipos de ingresos
            if (availableSheets.includes('Tipos_Ingreso')) {
              await this.importIncomeTypes(workbook.Sheets['Tipos_Ingreso'], importResult, idMaps, importOptions);
            }

            // 4. Cargar mapas existentes si no se importaron desde el archivo
            await this.loadExistingMaps(idMaps);

            // 5. Importar gastos
            if (availableSheets.includes('Gastos')) {
              await this.importExpenses(workbook.Sheets['Gastos'], importResult, idMaps, importOptions);
            }

            // 6. Importar ingresos
            if (availableSheets.includes('Ingresos')) {
              await this.importIncomes(workbook.Sheets['Ingresos'], importResult, idMaps, importOptions);
            }

            resolve({
              success: true,
              result: importResult,
              message: 'Importación completada exitosamente'
            });

          } catch (parseError) {
            reject(new Error('Error procesando archivo Excel: ' + parseError.message));
          }
        };

        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsArrayBuffer(file);

      } catch (error) {
        reject(new Error('Error importando archivo: ' + error.message));
      }
    });
  }

  // Importar categorías
  async importCategories(sheet, importResult, idMaps, options) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    const existingCategories = await databaseService.getCategories();
    const existingNames = new Set(existingCategories.map(c => c.name.toLowerCase()));

    for (const row of rawData) {
      try {
        const categoryName = row.Nombre || row.Name;
        if (!categoryName) continue;

        if (existingNames.has(categoryName.toLowerCase())) {
          // Mapear al existente
          const existing = existingCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
          idMaps.categories.set(categoryName, existing.id);
          
          if (options.updateExisting) {
            await databaseService.updateCategory(existing.id, {
              color: row.Color || existing.color,
              sort_order: row.Orden || existing.sort_order
            });
            importResult.categories.updated++;
          }
        } else {
          // Crear nueva
          const newCategory = await databaseService.createCategory({
            name: categoryName,
            color: row.Color || '#FF6B6B',
            sort_order: row.Orden || 0
          });
          
          idMaps.categories.set(categoryName, newCategory.id);
          importResult.categories.created++;
        }
      } catch (error) {
        console.error('Error importing category:', row, error);
        importResult.categories.errors++;
      }
    }
  }

  // Importar métodos de pago
  async importPaymentMethods(sheet, importResult, idMaps, options) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    const existingMethods = await databaseService.getPaymentMethods();
    const existingNames = new Set(existingMethods.map(m => m.name.toLowerCase()));

    for (const row of rawData) {
      try {
        const methodName = row.Nombre || row.Name;
        if (!methodName) continue;

        if (existingNames.has(methodName.toLowerCase())) {
          const existing = existingMethods.find(m => m.name.toLowerCase() === methodName.toLowerCase());
          idMaps.paymentMethods.set(methodName, existing.id);
          
          if (options.updateExisting) {
            await databaseService.updatePaymentMethod(existing.id, {
              color: row.Color || existing.color,
              sort_order: row.Orden || existing.sort_order
            });
            importResult.paymentMethods.updated++;
          }
        } else {
          const newMethod = await databaseService.createPaymentMethod({
            name: methodName,
            color: row.Color || '#74B9FF',
            sort_order: row.Orden || 0
          });
          
          idMaps.paymentMethods.set(methodName, newMethod.id);
          importResult.paymentMethods.created++;
        }
      } catch (error) {
        console.error('Error importing payment method:', row, error);
        importResult.paymentMethods.errors++;
      }
    }
  }

  // Importar tipos de ingresos
  async importIncomeTypes(sheet, importResult, idMaps, options) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    const existingTypes = await databaseService.getIncomeTypes();
    const existingNames = new Set(existingTypes.map(t => t.name.toLowerCase()));

    for (const row of rawData) {
      try {
        const typeName = row.Nombre || row.Name;
        if (!typeName) continue;

        if (existingNames.has(typeName.toLowerCase())) {
          const existing = existingTypes.find(t => t.name.toLowerCase() === typeName.toLowerCase());
          idMaps.incomeTypes.set(typeName, existing.id);
          
          if (options.updateExisting) {
            await databaseService.updateIncomeType(existing.id, {
              color: row.Color || existing.color,
              sort_order: row.Orden || existing.sort_order
            });
            importResult.incomeTypes.updated++;
          }
        } else {
          const newType = await databaseService.createIncomeType({
            name: typeName,
            color: row.Color || '#00B894',
            sort_order: row.Orden || 0
          });
          
          idMaps.incomeTypes.set(typeName, newType.id);
          importResult.incomeTypes.created++;
        }
      } catch (error) {
        console.error('Error importing income type:', row, error);
        importResult.incomeTypes.errors++;
      }
    }
  }

  // Cargar mapas existentes
  async loadExistingMaps(idMaps) {
    const [categories, paymentMethods, incomeTypes] = await Promise.all([
      databaseService.getCategories(),
      databaseService.getPaymentMethods(),
      databaseService.getIncomeTypes()
    ]);

    categories.forEach(cat => idMaps.categories.set(cat.name, cat.id));
    paymentMethods.forEach(method => idMaps.paymentMethods.set(method.name, method.id));
    incomeTypes.forEach(type => idMaps.incomeTypes.set(type.name, type.id));
  }

  // Importar gastos
  async importExpenses(sheet, importResult, idMaps, options) {
    const rawData = XLSX.utils.sheet_to_json(sheet);

    for (const row of rawData) {
      try {
        const categoryName = row.Categoria || row.Category;
        const paymentMethodName = row.Metodo_Pago || row.Payment_Method;
        
        const categoryId = idMaps.categories.get(categoryName);
        const paymentMethodId = idMaps.paymentMethods.get(paymentMethodName);

        if (!categoryId || !paymentMethodId) {
          console.warn('Missing category or payment method for expense:', row);
          importResult.expenses.errors++;
          continue;
        }

        await databaseService.createExpense({
          category_id: categoryId,
          payment_method_id: paymentMethodId,
          amount: parseFloat(row.Monto || row.Amount) || 0,
          description: row.Descripcion || row.Description || '',
          date: this.parseDate(row.Fecha || row.Date),
          notes: row.Notas || row.Notes || null
        });

        importResult.expenses.created++;
      } catch (error) {
        console.error('Error importing expense:', row, error);
        importResult.expenses.errors++;
      }
    }
  }

  // Importar ingresos
  async importIncomes(sheet, importResult, idMaps, options) {
    const rawData = XLSX.utils.sheet_to_json(sheet);

    for (const row of rawData) {
      try {
        const incomeTypeName = row.Tipo_Ingreso || row.Income_Type;
        const incomeTypeId = idMaps.incomeTypes.get(incomeTypeName);

        if (!incomeTypeId) {
          console.warn('Missing income type for income:', row);
          importResult.incomes.errors++;
          continue;
        }

        await databaseService.createIncome({
          income_type_id: incomeTypeId,
          amount: parseFloat(row.Monto || row.Amount) || 0,
          description: row.Descripcion || row.Description || '',
          date: this.parseDate(row.Fecha || row.Date),
          notes: row.Notas || row.Notes || null
        });

        importResult.incomes.created++;
      } catch (error) {
        console.error('Error importing income:', row, error);
        importResult.incomes.errors++;
      }
    }
  }

  // ==============================================
  // UTILIDADES
  // ==============================================

  parseDate(dateValue) {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    // Si es un número de serie de Excel
    if (typeof dateValue === 'number') {
      const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
      return excelDate.toISOString().split('T')[0];
    }
    
    // Si es una cadena de fecha
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
  }

  // Validar que el usuario esté autenticado
  validateAuthentication() {
    if (!authService.isUserAuthenticated()) {
      throw new Error('Usuario no autenticado');
    }
  }
}

// Instancia singleton
const supabaseExcelService = new SupabaseExcelService();

export default supabaseExcelService;