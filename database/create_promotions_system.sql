-- ==============================================
-- SISTEMA DE PROMOCIONES EARLY BIRD v1.0
-- Tabla: promotions
-- ==============================================

-- ==============================================
-- 1. TABLA DE PROMOCIONES
-- ==============================================
CREATE TABLE IF NOT EXISTS promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
    -- CONFIGURACIÓN DE PRECIOS
    original_price DECIMAL(10,2) NOT NULL,
    promo_price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'PEN',
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    
    -- LÍMITES Y CONTROL
    max_users INTEGER NOT NULL DEFAULT 50,
    current_users INTEGER DEFAULT 0,
    
    -- FECHAS
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    
    -- ESTADO
    active BOOLEAN DEFAULT true,
    auto_deactivate_when_full BOOLEAN DEFAULT true,
    
    -- METADATA
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_users_limit CHECK (current_users <= max_users),
    CONSTRAINT check_price_difference CHECK (promo_price < original_price)
);

-- ==============================================
-- 2. TABLA DE USUARIOS EN PROMOCIONES
-- ==============================================
CREATE TABLE IF NOT EXISTS promotion_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    
    -- INFORMACIÓN DEL PAGO
    transaction_id TEXT,
    amount_paid DECIMAL(10,2),
    
    -- FECHAS
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(promotion_id, user_id)
);

-- ==============================================
-- 3. FUNCIÓN PARA VERIFICAR SI PROMOCIÓN ESTÁ DISPONIBLE
-- ==============================================
CREATE OR REPLACE FUNCTION is_promotion_available(promo_id UUID)
RETURNS JSON AS $$
DECLARE
    promo_record RECORD;
    result JSON;
BEGIN
    -- Obtener información de la promoción
    SELECT * INTO promo_record 
    FROM promotions 
    WHERE id = promo_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Promoción no encontrada'
        );
    END IF;
    
    -- Verificar si está activa
    IF NOT promo_record.active THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Promoción inactiva'
        );
    END IF;
    
    -- Verificar límite de usuarios
    IF promo_record.current_users >= promo_record.max_users THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Promoción agotada',
            'spots_left', 0
        );
    END IF;
    
    -- Verificar fechas si están definidas
    IF promo_record.end_date IS NOT NULL AND NOW() > promo_record.end_date THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Promoción expirada'
        );
    END IF;
    
    -- Promoción disponible
    RETURN json_build_object(
        'available', true,
        'promotion', json_build_object(
            'id', promo_record.id,
            'name', promo_record.name,
            'description', promo_record.description,
            'original_price', promo_record.original_price,
            'promo_price', promo_record.promo_price,
            'currency', promo_record.currency,
            'max_users', promo_record.max_users,
            'current_users', promo_record.current_users,
            'spots_left', promo_record.max_users - promo_record.current_users
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 4. FUNCIÓN PARA UNIRSE A UNA PROMOCIÓN
-- ==============================================
CREATE OR REPLACE FUNCTION join_promotion(
    promo_id UUID,
    user_uuid UUID,
    transaction_id_param TEXT DEFAULT NULL,
    amount_paid_param DECIMAL DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    promo_available JSON;
    subscription_record RECORD;
    result JSON;
BEGIN
    -- Verificar si la promoción está disponible
    SELECT is_promotion_available(promo_id) INTO promo_available;
    
    IF NOT (promo_available->>'available')::BOOLEAN THEN
        RETURN promo_available;
    END IF;
    
    -- Verificar si el usuario ya está en esta promoción
    IF EXISTS (
        SELECT 1 FROM promotion_users 
        WHERE promotion_id = promo_id AND user_id = user_uuid
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario ya está en esta promoción'
        );
    END IF;
    
    -- Obtener información de suscripción del usuario
    SELECT * INTO subscription_record 
    FROM user_subscriptions 
    WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no tiene suscripción'
        );
    END IF;
    
    -- Iniciar transacción
    BEGIN
        -- Agregar usuario a la promoción
        INSERT INTO promotion_users (
            promotion_id, user_id, subscription_id, 
            transaction_id, amount_paid
        ) VALUES (
            promo_id, user_uuid, subscription_record.id,
            transaction_id_param, amount_paid_param
        );
        
        -- Actualizar contador de usuarios en la promoción
        UPDATE promotions 
        SET 
            current_users = current_users + 1,
            updated_at = NOW()
        WHERE id = promo_id;
        
        -- Actualizar suscripción del usuario para Early Bird
        UPDATE user_subscriptions 
        SET 
            is_early_bird = true,
            early_bird_price = (promo_available->'promotion'->>'promo_price')::DECIMAL,
            updated_at = NOW()
        WHERE user_id = user_uuid;
        
        -- Verificar si debe desactivar automáticamente
        DECLARE
            current_count INTEGER;
            max_count INTEGER;
            auto_deactivate BOOLEAN;
        BEGIN
            SELECT current_users, max_users, auto_deactivate_when_full 
            INTO current_count, max_count, auto_deactivate
            FROM promotions WHERE id = promo_id;
            
            IF auto_deactivate AND current_count >= max_count THEN
                UPDATE promotions 
                SET active = false, updated_at = NOW()
                WHERE id = promo_id;
            END IF;
        END;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Usuario agregado a la promoción exitosamente',
            'spots_left', (promo_available->'promotion'->>'max_users')::INTEGER - 
                         (promo_available->'promotion'->>'current_users')::INTEGER - 1
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Error al unirse a la promoción: ' || SQLERRM
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 5. FUNCIÓN PARA OBTENER ESTADÍSTICAS DE PROMOCIONES (ADMIN)
-- ==============================================
CREATE OR REPLACE FUNCTION get_promotion_stats(admin_user_id UUID)
RETURNS JSON AS $$
DECLARE
    is_admin BOOLEAN;
    stats_result JSON;
BEGIN
    -- Verificar si es admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object(
            'error', 'Acceso denegado - Solo administradores'
        );
    END IF;
    
    -- Obtener estadísticas
    SELECT json_build_object(
        'promotions', json_agg(
            json_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'original_price', p.original_price,
                'promo_price', p.promo_price,
                'max_users', p.max_users,
                'current_users', p.current_users,
                'spots_left', p.max_users - p.current_users,
                'active', p.active,
                'created_at', p.created_at,
                'users_list', (
                    SELECT json_agg(
                        json_build_object(
                            'user_id', pu.user_id,
                            'email', au.email,
                            'joined_at', pu.joined_at,
                            'transaction_id', pu.transaction_id,
                            'amount_paid', pu.amount_paid
                        )
                    )
                    FROM promotion_users pu
                    LEFT JOIN auth.users au ON pu.user_id = au.id
                    WHERE pu.promotion_id = p.id
                )
            )
        ),
        'total_early_birds', (
            SELECT COUNT(*)
            FROM user_subscriptions
            WHERE is_early_bird = true
        ),
        'total_revenue_early_bird', (
            SELECT COALESCE(SUM(pu.amount_paid), 0)
            FROM promotion_users pu
            WHERE pu.amount_paid IS NOT NULL
        )
    ) INTO stats_result
    FROM promotions p;
    
    RETURN stats_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 6. FUNCIÓN PARA GESTIONAR PROMOCIONES (ADMIN)
-- ==============================================
CREATE OR REPLACE FUNCTION manage_promotion(
    admin_user_id UUID,
    action TEXT, -- 'create', 'activate', 'deactivate', 'update_limit'
    promo_data JSON DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    is_admin BOOLEAN;
    result JSON;
    promo_id UUID;
BEGIN
    -- Verificar si es admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Acceso denegado - Solo administradores'
        );
    END IF;
    
    CASE action
        WHEN 'create' THEN
            INSERT INTO promotions (
                name, description, original_price, promo_price,
                currency, max_users, created_by
            ) VALUES (
                promo_data->>'name',
                promo_data->>'description',
                (promo_data->>'original_price')::DECIMAL,
                (promo_data->>'promo_price')::DECIMAL,
                COALESCE(promo_data->>'currency', 'PEN'),
                COALESCE((promo_data->>'max_users')::INTEGER, 50),
                admin_user_id
            ) RETURNING id INTO promo_id;
            
            RETURN json_build_object(
                'success', true,
                'message', 'Promoción creada exitosamente',
                'promotion_id', promo_id
            );
            
        WHEN 'activate' THEN
            UPDATE promotions 
            SET active = true, updated_at = NOW()
            WHERE id = (promo_data->>'id')::UUID;
            
            RETURN json_build_object(
                'success', true,
                'message', 'Promoción activada'
            );
            
        WHEN 'deactivate' THEN
            UPDATE promotions 
            SET active = false, updated_at = NOW()
            WHERE id = (promo_data->>'id')::UUID;
            
            RETURN json_build_object(
                'success', true,
                'message', 'Promoción desactivada'
            );
            
        WHEN 'update_limit' THEN
            UPDATE promotions 
            SET 
                max_users = (promo_data->>'max_users')::INTEGER,
                updated_at = NOW()
            WHERE id = (promo_data->>'id')::UUID
            AND current_users <= (promo_data->>'max_users')::INTEGER;
            
            IF FOUND THEN
                RETURN json_build_object(
                    'success', true,
                    'message', 'Límite actualizado'
                );
            ELSE
                RETURN json_build_object(
                    'success', false,
                    'error', 'No se puede reducir el límite por debajo de usuarios actuales'
                );
            END IF;
            
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Acción no válida'
            );
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 7. CREAR PROMOCIÓN EARLY BIRD INICIAL
-- ==============================================
INSERT INTO promotions (
    name, 
    description, 
    original_price, 
    promo_price, 
    currency,
    max_users,
    active
) VALUES (
    'Premium Early Bird',
    'Precio fundador exclusivo para los primeros 50 usuarios. Precio bloqueado para siempre.',
    15.00,
    5.00,
    'PEN',
    50,
    true
) ON CONFLICT DO NOTHING;

-- ==============================================
-- 8. ÍNDICES Y OPTIMIZACIÓN
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotion_users_promo ON promotion_users(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_users_user ON promotion_users(user_id);

-- ==============================================
-- 9. ROW LEVEL SECURITY
-- ==============================================
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_users ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todas las promociones
CREATE POLICY "Admins can manage promotions" ON promotions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- Usuarios pueden ver promociones activas
CREATE POLICY "Users can view active promotions" ON promotions 
    FOR SELECT USING (active = true);

-- Admin puede ver todos los registros de promotion_users
CREATE POLICY "Admins can view all promotion_users" ON promotion_users 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- Usuarios pueden ver solo sus registros
CREATE POLICY "Users can view own promotion_users" ON promotion_users 
    FOR SELECT USING (auth.uid() = user_id);

-- ==============================================
-- 10. TRIGGERS
-- ==============================================

-- Trigger para updated_at en promotions
CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMENTARIOS
-- ==============================================
COMMENT ON TABLE promotions IS 'Sistema de promociones para gestionar precios especiales como Early Bird';
COMMENT ON TABLE promotion_users IS 'Usuarios que participan en promociones específicas';
COMMENT ON FUNCTION is_promotion_available IS 'Verifica si una promoción está disponible para nuevos usuarios';
COMMENT ON FUNCTION join_promotion IS 'Permite a un usuario unirse a una promoción disponible';
COMMENT ON FUNCTION get_promotion_stats IS 'Obtiene estadísticas completas de promociones para administradores';
COMMENT ON FUNCTION manage_promotion IS 'Permite a administradores gestionar promociones (crear, activar, desactivar)';