import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent;
  }
}

export type BrowserType =
  | 'ios-safari'
  | 'firefox-desktop'
  | 'firefox-mobile'
  | 'chromium'
  | 'in-app'
  | 'other';

export interface BrowserCompatibility {
  type: BrowserType;
  name: string;
  supportsNativePrompt: boolean;
  supportsPWA: boolean;
}

export const detectBrowserCompatibility = (): BrowserCompatibility => {
  if (typeof window === 'undefined' || !navigator) {
    return {
      type: 'other',
      name: 'Navegador web',
      supportsNativePrompt: false,
      supportsPWA: false,
    };
  }

  const ua = navigator.userAgent;

  if (/FBAN|FBAV|Instagram|TikTok|Line|WhatsApp/i.test(ua)) {
    return {
      type: 'in-app',
      name: 'Navegador integrado de app',
      supportsNativePrompt: false,
      supportsPWA: false,
    };
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (isIOS) {
    return {
      type: 'ios-safari',
      name: 'Safari en iOS',
      supportsNativePrompt: false,
      supportsPWA: true,
    };
  }

  if (/Firefox|FxiOS/i.test(ua)) {
    const isMobile = /Android|Mobile/i.test(ua);
    return {
      type: isMobile ? 'firefox-mobile' : 'firefox-desktop',
      name: isMobile ? 'Firefox Móvil' : 'Firefox en Computadora',
      supportsNativePrompt: false,
      supportsPWA: isMobile,
    };
  }

  if (/Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(ua)) {
    return {
      type: 'chromium',
      name: 'Google Chrome / Edge',
      supportsNativePrompt: true,
      supportsPWA: true,
    };
  }

  return {
    type: 'other',
    name: 'Navegador web',
    supportsNativePrompt: false,
    supportsPWA: true,
  };
};

const PWA_INSTALLED_KEY = 'melanie_pwa_installed';

let globalDeferredPrompt: BeforeInstallPromptEvent | null =
  typeof window !== 'undefined' && window.__deferredPwaPrompt ? window.__deferredPwaPrompt : null;

let globalIsStandalone = typeof window !== 'undefined'
  ? window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  : false;

// Estado inicial: si está en standalone o si el navegador ya registró la instalación previa
let globalIsInstalled = typeof window !== 'undefined'
  ? globalIsStandalone || localStorage.getItem(PWA_INSTALLED_KEY) === 'true'
  : false;

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignorar
    }
  });
};

if (typeof window !== 'undefined') {
  const checkInstalledState = async () => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    globalIsStandalone = isStandalone;

    if (isStandalone) {
      globalIsInstalled = true;
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      notifyListeners();
      return;
    }

    // Consulta en tiempo real al SO si la app está instalada (Chromium)
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const related = await (
          navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> }
        ).getInstalledRelatedApps();
        if (related && related.length > 0) {
          globalIsInstalled = true;
          localStorage.setItem(PWA_INSTALLED_KEY, 'true');
          notifyListeners();
          return;
        }
      } catch {
        // Ignorar
      }
    }

    // Si el navegador dispara beforeinstallprompt, significa con certeza que NO está instalada
    if (globalDeferredPrompt || window.__deferredPwaPrompt) {
      globalIsInstalled = false;
      localStorage.removeItem(PWA_INSTALLED_KEY);
      notifyListeners();
    }
  };

  checkInstalledState();

  try {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      globalIsStandalone = e.matches;
      if (e.matches) {
        globalIsInstalled = true;
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      }
      notifyListeners();
    });
  } catch {
    // Compatibilidad
  }

  // Cuando el navegador notifica que la app es instalable (NO está instalada o fue desinstalada)
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.__deferredPwaPrompt = e as BeforeInstallPromptEvent;
    globalIsInstalled = false;
    localStorage.removeItem(PWA_INSTALLED_KEY);
    notifyListeners();
  });

  // Cuando se completa la instalación
  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    globalDeferredPrompt = null;
    window.__deferredPwaPrompt = undefined;
    notifyListeners();
  });
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt || (typeof window !== 'undefined' ? window.__deferredPwaPrompt || null : null)
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => globalIsInstalled);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => globalIsStandalone);
  const [browser] = useState<BrowserCompatibility>(() => detectBrowserCompatibility());

  useEffect(() => {
    const update = () => {
      setDeferredPrompt(globalDeferredPrompt || (window.__deferredPwaPrompt ?? null));
      setIsInstalled(globalIsInstalled);
      setIsStandalone(globalIsStandalone);
    };

    listeners.add(update);
    update();

    return () => {
      listeners.delete(update);
    };
  }, []);

  const promptInstall = async (): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' }> => {
    const event = globalDeferredPrompt || window.__deferredPwaPrompt;
    if (!event) {
      return { outcome: 'unsupported' };
    }

    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') {
        globalIsInstalled = true;
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        globalDeferredPrompt = null;
        window.__deferredPwaPrompt = undefined;
        notifyListeners();
        return { outcome: 'accepted' };
      }
      return { outcome: 'dismissed' };
    } catch (err) {
      console.warn('Error al ejecutar prompt de instalación:', err);
      return { outcome: 'unsupported' };
    }
  };

  return {
    isInstalled,
    isStandalone,
    canPromptNative: !!(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPwaPrompt)),
    browser,
    promptInstall,
  };
};
