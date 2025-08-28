import React, { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import CulqiCheckout from './CulqiCheckout';
import PaymentMethodSelector from '../payment/PaymentMethodSelectorFixed';

const PaymentCheckout = ({ plan, onSuccess, onCancel, onError }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Si el plan es gratuito o no definido, usar método tradicional
  if (!plan || plan.price === 0 || plan.id === 'free') {
    return (
      <CulqiCheckout 
        plan={plan}
        onSuccess={onSuccess}
        onCancel={onCancel}
        onError={onError}
      />
    );
  }

  const handleYapePaymentComplete = (paymentInfo) => {
    // Simular respuesta similar a Culqi para compatibilidad
    const mockCulqiResponse = {
      plan: plan,
      amount: plan.price,
      currency: plan.currency || 'PEN',
      method: 'yape',
      status: 'pending_verification',
      transaction_id: `YAPE_${Date.now()}`,
      payment_data: paymentInfo,
      timestamp: new Date().toISOString()
    };

    if (onSuccess) {
      onSuccess(mockCulqiResponse);
    }
  };

  const handleBackToMethodSelection = () => {
    setSelectedMethod(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedMethod === 'culqi' ? 'Pago con Tarjeta' : 
               selectedMethod === 'yape' ? 'Pago con Yape' : 
               'Seleccionar Método de Pago'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {plan?.name} - S/ {plan?.price?.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!selectedMethod ? (
            // Mostrar selector de método de pago
            <PaymentMethodSelector
              planType={plan.id === 'premium_early_bird' ? 'premium' : plan.id}
              amount={plan.price}
              isEarlyBird={plan.isEarlyBird || false}
              userEmail="usuario@ejemplo.com" // TODO: Obtener del contexto de usuario
              onMethodSelect={setSelectedMethod}
            />
          ) : selectedMethod === 'culqi' ? (
            // Mostrar checkout de Culqi (existente)
            <div>
              <button
                onClick={handleBackToMethodSelection}
                className="text-purple-600 hover:text-purple-800 text-sm mb-6 flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a métodos de pago</span>
              </button>
              <CulqiCheckout 
                plan={plan}
                onSuccess={onSuccess}
                onCancel={handleBackToMethodSelection}
                onError={onError}
              />
            </div>
          ) : selectedMethod === 'yape' ? (
            // Mostrar método Yape
            <div>
              <button
                onClick={handleBackToMethodSelection}
                className="text-purple-600 hover:text-purple-800 text-sm mb-6 flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a métodos de pago</span>
              </button>
              <PaymentMethodSelector
                planType={plan.id === 'premium_early_bird' ? 'premium' : plan.id}
                amount={plan.price}
                isEarlyBird={plan.isEarlyBird || false}
                userEmail="usuario@ejemplo.com" // TODO: Obtener del contexto de usuario
                onPaymentComplete={handleYapePaymentComplete}
                initialMethod="yape"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;