import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, type Rol } from "../context/auth";
import { apiFetch, ApiError, authenticateOffline, saveOfflineUser } from "../services/http";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { BotonInstalarApp } from "./BotonInstalarApp";
import { MelanieMark } from "./MelanieLogo";

interface LoginResponse {
  token: string;
  email: string;
  rol: string;
}

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const isOnline = useOnlineStatus();

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let data: { email: string; rol: string; token: string };

      if (!navigator.onLine) {
        data = authenticateOffline(email, password);
      } else {
        try {
          data = await apiFetch<LoginResponse>("/api/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });

          saveOfflineUser(data.email, data.rol === "admin" ? "admin" : "cliente", data.token);
        } catch (fetchErr: unknown) {
          if (!navigator.onLine || (fetchErr instanceof TypeError && fetchErr.message.includes("fetch"))) {
            data = authenticateOffline(email, password);
          } else {
            throw fetchErr;
          }
        }
      }

      const rol: Rol = data.rol === "admin" ? "admin" : "cliente";
      login({ email: data.email, rol }, data.token);

      navigate(rol === "admin" ? "/" : "/tienda");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-100 px-4 py-16 sm:py-20">
      {/* Barra superior del Login con botón de instalación */}
      <header className="absolute top-0 inset-x-0 p-4 sm:p-6 flex justify-between items-center z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 select-none">
          <MelanieMark className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">
            MultiCatálogo Melanie
          </span>
        </div>
        <div>
          <BotonInstalarApp variant="top-bar" />
        </div>
      </header>

      {/* Tarjeta Central de Login (sin z-index para no solapar modales en portal) */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative">
        {/* Cabecera Minimalista con Logo Melanie */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/melanie-logo.jpg"
              alt="Logotipo Melanie"
              className="w-24 h-24 object-contain rounded-xl border border-slate-100 p-1 shadow-xs"
            />
          </div>
          <div className="inline-block px-3 py-1 bg-[#FFF1F0] border border-[#FFD0CC] rounded-full mb-3">
            <span className="text-xs font-bold text-[#D93829] tracking-wider uppercase">
              Cosmética & Red
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            MultiCatálogo Melanie
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Ingresá a tu cuenta para continuar
          </p>

          {!isOnline && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-center justify-center gap-1.5">
              <span>📡</span>
              <span>Modo sin conexión: podés iniciar sesión con las cuentas de prueba.</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-sm mb-6 text-center border border-red-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#371F76] focus:ring-2 focus:ring-[#371F76]/20 outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="admin@upse.edu.ec"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#371F76] focus:ring-2 focus:ring-[#371F76]/20 outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] bg-[#371F76] hover:bg-[#281466] text-white font-bold py-3 rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm tracking-wide cursor-pointer"
          >
            {loading ? "Validando..." : isOnline ? "Iniciar Sesión" : "Acceder sin Conexión"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          ¿No tenés una cuenta?{" "}
          <Link to="/registro" className="text-[#371F76] font-bold hover:underline">
            Registrate acá
          </Link>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Cuentas de prueba:</p>
          <p>👑 Admin: <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">admin@upse.edu.ec / 123456</span></p>
          <p>🛍️ Cliente: <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">cliente@upse.edu.ec / 123456</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
