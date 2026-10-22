package controllers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// LiquidacionesController gestiona el pago consolidado de comisiones acumuladas
type LiquidacionesController struct {
	repo repository.DBRepository
}

// NewLiquidacionesController crea una nueva instancia de LiquidacionesController
func NewLiquidacionesController(repo repository.DBRepository) *LiquidacionesController {
	return &LiquidacionesController{repo: repo}
}

// CrearLiquidacion procesa y liquida las comisiones pendientes de un distribuidor
func (ctrl *LiquidacionesController) CrearLiquidacion(c *fiber.Ctx) error {
	var body struct {
		ReferidoID int `json:"referido_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.ReferidoID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "referido_id válido es obligatorio",
		})
	}

	liquidacion, err := ctrl.repo.CrearLiquidacion(body.ReferidoID)
	if err != nil {
		if errors.Is(err, repository.ErrSinComisiones) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: "El distribuidor no posee comisiones pendientes para liquidar",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al procesar la liquidación",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(liquidacion)
}

// ListarLiquidaciones devuelve el historial de desembolsos para administración
func (ctrl *LiquidacionesController) ListarLiquidaciones(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	pagina, err := ctrl.repo.ListarLiquidaciones(page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener historial de liquidaciones",
		})
	}
	return c.JSON(pagina)
}

// ListarMisLiquidaciones devuelve los pagos recibidos por el distribuidor autenticado
func (ctrl *LiquidacionesController) ListarMisLiquidaciones(c *fiber.Ctx) error {
	authEmail, _ := c.Locals("email").(string)

	user, err := ctrl.repo.BuscarUsuarioPorEmail(authEmail)
	if err != nil || user.ReferidoID == nil {
		return c.Status(fiber.StatusNotFound).JSON(models.APIError{
			Status:  fiber.StatusNotFound,
			Message: "Nodo de distribuidor no encontrado",
		})
	}

	liquidaciones, err := ctrl.repo.ListarLiquidacionesUsuario(*user.ReferidoID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar liquidaciones",
		})
	}

	return c.JSON(liquidaciones)
}
