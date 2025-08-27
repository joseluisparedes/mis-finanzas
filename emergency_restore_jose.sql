-- RESTAURACIÓN DE EMERGENCIA PARA JOSÉ
-- Si todo lo demás falla, ejecuta esta línea simple:

UPDATE user_subscriptions SET subscription_type = 'admin', status = 'active', updated_at = NOW() WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');