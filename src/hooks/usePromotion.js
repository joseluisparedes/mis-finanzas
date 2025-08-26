import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const usePromotion = () => {
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener promoción Early Bird activa
  const getEarlyBirdPromotion = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('name', 'Premium Early Bird')
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        // Verificar si está disponible
        const { data: availabilityData, error: availabilityError } = await supabase
          .rpc('is_promotion_available', { promo_id: data.id });

        if (availabilityError) throw availabilityError;

        setPromotion({
          ...data,
          available: availabilityData.available,
          spots_left: availabilityData.promotion?.spots_left || 0,
          error_message: availabilityData.error
        });
      } else {
        setPromotion(null);
      }
    } catch (err) {
      console.error('Error getting Early Bird promotion:', err);
      setError('Error al verificar promoción');
      setPromotion(null);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el usuario ya está en una promoción
  const checkUserInPromotion = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('promotion_users')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error('Error checking user in promotion:', err);
      return false;
    }
  };

  // Unirse a la promoción
  const joinPromotion = async (userId, transactionId = null, amountPaid = null) => {
    if (!promotion) return { success: false, error: 'No hay promoción activa' };

    try {
      const { data, error } = await supabase.rpc('join_promotion', {
        promo_id: promotion.id,
        user_uuid: userId,
        transaction_id_param: transactionId,
        amount_paid_param: amountPaid
      });

      if (error) throw error;

      if (data.success) {
        // Actualizar la promoción local
        await getEarlyBirdPromotion();
      }

      return data;
    } catch (err) {
      console.error('Error joining promotion:', err);
      return {
        success: false,
        error: 'Error al unirse a la promoción'
      };
    }
  };

  useEffect(() => {
    getEarlyBirdPromotion();
  }, []);

  return {
    promotion,
    loading,
    error,
    getEarlyBirdPromotion,
    checkUserInPromotion,
    joinPromotion,
    refetch: getEarlyBirdPromotion
  };
};

export default usePromotion;