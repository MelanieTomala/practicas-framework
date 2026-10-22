package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

// RedisClient es la instancia compartida del cliente de Redis
var RedisClient *redis.Client

// RDB es un alias conveniente de RedisClient
var RDB *redis.Client

// ConnectRedis inicializa la conexión con el servidor Redis
func ConnectRedis() {
	// Intentamos cargar variables del .env si existen
	_ = godotenv.Load()

	// Verificamos si existe una URI completa de conexión (ej. redis://user:password@host:port/0)
	redisURI := os.Getenv("REDIS_URL")
	if redisURI == "" {
		redisURI = os.Getenv("REDIS_URI")
	}

	var opt *redis.Options

	if redisURI != "" {
		parsedOpt, err := redis.ParseURL(redisURI)
		if err != nil {
			log.Printf("Error al parsear REDIS_URL/REDIS_URI: %v, usando configuración por defecto", err)
			opt = nil
		} else {
			opt = parsedOpt
		}
	}

	if opt == nil {
		host := os.Getenv("REDIS_HOST")
		if host == "" {
			host = "localhost"
		}

		port := os.Getenv("REDIS_PORT")
		if port == "" {
			port = "6379"
		}

		password := os.Getenv("REDIS_PASSWORD")

		opt = &redis.Options{
			Addr:     fmt.Sprintf("%s:%s", host, port),
			Password: password,
			DB:       0,
		}
	}

	// Inicializamos el cliente de Redis con la configuración definida
	client := redis.NewClient(opt)

	// Verificamos conectividad inicial mediante PING
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Advertencia: No se pudo verificar la conexión con Redis en %s: %v. El servicio continuará y reintentará automáticamente.", opt.Addr, err)
	} else {
		log.Printf("¡Conexión exitosa a Redis en %s!", opt.Addr)
	}

	RedisClient = client
	RDB = client
}

// CloseRedis cierra la conexión con el servidor Redis de forma segura
func CloseRedis() {
	if RedisClient != nil {
		if err := RedisClient.Close(); err != nil {
			log.Printf("Error al cerrar conexión con Redis: %v\n", err)
		} else {
			log.Println("Conexión a Redis cerrada.")
		}
	}
}
