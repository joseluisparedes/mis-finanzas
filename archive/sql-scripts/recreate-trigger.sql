-- Recrear función y trigger para crear datos por defecto
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS trigger AS $$
BEGIN
    -- Crear configuración por defecto
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    
    -- Crear categorías por defecto
    INSERT INTO categories (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Comida', '#FF6B6B', 1),
        (NEW.id, 'Transporte', '#4ECDC4', 2),
        (NEW.id, 'Entretenimiento', '#45B7D1', 3),
        (NEW.id, 'Servicios', '#96CEB4', 4),
        (NEW.id, 'Compras', '#FFEAA7', 5);
    
    -- Crear métodos de pago por defecto
    INSERT INTO payment_methods (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Efectivo', '#74B9FF', 1),
        (NEW.id, 'Tarjeta de Débito', '#0984E3', 2),
        (NEW.id, 'Tarjeta de Crédito', '#6C5CE7', 3),
        (NEW.id, 'Transferencia', '#A29BFE', 4);
    
    -- Crear tipos de ingresos por defecto
    INSERT INTO income_types (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Salario Principal', '#00B894', 1),
        (NEW.id, 'Salario Secundario', '#00CEC9', 2),
        (NEW.id, 'Ingresos Adicionales', '#55A3FF', 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear datos por defecto al registrar usuario
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_data();