import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Calendar,
  Target,
  PieChart,
  BarChart3,
  Clock,
  Zap
} from 'lucide-react';

const FinancialDashboard = ({ 
  expenses = [], 
  incomes = [], 
  categories = [], 
  paymentMethods = [],
  getFinancialSummary,
  getExpensesByCategory 
}) => {
  const [timeFrame, setTimeFrame] = useState('month'); // week, month, year

  // Calcular fechas según el timeframe
  const getDateRange = (timeFrame) => {
    const end = new Date();
    const start = new Date();
    
    switch (timeFrame) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setMonth(end.getMonth() - 1);
    }
    
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  // Datos calculados según timeframe
  const financialData = useMemo(() => {
    const defaultData = {
      totalExpenses: 0,
      totalIncomes: 0,
      balance: 0,
      savingsRate: 0,
      expenseCount: 0,
      incomeCount: 0,
      averageExpense: 0,
      averageIncome: 0
    };

    if (!getFinancialSummary) {
      return defaultData;
    }

    try {
      const { start, end } = getDateRange(timeFrame);
      const result = getFinancialSummary(start, end);
      
      // Asegurar que todas las propiedades existen y son números
      // Mapear tanto snake_case como camelCase para compatibilidad
      return {
        totalExpenses: Number(result?.totalExpenses || result?.total_expenses) || 0,
        totalIncomes: Number(result?.totalIncomes || result?.total_incomes) || 0,
        balance: Number(result?.balance) || 0,
        savingsRate: Number(result?.savingsRate || result?.savings_rate) || 0,
        expenseCount: Number(result?.expenseCount || result?.expense_count) || 0,
        incomeCount: Number(result?.incomeCount || result?.income_count) || 0,
        averageExpense: Number(result?.averageExpense || result?.average_expense) || 0,
        averageIncome: Number(result?.averageIncome || result?.average_income) || 0
      };
    } catch (error) {
      console.error('Error calculating financial data:', error);
      return defaultData;
    }
  }, [timeFrame, getFinancialSummary]);

  // Datos de gastos por categoría
  const categoryData = useMemo(() => {
    return getExpensesByCategory ? getExpensesByCategory() : [];
  }, [getExpensesByCategory]);

  // Alertas y recomendaciones
  const getFinancialAlerts = () => {
    const alerts = [];
    
    // Alert de balance negativo
    if (financialData.balance < 0) {
      alerts.push({
        type: 'error',
        icon: AlertTriangle,
        title: 'Balance Negativo',
        message: `Estás gastando $${Math.abs(Number(financialData.balance) || 0).toFixed(2)} más de lo que ingresas`,
        action: 'Revisar gastos'
      });
    }
    
    // Alert de tasa de ahorro baja
    if (financialData.savingsRate < 10 && financialData.totalIncomes > 0) {
      alerts.push({
        type: 'warning',
        icon: Target,
        title: 'Tasa de Ahorro Baja',
        message: `Solo estás ahorrando ${(Number(financialData.savingsRate) || 0).toFixed(1)}%. Recomendamos al menos 20%`,
        action: 'Optimizar gastos'
      });
    }
    
    // Alert de gastos altos en una categoría
    const topCategory = categoryData.reduce((max, cat) => 
      cat.total > (max?.total || 0) ? cat : max, null
    );
    
    if (topCategory && topCategory.total > financialData.totalExpenses * 0.4) {
      alerts.push({
        type: 'warning',
        icon: PieChart,
        title: 'Concentración de Gastos',
        message: `${topCategory.name} representa ${((topCategory.total / financialData.totalExpenses) * 100).toFixed(1)}% de tus gastos`,
        action: 'Diversificar gastos'
      });
    }
    
    // Alert positivo
    if (financialData.savingsRate >= 20) {
      alerts.push({
        type: 'success',
        icon: CheckCircle,
        title: '¡Excelente Ahorro!',
        message: `Estás ahorrando ${financialData.savingsRate.toFixed(1)}% de tus ingresos`,
        action: 'Continuar así'
      });
    }
    
    return alerts;
  };

  const alerts = getFinancialAlerts();

  // Proyecciones financieras
  const getProjections = () => {
    const dailyAvgExpense = financialData.totalExpenses / (timeFrame === 'week' ? 7 : timeFrame === 'month' ? 30 : 365);
    const dailyAvgIncome = financialData.totalIncomes / (timeFrame === 'week' ? 7 : timeFrame === 'month' ? 30 : 365);
    
    const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const remainingDays = daysInCurrentMonth - currentDay;
    
    const projectedMonthlyExpenses = (dailyAvgExpense * currentDay) + (dailyAvgExpense * remainingDays);
    const projectedMonthlyIncomes = (dailyAvgIncome * currentDay) + (dailyAvgIncome * remainingDays);
    const projectedBalance = projectedMonthlyIncomes - projectedMonthlyExpenses;
    
    return {
      projectedMonthlyExpenses,
      projectedMonthlyIncomes,
      projectedBalance,
      dailyAvgExpense,
      dailyAvgIncome
    };
  };

  const projections = getProjections();

  // Componente de métrica
  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color }}>
            {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-center">
          <div className="p-2 rounded-full" style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {trend && (
            <div className={`flex items-center mt-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Componente de alerta
  const AlertCard = ({ alert }) => {
    const colorClasses = {
      error: 'border-red-500 bg-red-50 text-red-800',
      warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
      success: 'border-green-500 bg-green-50 text-green-800'
    };

    return (
      <div className={`p-4 rounded-lg border-l-4 ${colorClasses[alert.type]}`}>
        <div className="flex items-start">
          <alert.icon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{alert.title}</h4>
            <p className="text-sm mt-1">{alert.message}</p>
            <button className="text-xs font-medium mt-2 underline hover:no-underline">
              {alert.action}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con selector de tiempo */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
              Dashboard Financiero
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Análisis y toma de decisiones para tu economía personal
            </p>
          </div>
          
          <div className="flex space-x-2">
            {[
              { key: 'week', label: '7 días' },
              { key: 'month', label: '30 días' },
              { key: 'year', label: '1 año' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFrame(key)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  timeFrame === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Balance Actual"
          value={financialData.balance}
          subtitle={`${financialData.balance >= 0 ? 'Superávit' : 'Déficit'}`}
          icon={financialData.balance >= 0 ? TrendingUp : TrendingDown}
          color={financialData.balance >= 0 ? '#10B981' : '#EF4444'}
        />
        
        <MetricCard
          title="Tasa de Ahorro"
          value={`${(Number(financialData.savingsRate) || 0).toFixed(1)}%`}
          subtitle="De tus ingresos totales"
          icon={Target}
          color="#8B5CF6"
        />
        
        <MetricCard
          title="Gasto Promedio"
          value={financialData.averageExpense}
          subtitle={`${financialData.expenseCount} transacciones`}
          icon={DollarSign}
          color="#F59E0B"
        />
        
        <MetricCard
          title="Ingresos Totales"
          value={financialData.totalIncomes}
          subtitle={`${financialData.incomeCount} fuentes`}
          icon={TrendingUp}
          color="#10B981"
        />
      </div>

      {/* Alertas y recomendaciones */}
      {alerts.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Alertas y Recomendaciones
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <AlertCard key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Proyecciones */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-500" />
          Proyecciones del Mes
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Gasto Proyectado</p>
            <p className="text-xl font-bold text-blue-900">
              ${projections.projectedMonthlyExpenses.toFixed(2)}
            </p>
            <p className="text-xs text-blue-600">
              ${projections.dailyAvgExpense.toFixed(2)} promedio diario
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-800">Ingreso Proyectado</p>
            <p className="text-xl font-bold text-green-900">
              ${projections.projectedMonthlyIncomes.toFixed(2)}
            </p>
            <p className="text-xs text-green-600">
              ${projections.dailyAvgIncome.toFixed(2)} promedio diario
            </p>
          </div>
          
          <div className={`${projections.projectedBalance >= 0 ? 'bg-green-50' : 'bg-red-50'} p-4 rounded-lg`}>
            <p className={`text-sm font-medium ${projections.projectedBalance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              Balance Proyectado
            </p>
            <p className={`text-xl font-bold ${projections.projectedBalance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              ${projections.projectedBalance.toFixed(2)}
            </p>
            <p className={`text-xs ${projections.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {projections.projectedBalance >= 0 ? 'Ahorro esperado' : 'Déficit esperado'}
            </p>
          </div>
        </div>
      </div>

      {/* Top categorías */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-purple-500" />
          Gastos por Categoría
        </h3>
        
        <div className="space-y-3">
          {categoryData.slice(0, 5).map((category, index) => {
            const percentage = financialData.totalExpenses > 0 
              ? (category.total / financialData.totalExpenses) * 100 
              : 0;
            
            return (
              <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div>
                    <p className="font-medium text-sm">{category.name}</p>
                    <p className="text-xs text-gray-500">{category.count} transacciones</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">${category.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-900">
          🎯 Acciones Recomendadas
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-blue-800 mb-2">Para Hoy</h4>
            <ul className="text-sm space-y-1 text-blue-700">
              <li>• Registrar gastos del día</li>
              <li>• Revisar presupuesto restante</li>
              <li>• Verificar gastos pendientes</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-blue-800 mb-2">Esta Semana</h4>
            <ul className="text-sm space-y-1 text-blue-700">
              <li>• Crear backup de datos</li>
              <li>• Revisar objetivos mensuales</li>
              <li>• Planificar gastos grandes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;