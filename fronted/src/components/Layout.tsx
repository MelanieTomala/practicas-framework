import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = () => {
  // Inicializamos en true para que en móviles empiece oculto (o 80px en desktop)
  // En un caso real se podría usar un window.innerWidth para setear el estado inicial.
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleCloseMobile = () => {
    setIsCollapsed(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} onCloseMobile={handleCloseMobile} />
      {/* Área de Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
