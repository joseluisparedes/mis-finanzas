import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  CheckCircle,
  Clock,
  MessageCircle,
  Zap,
  Copy,
  ExternalLink,
  AlertTriangle,
  User,
  ArrowLeft
} from 'lucide-react';

const PaymentMethodSelectorFixed = ({ 
  planType = 'premium', 
  amount = 15.00, 
  isEarlyBird = true,
  userEmail,
  onPaymentComplete,
  onMethodSelect,
  initialMethod = null
}) => {
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [hasCopiedNumber, setHasCopiedNumber] = useState(false);

  const yapeNumber = "940144418";
  const adminName = "José Luis";

  const paymentMethods = [
    {
      id: 'culqi',
      name: 'Tarjeta de Crédito/Débito',
      description: 'Pago inmediato con tarjeta',
      icon: CreditCard,
      color: 'blue',
      features: ['Activación inmediata', 'Seguro y encriptado', 'Todos los bancos'],
      processingTime: 'Inmediato',
      status: 'available'
    },
    {
      id: 'yape',
      name: 'Yape + WhatsApp',
      description: 'Transfiere por Yape y envía comprobante',
      icon: Smartphone,
      color: 'purple',
      features: ['Pago con Yape', 'Verificación por WhatsApp', 'Sin comisiones adicionales'],
      processingTime: '2-6 horas',
      status: 'available',
      popular: true
    }
  ];

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    if (onMethodSelect) {
      onMethodSelect(methodId);
    }
  };

  const copyYapeNumber = () => {
    navigator.clipboard.writeText(yapeNumber).then(() => {
      setHasCopiedNumber(true);
      setTimeout(() => setHasCopiedNumber(false), 2000);
    });
  };

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

  const openWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/51${yapeNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setPaymentStep(3);
    
    // Notificar que el pago fue iniciado
    if (onPaymentComplete) {
      onPaymentComplete({
        method: 'yape',
        status: 'pending_verification',
        amount: amount,
        planType: planType,
        userEmail: userEmail
      });
    }
  };

  const handleCulqiPayment = () => {
    setIsProcessing(true);
    if (onMethodSelect) {
      onMethodSelect('culqi');
    }
  };

  // Si el método Culqi fue seleccionado y hay onMethodSelect, redirigir externamente
  if (selectedMethod === 'culqi' && onMethodSelect) {
    onMethodSelect('culqi');
    return null;
  }

  // Componente de Yape integrado
  if (selectedMethod === 'yape') {
    if (paymentStep === 3) {
      return (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedMethod(null)}
            className="text-purple-600 hover:text-purple-800 text-sm flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a métodos de pago</span>
          </button>
          
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
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-purple-600 hover:text-purple-800 text-sm flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a métodos de pago</span>
        </button>
        
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
                        onClick={copyYapeNumber}
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
      </div>
    );
  }

  if (selectedMethod === 'culqi') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a métodos de pago</span>
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
          <div className="text-center">
            <CreditCard className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Pago con Tarjeta
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Redirigiendo al checkout seguro...
            </p>
            <button
              onClick={handleCulqiPayment}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg"
            >
              {isProcessing ? 'Procesando...' : `Pagar S/ ${amount.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista principal del selector
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Selecciona tu método de pago
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Plan {planType === 'premium' 
            ? (isEarlyBird ? 'Premium Early Bird' : 'Premium') 
            : 'Family'
          } - S/ {amount.toFixed(2)}
        </p>
      </div>

      <div className="grid gap-4">
        {paymentMethods.map((method) => {
          const IconComponent = method.icon;
          const colorClasses = {
            blue: 'border-blue-200 hover:border-blue-400 dark:border-blue-800 dark:hover:border-blue-600',
            purple: 'border-purple-200 hover:border-purple-400 dark:border-purple-800 dark:hover:border-purple-600'
          };
          
          return (
            <div
              key={method.id}
              className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 ${colorClasses[method.color]} cursor-pointer transition-all hover:shadow-lg`}
              onClick={() => handleMethodSelect(method.id)}
            >
              {method.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    🔥 MÁS POPULAR
                  </span>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${
                      method.color === 'blue' 
                        ? 'bg-blue-100 dark:bg-blue-900/50' 
                        : 'bg-purple-100 dark:bg-purple-900/50'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        method.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {method.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {method.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{method.processingTime}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  {method.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {method.id === 'yape' && (
                      <>
                        <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded">
                          Sin comisiones
                        </span>
                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                          Verificación manual
                        </span>
                      </>
                    )}
                    {method.id === 'culqi' && (
                      <>
                        <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-medium px-2 py-1 rounded">
                          <Zap className="w-3 h-3 inline mr-1" />
                          Instantáneo
                        </span>
                        <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded">
                          <Shield className="w-3 h-3 inline mr-1" />
                          Seguro
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      S/ {amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium text-gray-900 dark:text-white">Pagos seguros y protegidos</p>
            <p>Todos los métodos de pago son seguros y están protegidos. Tu información está encriptada y no se almacena en nuestros servidores.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelectorFixed;