import React, { useState } from 'react';
import { X, Crown, Users, Star } from 'lucide-react';
import PaymentMethodSelector from '../payment/PaymentMethodSelector';

const UpgradeModal = ({ isOpen, onClose, currentUser }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const plans = [
    {
      id: 'premium-eb',
      type: 'premium',
      name: 'Premium Early Bird',
      icon: Crown,
      price: 15.00,
      originalPrice: 50.00,
      isEarlyBird: true,
      popular: true,
      features: [
        'Transacciones ilimitadas',
        'Presupuestos ilimitados',
        'Categorías personalizadas ilimitadas',
        'Reportes avanzados',
        'Exportar a Excel',
        'Soporte prioritario'
      ],
      badge: '70% OFF',
      color: 'yellow'
    },
    {
      id: 'premium',
      type: 'premium',
      name: 'Premium',
      icon: Crown,
      price: 50.00,
      originalPrice: null,
      isEarlyBird: false,
      features: [
        'Transacciones ilimitadas',
        'Presupuestos ilimitados',
        'Categorías personalizadas ilimitadas',
        'Reportes avanzados',
        'Exportar a Excel',
        'Soporte prioritario'
      ],
      color: 'blue'
    },
    {
      id: 'family',
      type: 'family',
      name: 'Family',
      icon: Users,
      price: 0.00,
      originalPrice: null,
      isEarlyBird: false,
      features: [
        'Acceso básico gratuito',
        'Límites estándar',
        'Soporte comunitario',
        'Funciones esenciales'
      ],
      badge: 'GRATIS',
      color: 'green'
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentComplete = (paymentInfo) => {
    console.log('Payment completed:', paymentInfo);
    
    // Aquí llamarías a tu función para registrar el pago pendiente
    // y notificar al admin si es Yape
    if (paymentInfo.method === 'yape') {
      // Registrar pago pendiente de verificación
      console.log('Yape payment pending verification');
      // Mostrar mensaje de confirmación
      alert('¡Pago registrado! Recibirás confirmación cuando se verifique tu transferencia.');
    }
    
    onClose();
  };

  const handleBack = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {showPayment ? 'Completar Pago' : 'Mejorar tu Plan'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {showPayment 
                ? `Plan ${selectedPlan?.name} - S/ ${selectedPlan?.price.toFixed(2)}`
                : 'Desbloquea todas las funciones premium'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {showPayment ? (
            <div>
              <button
                onClick={handleBack}
                className="text-purple-600 hover:text-purple-800 text-sm mb-6 flex items-center space-x-1"
              >
                <span>← Volver a selección de planes</span>
              </button>
              
              <PaymentMethodSelector
                planType={selectedPlan.type}
                amount={selectedPlan.price}
                isEarlyBird={selectedPlan.isEarlyBird}
                userEmail={currentUser?.email}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const IconComponent = plan.icon;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white dark:bg-gray-700 rounded-xl border-2 ${
                      plan.popular 
                        ? 'border-purple-400 dark:border-purple-500' 
                        : 'border-gray-200 dark:border-gray-600'
                    } p-6 hover:shadow-lg transition-all`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>MÁS POPULAR</span>
                        </span>
                      </div>
                    )}
                    
                    {plan.badge && (
                      <div className="absolute -top-2 -right-2">
                        <span className={`text-white text-xs font-bold px-2 py-1 rounded-full ${
                          plan.color === 'yellow' ? 'bg-yellow-500' : 
                          plan.color === 'green' ? 'bg-green-500' : 'bg-blue-500'
                        }`}>
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className={`inline-flex p-3 rounded-full mb-4 ${
                        plan.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                        plan.color === 'green' ? 'bg-green-100 dark:bg-green-900/50' :
                        'bg-blue-100 dark:bg-blue-900/50'
                      }`}>
                        <IconComponent className={`w-8 h-8 ${
                          plan.color === 'yellow' ? 'text-yellow-600' :
                          plan.color === 'green' ? 'text-green-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      
                      <div className="mb-4">
                        {plan.originalPrice && (
                          <p className="text-gray-500 line-through text-sm">
                            S/ {plan.originalPrice.toFixed(2)}
                          </p>
                        )}
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {plan.price === 0 ? 'GRATIS' : `S/ ${plan.price.toFixed(2)}`}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">por mes</p>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            plan.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                            plan.color === 'green' ? 'bg-green-100 dark:bg-green-900/50' :
                            'bg-blue-100 dark:bg-blue-900/50'
                          }`}>
                            <span className={`text-xs ${
                              plan.color === 'yellow' ? 'text-yellow-600' :
                              plan.color === 'green' ? 'text-green-600' :
                              'text-blue-600'
                            }`}>✓</span>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanSelect(plan)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                          : plan.color === 'green'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {plan.price === 0 ? 'Solicitar Acceso' : 'Seleccionar Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;