import { useState, useEffect } from "react";
import { apiFetch, ApiError, isNetworkError } from "../services/http";

interface PedidoItem {
  id?: number;
  pedido_id?: number;
  producto_id?: number;
  producto_nombre?: string;
  nombre?: string;
  cantidad: number;
  precio_unitario?: number;
  precio?: number;
  subtotal?: number;
}

interface Pedido {
  id: number;
  usuario_id?: number;
  numero?: string;
  total: number;
  estado: string;
  creado_en?: string;
  fecha?: string;
  cliente: {
    nombre: string;
    email: string;
    telefono: string;
    direccion: string;
    ciudad: string;
  };
  items: PedidoItem[];
}

interface PaginaPedidos {
  data: Pedido[];
  page: number;
  limit: number;
  total: number;
}

const ESTADOS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  pendiente: {
    label: "Pendiente",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  en_preparacion: {
    label: "En Preparación",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  preparando: {
    label: "En Preparación",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  enviado: {
    label: "Enviado",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  entregado: {
    label: "Entregado",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

const ESTADOS_LISTA = [
  { value: "", label: "Todos los Estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_preparacion", label: "En Preparación" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const AdminPedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Modal para ver items
  const [detallePedido, setDetallePedido] = useState<Pedido | null>(null);

  // Modal para confirmar cancelación
  const [pedidoACancelar, setPedidoACancelar] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    const query = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(filtroEstado ? { estado: filtroEstado } : {}),
    });

    apiFetch<PaginaPedidos>(`/api/pedidos?${query.toString()}`)
      .then((res) => {
        if (!cancel) {
          setPedidos(res.data || []);
          setTotal(res.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancel) {
          if (!isNetworkError(err)) {
            setError(err instanceof Error ? err.message : "Error al cargar la lista de pedidos");
          }
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, [page, filtroEstado, refreshKey]);

  const handleCambioEstado = async (id: number, nuevoEstado: string) => {
    if (nuevoEstado === "cancelado") {
      setPedidoACancelar(id);
      return;
    }

    ejecutarCambioEstado(id, nuevoEstado);
  };

  const ejecutarCambioEstado = async (id: number, nuevoEstado: string) => {
    setUpdatingId(id);
    setError("");
    try {
      await apiFetch(`/api/pedidos/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al actualizar el estado del pedido");
      }
    } finally {
      setUpdatingId(null);
      setPedidoACancelar(null);
    }
  };

  const totalPages = Math.ceil(total / 10) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Pedidos</h1>
          <p className="text-sm text-slate-500">
            Supervisa el estado de entrega, despachos y control transaccional
          </p>
        </div>

        {/* Filtro por estado */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Filtrar:</label>
          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPage(1);
            }}
            className="min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            {ESTADOS_LISTA.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No se encontraron pedidos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Pedido #</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Actualizar Estado</th>
                  <th className="py-3 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pedidos.map((pedido) => {
                  const estadoCfg =
                    ESTADOS_CONFIG[pedido.estado] ?? ESTADOS_CONFIG.pendiente;
                  const fechaRaw = pedido.creado_en || pedido.fecha;
                  const fechaFormateada = fechaRaw && typeof fechaRaw === 'string' && fechaRaw.includes('/')
                    ? fechaRaw
                    : fechaRaw
                      ? new Date(fechaRaw).toLocaleString("es-EC", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "Reciente";
                  const isUpdating = updatingId === pedido.id;

                  return (
                    <tr key={pedido.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        #{pedido.id}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">
                          {pedido.cliente?.nombre || "Consumidor Final"}
                        </p>
                        <p className="text-xs text-slate-500">{pedido.cliente?.email}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {fechaFormateada}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ${pedido.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${estadoCfg.bg} ${estadoCfg.text} ${estadoCfg.border}`}
                        >
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={pedido.estado === "preparando" ? "en_preparacion" : pedido.estado}
                          disabled={isUpdating || pedido.estado === "cancelado"}
                          onChange={(e) => handleCambioEstado(pedido.id, e.target.value)}
                          className="min-h-[44px] px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-600 outline-none disabled:opacity-50"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_preparacion">En Preparación</option>
                          <option value="enviado">Enviado</option>
                          <option value="entregado">Entregado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDetallePedido(pedido)}
                          className="min-h-[44px] px-3 py-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-medium transition text-xs"
                        >
                          Ver Items ({pedido.items?.length || 0})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Total pedidos: <span className="font-semibold text-slate-800">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="min-h-[44px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600 px-2">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="min-h-[44px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Items */}
      {detallePedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Detalle del Pedido #{detallePedido.id}
              </h2>
              <button
                onClick={() => setDetallePedido(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Cliente:</strong> {detallePedido.cliente?.nombre} (
                  {detallePedido.cliente?.email})
                </p>
                <p>
                  <strong>Destino:</strong> {detallePedido.cliente?.direccion},{" "}
                  {detallePedido.cliente?.ciudad}
                </p>
                <p>
                  <strong>Teléfono:</strong> {detallePedido.cliente?.telefono}
                </p>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Cant.</th>
                    <th className="pb-2 text-right">Unitario</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detallePedido.items?.map((item, idx) => {
                    const nombre = item.producto_nombre || item.nombre || "Producto";
                    const unitario = item.precio_unitario ?? item.precio ?? 0;
                    const subtotal = item.subtotal ?? (unitario * item.cantidad);
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-2 font-medium text-slate-800">
                          {nombre}
                        </td>
                        <td className="py-2 text-center text-slate-600">{item.cantidad}</td>
                        <td className="py-2 text-right text-slate-600">
                          ${unitario.toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-semibold text-slate-900">
                          ${subtotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Total Liquidado:</span>
                <span className="text-lg font-bold text-slate-900">
                  ${detallePedido.total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setDetallePedido(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia Cancelación Transaccional */}
      {pedidoACancelar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              ¿Cancelar el Pedido #{pedidoACancelar}?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Esta acción es irreversible y ejecutará un proceso transaccional ACID:
              <br />
              • Se restituirá el stock físico de cada producto al inventario.
              <br />
              • Se revertirán las comisiones devengadas por la red multinivel (Clawback).
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPedidoACancelar(null)}
                className="min-h-[44px] px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
              >
                No, volver
              </button>
              <button
                onClick={() => ejecutarCambioEstado(pedidoACancelar, "cancelado")}
                className="min-h-[44px] px-5 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPedidos;

