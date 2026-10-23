package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"multicatalogo-backend/config"
	"multicatalogo-backend/domain"
	"multicatalogo-backend/models"
)

// Errores estándar del dominio de persistencia
var (
	ErrNoEncontrado       = errors.New("recurso no encontrado")
	ErrCantidadInvalida   = errors.New("cantidad debe ser mayor que cero")
	ErrStockInsuficiente  = errors.New("stock insuficiente o producto inexistente")
	ErrEmailExistente     = errors.New("el correo electrónico ya se encuentra registrado")
	ErrReferidoInvalido   = errors.New("código de referido inválido")
	ErrCuentaDesactivada  = errors.New("cuenta desactivada, comuníquese con administración")
	ErrTransicionInvalida = errors.New("transición de estado de pedido inválida")
	ErrSinComisiones      = errors.New("no existen comisiones pendientes para liquidar")
)

// DBRepository define la interfaz para las operaciones en la base de datos relacional
type DBRepository interface {
	// Autenticación y Cuentas
	BuscarUsuarioPorEmail(email string) (*models.Usuario, error)
	BuscarUsuarioPorCredenciales(email string, password string) (*models.Usuario, error)
	RegistrarUsuario(req *models.RegisterRequest) (*models.Usuario, string, error)
	ListarUsuarios(page, limit int) (*models.Pagina[models.Usuario], error)
	ActualizarEstadoUsuario(id int, activo bool) error

	// Catálogo de Productos
	ObtenerProductos() ([]models.Producto, error)
	ObtenerProductosAdmin(q string, page, limit int) (*models.Pagina[models.Producto], error)
	ObtenerProductoPorID(id int) (*models.Producto, error)
	CrearProducto(p *models.Producto) (*models.Producto, error)
	ActualizarProducto(id int, p *models.Producto) (*models.Producto, error)
	DesactivarProducto(id int) error

	// Pedidos
	CrearPedido(req *models.CheckoutRequest, authEmail string, usuarioID *int) (*models.PedidoResponse, error)
	ObtenerPedidosUsuario(usuarioID int, email string, page, limit int) (*models.Pagina[models.PedidoResponse], error)
	ObtenerTodosLosPedidos(estado string, page, limit int) (*models.Pagina[models.PedidoResponse], error)
	ObtenerPedidoPorID(id int) (*models.PedidoResponse, error)
	ActualizarEstadoPedido(id int, nuevoEstado string) error

	// Red Multinivel y Comisiones
	ObtenerRed() ([]*models.Referido, error)
	ObtenerRedUsuario(referidoID int) (*models.Referido, string, error)
	ObtenerComisionesUsuario(referidoID int) ([]models.Comision, float64, float64, error)

	// Liquidaciones
	CrearLiquidacion(referidoID int) (*models.Liquidacion, error)
	ListarLiquidaciones(page, limit int) (*models.Pagina[models.Liquidacion], error)
	ListarLiquidacionesUsuario(referidoID int) ([]models.Liquidacion, error)

	// Reportes
	ObtenerResumenReportes(desde, hasta string) (*models.ResumenReporte, error)
	ObtenerTopProductos(limit int) ([]models.TopProductoReporte, error)
	ObtenerTopReferidos(limit int) ([]models.TopReferidoReporte, error)
	ObtenerDeudaComisiones() ([]models.DeudaComisionesReporte, error)
}

// CacheRepository define la interfaz para el almacenamiento y recuperación en caché
type CacheRepository interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

// PostgresRepository implementa DBRepository interactuando con PostgreSQL
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository instancia un nuevo PostgresRepository
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	if db == nil {
		db = config.DB
	}
	return &PostgresRepository{db: db}
}

// RedisCacheRepository implementa CacheRepository interactuando con Redis
type RedisCacheRepository struct {
	client *redis.Client
}

// NewRedisCacheRepository instancia un nuevo RedisCacheRepository
func NewRedisCacheRepository(client *redis.Client) *RedisCacheRepository {
	if client == nil {
		client = config.RedisClient
	}
	return &RedisCacheRepository{client: client}
}

func (r *RedisCacheRepository) Get(ctx context.Context, key string) (string, error) {
	if r.client == nil {
		return "", redis.Nil
	}
	return r.client.Get(ctx, key).Result()
}

func (r *RedisCacheRepository) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if r.client == nil {
		return nil
	}
	return r.client.Set(ctx, key, value, ttl).Err()
}

func (r *RedisCacheRepository) Delete(ctx context.Context, key string) error {
	if r.client == nil {
		return nil
	}
	return r.client.Del(ctx, key).Err()
}

// ==========================================
// 1. AUTENTICACIÓN Y REGISTRO DE USUARIOS
// ==========================================

func (r *PostgresRepository) BuscarUsuarioPorEmail(email string) (*models.Usuario, error) {
	var user models.Usuario
	query := `SELECT id, COALESCE(nombre, ''), email, password, rol, COALESCE(activo, true), referido_id FROM usuarios WHERE email = $1`

	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Nombre,
		&user.Email,
		&user.Password,
		&user.Rol,
		&user.Activo,
		&user.ReferidoID,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}

	return &user, nil
}

func (r *PostgresRepository) BuscarUsuarioPorCredenciales(email string, password string) (*models.Usuario, error) {
	user, err := r.BuscarUsuarioPorEmail(email)
	if err != nil {
		return nil, err
	}

	if !user.Activo {
		return nil, ErrCuentaDesactivada
	}

	errBcrypt := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if errBcrypt != nil {
		if user.Password != password {
			return nil, ErrNoEncontrado
		}
	}

	return user, nil
}

// RegistrarUsuario crea el usuario y su nodo de referido en una sola transacción ACID
func (r *PostgresRepository) RegistrarUsuario(req *models.RegisterRequest) (*models.Usuario, string, error) {
	// 1. Verificar unicidad de email
	var exists bool
	err := r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM usuarios WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return nil, "", fmt.Errorf("error al verificar email: %w", err)
	}
	if exists {
		return nil, "", ErrEmailExistente
	}

	tx, err := r.db.Begin()
	if err != nil {
		return nil, "", fmt.Errorf("error al iniciar transacción: %w", err)
	}
	defer tx.Rollback()

	// 2. Resolver referente si se suministró código
	var parentID *int
	var nivel int = 1

	refCode := strings.ToUpper(strings.TrimSpace(req.Ref))
	if refCode == "" {
		refCode = strings.ToUpper(strings.TrimSpace(req.CodigoReferido))
	}
	if refCode != "" {
		var pID int
		var pNivel int
		err := tx.QueryRow("SELECT id, nivel FROM referidos WHERE UPPER(codigo) = $1", refCode).Scan(&pID, &pNivel)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, "", ErrReferidoInvalido
			}
			return nil, "", fmt.Errorf("error al buscar referente: %w", err)
		}
		parentID = &pID
		nivel = pNivel + 1
	}

	// 3. Generar código de referido único para el nuevo usuario
	randCode := fmt.Sprintf("%s%d", strings.ToUpper(strings.ReplaceAll(req.Nombre, " ", ""))[:int(math.Min(4, float64(len(req.Nombre))))], rand.Intn(900)+100)
	if randCode == "" {
		randCode = fmt.Sprintf("REF%d", rand.Intn(9000)+1000)
	}

	// 4. Insertar nodo en referidos
	var nuevoReferidoID int
	queryRef := `
		INSERT INTO referidos (nombre, nivel, ventas, parent_id, codigo)
		VALUES ($1, $2, 0.0, $3, $4)
		RETURNING id
	`
	err = tx.QueryRow(queryRef, req.Nombre, nivel, parentID, randCode).Scan(&nuevoReferidoID)
	if err != nil {
		return nil, "", fmt.Errorf("error al crear nodo de referido: %w", err)
	}

	// 5. Hashear contraseña con bcrypt
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("error al hashear contraseña: %w", err)
	}

	// 6. Insertar en usuarios vinculado al referido_id
	var nuevoUsuarioID int
	queryUser := `
		INSERT INTO usuarios (nombre, email, password, rol, activo, referido_id)
		VALUES ($1, $2, $3, 'cliente', true, $4)
		RETURNING id
	`
	err = tx.QueryRow(queryUser, req.Nombre, req.Email, string(hashedPwd), nuevoReferidoID).Scan(&nuevoUsuarioID)
	if err != nil {
		return nil, "", fmt.Errorf("error al registrar usuario: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, "", fmt.Errorf("error al confirmar registro (COMMIT): %w", err)
	}

	userResponse := &models.Usuario{
		ID:         nuevoUsuarioID,
		Nombre:     req.Nombre,
		Email:      req.Email,
		Rol:        "cliente",
		Activo:     true,
		ReferidoID: &nuevoReferidoID,
	}

	return userResponse, randCode, nil
}

func (r *PostgresRepository) ListarUsuarios(page, limit int) (*models.Pagina[models.Usuario], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int
	err := r.db.QueryRow("SELECT COUNT(*) FROM usuarios").Scan(&total)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT u.id, COALESCE(u.nombre, ''), u.email, u.rol, COALESCE(u.activo, true), u.referido_id, r.codigo, COALESCE(u.creado_en::text, '')
		FROM usuarios u
		LEFT JOIN referidos r ON u.referido_id = r.id
		ORDER BY u.id ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	usuarios := make([]models.Usuario, 0)
	for rows.Next() {
		var u models.Usuario
		var codRef *string
		if err := rows.Scan(&u.ID, &u.Nombre, &u.Email, &u.Rol, &u.Activo, &u.ReferidoID, &codRef, &u.CreadoEn); err != nil {
			return nil, err
		}
		u.CodigoReferido = codRef
		usuarios = append(usuarios, u)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.Pagina[models.Usuario]{
		Data:       usuarios,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresRepository) ActualizarEstadoUsuario(id int, activo bool) error {
	res, err := r.db.Exec("UPDATE usuarios SET activo = $1 WHERE id = $2", activo, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNoEncontrado
	}
	return nil
}

// ==========================================
// 2. CATÁLOGO DE PRODUCTOS (CRUD ADMIN)
// ==========================================

func (r *PostgresRepository) ObtenerProductos() ([]models.Producto, error) {
	var productos []models.Producto
	query := `
		SELECT id, nombre, COALESCE(descripcion, ''), precio, stock, COALESCE(categoria, ''), img, COALESCE(galeria::text, '[]'), COALESCE(activo, true)
		FROM productos 
		WHERE COALESCE(activo, true) = true 
		ORDER BY id ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var p models.Producto
		var galeriaJSON string
		if err := rows.Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Stock, &p.Categoria, &p.Img, &galeriaJSON, &p.Activo); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(galeriaJSON), &p.Galeria)
		productos = append(productos, p)
	}

	return productos, nil
}

func (r *PostgresRepository) ObtenerProductosAdmin(q string, page, limit int) (*models.Pagina[models.Producto], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := ""
	args := []interface{}{}
	if strings.TrimSpace(q) != "" {
		whereClause = "WHERE nombre ILIKE $1 OR categoria ILIKE $1 OR descripcion ILIKE $1"
		args = append(args, "%"+strings.TrimSpace(q)+"%")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM productos %s", whereClause)
	var total int
	var err error
	if len(args) > 0 {
		err = r.db.QueryRow(countQuery, args...).Scan(&total)
	} else {
		err = r.db.QueryRow(countQuery).Scan(&total)
	}
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id, nombre, COALESCE(descripcion, ''), precio, stock, COALESCE(categoria, ''), img, COALESCE(galeria::text, '[]'), COALESCE(activo, true)
		FROM productos
		%s
		ORDER BY id ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productos := make([]models.Producto, 0)
	for rows.Next() {
		var p models.Producto
		var galeriaJSON string
		if err := rows.Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Stock, &p.Categoria, &p.Img, &galeriaJSON, &p.Activo); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(galeriaJSON), &p.Galeria)
		productos = append(productos, p)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.Pagina[models.Producto]{
		Data:       productos,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresRepository) ObtenerProductoPorID(id int) (*models.Producto, error) {
	var p models.Producto
	var galeriaJSON string
	query := `
		SELECT id, nombre, COALESCE(descripcion, ''), precio, stock, COALESCE(categoria, ''), img, COALESCE(galeria::text, '[]'), COALESCE(activo, true)
		FROM productos 
		WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Stock, &p.Categoria, &p.Img, &galeriaJSON, &p.Activo)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}
	_ = json.Unmarshal([]byte(galeriaJSON), &p.Galeria)

	return &p, nil
}

func (r *PostgresRepository) CrearProducto(p *models.Producto) (*models.Producto, error) {
	galeriaBytes, _ := json.Marshal(p.Galeria)
	query := `
		INSERT INTO productos (nombre, descripcion, precio, stock, categoria, img, galeria, activo)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		RETURNING id
	`
	err := r.db.QueryRow(query, p.Nombre, p.Descripcion, p.Precio, p.Stock, p.Categoria, p.Img, string(galeriaBytes)).Scan(&p.ID)
	if err != nil {
		return nil, err
	}
	p.Activo = true
	return p, nil
}

func (r *PostgresRepository) ActualizarProducto(id int, p *models.Producto) (*models.Producto, error) {
	galeriaBytes, _ := json.Marshal(p.Galeria)
	query := `
		UPDATE productos 
		SET nombre = $1, descripcion = $2, precio = $3, stock = $4, categoria = $5, img = $6, galeria = $7, activo = $8
		WHERE id = $9
	`
	res, err := r.db.Exec(query, p.Nombre, p.Descripcion, p.Precio, p.Stock, p.Categoria, p.Img, string(galeriaBytes), p.Activo, id)
	if err != nil {
		return nil, err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return nil, ErrNoEncontrado
	}
	p.ID = id
	return p, nil
}

func (r *PostgresRepository) DesactivarProducto(id int) error {
	res, err := r.db.Exec("UPDATE productos SET activo = false WHERE id = $1", id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNoEncontrado
	}
	return nil
}

// ==========================================
// 3. PEDIDOS Y TRANSACCIÓN ACID CON LEDGER
// ==========================================

func (r *PostgresRepository) CrearPedido(req *models.CheckoutRequest, authEmail string, usuarioID *int) (*models.PedidoResponse, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error al iniciar transacción SQL: %w", err)
	}
	defer tx.Rollback()

	req.Cliente.Email = authEmail

	if req.Numero == "" {
		req.Numero = fmt.Sprintf("MC-%d", time.Now().Unix()%1000000)
	}

	var totalCalculado float64 = 0.0

	type validatedItem struct {
		productoID int
		nombre     string
		cantidad   int
		precio     float64
	}
	itemsValidados := make([]validatedItem, 0, len(req.Items))

	for _, item := range req.Items {
		if item.Cantidad <= 0 {
			return nil, ErrCantidadInvalida
		}

		var dbNombre string
		var dbPrecio float64
		var dbStock int

		queryLock := `SELECT nombre, precio, stock FROM productos WHERE id = $1 FOR UPDATE`
		errLock := tx.QueryRow(queryLock, item.ProductoID).Scan(&dbNombre, &dbPrecio, &dbStock)
		if errLock != nil {
			if errors.Is(errLock, sql.ErrNoRows) {
				return nil, fmt.Errorf("%w: producto ID %d no existe", ErrStockInsuficiente, item.ProductoID)
			}
			return nil, fmt.Errorf("error al verificar producto ID %d: %w", item.ProductoID, errLock)
		}

		if dbStock < item.Cantidad {
			return nil, fmt.Errorf("%w para '%s' (disponible: %d, solicitado: %d)", ErrStockInsuficiente, dbNombre, dbStock, item.Cantidad)
		}

		_, errStock := tx.Exec("UPDATE productos SET stock = stock - $1 WHERE id = $2", item.Cantidad, item.ProductoID)
		if errStock != nil {
			return nil, fmt.Errorf("error al actualizar stock de %s: %w", dbNombre, errStock)
		}

		totalCalculado += dbPrecio * float64(item.Cantidad)
		itemsValidados = append(itemsValidados, validatedItem{
			productoID: item.ProductoID,
			nombre:     dbNombre,
			cantidad:   item.Cantidad,
			precio:     dbPrecio,
		})
	}

	req.Total = totalCalculado

	// Insertar pedido principal con estado 'pendiente' y usuario_id
	queryPedido := `
		INSERT INTO pedidos (numero, cliente_nombre, cliente_email, cliente_ciudad, cliente_direccion, cliente_telefono, metodo_pago, total, usuario_id, estado)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente')
		RETURNING id, fecha
	`
	var pedidoID int
	var fecha time.Time
	err = tx.QueryRow(
		queryPedido,
		req.Numero,
		req.Cliente.Nombre,
		authEmail,
		req.Cliente.Ciudad,
		req.Cliente.Direccion,
		req.Cliente.Telefono,
		req.MetodoPago,
		req.Total,
		usuarioID,
	).Scan(&pedidoID, &fecha)

	if err != nil {
		return nil, fmt.Errorf("error al insertar pedido: %w", err)
	}

	queryItem := `
		INSERT INTO pedido_items (pedido_id, producto_id, nombre, cantidad, precio)
		VALUES ($1, $2, $3, $4, $5)
	`
	itemsResponse := make([]models.ItemPedido, len(itemsValidados))
	for i, item := range itemsValidados {
		_, err = tx.Exec(queryItem, pedidoID, item.productoID, item.nombre, item.cantidad, item.precio)
		if err != nil {
			return nil, fmt.Errorf("error al insertar item '%s': %w", item.nombre, err)
		}
		itemsResponse[i] = models.ItemPedido{
			ProductoID:     item.productoID,
			Nombre:         item.nombre,
			ProductoNombre: item.nombre,
			Cantidad:       item.cantidad,
			Precio:         item.precio,
			PrecioUnitario: item.precio,
			Subtotal:       item.precio * float64(item.cantidad),
		}
	}

	// Ledger de Comisiones dentro de la transacción ACID (Fase 4)
	// Obtenemos el referido_id del comprador
	var compradorRefID *int
	_ = tx.QueryRow("SELECT referido_id FROM usuarios WHERE email = $1", authEmail).Scan(&compradorRefID)

	if compradorRefID != nil {
		// Distribuir comisiones usando la función pura del dominio
		repartos := domain.RepartirComisiones(totalCalculado, domain.TasasMLM)

		// Recorrer árbol hacia arriba (hasta 3 niveles)
		currID := compradorRefID
		for nivel := 1; nivel <= 3 && currID != nil; nivel++ {
			var parentID *int
			errParent := tx.QueryRow("SELECT parent_id FROM referidos WHERE id = $1", *currID).Scan(&parentID)
			if errParent != nil || parentID == nil {
				break
			}

			if rep, ok := repartos[nivel]; ok {
				queryComision := `
					INSERT INTO comisiones (pedido_id, referido_id, nivel, porcentaje, monto, estado)
					VALUES ($1, $2, $3, $4, $5, 'pendiente')
				`
				_, errCom := tx.Exec(queryComision, pedidoID, *parentID, rep.Nivel, rep.Porcentaje, rep.Monto)
				if errCom != nil {
					return nil, fmt.Errorf("error al registrar comisión en ledger: %w", errCom)
				}

				// Actualizar contador de ventas acumuladas del referido
				_, _ = tx.Exec("UPDATE referidos SET ventas = ventas + $1 WHERE id = $2", rep.Monto, *parentID)
			}

			currID = parentID
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("error al confirmar pedido (COMMIT): %w", err)
	}

	return &models.PedidoResponse{
		ID:         pedidoID,
		Numero:     req.Numero,
		Cliente:    req.Cliente,
		MetodoPago: req.MetodoPago,
		Items:      itemsResponse,
		Total:      req.Total,
		Estado:     "pendiente",
		Fecha:      fecha.Format("02/01/2006 15:04:05"),
		CreadoEn:   fecha.Format(time.RFC3339),
		Mensaje:    "Pedido procesado y confirmado con éxito",
	}, nil
}

func (r *PostgresRepository) ObtenerPedidosUsuario(usuarioID int, email string, page, limit int) (*models.Pagina[models.PedidoResponse], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int
	err := r.db.QueryRow("SELECT COUNT(*) FROM pedidos WHERE usuario_id = $1 OR cliente_email = $2", usuarioID, email).Scan(&total)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, numero, cliente_nombre, cliente_email, cliente_ciudad, cliente_direccion, cliente_telefono, metodo_pago, total, COALESCE(estado, 'pendiente'), fecha
		FROM pedidos
		WHERE usuario_id = $1 OR cliente_email = $2
		ORDER BY id DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.db.Query(query, usuarioID, email, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pedidos := make([]models.PedidoResponse, 0)
	for rows.Next() {
		var p models.PedidoResponse
		var fecha time.Time
		if err := rows.Scan(&p.ID, &p.Numero, &p.Cliente.Nombre, &p.Cliente.Email, &p.Cliente.Ciudad, &p.Cliente.Direccion, &p.Cliente.Telefono, &p.MetodoPago, &p.Total, &p.Estado, &fecha); err != nil {
			return nil, err
		}
		p.Fecha = fecha.Format("02/01/2006 15:04:05")
		p.CreadoEn = fecha.Format(time.RFC3339)

		// Cargar items
		itemsRows, err := r.db.Query("SELECT producto_id, nombre, cantidad, precio FROM pedido_items WHERE pedido_id = $1", p.ID)
		if err == nil {
			items := make([]models.ItemPedido, 0)
			for itemsRows.Next() {
				var it models.ItemPedido
				var prodID *int
				if errScan := itemsRows.Scan(&prodID, &it.Nombre, &it.Cantidad, &it.Precio); errScan == nil {
					if prodID != nil {
						it.ProductoID = *prodID
					}
					it.ProductoNombre = it.Nombre
					it.PrecioUnitario = it.Precio
					it.Subtotal = it.Precio * float64(it.Cantidad)
					items = append(items, it)
				}
			}
			itemsRows.Close()
			p.Items = items
		}

		pedidos = append(pedidos, p)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.Pagina[models.PedidoResponse]{
		Data:       pedidos,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresRepository) ObtenerTodosLosPedidos(estado string, page, limit int) (*models.Pagina[models.PedidoResponse], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := ""
	args := []interface{}{}
	if strings.TrimSpace(estado) != "" {
		st := strings.TrimSpace(estado)
		if st == "en_preparacion" || st == "preparando" {
			whereClause = "WHERE (estado = 'preparando' OR estado = 'en_preparacion')"
		} else {
			whereClause = "WHERE estado = $1"
			args = append(args, st)
		}
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM pedidos %s", whereClause)
	var total int
	var err error
	if len(args) > 0 {
		err = r.db.QueryRow(countQuery, args...).Scan(&total)
	} else {
		err = r.db.QueryRow(countQuery).Scan(&total)
	}
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id, numero, cliente_nombre, cliente_email, cliente_ciudad, cliente_direccion, cliente_telefono, metodo_pago, total, COALESCE(estado, 'pendiente'), fecha
		FROM pedidos
		%s
		ORDER BY id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pedidos := make([]models.PedidoResponse, 0)
	for rows.Next() {
		var p models.PedidoResponse
		var fecha time.Time
		if err := rows.Scan(&p.ID, &p.Numero, &p.Cliente.Nombre, &p.Cliente.Email, &p.Cliente.Ciudad, &p.Cliente.Direccion, &p.Cliente.Telefono, &p.MetodoPago, &p.Total, &p.Estado, &fecha); err != nil {
			return nil, err
		}
		p.Fecha = fecha.Format("02/01/2006 15:04:05")
		p.CreadoEn = fecha.Format(time.RFC3339)

		itemsRows, err := r.db.Query("SELECT producto_id, nombre, cantidad, precio FROM pedido_items WHERE pedido_id = $1", p.ID)
		if err == nil {
			items := make([]models.ItemPedido, 0)
			for itemsRows.Next() {
				var it models.ItemPedido
				var prodID *int
				if errScan := itemsRows.Scan(&prodID, &it.Nombre, &it.Cantidad, &it.Precio); errScan == nil {
					if prodID != nil {
						it.ProductoID = *prodID
					}
					it.ProductoNombre = it.Nombre
					it.PrecioUnitario = it.Precio
					it.Subtotal = it.Precio * float64(it.Cantidad)
					items = append(items, it)
				}
			}
			itemsRows.Close()
			p.Items = items
		}

		pedidos = append(pedidos, p)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.Pagina[models.PedidoResponse]{
		Data:       pedidos,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresRepository) ObtenerPedidoPorID(id int) (*models.PedidoResponse, error) {
	var p models.PedidoResponse
	var fecha time.Time
	query := `
		SELECT id, numero, cliente_nombre, cliente_email, cliente_ciudad, cliente_direccion, cliente_telefono, metodo_pago, total, COALESCE(estado, 'pendiente'), fecha
		FROM pedidos
		WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&p.ID, &p.Numero, &p.Cliente.Nombre, &p.Cliente.Email, &p.Cliente.Ciudad, &p.Cliente.Direccion, &p.Cliente.Telefono, &p.MetodoPago, &p.Total, &p.Estado, &fecha)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}
	p.Fecha = fecha.Format("02/01/2006 15:04:05")
	p.CreadoEn = fecha.Format(time.RFC3339)

	itemsRows, err := r.db.Query("SELECT producto_id, nombre, cantidad, precio FROM pedido_items WHERE pedido_id = $1", p.ID)
	if err == nil {
		items := make([]models.ItemPedido, 0)
		for itemsRows.Next() {
			var it models.ItemPedido
			var prodID *int
			if errScan := itemsRows.Scan(&prodID, &it.Nombre, &it.Cantidad, &it.Precio); errScan == nil {
				if prodID != nil {
					it.ProductoID = *prodID
				}
				it.ProductoNombre = it.Nombre
				it.PrecioUnitario = it.Precio
				it.Subtotal = it.Precio * float64(it.Cantidad)
				items = append(items, it)
			}
		}
		itemsRows.Close()
		p.Items = items
	}

	return &p, nil
}

func (r *PostgresRepository) ActualizarEstadoPedido(id int, nuevoEstado string) error {
	nuevoEstado = strings.ToLower(strings.TrimSpace(nuevoEstado))
	if nuevoEstado == "en_preparacion" {
		nuevoEstado = "preparando"
	}
	estadosValidos := map[string]bool{
		"pendiente":      true,
		"preparando":     true,
		"en_preparacion": true,
		"enviado":        true,
		"entregado":      true,
		"cancelado":      true,
	}
	if !estadosValidos[nuevoEstado] {
		return ErrTransicionInvalida
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var estadoActual string
	err = tx.QueryRow("SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE", id).Scan(&estadoActual)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNoEncontrado
		}
		return err
	}

	if estadoActual == "entregado" && nuevoEstado != "entregado" {
		return fmt.Errorf("%w: un pedido entregado no puede modificarse", ErrTransicionInvalida)
	}
	if estadoActual == "cancelado" {
		return fmt.Errorf("%w: un pedido cancelado no puede reactivarse", ErrTransicionInvalida)
	}

	// Si se cancela: devolver stock y revertir comisiones (Fase 3: espejo ACID)
	if nuevoEstado == "cancelado" {
		rows, err := tx.Query("SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = $1", id)
		if err != nil {
			return err
		}
		type itemStock struct {
			prodID *int
			cant   int
		}
		items := make([]itemStock, 0)
		for rows.Next() {
			var it itemStock
			if err := rows.Scan(&it.prodID, &it.cant); err == nil && it.prodID != nil {
				items = append(items, it)
			}
		}
		rows.Close()

		for _, it := range items {
			_, err = tx.Exec("UPDATE productos SET stock = stock + $1 WHERE id = $2", it.cant, *it.prodID)
			if err != nil {
				return fmt.Errorf("error al devolver stock: %w", err)
			}
		}

		// Revertir comisiones del ledger y ventas asociadas
		type comisionRevertir struct {
			refID int
			monto float64
		}
		comisionesParaRevertir := make([]comisionRevertir, 0)

		comRows, err := tx.Query("SELECT referido_id, monto FROM comisiones WHERE pedido_id = $1 AND estado != 'revertida'", id)
		if err == nil {
			for comRows.Next() {
				var item comisionRevertir
				if errScan := comRows.Scan(&item.refID, &item.monto); errScan == nil {
					comisionesParaRevertir = append(comisionesParaRevertir, item)
				}
			}
			comRows.Close()
		}

		for _, cr := range comisionesParaRevertir {
			_, _ = tx.Exec("UPDATE referidos SET ventas = GREATEST(0, ventas - $1) WHERE id = $2", cr.monto, cr.refID)
		}

		_, _ = tx.Exec("UPDATE comisiones SET estado = 'revertida' WHERE pedido_id = $1", id)
	}

	_, err = tx.Exec("UPDATE pedidos SET estado = $1 WHERE id = $2", nuevoEstado, id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ==========================================
// 4. RED MULTINIVEL Y LEDGER DE COMISIONES
// ==========================================

func (r *PostgresRepository) ObtenerRed() ([]*models.Referido, error) {
	query := `SELECT id, nombre, nivel, ventas, parent_id, COALESCE(codigo, '') FROM referidos ORDER BY nivel ASC, id ASC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []*models.Referido
	referidosMap := make(map[int]*models.Referido)

	for rows.Next() {
		var rf models.Referido
		if err := rows.Scan(&rf.ID, &rf.Nombre, &rf.Nivel, &rf.Ventas, &rf.ParentID, &rf.Codigo); err != nil {
			return nil, err
		}

		rPtr := &models.Referido{
			ID:       rf.ID,
			Nombre:   rf.Nombre,
			Nivel:    rf.Nivel,
			Ventas:   rf.Ventas,
			ParentID: rf.ParentID,
			Codigo:   rf.Codigo,
			Hijos:    []*models.Referido{},
		}

		todos = append(todos, rPtr)
		referidosMap[rf.ID] = rPtr
	}

	var red []*models.Referido
	for _, item := range todos {
		if item.ParentID == nil {
			red = append(red, item)
		} else {
			if parent, exists := referidosMap[*item.ParentID]; exists {
				parent.Hijos = append(parent.Hijos, item)
			}
		}
	}

	return red, nil
}

func (r *PostgresRepository) ObtenerRedUsuario(referidoID int) (*models.Referido, string, error) {
	redCompleta, err := r.ObtenerRed()
	if err != nil {
		return nil, "", err
	}

	var codigoUsuario string
	_ = r.db.QueryRow("SELECT COALESCE(codigo, '') FROM referidos WHERE id = $1", referidoID).Scan(&codigoUsuario)

	var subarbol *models.Referido
	var buscarSubarbol func(nodo *models.Referido) bool
	buscarSubarbol = func(nodo *models.Referido) bool {
		if nodo.ID == referidoID {
			subarbol = nodo
			return true
		}
		for _, hijo := range nodo.Hijos {
			if buscarSubarbol(hijo) {
				return true
			}
		}
		return false
	}

	for _, raiz := range redCompleta {
		if buscarSubarbol(raiz) {
			break
		}
	}

	if subarbol == nil {
		var rf models.Referido
		err := r.db.QueryRow("SELECT id, nombre, nivel, ventas, parent_id, COALESCE(codigo, '') FROM referidos WHERE id = $1", referidoID).
			Scan(&rf.ID, &rf.Nombre, &rf.Nivel, &rf.Ventas, &rf.ParentID, &rf.Codigo)
		if err != nil {
			return nil, "", ErrNoEncontrado
		}
		rf.Hijos = []*models.Referido{}
		return &rf, rf.Codigo, nil
	}

	return subarbol, codigoUsuario, nil
}

func (r *PostgresRepository) ObtenerComisionesUsuario(referidoID int) ([]models.Comision, float64, float64, error) {
	query := `
		SELECT c.id, c.pedido_id, c.referido_id, c.nivel, c.porcentaje, c.monto, c.estado, c.creado_en::text, c.liquidacion_id, p.numero
		FROM comisiones c
		JOIN pedidos p ON p.id = c.pedido_id
		WHERE c.referido_id = $1
		ORDER BY c.id DESC
	`
	rows, err := r.db.Query(query, referidoID)
	if err != nil {
		return nil, 0, 0, err
	}
	defer rows.Close()

	var totalPendiente float64 = 0
	var totalPagado float64 = 0
	comisiones := make([]models.Comision, 0)

	for rows.Next() {
		var c models.Comision
		if err := rows.Scan(&c.ID, &c.PedidoID, &c.ReferidoID, &c.Nivel, &c.Porcentaje, &c.Monto, &c.Estado, &c.CreadoEn, &c.LiquidacionID, &c.PedidoNumero); err != nil {
			return nil, 0, 0, err
		}
		if c.Estado == "pendiente" {
			totalPendiente += c.Monto
		} else if c.Estado == "pagada" {
			totalPagado += c.Monto
		}
		comisiones = append(comisiones, c)
	}

	return comisiones, totalPendiente, totalPagado, nil
}

// ==========================================
// 5. LIQUIDACIONES A DISTRIBUIDORES
// ==========================================

func (r *PostgresRepository) CrearLiquidacion(referidoID int) (*models.Liquidacion, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Bloquear y sumar comisiones pendientes
	var totalPendiente float64
	err = tx.QueryRow(`
		SELECT COALESCE(SUM(monto), 0)
		FROM comisiones 
		WHERE referido_id = $1 AND estado = 'pendiente'
	`, referidoID).Scan(&totalPendiente)

	if err != nil {
		return nil, err
	}
	if totalPendiente <= 0 {
		return nil, ErrSinComisiones
	}

	// 2. Crear registro de liquidación
	var liqID int
	var fecha time.Time
	queryLiq := `
		INSERT INTO liquidaciones (referido_id, total, estado, pagada_en)
		VALUES ($1, $2, 'pagada', NOW())
		RETURNING id, pagada_en
	`
	err = tx.QueryRow(queryLiq, referidoID, totalPendiente).Scan(&liqID, &fecha)
	if err != nil {
		return nil, fmt.Errorf("error al crear liquidación: %w", err)
	}

	// 3. Marcar comisiones como pagadas
	_, err = tx.Exec(`
		UPDATE comisiones 
		SET estado = 'pagada', liquidacion_id = $1 
		WHERE referido_id = $2 AND estado = 'pendiente'
	`, liqID, referidoID)
	if err != nil {
		return nil, fmt.Errorf("error al actualizar comisiones: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &models.Liquidacion{
		ID:         liqID,
		ReferidoID: referidoID,
		Total:      totalPendiente,
		Estado:     "pagada",
		PagadaEn:   fecha.Format("02/01/2006 15:04:05"),
	}, nil
}

func (r *PostgresRepository) ListarLiquidaciones(page, limit int) (*models.Pagina[models.Liquidacion], error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int
	_ = r.db.QueryRow("SELECT COUNT(*) FROM liquidaciones").Scan(&total)

	query := `
		SELECT l.id, l.referido_id, l.total, l.estado, l.creado_en::text, l.pagada_en::text, r.nombre
		FROM liquidaciones l
		JOIN referidos r ON r.id = l.referido_id
		ORDER BY l.id DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Liquidacion, 0)
	for rows.Next() {
		var l models.Liquidacion
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.Total, &l.Estado, &l.CreadoEn, &l.PagadaEn, &l.Distribuidor); err == nil {
			items = append(items, l)
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return &models.Pagina[models.Liquidacion]{
		Data:       items,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresRepository) ListarLiquidacionesUsuario(referidoID int) ([]models.Liquidacion, error) {
	query := `
		SELECT id, referido_id, total, estado, creado_en::text, pagada_en::text
		FROM liquidaciones
		WHERE referido_id = $1
		ORDER BY id DESC
	`
	rows, err := r.db.Query(query, referidoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.Liquidacion, 0)
	for rows.Next() {
		var l models.Liquidacion
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.Total, &l.Estado, &l.CreadoEn, &l.PagadaEn); err == nil {
			items = append(items, l)
		}
	}
	return items, nil
}

// ==========================================
// 6. REPORTES DE GESTIÓN Y ANALÍTICA
// ==========================================

func (r *PostgresRepository) ObtenerResumenReportes(desde, hasta string) (*models.ResumenReporte, error) {
	whereClause := "WHERE COALESCE(estado, 'pendiente') != 'cancelado'"
	args := []interface{}{}

	if strings.TrimSpace(desde) != "" {
		whereClause += " AND fecha >= $1"
		args = append(args, desde)
	}
	if strings.TrimSpace(hasta) != "" {
		if len(args) == 1 {
			whereClause += " AND fecha <= $2"
		} else {
			whereClause += " AND fecha <= $1"
		}
		args = append(args, hasta)
	}

	query := fmt.Sprintf(`
		SELECT 
			COALESCE(SUM(total), 0),
			COUNT(*),
			COALESCE(AVG(total), 0)
		FROM pedidos
		%s
	`, whereClause)

	var res models.ResumenReporte
	var err error
	if len(args) > 0 {
		err = r.db.QueryRow(query, args...).Scan(&res.TotalVendido, &res.TotalPedidos, &res.TicketPromedio)
	} else {
		err = r.db.QueryRow(query).Scan(&res.TotalVendido, &res.TotalPedidos, &res.TicketPromedio)
	}
	if err != nil {
		return nil, err
	}

	// Comisiones devengadas totales
	_ = r.db.QueryRow("SELECT COALESCE(SUM(monto), 0) FROM comisiones WHERE estado != 'revertida'").Scan(&res.ComisionesDevengadas)

	return &res, nil
}

func (r *PostgresRepository) ObtenerTopProductos(limit int) ([]models.TopProductoReporte, error) {
	if limit < 1 {
		limit = 5
	}
	query := `
		SELECT 
			pi.producto_id,
			pi.nombre,
			SUM(pi.cantidad) as total_qty,
			SUM(pi.cantidad * pi.precio) as total_sales
		FROM pedido_items pi
		JOIN pedidos p ON p.id = pi.pedido_id
		WHERE COALESCE(p.estado, 'pendiente') != 'cancelado' AND pi.producto_id IS NOT NULL
		GROUP BY pi.producto_id, pi.nombre
		ORDER BY total_sales DESC
		LIMIT $1
	`
	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.TopProductoReporte, 0)
	for rows.Next() {
		var it models.TopProductoReporte
		if err := rows.Scan(&it.ProductoID, &it.Nombre, &it.CantidadVendida, &it.TotalVendido); err == nil {
			items = append(items, it)
		}
	}
	return items, nil
}

func (r *PostgresRepository) ObtenerTopReferidos(limit int) ([]models.TopReferidoReporte, error) {
	if limit < 1 {
		limit = 5
	}
	query := `
		SELECT id, nombre, COALESCE(codigo, ''), nivel, ventas
		FROM referidos
		ORDER BY ventas DESC
		LIMIT $1
	`
	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.TopReferidoReporte, 0)
	for rows.Next() {
		var it models.TopReferidoReporte
		if err := rows.Scan(&it.ReferidoID, &it.Nombre, &it.Codigo, &it.Nivel, &it.VentasRed); err == nil {
			items = append(items, it)
		}
	}
	return items, nil
}

func (r *PostgresRepository) ObtenerDeudaComisiones() ([]models.DeudaComisionesReporte, error) {
	query := `
		SELECT r.id, r.nombre, COALESCE(r.codigo, ''), SUM(c.monto)
		FROM comisiones c
		JOIN referidos r ON r.id = c.referido_id
		WHERE c.estado = 'pendiente'
		GROUP BY r.id, r.nombre, r.codigo
		HAVING SUM(c.monto) > 0
		ORDER BY SUM(c.monto) DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.DeudaComisionesReporte, 0)
	for rows.Next() {
		var it models.DeudaComisionesReporte
		if err := rows.Scan(&it.ReferidoID, &it.Nombre, &it.Codigo, &it.ComisionesPendientes); err == nil {
			items = append(items, it)
		}
	}
	return items, nil
}
