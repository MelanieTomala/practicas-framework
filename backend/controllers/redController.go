package controllers

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// RedController gestiona la jerarquía multinivel y comisiones con dependencias inyectadas
type RedController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewRedController crea una nueva instancia de RedController
func NewRedController(repo repository.DBRepository, cache repository.CacheRepository) *RedController {
	return &RedController{
		repo:  repo,
		cache: cache,
	}
}

// GetRed devuelve la jerarquía global de la red aplicando el patrón Cache-Aside (TTL 10m)
func (ctrl *RedController) GetRed(c *fiber.Ctx) error {
	ctx := c.Context()
	isDev := os.Getenv("APP_ENV") == "dev"

	authEmail, _ := c.Locals("email").(string)
	authRol, _ := c.Locals("rol").(string)

	email := authEmail
	if authRol == "admin" && c.Query("email") != "" {
		email = c.Query("email")
	}
	if email == "" {
		email = "admin@upse.edu.ec"
	}

	cacheKey := fmt.Sprintf("red:tree:%s", email)

	if ctrl.cache != nil {
		val, err := ctrl.cache.Get(ctx, cacheKey)
		if err == nil {
			var red []*models.Referido
			if err := json.Unmarshal([]byte(val), &red); err == nil {
				return c.JSON(red)
			}
		}
	}

	red, err := ctrl.repo.ObtenerRed()
	if err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener la red de referidos",
			Details: details,
		})
	}

	if ctrl.cache != nil {
		data, err := json.Marshal(red)
		if err == nil {
			_ = ctrl.cache.Set(ctx, cacheKey, data, 10*time.Minute)
		}
	}

	return c.JSON(red)
}

// GetRedMia devuelve el subárbol propio del usuario autenticado y su código de invitación
func (ctrl *RedController) GetRedMia(c *fiber.Ctx) error {
	authEmail, _ := c.Locals("email").(string)

	user, err := ctrl.repo.BuscarUsuarioPorEmail(authEmail)
	if err != nil || user.ReferidoID == nil {
		return c.Status(fiber.StatusNotFound).JSON(models.APIError{
			Status:  fiber.StatusNotFound,
			Message: "Nodo de red no asociado al usuario",
		})
	}

	subarbol, codigo, err := ctrl.repo.ObtenerRedUsuario(*user.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener red del usuario",
		})
	}

	return c.JSON(fiber.Map{
		"arbol":          subarbol,
		"codigoReferido": codigo,
		"linkInvitacion": fmt.Sprintf("/registro?ref=%s", codigo),
	})
}

// GetMisComisiones lista el ledger de comisiones devengadas por el distribuidor
func (ctrl *RedController) GetMisComisiones(c *fiber.Ctx) error {
	authEmail, _ := c.Locals("email").(string)

	user, err := ctrl.repo.BuscarUsuarioPorEmail(authEmail)
	if err != nil || user.ReferidoID == nil {
		return c.Status(fiber.StatusNotFound).JSON(models.APIError{
			Status:  fiber.StatusNotFound,
			Message: "No se encontró el nodo de distribuidor para este usuario",
		})
	}

	comisiones, totalPendiente, totalPagado, err := ctrl.repo.ObtenerComisionesUsuario(*user.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar comisiones",
		})
	}

	return c.JSON(fiber.Map{
		"comisiones":     comisiones,
		"totalPendiente": totalPendiente,
		"totalPagado":    totalPagado,
	})
}
