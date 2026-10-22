import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      // Prevenir el banner automático del navegador para mostrar el nuestro personalizado
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      className="fixed bottom-4 right-4 z-50 bg-white border border-violet-200 rounded-xl shadow-2xl p-4 flex items-center gap-3.5 max-w-sm transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0 shadow-sm">
        <Download className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="flex-1 text-xs">
        <p id="pwa-install-title" className="font-semibold text-slate-900 text-sm">Instalar MultiCatálogo</p>
        <p className="text-slate-500 mt-0.5">Accedé más rápido y navegá sin conexión desde tu pantalla de inicio.</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md text-xs transition"
          aria-label="Cerrar sugerencia de instalación"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
