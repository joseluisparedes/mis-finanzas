import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase no configurado - usando modo offline');
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'mis-finanzas@2.1.0'
    }
  }
});

// Función para verificar conexión
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    return { connected: !error, error };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

// Estados de conexión
export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  LOADING: 'loading'
};

// Helper para manejar errores de Supabase
export const handleSupabaseError = (error) => {
  if (!error) return null;
  
  console.error('Supabase Error:', error);
  
  // Mapear errores comunes
  const errorMap = {
    'Invalid login credentials': 'Credenciales inválidas',
    'User not found': 'Usuario no encontrado',
    'Email not confirmed': 'Email no confirmado',
    'Network error': 'Error de conexión',
  };
  
  return {
    message: errorMap[error.message] || error.message || 'Error desconocido',
    code: error.code,
    details: error.details
  };
};

export default supabase;