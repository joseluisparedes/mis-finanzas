// Sistema de almacenamiento robusto para uso diario crítico
class FinancialDataStorage {
  constructor() {
    this.storageKey = 'mis-finanzas-data';
    this.backupKey = 'mis-finanzas-backup';
    this.lastBackupKey = 'mis-finanzas-last-backup';
    this.version = '1.0';
    
    // Inicializar sistema
    this.initializeStorage();
  }

  // Inicializar almacenamiento con validaciones
  initializeStorage() {
    try {
      // Verificar disponibilidad de localStorage
      if (!this.isLocalStorageAvailable()) {
        throw new Error('LocalStorage no disponible');
      }
      
      // Migrar datos si es necesario
      this.migrateDataIfNeeded();
      
      // Crear backup automático si no existe
      this.createAutoBackupIfNeeded();
      
    } catch (error) {
      console.error('Error inicializando almacenamiento:', error);
      this.handleStorageError(error);
    }
  }

  // Verificar si localStorage está disponible
  isLocalStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Obtener estructura de datos por defecto
  getDefaultData() {
    return {
      version: this.version,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      expenses: [],
      incomes: [],
      categories: [
        { id: 1, name: 'Comida', color: '#FF6B6B' },
        { id: 2, name: 'Transporte', color: '#4ECDC4' },
        { id: 3, name: 'Entretenimiento', color: '#45B7D1' },
        { id: 4, name: 'Servicios', color: '#96CEB4' },
        { id: 5, name: 'Compras', color: '#FFEAA7' }
      ],
      paymentMethods: [
        { id: 1, name: 'Efectivo', color: '#74B9FF' },
        { id: 2, name: 'Tarjeta de Débito', color: '#0984E3' },
        { id: 3, name: 'Tarjeta de Crédito', color: '#6C5CE7' },
        { id: 4, name: 'Transferencia', color: '#A29BFE' }
      ],
      incomeTypes: [
        { id: 1, name: 'Mi Salario', color: '#00B894' },
        { id: 2, name: 'Salario Esposa', color: '#00CEC9' },
        { id: 3, name: 'Ingresos Adicionales', color: '#55A3FF' }
      ],
      settings: {
        autoBackup: true,
        backupFrequency: 'daily', // daily, weekly, manual
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD'
      }
    };
  }

  // Cargar todos los datos
  loadData() {
    try {
      const rawData = localStorage.getItem(this.storageKey);
      
      if (!rawData) {
        // Primera vez - crear datos por defecto
        const defaultData = this.getDefaultData();
        this.saveData(defaultData);
        return defaultData;
      }

      const data = JSON.parse(rawData);
      
      // Validar integridad de datos
      if (!this.validateData(data)) {
        console.warn('Datos corruptos detectados, restaurando backup...');
        return this.restoreFromBackup();
      }

      // Actualizar timestamp de último acceso
      data.lastAccessed = new Date().toISOString();
      
      return data;
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      return this.restoreFromBackup();
    }
  }

  // Guardar datos con validaciones y backup
  saveData(data) {
    try {
      // Validar datos antes de guardar
      if (!this.validateData(data)) {
        throw new Error('Datos inválidos para guardar');
      }

      // Crear backup antes de guardar nuevos datos
      this.createBackup();

      // Actualizar metadata
      data.lastModified = new Date().toISOString();
      data.version = this.version;

      // Guardar datos principales
      const dataString = JSON.stringify(data);
      localStorage.setItem(this.storageKey, dataString);

      // Verificar que se guardó correctamente
      const verification = localStorage.getItem(this.storageKey);
      if (!verification || verification !== dataString) {
        throw new Error('Error de verificación al guardar');
      }

      // Auto-backup si está habilitado
      if (data.settings?.autoBackup) {
        this.scheduleAutoBackup();
      }

      return true;

    } catch (error) {
      console.error('Error guardando datos:', error);
      this.handleStorageError(error);
      return false;
    }
  }

  // Validar integridad de datos
  validateData(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Validaciones críticas
    const requiredFields = ['expenses', 'incomes', 'categories', 'paymentMethods', 'incomeTypes'];
    
    for (const field of requiredFields) {
      if (!Array.isArray(data[field])) {
        console.error(`Campo requerido faltante o inválido: ${field}`);
        return false;
      }
    }

    // Validar que los IDs sean únicos
    const validateUniqueIds = (items) => {
      const ids = items.map(item => item.id);
      return new Set(ids).size === ids.length;
    };

    if (!validateUniqueIds(data.categories) || 
        !validateUniqueIds(data.paymentMethods) || 
        !validateUniqueIds(data.incomeTypes)) {
      console.error('IDs duplicados detectados');
      return false;
    }

    return true;
  }

  // Crear backup manual
  createBackup() {
    try {
      const currentData = localStorage.getItem(this.storageKey);
      if (currentData) {
        const backup = {
          data: currentData,
          timestamp: new Date().toISOString(),
          version: this.version
        };
        
        localStorage.setItem(this.backupKey, JSON.stringify(backup));
        localStorage.setItem(this.lastBackupKey, backup.timestamp);
        
        console.log('Backup creado exitosamente');
        return true;
      }
    } catch (error) {
      console.error('Error creando backup:', error);
      return false;
    }
  }

  // Restaurar desde backup
  restoreFromBackup() {
    try {
      const backupRaw = localStorage.getItem(this.backupKey);
      
      if (!backupRaw) {
        console.warn('No hay backup disponible, usando datos por defecto');
        return this.getDefaultData();
      }

      const backup = JSON.parse(backupRaw);
      const restoredData = JSON.parse(backup.data);

      if (this.validateData(restoredData)) {
        console.log('Datos restaurados desde backup');
        return restoredData;
      } else {
        console.error('Backup también está corrupto, usando datos por defecto');
        return this.getDefaultData();
      }

    } catch (error) {
      console.error('Error restaurando backup:', error);
      return this.getDefaultData();
    }
  }

  // Exportar datos para backup externo
  exportData() {
    try {
      const data = this.loadData();
      const exportData = {
        ...data,
        exportedAt: new Date().toISOString(),
        exportVersion: this.version
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mis-finanzas-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exportando datos:', error);
      return false;
    }
  }

  // Importar datos desde archivo
  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          if (this.validateData(importedData)) {
            // Crear backup antes de importar
            this.createBackup();
            
            // Importar datos
            this.saveData(importedData);
            
            resolve(importedData);
          } else {
            reject(new Error('Datos importados son inválidos'));
          }
        } catch (error) {
          reject(new Error('Error parsing archivo: ' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }

  // Migrar datos si es necesario
  migrateDataIfNeeded() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        if (!parsedData.version || parsedData.version !== this.version) {
          console.log('Migrando datos a nueva versión...');
          // Aquí se implementarían las migraciones según la versión
          this.performDataMigration(parsedData);
        }
      } catch (error) {
        console.error('Error en migración:', error);
      }
    }
  }

  // Realizar migración de datos
  performDataMigration(oldData) {
    try {
      // Ejemplo de migración - agregar campos faltantes
      const migratedData = {
        ...this.getDefaultData(),
        ...oldData,
        version: this.version,
        migratedAt: new Date().toISOString()
      };

      this.saveData(migratedData);
      console.log('Migración completada');
    } catch (error) {
      console.error('Error en migración:', error);
    }
  }

  // Crear backup automático si es necesario
  createAutoBackupIfNeeded() {
    const lastBackup = localStorage.getItem(this.lastBackupKey);
    const now = new Date();
    
    if (!lastBackup) {
      this.createBackup();
      return;
    }

    const lastBackupDate = new Date(lastBackup);
    const daysSinceBackup = (now - lastBackupDate) / (1000 * 60 * 60 * 24);

    if (daysSinceBackup >= 1) { // Backup diario
      this.createBackup();
    }
  }

  // Programar backup automático
  scheduleAutoBackup() {
    // En una implementación real, esto podría usar Service Workers
    // Por ahora, solo crear backup si ha pasado tiempo suficiente
    this.createAutoBackupIfNeeded();
  }

  // Manejar errores de almacenamiento
  handleStorageError(error) {
    console.error('Error crítico de almacenamiento:', error);
    
    // Intentar limpiar storage corrupto
    try {
      localStorage.removeItem(this.storageKey);
      console.log('Storage corrupto limpiado');
    } catch (cleanupError) {
      console.error('Error limpiando storage:', cleanupError);
    }

    // Mostrar notificación al usuario (implementar según UI)
    this.notifyUser('Error de almacenamiento detectado. Se restaurarán datos de backup.');
  }

  // Notificar usuario (placeholder)
  notifyUser(message) {
    // Implementar según el sistema de notificaciones de la app
    console.warn('NOTIFICACIÓN USUARIO:', message);
  }

  // Obtener estadísticas de almacenamiento
  getStorageStats() {
    try {
      const data = this.loadData();
      const dataSize = new Blob([JSON.stringify(data)]).size;
      const lastBackup = localStorage.getItem(this.lastBackupKey);
      
      return {
        dataSize: dataSize,
        dataSizeFormatted: this.formatBytes(dataSize),
        totalExpenses: data.expenses.length,
        totalIncomes: data.incomes.length,
        lastBackup: lastBackup,
        storageVersion: data.version,
        isHealthy: this.validateData(data)
      };
    } catch (error) {
      return {
        error: error.message,
        isHealthy: false
      };
    }
  }

  // Formatear bytes para mostrar tamaño
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Instancia singleton
const storage = new FinancialDataStorage();

export default storage;