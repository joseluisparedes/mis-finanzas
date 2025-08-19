-- ==============================================
-- SCRIPT DE PRUEBA: Investigar problema de fechas
-- ==============================================

-- 1. Verificar configuración de zona horaria de la base de datos
SELECT name, setting, unit, category 
FROM pg_settings 
WHERE name IN ('timezone', 'log_timezone', 'TimeZone');

-- 2. Mostrar fecha y hora actual en diferentes formatos
SELECT 
    'Fecha/hora actual de la BD' as descripcion,
    now() as fecha_hora_bd,
    current_date as fecha_actual_bd,
    current_timestamp as timestamp_actual;

-- 3. Probar inserción de fecha con diferentes formatos
CREATE TEMP TABLE test_dates (
    id SERIAL PRIMARY KEY,
    descripcion TEXT,
    fecha_insertada DATE,
    timestamp_insertado TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar fecha como string simple
INSERT INTO test_dates (descripcion, fecha_insertada, timestamp_insertado) 
VALUES ('Fecha como string simple', '2025-08-18', '2025-08-18');

-- Insertar fecha con hora específica
INSERT INTO test_dates (descripcion, fecha_insertada, timestamp_insertado) 
VALUES ('Fecha con hora mediodía', '2025-08-18', '2025-08-18T12:00:00');

-- Insertar fecha con zona horaria
INSERT INTO test_dates (descripcion, fecha_insertada, timestamp_insertado) 
VALUES ('Fecha con timezone', '2025-08-18', '2025-08-18T12:00:00-05:00');

-- 4. Verificar cómo se almacenaron las fechas
SELECT 
    descripcion,
    fecha_insertada,
    timestamp_insertado,
    created_at,
    -- Extraer solo la fecha del timestamp
    DATE(timestamp_insertado) as fecha_extraida_de_timestamp
FROM test_dates
ORDER BY id;

-- 5. Verificar si hay algún trigger o función que modifique las fechas
SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE tablename IN ('expenses', 'incomes', 'recurring_expenses');

-- 6. Información sobre la tabla expenses
\d expenses;

-- 7. Verificar últimas inserciones en expenses (si hay datos)
SELECT 
    id,
    date,
    created_at,
    description,
    amount
FROM expenses 
WHERE created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY created_at DESC
LIMIT 10;