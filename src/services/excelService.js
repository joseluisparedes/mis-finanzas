import * as XLSX from 'xlsx';

// Servicio para manejo de archivos Excel
class ExcelService {
  constructor() {
    this.version = '1.0';
  }

  // Exportar datos a Excel
  exportToExcel(data, selections = null) {
    try {
      // Si no se proporcionan selecciones, exportar todo
      const defaultSelections = {
        expenses: true,
        incomes: true,
        categories: true,
        paymentMethods: true,
        incomeTypes: true,
        metadata: true
      };
      
      const exportSelections = selections || defaultSelections;
      // Crear un nuevo workbook
      const workbook = XLSX.utils.book_new();

      // Preparar y agregar hoja de gastos si está seleccionada
      if (exportSelections.expenses && data.expenses && data.expenses.length > 0) {
        const expensesData = data.expenses.map(expense => {
          const category = data.categories.find(c => c.id.toString() === expense.category);
          const paymentMethod = data.paymentMethods.find(p => p.id.toString() === expense.paymentMethod);
          
          return {
            'Fecha': expense.date,
            'Descripcion': expense.description,
            'Monto': expense.amount,
            'Categoria': category ? category.name : 'Sin categoria',
            'Metodo_Pago': paymentMethod ? paymentMethod.name : 'Sin metodo',
            'Timestamp': expense.timestamp
          };
        });
        const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos');
      }

      // Preparar y agregar hoja de ingresos si está seleccionada
      if (exportSelections.incomes && data.incomes && data.incomes.length > 0) {
        const incomesData = data.incomes.map(income => {
          const incomeType = data.incomeTypes.find(t => t.id.toString() === income.type);
          
          return {
            'Fecha': income.date,
            'Descripcion': income.description,
            'Monto': income.amount,
            'Tipo_Ingreso': incomeType ? incomeType.name : 'Sin tipo',
            'Timestamp': income.timestamp
          };
        });
        const incomesSheet = XLSX.utils.json_to_sheet(incomesData);
        XLSX.utils.book_append_sheet(workbook, incomesSheet, 'Ingresos');
      }

      // Preparar y agregar hoja de categorías si está seleccionada
      if (exportSelections.categories && data.categories && data.categories.length > 0) {
        const categoriesData = data.categories.map(category => ({
          'ID': category.id,
          'Nombre': category.name,
          'Color': category.color
        }));
        const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
        XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categorias');
      }

      // Preparar y agregar hoja de métodos de pago si está seleccionada
      if (exportSelections.paymentMethods && data.paymentMethods && data.paymentMethods.length > 0) {
        const paymentMethodsData = data.paymentMethods.map(method => ({
          'ID': method.id,
          'Nombre': method.name,
          'Color': method.color
        }));
        const paymentMethodsSheet = XLSX.utils.json_to_sheet(paymentMethodsData);
        XLSX.utils.book_append_sheet(workbook, paymentMethodsSheet, 'Metodos_Pago');
      }

      // Preparar y agregar hoja de tipos de ingreso si está seleccionada
      if (exportSelections.incomeTypes && data.incomeTypes && data.incomeTypes.length > 0) {
        const incomeTypesData = data.incomeTypes.map(type => ({
          'ID': type.id,
          'Nombre': type.name,
          'Color': type.color
        }));
        const incomeTypesSheet = XLSX.utils.json_to_sheet(incomeTypesData);
        XLSX.utils.book_append_sheet(workbook, incomeTypesSheet, 'Tipos_Ingreso');
      }

      // Preparar y agregar hoja de metadatos si está seleccionada
      if (exportSelections.metadata) {
        const metadataSheet = XLSX.utils.json_to_sheet([{
          'Version': data.version || this.version,
          'Fecha_Exportacion': new Date().toISOString(),
          'Total_Gastos': (data.expenses || []).length,
          'Total_Ingresos': (data.incomes || []).length,
          'Fecha_Creacion': data.createdAt,
          'Ultima_Modificacion': data.lastModified
        }]);
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
      }

      // Generar archivo y descargarlo
      const fileName = `mis-finanzas-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      return { success: true, fileName };

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      return { success: false, error: error.message };
    }
  }

  // Importar datos desde Excel
  async importFromExcel(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Verificar que existan al menos algunas hojas válidas
            const validSheets = ['Gastos', 'Ingresos', 'Categorias', 'Metodos_Pago', 'Tipos_Ingreso'];
            const availableSheets = validSheets.filter(sheet => workbook.SheetNames.includes(sheet));
            
            if (availableSheets.length === 0) {
              throw new Error(`El archivo debe contener al menos una de estas hojas: ${validSheets.join(', ')}`);
            }

            // Leer datos de cada hoja disponible
            const expenses = workbook.Sheets['Gastos'] ? this.parseExpensesSheet(workbook.Sheets['Gastos']) : [];
            const incomes = workbook.Sheets['Ingresos'] ? this.parseIncomesSheet(workbook.Sheets['Ingresos']) : [];
            const categories = workbook.Sheets['Categorias'] ? this.parseCategoriesSheet(workbook.Sheets['Categorias']) : this.getDefaultCategories();
            const paymentMethods = workbook.Sheets['Metodos_Pago'] ? this.parsePaymentMethodsSheet(workbook.Sheets['Metodos_Pago']) : this.getDefaultPaymentMethods();
            const incomeTypes = workbook.Sheets['Tipos_Ingreso'] ? this.parseIncomeTypesSheet(workbook.Sheets['Tipos_Ingreso']) : this.getDefaultIncomeTypes();

            // Leer metadata si existe
            let metadata = {};
            if (workbook.SheetNames.includes('Metadata')) {
              const metadataArray = XLSX.utils.sheet_to_json(workbook.Sheets['Metadata']);
              if (metadataArray.length > 0) {
                metadata = metadataArray[0];
              }
            }

            // Crear estructura de datos compatible
            const importedData = {
              version: metadata.Version || this.version,
              createdAt: metadata.Fecha_Creacion || new Date().toISOString(),
              lastModified: new Date().toISOString(),
              importedAt: new Date().toISOString(),
              expenses,
              incomes,
              categories,
              paymentMethods,
              incomeTypes,
              settings: {
                autoBackup: true,
                backupFrequency: 'daily',
                currency: 'PEN',
                dateFormat: 'YYYY-MM-DD'
              }
            };

            // Validar datos importados
            if (this.validateImportedData(importedData)) {
              resolve(importedData);
            } else {
              throw new Error('Datos importados no son válidos');
            }

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

  // Parsear hoja de gastos
  parseExpensesSheet(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    return rawData.map((row, index) => ({
      id: Date.now() + Math.random() + index,
      date: this.parseDate(row.Fecha),
      description: row.Descripcion || '',
      amount: parseFloat(row.Monto) || 0,
      category: this.parseCategoryReference(row.Categoria),
      paymentMethod: this.parsePaymentMethodReference(row.Metodo_Pago),
      timestamp: row.Timestamp || new Date().toISOString()
    }));
  }

  // Parsear hoja de ingresos
  parseIncomesSheet(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    return rawData.map((row, index) => ({
      id: Date.now() + Math.random() + index,
      date: this.parseDate(row.Fecha),
      description: row.Descripcion || '',
      amount: parseFloat(row.Monto) || 0,
      type: this.parseIncomeTypeReference(row.Tipo_Ingreso),
      timestamp: row.Timestamp || new Date().toISOString()
    }));
  }

  // Parsear hoja de categorias
  parseCategoriesSheet(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    return rawData.map(row => ({
      id: parseInt(row.ID) || Date.now() + Math.random(),
      name: row.Nombre || '',
      color: row.Color || '#74B9FF'
    }));
  }

  // Parsear hoja de metodos de pago
  parsePaymentMethodsSheet(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    return rawData.map(row => ({
      id: parseInt(row.ID) || Date.now() + Math.random(),
      name: row.Nombre || '',
      color: row.Color || '#74B9FF'
    }));
  }

  // Parsear hoja de tipos de ingreso
  parseIncomeTypesSheet(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    return rawData.map(row => ({
      id: parseInt(row.ID) || Date.now() + Math.random(),
      name: row.Nombre || '',
      color: row.Color || '#74B9FF'
    }));
  }

  // Funciones auxiliares de parseo
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

  parseCategoryReference(categoryName) {
    // Por defecto retorna "1" si no se puede parsear
    return "1";
  }

  parsePaymentMethodReference(methodName) {
    // Por defecto retorna "1" si no se puede parsear
    return "1";
  }

  parseIncomeTypeReference(typeName) {
    // Por defecto retorna "1" si no se puede parsear
    return "1";
  }

  // Obtener categorías por defecto
  getDefaultCategories() {
    return [
      { id: 1, name: 'Comida', color: '#FF6B6B' },
      { id: 2, name: 'Transporte', color: '#4ECDC4' },
      { id: 3, name: 'Entretenimiento', color: '#45B7D1' },
      { id: 4, name: 'Servicios', color: '#96CEB4' },
      { id: 5, name: 'Compras', color: '#FFEAA7' }
    ];
  }

  // Obtener métodos de pago por defecto
  getDefaultPaymentMethods() {
    return [
      { id: 1, name: 'Efectivo', color: '#74B9FF' },
      { id: 2, name: 'Tarjeta de Débito', color: '#0984E3' },
      { id: 3, name: 'Tarjeta de Crédito', color: '#6C5CE7' },
      { id: 4, name: 'Transferencia', color: '#A29BFE' }
    ];
  }

  // Obtener tipos de ingreso por defecto
  getDefaultIncomeTypes() {
    return [
      { id: 1, name: 'Mi Salario', color: '#00B894' },
      { id: 2, name: 'Salario Esposa', color: '#00CEC9' },
      { id: 3, name: 'Ingresos Adicionales', color: '#55A3FF' }
    ];
  }

  // Validar datos importados
  validateImportedData(data) {
    try {
      // Verificar estructura básica
      const requiredFields = ['expenses', 'incomes', 'categories', 'paymentMethods', 'incomeTypes'];
      
      for (const field of requiredFields) {
        if (!Array.isArray(data[field])) {
          console.error(`Campo requerido faltante o inválido: ${field}`);
          return false;
        }
      }

      // Verificar que categorías, métodos de pago y tipos de ingreso tengan al menos un elemento
      if (data.categories.length === 0 || data.paymentMethods.length === 0 || data.incomeTypes.length === 0) {
        console.error('Debe haber al menos una categoría, método de pago y tipo de ingreso');
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error validando datos importados:', error);
      return false;
    }
  }
}

// Instancia singleton
const excelService = new ExcelService();

export default excelService;