import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  Smartphone, 
  Shield, 
  DollarSign,
  Check,
  X,
  Star,
  ChevronRight,
  Menu,
  Clock,
  Users,
  Zap,
  ArrowRight,
  Play,
  PiggyBank,
  CreditCard,
  Globe,
  Award,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AuthModal from '../auth/AuthModal';
import authService from '../../services/authService';

const LandingPage = ({ onNavigateToApp, onNavigateToLogin, onOpenLoginModal, onCloseModal, autoOpenLogin = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [earlyBirdCount, setEarlyBirdCount] = useState(42); // Simulated counter
  const [authModalOpen, setAuthModalOpen] = useState(autoOpenLogin);
  const [loading, setLoading] = useState(false);
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);

  // Watch for autoOpenLogin changes and open modal when navigating (only once)
  useEffect(() => {
    if (autoOpenLogin && !autoOpenHandled) {
      setAuthModalOpen(true);
      setAutoOpenHandled(true);
    }
  }, [autoOpenLogin, autoOpenHandled]);

  // Countdown timer for Early Bird offer
  const [timeLeft, setTimeLeft] = useState({
    days: 15,
    hours: 8,
    minutes: 42,
    seconds: 15
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Authentication functions
  const handleSignIn = async (email, password) => {
    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      if (result.success) {
        onNavigateToApp(); // Navigate to app after successful login
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email, password, metadata) => {
    try {
      setLoading(true);
      const result = await authService.signUp(email, password, metadata);
      if (result.success) {
        onNavigateToApp(); // Navigate to app after successful registration
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await authService.signInWithGoogle();
      if (result.success) {
        // Google auth redirects, so we don't need to navigate here
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <BarChart3 className="w-10 h-10" />,
      title: "Reportes Avanzados",
      description: "Dashboard con gráficos interactivos, tendencias y análisis predictivos de tus patrones de gasto",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: <Globe className="w-10 h-10" />,
      title: "Multi-moneda Premium",
      description: "Maneja PEN y USD simultáneamente con conversión en tiempo real y tipo de cambio configurable",
      color: "from-emerald-500 to-green-500",
      bgColor: "bg-emerald-50"
    },
    {
      icon: <Zap className="w-10 h-10" />,
      title: "Automatización Total",
      description: "Transacciones recurrentes inteligentes que se ajustan a tu estilo de vida financiero",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50"
    },
    {
      icon: <Target className="w-10 h-10" />,
      title: "IA Financiera",
      description: "Presupuestos con machine learning que aprenden de tus hábitos y te alertan proactivamente",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50"
    },
    {
      icon: <Smartphone className="w-10 h-10" />,
      title: "Nativo Móvil",
      description: "Diseñado desde cero para móviles peruanos con sincronización instantánea cross-device",
      color: "from-indigo-500 to-blue-500",
      bgColor: "bg-indigo-50"
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: "Seguridad Bancaria",
      description: "Encriptación nivel bancario con backup automático y protección contra pérdida de datos",
      color: "from-gray-600 to-gray-800",
      bgColor: "bg-gray-50"
    }
  ];

  const testimonials = [
    {
      name: "María Elena González",
      role: "Contadora • Lima",
      content: "🎆 Después de 3 meses usando MisFinanzas, por primera vez en mi vida sé exactamente en qué gasto cada sol. Los gráficos son adicciones, no puedo parar de revisarlos.",
      rating: 5,
      avatar: "bg-gradient-to-br from-pink-400 to-purple-600",
      savings: "Ahorro S/ 350 más por mes"
    },
    {
      name: "Carlos Mendoza Riva",
      role: "Ingeniero • Arequipa",
      content: "💪 La función de presupuestos + alertas me salvó literalmente. Este mes iba a pasarme S/ 500 en delivery, la app me alertó cuando llevaba S/ 200. Game changer total.",
      rating: 5,
      avatar: "bg-gradient-to-br from-blue-400 to-indigo-600",
      savings: "Evitó gastar S/ 300 de más"
    },
    {
      name: "Ana Lucia Torres",
      role: "Estudiante PUCP • Lima",
      content: "🎓 Perfecto para estudiantes como yo. El plan gratis me tiene cubierta completamente, pero ya estoy tentada al Premium por los reportes avanzados. La app más útil que he probado.",
      rating: 5,
      avatar: "bg-gradient-to-br from-green-400 to-emerald-600",
      savings: "Organizó S/ 800 mensuales"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <TrendingUp className="w-8 h-8 text-blue-600 transform rotate-12" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <DollarSign className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  MisFinanzas
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Características
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Precios
                </a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Testimonios
                </a>
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Iniciar Sesión
                </button>
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Probar Gratis
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
                <a href="#features" className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">
                  Características
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">
                  Precios
                </a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">
                  Testimonios
                </a>
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                >
                  Iniciar Sesión
                </button>
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                >
                  Probar Gratis
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20 pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10"></div>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-full backdrop-blur-sm mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-white/90 text-sm font-medium">Más de 500+ usuarios ya confían en nosotros</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-tight">
              Domina tus{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                finanzas
              </span>
              <br className="hidden sm:block" />
              como un{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">experto</span>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed">
              🇵🇪 La plataforma financiera peruana que transforma tu relación con el dinero. 
              <span className="text-emerald-400 font-semibold">Reportes avanzados, multi-moneda y presupuestos inteligentes</span> 
              en una sola app.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="group relative bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/25"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity"></div>
                <span className="relative flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 mr-3" />
                  Comenzar GRATIS
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              
              <button className="group border-2 border-white/30 text-white hover:bg-white/10 px-10 py-5 rounded-2xl text-xl font-bold transition-all backdrop-blur-sm hover:border-white/50">
                <span className="flex items-center justify-center">
                  <Play className="w-6 h-6 mr-3" />
                  Ver Demo
                </span>
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-white/60">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" />
                <span className="text-sm">100% Gratis para empezar</span>
              </div>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-400 mr-2" />
                <span className="text-sm">Datos encriptados</span>
              </div>
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-purple-400 mr-2" />
                <span className="text-sm">Hecho en Perú 🇵🇪</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Early Bird Offer Banner */}
      <section className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-2 left-10 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
          <div className="absolute top-4 right-20 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute bottom-3 left-1/4 w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="flex items-center space-x-6 mb-6 lg:mb-0">
              <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-2xl shadow-xl">
                <Award className="w-8 h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <div className="font-black text-xl md:text-2xl mb-1 flex items-center">
                  🔥 OFERTA FUNDADORES
                  <span className="ml-3 px-3 py-1 bg-red-500 text-xs font-bold rounded-full animate-pulse">LIMITADA</span>
                </div>
                <div className="text-sm md:text-base text-white/90 font-medium">
                  <span className="line-through text-white/60">S/ 15/mes</span> → 
                  <span className="text-yellow-300 font-black text-lg">S/ 5/mes</span> + 
                  Badge exclusivo "Fundador" 👑
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="text-center bg-black/30 px-6 py-3 rounded-xl backdrop-blur-sm">
                <div className="text-xs text-white/70 uppercase tracking-wide font-semibold">Solo quedan</div>
                <div className="font-black text-2xl text-yellow-300">{50 - earlyBirdCount}</div>
                <div className="text-xs text-white/70 uppercase tracking-wide">spots</div>
              </div>
              
              <div className="flex items-center space-x-3 bg-black/30 px-6 py-3 rounded-xl backdrop-blur-sm">
                <Clock className="w-5 h-5 text-orange-300 animate-pulse" />
                <div className="text-center">
                  <div className="text-xs text-white/70 uppercase tracking-wide font-semibold mb-1">Termina en</div>
                  <div className="flex space-x-2 text-lg font-mono font-bold">
                    <div className="bg-white/20 px-2 py-1 rounded">{timeLeft.days.toString().padStart(2, '0')}<span className="text-xs block text-white/60">días</span></div>
                    <div className="bg-white/20 px-2 py-1 rounded">{timeLeft.hours.toString().padStart(2, '0')}<span className="text-xs block text-white/60">hrs</span></div>
                    <div className="bg-white/20 px-2 py-1 rounded">{timeLeft.minutes.toString().padStart(2, '0')}<span className="text-xs block text-white/60">min</span></div>
                  </div>
                </div>
              </div>
              
              <button className="group bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black px-8 py-4 rounded-xl font-black text-lg transition-all transform hover:scale-105 hover:shadow-2xl">
                <span className="flex items-center">
                  🚀 ASEGURAR PRECIO
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem-Solution Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-red-100 text-red-700 rounded-full mb-6">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="font-semibold">El 78% de peruanos no controla sus gastos</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              ¿Te suena familiar?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">"No sé en qué gasto"</h3>
                <p className="text-gray-600 text-sm">Facturas, transferencias, efectivo... Todo se pierde en el caos diario</p>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <TrendingDown className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">"Nunca me alcanza"</h3>
                <p className="text-gray-600 text-sm">Fin de mes con stress, sin saber por qué se fue todo el dinero</p>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <CreditCard className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">"Excel me complica"</h3>
                <p className="text-gray-600 text-sm">Intentaste planillas, apps raras, pero nada funciona realmente</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white p-2 rounded-2xl inline-block mb-6">
              <div className="bg-black/20 px-8 py-6 rounded-xl">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">MisFinanzas lo resuelve TODO</h3>
                <p className="text-lg text-white/90">La única app peruana que realmente entiende cómo manejas tu plata</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              🚀 Tecnología que{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                revoluciona
              </span>
              <br />tus finanzas personales
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Cada funcionalidad fue diseñada pensando en los desafíos económicos reales de los peruanos.
              <strong className="text-blue-600"> Esto es lo que te hace la vida más fácil:</strong>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div key={index} className={`group relative ${feature.bgColor} p-8 rounded-3xl border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity rounded-3xl"></div>
                <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${feature.color} text-white rounded-2xl mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                <div className="mt-6 flex items-center text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm">Descubre más</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Stats Section */}
          <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-3xl p-12 text-center text-white">
            <h3 className="text-3xl font-bold mb-8">Resultados reales de nuestros usuarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-4xl font-bold text-emerald-400 mb-2">87%</div>
                <div className="text-white/80">Ahorran más dinero cada mes</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">65%</div>
                <div className="text-white/80">Reducen gastos innecesarios</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-400 mb-2">92%</div>
                <div className="text-white/80">Se sienten más tranquilos</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-slate-900 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-indigo-500/5"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-full backdrop-blur-sm mb-8">
              <PiggyBank className="w-5 h-5 text-emerald-400 mr-2" />
              <span className="text-white font-semibold">Pricing transparent, sin letra pequeña</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Elige tu{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                super poder
              </span>
              <br />financiero
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comienza gratis y descubre por qué miles ya eligieron el Premium.
              <span className="text-emerald-400 font-semibold"> Zero compromisos, máximo control.</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-10 relative hover:bg-white/15 transition-all duration-300">
              <div className="absolute top-6 right-6 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold">
                GRATIS
              </div>
              <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-white mb-3">Plan Free</h3>
                <p className="text-gray-300 mb-6 text-lg">Perfecto para dar el primer paso</p>
                <div className="relative">
                  <div className="text-6xl font-black text-white mb-2">$0</div>
                  <div className="text-emerald-400 font-semibold text-lg">gratis para siempre ✨</div>
                </div>
              </div>
              
              <ul className="space-y-5 mb-10">
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">30 transacciones por mes</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">2 presupuestos activos</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">Reportes últimos 3 meses</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">Solo moneda PEN (Soles)</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-500/60 rounded-full flex items-center justify-center mr-4">
                    <X className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-400 text-lg">Sin exportar Excel</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="w-full bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-xl"
              >
                🚀 Comenzar Gratis Ahora
              </button>
              <p className="text-center text-gray-400 text-sm mt-4">Sin tarjeta • Sin compromisos</p>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-3xl border-2 border-purple-400/50 p-10 relative hover:border-purple-400/70 transition-all duration-300 shadow-2xl shadow-purple-500/20">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full text-sm font-black shadow-xl animate-pulse">
                🔥 MÁS POPULAR 🔥
              </div>
              
              <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-white mb-3">Plan Premium</h3>
                <p className="text-gray-300 mb-6 text-lg">Desata todo el poder financiero</p>
                <div className="relative mb-4">
                  <div className="flex items-center justify-center space-x-4 mb-2">
                    <span className="text-3xl font-bold text-gray-400 line-through">S/ 15</span>
                    <div className="text-6xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text">S/ 5</div>
                  </div>
                  <div className="text-yellow-300 font-bold text-lg animate-bounce">precio fundador (solo 50 cupos) 👑</div>
                </div>
                <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-full">
                  <span className="text-green-300 font-semibold text-sm">SE MANTIENE PARA SIEMPRE</span>
                </div>
              </div>
              
              <ul className="space-y-5 mb-10">
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">♾️ Transacciones ILIMITADAS</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">🎯 Presupuestos ILIMITADOS + IA</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">📈 Histórico COMPLETO (sin límites)</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">🌍 Multi-moneda PEN/USD avanzado</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">📊 Exportar Excel profesional</span>
                </li>
                <li className="flex items-start group">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium text-lg">🚑 Soporte WhatsApp prioritario</span>
                </li>
              </ul>
              
              <button className="group w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-5 px-8 rounded-2xl font-black text-xl transition-all transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center justify-center">
                  🚀 ASEGURAR MI PRECIO FUNDADOR
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                </span>
              </button>
              <p className="text-center text-gray-300 text-sm mt-4">Precio se mantiene para siempre • Cancela cuando quieras</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Testimonials */}
      <section id="testimonials" className="py-24 bg-gradient-to-b from-white to-blue-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-10 right-20 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-20 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-green-100 border border-green-200 rounded-full mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-semibold">Más de 500+ peruanos ya transformaron sus finanzas</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Historias reales de 
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                transformación
              </span>
              <br />financiera 🇵🇪
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Estos son testimonios reales de usuarios que tomaron control de sus finanzas con MisFinanzas.
              <strong className="text-blue-600"> Tu historia podría ser la siguiente.</strong>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:-translate-y-2 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-t-3xl"></div>
                
                <div className="flex items-center mb-6">
                  <div className={`w-16 h-16 ${testimonial.avatar} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg mr-4`}>
                    {testimonial.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                    <div className="text-gray-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
                
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-2 text-sm text-gray-600 font-semibold">5.0</span>
                </div>
                
                <blockquote className="text-gray-700 mb-6 italic text-lg leading-relaxed font-medium">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-100">
                  <div className="text-sm text-green-700 font-semibold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {testimonial.savings}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Trust Indicators */}
          <div className="bg-gray-900 rounded-3xl p-12 text-center">
            <h3 className="text-3xl font-bold text-white mb-8">¿Aún tienes dudas? 🤔</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">100% Seguro</h4>
                <p className="text-gray-400 text-sm">Encriptación nivel bancario. Tus datos están más seguros que en tu banco.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">Soporte Real</h4>
                <p className="text-gray-400 text-sm">Equipo peruano que responde en español. Soporte humano, no bots.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <PiggyBank className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">Sin Riesgos</h4>
                <p className="text-gray-400 text-sm">Plan gratis para siempre. Premium sin permanencia. Cancela cuando quieras.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5"></div>
        </div>
        
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '3s'}}></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-400/30 rounded-full backdrop-blur-sm mb-8">
            <Sparkles className="w-5 h-5 text-yellow-400 mr-2 animate-pulse" />
            <span className="text-white font-semibold">Tu transformación financiera empieza HOY</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            ¿Estás listo para ser el
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              dueño de tu dinero
            </span>?
          </h2>
          
          <p className="text-2xl mb-4 text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Miles de peruanos ya tomaron control total de sus finanzas.
          </p>
          
          <p className="text-xl mb-12 text-emerald-400 font-semibold max-w-3xl mx-auto">
            La pregunta no es SI puedes, sino ¿CUÁNDO vas a empezar?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="group bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white px-12 py-6 rounded-2xl text-2xl font-black transition-all transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/25 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity"></div>
              <span className="relative flex items-center">
                🚀 SÍ, QUIERO EMPEZAR GRATIS
                <ArrowRight className="w-8 h-8 ml-4 group-hover:translate-x-2 transition-transform" />
              </span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center text-white/80">
              <CheckCircle className="w-6 h-6 text-emerald-400 mr-3" />
              <span className="font-semibold">Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center justify-center text-white/80">
              <CheckCircle className="w-6 h-6 text-emerald-400 mr-3" />
              <span className="font-semibold">Gratis para siempre</span>
            </div>
            <div className="flex items-center justify-center text-white/80">
              <CheckCircle className="w-6 h-6 text-emerald-400 mr-3" />
              <span className="font-semibold">Cancela cuando quieras</span>
            </div>
          </div>
          
          <div className="mt-12 p-8 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 max-w-2xl mx-auto">
            <p className="text-lg text-white/90 mb-4">
              <strong className="text-yellow-400">⚠️ Última advertencia:</strong>
            </p>
            <p className="text-white/80">
              Cada día que pasa sin control de tus finanzas es dinero que se escapa de tus manos.
              <span className="text-emerald-400 font-semibold"> No dejes que el 2025 sea otro año igual.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                <span className="text-xl font-bold text-white">MisFinanzas</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                La aplicación financiera más completa del Perú. Gestiona tu dinero de forma inteligente y segura.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Producto</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p>&copy; 2025 MisFinanzas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
        loading={loading}
      />
    </div>
  );
};

export default LandingPage;