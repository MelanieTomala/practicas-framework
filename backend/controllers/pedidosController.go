package controllers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// PedidosController gestiona la consulta y ciclo de vida de los pedidos
type PedidosController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewPedidosController crea una nueva instancia de PedidosController
func NewPedidosController(repo repository.DBRepository, cache repository.CacheRepository) *PedidosController {
	return &PedidosController{
		repo:  repo,
		cache: cache,
	}
}

// GetMisPedidos devuelve el historial paginado de pedidos del usuario autenticado
func (ctrl *PedidosController) GetMisPedidos(c *fiber.Ctx) error {
	email, _ := c.Locals("email").(string)
	var usuarioID int
	if subStr, ok := c.Locals("sub").(string); ok && subStr != "" {
		usuarioID, _ = strconv.Atoi(subStr)
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	pagina, err := ctrl.repo.ObtenerPedidosUsuario(usuarioID, email, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener historial de pedidos",
		})
	}
	return c.JSON(pagina)
}

// GetPedidosAdmin lista todos los pedidos del sistema con filtro de estado para el administrador
func (ctrl *PedidosController) GetPedidosAdmin(c *fiber.Ctx) error {
	estado := c.Query("estado", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	pagina, err := ctrl.repo.ObtenerTodosLosPedidos(estado, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener lista de pedidos",
		})
	}
	return c.JSON(pagina)
}

// GetPedidoPorID obtiene el detalle de un pedido verificando pertenencia
func (ctrl *PedidosController) GetPedidoPorID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de pedido inválido",
		})
	}

	pedido, err := ctrl.repo.ObtenerPedidoPorID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Pedido no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar el pedido",
		})
	}

	// Verificar pertenencia si no es admin
	authRol, _ := c.Locals("rol").(string)
	authEmail, _ := c.Locals("email").(string)
	if authRol != "admin" && pedido.Cliente.Email != authEmail {
		return c.Status(fiber.StatusForbidden).JSON(models.APIError{
			Status:  fiber.StatusForbidden,
			Message: "No tiene permisos para ver este pedido",
		})
	}

	return c.JSON(pedido)
}

// UpdateEstadoPedido actualiza el estado del pedido y ejecuta la reversión transaccional si se cancela
func (ctrl *PedidosController) UpdateEstadoPedido(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de pedido inválido",
		})
	}

	var body struct {
		Estado string `json:"estado"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
		})
	}

	if err := ctrl.repo.ActualizarEstadoPedido(id, body.Estado); err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Pedido no encontrado",
			})
		}
		if errors.Is(err, repository.ErrTransicionInvalida) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: fmt.Sprintf("Error al cambiar estado del pedido: %v", err),
		})
	}

	// Si se canceló el pedido, invalidar caché de catálogo y redes en Redis
	if body.Estado == "cancelado" && ctrl.cache != nil {
		ctx := context.Background()
		_ = ctrl.cache.Delete(ctx, "productos:all")
		_ = ctrl.cache.Delete(ctx, "red:tree:admin@upse.edu.ec")
		log.Println("[CACHE INVALIDATION] Clave 'productos:all' invalidada tras cancelación de pedido")
	}

	return c.JSON(fiber.Map{
		"mensaje": fmt.Sprintf("Estado del pedido actualizado a '%s'", body.Estado),
		"estado":  body.Estado,
	})
}
