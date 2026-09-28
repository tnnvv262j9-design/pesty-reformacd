
-- Agregar columna pending_plan a la tabla companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pending_plan VARCHAR(50) NULL DEFAULT NULL 
AFTER plan;
