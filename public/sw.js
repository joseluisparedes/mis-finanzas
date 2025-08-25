// MisFinanzas - Service Worker
// Versión: 1.0.0

const CACHE_NAME = 'misfinanzas-v1.0.0';
const STATIC_CACHE_NAME = 'misfinanzas-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'misfinanzas-dynamic-v1.0.0';

// Recursos estáticos para cachear durante la instalación
const STATIC_RESOURCES = [
  '/mis-finanzas/',
  '/mis-finanzas/index.html',
  '/mis-finanzas/manifest.json',
  '/mis-finanzas/icons/icon-192x192.svg',
  '/mis-finanzas/icons/icon-512x512.svg',
  '/mis-finanzas/icons/favicon.svg'
];

// Recursos dinámicos importantes
const IMPORTANT_ROUTES = [
  '/mis-finanzas/#balance',
  '/mis-finanzas/#gastos', 
  '/mis-finanzas/#ingresos',
  '/mis-finanzas/#reportes'
];

// URLs que NO deben cachearse
const EXCLUDE_FROM_CACHE = [
  '/mis-finanzas/health-check',
  'chrome-extension://',
  'extension://',
  'analytics',
  'gtag'
];

// ============================================================================
// INSTALACIÓN DEL SERVICE WORKER
// ============================================================================
self.addEventListener('install', event => {
  console.log('🚀 Service Worker: Instalando...');
  
  event.waitUntil(
    Promise.all([
      // Cache estático
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('📦 Service Worker: Cacheando recursos estáticos...');
        return cache.addAll(STATIC_RESOURCES);
      }),
      
      // Pre-cache de rutas importantes
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        console.log('🎯 Service Worker: Pre-cacheando rutas importantes...');
        return Promise.allSettled(
          IMPORTANT_ROUTES.map(route => 
            fetch(route).then(response => {
              if (response.ok) {
                return cache.put(route, response.clone());
              }
            }).catch(() => {
              // Ignorar errores de pre-cache
            })
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker: Instalación completada');
      // Forzar activación inmediata
      return self.skipWaiting();
    })
  );
});

// ============================================================================
// ACTIVACIÓN DEL SERVICE WORKER
// ============================================================================
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker: Activando...');
  
  event.waitUntil(
    // Limpiar caches antiguos
    caches.keys().then(cacheNames => {
      const deletePromises = cacheNames
        .filter(cacheName => {
          return cacheName.startsWith('misfinanzas-') && 
                 cacheName !== STATIC_CACHE_NAME && 
                 cacheName !== DYNAMIC_CACHE_NAME;
        })
        .map(cacheName => {
          console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
          return caches.delete(cacheName);
        });
      
      return Promise.all(deletePromises);
    }).then(() => {
      console.log('✅ Service Worker: Activación completada');
      // Tomar control inmediato de todas las páginas
      return self.clients.claim();
    })
  );
});

// ============================================================================
// INTERCEPTACIÓN DE REQUESTS (ESTRATEGIA CACHE-FIRST)
// ============================================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Excluir URLs que no deben cachearse
  if (EXCLUDE_FROM_CACHE.some(excluded => request.url.includes(excluded))) {
    return; // Usar fetch normal sin cache
  }
  
  // Solo interceptar requests GET
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(handleRequest(request, url));
});

async function handleRequest(request, url) {
  try {
    // Estrategia para diferentes tipos de recursos
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    } else if (isAPIRequest(url)) {
      return await networkFirst(request, DYNAMIC_CACHE_NAME);
    } else if (isNavigation(request)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE_NAME);
    } else {
      return await networkFirst(request, DYNAMIC_CACHE_NAME);
    }
  } catch (error) {
    console.error('❌ Service Worker: Error manejando request:', error);
    return await fallbackResponse(request);
  }
}

// ============================================================================
// ESTRATEGIAS DE CACHE
// ============================================================================

// Cache First: Ideal para assets estáticos
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First: Ideal para APIs y datos dinámicos
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('📱 Service Worker: Usando versión offline para:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale While Revalidate: Ideal para navegación
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Actualizar cache en background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Retornar cached inmediatamente si existe, sino esperar network
  return cachedResponse || await fetchPromise;
}

// ============================================================================
// UTILIDADES
// ============================================================================

function isStaticAsset(url) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$/i.test(url.pathname);
}

function isAPIRequest(url) {
  return url.hostname.includes('supabase.co') || 
         url.pathname.includes('/api/') ||
         url.pathname.includes('/rest/');
}

function isNavigation(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

async function fallbackResponse(request) {
  if (isNavigation(request)) {
    // Fallback a página principal para navegación
    const cachedIndex = await caches.match('/mis-finanzas/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
  }
  
  // Respuesta offline genérica
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'Esta funcionalidad requiere conexión a internet',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// ============================================================================
// BACKGROUND SYNC (para cuando esté disponible)
// ============================================================================
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // TODO: Implementar sincronización de transacciones pendientes
  console.log('📊 Service Worker: Sincronizando transacciones pendientes...');
}

// ============================================================================
// PUSH NOTIFICATIONS (para futuras versiones)
// ============================================================================
self.addEventListener('push', event => {
  console.log('🔔 Service Worker: Push recibido:', event.data?.text());
  
  if (event.data) {
    const notificationData = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: '/mis-finanzas/icons/icon-192x192.svg',
        badge: '/mis-finanzas/icons/favicon.svg',
        data: notificationData.data
      })
    );
  }
});

// ============================================================================
// EVENTOS DE NOTIFICACIÓN
// ============================================================================
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: Notificación clickeada');
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/mis-finanzas/')
  );
});

console.log('🎉 Service Worker: MisFinanzas PWA cargado exitosamente');