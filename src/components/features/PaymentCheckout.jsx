import React, { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import CulqiCheckout from './CulqiCheckout';
// PaymentSelector removido - versión simplificada

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

  // Versión simplificada - solo checkout directo con Culqi
  return (
    <CulqiCheckout 
      plan={plan}
      onSuccess={onSuccess}
      onCancel={onCancel}
      onError={onError}
    />
  );
};

export default PaymentCheckout;