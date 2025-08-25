import { useState, useEffect } from 'react';
import { Download, X, CheckCircle } from 'lucide-react';

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Detección SIMPLE y confiable de instalación
    const checkIfInstalled = () => {
      // Solo verificar métodos 100% confiables
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isMarkedAsInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      return isStandalone || isIOSStandalone || isMarkedAsInstalled;
    };

    const isAppInstalled = checkIfInstalled();
    setIsInstalled(isAppInstalled);

    // Si ya está instalado, no mostrar nada
    if (isAppInstalled) {
      return;
    }

    // MOSTRAR POPUP INMEDIATAMENTE si no está instalado
    setShowInstallPrompt(true);

    // Escuchar evento beforeinstallprompt para tener el prompt nativo
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // El popup ya está visible, solo guardamos el prompt
    };

    // Escuchar evento appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      // Marcar como instalado en localStorage
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);



  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  // Función para marcar como instalado cuando el usuario dice que ya lo instaló
  const markAsInstalled = () => {
    localStorage.setItem('pwa-installed', 'true');
    setIsInstalled(true);
    setShowInstallPrompt(false);
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
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={async () => {
                  // LÓGICA de instalación
                  if (deferredPrompt) {
                    try {
                      await deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      
                      if (outcome === 'accepted') {
                        setInstallSuccess(true);
                        setShowInstallPrompt(false);
                        localStorage.setItem('pwa-installed', 'true');
                        setTimeout(() => {
                          setIsInstalled(true);
                        }, 2000);
                      }
                      
                      setDeferredPrompt(null);
                    } catch (error) {
                      console.error('Error installing PWA:', error);
                    }
                  }
                }}
                className="flex-1 bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
              >
                Instalar App
              </button>
              
              <button
                onClick={markAsInstalled}
                className="flex-shrink-0 bg-white/10 hover:bg-white/20 py-2 px-3 rounded-lg text-xs transition-colors"
                title="Ya la instalé"
              >
                ✓ Ya instalé
              </button>
            </div>
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

      {/* El popup flotante es el ÚNICO botón que funciona */}
    </>
  );
};

export default InstallPWAButton;