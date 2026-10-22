package routes

import (
	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/controllers"
	"multicatalogo-backend/middleware"
)

// AppControllers agrupa todos los controladores con sus dependencias inyectadas
type AppControllers struct {
	Auth          *controllers.AuthController
	Product       *controllers.ProductController
	Red           *controllers.RedController
	Checkout      *controllers.CheckoutController
	Health        *controllers.HealthController
	Pedidos       *controllers.PedidosController
	Liquidaciones *controllers.LiquidacionesController
	Reportes      *controllers.ReportesController
}

// SetupRoutes registra los endpoints vinculándolos a los controladores con guardas RequireAuth y RequireAdmin
func SetupRoutes(app *fiber.App, ctrl *AppControllers, jwtSecret string) {
	// ==========================================
	// 1. ENDPOINTS PÚBLICOS
	// ==========================================
	app.Post("/api/login", ctrl.Auth.Login)
	app.Post("/api/register", ctrl.Auth.Register)
	app.Get("/api/productos", ctrl.Product.GetProductos)
	app.Get("/api/productos/:id", ctrl.Product.GetProductoPorID)
	app.Get("/api/health", ctrl.Health.Check)

	// Middlewares de seguridad
	authMw := middleware.RequireAuth(jwtSecret)
	adminMw := middleware.RequireAdmin()

	// ==========================================
	// 2. ENDPOINTS AUTENTICADOS (CLIENTE Y ADMIN)
	// ==========================================
	app.Post("/api/checkout", authMw, ctrl.Checkout.ProcessCheckout)
	app.Get("/api/pedidos/mios", authMw, ctrl.Pedidos.GetMisPedidos)
	app.Get("/api/pedidos/:id", authMw, ctrl.Pedidos.GetPedidoPorID)
	app.Get("/api/red/mia", authMw, ctrl.Red.GetRedMia)
	app.Get("/api/comisiones/mias", authMw, ctrl.Red.GetMisComisiones)
	app.Get("/api/liquidaciones/mias", authMw, ctrl.Liquidaciones.ListarMisLiquidaciones)

	// ==========================================
	// 3. ENDPOINTS EXCLUSIVOS DE ADMINISTRADOR
	// ==========================================
	// Catálogo administrativo
	app.Get("/api/admin/productos", authMw, adminMw, ctrl.Product.GetProductosAdmin)
	app.Post("/api/productos", authMw, adminMw, ctrl.Product.CreateProducto)
	app.Put("/api/productos/:id", authMw, adminMw, ctrl.Product.UpdateProducto)
	app.Delete("/api/productos/:id", authMw, adminMw, ctrl.Product.DeleteProducto)

	// Usuarios
	app.Get("/api/usuarios", authMw, adminMw, ctrl.Auth.GetUsuarios)
	app.Patch("/api/usuarios/:id", authMw, adminMw, ctrl.Auth.ToggleUsuario)

	// Gestión de pedidos
	app.Get("/api/pedidos", authMw, adminMw, ctrl.Pedidos.GetPedidosAdmin)
	app.Patch("/api/pedidos/:id/estado", authMw, adminMw, ctrl.Pedidos.UpdateEstadoPedido)

	// Red global
	app.Get("/api/red", authMw, adminMw, ctrl.Red.GetRed)

	// Liquidaciones
	app.Post("/api/liquidaciones", authMw, adminMw, ctrl.Liquidaciones.CrearLiquidacion)
	app.Get("/api/liquidaciones", authMw, adminMw, ctrl.Liquidaciones.ListarLiquidaciones)

	// Reportes y KPIs
	app.Get("/api/reportes/resumen", authMw, adminMw, ctrl.Reportes.GetResumen)
	app.Get("/api/reportes/top-productos", authMw, adminMw, ctrl.Reportes.GetTopProductos)
	app.Get("/api/reportes/top-referidos", authMw, adminMw, ctrl.Reportes.GetTopReferidos)
	app.Get("/api/reportes/comisiones-pendientes", authMw, adminMw, ctrl.Reportes.GetDeudaComisiones)
}