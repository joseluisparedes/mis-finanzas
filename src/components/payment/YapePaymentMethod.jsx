import React, { useState } from 'react';
import { 
  Smartphone, 
  MessageCircle, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  Clock,
  User,
  CreditCard
} from 'lucide-react';

const YapePaymentMethod = ({ 
  planType = 'premium', 
  amount = 15.00, 
  isEarlyBird = true,
  userEmail,
  onPaymentInitiated 
}) => {
  const [paymentStep, setPaymentStep] = useState(1); // 1: Instructions, 2: Confirmation, 3: Pending
  const [hasCopiedNumber, setHasCopiedNumber] = useState(false);

  const yapeNumber = "940144418";
  const adminName = "José Luis";
  
  // Generar mensaje personalizado para WhatsApp
  const generateWhatsAppMessage = () => {
    const planName = planType === 'premium' 
      ? (isEarlyBird ? 'Premium Early Bird' : 'Premium') 
      : 'Family';
    
    const message = `🚀 *PAGO REALIZADO - Mis Finanzas*

📋 *Detalles del Pago:*
• Plan: ${planName}
• Monto: S/ ${amount.toFixed(2)}
• Email: ${userEmail}
• Fecha: ${new Date().toLocaleDateString('es-PE')}

📱 *He realizado la transferencia Yape al número ${yapeNumber}*

📸 Adjunto captura de pantalla del comprobante.

¡Gracias! Espero la activación de mi cuenta.`;

    return encodeURIComponent(message);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setHasCopiedNumber(true);
    setTimeout(() => setHasCopiedNumber(false), 2000);
  };

  const openWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/51${yapeNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setPaymentStep(3);
    onPaymentInitiated?.();
  };

  if (paymentStep === 3) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-8 h-8 text-yellow-600" />
          <div>
            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
              Pago en Proceso de Verificación
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300">
              Hemos recibido tu solicitud de pago por Yape
            </p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-yellow-800 dark:text-yellow-200">
          <p>✅ Mensaje enviado a WhatsApp</p>
          <p>⏳ Verificación del pago en curso</p>
          <p>📧 Recibirás confirmación por email cuando se active tu cuenta</p>
          
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-800/50 rounded">
            <p className="font-medium">⚡ Tiempo estimado de activación:</p>
            <p>• Horario comercial: 2-6 horas</p>
            <p>• Fines de semana: 12-24 horas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
      {/* Header */}
      <div className="bg-purple-600 text-white p-4">
        <div className="flex items-center space-x-3">
          <Smartphone className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-bold">Pago con Yape + WhatsApp</h3>
            <p className="text-purple-100 text-sm">Rápido, seguro y verificado manualmente</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Plan seleccionado</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {planType === 'premium' 
                  ? (isEarlyBird ? '👑 Premium Early Bird' : '💎 Premium') 
                  : '👪 Family'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total a pagar</p>
              <p className="text-2xl font-bold text-green-600">S/ {amount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Step 1: Yape Transfer Instructions */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Realizar transferencia Yape
            </h4>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
            {/* Yape Number */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Número de Yape:
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-purple-600">{yapeNumber}</p>
                  <button
                    onClick={() => copyToClipboard(yapeNumber)}
                    className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                    title="Copiar número"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {hasCopiedNumber && (
                    <span className="text-green-600 text-xs">¡Copiado!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Recipient Info */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>Titular: {adminName}</span>
            </div>
          </div>

          {/* Amount to Transfer */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <p className="text-green-800 dark:text-green-200 font-medium">
                Transfiere exactamente: <span className="text-xl font-bold">S/ {amount.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: WhatsApp Confirmation */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enviar comprobante por WhatsApp
            </h4>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Después de realizar la transferencia, presiona el botón para enviar la captura de pantalla:
            </p>

            <button
              onClick={openWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Enviar Comprobante por WhatsApp</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Instrucciones importantes:</p>
              <ul className="space-y-1 text-xs">
                <li>• Envía la captura de pantalla completa del comprobante Yape</li>
                <li>• Incluye tu email ({userEmail}) en el mensaje</li>
                <li>• Verifica que el monto sea exacto: S/ {amount.toFixed(2)}</li>
                <li>• Tu cuenta será activada manualmente en 2-6 horas</li>
                <li>• Recibirás confirmación por email cuando esté lista</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>¿Problemas con el pago? Escríbenos al WhatsApp</p>
          <p className="font-medium">{yapeNumber} - {adminName}</p>
        </div>
      </div>
    </div>
  );
};

export default YapePaymentMethod;