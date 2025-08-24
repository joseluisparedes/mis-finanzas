import React from 'react';
import { X, AlertCircle, ExternalLink, Crown } from 'lucide-react';

const ErrorMessage = ({ message, onClose, autoClose = true }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // Auto close después de 5 segundos para errores normales
  React.useEffect(() => {
    if (autoClose && !isUpgradeError(message)) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [message, autoClose]);

  const isUpgradeError = (msg) => {
    const upgradeKeywords = [
      'límite',
      'plan',
      'upgrade',
      'premium',
      'suscripción',
      'alcanzado'
    ];
    return upgradeKeywords.some(keyword => 
      msg.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleUpgrade = () => {
    // Abrir en nueva pestaña la página de upgrade
    window.open('https://misfinanzas.app/upgrade', '_blank');
  };

  if (!isVisible || !message) return null;

  const showUpgradeButton = isUpgradeError(message);

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`max-w-md rounded-lg shadow-lg border-l-4 p-4 ${
        showUpgradeButton 
          ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-500' 
          : 'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-500'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {showUpgradeButton ? (
              <Crown className="h-5 w-5 text-amber-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${
              showUpgradeButton 
                ? 'text-amber-800 dark:text-amber-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {showUpgradeButton ? '¡Upgrade requerido!' : 'Error'}
            </h3>
            <p className={`mt-1 text-sm ${
              showUpgradeButton 
                ? 'text-amber-700 dark:text-amber-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              {message}
            </p>
            
            {showUpgradeButton && (
              <div className="mt-3">
                <button
                  onClick={handleUpgrade}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-md hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade a Premium
                  <ExternalLink className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
          </div>
          
          <div className="ml-auto pl-3">
            <button
              onClick={handleClose}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                showUpgradeButton
                  ? 'text-amber-400 hover:bg-amber-100 focus:ring-amber-500 dark:hover:bg-amber-800'
                  : 'text-red-400 hover:bg-red-100 focus:ring-red-500 dark:hover:bg-red-800'
              }`}
            >
              <span className="sr-only">Cerrar</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;