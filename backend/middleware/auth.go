package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"multicatalogo-backend/models"
)

// RequireAuth valida que la petición contenga un JWT válido en el header Authorization
func RequireAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
				Status:  fiber.StatusUnauthorized,
				Message: "Acceso no autorizado: token faltante",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
				Status:  fiber.StatusUnauthorized,
				Message: "Formato de token inválido (se esperaba Bearer <token>)",
			})
		}

		tokenStr := parts[1]
		claims := &models.JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIError{
				Status:  fiber.StatusUnauthorized,
				Message: "Token inválido o expirado",
			})
		}

		// Almacenamos los claims en Locals para consumo seguro por los controladores
		c.Locals("user", claims)
		c.Locals("email", claims.Email)
		c.Locals("rol", claims.Rol)
		c.Locals("sub", claims.Sub)

		return c.Next()
	}
}

// RequireAdmin exige que el usuario autenticado posea el rol de administrador
func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		rol, ok := c.Locals("rol").(string)
		if !ok || rol != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIError{
				Status:  fiber.StatusForbidden,
				Message: "Acceso restringido: requiere permisos de administrador",
			})
		}
		return c.Next()
	}
}
