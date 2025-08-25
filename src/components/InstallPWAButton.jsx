import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detectar si es iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

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
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Mostrar instrucciones manuales si no hay prompt automático
      alert(
        'Para instalar la app:\n\n' +
        '• Chrome/Edge: Busca el ícono ⊞ en la barra de direcciones\n' +
        '• Firefox: Menú → "Instalar esta aplicación"\n' +
        '• Safari: Botón Compartir → "Añadir a pantalla de inicio"'
      );
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
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
              {isIOS ? 'Ver instrucciones' : 'Instalar App'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de instrucciones iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Smartphone className="text-blue-600" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Instalar en iOS
              </h3>
              
              <div className="text-left space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Toca el botón <strong>Compartir</strong> 📤 en Safari</span>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Selecciona <strong>"Añadir a pantalla de inicio"</strong></span>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Confirma tocando <strong>"Añadir"</strong></span>
                </div>
              </div>
              
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón en el header/menu si no se ha mostrado el prompt */}
      {!showInstallPrompt && (
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}
    </>
  );
};

export default InstallPWAButton;