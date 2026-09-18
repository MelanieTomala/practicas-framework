import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Library, Network, X } from "lucide-react";

interface SidebarProps {
  isCollapsed?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar = ({ isCollapsed = false, onCloseMobile }: SidebarProps) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Overlay para móviles */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}
      
      <aside
        className={`${
          isCollapsed ? "-translate-x-full md:translate-x-0 md:w-20" : "translate-x-0 w-64"
        } fixed md:static inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-none border-r border-white/5`}
      >
        <div className={`p-0 flex items-center justify-between ${isCollapsed ? "md:justify-center" : "px-6"} font-bold border-b border-white/10 h-16 shrink-0`}>
          <span className="text-xl text-white truncate">
            {isCollapsed ? "MC" : "MultiCatálogo"}
          </span>
          {!isCollapsed && (
            <button onClick={onCloseMobile} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          <Link
            to="/"
            className={`flex items-center p-3 rounded-xl hover:bg-white/10 transition-all duration-300 group ${
              isActive("/") ? "bg-indigo-600/20 text-indigo-300" : "text-slate-400 hover:text-slate-100"
            } ${isCollapsed ? "md:justify-center" : "gap-4"}`}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard size={22} className={`transition-transform duration-300 group-hover:scale-110 ${isActive("/") ? "text-indigo-400" : ""}`} />
            {!isCollapsed && <span className="font-medium tracking-wide">Dashboard</span>}
          </Link>
          
          <Link
            to="/catalogo"
            className={`flex items-center p-3 rounded-xl hover:bg-white/10 transition-all duration-300 group ${
              isActive("/catalogo") ? "bg-indigo-600/20 text-indigo-300" : "text-slate-400 hover:text-slate-100"
            } ${isCollapsed ? "md:justify-center" : "gap-4"}`}
            title={isCollapsed ? "Catálogo" : undefined}
          >
            <Library size={22} className={`transition-transform duration-300 group-hover:scale-110 ${isActive("/catalogo") ? "text-indigo-400" : ""}`} />
            {!isCollapsed && <span className="font-medium tracking-wide">Catálogo</span>}
          </Link>
          
          <Link
            to="/mi-red"
            className={`flex items-center p-3 rounded-xl hover:bg-white/10 transition-all duration-300 group ${
              isActive("/mi-red") ? "bg-indigo-600/20 text-indigo-300" : "text-slate-400 hover:text-slate-100"
            } ${isCollapsed ? "md:justify-center" : "gap-4"}`}
            title={isCollapsed ? "Mi Red" : undefined}
          >
            <Network size={22} className={`transition-transform duration-300 group-hover:scale-110 ${isActive("/mi-red") ? "text-indigo-400" : ""}`} />
            {!isCollapsed && <span className="font-medium tracking-wide">Mi Red</span>}
          </Link>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
