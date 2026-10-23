import { useState, useEffect, useMemo } from "react";
import { apiFetch, isNetworkError } from "../services/http";

interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "cliente";
  activo: boolean;
  referido_id?: number;
  codigo_referido?: string;
  creado_en?: string;
}

interface PaginaUsuarios {
  data: UsuarioItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(50); // Traemos hasta 50 para navegación ágil
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [filterRol, setFilterRol] = useState<"todos" | "admin" | "cliente">("todos");
  const [filterEstado, setFilterEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<string>("");

  const cargarUsuarios = async (paginaNum = page) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<PaginaUsuarios>(`/api/usuarios?page=${paginaNum}&limit=${limit}`);
      setUsuarios(res.data || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      if (!isNetworkError(err)) {
        setError(err instanceof Error ? err.message : "Error al cargar los usuarios");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios(page);
  }, [page]);

  const handleToggleEstado = async (u: UsuarioItem) => {
    const nuevoEstado = !u.activo;
    setTogglingId(u.id);
    try {
      await apiFetch<{ mensaje: string; id: number; activo: boolean }>(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: nuevoEstado }),
      });

      setUsuarios((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, activo: nuevoEstado } : item))
      );

      setSuccessToast(
        `Usuario ${u.nombre || u.email} ${nuevoEstado ? "activado" : "desactivado"} correctamente`
      );
      setTimeout(() => setSuccessToast(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado del usuario");
    } finally {
      setTogglingId(null);
    }
  };

  // Filtrado reactivo en el cliente
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.codigo_referido && u.codigo_referido.toLowerCase().includes(q));

      const matchRol = filterRol === "todos" || u.rol === filterRol;
      const matchEstado =
        filterEstado === "todos" ||
        (filterEstado === "activos" && u.activo) ||
        (filterEstado === "inactivos" && !u.activo);

      return matchSearch && matchRol && matchEstado;
    });
  }, [usuarios, search, filterRol, filterEstado]);

  // Métricas rápidas
  const totalAdmins = usuarios.filter((u) => u.rol === "admin").length;
  const totalClientes = usuarios.filter((u) => u.rol === "cliente").length;
  const totalEnRed = usuarios.filter((u) => u.referido_id || u.codigo_referido).length;
  const totalActivos = usuarios.filter((u) => u.activo).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
              Administración
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visualiza todas las cuentas registradas, roles, nodos multinivel y controla su acceso al sistema.
          </p>
        </div>

        <button
          onClick={() => cargarUsuarios(page)}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-2xs transition flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
        >
          <svg
            className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Alertas y Notificaciones */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {successToast && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successToast}
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cuentas</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              {total || usuarios.length}
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{total || usuarios.length}</p>
          <span className="text-xs text-slate-400">Registrados en la plataforma</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Administradores</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              {totalAdmins}
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2">{totalAdmins}</p>
          <span className="text-xs text-slate-400">Acceso total al panel</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes & Dist.</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {totalClientes}
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{totalClientes}</p>
          <span className="text-xs text-slate-400">Compradores y afiliados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">En Red Multinivel</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              {totalEnRed}
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalEnRed}</p>
          <span className="text-xs text-slate-400">Generan y reciben comisiones</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo electrónico o código..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filtros de Selección */}
        <div className="flex items-center gap-3">
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value as "todos" | "admin" | "cliente")}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="todos">Todos los Roles</option>
            <option value="admin">Solo Administradores</option>
            <option value="cliente">Solo Clientes</option>
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as "todos" | "activos" | "inactivos")}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activos">Solo Activos</option>
            <option value="inactivos">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Rol</th>
                <th className="py-3.5 px-4">Código Referido</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Fecha Registro</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Cargando directorio de usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron usuarios que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const inicial = (u.nombre || u.email || "U").charAt(0).toUpperCase();
                  const fechaFormato = u.creado_en
                    ? new Date(u.creado_en).toLocaleDateString("es-EC", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Histórico";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      {/* Usuario e info básica */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                            {inicial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {u.nombre || "Usuario sin nombre"}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-4">
                        {u.rol === "admin" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Cliente
                          </span>
                        )}
                      </td>

                      {/* Código de Referido */}
                      <td className="py-3.5 px-4">
                        {u.codigo_referido ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                            {u.codigo_referido}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin nodo de red</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">{fechaFormato}</td>

                      {/* Botón Acción (Toggle Activo/Inactivo) */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(u)}
                          disabled={togglingId === u.id}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition border cursor-pointer disabled:opacity-50 ${
                            u.activo
                              ? "bg-white hover:bg-rose-50 text-rose-600 border-rose-200"
                              : "bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                        >
                          {togglingId === u.id ? (
                            "Guardando..."
                          ) : u.activo ? (
                            "Desactivar"
                          ) : (
                            "Activar"
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con conteo y paginación */}
        <div className="p-4 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Mostrando <strong className="text-slate-800">{usuariosFiltrados.length}</strong> de{" "}
            <strong className="text-slate-800">{usuarios.length}</strong> usuarios cargados ({totalActivos} activos)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Anterior
            </button>
            <span className="font-semibold text-slate-700">Página {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={usuarios.length < limit || loading}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
