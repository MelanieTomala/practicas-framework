import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useInstallPrompt, type BrowserCompatibility } from '../hooks/useInstallPrompt';

interface BotonInstalarAppProps {
  variant?: 'navbar' | 'sidebar' | 'login' | 'top-bar';
}

export const BotonInstalarApp = ({ variant = 'top-bar' }: BotonInstalarAppProps) => {
  const { isInstalled, isStandalone, canPromptNative, browser, promptInstall } = useInstallPrompt();
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Si la aplicación ya fue instalada en el equipo o se está navegando en standalone, se oculta
  if (isStandalone || isInstalled) {
    return null;
  }

  const handleInstalar = async () => {
    if (canPromptNative) {
      const result = await promptInstall();
      if (result.outcome === 'accepted') {
        return;
      }
      if (result.outcome === 'unsupported') {
        setMostrarGuia(true);
      }
      return;
    }

    setMostrarGuia(true);
  };

  if (variant === 'top-bar') {
    return (
      <>
        <button
          onClick={handleInstalar}
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#371F76] text-slate-700 hover:text-[#371F76] font-bold text-xs rounded-full shadow-xs transition-all cursor-pointer min-h-[36px]"
          title="Instalar MultiCatálogo Melanie como aplicación"
        >
          <svg className="w-3.5 h-3.5 text-[#F05043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Instalar App</span>
        </button>

        {mostrarGuia && (
          <GuiaInstalacionModal browser={browser} onClose={() => setMostrarGuia(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstalar}
        type="button"
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white hover:bg-slate-50 border-2 border-[#371F76] text-[#371F76] font-bold text-sm rounded-lg transition-colors min-h-[46px] cursor-pointer"
        title="Instalar MultiCatálogo Melanie como aplicación en tu dispositivo"
      >
        <svg className="w-4 h-4 text-[#F05043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Instalar MultiCatálogo Melanie (App)</span>
      </button>

      {mostrarGuia && (
        <GuiaInstalacionModal browser={browser} onClose={() => setMostrarGuia(false)} />
      )}
    </>
  );
};

interface GuiaInstalacionModalProps {
  browser: BrowserCompatibility;
  onClose: () => void;
}

const GuiaInstalacionModal = ({ browser, onClose }: GuiaInstalacionModalProps) => {
  const [copiado, setCopiado] = useState(false);

  const handleCopiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4 border border-slate-200 relative z-[10000] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#371F76]/10 text-[#371F76] flex items-center justify-center font-black text-sm">
              M
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Instalar MultiCatálogo Melanie
              </h3>
              <p className="text-[11px] text-slate-500">
                Detectado: <span className="font-semibold text-slate-700">{browser.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Contenido según Navegador */}
        <div className="space-y-3 text-xs sm:text-sm">
          {/* CASO 1: Safari en iPhone / iPad */}
          {browser.type === 'ios-safari' && (
            <>
              <p className="text-xs text-slate-600">
                En iOS, Apple requiere agregar la app manualmente desde Safari:
              </p>
              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>
                    Tocá el botón <strong>Compartir</strong> (icono <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-xs">⎋</span> con flecha hacia arriba en la barra de Safari).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>
                    Deslizá las opciones hacia abajo y seleccioná <strong>"Agregar a pantalla de inicio"</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>
                    Confirmá tocando <strong>Agregar</strong> en la esquina superior derecha.
                  </span>
                </li>
              </ol>
            </>
          )}

          {/* CASO 2: Firefox en Computadora de Escritorio */}
          {browser.type === 'firefox-desktop' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5">
                <p className="font-bold text-slate-900">Firefox en Computadora no soporta PWAs</p>
                <p>
                  Mozilla Firefox en escritorio no incluye la tecnología para instalar sitios web como aplicaciones de escritorio independientes.
                </p>
              </div>
              <p className="text-xs text-slate-600">
                Para instalarla con acceso directo en tu escritorio o barra de tareas, te recomendamos abrir esta misma página en <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>.
              </p>
              <button
                onClick={handleCopiarEnlace}
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#371F76]/10 hover:bg-[#371F76]/20 text-[#371F76] font-bold text-xs rounded-lg transition cursor-pointer"
              >
                <span>{copiado ? "✓ Enlace copiado al portapapeles" : "Copiar enlace de la aplicación"}</span>
              </button>
            </div>
          )}

          {/* CASO 3: Firefox en Celular Android */}
          {browser.type === 'firefox-mobile' && (
            <>
              <p className="text-xs text-slate-600">
                Para instalar desde <strong>Firefox Móvil</strong>:
              </p>
              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>
                    Tocá el menú de <strong>3 puntos (⋮)</strong> en la barra de Firefox.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>
                    Seleccioná la opción <strong>"Instalar"</strong> o <strong>"Agregar a la pantalla de inicio"</strong>.
                  </span>
                </li>
              </ol>
            </>
          )}

          {/* CASO 4: Navegador embebido en Apps (Instagram, Facebook, etc.) */}
          {browser.type === 'in-app' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Estás dentro del navegador integrado de una red social. Las aplicaciones no permiten instalar PWAs dentro de sus pantallas.
              </div>
              <p className="text-xs text-slate-600">
                Tocá los 3 puntos (<strong>⋮</strong> o <strong>⋯</strong>) arriba y elegí <strong>"Abrir en Chrome"</strong> o <strong>"Abrir en Safari"</strong> para poder instalarla.
              </p>
            </div>
          )}

          {/* CASO 5: Chromium (Chrome / Edge) manual fallback */}
          {(browser.type === 'chromium' || browser.type === 'other') && (
            <>
              <p className="text-xs text-slate-600 font-medium">
                Si el navegador no abrió la ventana emergente automáticamente:
              </p>
              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>
                    En la <strong>barra de direcciones</strong> arriba a la derecha, hacé clic en el icono de <strong>Instalar</strong> (pantalla con flecha hacia abajo).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#371F76] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>
                    O abrí el menú de <strong>3 puntos (⋮)</strong> y seleccioná <strong>"Instalar MultiCatálogo Melanie"</strong> o <strong>"Agregar a pantalla principal"</strong>.
                  </span>
                </li>
              </ol>
            </>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#371F76] text-white rounded-lg text-xs font-bold hover:bg-[#281466] transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BotonInstalarApp;
