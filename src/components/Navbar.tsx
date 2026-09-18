import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Menu, ShoppingCart } from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { totalItems } = useCart();
  const { logout, userEmail } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Toggle Menu"
          >
            <Menu size={22} />
          </button>
        )}
        <h2 className="text-slate-800 font-semibold text-lg hidden sm:block">
          Panel de Administración
        </h2>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        <Link
          to="/carrito"
          className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all flex items-center hover:shadow-md"
        >
          <ShoppingCart size={20} className="text-slate-700" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium hidden md:block">{userEmail}</span>
          {/* Contenedor relativo con la clase 'group' para detectar el hover */}
          <div className="relative group cursor-pointer pb-2 pt-2">
            {/* Círculo del usuario / Avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shadow-sm hover:ring-2 ring-indigo-500/30 transition-all">
              <img
                src="https://fastly.picsum.photos/id/64/4326/2884.jpg?hmac=9_SzX666YRpR_fOyYStXpfSiJ_edO3ghlSRnH2w09Kg"
                alt="Avatar del usuario"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Menú desplegable */}
            <div className="absolute right-0 top-full mt-0 w-40 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 first:rounded-t-xl last:rounded-b-xl transition-colors flex items-center gap-2"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
