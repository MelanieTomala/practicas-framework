# PROJECT_MAP.md

## Estructura General

- **`fronted/`**: Aplicación Frontend construida con React 19, Vite, Tailwind CSS y React Router v7. Contiene las vistas del catálogo, carrito y red multinivel.
  - `src/components/`: Componentes de interfaz de usuario (Login, Catalogo, Carrito, etc.).
  - `src/context/`: Estado global de la aplicación (Autenticación y Carrito).
  - `src/data/`: Mock de datos (productos, red multinivel).
  - `src/services/`: Capa de servicios simulada para obtención de datos.
  - `src/App.tsx` / `main.tsx`: Punto de entrada y configuración de rutas.

- **`backend/`**: API REST construida con Go y el framework Fiber.
  - `config/`: Configuración y conexiones a PostgreSQL (`db.go`) y Redis (`redis.go`).
  - `controllers/`: Lógica de negocio y controladores desacoplados (`authController.go`, `prodController.go`, `redController.go`, `checkoutController.go`).
  - `database/`: Scripts SQL de inicialización (`init.sql` con usuarios, productos, referidos, pedidos y pedido_items).
  - `models/`: Estructuras de datos de la API (Auth, Catálogo, Red, Checkout, Errores).
  - `repository/`: Capa de persistencia con interfaces (`DBRepository`, `CacheRepository`) e implementaciones PostgreSQL y Redis.
  - `routes/`: Definición de endpoints de la aplicación con inyección de controladores (`routes.go`).
  - `main.go`: Punto de entrada del backend y orquestación del grafo de dependencias.
  - `docker-compose.yml`: Orquestación de contenedores PostgreSQL, Redis y backend.

- **Raíz del Proyecto y Documentación**:
  - `Guia_Practica_Tema5_leccion.md`: Guía de la Práctica 3 con pasos de implementación paso a paso.
  - `Fase 1.ipynb`, `Fase 2.ipynb`, `Fase 3.ipynb`, `Fase 4.ipynb`: Cuadernos Jupyter con directivas e instrucciones de cada fase arquitectónica.


