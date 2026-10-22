// src/components/Layout.tsx
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
      setIsCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  const handleCloseMobile = () => {
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Backdrop para cerrar el Sidebar en móviles haciendo clic afuera */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity cursor-pointer"
          onClick={handleCloseMobile}
          aria-label="Cerrar menú lateral"
        />
      )}

      {/* Sidebar con navegación y cierre explícito */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={mobileOpen}
        closeMobileMenu={handleCloseMobile}
      />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Navbar toggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
