// src/components/Sidebar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { MelanieMark } from "./MelanieLogo";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

interface NavItem {
  to: string;
  label: string;
  title: string;
  icon: string;
  soloAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    title: "Dashboard",
    soloAdmin: true,
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    to: "/tienda",
    label: "Tienda",
    title: "Tienda",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  },
  {
    to: "/catalogo",
    label: "Catálogo",
    title: "Catálogo",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    to: "/mis-pedidos",
    label: "Mis Pedidos",
    title: "Mis Pedidos",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    to: "/mi-red",
    label: "Mi Red & Comisiones",
    title: "Mi Red y Comisiones",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    to: "/admin/productos",
    label: "Gestión Catálogo",
    title: "Gestión de Catálogo",
    soloAdmin: true,
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    to: "/admin/pedidos",
    label: "Gestión Pedidos",
    title: "Gestión de Pedidos",
    soloAdmin: true,
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    to: "/admin/liquidaciones",
    label: "Liquidaciones MLM",
    title: "Liquidaciones MLM",
    soloAdmin: true,
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

const Sidebar = ({ isCollapsed, isMobileOpen, closeMobileMenu }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((item) => !item.soloAdmin || user?.rol === "admin");

  const handleCerrarSesion = () => {
    closeMobileMenu();
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 transform bg-[#24124D] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-[#371F76]
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-64
        md:relative md:translate-x-0
        ${isCollapsed ? "md:w-20" : "md:w-64"}
      `}
    >
      {/* Cabecera con Logotipo Melanie y botón de cerrar móvil */}
      <div
        className={`p-4 md:p-5 border-b border-[#371F76] flex items-center justify-between whitespace-nowrap`}
      >
        <div className={`flex items-center gap-3 ${isCollapsed ? "md:justify-center md:w-full" : ""}`}>
          <MelanieMark className="w-8 h-8 shrink-0" />
          <div className={`flex flex-col leading-tight ${isCollapsed ? "md:hidden" : ""}`}>
            <span className="font-black text-sm tracking-wider text-white uppercase font-sans">
              MELANIE
            </span>
            <span className="font-bold text-[9px] tracking-widest text-[#FFA399] uppercase">
              MULTICATÁLOGO
            </span>
          </div>
        </div>

        {/* Botón de cierre en móviles (permite cerrar el menú sin cambiar de pantalla) */}
        <button
          onClick={closeMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#341B7F] transition cursor-pointer"
          aria-label="Cerrar menú lateral"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const esActivo =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 p-3 min-h-[44px] rounded-lg transition text-sm font-medium ${
                esActivo
                  ? "bg-[#341B7F] text-white border-l-4 border-[#F05043] pl-2 font-semibold shadow-xs"
                  : "text-slate-200 hover:bg-[#341B7F]/60 hover:text-white"
              } ${isCollapsed ? "md:justify-center md:pl-3" : ""}`}
              title={item.title}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              <span className={`whitespace-nowrap ${isCollapsed ? "md:hidden" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Pie con Estado del Usuario y Botón de Cerrar Sesión Directo (100% amigable para celulares) */}
      <div className="p-3 border-t border-[#371F76] space-y-2">
        <div className="text-xs text-slate-300">
          {isCollapsed ? (
            <p className="text-center uppercase font-bold text-[10px] text-[#FFA399] hidden md:block">
              {user?.rol}
            </p>
          ) : (
            <div className="flex items-center justify-between pb-1">
              <span className="truncate text-slate-400 text-xs">{user?.email}</span>
              <span className="font-bold uppercase text-[10px] bg-[#341B7F] px-2 py-0.5 rounded text-[#FFA399] border border-[#43258E]">
                {user?.rol}
              </span>
            </div>
          )}
        </div>

        {/* Botón Cerrar Sesión en Sidebar */}
        <button
          onClick={handleCerrarSesion}
          className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-300 hover:text-white hover:bg-red-500/20 font-bold text-xs transition cursor-pointer border border-transparent hover:border-red-500/30 ${
            isCollapsed ? "md:justify-center md:px-0" : ""
          }`}
          title="Cerrar sesión"
        >
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className={`whitespace-nowrap ${isCollapsed ? "md:hidden" : ""}`}>
            Cerrar Sesión
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
