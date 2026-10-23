package controllers

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// AuthController gestiona la autenticación, registro y administración de usuarios
type AuthController struct {
	repo      repository.DBRepository
	jwtSecret string
}

// NewAuthController crea una nueva instancia de AuthController
func NewAuthController(repo repository.DBRepository, jwtSecret string) *AuthController {
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "secret-multicatalogo-key-2026"
		}
	}
	return &AuthController{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

// Login valida credenciales con bcrypt y emite un JWT firmado
func (ctrl *AuthController) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	isDev := os.Getenv("APP_ENV") == "dev"

	if err := c.BodyParser(&req); err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: details,
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Email y contraseña son obligatorios",
		})
	}

	user, err := ctrl.repo.BuscarUsuarioPorCredenciales(req.Email, req.Password)
	if err != nil {
		if errors.Is(err, repository.ErrCuentaDesactivada) {
			return c.Status(fiber.StatusForbidden).JSON(models.APIError{
				Status:  fiber.StatusForbidden,
				Message: "Cuenta desactivada por administración",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
			Status:  fiber.StatusUnauthorized,
			Message: "Credenciales incorrectas",
		})
	}

	// Creación de JWT real con claims requeridas
	now := time.Now()
	claims := models.JWTClaims{
		Sub:   strconv.Itoa(user.ID),
		Email: user.Email,
		Rol:   user.Rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(user.ID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
		},
	}

	tokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := tokenObj.SignedString([]byte(ctrl.jwtSecret))
	if err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al generar token de autenticación",
			Details: details,
		})
	}

	return c.JSON(fiber.Map{
		"token":          tokenString,
		"email":          user.Email,
		"rol":            user.Rol,
		"nombre":         user.Nombre,
		"referido_id":    user.ReferidoID,
	})
}

// Register registra un nuevo usuario y su nodo MLM en el árbol de referidos
func (ctrl *AuthController) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	isDev := os.Getenv("APP_ENV") == "dev"

	if err := c.BodyParser(&req); err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
			Details: details,
		})
	}

	if req.Email == "" || req.Password == "" || req.Nombre == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Nombre, email y contraseña son obligatorios",
		})
	}

	user, codigoRef, err := ctrl.repo.RegistrarUsuario(&req)
	if err != nil {
		var details interface{}
		if isDev {
			details = err.Error()
		}

		if errors.Is(err, repository.ErrEmailExistente) {
			return c.Status(fiber.StatusConflict).JSON(models.APIError{
				Status:  fiber.StatusConflict,
				Message: "El correo electrónico ya se encuentra registrado",
				Details: details,
			})
		}

		if errors.Is(err, repository.ErrReferidoInvalido) {
			return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
				Status:  fiber.StatusBadRequest,
				Message: "El código de referido especificado no existe",
				Details: details,
			})
		}

		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al registrar cuenta",
			Details: details,
		})
	}

	// Emitir token JWT para inicio de sesión inmediato
	now := time.Now()
	claims := models.JWTClaims{
		Sub:   strconv.Itoa(user.ID),
		Email: user.Email,
		Rol:   user.Rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(user.ID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
		},
	}
	tokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := tokenObj.SignedString([]byte(ctrl.jwtSecret))

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token":          tokenString,
		"email":          user.Email,
		"nombre":         user.Nombre,
		"rol":            user.Rol,
		"codigoReferido": codigoRef,
		"mensaje":        "Usuario registrado exitosamente",
		"usuario": fiber.Map{
			"id":             user.ID,
			"email":          user.Email,
			"nombre":         user.Nombre,
			"rol":            user.Rol,
			"codigo":         codigoRef,
			"codigoReferido": codigoRef,
			"referido_id":    user.ReferidoID,
		},
	})
}

// GetUsuarios devuelve la lista paginada de usuarios para el panel de administración
func (ctrl *AuthController) GetUsuarios(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	pagina, err := ctrl.repo.ListarUsuarios(page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al obtener lista de usuarios",
		})
	}
	return c.JSON(pagina)
}

// ToggleUsuario activa o desactiva una cuenta de usuario
func (ctrl *AuthController) ToggleUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "ID de usuario inválido",
		})
	}

	var body struct {
		Activo bool `json:"activo"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{
			Status:  fiber.StatusBadRequest,
			Message: "Cuerpo de petición inválido",
		})
	}

	if err := ctrl.repo.ActualizarEstadoUsuario(id, body.Activo); err != nil {
		if errors.Is(err, repository.ErrNoEncontrado) {
			return c.Status(fiber.StatusNotFound).JSON(models.APIError{
				Status:  fiber.StatusNotFound,
				Message: "Usuario no encontrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{
			Status:  fiber.StatusInternalServerError,
			Message: "Error al actualizar estado del usuario",
		})
	}

	return c.JSON(fiber.Map{
		"mensaje": "Estado del usuario actualizado exitosamente",
		"activo":  body.Activo,
	})
}
