import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  CheckCircle,
  Clock,
  MessageCircle,
  Zap
} from 'lucide-react';
import YapePaymentMethod from './YapePaymentMethod';

const PaymentMethodSelector = ({ 
  planType = 'premium', 
  amount = 15.00, 
  isEarlyBird = true,
  userEmail,
  onPaymentComplete,
  onMethodSelect, // Para cuando se use solo como selector
  initialMethod = null // Para mostrar directamente un método específico
}) => {
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);
  const [isProcessing, setIsProcessing] = useState(false);

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
    // Si se proporciona onMethodSelect, se usa como selector puro
    if (onMethodSelect) {
      onMethodSelect(methodId);
    }
  };

  const handleYapePaymentInitiated = () => {
    setIsProcessing(true);
    // Aquí puedes agregar lógica para notificar al sistema sobre el pago pendiente
    onPaymentComplete?.({
      method: 'yape',
      status: 'pending_verification',
      amount: amount,
      planType: planType,
      userEmail: userEmail
    });
  };

  const handleCulqiPayment = () => {
    setIsProcessing(true);
    // Aquí integrarías con Culqi
    console.log('Iniciando pago con Culqi...');
  };

  if (selectedMethod === 'yape') {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-purple-600 hover:text-purple-800 text-sm flex items-center space-x-1"
        >
          <span>← Volver a métodos de pago</span>
        </button>
        
        <YapePaymentMethod
          planType={planType}
          amount={amount}
          isEarlyBird={isEarlyBird}
          userEmail={userEmail}
          onPaymentInitiated={handleYapePaymentInitiated}
        />
      </div>
    );
  }

  if (selectedMethod === 'culqi') {
    // Si hay onMethodSelect, notificar la selección de Culqi para manejo externo
    if (onMethodSelect) {
      onMethodSelect('culqi');
      return null;
    }
    
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
        >
          <span>← Volver a métodos de pago</span>
        </button>
        
        {/* Culqi payment form would go here */}
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

                {/* Special badges */}
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

export default PaymentMethodSelector;