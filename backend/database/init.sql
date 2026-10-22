-- init.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS referidos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    nivel INT NOT NULL,
    ventas DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    parent_id INT REFERENCES referidos(id),
    codigo VARCHAR(50) UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT true,
    referido_id INT REFERENCES referidos(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 100,
    categoria VARCHAR(100),
    img TEXT,
    galeria JSONB,
    activo BOOLEAN DEFAULT true
);

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
    estado VARCHAR(50) DEFAULT 'pendiente',
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

CREATE TABLE IF NOT EXISTS liquidaciones (
    id SERIAL PRIMARY KEY,
    referido_id INT REFERENCES referidos(id),
    total DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pagada',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pagada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comisiones (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    referido_id INT REFERENCES referidos(id),
    nivel INT NOT NULL,
    porcentaje DECIMAL(5, 2) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    liquidacion_id INT REFERENCES liquidaciones(id)
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_referidos_parent_id ON referidos(parent_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_comisiones_referido_id ON comisiones(referido_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_pedido_id ON comisiones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_referido_id ON liquidaciones(referido_id);

-- Red multinivel inicial
INSERT INTO referidos (id, nombre, nivel, ventas, parent_id, codigo) VALUES
(1, 'Juan (Top)', 1, 1000.00, NULL, 'JUAN'),
(2, 'Maria (Nivel 2)', 2, 500.00, 1, 'MARIA'),
(3, 'Pedro (Nivel 2)', 2, 300.00, 1, 'PEDRO'),
(4, 'Luis (Nivel 3)', 3, 150.00, 2, 'LUIS')
ON CONFLICT (id) DO UPDATE SET codigo = EXCLUDED.codigo;

SELECT setval('referidos_id_seq', (SELECT GREATEST(MAX(id), 1) FROM referidos));

-- Datos semilla: usuarios con passwords encriptados con bcrypt
INSERT INTO usuarios (id, nombre, email, password, rol, activo, referido_id) VALUES
(1, 'Administrador', 'admin@upse.edu.ec', crypt('123456', gen_salt('bf')), 'admin', true, 1),
(2, 'Luis Poveda', 'cliente@upse.edu.ec', crypt('123456', gen_salt('bf')), 'cliente', true, 4)
ON CONFLICT (email) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    activo = EXCLUDED.activo,
    referido_id = EXCLUDED.referido_id;

SELECT setval('usuarios_id_seq', (SELECT GREATEST(MAX(id), 1) FROM usuarios));

-- Catálogo de productos completo
INSERT INTO productos (id, nombre, descripcion, precio, stock, categoria, img, galeria, activo) VALUES
(1, 'Serum Revitalizante', 'Serum concentrado con vitamina C y ácido hialurónico.', 45.00, 100, 'Serum', 'https://picsum.photos/seed/serum/600', '["https://picsum.photos/seed/serum1/600","https://picsum.photos/seed/serum2/600","https://picsum.photos/seed/serum3/600"]'::jsonb, true),
(2, 'Crema Hidratante Pro', 'Crema facial ligera con niacinamida y manteca de karité.', 32.50, 80, 'Crema', 'https://picsum.photos/seed/crema/600', '["https://picsum.photos/seed/crema1/600","https://picsum.photos/seed/crema2/600","https://picsum.photos/seed/crema3/600"]'::jsonb, true),
(3, 'Tónico Purificante', 'Tónico sin alcohol con hamamelis y agua de rosas.', 28.00, 95, 'Tónico', 'https://picsum.photos/seed/tonico/600', '["https://picsum.photos/seed/tonico1/600","https://picsum.photos/seed/tonico2/600","https://picsum.photos/seed/tonico3/600"]'::jsonb, true),
(4, 'Mascarilla Nocturna', 'Mascarilla con colágeno y vitamina E para reparar de noche.', 50.00, 60, 'Mascarilla', 'https://picsum.photos/seed/mascarilla/600', '["https://picsum.photos/seed/mascarilla1/600","https://picsum.photos/seed/mascarilla2/600","https://picsum.photos/seed/mascarilla3/600"]'::jsonb, true),
(5, 'Serum Anti-Edad Retinol', 'Serum con retinol encapsulado para mejorar firmeza.', 58.00, 50, 'Serum', 'https://picsum.photos/seed/retinol/600', '["https://picsum.photos/seed/retinol1/600","https://picsum.photos/seed/retinol2/600","https://picsum.photos/seed/retinol3/600"]'::jsonb, true),
(6, 'Crema Contorno de Ojos', 'Contorno de ojos con cafeína y péptidos.', 26.00, 75, 'Crema', 'https://picsum.photos/seed/ojos/600', '["https://picsum.photos/seed/ojos1/600","https://picsum.photos/seed/ojos2/600","https://picsum.photos/seed/ojos3/600"]'::jsonb, true),
(7, 'Tónico Exfoliante AHA-BHA', 'Exfoliación química suave con ácidos AHA y BHA.', 34.00, 45, 'Tónico', 'https://picsum.photos/seed/exfoliante/600', '["https://picsum.photos/seed/exfoliante1/600","https://picsum.photos/seed/exfoliante2/600","https://picsum.photos/seed/exfoliante3/600"]'::jsonb, true),
(8, 'Kit Rutina Completa', 'Kit integral con serum, crema, tónico y mascarilla.', 129.00, 30, 'Kit', 'https://picsum.photos/seed/kit/600', '["https://picsum.photos/seed/kit1/600","https://picsum.photos/seed/kit2/600","https://picsum.photos/seed/kit3/600"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET 
    descripcion = EXCLUDED.descripcion,
    precio = EXCLUDED.precio,
    stock = EXCLUDED.stock,
    categoria = EXCLUDED.categoria,
    img = EXCLUDED.img,
    galeria = EXCLUDED.galeria,
    activo = EXCLUDED.activo;

SELECT setval('productos_id_seq', (SELECT GREATEST(MAX(id), 1) FROM productos));
