import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50 animate-fade-in"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        <strong>Modo sin conexión:</strong> Estás navegando con el catálogo guardado en caché. Las compras y cambios de cuenta requieren internet.
      </span>
    </div>
  );
}
