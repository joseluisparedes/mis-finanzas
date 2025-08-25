import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, CheckCircle, Loader, Share, Plus } from 'lucide-react';

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showIOSHelper, setShowIOSHelper] = useState(false);

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
    setIsInstalling(true);

    if (isIOS) {
      // Para iOS, mostrar helper visual automáticamente
      setShowIOSHelper(true);
      setIsInstalling(false);
      return;
    }

    if (!deferredPrompt) {
      // Intentar detectar el navegador y mostrar ayuda específica
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('firefox')) {
        // Firefox: Intentar mostrar ayuda visual
        setShowInstallPrompt(true);
        setTimeout(() => {
          setIsInstalling(false);
        }, 1000);
      } else if (userAgent.includes('edge') || userAgent.includes('chrome')) {
        // Chrome/Edge: Mostrar indicación visual hacia la barra de direcciones
        showAddressBarHint();
        setIsInstalling(false);
      } else {
        // Otros navegadores
        setShowInstallPrompt(true);
        setTimeout(() => {
          setIsInstalling(false);
        }, 1000);
      }
      return;
    }

    try {
      // Mostrar el prompt nativo
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
  };

  const showAddressBarHint = () => {
    // Crear indicador visual hacia la barra de direcciones
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #8B5CF6, #3B82F6);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: bounceIn 0.5s ease-out;
    `;
    hint.innerHTML = '⬆️ Busca el ícono ⊞ aquí arriba';
    
    // Añadir animación CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounceIn {
        0% { transform: scale(0.3) translateY(-20px); opacity: 0; }
        50% { transform: scale(1.05) translateY(-10px); }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(hint);
    
    // Remover después de 5 segundos
    setTimeout(() => {
      hint.remove();
      style.remove();
    }, 5000);
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

      {/* Helper visual iOS mejorado */}
      {showIOSHelper && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm transform transition-transform duration-500 animate-slide-up">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Share className="text-white animate-bounce" size={36} />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                ¡Casi listo!
              </h3>
              
              <p className="text-gray-600 mb-6">
                Toca el botón <strong>Compartir</strong> en la parte inferior de Safari
              </p>
              
              {/* Indicador visual animado */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Share className="text-blue-600" size={24} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                </div>
              </div>
              
              <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Busca <strong>"Añadir a pantalla de inicio"</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Toca <strong>"Añadir"</strong> para confirmar</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowIOSHelper(false)}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
              >
                ¡Perfecto!
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

      {/* Botón mejorado con estados visuales */}
      {!showInstallPrompt && (
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