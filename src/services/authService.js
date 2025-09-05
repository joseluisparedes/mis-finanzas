import { supabase } from '../lib/supabase.js';

// Servicio de autenticación con Supabase
class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.listeners = new Set();
    
    // Inicializar estado de autenticación
    this.initializeAuth();
  }

  // Inicializar estado de autenticación
  async initializeAuth() {
    try {
      // Verificar si hay tokens OAuth en la URL
      const hashParams = this.parseHashParams();
      if (hashParams.access_token) {
        console.log('OAuth tokens detected in URL, processing...');
        
        // Procesar tokens OAuth explícitamente
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token
          });
          
          if (error) {
            console.error('Error setting session from URL tokens:', error);
          } else {
            console.log('Session set successfully from URL tokens:', data.user?.email);
          }
        } catch (sessionError) {
          console.error('Error processing OAuth tokens:', sessionError);
        }
        
        // Limpiar la URL de los tokens
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Obtener sesión actual
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return;
      }

      if (session?.user) {
        this.currentUser = session.user;
        this.isAuthenticated = true;
        this.notifyListeners({ type: 'SIGNED_IN', user: session.user });
      }

      // Escuchar cambios de autenticación
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        switch (event) {
          case 'SIGNED_IN':
            this.currentUser = session.user;
            this.isAuthenticated = true;
            this.notifyListeners({ type: 'SIGNED_IN', user: session.user });
            break;
            
          case 'SIGNED_OUT':
            this.currentUser = null;
            this.isAuthenticated = false;
            this.notifyListeners({ type: 'SIGNED_OUT' });
            break;
            
          case 'TOKEN_REFRESHED':
            this.currentUser = session.user;
            this.notifyListeners({ type: 'TOKEN_REFRESHED', user: session.user });
            break;
            
          case 'USER_UPDATED':
            this.currentUser = session.user;
            this.notifyListeners({ type: 'USER_UPDATED', user: session.user });
            break;
        }
      });

    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  // Registrar nuevo usuario
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userData.displayName || email.split('@')[0],
            ...userData
          }
        }
      });

      if (error) {
        console.error('Supabase auth error details:', {
          message: error.message,
          status: error.status,
          statusCode: error.status,
          details: error.details || error.hint || error.code
        });
        throw new Error(this.mapErrorMessage(error.message));
      }

      if (data.user) {
        // El trigger de la BD creará automáticamente las categorías por defecto
        return {
          success: true,
          user: data.user,
          needsConfirmation: !data.session // Si no hay sesión, necesita confirmación por email
        };
      }

      throw new Error('Error desconocido en registro');

    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Iniciar sesión
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(this.mapErrorMessage(error.message));
      }

      if (data.user) {
        return {
          success: true,
          user: data.user,
          session: data.session
        };
      }

      throw new Error('Error desconocido en inicio de sesión');

    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Iniciar sesión con Google
  async signInWithGoogle() {
    try {
      // Determinar URL de redirección basada en el entorno
      let redirectTo;
      
      const currentUrl = window.location.href;
      const currentOrigin = window.location.origin;
      const hostname = window.location.hostname;
      
      console.log('🔍 OAuth Debug - Current URL:', currentUrl);
      console.log('🔍 OAuth Debug - Hostname:', hostname);
      console.log('🔍 OAuth Debug - Origin:', currentOrigin);
      console.log('🔍 OAuth Debug - Hash:', window.location.hash);
      console.log('🔍 OAuth Debug - Search:', window.location.search);
      
      if (hostname === 'joseluisparedes.github.io') {
        // Producción en GitHub Pages
        redirectTo = 'https://joseluisparedes.github.io/mis-finanzas/';
      } else if (hostname === 'appdemisfinanzas.com') {
        // Producción en dominio personalizado
        redirectTo = 'https://appdemisfinanzas.com/';
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Desarrollo local
        redirectTo = currentOrigin + '/';
      } else if (hostname.includes('netlify') || hostname.includes('vercel')) {
        // Otros servicios de hosting
        redirectTo = currentOrigin + '/';
      } else {
        // Fallback: usar la URL actual sin parámetros
        const baseUrl = currentUrl.split('?')[0].split('#')[0];
        redirectTo = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      }
      
      console.log('OAuth Debug - Redirect URL:', redirectTo);
        
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        throw new Error(this.mapErrorMessage(error.message));
      }

      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('Google sign in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cerrar sesión
  async signOut() {
    try {
      // Intentar cerrar sesión normalmente
      const { error } = await supabase.auth.signOut();
      
      // Si hay error pero es por sesión perdida, continuar con limpieza local
      if (error && !error.message.includes('session missing') && !error.message.includes('Auth session missing')) {
        throw new Error(this.mapErrorMessage(error.message));
      }

      // Limpiar estado local independientemente del resultado de Supabase
      this.currentUser = null;
      this.isAuthenticated = false;
      this.notifyListeners({ type: 'SIGNED_OUT' });

      // Limpiar localStorage si existe algún dato de sesión
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('supabase.auth.token') || key.includes('auth-token'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (storageError) {
        console.warn('Error limpiando localStorage:', storageError);
      }

      console.log('Session cleared successfully');
      return { success: true };

    } catch (error) {
      console.error('Sign out error:', error);
      
      // Incluso si hay error, limpiar estado local como fallback
      this.currentUser = null;
      this.isAuthenticated = false;
      this.notifyListeners({ type: 'SIGNED_OUT' });
      
      return {
        success: false,
        error: error.message,
        localCleanup: true // Indica que se hizo limpieza local
      };
    }
  }

  // Limpieza forzada de sesión (método de emergencia)
  forceSignOut() {
    try {
      // Limpiar estado local
      this.currentUser = null;
      this.isAuthenticated = false;
      this.notifyListeners({ type: 'SIGNED_OUT' });

      // Limpiar todo localStorage relacionado con auth
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('supabase.auth') || 
            key.includes('auth-token') ||
            key.includes('access_token') ||
            key.includes('refresh_token')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Force logout: localStorage cleaned');
      } catch (storageError) {
        console.warn('Error en limpieza forzada de localStorage:', storageError);
      }

      // Limpiar cookies relacionadas con auth
      try {
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log('Force logout: cookies cleaned');
      } catch (cookieError) {
        console.warn('Error limpiando cookies:', cookieError);
      }

      // Recargar la página para asegurar limpieza completa
      setTimeout(() => {
        window.location.reload();
      }, 100);

      return { success: true, forced: true };
    } catch (error) {
      console.error('Force sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Recuperar contraseña
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(this.mapErrorMessage(error.message));
      }

      return {
        success: true,
        message: 'Se ha enviado un enlace de recuperación a tu email'
      };

    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar contraseña
  async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(this.mapErrorMessage(error.message));
      }

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };

    } catch (error) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar perfil de usuario
  async updateProfile(updates) {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        throw new Error(this.mapErrorMessage(error.message));
      }

      return {
        success: true,
        message: 'Perfil actualizado exitosamente'
      };

    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.currentUser;
  }

  // Verificar si está autenticado
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  // Obtener ID del usuario actual
  getCurrentUserId() {
    return this.currentUser?.id || null;
  }

  // Obtener email del usuario actual
  getCurrentUserEmail() {
    return this.currentUser?.email || null;
  }

  // Agregar listener para cambios de autenticación
  addAuthListener(callback) {
    this.listeners.add(callback);
    
    // Retornar función para remover el listener
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notificar a todos los listeners
  notifyListeners(authEvent) {
    this.listeners.forEach(callback => {
      try {
        callback(authEvent);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  // Mapear mensajes de error a español
  mapErrorMessage(errorMessage) {
    const errorMap = {
      'Invalid login credentials': 'Credenciales inválidas',
      'User not found': 'Usuario no encontrado',
      'Email not confirmed': 'Email no confirmado. Revisa tu bandeja de entrada.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'Signup is disabled': 'El registro está deshabilitado',
      'Email rate limit exceeded': 'Límite de emails excedido. Intenta más tarde.',
      'User already registered': 'El usuario ya está registrado',
      'Network error': 'Error de conexión',
      'weak password': 'Contraseña muy débil',
      'email already confirmed': 'Email ya confirmado',
      'Database error saving new user': 'Error en la base de datos. Verifica la configuración del trigger.',
      'relation "user_settings" does not exist': 'Tabla user_settings no existe. Ejecuta el script de configuración.',
      'relation "categories" does not exist': 'Tabla categories no existe. Ejecuta el script de configuración.'
    };

    // Si el mensaje contiene "Database error", revisar si es problema de tablas
    if (errorMessage && errorMessage.includes('Database error')) {
      return 'Error en la base de datos. Es posible que el trigger no esté configurado correctamente. Revisa la consola para más detalles.';
    }

    return errorMap[errorMessage] || errorMessage || 'Error desconocido';
  }

  // Verificar si Supabase está configurado
  isSupabaseConfigured() {
    try {
      return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    } catch {
      return false;
    }
  }

  // Parsear parámetros del hash de la URL Y query parameters
  parseHashParams() {
    const hash = window.location.hash.substring(1);
    const search = window.location.search.substring(1);
    const params = {};
    
    // Parsear hash parameters
    if (hash) {
      hash.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
    
    // Parsear query parameters también
    if (search) {
      search.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
    
    console.log('🔍 Parsed params from hash and search:', params);
    return params;
  }

  // Método para desarrollo: crear usuario de prueba
  async createTestUser() {
    if (import.meta.env.NODE_ENV !== 'development') {
      console.warn('createTestUser solo disponible en desarrollo');
      return { success: false, error: 'Solo disponible en desarrollo' };
    }

    const testEmail = 'test@example.com';
    const testPassword = 'test123456';

    return await this.signUp(testEmail, testPassword, {
      displayName: 'Usuario de Prueba'
    });
  }
}

// Instancia singleton
const authService = new AuthService();

export default authService;