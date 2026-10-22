import { useState, useEffect, type FormEvent } from "react";
import { apiFetch, ApiError, isNetworkError } from "../services/http";
import type { Producto } from "../data/productos";

interface PaginaProductos {
  data: Producto[];
  page: number;
  limit: number;
  total: number;
}

interface ProductFormData {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  stock: number;
  img: string;
}

const INITIAL_FORM: ProductFormData = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoria: "Serum",
  stock: 10,
  img: "https://picsum.photos/seed/prod/600",
};

const CATEGORIAS = ["Serum", "Crema", "Tónico", "Mascarilla", "Kit", "General"];

const AdminProductos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Modal de creación / edición
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    const query = new URLSearchParams({
      page: page.toString(),
      limit: "8",
      q: search.trim(),
    });

    apiFetch<PaginaProductos>(`/api/admin/productos?${query.toString()}`)
      .then((res) => {
        if (!cancel) {
          setProductos(res.data || []);
          setTotal(res.total || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancel) {
          if (!isNetworkError(err)) {
            setError(err instanceof Error ? err.message : "Error al cargar la lista de productos");
          }
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, [page, search, refreshKey]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Producto) => {
    setEditingId(p.id);
    setFormData({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categoria: p.categoria,
      stock: p.stock ?? 0,
      img: p.img,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingId) {
        // PUT /api/productos/:id
        await apiFetch(`/api/productos/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        // POST /api/productos
        await apiFetch("/api/productos", {
          method: "POST",
          body: JSON.stringify({
            ...formData,
            galeria: [formData.img],
          }),
        });
      }
      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al guardar el producto");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (id: number, activoActual: boolean) => {
    const accion = activoActual ? "desactivar" : "activar";
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} este producto?`)) {
      return;
    }

    try {
      if (activoActual) {
        // DELETE lógico
        await apiFetch(`/api/productos/${id}`, { method: "DELETE" });
      } else {
        // Reactivar mediante PUT
        const prod = productos.find((p) => p.id === id);
        if (prod) {
          await apiFetch(`/api/productos/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              nombre: prod.nombre,
              descripcion: prod.descripcion,
              precio: prod.precio,
              categoria: prod.categoria,
              stock: prod.stock ?? 10,
              img: prod.img,
              activo: true,
            }),
          });
        }
      }
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al modificar el estado del producto");
      }
    }
  };

  const totalPages = Math.ceil(total / 8) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Catálogo</h1>
          <p className="text-sm text-slate-500">
            Administra productos, inventario, precios y estados visibles
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="min-h-[44px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="w-5 h-5 absolute left-3 top-3 text-slate-400"
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o descripción..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando catálogo...</div>
        ) : productos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No se encontraron productos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Precio</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {productos.map((prod) => {
                  const isActivo = prod.activo ?? true;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img
                          src={prod.img}
                          alt={prod.nombre}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{prod.nombre}</p>
                          <p className="text-xs text-slate-500 truncate max-w-xs">
                            {prod.descripcion}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                          {prod.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ${prod.precio.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            (prod.stock ?? 0) <= 5
                              ? "text-red-600"
                              : (prod.stock ?? 0) <= 15
                              ? "text-amber-600"
                              : "text-slate-700"
                          }`}
                        >
                          {prod.stock ?? 0} unid.
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isActivo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {isActivo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="min-h-[44px] px-3 py-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-medium transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActivo(prod.id, isActivo)}
                          className={`min-h-[44px] px-3 py-1.5 rounded-lg font-medium transition ${
                            isActivo
                              ? "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                              : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          }`}
                        >
                          {isActivo ? "Desactivar" : "Reactivar"}
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
            Total: <span className="font-semibold text-slate-800">{total}</span> productos
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

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingId ? "Editar Producto" : "Nuevo Producto"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) =>
                      setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  URL de Imagen
                </label>
                <input
                  type="url"
                  value={formData.img}
                  onChange={(e) => setFormData({ ...formData, img: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductos;

