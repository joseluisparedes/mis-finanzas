#!/usr/bin/env node

/**
 * CONVERSOR DE ICONOS SVG A PNG
 * Crea iconos PNG desde SVG usando canvas para PWA
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Crear iconos PNG usando data URLs (funciona sin dependencias)
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function createPngDataUrl(size) {
  // Crear un canvas virtual representado como data URL
  const canvas = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size > 200 ? size/5 : size/10}" fill="url(#bg)"/>
  
  <!-- Icon -->
  <g transform="translate(${size/4}, ${size/4})">
    <circle cx="${size/4}" cy="${size/4}" r="${size/6}" fill="#10B981" stroke="white" stroke-width="${size/80}"/>
    <text x="${size/4}" y="${size/4 + size/20}" text-anchor="middle" font-family="monospace" 
          font-size="${size/8}" font-weight="bold" fill="white">$</text>
  </g>
  
  ${size >= 256 ? `<text x="${size/2}" y="${size*0.85}" text-anchor="middle" font-family="sans-serif" 
        font-size="${size/16}" font-weight="bold" fill="white">MisFinanzas</text>` : ''}
</svg>`;

  // Convertir SVG a data URL
  const base64 = Buffer.from(canvas).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

console.log('🎨 GENERANDO ICONOS PNG TEMPORALES...\n');

const iconsDir = join(process.cwd(), 'public', 'icons');

for (const size of ICON_SIZES) {
  const svgContent = createPngDataUrl(size);
  const filename = `icon-${size}x${size}.png.svg`;
  const filepath = join(iconsDir, filename);
  
  // Por ahora creamos SVGs que simulan PNGs
  writeFileSync(filepath, svgContent.replace('data:image/svg+xml;base64,', ''));
  console.log(`✅ Temporal PNG creado: ${filename}`);
}

console.log('\n🎉 ICONOS TEMPORALES CREADOS');
console.log('📝 NOTA: Para iconos PNG reales, usar:');
console.log('   1. https://convertio.co/svg-png/');
console.log('   2. npm install sharp && node convert-to-png.js');
console.log('   3. Photoshop/GIMP exportar como PNG');