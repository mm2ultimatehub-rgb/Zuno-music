import React, { useState } from 'react';
import { t } from '../utils/i18n';
import type { AppLanguage } from '../types/music';
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  HardDrive,
  Info,
  Palette,
  RefreshCw,
  Sliders,
  Volume2,
} from 'lucide-react';
import type { FluidShapeId, TabIndicatorStyle, ThemeMode, ZunoSettings } from '../types/music';
import { ACCENT_SWATCHES } from '../data/zunoCatalog';
import { KOTLIN_COMPOSE_SNIPPETS } from '../data/kotlinComposeSnippets';
import { MorphingSwitch } from './fluid/MorphingSwitch';
import { LiquidSlider } from './fluid/LiquidSlider';
import { MorphingLoader } from './fluid/MorphingLoader';
import { formatFileSize } from '../utils/zunoLogic';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { checkForZunoUpdate, type ZunoReleaseCheck } from '../utils/appUpdates';

interface SettingsViewProps {
  settings: ZunoSettings;
  language: AppLanguage;
  onUpdate: (patch: Partial<ZunoSettings>) => void;
  storageUsedMb: number;
  onClearCache: () => void;
  onBack: () => void;
  darkMode: boolean;
}

const KNOB_SHAPES: { id: FluidShapeId; label: string }[] = [
  { id: 'burst', label: 'Yumuşak yıldız' },
  { id: 'sun', label: 'Güneş' },
  { id: 'pent', label: 'Beşgen' },
  { id: 'hex', label: 'Altıgen' },
  { id: 'circ', label: 'Daire' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  language,
  onUpdate,
  storageUsedMb,
  onClearCache,
  onBack,
  darkMode,
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('Yüklü sürüm: v' + (import.meta.env.VITE_APP_VERSION || '0.1.0'));
  const [updateRelease, setUpdateRelease] = useState<ZunoReleaseCheck | null>(null);
  const [showComposeCode, setShowComposeCode] = useState(false);
  const [activeSnippetId, setActiveSnippetId] = useState(KOTLIN_COMPOSE_SNIPPETS[0].id);
  const [copied, setCopied] = useState(false);

  const cardCls = darkMode
    ? 'border-white/[0.08] bg-[#11151e]'
    : 'border-slate-200 bg-white shadow-sm';

  const handleUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateRelease(null);
    setUpdateMsg('GitHub Releases üzerinden sürüm denetleniyor...');
    try {
      const release = await checkForZunoUpdate();
      setUpdateRelease(release);
      if (release.hasUpdate) {
        setUpdateMsg(
          `Yeni sürüm bulundu: v${release.latestVersion} (yüklü: v${release.currentVersion})`
        );
      } else {
        setUpdateMsg(`ZUNO v${release.currentVersion} güncel. Son yayımlanan sürüm: v${release.latestVersion}`);
      }
    } catch (error) {
      setUpdateMsg(error instanceof Error ? error.message : 'Güncelleme denetimi başarısız.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const openReleaseLink = async (url: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.location.assign(url);
    }
  };

  const activeSnippet =
    KOTLIN_COMPOSE_SNIPPETS.find((s) => s.id === activeSnippetId) || KOTLIN_COMPOSE_SNIPPETS[0];

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeSnippet.code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Geri dön"
            onClick={onBack}
            className={`flex h-11 w-11 items-center justify-center rounded-full border ${
              darkMode ? 'border-white/10 hover:bg-white/10' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{t('settings', language)}</h1>
            <p className="text-xs opacity-65">{t('settingsSubtitle', language)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowComposeCode((v) => !v)}
          className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors ${
            showComposeCode
              ? 'border-transparent'
              : darkMode
                ? 'border-white/15 bg-white/5 hover:bg-white/10'
                : 'border-slate-300 bg-white hover:bg-slate-100'
          }`}
          style={
            showComposeCode
              ? { backgroundColor: settings.accentColor, color: '#0b0e16' }
              : undefined
          }
        >
          <Code2 className="h-4 w-4" />
          <span>Kotlin Compose</span>
        </button>
      </div>

      {/* Optional Kotlin + Jetpack Compose Reference Drawer */}
      {showComposeCode && (
        <section className={`rounded-3xl border p-5 space-y-4 ${cardCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">
                Jetpack Compose Bileşen Kodları
              </h2>
              <p className="text-xs opacity-65">{activeSnippet.description}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold"
              style={{ backgroundColor: settings.accentColor, color: '#0b0e16' }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {KOTLIN_COMPOSE_SNIPPETS.map((sn) => (
              <button
                key={sn.id}
                type="button"
                onClick={() => setActiveSnippetId(sn.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  sn.id === activeSnippet.id
                    ? 'border-transparent text-[#0b0e16]'
                    : 'border-current/15 opacity-75 hover:opacity-100'
                }`}
                style={
                  sn.id === activeSnippet.id ? { backgroundColor: settings.accentColor } : undefined
                }
              >
                {sn.fileName}
              </button>
            ))}
          </div>

          <pre className="overflow-x-auto rounded-2xl bg-[#07090e] p-4 text-xs text-slate-200 font-mono-num leading-relaxed border border-white/10">
            <code>{activeSnippet.code}</code>
          </pre>
        </section>
      )}

      {/* App language */}
      <section className={`rounded-3xl border p-5 space-y-3 ${cardCls}`}>
        <h2 className="font-display text-base font-semibold">{t('language', language)}</h2>
        <p className="text-xs opacity-65">{t('languageHint', language)}</p>
        <div className="grid grid-cols-3 gap-2">
          {([['tr', 'Türkçe'], ['en', 'English'], ['ru', 'Русский']] as [AppLanguage, string][]).map(([value, label]) => (
            <button key={value} type="button" onClick={() => onUpdate({ language: value })}
              aria-pressed={language === value}
              className={`h-10 rounded-xl border text-sm font-medium transition-colors ${language === value ? 'border-transparent' : 'border-current/15 opacity-75'}`}
              style={language === value ? { backgroundColor: settings.accentColor, color: '#0b0e16' } : undefined}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Görünüm & Tema */}
      <section className={`rounded-3xl border p-5 space-y-5 ${cardCls}`}>
        <div className="flex items-center gap-2.5">
          <Palette className="h-5 w-5" style={{ color: settings.accentColor }} />
          <h2 className="font-display text-base font-semibold">Görünüm ve Tema</h2>
        </div>

        {/* Theme Mode */}
        <div className="space-y-2">
          <div className="text-xs font-medium opacity-70">Tema modu</div>
          <div
            className={`grid grid-cols-3 gap-1 rounded-2xl p-1 ${
              darkMode ? 'bg-white/[0.05]' : 'bg-slate-100'
            }`}
          >
            {(
              [
                { id: 'dark', label: 'Koyu tema' },
                { id: 'light', label: 'Açık tema' },
                { id: 'system', label: 'Sistem' },
              ] as { id: ThemeMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdate({ theme: opt.id })}
                className={`h-10 rounded-xl text-xs font-semibold transition-colors ${
                  settings.theme === opt.id
                    ? 'shadow-sm'
                    : 'opacity-65 hover:opacity-100'
                }`}
                style={
                  settings.theme === opt.id
                    ? { backgroundColor: settings.accentColor, color: '#0b0e16' }
                    : undefined
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Swatches */}
        <div className="space-y-2.5">
          <div className="text-xs font-medium opacity-70">Vurgu rengi</div>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_SWATCHES.map((sw) => {
              const selected = settings.accentColor.toLowerCase() === sw.hex.toLowerCase();
              return (
                <button
                  key={sw.hex}
                  type="button"
                  aria-label={sw.label}
                  aria-pressed={selected}
                  onClick={() => onUpdate({ accentColor: sw.hex })}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    selected ? 'scale-110 border-white ring-2 ring-white/30' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: sw.hex }}
                />
              );
            })}
            <label className="inline-flex items-center gap-2 text-xs opacity-75 cursor-pointer">
              <span>Özel</span>
              <input
                type="color"
                aria-label="Özel vurgu rengi"
                value={settings.accentColor}
                onChange={(e) => onUpdate({ accentColor: e.target.value })}
                className="h-8 w-9 cursor-pointer rounded-lg border border-current/15 bg-transparent p-0"
              />
            </label>
          </div>
        </div>

        {/* Tab Indicator & Knob Shape */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-medium opacity-70">Alt sekme göstergesi</div>
            <div
              className={`grid grid-cols-3 gap-1 rounded-2xl p-1 ${
                darkMode ? 'bg-white/[0.05]' : 'bg-slate-100'
              }`}
            >
              {(
                [
                  { id: 'pill', label: 'Akan hap' },
                  { id: 'shape', label: 'Şekil' },
                  { id: 'line', label: 'Dalga' },
                ] as { id: TabIndicatorStyle; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onUpdate({ tabStyle: m.id })}
                  className={`h-9 rounded-xl text-xs font-medium transition-colors ${
                    settings.tabStyle === m.id ? 'bg-white/15 font-semibold' : 'opacity-65'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium opacity-70">Tutamaç ve rozet şekli</div>
            <div className="flex flex-wrap gap-1.5">
              {KNOB_SHAPES.map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => onUpdate({ knobShape: sh.id })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.knobShape === sh.id
                      ? 'border-transparent text-[#0b0e16] font-semibold'
                      : 'border-current/15 opacity-70 hover:opacity-100'
                  }`}
                  style={
                    settings.knobShape === sh.id
                      ? { backgroundColor: settings.accentColor }
                      : undefined
                  }
                >
                  {sh.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-current/[0.07]">
          <div>
            <div className="text-sm font-medium">Dinamik oynatıcı renkleri</div>
            <div className="text-xs opacity-65">Albüm kapağının renk tonunu oynatıcı arka planına uygula</div>
          </div>
          <MorphingSwitch
            checked={settings.dynamicPlayerColors}
            onChange={(v) => onUpdate({ dynamicPlayerColors: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            ariaLabel="Dinamik oynatıcı renkleri"
            darkMode={darkMode}
          />
        </div>
      </section>

      {/* Oynatma Ayarları */}
      <section className={`rounded-3xl border p-5 space-y-4 ${cardCls}`}>
        <div className="flex items-center gap-2.5">
          <Sliders className="h-5 w-5" style={{ color: settings.accentColor }} />
          <h2 className="font-display text-base font-semibold">Oynatma Ayarları</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Aralıksız oynatma (Gapless)</div>
            <div className="text-xs opacity-65">Albüm içi şarkılar arasında boşluk bırakma</div>
          </div>
          <MorphingSwitch
            checked={settings.gaplessPlayback}
            onChange={(v) => onUpdate({ gaplessPlayback: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            ariaLabel="Aralıksız oynatma"
            darkMode={darkMode}
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-current/[0.07]">
          <div>
            <div className="text-sm font-medium">Yumuşak geçiş (Crossfade)</div>
            <div className="text-xs opacity-65">Parça değişimlerinde sesi kademeli karıştır</div>
          </div>
          <MorphingSwitch
            checked={settings.crossfadeEnabled}
            onChange={(v) => onUpdate({ crossfadeEnabled: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            styleMode="liquid"
            ariaLabel="Yumuşak geçiş"
            darkMode={darkMode}
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-current/[0.07]">
          <div>
            <div className="text-sm font-medium">Dokunuş titreşimi</div>
            <div className="text-xs opacity-65">Kontrollere basıldığında hafif dokunsal geri bildirim</div>
          </div>
          <MorphingSwitch
            checked={settings.hapticFeedback}
            onChange={(v) => onUpdate({ hapticFeedback: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            ariaLabel="Dokunuş titreşimi"
            darkMode={darkMode}
          />
        </div>
      </section>

      {/* Ses Ayarları */}
      <section className={`rounded-3xl border p-5 space-y-5 ${cardCls}`}>
        <div className="flex items-center gap-2.5">
          <Volume2 className="h-5 w-5" style={{ color: settings.accentColor }} />
          <h2 className="font-display text-base font-semibold">Ses Ayarları</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="opacity-75">Ana ses seviyesi</span>
            <span className="tabular-nums font-mono-num">{Math.round(settings.volume * 100)}%</span>
          </div>
          <LiquidSlider
            value={settings.volume}
            onChange={(v) => onUpdate({ volume: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            waveAmp={settings.waveAmplitude}
            speed={settings.animationSpeed}
            height={38}
            ariaLabel="Ana ses seviyesi"
            darkMode={darkMode}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="opacity-75">Bas güçlendirme (EQ)</span>
            <span className="tabular-nums font-mono-num">{Math.round(settings.bassBoost * 100)}%</span>
          </div>
          <LiquidSlider
            value={settings.bassBoost}
            onChange={(v) => onUpdate({ bassBoost: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            waveAmp={settings.waveAmplitude}
            speed={settings.animationSpeed}
            height={38}
            ariaLabel="Bas güçlendirme"
            darkMode={darkMode}
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-current/[0.07]">
          <div>
            <div className="text-sm font-medium">Ses seviyesi normalizasyonu</div>
            <div className="text-xs opacity-65">Tüm şarkıları dengeli ses yüksekliğinde çal</div>
          </div>
          <MorphingSwitch
            checked={settings.audioNormalization}
            onChange={(v) => onUpdate({ audioNormalization: v })}
            accentColor={settings.accentColor}
            shapeId={settings.knobShape}
            ariaLabel="Ses seviyesi normalizasyonu"
            darkMode={darkMode}
          />
        </div>
      </section>

      {/* İndirme Ayarları & Depolama */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className={`rounded-3xl border p-5 space-y-4 ${cardCls}`}>
          <div className="flex items-center gap-2.5">
            <Download className="h-5 w-5" style={{ color: settings.accentColor }} />
            <h2 className="font-display text-base font-semibold">İndirme Ayarları</h2>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium opacity-70">Ses kalitesi</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['192kbps', '320kbps', 'lossless'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdate({ downloadQuality: q })}
                  className={`h-9 rounded-xl border text-xs font-medium transition-colors ${
                    settings.downloadQuality === q
                      ? 'border-transparent text-[#0b0e16] font-semibold'
                      : 'border-current/15 opacity-70'
                  }`}
                  style={
                    settings.downloadQuality === q
                      ? { backgroundColor: settings.accentColor }
                      : undefined
                  }
                >
                  {q === 'lossless' ? 'FLAC' : q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-current/[0.07]">
            <div>
              <div className="text-sm font-medium">Yalnızca Wi-Fi ile indir</div>
              <div className="text-xs opacity-65">Mobil veriyi koru</div>
            </div>
            <MorphingSwitch
              checked={settings.wifiOnlyDownloads}
              onChange={(v) => onUpdate({ wifiOnlyDownloads: v })}
              accentColor={settings.accentColor}
              shapeId={settings.knobShape}
              ariaLabel="Yalnızca Wi-Fi ile indir"
              darkMode={darkMode}
            />
          </div>
        </section>

        <section className={`rounded-3xl border p-5 space-y-4 ${cardCls}`}>
          <div className="flex items-center gap-2.5">
            <HardDrive className="h-5 w-5" style={{ color: settings.accentColor }} />
            <h2 className="font-display text-base font-semibold">Depolama ve Güncellemeler</h2>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium tabular-nums">
                Kullanılan alan: {formatFileSize(storageUsedMb)}
              </div>
              <div className="text-xs opacity-65">İndirilenler ve akış önbelleği</div>
            </div>
            <button
              type="button"
              onClick={onClearCache}
              className="rounded-full border border-current/15 px-3.5 py-2 text-xs font-medium hover:bg-white/10"
            >
              Önbelleği Temizle
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-current/[0.07]">
            <div className="flex items-center gap-2.5 min-w-0">
              {checkingUpdate ? (
                <MorphingLoader size={30} accentColor={settings.accentColor} />
              ) : (
                <Info className="h-4 w-4 opacity-60 shrink-0" />
              )}
              <span className="truncate text-xs opacity-80">{updateMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleUpdateCheck}
              disabled={checkingUpdate}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-current/15 px-3 text-xs font-medium hover:bg-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>Denetle</span>
            </button>
          </div>

          {updateRelease?.hasUpdate && (
            <div className="flex flex-wrap items-center gap-2">
              {updateRelease.platformDownloadUrl && (
                <button
                  type="button"
                  onClick={() => void openReleaseLink(updateRelease.platformDownloadUrl!)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold"
                  style={{ backgroundColor: settings.accentColor, color: '#0b0e16' }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{updateRelease.platformDownloadLabel || 'Güncellemeyi indir'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => void openReleaseLink(updateRelease.releaseUrl)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-current/15 px-3.5 text-xs font-medium hover:bg-white/10"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Sürüm notları</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
