import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X, Camera, Palette } from 'lucide-react';
import authService from '../../services/authService';
import databaseService from '../../services/databaseService';

const ProfileCustomization = ({ isOpen, onClose, onProfileUpdate }) => {
  const [profile, setProfile] = useState({
    displayName: '',
    avatar: 'person-1',
    avatarColor: '#8B5CF6'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Avatares diversos e inclusivos organizados por categorías
  const avatarCategories = {
    'Personas': [
      'person-1', 'person-2', 'person-3', 'person-4', 'person-5', 'person-6',
      'person-7', 'person-8', 'person-9', 'person-10', 'person-11', 'person-12'
    ],
    'Profesiones': [
      'doctor', 'teacher', 'engineer', 'artist', 'chef', 'lawyer',
      'nurse', 'scientist', 'designer', 'musician', 'writer', 'entrepreneur'
    ],
    'Animales': [
      'cat', 'dog', 'bird', 'fish', 'rabbit', 'turtle',
      'panda', 'fox', 'owl', 'dolphin', 'butterfly', 'lion'
    ],
    'Naturaleza': [
      'tree', 'flower', 'mountain', 'sun', 'moon', 'star',
      'leaf', 'rainbow', 'cloud', 'wave', 'fire', 'crystal'
    ],
    'Objetos': [
      'book', 'coffee', 'camera', 'music', 'heart', 'diamond',
      'key', 'crown', 'shield', 'compass', 'rocket', 'gem'
    ]
  };

  const avatarColors = [
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
    '#6366F1', '#8B5A2B', '#059669', '#DC2626', '#7C3AED', '#DB2777',
    '#065F46', '#92400E', '#1E40AF', '#581C87', '#BE185D', '#047857'
  ];

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      
      if (user) {
        // Obtener perfil personalizado de la BD
        const customProfile = await databaseService.getUserProfile();
        
        setProfile({
          displayName: customProfile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '',
          avatar: customProfile?.avatar || 'person-1',
          avatarColor: customProfile?.avatar_color || '#8B5CF6'
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Actualizar en Supabase Auth
      await authService.updateProfile({
        display_name: profile.displayName
      });

      // Guardar datos personalizados en nuestra BD
      const updatedProfile = await databaseService.updateUserProfile({
        display_name: profile.displayName,
        avatar: profile.avatar,
        avatar_color: profile.avatarColor
      });

      // Notificar al componente padre con el perfil actualizado de la BD
      onProfileUpdate?.(updatedProfile);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar el perfil. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarContent = (avatarType) => {
    // Mapeo de avatares a emojis/símbolos
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

    return avatarMap[avatarType] || '👤';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {getAvatarContent(profile.avatar)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Personalizar Perfil
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Elige tu nombre y avatar personal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Nombre de usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nombre para mostrar
            </label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Ingresa tu nombre..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={50}
            />
          </div>

          {/* Color del avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Palette className="w-4 h-4 inline mr-2" />
              Color del avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {avatarColors.map(color => (
                <button
                  key={color}
                  onClick={() => setProfile(prev => ({ ...prev, avatarColor: color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    profile.avatarColor === color 
                      ? 'border-gray-900 dark:border-white scale-110' 
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  } transition-transform`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Selección de avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Camera className="w-4 h-4 inline mr-2" />
              Elige tu avatar
            </label>
            
            {/* Vista previa del avatar actual */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: profile.avatarColor }}
                >
                  {getAvatarContent(profile.avatar)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {profile.displayName || 'Tu nombre'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vista previa del perfil
                  </p>
                </div>
              </div>
            </div>

            {/* Categorías de avatares */}
            <div className="space-y-4">
              {Object.entries(avatarCategories).map(([category, avatars]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {category}
                  </h4>
                  <div className="grid grid-cols-8 gap-2">
                    {avatars.map(avatar => (
                      <button
                        key={avatar}
                        onClick={() => setProfile(prev => ({ ...prev, avatar }))}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg hover:scale-110 transition-all ${
                          profile.avatar === avatar
                            ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800 scale-110'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        style={{ 
                          backgroundColor: profile.avatar === avatar ? profile.avatarColor : 'transparent'
                        }}
                      >
                        {getAvatarContent(avatar)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !profile.displayName.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 inline-flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Perfil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCustomization;