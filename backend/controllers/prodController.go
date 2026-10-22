package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ProductController gestiona el catálogo de productos con dependencias inyectadas
type ProductController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

// NewProductController crea una nueva instancia de ProductController
func NewProductController(repo repository.DBRepository, cache repository.CacheRepository) *ProductController {
	return &ProductController{
		repo:  repo,
		cache: cache,
	}
}

// GetProductos devuelve la lista de productos activos aplicando el patrón Cache-Aside (TTL 5m)
func (ctrl *ProductController) GetProductos(c *fiber.Ctx) error {
	ctx := c.Context()
	cacheKey := "productos:all"
	isDev := os.Getenv("APP_ENV") == "dev"

	if ctrl.cache != nil {
		val, err := ctrl.cache.Get(ctx, cacheKey)
		if err == nil {
			var productos []models.Producto
			if err := json.Unmarshal([]byte(val), &productos); err == nil {
				return c.JSON(productos)
			}
		}
	}

	productos, err := ctrl.repo.ObtenerProductos()
	if err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener productos",
			Details: details,
		})
	}

	if ctrl.cache != nil {
		data, err := json.Marshal(productos)
		if err == nil {
			_ = ctrl.cache.Set(ctx, cacheKey, data, 5*time.Minute)
		}
	}

	return c.JSON(productos)
}

// GetProductosAdmin lista todos los productos (activos e inactivos) con búsqueda y paginación
func (ctrl *ProductController) GetProductosAdmin(c *fiber.Ctx) error {
	q := c.Query("q", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	pagina, err := ctrl.repo.ObtenerProductosAdmin(q, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener catálogo administrativo",
		})
	}
	return c.JSON(pagina)
}

// GetProductoPorID busca un producto específico por su ID
func (ctrl *ProductController) GetProductoPorID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	isDev := os.Getenv("APP_ENV") == "dev"

	id, err := strconv.Atoi(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "El ID debe ser un número entero válido",
		})
	}

	p, err := ctrl.repo.ObtenerProductoPorID(id)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Producto no encontrado",
			})
		}
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al buscar el producto",
			Details: details,
		})
	}

	return c.JSON(p)
}

// CreateProducto registra un nuevo producto en PostgreSQL e invalida la caché
func (ctrl *ProductController) CreateProducto(c *fiber.Ctx) error {
	var p models.Producto
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de producto inválido",
		})
	}

	if p.Nombre == "" || p.Precio <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "El nombre y un precio mayor a 0 son obligatorios",
		})
	}

	if p.Img == "" {
		p.Img = "https://picsum.photos/seed/default/600"
	}
	if p.Galeria == nil {
		p.Galeria = []string{p.Img}
	}

	creado, err := ctrl.repo.CrearProducto(&p)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al crear el producto",
		})
	}

	// Invalidar caché en Redis
	if ctrl.cache != nil {
		_ = ctrl.cache.Delete(context.Background(), "productos:all")
		log.Println("[CACHE INVALIDATION] Clave 'productos:all' invalidada tras crear producto")
	}

	return c.Status(fiber.StatusCreated).JSON(creado)
}

// UpdateProducto actualiza un producto existente e invalida la caché
func (ctrl *ProductController) UpdateProducto(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de producto inválido",
		})
	}

	var p models.Producto
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de producto inválido",
		})
	}

	actualizado, err := ctrl.repo.ActualizarProducto(id, &p)
	if err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Producto no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al actualizar producto",
		})
	}

	// Invalidar caché en Redis
	if ctrl.cache != nil {
		_ = ctrl.cache.Delete(context.Background(), "productos:all")
		log.Println("[CACHE INVALIDATION] Clave 'productos:all' invalidada tras actualizar producto")
	}

	return c.JSON(actualizado)
}

// DeleteProducto ejecuta el borrado lógico de un producto (activo=false) e invalida la caché
func (ctrl *ProductController) DeleteProducto(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de producto inválido",
		})
	}

	if err := ctrl.repo.DesactivarProducto(id); err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Producto no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al desactivar producto",
		})
	}

	// Invalidar caché en Redis
	if ctrl.cache != nil {
		_ = ctrl.cache.Delete(context.Background(), "productos:all")
		log.Println("[CACHE INVALIDATION] Clave 'productos:all' invalidada tras desactivar producto")
	}

	return c.JSON(fiber.Map{
		"mensaje": "Producto desactivado correctamente (borrado lógico)",
	})
}