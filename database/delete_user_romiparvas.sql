-- Script para eliminar completamente al usuario romiparvas@gmail.com
-- PRECAUCIÓN: Esto eliminará TODOS los datos relacionados con este usuario

-- Obtener el user_id primero
DO $$
DECLARE
    target_user_id UUID;
    user_email TEXT := 'romiparvas@gmail.com';
BEGIN
    -- Buscar el ID del usuario
    SELECT id FROM auth.users WHERE email = user_email INTO target_user_id;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuario % no encontrado', user_email;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Eliminando datos del usuario: % (ID: %)', user_email, target_user_id;
    
    -- Eliminar en orden inverso de dependencias
    
    -- 1. Transacciones (si existen)
    DELETE FROM transactions WHERE user_id = target_user_id;
    RAISE NOTICE 'Transacciones eliminadas';
    
    -- 2. Ingresos (si existen)
    DELETE FROM incomes WHERE user_id = target_user_id;
    RAISE NOTICE 'Ingresos eliminados';
    
    -- 3. Presupuestos
    DELETE FROM budgets WHERE user_id = target_user_id;
    RAISE NOTICE 'Presupuestos eliminados';
    
    -- 4. Tipos de ingresos personalizados
    DELETE FROM income_types WHERE user_id = target_user_id;
    RAISE NOTICE 'Tipos de ingresos eliminados';
    
    -- 5. Métodos de pago personalizados
    DELETE FROM payment_methods WHERE user_id = target_user_id;
    RAISE NOTICE 'Métodos de pago eliminados';
    
    -- 6. Categorías personalizadas
    DELETE FROM categories WHERE user_id = target_user_id;
    RAISE NOTICE 'Categorías eliminadas';
    
    -- 7. Perfil de usuario (si existe)
    DELETE FROM user_profiles WHERE user_id = target_user_id;
    RAISE NOTICE 'Perfil de usuario eliminado';
    
    -- 8. Suscripción del usuario
    DELETE FROM user_subscriptions WHERE user_id = target_user_id;
    RAISE NOTICE 'Suscripción eliminada';
    
    -- 9. Finalmente, eliminar de auth.users (esto eliminará la cuenta completamente)
    DELETE FROM auth.users WHERE id = target_user_id;
    RAISE NOTICE 'Usuario eliminado de auth.users';
    
    RAISE NOTICE 'Usuario % eliminado completamente', user_email;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al eliminar usuario: %', SQLERRM;
        RAISE;
END $$;

-- Verificar que el usuario fue eliminado
SELECT 'Verificación final:' as status;
SELECT COUNT(*) as usuarios_restantes 
FROM auth.users 
WHERE email = 'romiparvas@gmail.com';

SELECT COUNT(*) as suscripciones_restantes 
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id 
WHERE u.email = 'romiparvas@gmail.com';