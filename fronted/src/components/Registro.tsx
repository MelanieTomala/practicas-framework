// src/components/Registro.tsx
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/auth";
import { apiFetch, ApiError, isNetworkError } from "../services/http";

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

      const loginData = await apiFetch<{ token: string; email: string; rol: string }>("/api/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      login({ email: loginData.email, rol: loginData.rol === "admin" ? "admin" : "cliente" }, loginData.token);

      setTimeout(() => {
        navigate("/tienda");
      }, 1000);
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError("El registro de cuentas requiere conexión a internet. Conectate a una red e intentá nuevamente.");
      } else if (err instanceof ApiError) {
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
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/melanie-logo.jpg"
              alt="Logotipo Melanie"
              className="w-20 h-20 object-contain rounded-xl border border-slate-100 p-1 shadow-xs"
            />
          </div>
          <div className="inline-block px-3 py-1 bg-[#FFF1F0] border border-[#FFD0CC] rounded-full mb-3">
            <span className="text-xs font-bold text-[#D93829] tracking-wider uppercase">
              Comunidad & Red
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Crear Cuenta en Melanie
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Sumate a la red MultiCatálogo y ganá comisiones
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-sm mb-6 text-center border border-red-200 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-lg text-sm mb-6 text-center border border-emerald-200 font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre Completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#371F76] focus:ring-2 focus:ring-[#371F76]/20 outline-none transition text-sm font-medium text-slate-800 placeholder-slate-400"
              placeholder="Ej. Melanie Tomalá"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#371F76] focus:ring-2 focus:ring-[#371F76]/20 outline-none transition text-sm font-medium text-slate-800 placeholder-slate-400"
              placeholder="tu-correo@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#371F76] focus:ring-2 focus:ring-[#371F76]/20 outline-none transition text-sm font-medium text-slate-800 placeholder-slate-400"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Código de Referido / Patrocinador
              </label>
              {initialRef && (
                <span className="text-[10px] bg-[#FFF1F0] text-[#D93829] font-bold px-2 py-0.5 rounded-full border border-[#FFD0CC]">
                  Invitación detectada
                </span>
              )}
            </div>
            <input
              type="text"
              value={codigoReferido}
              onChange={(e) => setCodigoReferido(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#371F76] focus:ring-2 focus:ring-[#371F76]/20 outline-none transition uppercase tracking-wider font-mono text-sm"
              placeholder="Ej. MELANIE, ADMIN..."
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Ingresá el código de quien te invitó para integrarte a su red multinivel.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] bg-[#371F76] hover:bg-[#281466] text-white font-bold py-3 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm tracking-wide cursor-pointer mt-2"
          >
            {loading ? "Creando tu cuenta..." : "Registrarme"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          ¿Ya tenés una cuenta?{" "}
          <Link to="/login" className="text-[#371F76] font-bold hover:underline">
            Iniciá sesión acá
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Registro;

