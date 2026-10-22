import { useState, useEffect } from "react";
import { apiFetch, isNetworkError } from "../services/http";

interface ResumenReporte {
  totalVendido?: number;
  total_vendido?: number;
  totalPedidos?: number;
  cantidad_pedidos?: number;
  ticketPromedio?: number;
  ticket_promedio?: number;
  comisionesDevengadas?: number;
  comisiones_devengadas?: number;
  usuarios_activos?: number;
}

interface TopProducto {
  producto_id: number;
  nombre: string;
  categoria?: string;
  cantidad_vendida?: number;
  unidades?: number;
  total_vendido?: number;
  recaudado?: number;
}

interface TopReferido {
  referido_id: number;
  nombre: string;
  codigo: string;
  nivel?: number;
  ventas_red?: number;
  ventas?: number;
}

const Dashboard = () => {
  const [resumen, setResumen] = useState<ResumenReporte | null>(null);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [topReferidos, setTopReferidos] = useState<TopReferido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    Promise.all([
      apiFetch<ResumenReporte>("/api/reportes/resumen"),
      apiFetch<TopProducto[]>("/api/reportes/top-productos?limit=5"),
      apiFetch<TopReferido[]>("/api/reportes/top-referidos?limit=5"),
    ])
      .then(([resumenData, prodData, refData]) => {
        if (!cancel) {
          setResumen(resumenData);
          setTopProductos(prodData || []);
          setTopReferidos(refData || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancel) {
          if (!isNetworkError(err)) {
            setError(
              err instanceof Error ? err.message : "Error al cargar las métricas del dashboard"
            );
          }
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, []);

  const totalVendidoVal = resumen?.totalVendido ?? resumen?.total_vendido ?? 0;
  const totalPedidosVal = resumen?.totalPedidos ?? resumen?.cantidad_pedidos ?? 0;
  const ticketPromedioVal = resumen?.ticketPromedio ?? resumen?.ticket_promedio ?? 0;
  const comisionesVal = resumen?.comisionesDevengadas ?? resumen?.comisiones_devengadas ?? 0;

  const kpis = [
    {
      etiqueta: "Ventas Totales",
      valor: `$${totalVendidoVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtexto: "Volumen bruto procesado",
      color: "text-indigo-600",
    },
    {
      etiqueta: "Pedidos Completados",
      valor: totalPedidosVal.toString(),
      subtexto: "Transacciones de compra",
      color: "text-slate-900",
    },
    {
      etiqueta: "Ticket Promedio",
      valor: `$${ticketPromedioVal.toFixed(2)}`,
      subtexto: "Monto medio por pedido",
      color: "text-emerald-600",
    },
    {
      etiqueta: "Comisiones Red MLM",
      valor: `$${comisionesVal.toFixed(2)}`,
      subtexto: "Repartido a distribuidores",
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Control Ejecutivo</h1>
        <p className="text-sm text-slate-500">
          Métricas financieras y operativas consolidadas en tiempo real
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* ===== KPIs PRINCIPALES ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.etiqueta}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              {kpi.etiqueta}
            </p>
            <p className={`text-3xl font-extrabold mt-2 ${kpi.color}`}>{kpi.valor}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.subtexto}</p>
          </div>
        ))}
      </div>

      {/* ===== SECCIÓN DOBLE: TOP PRODUCTOS & TOP DISTRIBUIDORES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Productos */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Productos Más Vendidos</h2>
            <span className="text-xs text-slate-400">Por facturación</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-4">Cargando productos...</p>
          ) : topProductos.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              Aún no hay compras registradas en el periodo.
            </p>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p, idx) => {
                const unidades = p.cantidad_vendida ?? p.unidades ?? 0;
                const totalSales = p.total_vendido ?? p.recaudado ?? 0;

                return (
                  <div
                    key={p.producto_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{p.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {unidades} unidades {p.categoria ? `· ${p.categoria}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">
                      ${totalSales.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Distribuidores de la Red */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Líderes de Red Multinivel</h2>
            <span className="text-xs text-slate-400">Por volumen de ventas</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-4">Cargando distribuidores...</p>
          ) : topReferidos.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              Aún no hay ventas de red acumuladas.
            </p>
          ) : (
            <div className="space-y-3">
              {topReferidos.map((r, idx) => {
                const volume = r.ventas_red ?? r.ventas ?? 0;

                return (
                  <div
                    key={r.referido_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{r.nombre}</p>
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          Código: {r.codigo}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">
                        ${volume.toLocaleString()}
                      </p>
                      <p className="text-xs text-emerald-600 font-medium">Volumen total</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

