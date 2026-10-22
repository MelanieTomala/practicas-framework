package models

import "github.com/golang-jwt/jwt/v5"

// LoginRequest define el cuerpo esperado al iniciar sesión
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest define los campos necesarios para crear una nueva cuenta y nodo MLM
type RegisterRequest struct {
	Nombre   string `json:"nombre"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Ref      string `json:"ref,omitempty"`
}

// Producto define un artículo del catálogo completo
type Producto struct {
	ID          int      `json:"id"`
	Nombre      string   `json:"nombre"`
	Descripcion string   `json:"descripcion,omitempty"`
	Precio      float64  `json:"precio"`
	Stock       int      `json:"stock"`
	Categoria   string   `json:"categoria,omitempty"`
	Img         string   `json:"img"`
	Galeria     []string `json:"galeria,omitempty"`
	Activo      bool     `json:"activo"`
}

// APIError estandariza las respuestas de error en la API
type APIError struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Usuario representa una cuenta registrada en el sistema
type Usuario struct {
	ID         int    `json:"id"`
	Nombre     string `json:"nombre"`
	Email      string `json:"email"`
	Password   string `json:"-"`
	Rol        string `json:"rol"`
	Activo     bool   `json:"activo"`
	ReferidoID *int   `json:"referido_id,omitempty"`
	CreadoEn   string `json:"creado_en,omitempty"`
}

// Referido define un nodo de la red multinivel
type Referido struct {
	ID       int         `json:"id"`
	Nombre   string      `json:"nombre"`
	Nivel    int         `json:"nivel"`
	Ventas   float64     `json:"ventas"`
	ParentID *int        `json:"parent_id"`
	Codigo   string      `json:"codigo,omitempty"`
	Hijos    []*Referido `json:"hijos,omitempty"`
}

// ClienteDatos contiene la información del destinatario del pedido
type ClienteDatos struct {
	Nombre    string `json:"nombre"`
	Email     string `json:"email"`
	Direccion string `json:"direccion"`
	Ciudad    string `json:"ciudad"`
	Telefono  string `json:"telefono"`
}

// ItemPedido representa cada producto y cantidad dentro de una orden
type ItemPedido struct {
	ProductoID int     `json:"id,omitempty"`
	Nombre     string  `json:"nombre"`
	Cantidad   int     `json:"cantidad"`
	Precio     float64 `json:"precio"`
}

// CheckoutRequest estructura la petición para procesar una compra transaccional
type CheckoutRequest struct {
	Numero     string       `json:"numero,omitempty"`
	Cliente    ClienteDatos `json:"cliente"`
	MetodoPago string       `json:"metodoPago"`
	Items      []ItemPedido `json:"items"`
	Total      float64      `json:"total"`
	UsuarioID  *int         `json:"usuarioId,omitempty"`
}

// PedidoResponse estructura la respuesta al confirmar el pedido
type PedidoResponse struct {
	ID         int          `json:"id"`
	Numero     string       `json:"numero"`
	Cliente    ClienteDatos `json:"cliente"`
	MetodoPago string       `json:"metodoPago"`
	Items      []ItemPedido `json:"items"`
	Total      float64      `json:"total"`
	Estado     string       `json:"estado"`
	Fecha      string       `json:"fecha"`
	Mensaje    string       `json:"mensaje,omitempty"`
}

// Comision representa una entrada del ledger auditable de comisiones
type Comision struct {
	ID            int     `json:"id"`
	PedidoID      int     `json:"pedido_id"`
	ReferidoID    int     `json:"referido_id"`
	Nivel         int     `json:"nivel"`
	Porcentaje    float64 `json:"porcentaje"`
	Monto         float64 `json:"monto"`
	Estado        string  `json:"estado"`
	CreadoEn      string  `json:"creado_en"`
	LiquidacionID *int    `json:"liquidacion_id,omitempty"`
	PedidoNumero  string  `json:"pedido_numero,omitempty"`
}

// Liquidacion representa un desembolso consolidado a un distribuidor
type Liquidacion struct {
	ID         int     `json:"id"`
	ReferidoID int     `json:"referido_id"`
	Total      float64 `json:"total"`
	Estado     string  `json:"estado"`
	CreadoEn   string  `json:"creado_en"`
	PagadaEn   string  `json:"pagada_en"`
	Distribuidor string `json:"distribuidor,omitempty"`
}

// Pagina estructura respuestas paginadas estandarizadas
type Pagina[T any] struct {
	Data       []T `json:"data"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// ResumenReporte contiene KPIs consolidados de ventas y comisiones
type ResumenReporte struct {
	TotalVendido         float64 `json:"totalVendido"`
	TotalPedidos         int     `json:"totalPedidos"`
	TicketPromedio       float64 `json:"ticketPromedio"`
	ComisionesDevengadas float64 `json:"comisionesDevengadas"`
}

// TopProductoReporte agrupa estadísticas por producto vendido
type TopProductoReporte struct {
	ProductoID      int     `json:"producto_id"`
	Nombre          string  `json:"nombre"`
	CantidadVendida int     `json:"cantidad_vendida"`
	TotalVendido    float64 `json:"total_vendido"`
}

// TopReferidoReporte agrupa ventas por líder de red
type TopReferidoReporte struct {
	ReferidoID int     `json:"referido_id"`
	Nombre     string  `json:"nombre"`
	Codigo     string  `json:"codigo"`
	Nivel      int     `json:"nivel"`
	VentasRed  float64 `json:"ventas_red"`
}

// DeudaComisionesReporte consolida comisiones pendientes por cobrar
type DeudaComisionesReporte struct {
	ReferidoID           int     `json:"referido_id"`
	Nombre               string  `json:"nombre"`
	Codigo               string  `json:"codigo"`
	ComisionesPendientes float64 `json:"comisiones_pendientes"`
}

// JWTClaims define las claims estándar y personalizadas para la autenticación JWT
type JWTClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Rol   string `json:"rol"`
	jwt.RegisteredClaims
}