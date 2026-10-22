package controllers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/config"
	"multicatalogo-backend/models"
)

// HealthController gestiona el diagnóstico de disponibilidad del microservicio
type HealthController struct{}

// NewHealthController crea una nueva instancia de HealthController
func NewHealthController() *HealthController {
	return &HealthController{}
}

// Check valida la conectividad hacia PostgreSQL (503 si falla) y Redis ("degraded" si falla)
func (ctrl *HealthController) Check(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
	defer cancel()

	pgStatus := "ok"
	redisStatus := "ok"

	// 1. Ping a PostgreSQL
	if config.DB == nil || config.DB.PingContext(ctx) != nil {
		pgStatus = "down"
	}

	// 2. Ping a Redis
	if config.RedisClient == nil || config.RedisClient.Ping(ctx).Err() != nil {
		redisStatus = "down"
	}

	// Si PostgreSQL cae, el núcleo no puede operar -> HTTP 503
	if pgStatus == "down" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(models.APIError{
			Status:  fiber.StatusServiceUnavailable,
			Message: "Servicio no disponible: PostgreSQL fuera de línea",
			Details: fiber.Map{
				"postgres": pgStatus,
				"redis":    redisStatus,
			},
		})
	}

	// Si Redis cae pero PostgreSQL opera, el sistema degrada sin caché -> HTTP 200 degraded
	statusGeneral := "ok"
	if redisStatus == "down" {
		statusGeneral = "degraded"
	}

	return c.JSON(fiber.Map{
		"status":   statusGeneral,
		"postgres": pgStatus,
		"redis":    redisStatus,
		"message":  "Diagnóstico de dependencias completado",
	})
}

// HealthCheck mantiene compatibilidad con invocaciones directas
func HealthCheck(c *fiber.Ctx) error {
	return NewHealthController().Check(c)
}
