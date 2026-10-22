package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ReportesController entrega agregaciones y métricas para el Dashboard administrativo
type ReportesController struct {
	repo repository.DBRepository
}

// NewReportesController crea una nueva instancia de ReportesController
func NewReportesController(repo repository.DBRepository) *ReportesController {
	return &ReportesController{repo: repo}
}

// GetResumen entrega los KPIs globales de ventas, pedidos y comisiones
func (ctrl *ReportesController) GetResumen(c *fiber.Ctx) error {
	desde := c.Query("desde", "")
	hasta := c.Query("hasta", "")

	resumen, err := ctrl.repo.ObtenerResumenReportes(desde, hasta)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al generar resumen financiero",
		})
	}
	return c.JSON(resumen)
}

// GetTopProductos entrega los productos más vendidos en recaudación
func (ctrl *ReportesController) GetTopProductos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "5"))

	top, err := ctrl.repo.ObtenerTopProductos(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar top productos",
		})
	}
	return c.JSON(top)
}

// GetTopReferidos lista los distribuidores con mayor volumen de red
func (ctrl *ReportesController) GetTopReferidos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "5"))

	top, err := ctrl.repo.ObtenerTopReferidos(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar top referidos",
		})
	}
	return c.JSON(top)
}

// GetDeudaComisiones lista los distribuidores con comisiones pendientes de liquidación
func (ctrl *ReportesController) GetDeudaComisiones(c *fiber.Ctx) error {
	deuda, err := ctrl.repo.ObtenerDeudaComisiones()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al consultar deuda de comisiones",
		})
	}
	return c.JSON(deuda)
}
