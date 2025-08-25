import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, CheckCircle, Loader, Share, Plus } from 'lucide-react';

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalado
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;
    setIsInstalled(isAppInstalled);

    // Escuchar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    // Escuchar evento appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    setIsInstalling(true);

    // Si hay prompt disponible, usarlo
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
          }, 2000);
        } else {
          setIsInstalling(false);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error installing PWA:', error);
        setIsInstalling(false);
      }
    } else {
      // Si no hay prompt, mostrar el popup flotante
      setShowInstallPrompt(true);
      setIsInstalling(false);
    }
  };


  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  // No mostrar si ya está instalado
  if (isInstalled) return null;

  return (
    <>
      {/* Botón flotante */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-xl shadow-2xl max-w-sm animate-bounce">
            <button
              onClick={dismissPrompt}
              className="absolute -top-2 -right-2 bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-gray-700"
            >
              <X size={12} />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Download size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">¡Instala MisFinanzas!</h3>
                <p className="text-xs opacity-90">Acceso rápido desde tu escritorio</p>
              </div>
            </div>
            
            <button
              onClick={handleInstallClick}
              className="w-full mt-3 bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
            >
              Instalar App
            </button>
          </div>
        </div>
      )}


      {/* Modal de éxito */}
      {installSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center transform animate-bounce">
            <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="text-green-600 animate-pulse" size={40} />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Instalado!
            </h3>
            
            <p className="text-gray-600">
              MisFinanzas ya está en tu dispositivo
            </p>
          </div>
        </div>
      )}

      {/* Botón siempre visible cuando la app no está instalada */}
      {!isInstalled && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling || installSuccess}
          className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            installSuccess 
              ? 'bg-green-500 text-white cursor-default'
              : isInstalling
                ? 'bg-gray-400 text-white cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
          }`}
        >
          {installSuccess ? (
            <>
              <CheckCircle size={16} className="animate-pulse" />
              <span className="hidden sm:inline">¡Instalado!</span>
              <span className="sm:hidden">✓</span>
            </>
          ) : isInstalling ? (
            <>
              <Loader size={16} className="animate-spin" />
              <span className="hidden sm:inline">Instalando...</span>
              <span className="sm:hidden">⏳</span>
            </>
          ) : (
            <>
              <Download size={16} className="animate-pulse" />
              <span className="hidden sm:inline">Instalar App</span>
              <span className="sm:hidden">📱</span>
            </>
          )}
        </button>
      )}
    </>
  );
};

export default InstallPWAButton;