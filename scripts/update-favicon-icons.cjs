#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Nuevo diseño mejorado con mejor visibilidad
const createImprovedIcon = (size) => {
  // Ajustar grosor del stroke según el tamaño para mejor visibilidad
  const strokeWidth = size <= 96 ? 35 : size <= 152 ? 30 : 28;
  const lineWidth = size <= 96 ? 32 : size <= 152 ? 28 : 24;
  const borderWidth = Math.max(8, Math.floor(size / 8));
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16A34A" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.2"/>
    </filter>
  </defs>
  
  <!-- Strong circular background for better contrast -->
  <circle cx="256" cy="256" r="240" fill="url(#bgGradient)" stroke="#FFFFFF" stroke-width="${borderWidth}"/>
  
  <!-- Bold dollar symbol optimized for ${size}x${size} -->
  <g transform="translate(256, 256)" filter="url(#shadow)">
    <!-- Vertical lines of dollar -->
    <line x1="-12" y1="-100" x2="-12" y2="100" stroke="white" stroke-width="${lineWidth}" stroke-linecap="round"/>
    <line x1="12" y1="-100" x2="12" y2="100" stroke="white" stroke-width="${lineWidth}" stroke-linecap="round"/>
    
    <!-- S shape - bold and simple for maximum visibility -->
    <path d="M-70 -50 C-70 -80 -30 -85 0 -85 C30 -85 70 -80 70 -50 C70 -25 30 -15 0 -15 C-30 -15 -70 -5 -70 20 C-70 45 -30 55 0 55 C30 55 70 45 70 20" 
          stroke="white" 
          stroke-width="${strokeWidth}" 
          fill="none" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
  </g>
</svg>`;
};

// Tamaños de iconos a actualizar
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

console.log('🎨 Actualizando iconos con diseño mejorado y más visible...');

iconSizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  const iconContent = createImprovedIcon(size);
  
  fs.writeFileSync(iconPath, iconContent);
  console.log(`✅ Actualizado: icon-${size}x${size}.svg`);
});

// Actualizar favicon también
const faviconPath = path.join(iconsDir, 'favicon.svg');
const faviconContent = createImprovedIcon(32);
fs.writeFileSync(faviconPath, faviconContent);
console.log('✅ Actualizado: favicon.svg');

console.log(`
🚀 FAVICON MEJORADO COMPLETADO:

✨ MEJORAS IMPLEMENTADAS:
- Fondo circular verde vibrante (mejor que cuadrado morado)
- Símbolo $ más grande y bold
- Mejor contraste blanco sobre verde
- Grosor adaptativo según tamaño
- Sombra sutil para profundidad
- Eliminados elementos innecesarios

🎯 RESULTADO:
- Más visible en pestañas del navegador
- Mejor reconocimiento en tamaños pequeños  
- Diseño profesional y limpio
- Consistencia en todos los tamaños PWA

Listo para build y deploy! 🎉
`);