-- 002_checkout.sql
-- Migración para el soporte transaccional de pedidos e ítems
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    cliente_ciudad VARCHAR(255) NOT NULL,
    cliente_direccion VARCHAR(255),
    cliente_telefono VARCHAR(50),
    metodo_pago VARCHAR(100) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    usuario_id INT REFERENCES usuarios(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id),
    nombre VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL
);
