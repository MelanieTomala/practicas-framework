package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

// ConnectDB inicializa la conexión a la base de datos PostgreSQL
func ConnectDB() {
	// Cargamos las variables de entorno desde el archivo .env
	err := godotenv.Load()
	if err != nil {
		log.Println("No se encontró el archivo .env, usando variables de entorno del sistema")
	}

	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	if host == "" {
		host = "localhost"
		port = "5432"
		user = "admin"
		password = "password123"
		dbname = "multicatalogo"
	}

	// Creamos la cadena de conexión
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	// Abrimos la conexión
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatalf("Error al abrir la base de datos: %v", err)
	}

	// Verificamos la conexión
	err = db.Ping()
	if err != nil {
		log.Fatalf("Error al conectar a la base de datos: %v", err)
	}

	log.Println("¡Conexión exitosa a la base de datos PostgreSQL!")
	DB = db
}

// CloseDB cierra la conexión a la base de datos
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Conexión a PostgreSQL cerrada.")
	}
}
