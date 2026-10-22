-- 004_backoffice.sql
-- Migración de datos para back-office, comisiones, liquidaciones y árbol MLM real

-- 1. Ampliación de usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(255) DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_id INT REFERENCES referidos(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Código de invitación único en referidos
ALTER TABLE referidos ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE;

-- Actualizar códigos para el seed existente
UPDATE referidos SET codigo = 'JUAN' WHERE id = 1 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'MARIA' WHERE id = 2 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'PEDRO' WHERE id = 3 AND (codigo IS NULL OR codigo = '');
UPDATE referidos SET codigo = 'LUIS' WHERE id = 4 AND (codigo IS NULL OR codigo = '');

-- Enlazar usuarios existentes con sus nodos de referidos
UPDATE usuarios SET nombre = 'Administrador', referido_id = 1 WHERE email = 'admin@upse.edu.ec';
UPDATE usuarios SET nombre = 'Luis Poveda', referido_id = 4 WHERE email = 'cliente@upse.edu.ec';

-- 3. Borrado lógico en productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 4. Estados y usuario en pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'pendiente';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS usuario_id INT REFERENCES usuarios(id);

-- 5. Tabla ledger de comisiones
CREATE TABLE IF NOT EXISTS comisiones (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    referido_id INT REFERENCES referidos(id),
    nivel INT NOT NULL,
    porcentaje DECIMAL(5, 2) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comisiones_referido_id ON comisiones(referido_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_pedido_id ON comisiones(pedido_id);

-- 6. Tabla de liquidaciones
CREATE TABLE IF NOT EXISTS liquidaciones (
    id SERIAL PRIMARY KEY,
    referido_id INT REFERENCES referidos(id),
    total DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pagada',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pagada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS liquidacion_id INT REFERENCES liquidaciones(id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_referido_id ON liquidaciones(referido_id);

-- 7. Sincronizar secuencias
SELECT setval('referidos_id_seq', (SELECT GREATEST(MAX(id), 1) FROM referidos));
SELECT setval('usuarios_id_seq', (SELECT GREATEST(MAX(id), 1) FROM usuarios));
