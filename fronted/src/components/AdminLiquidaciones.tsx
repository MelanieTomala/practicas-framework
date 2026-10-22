import { useState, useEffect } from "react";
import { apiFetch, ApiError } from "../services/http";

interface DeudaDistribuidor {
  referido_id: number;
  nombre: string;
  email?: string;
  codigo: string;
  comisiones_pendientes?: number;
  pendiente?: number;
  cantidad?: number;
}

interface Liquidacion {
  id: number;
  referido_id: number;
  total: number;
  creado_en: string;
}

interface PaginaLiquidaciones {
  data: Liquidacion[];
  page: number;
  limit: number;
  total: number;
}

const AdminLiquidaciones = () => {
  const [deudas, setDeudas] = useState<DeudaDistribuidor[]>([]);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [totalHistorial, setTotalHistorial] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [liquidandoId, setLiquidandoId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [mensajeExito, setMensajeExito] = useState<string>("");

  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    apiFetch<DeudaDistribuidor[]>("/api/reportes/comisiones-pendientes")
      .then((pendientes) => {
        if (!cancel) setDeudas(pendientes || []);
      })
      .catch((err) => {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "Error al cargar datos de liquidaciones");
        }
      });

    apiFetch<PaginaLiquidaciones>(`/api/liquidaciones?page=${page}&limit=5`)
      .then((resHistorial) => {
        if (!cancel) {
          setHistorial(resHistorial.data || []);
          setTotalHistorial(resHistorial.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "Error al cargar historial");
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, [page, refreshKey]);

  const handleLiquidar = async (referidoId: number, nombre: string, monto: number) => {
    if (
      !window.confirm(
        `¿Confirmar el pago y liquidación de $${monto.toFixed(2)} para ${nombre}?`
      )
    ) {
      return;
    }

    setLiquidandoId(referidoId);
    setError("");
    setMensajeExito("");

    try {
      await apiFetch("/api/liquidaciones", {
        method: "POST",
        body: JSON.stringify({ referido_id: referidoId }),
      });
      setMensajeExito(
        `¡Liquidación procesada con éxito para ${nombre}! Las comisiones pasaron a estado pagada.`
      );
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al procesar la liquidación");
      }
    } finally {
      setLiquidandoId(null);
    }
  };

  const totalDeudaGlobal = deudas.reduce(
    (acc, d) => acc + (d.comisiones_pendientes ?? d.pendiente ?? 0),
    0
  );
  const totalPages = Math.ceil(totalHistorial / 5) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Liquidaciones y Cierre Financiero MLM
        </h1>
        <p className="text-sm text-slate-500">
          Gestiona el desembolso de comisiones acumuladas por la red de distribuidores
        </p>
      </div>

      {mensajeExito && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 text-sm font-medium">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* KPI Global de Deuda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">
            Deuda Pendiente Total
          </p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            ${totalDeudaGlobal.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Saldo a desembolsar en la red</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">
            Distribuidores con Saldo
          </p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{deudas.length}</p>
          <p className="text-xs text-slate-400 mt-1">Líderes con comisiones devengadas</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">
            Liquidaciones Realizadas
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{totalHistorial}</p>
          <p className="text-xs text-slate-400 mt-1">Transacciones procesadas históricas</p>
        </div>
      </div>

      {/* Sección 1: Distribuidores con Comisiones Pendientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Comisiones Pendientes por Desembolsar
          </h2>
          <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold">
            {deudas.length} pendientes
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Consultando libro mayor...</div>
        ) : deudas.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No existen comisiones pendientes por liquidar en este momento. ¡Todo al día!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Distribuidor</th>
                  <th className="py-3 px-4">Código Referido</th>
                  <th className="py-3 px-4 text-center">Nº Operaciones</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {deudas.map((d) => {
                  const isProcessing = liquidandoId === d.referido_id;
                  const saldo = d.comisiones_pendientes ?? d.pendiente ?? 0;
                  return (
                    <tr key={d.referido_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{d.nombre}</p>
                        {d.email && <p className="text-xs text-slate-500">{d.email}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-bold">
                          {d.codigo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">
                        {d.cantidad !== undefined ? `${d.cantidad} comisiones` : "Por liquidar"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600 text-base">
                        ${saldo.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleLiquidar(d.referido_id, d.nombre, saldo)}
                          disabled={isProcessing}
                          className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 shadow-sm"
                        >
                          {isProcessing ? "Procesando..." : "Liquidar Pago"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sección 2: Historial de Liquidaciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Historial de Liquidaciones</h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro inmutable de desembolsos completados
          </p>
        </div>

        {historial.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Aún no se han ejecutado liquidaciones históricas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Liquidación #</th>
                  <th className="py-3 px-4">ID Referido</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {historial.map((liq) => {
                  const fecha = new Date(liq.creado_en).toLocaleString("es-EC", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
                  return (
                    <tr key={liq.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">#{liq.id}</td>
                      <td className="py-3 px-4 text-slate-600">ID {liq.referido_id}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{fecha}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        ${liq.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Pagado
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación de Historial */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Total comprobantes:{" "}
            <span className="font-semibold text-slate-800">{totalHistorial}</span>
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
    </div>
  );
};

export default AdminLiquidaciones;
