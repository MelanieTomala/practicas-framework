import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch, isNetworkError } from "../services/http";

interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Pedido {
  id: number;
  usuario_id?: number;
  total: number;
  estado: "pendiente" | "en_preparacion" | "enviado" | "entregado" | "cancelado";
  creado_en: string;
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

const MisPedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    apiFetch<PaginaPedidos>(`/api/pedidos/mios?page=${page}&limit=5`)
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
            setError(
              err instanceof Error ? err.message : "Error al cargar tu historial de pedidos"
            );
          }
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, [page]);

  const totalPages = Math.ceil(total / 5) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Pedidos</h1>
          <p className="text-sm text-slate-500">
            Revisa el estado de tus compras y comprobantes de entrega
          </p>
        </div>
        <Link
          to="/tienda"
          className="min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Nueva Compra
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          Cargando tus pedidos...
        </div>
      ) : pedidos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Aún no has realizado pedidos</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Explora nuestro catálogo y realiza tu primer pedido para generar comisiones en la red.
          </p>
          <Link
            to="/tienda"
            className="inline-block min-h-[44px] px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Ir a la Tienda
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => {
            const estadoCfg =
              ESTADOS_CONFIG[pedido.estado] ?? ESTADOS_CONFIG.pendiente;
            const fechaFormateada = new Date(pedido.creado_en).toLocaleString("es-EC", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            return (
              <div
                key={pedido.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      Pedido #{pedido.id}
                    </span>
                    <p className="text-sm text-slate-500 mt-0.5">{fechaFormateada}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${estadoCfg.bg} ${estadoCfg.text} ${estadoCfg.border}`}
                    >
                      {estadoCfg.label}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      ${pedido.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                        <th className="pb-2">Producto</th>
                        <th className="pb-2 text-center">Cant.</th>
                        <th className="pb-2 text-right">Precio Unit.</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pedido.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 font-medium text-slate-800">
                            {item.producto_nombre}
                          </td>
                          <td className="py-2.5 text-center text-slate-600">
                            {item.cantidad}
                          </td>
                          <td className="py-2.5 text-right text-slate-600">
                            ${item.precio_unitario.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            ${item.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Dirección de entrega */}
                {pedido.cliente?.direccion && (
                  <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1">
                    <span>
                      <strong>Envío a:</strong> {pedido.cliente.direccion},{" "}
                      {pedido.cliente.ciudad}
                    </span>
                    <span>
                      <strong>Teléfono:</strong> {pedido.cliente.telefono}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Paginación */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
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
      )}
    </div>
  );
};

export default MisPedidos;

