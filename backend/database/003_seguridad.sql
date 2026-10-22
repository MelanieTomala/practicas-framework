-- 003_seguridad.sql
-- Habilitar pgcrypto, hashear passwords existentes con bcrypt e índices de optimización

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encriptar contraseñas de usuarios existentes con bcrypt
UPDATE usuarios 
SET password = crypt('123456', gen_salt('bf'))
WHERE password = '123456';

-- Índices solicitados en requisitos
CREATE INDEX IF NOT EXISTS idx_referidos_parent_id ON referidos(parent_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
