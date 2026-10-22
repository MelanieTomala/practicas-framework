package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"multicatalogo-backend/config"
	"multicatalogo-backend/controllers"
	"multicatalogo-backend/repository"
	"multicatalogo-backend/routes"
)

func main() {
	// Inicializar la conexión a la base de datos PostgreSQL
	config.ConnectDB()
	defer config.CloseDB()

	// Inicializar la conexión a Redis
	config.ConnectRedis()
	defer config.CloseRedis()

	// Configuración de entorno
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "secret-multicatalogo-key-2026"
	}

	// Inyección de Dependencias
	dbRepo := repository.NewPostgresRepository(config.DB)
	cacheRepo := repository.NewRedisCacheRepository(config.RedisClient)

	appControllers := &routes.AppControllers{
		Auth:          controllers.NewAuthController(dbRepo, jwtSecret),
		Product:       controllers.NewProductController(dbRepo, cacheRepo),
		Red:           controllers.NewRedController(dbRepo, cacheRepo),
		Checkout:      controllers.NewCheckoutController(dbRepo, cacheRepo),
		Health:        controllers.NewHealthController(),
		Pedidos:       controllers.NewPedidosController(dbRepo, cacheRepo),
		Liquidaciones: controllers.NewLiquidacionesController(dbRepo),
		Reportes:      controllers.NewReportesController(dbRepo),
	}

	app := fiber.New()

	// Middleware CORS con Authorization habilitado para JWT
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-User-Email",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Registro de endpoints desacoplados
	routes.SetupRoutes(app, appControllers, jwtSecret)

	// Servidor en el puerto configurable
	log.Printf("[INICIO] Servidor MultiCatálogo Go/Fiber listo en puerto :%s", port)
	if err := app.Listen(fmt.Sprintf(":%s", port)); err != nil {
		log.Fatalf("Error al arrancar servidor: %v", err)
	}
}