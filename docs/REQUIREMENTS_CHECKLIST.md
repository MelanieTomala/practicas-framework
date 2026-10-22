# REQUIREMENTS CHECKLIST — MultiCatálogo

> Fuente de verdad del progreso. Leer al inicio de cada sesión; marcar `- [x]`
> y actualizar "Estado General" al completar cualquier tarea.
>
> **Estructura:** el documento se divide en fases por **Unidad/Tema del sílabo**
> (`Silabo_Framework_Programacion_Web.md`). Cada fase trae un comentario con lo
> que se hará en esa clase. El producto integrador es UNO: MultiCatálogo —
> una tienda cosmética con red de ventas multinivel (MLM) que crece como
> **sistema políglota**: React (front) + Go/Fiber (núcleo transaccional, U2)
> + FastAPI (capa SaaS/multitenant, U3), desplegado contenerizado (U4).
>
> **Principios rectores (aplican a toda fase):**
> - Seguridad por defecto: ningún endpoint nuevo nace sin auth ni validación.
> - Inyección de dependencias: interfaces en los bordes; globals solo en el entry point.
> - Funciones puras para el dominio (comisiones, totales, validadores) — testeables sin I/O.
> - Mobile-first: UI a 360px, touch ≥44px, un campo por fila en formularios.

## Estado General

| Ítem | Valor |
|---|---|
| **Hito actual** | **Unidades 1 y 2 completadas y verificadas al 100%** (Frontend completo con Registro MLM `?ref=`, Gestión Catálogo, Gestión Pedidos, Historial `/mis-pedidos`, Mi Red con código de patrocinador y ledger de comisiones, Liquidaciones administrativas y Dashboard financiero real. Backend Go/Fiber con ACID `FOR UPDATE`, ledger transaccional de comisiones, reversión transaccional en cancelación, Cache-Aside Redis, bcrypt y JWT). |
| **Última tarea completada** | Implementación y verificación de la PWA (Fases PWA-F1 a PWA-F5): VitePWA con Service Worker Workbox, Web App Manifest con iconos generados (192, 512, maskable, apple), pre-caching de App Shell, runtime caching de API/imágenes, hook useOnlineStatus, OfflineBanner, prompt PwaInstallPrompt y endurecimiento de Checkout sin conexión. Build y lint limpios (2026-10-22) |
| **Siguiente tarea pendiente** | Auditoría final Lighthouse PWA en navegador; luego U3-T1: scaffold FastAPI `Unidad3_SaaS/` |
| **Bloqueadores** | Ninguno. Contenedores `postgres_multicatalogo` y `redis_multicatalogo` operativos, Vite dev server y Go/Fiber activos y verificados. |

## Arquitectura objetivo del semestre

```
React SPA (:5173) ──► Caddy/Nginx (U4: proxy inverso + SSL)
                        ├─ /api/tx/*   → Go/Fiber  :3000  — núcleo transaccional (U2)
                        └─ /api/saas/* → FastAPI   :8000  — capa SaaS/multitenant (U3)
                                            │
                          PostgreSQL 16 (:5434) + Redis (:6379)
```

---

# UNIDAD 1 — FRAMEWORKS FRONTEND (SPA React + Vite + Tailwind)

## U1-T1 · Introducción a frameworks web y arquitectura de soluciones

> Se presenta la pila tecnológica del semestre, la inversión de control y los
> lineamientos del producto integrador MultiCatálogo (tienda + red MLM).

- [x] Pila definida y workspace estructurado (`fronted/`, `backend/`)

## U1-T2 · Entorno SPA con Vite + Tailwind CSS

> Scaffold del frontend: empaquetador Vite, Tailwind v4, estructura de carpetas
> por responsabilidad (`components/`, `context/`, `services/`, `data/`).

- [x] Entorno SPA con Vite + Tailwind CSS
- [x] `package.json` renombrado a `multicatalogo-frontend`
- [x] `VITE_API_URL` en `.env` + `import.meta.env` (cliente único en `services/http.ts`)

## U1-T3 · Componentes y gestión de estado global

> Estado global con React Context: sesión de usuario y carrito por usuario.

- [x] `AuthContext` (sesión `{email, rol}`) y `CartContext` (carrito en localStorage por email)
- [x] Persistencia de sesión en `AuthContext` (`multicatalogo_sesion`: usuario + JWT en localStorage)
- [x] Warnings eslint resueltos: split `context/auth.ts` + `context/cart.ts` (hooks/tipos separados del Provider); `npm run lint` → 0 errores, 0 warnings

## U1-T4 · Consumo de API RESTful y enrutamiento

> Promesas con fetch, capa de servicios desacoplada y guardas de ruta por rol.

- [x] `services/productosService.ts`, `redService.ts` + guardas `ProtectedRoute`/`AdminRoute`
- [x] `services/http.ts`: `apiFetch` único con `Authorization: Bearer` automático, `ApiError` tipado con status y helpers de sesión

## U1-T5 · Interfaces full-screen y flujos MLM (Práctica 03)

> Vistas inmersivas del catálogo y flujo completo de compra y red multinivel.

- [x] F8 Login con rol + redirección por rol
- [x] F1 Storefront `/tienda` full-screen | F3 Catálogo con búsqueda/filtros | F2 Detalle `/producto/:id` | F4 Lightbox
- [x] F5 Carrito + checkout + confirmación | F6 Árbol multinivel comisiones 10/5/2 % | F7 Dashboard KPIs
- [x] `Checkout.tsx` → `POST /api/checkout` real (sin simulación) + manejo de `APIError`
- [x] Audit mobile-first: 375px sin overflow en Dashboard/MiRed/Catálogo; botones de acción ≥44px (`Añadir al Carrito`, steppers de `Carrito`, `Cerrar Sesión`)

---

# UNIDAD 2 — BACKEND ALTA TRANSACCIONALIDAD (Go/Fiber · "entornos bancarios")

## U2-T1 · Rendimiento, memoria y concurrencia

> Goroutines y contextos: procesos de misión crítica que no bloquean la respuesta HTTP.

- [x] Goroutine `procesarComisiones` tras el COMMIT del pedido (contexto propio, no el del request)

## U2-T2 · Microservicios y APIs robustas (Fiber)

> API REST en capas con contrato de error estándar y configuración por entorno.

- [x] Capas routes → controllers → repository; endpoints login/productos/red/health
- [x] `APIError{status,message,details}` en todos los errores + validación de entrada (400/404)
- [x] Puerto de escucha configurable (`PORT`, defecto 3000)
- [x] `/api/health` real: `HealthController` con ping a Postgres (503 si cae) y Redis (`"degraded"` si cae)

## U2-T3 · Persistencia PostgreSQL + caché Redis

> Dockeriza la BD, SQL puro con pgx, reconstrucción del árbol y Cache-Aside.

- [x] `docker-compose` Postgres 16 + Redis alpine + volumen + healthchecks
- [x] `init.sql` (usuarios/productos/referidos + seed), `repository.go` a SQL real, árbol por `parent_id`
- [x] Cache-Aside: `productos:all` TTL 5 min, `red:tree:{email}` TTL 10 min, degradación sin caché
- [x] Índices: `referidos(parent_id)`, `pedidos(cliente_email)`, `pedido_items(pedido_id)`, `productos(categoria)` (migración `003_seguridad.sql` + init.sql)
- [x] Errores propagados: firmas del repo devuelven `error`; `ErrNoEncontrado`→404/401, resto→500 (nunca lista vacía silenciosa)

## U2-T4 · Inyección de dependencias y microservicio seguro

> DI por interfaces en toda la cadena + transacción ACID del checkout + hardening.

- [x] Interfaces `DBRepository`/`CacheRepository`; `PostgresRepository`/`RedisCache`; structs de controladores; `NewControllers` en `main.go`
- [x] `POST /api/checkout` ACID: `FOR UPDATE` + descuento de stock + `pedidos`/`pedido_items`, ROLLBACK → 400/500, total recalculado en servidor
- [x] Invalidación de caché tras compra (`productos:all`, `red:tree:*`) + migración `002_checkout.sql`
- [x] bcrypt de passwords (pgcrypto `crypt()/gen_salt('bf')` en migración `003_seguridad.sql` + seed; login con `CompareHashAndPassword`)
- [x] JWT real (`JWT_SECRET` en env, claims `{sub,email,rol,iat,exp}` 2h, HS256) + `middleware.RequireAuth(secret)`/`RequireAdmin()`
- [x] Protegidos `/api/red` y `/api/checkout` con el middleware (401 sin token / token adulterado)
- [x] Checkout toma la identidad del TOKEN (`c.Locals` desde claims) — verificado: `email` falso en body NO se persiste ni atribuye comisiones
- [x] Errores sanitizados: `Details` solo con `APP_ENV=dev`; `ErrCantidadInvalida` propio (400 "cantidad debe ser mayor que cero", distinto de stock)

---

# PWA — PROGRESSIVE WEB APP (OFFLINE-FIRST & INSTALABILIDAD)

## PWA-F1 · Entorno, dependencias y tooling
> Integración de herramientas PWA en el pipeline de build de Vite (`vite-plugin-pwa` + Workbox).

- [x] Instalación de `vite-plugin-pwa` en `fronted/package.json`
- [x] Configuración base en `vite.config.ts` (estrategia `generateSW`, modo `autoUpdate`)
- [x] Declaración de tipos de cliente PWA en `tsconfig.app.json` (`vite-plugin-pwa/client`)

## PWA-F2 · Web App Manifest y activos visuales
> Definición de la identidad instalable de la aplicación, metadatos y juego de iconos reglamentarios.

- [x] Generación de iconos estándar en `public/`: `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png` y `pwa-64x64.png`
- [x] Configuración del Web App Manifest (`manifest.webmanifest`) en `vite.config.ts` (`name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, `scope`, `start_url`, `icons`)
- [x] Inclusión de meta tags PWA en `index.html` (`theme-color`, `apple-touch-icon`, `mobile-web-app-capable`, `lang="es"`)

## PWA-F3 · Service Worker y estrategias de almacenamiento en caché
> Configuración de Workbox para pre-caching del App Shell y runtime caching granular de assets y APIs.

- [x] Registro del Service Worker en el ciclo de vida de React (`src/main.tsx` vía `virtual:pwa-register`)
- [x] Pre-caching del App Shell (HTML, bundles JS/CSS, fuentes de Google Fonts e iconos)
- [x] Runtime caching para imágenes estáticas (estrategia `StaleWhileRevalidate` con límite de 60 entradas y TTL 30 días)
- [x] Runtime caching para catálogo de productos (`/api/productos` con `NetworkFirst` timeout 4s y fallback a caché para navegación offline)

## PWA-F4 · Resiliencia offline y experiencia de usuario (UI/UX)
> Componentes de feedback visual para estado de red, avisos de sincronización y prompt de instalación.

- [x] Hook de conectividad (`useOnlineStatus`) para detectar transiciones online/offline
- [x] Banner persistente `OfflineBanner` alertando sobre el modo sin conexión y protección transaccional
- [x] Prompt personalizado `PwaInstallPrompt` capturando el evento nativo `beforeinstallprompt`
- [x] Bloqueo transaccional en `Checkout.tsx` con advertencia clara cuando no hay red disponible

## PWA-F5 · Auditoría, verificación y validación Lighthouse
> Pruebas de instalación, ciclo de vida del Service Worker y cumplimiento de estándares PWA.

- [x] Generación exitosa de Service Worker (`dist/sw.js`) y Workbox runtime con 19 entradas precacheadas
- [x] Emisión validada de `dist/manifest.webmanifest` con iconos enlazados
- [x] Build de producción (`npm run build`) y linter (`npm run lint`) limpios (0 errores, 0 warnings)
