import React from 'react';

const Avatar = ({ 
  avatar = 'person-1', 
  avatarColor = '#8B5CF6', 
  size = 'md', 
  displayName = '',
  className = '',
  onClick = null 
}) => {
  // Mapeo completo de avatares
  const avatarMap = {
    // Personas diversas
    'person-1': '👤', 'person-2': '👩', 'person-3': '👨', 'person-4': '👩‍🦱',
    'person-5': '👨‍🦱', 'person-6': '👩‍🦰', 'person-7': '👨‍🦰', 'person-8': '👩‍🦳',
    'person-9': '👨‍🦳', 'person-10': '👩‍🦲', 'person-11': '👨‍🦲', 'person-12': '🧑',
    
    // Profesiones
    'doctor': '👩‍⚕️', 'teacher': '👩‍🏫', 'engineer': '👩‍💻', 'artist': '👩‍🎨',
    'chef': '👩‍🍳', 'lawyer': '👩‍💼', 'nurse': '👨‍⚕️', 'scientist': '👩‍🔬',
    'designer': '👨‍🎨', 'musician': '👩‍🎤', 'writer': '✍️', 'entrepreneur': '💼',
    
    // Animales
    'cat': '🐱', 'dog': '🐶', 'bird': '🐦', 'fish': '🐟', 'rabbit': '🐰',
    'turtle': '🐢', 'panda': '🐼', 'fox': '🦊', 'owl': '🦉', 'dolphin': '🐬',
    'butterfly': '🦋', 'lion': '🦁',
    
    // Naturaleza
    'tree': '🌳', 'flower': '🌸', 'mountain': '⛰️', 'sun': '☀️', 'moon': '🌙',
    'star': '⭐', 'leaf': '🍃', 'rainbow': '🌈', 'cloud': '☁️', 'wave': '🌊',
    'fire': '🔥', 'crystal': '💎',
    
    // Objetos
    'book': '📚', 'coffee': '☕', 'camera': '📷', 'music': '🎵', 'heart': '❤️',
    'diamond': '💎', 'key': '🗝️', 'crown': '👑', 'shield': '🛡️', 'compass': '🧭',
    'rocket': '🚀', 'gem': '💎'
  };

  // Tamaños predefinidos
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm', 
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
    '2xl': 'w-20 h-20 text-3xl',
    '3xl': 'w-24 h-24 text-4xl'
  };

  const getAvatarContent = () => {
    // Si tiene avatar personalizado, usarlo
    if (avatar && avatarMap[avatar]) {
      return avatarMap[avatar];
    }
    
    // Fallback: primera letra del nombre o icono por defecto
    if (displayName && displayName.trim()) {
      return displayName.charAt(0).toUpperCase();
    }
    
    return '👤';
  };

  const baseClasses = `
    ${sizes[size]} 
    rounded-full 
    flex 
    items-center 
    justify-center 
    font-medium 
    text-white 
    select-none
    ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
    ${className}
  `.trim();

  return (
    <div
      className={baseClasses}
      style={{ backgroundColor: avatarColor }}
      onClick={onClick}
      title={displayName}
    >
      {getAvatarContent()}
    </div>
  );
};

export default Avatar;