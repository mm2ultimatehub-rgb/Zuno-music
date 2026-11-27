import React, { useEffect, useState } from 'react';
import { Download, Share, WifiOff } from 'lucide-react';
import { isZunoNativeContainer } from '../utils/authRedirect';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallButtonProps {
  accentColor: string;
  darkMode: boolean;
}

export const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({
  accentColor,
  darkMode,
}) => {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (isZunoNativeContainer()) return null;

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsIos(ios && !standalone);
    setIsOffline(!navigator.onLine);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowHelp(false);
    };
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setShowHelp((visible) => !visible);
      return;
    }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setShowHelp(true);
    }
  };

  const showInstall = Boolean(installPrompt) || isIos;

  return (
    <div className="relative flex items-center gap-2">
      {isOffline && (
        <span
          role="status"
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium ${darkMode ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-amber-500/25 bg-amber-50 text-amber-800'}`}
        >
          <WifiOff className="h-3.5 w-3.5" />
          Çevrimdışı
        </span>
      )}
      {showInstall && (
        <button
          type="button"
          onClick={install}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors"
          style={{
            borderColor: `${accentColor}66`,
            color: accentColor,
            backgroundColor: `${accentColor}12`,
          }}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Uygulamayı kur</span>
        </button>
      )}

      {showHelp && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border p-4 shadow-2xl ${darkMode ? 'border-white/10 bg-[#151b27] text-white' : 'border-slate-200 bg-white text-slate-900'}`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Share className="h-4 w-4" style={{ color: accentColor }} />
            Ana ekrana ekle
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-75">
            Safari’de Paylaş simgesine dokun, ardından “Ana Ekrana Ekle” seçeneğini seç. ZUNO Music ana ekranda uygulama gibi açılır.
          </p>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold"
            style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
          >
            Tamam
          </button>
        </div>
      )}
    </div>
  );
};
