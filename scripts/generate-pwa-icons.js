#!/usr/bin/env node

/**
 * GENERADOR DE ICONOS PWA
 * Genera iconos PNG de diferentes tamaños usando SVG como base
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Tamaños de iconos requeridos para PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Colores para diferentes tipos de iconos
const ICON_VARIANTS = {
  default: {
    background: 'url(#bgGradient)',
    text: 'white'
  },
  maskable: {
    background: '#8B5CF6',
    text: 'white'
  }
};

class PWAIconGenerator {
  constructor() {
    this.baseDir = process.cwd();
    this.iconsDir = join(this.baseDir, 'public', 'icons');
    this.baseSvg = join(this.iconsDir, 'icon-base.svg');
  }

  generateIconSVG(size, variant = 'default') {
    const colors = ICON_VARIANTS[variant];
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E5E7EB" />
    </linearGradient>
  </defs>
  
  <!-- Rounded square background -->
  <rect width="512" height="512" rx="${size > 200 ? 100 : 50}" fill="${colors.background}"/>
  
  <!-- Main financial icon (trending up + dollar) -->
  <g transform="translate(128, 128)">
    <!-- Trending up arrow -->
    <path d="M3 17L9 11L13 15L21 7" stroke="url(#iconGradient)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M14 7H21V14" stroke="url(#iconGradient)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    
    <!-- Dollar symbol -->
    <g transform="translate(200, 80)">
      <circle cx="32" cy="32" r="28" fill="#10B981" stroke="white" stroke-width="4"/>
      <path d="M28 20V44M36 20V44M24 28C24 24 28 20 32 20C36 20 40 24 40 28C40 32 36 36 32 36C28 36 24 40 24 44C24 48 28 52 32 52C36 52 40 48 40 44" 
            stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
  </g>
  
  ${size >= 256 ? `<text x="256" y="420" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
        font-size="${Math.max(24, size/12)}" font-weight="bold" fill="${colors.text}">MisFinanzas</text>` : ''}
</svg>`;
  }

  generateFavicon() {
    return `<svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
  </defs>
  
  <!-- Rounded square background -->
  <rect width="512" height="512" rx="100" fill="url(#bgGradient)"/>
  
  <!-- Simplified dollar symbol for small size -->
  <g transform="translate(200, 150)">
    <circle cx="56" cy="56" r="50" fill="#10B981" stroke="white" stroke-width="8"/>
    <path d="M46 30V82M66 30V82M30 46C30 38 38 30 56 30C74 30 82 38 82 46C82 54 74 62 56 62C38 62 30 70 30 78C30 86 38 94 56 94C74 94 82 86 82 78" 
          stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
  }

  async generateAllIcons() {
    console.log('🎨 GENERANDO ICONOS PWA...\n');

    // Crear directorio si no existe
    if (!existsSync(this.iconsDir)) {
      mkdirSync(this.iconsDir, { recursive: true });
    }

    // Generar iconos principales
    for (const size of ICON_SIZES) {
      const svgContent = this.generateIconSVG(size);
      const filename = `icon-${size}x${size}.svg`;
      const filepath = join(this.iconsDir, filename);
      
      writeFileSync(filepath, svgContent);
      console.log(`✅ Generado: ${filename}`);
    }

    // Generar favicon
    const faviconContent = this.generateFavicon();
    writeFileSync(join(this.iconsDir, 'favicon.svg'), faviconContent);
    console.log('✅ Generado: favicon.svg');

    // Generar iconos para shortcuts
    const shortcutIcons = [
      { name: 'shortcut-gasto', emoji: '💸', color: '#EF4444' },
      { name: 'shortcut-balance', emoji: '⚖️', color: '#8B5CF6' },
      { name: 'shortcut-reportes', emoji: '📊', color: '#10B981' }
    ];

    for (const shortcut of shortcutIcons) {
      const shortcutSvg = this.generateShortcutIcon(shortcut);
      writeFileSync(join(this.iconsDir, `${shortcut.name}.svg`), shortcutSvg);
      console.log(`✅ Generado: ${shortcut.name}.svg`);
    }

    console.log('\n🎉 ICONOS PWA GENERADOS EXITOSAMENTE');
    console.log('📝 NOTA: Los archivos SVG están listos. Para producción, convertir a PNG usando herramientas como:');
    console.log('   - https://convertio.co/svg-png/');
    console.log('   - ImageMagick: convert icon.svg icon.png');
    console.log('   - Sharp (Node.js): sharp(svgBuffer).png().toFile()');
  }

  generateShortcutIcon({ name, emoji, color }) {
    return `<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="48" fill="${color}"/>
  <text x="96" y="120" text-anchor="middle" font-size="80">${emoji}</text>
</svg>`;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new PWAIconGenerator();
  generator.generateAllIcons().catch(console.error);
}

export default PWAIconGenerator;