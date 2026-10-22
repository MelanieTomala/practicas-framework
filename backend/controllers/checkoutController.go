package controllers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// CheckoutController gestiona el flujo transaccional de pedidos con seguridad e invalidación de caché
type CheckoutController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewCheckoutController crea una nueva instancia inyectando el repositorio y la caché
func NewCheckoutController(repo repository.DBRepository, cache repository.CacheRepository) *CheckoutController {
	return &CheckoutController{
		repo:  repo,
		cache: cache,
	}
}

// ProcessCheckout procesa la compra transaccional ACID tomando la identidad del JWT
func (ctrl *CheckoutController) ProcessCheckout(c *fiber.Ctx) error {
	isDev := os.Getenv("APP_ENV") == "dev"

	// 1. Identidad estricta desde el token autenticado
	authEmail, ok := c.Locals("email").(string)
	if !ok || authEmail == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
			Status:  fiber.StatusUnauthorized,
			Message: "No autorizado: identidad de token no disponible",
		})
	}

	var usuarioID *int
	if subStr, ok := c.Locals("sub").(string); ok && subStr != "" {
		if id, err := strconv.Atoi(subStr); err == nil {
			usuarioID = &id
		}
	}

	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de la petición inválido",
			Details: details,
		})
	}

	req.Cliente.Email = authEmail
	req.UsuarioID = usuarioID

	if len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "El carrito no contiene items para procesar",
		})
	}

	if req.Cliente.Nombre == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "El nombre del cliente es obligatorio",
		})
	}

	// 2. Ejecutar la transacción ACID en PostgreSQL (descuenta stock, crea pedido y registra comisiones en ledger)
	pedido, err := ctrl.repo.CrearPedido(&req, authEmail, usuarioID)
	if err != nil {
		log.Printf("[ACID ROLLBACK] Transacción revertida. Error: %v\n", err)

		var details interface{}
		if isDev {
			details = err.Error()
		}

		if errors.Is(err, repository.ErrCantidadInvalida) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: "cantidad debe ser mayor que cero",
				Details: details,
			})
		}

		if errors.Is(err, repository.ErrStockInsuficiente) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: err.Error(),
				Details: details,
			})
		}

		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al registrar el pedido (Transacción revertida por ROLLBACK)",
			Details: details,
		})
	}

	// 3. Invalidación de caché en Redis: productos:all y red:tree:*
	if ctrl.cache != nil {
		go func(email string) {
			ctx := context.Background()
			_ = ctrl.cache.Delete(ctx, "productos:all")
			_ = ctrl.cache.Delete(ctx, fmt.Sprintf("red:tree:%s", email))
			_ = ctrl.cache.Delete(ctx, "red:tree:admin@upse.edu.ec")
			log.Printf("[CACHE INVALIDATION] Claves 'productos:all', 'red:tree:%s' y 'red:tree:admin@upse.edu.ec' invalidadas en Redis\n", email)
		}(authEmail)
	}

	return c.Status(fiber.StatusCreated).JSON(pedido)
}
