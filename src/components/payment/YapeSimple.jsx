import React, { useState } from 'react';

const YapeSimple = ({ 
  amount = 15.00, 
  userEmail = "usuario@ejemplo.com",
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  
  const yapeNumber = "940144418";
  
  const copyNumber = () => {
    navigator.clipboard.writeText(yapeNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const openWhatsApp = () => {
    const message = `🚀 PAGO REALIZADO - Mis Finanzas

📋 Detalles del Pago:
• Monto: S/ ${amount.toFixed(2)}
• Email: ${userEmail}
• Fecha: ${new Date().toLocaleDateString('es-PE')}

📱 He realizado la transferencia Yape al número ${yapeNumber}

📸 Adjunto captura de pantalla del comprobante.

¡Gracias! Espero la activación de mi cuenta.`;
    
    const whatsappUrl = `https://wa.me/51${yapeNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setStep(3);
    
    if (onComplete) {
      onComplete({
        method: 'yape',
        status: 'pending_verification',
        amount,
        userEmail
      });
    }
  };
  
  if (step === 3) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-yellow-800 mb-2">
            Pago Enviado
          </h3>
          <p className="text-yellow-700 text-sm">
            Tu pago será verificado en 2-6 horas. Recibirás confirmación por email.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">📱</div>
        <h2 className="text-xl font-bold text-gray-900">Pago con Yape</h2>
        <p className="text-gray-600">Transfiere S/ {amount.toFixed(2)} por Yape</p>
      </div>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm font-medium text-purple-800 mb-2">
          Número de Yape:
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-purple-600">{yapeNumber}</span>
          <button
            onClick={copyNumber}
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
          >
            {copied ? '✅ Copiado' : '📋 Copiar'}
          </button>
        </div>
        <p className="text-sm text-purple-600 mt-2">👤 José Luis</p>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">💰</span>
          <span className="font-bold text-green-800">
            Transfiere exactamente: S/ {amount.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Pasos:</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>1️⃣ Abre tu app Yape</p>
          <p>2️⃣ Transfiere S/ {amount.toFixed(2)} al número {yapeNumber}</p>
          <p>3️⃣ Toma captura del comprobante</p>
          <p>4️⃣ Presiona el botón de abajo para enviar por WhatsApp</p>
        </div>
      </div>
      
      <button
        onClick={openWhatsApp}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg"
      >
        💬 Enviar Comprobante por WhatsApp
      </button>
      
      <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
        ⚠️ Importante: Envía la captura completa del comprobante e incluye tu email ({userEmail})
      </div>
    </div>
  );
};

export default YapeSimple;