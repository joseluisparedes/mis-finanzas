import React, { useState } from 'react';
import YapeSimple from './YapeSimple';

const PaymentSelector = ({ 
  amount = 15.00,
  userEmail = "usuario@ejemplo.com",
  onMethodSelect,
  onPaymentComplete
}) => {
  const [selectedMethod, setSelectedMethod] = useState(null);

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    if (onMethodSelect) {
      onMethodSelect(method);
    }
  };

  const handleYapeComplete = (paymentInfo) => {
    if (onPaymentComplete) {
      onPaymentComplete(paymentInfo);
    }
  };

  if (selectedMethod === 'yape') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-purple-600 hover:text-purple-800 text-sm"
        >
          ← Volver a métodos de pago
        </button>
        <YapeSimple
          amount={amount}
          userEmail={userEmail}
          onComplete={handleYapeComplete}
        />
      </div>
    );
  }

  if (selectedMethod === 'culqi') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Volver a métodos de pago
        </button>
        <div className="bg-white border rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Pago con Tarjeta</h3>
          <p className="text-gray-600 mb-4">Procesando pago con tarjeta...</p>
          <button
            onClick={() => handleMethodSelect('culqi')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Pagar S/ {amount.toFixed(2)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Selecciona método de pago
        </h2>
        <p className="text-gray-600">S/ {amount.toFixed(2)}</p>
      </div>

      <div className="grid gap-4">
        {/* Yape Option */}
        <div
          onClick={() => handleMethodSelect('yape')}
          className="bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg relative"
        >
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              🔥 MÁS POPULAR
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <span className="text-2xl">📱</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Yape + WhatsApp</h3>
              <p className="text-gray-600 text-sm">Transfiere y envía comprobante</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">⏰ 2-6 horas</div>
              <div className="text-2xl font-bold text-gray-900">S/ {amount.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              Sin comisiones
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              Verificación manual
            </span>
          </div>
        </div>

        {/* Culqi Option */}
        <div
          onClick={() => handleMethodSelect('culqi')}
          className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Tarjeta de Crédito/Débito</h3>
              <p className="text-gray-600 text-sm">Pago inmediato con tarjeta</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">⏰ Inmediato</div>
              <div className="text-2xl font-bold text-gray-900">S/ {amount.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
              ⚡ Instantáneo
            </span>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              🛡️ Seguro
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-xl">🛡️</span>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Pagos seguros y protegidos</p>
            <p>Tu información está encriptada y protegida.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelector;