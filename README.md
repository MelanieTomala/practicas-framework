# MultiCatálogo Melanie — MLM & Cosmética (PWA)

Plataforma de ventas por catálogo multinivel y gestión back-office desarrollada con arquitectura desacoplada, soporte offline First PWA, backend en Go y base de datos relacional con caché en memoria.

---

## Estructura del Repositorio

```text
├── backend/                  # API REST en Go (Fiber / Net/HTTP), PostgreSQL y Redis
├── fronted/                  # SPA / PWA en React 19 + TypeScript + Vite + Tailwind CSS
├── docs/                     # Análisis funcional, planes de implementación y guías
│   ├── ANALISIS_FUNCIONAL_U2.md
│   ├── PLAN_IMPLEMENTACION_U2.md
│   ├── PROJECT_MAP.md
│   ├── REQUIREMENTS_CHECKLIST.md
│   └── Guia_Practica_Tema5_leccion.md
├── notebooks/                # Cuadernos Jupyter y experimentos de optimización
│   ├── AhorroTokens.ipynb
│   ├── Fase 1.ipynb
│   ├── Fase 2.ipynb
│   ├── Fase 3.ipynb
│   └── Fase 4.ipynb
├── docker-compose.prod.yml   # Orquestación de producción (Docker)
└── .gitignore                # Reglas de exclusión de git
```

---

## Características Principales

- **PWA Offline-First**: Instalación como aplicación nativa, caché de activos con Workbox Service Worker, catálogo offline y autenticación persistente con bóveda local.
- **Red Multinivel (MLM)**: Gestión de árbol unilevel, cálculo de comisiones por rangos y volumen grupal.
- **Back-Office Administrativo**: Gestión de productos, pedidos, liquidaciones y visualización gráfica de red.
- **Stack Técnico**:
  - **Backend**: Go 1.24+, PostgreSQL 16, Redis 7.
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4.
  - **Despliegue**: Docker, Nginx Alpine, Docker Compose.

---

## Documentación Detallada

Consultá la carpeta [`docs/`](./docs/) para los requerimientos funcionales, guías de práctica y mapas de arquitectura.
