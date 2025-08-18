import { QueryClient } from '@tanstack/react-query';

// Configuración del QueryClient para React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tiempo que los datos se consideran "frescos" (5 minutos)
      staleTime: 5 * 60 * 1000,
      // Tiempo que los datos se mantienen en cache (10 minutos)
      cacheTime: 10 * 60 * 1000,
      // Reintentar en caso de error
      retry: (failureCount, error) => {
        // No reintentar errores de autenticación
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Reintentar máximo 2 veces para otros errores
        return failureCount < 2;
      },
      // Reintento con backoff exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch cuando la ventana vuelve a tener foco
      refetchOnWindowFocus: false,
      // Refetch cuando se reconecta
      refetchOnReconnect: true,
    },
    mutations: {
      // Reintentar mutaciones fallidas una sola vez
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys para organización
export const QUERY_KEYS = {
  // Autenticación
  auth: ['auth'],
  user: ['user'],
  
  // Datos financieros
  expenses: ['expenses'],
  incomes: ['incomes'],
  categories: ['categories'],
  paymentMethods: ['paymentMethods'],
  incomeTypes: ['incomeTypes'],
  settings: ['settings'],
  
  // Resúmenes y estadísticas
  financialSummary: ['financialSummary'],
  expensesByCategory: ['expensesByCategory'],
  monthlyData: ['monthlyData'],
  
  // Con parámetros
  expensesByDateRange: (startDate, endDate) => ['expenses', 'dateRange', startDate, endDate],
  incomesByDateRange: (startDate, endDate) => ['incomes', 'dateRange', startDate, endDate],
  summaryByDateRange: (startDate, endDate) => ['summary', 'dateRange', startDate, endDate],
};

// Funciones de invalidación común
export const invalidateFinancialData = () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomes });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financialSummary });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expensesByCategory });
};

export const invalidateUserData = () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentMethods });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTypes });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
};

// Limpiar cache al logout
export const clearCache = () => {
  queryClient.clear();
};

export default queryClient;