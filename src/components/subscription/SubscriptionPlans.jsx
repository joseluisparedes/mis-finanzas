import React, { useState, useEffect } from 'react';
import CulqiCheckout from '../payment/CulqiCheckout';
import { usePromotion } from '../../hooks/usePromotion';
import { useUserSubscription } from '../../hooks/useUserSubscription';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { supabase } from '../../lib/supabase';

const SubscriptionPlans = ({ currentPlan = 'free', onSuccess, onNavigateToExpenses }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  
  const { promotion, loading: promotionLoading, error: promotionError } = usePromotion();
  const { refreshSubscription } = useUserSubscription();
  const { isYapeEnabled, isCulqiEnabled, hasAnyMethodEnabled } = usePaymentMethods();

  const plans = [
    {
      id: 'free',
      name: 'Gratis',
      price: 0,
      currency: 'PEN',
      period: 'siempre',
      icon: '⚡',
      color: 'blue',
      features: [
        '30 transacciones/mes',
        '2 presupuestos activos',
        '3 categorías personalizadas',
        'Reportes básicos (3 meses)',
        'Solo moneda PEN',
        'Exportar CSV básico'
      ],
      limitations: [
        'Sin importar datos',
        'Sin análisis avanzados',
        'Sin multi-moneda'
      ],
      popular: false,
      current: currentPlan === 'free'
    },
    // Early Bird Plan (dinámico)
    ...(promotion && promotion.available ? [{
      id: 'premium_early_bird',
      name: promotion.name || 'Premium Early Bird',
      price: promotion.promo_price,
      currency: 'PEN',
      period: 'mes',
      icon: '👑',
      color: 'purple',
      features: [
        `🔥 PRECIO FUNDADOR - Solo S/ ${promotion.promo_price}/mes`,
        '✨ Precio bloqueado PARA SIEMPRE',
        'Transacciones ILIMITADAS',
        'Presupuestos ILIMITADOS',
        'Categorías ILIMITADAS',
        'Reportes sin límite de tiempo',
        'Multi-moneda (PEN/USD)',
        'Exportar/Importar Excel',
        'Análisis avanzados',
        'Gráficos premium',
        'Acceso prioritario a nuevas funciones',
        'Soporte VIP',
        `⏰ Solo quedan ${promotion.spots_left} cupos`
      ],
      popular: true,
      current: currentPlan === 'premium',
      savings: Math.round(((promotion.original_price - promotion.promo_price) / promotion.original_price) * 100),
      originalPrice: promotion.original_price,
      isEarlyBird: true,
      limitedTime: true,
      spotsLeft: promotion.spots_left,
      promotionData: promotion
    }] : []),
    {
      id: 'premium_monthly',
      name: 'Premium Mensual',
      price: 15,
      currency: 'PEN',
      period: 'mes',
      icon: '👑',
      color: 'yellow',
      features: [
        'Transacciones ILIMITADAS',
        'Presupuestos ILIMITADOS',
        'Categorías ILIMITADAS',
        'Reportes sin límite de tiempo',
        'Multi-moneda (PEN/USD)',
        'Exportar/Importar Excel',
        'Análisis avanzados',
        'Gráficos premium',
        'Notificaciones inteligentes',
        'Soporte prioritario'
      ],
      popular: false,
      current: currentPlan === 'premium',
      savings: null,
      comingSoon: true // Se activa cuando termine Early Bird
    },
    {
      id: 'premium_yearly',
      name: 'Premium Anual',
      price: 150,
      currency: 'PEN',
      period: 'año',
      icon: '👑',
      color: 'green',
      features: [
        'Todo lo de Premium Mensual',
        'AHORRA S/ 30 al año',
        'Acceso Early Bird a nuevas funciones',
        'Consultoría financiera personal',
        'Backup automático en la nube',
        'Reportes personalizados'
      ],
      popular: false,
      current: currentPlan === 'premium',
      savings: 30,
      originalPrice: 180,
      comingSoon: true // Se activa cuando termine Early Bird
    }
  ];

  const getColorClasses = (color, isSelected = false, isCurrent = false) => {
    const colors = {
      blue: {
        bg: isSelected || isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
        border: isSelected ? 'border-blue-500' : isCurrent ? 'border-blue-300' : 'border-gray-200 dark:border-gray-600',
        icon: 'text-blue-600 dark:text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700',
        text: 'text-blue-600 dark:text-blue-400'
      },
      purple: {
        bg: isSelected || isCurrent ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-white dark:bg-gray-800',
        border: isSelected ? 'border-purple-500' : isCurrent ? 'border-purple-300' : 'border-purple-200 dark:border-purple-600',
        icon: 'text-purple-600 dark:text-purple-400',
        button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
        text: 'text-purple-600 dark:text-purple-400'
      },
      yellow: {
        bg: isSelected || isCurrent ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-gray-800',
        border: isSelected ? 'border-yellow-500' : isCurrent ? 'border-yellow-300' : 'border-gray-200 dark:border-gray-600',
        icon: 'text-yellow-600 dark:text-yellow-400',
        button: 'bg-yellow-600 hover:bg-yellow-700',
        text: 'text-yellow-600 dark:text-yellow-400'
      },
      green: {
        bg: isSelected || isCurrent ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800',
        border: isSelected ? 'border-green-500' : isCurrent ? 'border-green-300' : 'border-gray-200 dark:border-gray-600',
        icon: 'text-green-600 dark:text-green-400',
        button: 'bg-green-600 hover:bg-green-700',
        text: 'text-green-600 dark:text-green-400'
      }
    };
    return colors[color];
  };

  function handleSubscribe(plan) {
    if (!plan) {
      console.error('No plan provided');
      return;
    }
    
    if (plan.id === 'free' || plan.current) {
      return;
    }
    
    const planPrice = Number(plan.price) || 0;
    
    if (planPrice > 0) {
      setCheckoutPlan(plan);
    } else {
      alert('Este plan no requiere pago.');
    }
  }

  const handleCardPayment = () => {
    setShowCheckout(true);
  };

  const handleYapePayment = () => {
    openYapeWhatsApp();
  };

  const openYapeWhatsApp = async () => {
    try {
      if (!checkoutPlan) {
        throw new Error('No checkout plan');
      }
      
      const planPrice = Number(checkoutPlan.price) || 0;
      if (planPrice <= 0) {
        throw new Error('Invalid plan price');
      }
      
      // Obtener el email del usuario en sesión
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '[Tu email aquí]';
      
      const planName = String(checkoutPlan.name || 'Premium');
      const amount = planPrice.toFixed(2);
    
    const message = `🚀 *PAGO REALIZADO - Mis Finanzas*

📋 *Detalles del Pago:*
• Plan: ${planName}
• Monto: S/ ${amount}
• Email: ${userEmail}
• Fecha: ${new Date().toLocaleDateString('es-PE')}
• Hora: ${new Date().toLocaleTimeString('es-PE')}

💳 *He realizado la transferencia:*
📱 YAPE/PLIN al número: 940144418
👤 Titular: José Luis Paredes Herbozo

📸 Adjunto captura de pantalla del comprobante.

⏰ Por favor activar mi cuenta Premium.
¡Gracias!`;

      const whatsappUrl = `https://wa.me/51940144418?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Mostrar mensaje de espera (no éxito)
      setPaymentResult({
        method: 'yape',
        status: 'pending_verification',
        amount: planPrice,
        plan: checkoutPlan,
        userEmail: userEmail
      });
      setShowSuccessModal(true);
      setCheckoutPlan(null);
      
    } catch (error) {
      console.error('Error in openYapeWhatsApp:', error);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
      setCheckoutPlan(null);
    }
  };

  const handlePaymentComplete = (paymentResult) => {
    setShowCheckout(false);
    setCheckoutPlan(null);
    setPaymentResult(paymentResult);
    setShowSuccessModal(true);
    refreshSubscription();
    if (onSuccess) onSuccess(paymentResult);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Planes de Suscripción
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Elige el plan perfecto para gestionar tus finanzas
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan === plan.id}
              onSelect={setSelectedPlan}
              getColorClasses={getColorClasses}
              loading={loading}
              onSubscribe={() => handleSubscribe(plan)}
            />
          ))}
        </div>

        {/* Comparación de características */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Comparación Detallada
          </h3>
          <FeatureComparison />
        </div>
      </div>

      {/* Modal de Selección de Método de Pago */}
      {checkoutPlan && !showCheckout && checkoutPlan.price > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Selecciona método de pago
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {checkoutPlan.name} - S/ {checkoutPlan.price?.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setCheckoutPlan(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Método Yape/Plin */}
                {isYapeEnabled() && (
                <div
                  onClick={handleYapePayment}
                  className="border-2 border-purple-200 hover:border-purple-400 dark:border-purple-800 dark:hover:border-purple-600 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg relative"
                >
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      🔥 MÁS POPULAR
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg">
                      <span className="text-2xl">📱</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Yape / Plin</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Transferencia + WhatsApp</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>⏰ Activación: máximo 1 hora</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        S/ {checkoutPlan.price?.toFixed(2)}
                      </div>
                      <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded">
                        Sin comisiones
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-purple-700 dark:text-purple-300">
                    <p><strong>940144418</strong> - José Luis Paredes Herbozo</p>
                  </div>
                </div>
                )}

                {/* Método Tarjeta */}
                {isCulqiEnabled() && (
                <div
                  onClick={handleCardPayment}
                  className="border-2 border-blue-200 hover:border-blue-400 dark:border-blue-800 dark:hover:border-blue-600 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tarjeta de Crédito/Débito</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Pago inmediato y seguro</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>⚡ Activación: Inmediata</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        S/ {checkoutPlan.price?.toFixed(2)}
                      </div>
                      <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                        Instantáneo
                      </span>
                    </div>
                  </div>
                </div>
                )}

                {/* Mensaje si no hay métodos habilitados */}
                {!hasAnyMethodEnabled() && (
                  <div className="text-center p-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Sin métodos de pago disponibles
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Los métodos de pago están temporalmente deshabilitados.
                      Por favor, contacta con soporte si necesitas realizar un pago.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>🛡️ Todos los métodos de pago son seguros y protegidos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Checkout tradicional (Culqi) */}
      {showCheckout && checkoutPlan && (
        <CulqiCheckout
          plan={checkoutPlan}
          onSuccess={(result) => {
            setShowCheckout(false);
            setCheckoutPlan(null);
            setPaymentResult(result);
            setShowSuccessModal(true);
            refreshSubscription();
            if (onSuccess) onSuccess(result);
          }}
          onCancel={() => {
            setShowCheckout(false);
            setCheckoutPlan(null);
          }}
          onError={(error) => {
            console.error('Payment error:', error);
            alert('Error en el pago: ' + error);
          }}
        />
      )}

      {/* Modal de Confirmación */}
      {showSuccessModal && paymentResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            {paymentResult.method === 'yape' ? (
              // Modal para Yape/Plin - Mensaje de espera
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Hemos recibido tu solicitud de pago vía Yape/Plin.
                </p>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {paymentResult.plan?.name || 'Premium Plan'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Monto: S/ {paymentResult.amount}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Email: {paymentResult.userEmail}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    ⏰ <strong>Tiempo de activación:</strong> Máximo 1 hora
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Si realizaste el pago, el administrador te dará acceso a la brevedad posible.
                  </p>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  📱 WhatsApp enviado con los detalles del pago
                </p>
              </div>
            ) : (
              // Modal para tarjeta - Pago exitoso
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <span className="text-2xl text-green-600">✅</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Pago Exitoso!
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tu suscripción ha sido activada correctamente.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    {paymentResult.plan?.name || 'Premium Plan'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Monto: S/ {paymentResult.amount}
                  </p>
                </div>
                <p className="text-xs text-green-600 font-medium">
                  🎉 ¡Ahora tienes acceso a todas las funciones premium!
                </p>
              </div>
            )}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setPaymentResult(null);
                // Solo navegar para pagos exitosos de tarjeta
                if (paymentResult.method !== 'yape' && onNavigateToExpenses) {
                  onNavigateToExpenses();
                }
              }}
              className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                paymentResult.method === 'yape'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {paymentResult.method === 'yape' ? 'Entendido' : 'Continuar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const PlanCard = ({ plan, selected, onSelect, getColorClasses, loading, onSubscribe }) => {
  const colors = getColorClasses(plan.color, selected, plan.current);

  return (
    <div
      className={`relative rounded-xl border-2 p-6 transition-all duration-300 hover:scale-105 cursor-pointer ${colors.bg} ${colors.border}`}
      onClick={() => onSelect(plan.id)}
    >
      {plan.isEarlyBird && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center space-x-1 animate-pulse">
            <span>⭐ 🔥 EARLY BIRD</span>
          </div>
        </div>
      )}

      {plan.popular && !plan.isEarlyBird && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
            <span>⭐ MÁS POPULAR</span>
          </div>
        </div>
      )}

      {plan.current && (
        <div className="absolute -top-3 right-4">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            ACTUAL
          </div>
        </div>
      )}

      {plan.limitedTime && !plan.current && (
        <div className="absolute -top-3 right-4">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            ⏰ LIMITADO
          </div>
        </div>
      )}

      {plan.comingSoon && (
        <div className="absolute -top-3 right-4">
          <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            PRÓXIMAMENTE
          </div>
        </div>
      )}

      {plan.savings && !plan.limitedTime && (
        <div className="absolute -top-3 right-4">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <span>🎁 AHORRA S/ {plan.savings}</span>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-gray-800 mb-4 ${colors.icon}`}>
          <span className="text-3xl">{plan.icon}</span>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {plan.name}
        </h3>
        
        <div className="mb-4">
          <div className="flex items-baseline justify-center space-x-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              S/ {plan.price}
            </span>
            {plan.period !== 'siempre' && (
              <span className="text-gray-500 dark:text-gray-400">
                /{plan.period}
              </span>
            )}
          </div>
          
          {plan.isEarlyBird && (
            <div className="flex items-center justify-center space-x-2 mt-1">
              <span className="text-lg text-gray-400 line-through">
                S/ {plan.originalPrice}/{plan.period}
              </span>
              <span className="text-sm text-green-600 font-bold">
                -{Math.round((1 - plan.price / plan.originalPrice) * 100)}%
              </span>
            </div>
          )}

          {plan.originalPrice && plan.period === 'año' && !plan.isEarlyBird && (
            <div className="flex items-center justify-center space-x-2 mt-1">
              <span className="text-sm text-gray-400 line-through">
                S/ {plan.originalPrice}/año
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <span className="text-green-500 flex-shrink-0 mt-0.5">✅</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {feature}
            </span>
          </div>
        ))}
      </div>

      {plan.limitations && (
        <div className="space-y-2 mb-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Limitaciones:
          </p>
          {plan.limitations.map((limitation, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mt-1.5"></div>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {limitation}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!plan.comingSoon) {
            onSubscribe();
          }
        }}
        disabled={plan.current || loading || plan.comingSoon}
        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-200 ${
          plan.current
            ? 'bg-gray-400 cursor-not-allowed'
            : plan.comingSoon
            ? 'bg-gray-500 cursor-not-allowed'
            : plan.id === 'free'
            ? 'bg-gray-600 hover:bg-gray-700'
            : `${colors.button}`
        }`}
      >
        {loading ? 'Procesando...' :
         plan.current ? 'Plan Actual' :
         plan.comingSoon ? 'Próximamente' :
         plan.id === 'free' ? 'Gratis' :
         plan.isEarlyBird ? `🔥 Solo S/ ${plan.price}/${plan.period}` :
         `Suscribirse - S/ ${plan.price}`}
      </button>
    </div>
  );
};

const FeatureComparison = () => {
  const features = [
    { name: 'Transacciones mensuales', free: '30', premium: 'Ilimitadas' },
    { name: 'Presupuestos activos', free: '2', premium: 'Ilimitados' },
    { name: 'Categorías personalizadas', free: '3', premium: 'Ilimitadas' },
    { name: 'Histórico de reportes', free: '3 meses', premium: 'Sin límite' },
    { name: 'Multi-moneda', free: 'Solo PEN', premium: 'PEN/USD' },
    { name: 'Exportar datos', free: 'CSV básico', premium: 'Excel completo' },
    { name: 'Importar datos', free: '❌', premium: '✅' },
    { name: 'Análisis avanzados', free: '❌', premium: '✅' },
    { name: 'Gráficos premium', free: '❌', premium: '✅' },
    { name: 'Notificaciones', free: 'Básicas', premium: 'Inteligentes' },
    { name: 'Soporte', free: 'Comunidad', premium: 'Prioritario' }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-600">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
              Característica
            </th>
            <th className="text-center py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
              Gratis
            </th>
            <th className="text-center py-3 px-4 font-semibold text-yellow-600 dark:text-yellow-400">
              Premium
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                {feature.name}
              </td>
              <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                {feature.free}
              </td>
              <td className="py-3 px-4 text-center text-yellow-600 dark:text-yellow-400 font-medium">
                {feature.premium}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubscriptionPlans;