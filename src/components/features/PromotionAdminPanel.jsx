import React, { useState, useEffect } from 'react';
import { Crown, Users, TrendingUp, Settings, Eye, EyeOff, Plus, Edit2, Save, X, AlertTriangle, CheckCircle, Clock, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PromotionAdminPanel = () => {
  const [loading, setLoading] = useState(false);
  const [promotionStats, setPromotionStats] = useState(null);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPromotionStats();
  }, []);

  const loadPromotionStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase.rpc('get_promotion_stats', {
        admin_user_id: user.id
      });

      if (error) throw error;
      setPromotionStats(data);
    } catch (error) {
      console.error('Error loading promotion stats:', error);
      setError('Error al cargar estadísticas de promociones');
    } finally {
      setLoading(false);
    }
  };

  const togglePromotionStatus = async (promotionId, currentStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const action = currentStatus ? 'deactivate' : 'activate';
      const { data, error } = await supabase.rpc('manage_promotion', {
        admin_user_id: user.id,
        action: action,
        promo_data: { id: promotionId }
      });

      if (error) throw error;

      if (data.success) {
        await loadPromotionStats();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error toggling promotion:', error);
      setError('Error al cambiar estado de promoción');
    }
  };

  const updatePromotionLimit = async (promotionId, newLimit) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase.rpc('manage_promotion', {
        admin_user_id: user.id,
        action: 'update_limit',
        promo_data: { 
          id: promotionId,
          max_users: newLimit
        }
      });

      if (error) throw error;

      if (data.success) {
        await loadPromotionStats();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error updating limit:', error);
      setError('Error al actualizar límite');
    }
  };

  if (loading && !promotionStats) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Panel de Promociones
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Gestiona promociones Early Bird y descuentos especiales
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Promoción</span>
          </button>
        </div>

        {/* Stats Overview */}
        {promotionStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Crown className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Early Birds</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {promotionStats.total_early_birds || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Revenue Early Bird</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    S/ {promotionStats.total_revenue_early_bird || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Promociones Activas</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {promotionStats.promotions?.filter(p => p.active).length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Promotions List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Promociones Configuradas
          </h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {promotionStats?.promotions?.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              onToggleStatus={togglePromotionStatus}
              onUpdateLimit={updatePromotionLimit}
              onViewDetails={setSelectedPromotion}
            />
          ))}

          {!promotionStats?.promotions?.length && (
            <div className="p-8 text-center">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No hay promociones configuradas
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Promotion Modal */}
      {showCreateModal && (
        <CreatePromotionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPromotionStats();
          }}
        />
      )}

      {/* Promotion Details Modal */}
      {selectedPromotion && (
        <PromotionDetailsModal
          promotion={selectedPromotion}
          onClose={() => setSelectedPromotion(null)}
        />
      )}
    </div>
  );
};

const PromotionCard = ({ promotion, onToggleStatus, onUpdateLimit, onViewDetails }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newLimit, setNewLimit] = useState(promotion.max_users);

  const handleSaveLimit = () => {
    if (newLimit !== promotion.max_users && newLimit >= promotion.current_users) {
      onUpdateLimit(promotion.id, newLimit);
    }
    setIsEditing(false);
  };

  const progressPercentage = Math.round((promotion.current_users / promotion.max_users) * 100);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {promotion.name}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              promotion.active 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
            }`}>
              {promotion.active ? 'ACTIVA' : 'INACTIVA'}
            </span>
            {promotion.current_users >= promotion.max_users && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                AGOTADA
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {promotion.description}
          </p>

          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-gray-500">Precio:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                S/ {promotion.promo_price}
              </span>
              <span className="ml-1 text-gray-400 line-through">
                S/ {promotion.original_price}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Usuarios:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {promotion.current_users} / {promotion.max_users}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Disponibles:</span>
              <span className={`ml-2 font-medium ${
                promotion.spots_left > 5 
                  ? 'text-green-600' 
                  : promotion.spots_left > 0 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                {promotion.spots_left}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(promotion)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Ver detalles"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Editar límite"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStatus(promotion.id, promotion.active)}
            className={`p-2 ${
              promotion.active 
                ? 'text-green-600 hover:text-green-800' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={promotion.active ? 'Desactivar' : 'Activar'}
          >
            {promotion.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progressPercentage >= 100 ? 'bg-red-500' :
              progressPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{progressPercentage}% utilizado</span>
          <span>{promotion.spots_left} cupos restantes</span>
        </div>
      </div>

      {/* Edit Limit */}
      {isEditing && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nuevo límite:
            </label>
            <input
              type="number"
              min={promotion.current_users}
              value={newLimit}
              onChange={(e) => setNewLimit(parseInt(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleSaveLimit}
              className="p-1 text-green-600 hover:text-green-800"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setNewLimit(promotion.max_users);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CreatePromotionModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    original_price: 15,
    promo_price: 5,
    max_users: 50
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase.rpc('manage_promotion', {
        admin_user_id: user.id,
        action: 'create',
        promo_data: formData
      });

      if (error) throw error;

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error creating promotion:', error);
      setError('Error al crear promoción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nueva Promoción
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows="2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio Original (S/)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.original_price}
                onChange={(e) => setFormData({...formData, original_price: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio Promoción (S/)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.promo_price}
                onChange={(e) => setFormData({...formData, promo_price: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Máximo de Usuarios
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.max_users}
              onChange={(e) => setFormData({...formData, max_users: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PromotionDetailsModal = ({ promotion, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalles de {promotion.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Precio Original:</span>
                <p className="font-semibold text-lg">S/ {promotion.original_price}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Precio Promoción:</span>
                <p className="font-semibold text-lg text-green-600">S/ {promotion.promo_price}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Usuarios Máximos:</span>
                <p className="font-semibold text-lg">{promotion.max_users}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Usuarios Actuales:</span>
                <p className="font-semibold text-lg">{promotion.current_users}</p>
              </div>
            </div>
          </div>

          {promotion.users_list && promotion.users_list.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Usuarios en la Promoción ({promotion.users_list.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {promotion.users_list.map((user, index) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(user.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        S/ {user.amount_paid || promotion.promo_price}
                      </p>
                      {user.transaction_id && (
                        <p className="text-xs text-gray-400">
                          ID: {user.transaction_id.slice(-8)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionAdminPanel;