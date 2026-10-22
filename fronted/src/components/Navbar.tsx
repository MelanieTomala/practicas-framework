import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { totalItems } = useCart();
  const { logout, user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate("/login");
  };

  const handleCloseMenu = () => {
    setUserMenuOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-30">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Botón Hamburguesa */}
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded-lg hover:bg-slate-100 transition text-[#371F76] focus:outline-none focus:ring-2 focus:ring-[#371F76]/30 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Alternar menú lateral"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-slate-900 font-bold text-base md:text-lg hidden sm:block">
            {user?.rol === "admin" ? "Panel de Administración" : "Tienda Melanie"}
          </h2>
          <span className="hidden lg:inline-block px-2.5 py-0.5 bg-[#FFF1F0] border border-[#FFD0CC] text-[#D93829] rounded-full text-[10px] font-bold uppercase tracking-wider">
            MultiCatálogo
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <Link
          to="/carrito"
          className="relative p-2.5 hover:bg-slate-100 rounded-full transition text-slate-700 hover:text-[#371F76] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Ver carrito de compras"
        >
          <span className="text-xl">🛒</span>
          {totalItems > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-[#F05043] text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full transform translate-x-1 -translate-y-1 shadow-xs">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-xs md:text-sm text-slate-600 font-medium hidden sm:block">
            {user?.email}
          </span>
          <span
            className={`hidden md:inline-block text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              user?.rol === "admin"
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-[#371F76]/10 text-[#371F76] border border-[#371F76]/20"
            }`}
          >
            {user?.rol}
          </span>

          {/* Menú de Usuario con toggle explícito por clic/tap (100% compatible con celulares) */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              type="button"
              className="w-10 h-10 rounded-full bg-[#371F76] text-white font-bold text-xs flex items-center justify-center border-2 border-slate-200 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#371F76]/40"
              aria-label="Abrir menú de usuario"
              aria-expanded={userMenuOpen}
            >
              {user?.email ? user.email.charAt(0).toUpperCase() : "M"}
            </button>

            {/* Backdrop invisible para cerrar el menú al hacer tap afuera */}
            {userMenuOpen && (
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={handleCloseMenu}
                aria-hidden="true"
              />
            )}

            {/* Dropdown del Usuario */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-xs text-slate-400 font-medium truncate">Conectado como</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#371F76]/10 text-[#371F76]">
                    {user?.rol}
                  </span>
                </div>

                <Link
                  to="/mis-pedidos"
                  onClick={handleCloseMenu}
                  className="w-full min-h-[44px] flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition font-medium"
                >
                  Mis Pedidos
                </Link>
                <Link
                  to="/mi-red"
                  onClick={handleCloseMenu}
                  className="w-full min-h-[44px] flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition font-medium"
                >
                  Mi Red & Comisiones
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full min-h-[44px] flex items-center gap-2 px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 transition cursor-pointer"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
