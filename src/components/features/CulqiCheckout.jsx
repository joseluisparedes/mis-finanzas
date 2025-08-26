import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CulqiCheckout = ({ plan, onSuccess, onCancel, onError }) => {
  const [loading, setLoading] = useState(false);
  const [culqiLoaded, setCulqiLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: ''
  });

  useEffect(() => {
    // Cargar Culqi JS v3 (más estable que v4)
    const script = document.createElement('script');
    script.src = 'https://checkout.culqi.com/js/v3';
    script.onload = () => {
      if (window.Culqi) {
        window.Culqi.publicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY;
        setCulqiLoaded(true);
        console.log('Culqi v3 inicializado:', {
          publicKey: import.meta.env.VITE_CULQI_PUBLIC_KEY,
          ready: true
        });
      }
    };
    script.onerror = () => {
      console.error('Error cargando Culqi');
      onError('Error cargando el sistema de pagos');
    };
    document.head.appendChild(script);

    return () => {
      const scriptElement = document.querySelector('script[src="https://checkout.culqi.com/js/v3"]');
      if (scriptElement) {
        document.head.removeChild(scriptElement);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!culqiLoaded || !window.Culqi) {
      onError('El sistema de pagos aún no ha cargado');
      return;
    }

    setLoading(true);

    try {
      // Validar que todos los datos estén presentes
      const cardNumber = formData.cardNumber.replace(/\s+/g, '');
      const cvv = formData.cvv;
      const month = formData.expirationMonth;
      const year = formData.expirationYear;
      const email = formData.email;

      console.log('Validando datos antes de enviar:', {
        cardNumber: cardNumber,
        cvv: cvv,
        month: month,
        year: year,
        email: email,
        cardNumberLength: cardNumber.length,
        cvvLength: cvv.length,
        monthLength: month.length,
        yearLength: year.length,
        emailLength: email.length
      });

      if (!cardNumber || !cvv || !month || !year || !email) {
        throw new Error('Todos los campos de la tarjeta son requeridos');
      }

      // Configurar callback global para Culqi v3
      window.culqi = function() {
        if (window.Culqi.token) {
          console.log('Token generado:', window.Culqi.token.id);
          processPayment(window.Culqi.token.id);
        } else {
          console.error('Error Culqi:', window.Culqi.error);
          onError(window.Culqi.error.user_message || 'Error al procesar la tarjeta');
          setLoading(false);
        }
      };

      // Culqi v3 espera un objeto, no parámetros separados
      const tokenData = {
        card_number: cardNumber,
        cvv: cvv,
        expiration_month: month,
        expiration_year: year,
        email: email
      };

      console.log('Llamando Culqi.createToken con objeto:', tokenData);

      // Crear token con Culqi v3 usando objeto
      window.Culqi.createToken(tokenData);

    } catch (error) {
      console.error('Error en el checkout:', error);
      onError(error.message || 'Error inesperado al procesar el pago');
      setLoading(false);
    }
  };

  const processPayment = async (tokenId) => {
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const paymentData = {
        token_id: tokenId,
        plan_id: plan.id,
        amount: plan.price * 100, // Culqi maneja centavos
        currency_code: plan.currency,
        customer: {
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName
        },
        description: `Suscripción ${plan.name} - MisFinanzas`,
        user_id: user.id
      };

      // Llamar a la Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('culqi-payment-webhook', {
        body: paymentData
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        onSuccess({
          plan: plan,
          token: tokenId,
          amount: plan.price,
          charge_id: data.charge_id
        });
      } else {
        throw new Error(data.error || 'Error en el procesamiento del pago');
      }

    } catch (error) {
      console.error('Error completo procesando pago:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      onError(`Error en el pago: ${error.message || 'Error inesperado al procesar el pago'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      cardNumber: formatted
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Checkout Seguro
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {plan.name} - S/ {plan.price}/{plan.period}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seguridad Badge */}
        <div className="px-6 pt-4">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">
              Pago seguro procesado por Culqi
            </span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Datos del cliente */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Información Personal
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="tu@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombres
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Apellidos
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Información de tarjeta */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Información de Tarjeta</span>
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número de Tarjeta
              </label>
              <input
                type="text"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                maxLength="19"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="1234 5678 9012 3456"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mes
                </label>
                <select
                  name="expirationMonth"
                  value={formData.expirationMonth}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">MM</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month.toString().padStart(2, '0')}>
                      {month.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Año
                </label>
                <select
                  name="expirationYear"
                  value={formData.expirationYear}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">YYYY</option>
                  {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  maxLength="4"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123"
                />
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-white">Total a pagar:</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                S/ {plan.price}
              </span>
            </div>
            {plan.savings && (
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                Ahorras S/ {plan.savings} al elegir el plan anual
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !culqiLoaded}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pagar S/ {plan.price}</span>
                </>
              )}
            </button>
          </div>

          {/* Status de carga de Culqi */}
          {!culqiLoaded && (
            <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-sm">Cargando sistema de pagos...</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CulqiCheckout;