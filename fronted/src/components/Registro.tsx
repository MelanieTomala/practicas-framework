// src/components/Registro.tsx
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/auth";
import { apiFetch, ApiError } from "../services/http";

interface RegisterResponse {
  mensaje: string;
  usuario: {
    id: number;
    email: string;
    nombre: string;
    rol: string;
    codigo: string;
    referido_id?: number;
  };
}

const Registro = () => {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const [nombre, setNombre] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [codigoReferido, setCodigoReferido] = useState<string>(initialRef);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const regData = await apiFetch<RegisterResponse>("/api/register", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          password,
          codigo_referido: codigoReferido.trim().toUpperCase(),
        }),
      });

      setSuccessMsg(`¡Registro exitoso! Tu código de referido es ${regData.usuario.codigo}. Iniciando sesión...`);

      // Iniciar sesión automáticamente
      const loginData = await apiFetch<{ token: string; email: string; rol: string }>("/api/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      login({ email: loginData.email, rol: loginData.rol === "admin" ? "admin" : "cliente" }, loginData.token);

      setTimeout(() => {
        navigate("/tienda");
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado al registrar el usuario");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-slate-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Crear Cuenta</h2>
          <p className="text-slate-500 mt-2">
            Únete a la red MultiCatálogo y comienza a ganar comisiones
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm mb-6 text-center border border-emerald-200 font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
              placeholder="tu-correo@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Código de Referido / Patrocinador
              </label>
              {initialRef && (
                <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                  Invitación detectada
                </span>
              )}
            </div>
            <input
              type="text"
              value={codigoReferido}
              onChange={(e) => setCodigoReferido(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition uppercase tracking-wider font-mono"
              placeholder="Ej. JUAN, MARIA, LUIS..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Ingresa el código de quien te invitó para integrarte a su red multinivel.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Registro;
