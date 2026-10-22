import { useState, useEffect } from "react";
import { apiFetch } from "../services/http";
import {
  type Referido,
  contarRed,
  sumarVentasRed,
  nivelAlcanzado,
  TASA_COMISION,
} from "../data/red";

interface RedMiaResponse {
  arbol: Referido;
  codigoReferido: string;
  linkInvitacion: string;
}

interface Comision {
  id: number;
  referido_id: number;
  pedido_id: number;
  nivel: number;
  porcentaje: number;
  monto: number;
  estado: "pendiente" | "pagada" | "revertida";
  liquidacion_id?: number | null;
  creado_en: string;
}

interface MisComisionesResponse {
  comisiones: Comision[];
  totalPendiente: number;
  totalPagado: number;
}

const NIVEL_ESTILO: Record<number, { badge: string; border: string; tasa: string }> = {
  1: { badge: "bg-indigo-100 text-indigo-700", border: "border-indigo-200", tasa: "10 %" },
  2: { badge: "bg-purple-100 text-purple-700", border: "border-purple-200", tasa: "5 %" },
  3: { badge: "bg-pink-100 text-pink-700", border: "border-pink-200", tasa: "2 %" },
};

const ESTADOS_COMISION: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  pendiente: {
    label: "Pendiente",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  pagada: {
    label: "Pagada",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  revertida: {
    label: "Revertida (Cancelación)",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

// Componente recursivo para renderizar la jerarquía de la red
const NodoReferido = ({ nodo }: { nodo: Referido }) => {
  const estilo = NIVEL_ESTILO[nodo.nivel] ?? NIVEL_ESTILO[1];
  const tasa = TASA_COMISION[nodo.nivel] ?? 0;
  const comisionEstimada = nodo.ventas * tasa;

  return (
    <li>
      <div
        className={`bg-white rounded-lg border ${estilo.border} shadow-sm p-4 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
            {nodo.nombre.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{nodo.nombre}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${estilo.badge}`}
              >
                Nivel {nodo.nivel} · {estilo.tasa}
              </span>
              {nodo.codigo && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {nodo.codigo}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-medium">Ventas de Red</p>
          <p className="font-bold text-slate-900">${nodo.ventas.toLocaleString()}</p>
          <p className="text-xs text-indigo-600 font-semibold mt-0.5">
            +${comisionEstimada.toFixed(2)} potencial
          </p>
        </div>
      </div>

      {/* Nodos descendientes */}
      {nodo.hijos && nodo.hijos.length > 0 && (
        <ul className="mt-3 ml-6 space-y-3 border-l-2 border-indigo-100 pl-4">
          {nodo.hijos.map((hijo) => (
            <NodoReferido key={hijo.id} nodo={hijo} />
          ))}
        </ul>
      )}
    </li>
  );
};

const MiRed = () => {
  const [arbol, setArbol] = useState<Referido | null>(null);
  const [codigoReferido, setCodigoReferido] = useState<string>("");
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [totalPendiente, setTotalPendiente] = useState<number>(0);
  const [totalPagado, setTotalPagado] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [copiado, setCopiado] = useState<boolean>(false);

  useEffect(() => {
    let cancel = false;
    Promise.all([
      apiFetch<RedMiaResponse>("/api/red/mia"),
      apiFetch<MisComisionesResponse>("/api/comisiones/mias"),
    ])
      .then(([resRed, resCom]) => {
        if (!cancel) {
          setArbol(resRed.arbol);
          setCodigoReferido(resRed.codigoReferido);
          setComisiones(resCom.comisiones || []);
          setTotalPendiente(resCom.totalPendiente || 0);
          setTotalPagado(resCom.totalPagado || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancel) {
          setError(
            err instanceof Error ? err.message : "Error al cargar la información de tu red multinivel"
          );
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, []);

  const handleCopiarEnlace = () => {
    const enlace = `${window.location.origin}/registro?ref=${codigoReferido}`;
    navigator.clipboard.writeText(enlace);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const totalDevengado = totalPendiente + totalPagado;
  const directos = arbol?.hijos?.length ?? 0;
  const totalDescendientes = arbol ? contarRed(arbol) : 0;
  const ventasRed = arbol ? sumarVentasRed(arbol) : 0;
  const nivel = nivelAlcanzado(directos);

  return (
    <div className="space-y-8">
      {/* Encabezado y Link de Invitación */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Red Multinivel</h1>
        <p className="text-sm text-slate-500">
          Estructura de distribuidores: gana el 10% de nivel 1, 5% de nivel 2 y 2% de nivel 3
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Banner de Invitación con Enlace Copiable */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-200">
            Tu Enlace de Afiliación
          </span>
          <h2 className="text-xl font-bold mt-1">Invita y Expande tu Red</h2>
          <p className="text-sm text-indigo-100 mt-1">
            Tu código de patrocinador es:{" "}
            <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
              {codigoReferido || "CARGANDO..."}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopiarEnlace}
            disabled={!codigoReferido}
            className="min-h-[44px] px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            {copiado ? "¡Enlace Copiado!" : "Copiar Enlace de Referido"}
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero y Red */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Total Devengado</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            ${totalDevengado.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Histórico generado por la red</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Saldo Pendiente</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            ${totalPendiente.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Por liquidar por administración</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Total Ya Cobrado</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            ${totalPagado.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Comisiones liquidadas con éxito</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Miembros en tu Red</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {totalDescendientes}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {directos} directos · Rango {nivel} · ${ventasRed.toLocaleString()} ventas
          </p>
        </div>
      </div>

      {/* Árbol Visual de la Red */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Jerarquía de tu Red</h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Cargando jerarquía...</div>
        ) : !arbol || !arbol.hijos || arbol.hijos.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Aún no tienes referidos en tu red.</p>
            <p className="text-xs">
              Comparte tu enlace de invitación para que tus afiliados se registren bajo tu código.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {arbol.hijos.map((hijo) => (
              <NodoReferido key={hijo.id} nodo={hijo} />
            ))}
          </ul>
        )}
      </div>

      {/* Libro Mayor de Comisiones (Ledger ACID) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Libro Mayor de Mis Comisiones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro auditable y trazable de cada comisión generada por pedido
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            {comisiones.length} registros
          </span>
        </div>

        {comisiones.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tienes comisiones registradas aún en el libro mayor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Comisión #</th>
                  <th className="py-3 px-4">Pedido #</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">Nivel Red</th>
                  <th className="py-3 px-4 text-right">Porcentaje</th>
                  <th className="py-3 px-4 text-right">Monto Ganado</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {comisiones.map((c) => {
                  const estadoCfg =
                    ESTADOS_COMISION[c.estado] ?? ESTADOS_COMISION.pendiente;
                  const fecha = new Date(c.creado_en).toLocaleString("es-EC", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        #{c.id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Pedido #{c.pedido_id}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{fecha}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded text-xs">
                          Nivel {c.nivel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {(c.porcentaje * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${c.monto.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${estadoCfg.bg} ${estadoCfg.text} ${estadoCfg.border}`}
                        >
                          {estadoCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiRed;
